<?php
// ============================================
// TerraSense Agri — Farms API
// ============================================
// GET    (no action)       — List semua lahan
// GET    ?id=X             — Detail satu lahan
// POST   ?action=save      — Simpan lahan baru
// POST   ?action=update    — Update lahan
// POST   ?action=delete    — Hapus lahan
// POST   ?action=analyze   — Simpan hasil analisis
// GET    ?action=analyses&farm_id=X — Riwayat analisis
// GET    ?action=recent    — Analisis terbaru
// ============================================

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();
$userId = requireAuth();

$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

// Routing
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'analyses') {
        getFarmAnalyses($userId);
    } elseif ($action === 'recent') {
        getRecentAnalyses($userId);
    } elseif ($id) {
        getFarmDetail($userId, $id);
    } else {
        listFarms($userId);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    switch ($action) {
        case 'save':
            saveFarm($userId);
            break;
        case 'update':
            updateFarm($userId);
            break;
        case 'delete':
            deleteFarm($userId);
            break;
        case 'analyze':
            saveAnalysis($userId);
            break;
        default:
            jsonResponse(['success' => false, 'message' => 'Action tidak valid'], 400);
    }
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

// ============================================
// LIST ALL FARMS
// ============================================
function listFarms(int $userId): void {
    $db = getDB();
    $stmt = $db->prepare('
        SELECT f.*, 
               (SELECT COUNT(*) FROM farm_analyses WHERE farm_id = f.id) as analysis_count,
               (SELECT analyzed_at FROM farm_analyses WHERE farm_id = f.id ORDER BY analyzed_at DESC LIMIT 1) as last_analyzed
        FROM farms f 
        WHERE f.user_id = ? 
        ORDER BY f.updated_at DESC
    ');
    $stmt->execute([$userId]);
    $farms = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'farms' => $farms,
        'total' => count($farms)
    ]);
}

// ============================================
// GET FARM DETAIL
// ============================================
function getFarmDetail(int $userId, int $farmId): void {
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);
    $farm = $stmt->fetch();

    if (!$farm) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    // Get latest analysis
    $stmt = $db->prepare('SELECT * FROM farm_analyses WHERE farm_id = ? ORDER BY analyzed_at DESC LIMIT 1');
    $stmt->execute([$farmId]);
    $latestAnalysis = $stmt->fetch();

    $farm['latest_analysis'] = $latestAnalysis;

    jsonResponse([
        'success' => true,
        'farm' => $farm
    ]);
}

// ============================================
// SAVE NEW FARM
// ============================================
function saveFarm(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);

    $name = sanitize($input['name'] ?? 'Lahan Saya');
    $geojson = $input['geojson'] ?? '';
    $areaHa = (float) ($input['area_ha'] ?? 0);
    $elevation = (float) ($input['elevation'] ?? 0);
    $zone = $input['zone'] ?? 'midland';
    $lat = (float) ($input['latitude'] ?? 0);
    $lon = (float) ($input['longitude'] ?? 0);
    $notes = sanitize($input['notes'] ?? '');

    if (empty($geojson)) {
        jsonResponse(['success' => false, 'message' => 'Data polygon lahan wajib diisi'], 422);
    }

    // Validate zone
    if (!in_array($zone, ['highland', 'midland', 'lowland'])) {
        $zone = 'midland';
    }

    $db = getDB();
    $stmt = $db->prepare('
        INSERT INTO farms (user_id, name, geojson, area_ha, elevation, zone, latitude, longitude, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $userId, $name, 
        is_string($geojson) ? $geojson : json_encode($geojson),
        $areaHa, $elevation, $zone, $lat, $lon, $notes
    ]);

    $farmId = (int) $db->lastInsertId();

    jsonResponse([
        'success' => true,
        'message' => 'Lahan berhasil disimpan!',
        'farm_id' => $farmId
    ], 201);
}

// ============================================
// UPDATE FARM
// ============================================
function updateFarm(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $farmId = (int) ($input['id'] ?? 0);

    if (!$farmId) {
        jsonResponse(['success' => false, 'message' => 'ID lahan wajib diisi'], 422);
    }

    // Verify ownership
    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    $name = sanitize($input['name'] ?? 'Lahan Saya');
    $notes = sanitize($input['notes'] ?? '');

    $stmt = $db->prepare('UPDATE farms SET name = ?, notes = ? WHERE id = ? AND user_id = ?');
    $stmt->execute([$name, $notes, $farmId, $userId]);

    jsonResponse([
        'success' => true,
        'message' => 'Data lahan berhasil diperbarui'
    ]);
}

// ============================================
// DELETE FARM
// ============================================
function deleteFarm(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $farmId = (int) ($input['id'] ?? 0);

    if (!$farmId) {
        jsonResponse(['success' => false, 'message' => 'ID lahan wajib diisi'], 422);
    }

    $db = getDB();
    $stmt = $db->prepare('DELETE FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    jsonResponse([
        'success' => true,
        'message' => 'Lahan berhasil dihapus'
    ]);
}

// ============================================
// SAVE ANALYSIS
// ============================================
function saveAnalysis(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $farmId = (int) ($input['farm_id'] ?? 0);

    if (!$farmId) {
        jsonResponse(['success' => false, 'message' => 'ID lahan wajib diisi'], 422);
    }

    // Verify ownership
    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    $temperature = (float) ($input['temperature'] ?? 0);
    $humidity = (float) ($input['humidity'] ?? 0);
    $precipitation = (float) ($input['precipitation'] ?? 0);
    $zone = $input['zone'] ?? 'midland';
    $recommendations = json_encode($input['recommendations'] ?? []);
    $dosage = json_encode($input['dosage'] ?? []);

    $stmt = $db->prepare('
        INSERT INTO farm_analyses (farm_id, temperature, humidity, precipitation, zone, recommendations, dosage)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$farmId, $temperature, $humidity, $precipitation, $zone, $recommendations, $dosage]);

    jsonResponse([
        'success' => true,
        'message' => 'Hasil analisis berhasil disimpan',
        'analysis_id' => (int) $db->lastInsertId()
    ], 201);
}

// ============================================
// GET FARM ANALYSES
// ============================================
function getFarmAnalyses(int $userId): void {
    $farmId = (int) ($_GET['farm_id'] ?? 0);

    if (!$farmId) {
        jsonResponse(['success' => false, 'message' => 'ID lahan wajib diisi'], 422);
    }

    // Verify ownership
    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    $stmt = $db->prepare('SELECT * FROM farm_analyses WHERE farm_id = ? ORDER BY analyzed_at DESC LIMIT 20');
    $stmt->execute([$farmId]);
    $analyses = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'analyses' => $analyses
    ]);
}

// ============================================
// GET RECENT ANALYSES (across all farms)
// ============================================
function getRecentAnalyses(int $userId): void {
    $db = getDB();
    $stmt = $db->prepare('
        SELECT fa.*, f.name as farm_name 
        FROM farm_analyses fa
        JOIN farms f ON fa.farm_id = f.id
        WHERE f.user_id = ?
        ORDER BY fa.analyzed_at DESC
        LIMIT 10
    ');
    $stmt->execute([$userId]);
    $analyses = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'analyses' => $analyses
    ]);
}
