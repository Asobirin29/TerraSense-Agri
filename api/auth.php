<?php
// ============================================
// TerraSense Agri — Auth API
// ============================================
// POST ?action=register  — Register petani baru
// POST ?action=login     — Login
// GET  ?action=logout    — Logout
// GET  ?action=check     — Cek status login
// ============================================

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Restrict CORS to same origin in production
$allowedOrigin = APP_ENV === 'production' ? 'https://yourdomain.com' : '*';
header('Access-Control-Allow-Origin: ' . $allowedOrigin);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

startSecureSession();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        handleCheck();
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Action tidak valid'], 400);
}

// ============================================
// REGISTER
// ============================================
function handleRegister(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $name     = sanitize($input['name'] ?? '');
    $email    = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = $input['password'] ?? '';
    $phone    = sanitize($input['phone'] ?? '');
    $location = sanitize($input['location'] ?? 'Sumedang, Jawa Barat');

    // Validasi
    if (empty($name) || strlen($name) < 2) {
        jsonResponse(['success' => false, 'message' => 'Nama harus minimal 2 karakter'], 422);
    }
    if (!$email) {
        jsonResponse(['success' => false, 'message' => 'Format email tidak valid'], 422);
    }
    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Password harus minimal 6 karakter'], 422);
    }

    try {
        $db = getDB();

        // Cek email sudah terdaftar
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Email sudah terdaftar. Silakan login.'], 409);
        }

        // Hash password & simpan
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $stmt = $db->prepare('INSERT INTO users (name, email, password, phone, location) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$name, $email, $hashedPassword, $phone, $location]);

        $userId = (int) $db->lastInsertId();

        // Auto-login setelah register
        $_SESSION['user_id']    = $userId;
        $_SESSION['user_name']  = $name;
        $_SESSION['user_email'] = $email;

        jsonResponse([
            'success' => true,
            'message' => 'Registrasi berhasil! Selamat datang, ' . $name,
            'user'    => [
                'id'    => $userId,
                'name'  => $name,
                'email' => $email,
            ]
        ], 201);
    } catch (PDOException $e) {
        logError('register', $e);
        jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server. Silakan coba lagi.'], 500);
    }
}

// ============================================
// LOGIN (with simple rate limiting)
// ============================================
function handleLogin(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }

    // Basic rate limiting via session counter
    $attempts      = $_SESSION['login_attempts'] ?? 0;
    $lastAttemptAt = $_SESSION['login_last_attempt'] ?? 0;
    $lockoutSecs   = 300; // 5 minutes

    if ($attempts >= 5 && (time() - $lastAttemptAt) < $lockoutSecs) {
        $remaining = $lockoutSecs - (time() - $lastAttemptAt);
        jsonResponse(['success' => false, 'message' => "Terlalu banyak percobaan login. Coba lagi dalam {$remaining} detik."], 429);
    }

    // Reset attempts if lockout window has passed
    if ((time() - $lastAttemptAt) >= $lockoutSecs) {
        $_SESSION['login_attempts'] = 0;
    }

    $input    = json_decode(file_get_contents('php://input'), true);
    $email    = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = $input['password'] ?? '';

    if (!$email || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Email dan password harus diisi'], 422);
    }

    try {
        $db   = getDB();
        $stmt = $db->prepare('SELECT id, name, email, password, avatar FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            // Track failed attempt
            $_SESSION['login_attempts']    = ($attempts + 1);
            $_SESSION['login_last_attempt'] = time();
            jsonResponse(['success' => false, 'message' => 'Email atau password salah'], 401);
        }

        // Success — clear rate limit & regenerate session
        unset($_SESSION['login_attempts'], $_SESSION['login_last_attempt']);
        session_regenerate_id(true);

        $_SESSION['user_id']    = (int) $user['id'];
        $_SESSION['user_name']  = $user['name'];
        $_SESSION['user_email'] = $user['email'];

        jsonResponse([
            'success' => true,
            'message' => 'Login berhasil! Selamat datang kembali, ' . $user['name'],
            'user'    => [
                'id'     => (int) $user['id'],
                'name'   => $user['name'],
                'email'  => $user['email'],
                'avatar' => $user['avatar'],
            ]
        ]);
    } catch (PDOException $e) {
        logError('login', $e);
        jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server. Silakan coba lagi.'], 500);
    }
}

// ============================================
// LOGOUT
// ============================================
function handleLogout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    session_destroy();
    jsonResponse(['success' => true, 'message' => 'Logout berhasil']);
}

// ============================================
// CHECK AUTH STATUS
// ============================================
function handleCheck(): void {
    if (isset($_SESSION['user_id'])) {
        $db = getDB();
        $stmt = $db->prepare('SELECT id, name, email, avatar, location FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if ($user) {
            jsonResponse([
                'success' => true,
                'authenticated' => true,
                'user' => $user
            ]);
        }
    }
    jsonResponse([
        'success' => true,
        'authenticated' => false,
        'user' => null
    ]);
}
