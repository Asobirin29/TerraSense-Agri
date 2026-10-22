<?php
/**
 * Database Connection using PDO
 * TerraSense Agri — Config
 */

// ============================================
// APP CONSTANTS
// ============================================
define('APP_ENV', getenv('TERRASENSE_ENV') ?: 'development'); // 'development' | 'production'
// Base URL aplikasi — dipakai untuk membangun link (mis. reset password).
// Jangan diambil dari HTTP_HOST karena header itu bisa dipalsukan.
define('APP_URL', rtrim(getenv('TERRASENSE_URL') ?: 'http://localhost/TerraSense-Agri', '/'));
define('AVATAR_DIR', __DIR__ . '/../uploads/avatars/');
define('MAX_AVATAR_SIZE', 2 * 1024 * 1024); // 2MB

// ============================================
// DATABASE CONFIG
// ============================================
$host     = 'localhost';
$dbname   = 'terrasense_db';
$username = 'root';
$password = ''; // Default Laragon/XAMPP password is empty

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    try {
        // Database doesn't exist yet — create it
        $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
        $pdo->exec("USE `$dbname`;");
    } catch (PDOException $e2) {
        die(json_encode(['error' => 'Database connection failed. Please check your MySQL configuration.']));
    }
}

// ============================================
// GLOBAL HELPER FUNCTIONS
// ============================================

function getDB(): PDO {
    global $pdo;
    return $pdo;
}

function jsonResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function sanitize(mixed $input): mixed {
    if (is_array($input)) {
        foreach ($input as $k => $v) {
            $input[$k] = sanitize($v);
        }
        return $input;
    }
    if ($input === null) return null;
    return htmlspecialchars(strip_tags(trim((string)$input)), ENT_QUOTES, 'UTF-8');
}

function requireAuth(): int {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['success' => false, 'message' => 'Sesi tidak ditemukan. Silakan login kembali.'], 401);
    }
    return (int) $_SESSION['user_id'];
}

/**
 * Starts session with secure flags.
 * Call this ONCE at the top of each API endpoint that needs session.
 */
function startSecureSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
            'cookie_secure'   => $isSecure,
        ]);
    }
}

/**
 * Allow a maintenance script (migrate/seed) only from CLI or from the local machine.
 */
function requireLocalAccess(): void {
    if (PHP_SAPI === 'cli') return;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!in_array($ip, ['127.0.0.1', '::1'], true)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Forbidden']);
        exit;
    }
}

/**
 * Log an error to server log without exposing details to client.
 */
function logError(string $context, Throwable $e): void {
    error_log("[TerraSense Error] $context: " . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
}
?>
