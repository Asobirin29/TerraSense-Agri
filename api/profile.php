<?php
// ============================================
// TerraSense Agri — Profile API
// ============================================
// GET  ?action=get      — Ambil profil
// POST ?action=update   — Update profil
// POST ?action=avatar   — Upload avatar
// ============================================

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();
$userId = requireAuth();

$action = $_GET['action'] ?? 'get';

switch ($action) {
    case 'get':
        getProfile($userId);
        break;
    case 'update':
        updateProfile($userId);
        break;
    case 'avatar':
        uploadAvatar($userId);
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Action tidak valid'], 400);
}

// ============================================
// GET PROFILE
// ============================================
function getProfile(int $userId): void {
    $db = getDB();
    $stmt = $db->prepare('
        SELECT u.id, u.name, u.email, u.phone, u.avatar, u.bio, u.location, u.created_at,
               COUNT(f.id) as total_farms,
               COALESCE(SUM(f.area_ha), 0) as total_area
        FROM users u
        LEFT JOIN farms f ON f.user_id = u.id
        WHERE u.id = ?
        GROUP BY u.id
    ');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'User tidak ditemukan'], 404);
    }

    // Remove password from response
    unset($user['password']);

    jsonResponse([
        'success' => true,
        'user' => $user
    ]);
}

// ============================================
// UPDATE PROFILE
// ============================================
function updateProfile(int $userId): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $name = sanitize($input['name'] ?? '');
    $phone = sanitize($input['phone'] ?? '');
    $bio = sanitize($input['bio'] ?? '');
    $location = sanitize($input['location'] ?? '');

    if (empty($name) || strlen($name) < 2) {
        jsonResponse(['success' => false, 'message' => 'Nama harus minimal 2 karakter'], 422);
    }

    $db = getDB();
    $stmt = $db->prepare('UPDATE users SET name = ?, phone = ?, bio = ?, location = ? WHERE id = ?');
    $stmt->execute([$name, $phone, $bio, $location, $userId]);

    // Update session
    $_SESSION['user_name'] = $name;

    jsonResponse([
        'success' => true,
        'message' => 'Profil berhasil diperbarui'
    ]);
}

// ============================================
// UPLOAD AVATAR
// ============================================
function uploadAvatar(int $userId): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }

    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['success' => false, 'message' => 'File upload gagal'], 422);
    }

    $file = $_FILES['avatar'];

    // Validate file size
    if ($file['size'] > MAX_AVATAR_SIZE) {
        jsonResponse(['success' => false, 'message' => 'Ukuran file maksimal 2MB'], 422);
    }

    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        jsonResponse(['success' => false, 'message' => 'Format file harus JPG, PNG, atau WebP'], 422);
    }

    // Create upload directory if not exists
    if (!is_dir(AVATAR_DIR)) {
        mkdir(AVATAR_DIR, 0755, true);
    }

    // Generate unique filename
    $ext = match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => 'jpg',
    };
    $filename = 'avatar_' . $userId . '_' . time() . '.' . $ext;
    $filepath = AVATAR_DIR . $filename;

    // Delete old avatar
    $db = getDB();
    $stmt = $db->prepare('SELECT avatar FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $oldAvatar = $stmt->fetchColumn();

    if ($oldAvatar) {
        $oldPath = AVATAR_DIR . $oldAvatar;
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        jsonResponse(['success' => false, 'message' => 'Gagal menyimpan file'], 500);
    }

    // Update database
    $stmt = $db->prepare('UPDATE users SET avatar = ? WHERE id = ?');
    $stmt->execute([$filename, $userId]);

    jsonResponse([
        'success' => true,
        'message' => 'Foto profil berhasil diperbarui',
        'avatar' => $filename
    ]);
}
