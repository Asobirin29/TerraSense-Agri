<?php
// ============================================
// TerraSense Agri — Forgot Password API
// ============================================
// POST ?action=request  — Minta reset link (generate token)
// POST ?action=reset    — Reset password dengan token
// GET  ?action=verify   — Cek apakah token masih valid
// ============================================

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$allowedOrigin = APP_ENV === 'production' ? 'https://yourdomain.com' : '*';
header('Access-Control-Allow-Origin: ' . $allowedOrigin);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

startSecureSession();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'request':
        handleRequest();
        break;
    case 'verify':
        handleVerify();
        break;
    case 'reset':
        handleReset();
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Action tidak valid'], 400);
}

// ============================================
// REQUEST PASSWORD RESET
// ============================================
function handleRequest(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);

    if (!$email) {
        jsonResponse(['success' => false, 'message' => 'Format email tidak valid'], 422);
    }

    // Same response whether or not the email exists, to prevent email enumeration
    $genericResponse = [
        'success' => true,
        'message' => 'Jika email terdaftar, tautan pemulihan telah dikirim. Berlaku selama 1 jam.',
    ];

    // Basic per-session throttle
    $lastRequest = $_SESSION['reset_last_request'] ?? 0;
    if (time() - $lastRequest < 60) {
        jsonResponse(['success' => false, 'message' => 'Tunggu 1 menit sebelum meminta tautan baru.'], 429);
    }
    $_SESSION['reset_last_request'] = time();

    try {
        $db = getDB();

        $stmt = $db->prepare('SELECT id, name FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse($genericResponse);
        }

        // Per-email throttle: max 1 token per minute
        $stmt = $db->prepare('SELECT COUNT(*) FROM password_resets WHERE email = ? AND created_at > (NOW() - INTERVAL 1 MINUTE)');
        $stmt->execute([$email]);
        if ((int) $stmt->fetchColumn() > 0) {
            jsonResponse($genericResponse);
        }

        // Invalidate any existing tokens for this email
        $stmt = $db->prepare('DELETE FROM password_resets WHERE email = ?');
        $stmt->execute([$email]);

        // Only the SHA-256 hash is stored; the raw token lives only in the email link
        $token     = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour

        $stmt = $db->prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)');
        $stmt->execute([$email, hash('sha256', $token), $expiresAt]);

        $resetUrl = APP_URL . '/pages/reset-password.html?token=' . $token;

        sendResetEmail($email, $user['name'], $resetUrl);

        if (APP_ENV === 'development') {
            // mail() can report success even when Mailpit is not running, so in dev the link
            // also goes to the PHP error log — never to the client
            error_log('[TerraSense DEV] Password reset link for ' . $email . ': ' . $resetUrl);
        }

        jsonResponse($genericResponse);

    } catch (PDOException $e) {
        logError('forgot-password/request', $e);
        jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server. Silakan coba lagi.'], 500);
    }
}

// ============================================
// VERIFY TOKEN (GET ?action=verify&token=xxx)
// ============================================
function handleVerify(): void {
    $token = $_GET['token'] ?? '';

    if (empty($token) || strlen($token) !== 64) {
        jsonResponse(['success' => false, 'message' => 'Token tidak valid'], 422);
    }

    try {
        $db   = getDB();
        $stmt = $db->prepare('SELECT email, expires_at, used_at FROM password_resets WHERE token = ?');
        $stmt->execute([hash('sha256', $token)]);
        $reset = $stmt->fetch();

        if (!$reset) {
            jsonResponse(['success' => false, 'message' => 'Token tidak ditemukan atau sudah tidak valid'], 404);
        }
        if ($reset['used_at'] !== null) {
            jsonResponse(['success' => false, 'message' => 'Token sudah pernah digunakan'], 410);
        }
        if (strtotime($reset['expires_at']) < time()) {
            jsonResponse(['success' => false, 'message' => 'Token sudah kadaluarsa. Minta link baru.'], 410);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Token valid',
            'email'   => $reset['email'],
        ]);

    } catch (PDOException $e) {
        logError('forgot-password/verify', $e);
        jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server.'], 500);
    }
}

// ============================================
// RESET PASSWORD
// ============================================
function handleReset(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }

    $input    = json_decode(file_get_contents('php://input'), true);
    $token    = $input['token']    ?? '';
    $password = $input['password'] ?? '';

    if (empty($token) || strlen($token) !== 64) {
        jsonResponse(['success' => false, 'message' => 'Token tidak valid'], 422);
    }
    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Password baru harus minimal 6 karakter'], 422);
    }

    try {
        $db        = getDB();
        $tokenHash = hash('sha256', $token);

        $db->beginTransaction();

        // Lock the row so the same token cannot be used twice concurrently
        $stmt = $db->prepare('SELECT email, expires_at, used_at FROM password_resets WHERE token = ? FOR UPDATE');
        $stmt->execute([$tokenHash]);
        $reset = $stmt->fetch();

        if (!$reset) {
            $db->rollBack();
            jsonResponse(['success' => false, 'message' => 'Token tidak ditemukan'], 404);
        }
        if ($reset['used_at'] !== null) {
            $db->rollBack();
            jsonResponse(['success' => false, 'message' => 'Token sudah pernah digunakan'], 410);
        }
        if (strtotime($reset['expires_at']) < time()) {
            $db->rollBack();
            jsonResponse(['success' => false, 'message' => 'Token sudah kadaluarsa'], 410);
        }

        // Update password
        $hashed = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt   = $db->prepare('UPDATE users SET password = ? WHERE email = ?');
        $stmt->execute([$hashed, $reset['email']]);

        // Mark token as used and drop any other tokens for this email
        $stmt = $db->prepare('UPDATE password_resets SET used_at = NOW() WHERE token = ?');
        $stmt->execute([$tokenHash]);
        $stmt = $db->prepare('DELETE FROM password_resets WHERE email = ? AND token <> ?');
        $stmt->execute([$reset['email'], $tokenHash]);

        $db->commit();

        jsonResponse([
            'success' => true,
            'message' => 'Password berhasil direset! Silakan login dengan password baru Anda.',
        ]);

    } catch (PDOException $e) {
        if (isset($db) && $db->inTransaction()) $db->rollBack();
        logError('forgot-password/reset', $e);
        jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server.'], 500);
    }
}

// ============================================
// EMAIL HELPER
// ============================================
function sendResetEmail(string $email, string $name, string $resetUrl): bool {
    $subject = 'TerraSense Agri — Pemulihan Kata Sandi';
    $body    = "Halo, {$name}!\n\n"
             . "Kami menerima permintaan untuk mereset kata sandi akun TerraSense Agri Anda.\n\n"
             . "Klik tautan berikut untuk mereset kata sandi:\n"
             . "{$resetUrl}\n\n"
             . "Tautan ini berlaku selama 1 jam.\n"
             . "Jika Anda tidak meminta reset kata sandi, abaikan email ini.\n\n"
             . "Salam,\nTim TerraSense Agri";

    $headers = implode("\r\n", [
        'From: noreply@terrasense.agri',
        'Reply-To: noreply@terrasense.agri',
        'X-Mailer: PHP/' . phpversion(),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
    ]);

    return @mail($email, $subject, $body, $headers);
}
