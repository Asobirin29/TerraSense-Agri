<?php
// ============================================
// TerraSense Agri — Database Configuration
// ============================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'terrasense_agri');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Upload paths
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('AVATAR_DIR', UPLOAD_DIR . 'avatars/');
define('MAX_AVATAR_SIZE', 2 * 1024 * 1024); // 2MB

// Session config
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);

/**
 * Get PDO database connection
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }
    }
    return $pdo;
}

/**
 * Send JSON response
 */
function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Require authentication — returns user ID or sends 401
 */
function requireAuth(): int {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['success' => false, 'message' => 'Silakan login terlebih dahulu'], 401);
    }
    return (int) $_SESSION['user_id'];
}

/**
 * Sanitize input string
 */
function sanitize(string $input): string {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}
