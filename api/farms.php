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
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$allowedOrigin = APP_ENV === 'production' ? 'https://yourdomain.com' : '*';
header('Access-Control-Allow-Origin: ' . $allowedOrigin);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

startSecureSession();
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
// QUESTIONNAIRE ANSWERS (texture & slope) — invalid values fall back to the given defaults
// ============================================
function landAnswers(array $input, ?string $texture, $slope): array {
    if (isset($input['soil_texture']) && in_array($input['soil_texture'], ['halus', 'agak_halus', 'sedang', 'agak_kasar', 'kasar'], true)) {
        $texture = $input['soil_texture'];
    }
    if (isset($input['slope_pct']) && is_numeric($input['slope_pct']) && $input['slope_pct'] >= 0 && $input['slope_pct'] <= 100) {
        $slope = (float) $input['slope_pct'];
    }
    return [$texture, $slope === null ? null : (float) $slope];
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

    // Get saved evaluations if available
    $stmtEval = $db->prepare('
        SELECT e.*, k.nama_komoditas, k.nama_latin, k.icon_emoji, k.kelompok, k.deskripsi_umum
        FROM evaluations e
        JOIN komoditas k ON k.id_komoditas = e.id_komoditas
        WHERE e.id_farm = ?
        ORDER BY e.skor_kecocokan DESC, e.id_eval ASC
    ');
    $stmtEval->execute([$farmId]);
    $farm['evaluations'] = $stmtEval->fetchAll();

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
    if (!is_array($input)) $input = [];

    $name     = sanitize($input['name'] ?? 'Lahan Saya');
    $geojson  = $input['geojson'] ?? '';
    $areaHa   = (float) ($input['area_ha'] ?? 0);
    $elevation = (float) ($input['elevation'] ?? 0);
    $zone     = $input['zone'] ?? 'midland';
    $lat      = (float) ($input['latitude'] ?? 0);
    $lon      = (float) ($input['longitude'] ?? 0);
    $notes    = sanitize($input['notes'] ?? '');

    $crop_id           = !empty($input['crop_id']) ? sanitize($input['crop_id']) : null;
    $planting_date     = !empty($input['planting_date']) ? sanitize($input['planting_date']) : null;
    $irrigation_status = !empty($input['irrigation_status']) ? sanitize($input['irrigation_status']) : 'Tidak Ada Irigasi';
    $is_fertilized     = isset($input['is_fertilized']) ? (int) $input['is_fertilized'] : 0;
    [$soil_texture, $slope_pct] = landAnswers($input, null, null);

    if (empty($geojson)) {
        jsonResponse(['success' => false, 'message' => 'Data polygon lahan wajib diisi'], 422);
    }

    // Validate zone
    if (!in_array($zone, ['highland', 'midland', 'lowland'])) {
        $zone = 'midland';
    }

    // Validate coordinates
    if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
        jsonResponse(['success' => false, 'message' => 'Koordinat tidak valid'], 422);
    }

    $db = getDB();
    $stmt = $db->prepare('
        INSERT INTO farms (user_id, name, geojson, area_ha, elevation, zone, latitude, longitude, notes, crop_id, planting_date, irrigation_status, is_fertilized, soil_texture, slope_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $userId, $name,
        is_string($geojson) ? $geojson : json_encode($geojson),
        $areaHa, $elevation, $zone, $lat, $lon, $notes, $crop_id, $planting_date, $irrigation_status, $is_fertilized,
        $soil_texture, $slope_pct
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
    if (!is_array($input)) $input = [];
    $farmId = (int) ($input['id'] ?? $_GET['id'] ?? 0);

    if (!$farmId) {
        jsonResponse(['success' => false, 'message' => 'ID lahan wajib diisi'], 422);
    }

    // Verify ownership and get current values
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);
    $currentFarm = $stmt->fetch();
    if (!$currentFarm) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    $name = isset($input['name']) ? sanitize($input['name']) : $currentFarm['name'];
    $notes = isset($input['notes']) ? sanitize($input['notes']) : $currentFarm['notes'];
    
    // For crop_id and planting_date, we need to allow setting them to null explicitly.
    // If not provided in input, keep current. If provided as empty string, set to null.
    $crop_id = $currentFarm['crop_id'];
    if (array_key_exists('crop_id', $input)) {
        $crop_id = !empty($input['crop_id']) ? sanitize($input['crop_id']) : null;
    }
    
    $planting_date = $currentFarm['planting_date'];
    if (array_key_exists('planting_date', $input)) {
        $planting_date = !empty($input['planting_date']) ? sanitize($input['planting_date']) : null;
    }
    
    $irrigation_status = isset($input['irrigation_status']) ? sanitize($input['irrigation_status']) : $currentFarm['irrigation_status'];
    $is_fertilized = isset($input['is_fertilized']) ? (int) $input['is_fertilized'] : $currentFarm['is_fertilized'];
    [$soil_texture, $slope_pct] = landAnswers($input, $currentFarm['soil_texture'], $currentFarm['slope_pct']);

    $stmt = $db->prepare('UPDATE farms SET name = ?, notes = ?, crop_id = ?, planting_date = ?, irrigation_status = ?, is_fertilized = ?, soil_texture = ?, slope_pct = ?, updated_at = NOW() WHERE id = ? AND user_id = ?');
    $stmt->execute([$name, $notes, $crop_id, $planting_date, $irrigation_status, $is_fertilized, $soil_texture, $slope_pct, $farmId, $userId]);

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
    $farmId = (int) ($input['id'] ?? $_GET['id'] ?? 0);

    if (!$farmId) {
        jsonResponse(['success' => false, 'message' => 'ID lahan wajib diisi'], 422);
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    // Tables created by migrate.php have no foreign keys, so delete child rows explicitly
    try {
        $db->beginTransaction();
        $db->prepare('DELETE FROM farm_analyses WHERE farm_id = ?')->execute([$farmId]);
        $db->prepare('DELETE FROM harvest_logs WHERE farm_id = ?')->execute([$farmId]);
        $db->prepare('DELETE FROM evaluations WHERE id_farm = ?')->execute([$farmId]);
        $db->prepare('DELETE FROM farms WHERE id = ? AND user_id = ?')->execute([$farmId, $userId]);
        $db->commit();
    } catch (PDOException $e) {
        $db->rollBack();
        logError('farms - delete', $e);
        jsonResponse(['success' => false, 'message' => 'Gagal menghapus lahan. Silakan coba lagi.'], 500);
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
