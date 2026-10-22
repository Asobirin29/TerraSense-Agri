<?php
// ============================================
// TerraSense Agri — Harvests API
// ============================================
// GET    ?action=list      — List semua riwayat panen
// GET    ?action=stats     — Statistik analitik panen (Chart.js)
// POST   ?action=save      — Simpan log panen baru (Reset status lahan)
// POST   ?action=delete    — Hapus log panen
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
$userId = requireAuth();

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'stats') {
        getHarvestStats($userId);
    } else {
        listHarvests($userId);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'save') {
        saveHarvest($userId);
    } elseif ($action === 'delete') {
        deleteHarvest($userId);
    } else {
        jsonResponse(['success' => false, 'message' => 'Action tidak valid'], 400);
    }
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

// ============================================
// LIST ALL HARVESTS
// ============================================
function listHarvests(int $userId): void {
    $db = getDB();
    $stmt = $db->prepare('
        SELECT hl.*, f.name as farm_name, f.area_ha
        FROM harvest_logs hl
        JOIN farms f ON hl.farm_id = f.id
        WHERE f.user_id = ?
        ORDER BY hl.harvest_date DESC, hl.created_at DESC
    ');
    $stmt->execute([$userId]);
    $harvests = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'harvests' => $harvests,
        'total' => count($harvests)
    ]);
}

// ============================================
// GET HARVEST STATS (For Dashboard Charts)
// ============================================
function getHarvestStats(int $userId): void {
    $db = getDB();

    // 1. General Metrics
    $stmt = $db->prepare('
        SELECT 
            COALESCE(SUM(hl.actual_yield_ton), 0) as total_yield,
            COUNT(hl.id) as total_cycles,
            COALESCE(SUM(f.area_ha), 0) as total_area_harvested
        FROM harvest_logs hl
        JOIN farms f ON hl.farm_id = f.id
        WHERE f.user_id = ?
    ');
    $stmt->execute([$userId]);
    $metrics = $stmt->fetch();

    $totalYield = (float) $metrics['total_yield'];
    $totalCycles = (int) $metrics['total_cycles'];
    $totalArea = (float) $metrics['total_area_harvested'];
    $avgProductivity = $totalArea > 0 ? ($totalYield / $totalArea) : 0;

    // 2. Yield By Crop (Doughnut Chart)
    $stmt = $db->prepare('
        SELECT 
            hl.crop_name, 
            COALESCE(SUM(hl.actual_yield_ton), 0) as total_yield
        FROM harvest_logs hl
        JOIN farms f ON hl.farm_id = f.id
        WHERE f.user_id = ?
        GROUP BY hl.crop_name
        ORDER BY total_yield DESC
    ');
    $stmt->execute([$userId]);
    $byCrop = $stmt->fetchAll();

    // 3. Monthly Trend (Line Chart)
    $stmt = $db->prepare("
        SELECT 
            DATE_FORMAT(hl.harvest_date, '%Y-%m') as month_key,
            DATE_FORMAT(hl.harvest_date, '%b %y') as month_label,
            COALESCE(SUM(hl.actual_yield_ton), 0) as total_yield,
            COALESCE(SUM(hl.estimated_yield_ton), 0) as estimated_yield
        FROM harvest_logs hl
        JOIN farms f ON hl.farm_id = f.id
        WHERE f.user_id = ?
          AND hl.harvest_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month_key, month_label
        ORDER BY month_key ASC
    ");
    $stmt->execute([$userId]);
    $monthlyTrend = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'metrics' => [
            'total_yield' => $totalYield,
            'total_cycles' => $totalCycles,
            'total_area' => $totalArea,
            'avg_productivity' => round($avgProductivity, 2)
        ],
        'by_crop' => $byCrop,
        'monthly_trend' => $monthlyTrend
    ]);
}

// ============================================
// SAVE NEW HARVEST (Atomic transaction)
// ============================================
function saveHarvest(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);

    $farmId      = (int) ($input['farm_id'] ?? 0);
    $cropId      = sanitize($input['crop_id'] ?? '');   // Default empty string (NOT NULL)
    $cropName    = sanitize($input['crop_name'] ?? '');
    $plantingDate = sanitize($input['planting_date'] ?? '');
    $harvestDate  = sanitize($input['harvest_date'] ?? date('Y-m-d'));
    $estYield    = isset($input['estimated_yield_ton']) ? (float) $input['estimated_yield_ton'] : null;
    $actYield    = isset($input['actual_yield_ton'])    ? (float) $input['actual_yield_ton']    : 0.0;
    $notes       = sanitize($input['notes'] ?? '');

    if (!$farmId || empty($cropName) || empty($plantingDate)) {
        jsonResponse(['success' => false, 'message' => 'Data input tidak lengkap (farm_id, crop_name, planting_date wajib diisi)'], 422);
    }

    $db = getDB();

    // Verify ownership of the farm
    $stmt = $db->prepare('SELECT id FROM farms WHERE id = ? AND user_id = ?');
    $stmt->execute([$farmId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan atau bukan milik Anda'], 404);
    }

    try {
        $db->beginTransaction();

        // 1. Insert into harvest_logs
        $stmt = $db->prepare('
            INSERT INTO harvest_logs (farm_id, crop_id, crop_name, planting_date, harvest_date, estimated_yield_ton, actual_yield_ton, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $farmId, $cropId, $cropName, $plantingDate, $harvestDate, $estYield, $actYield, $notes
        ]);

        // 2. Reset the farm's active crop status (freeing it up for new cycle)
        $stmt = $db->prepare('
            UPDATE farms 
            SET crop_id = NULL, planting_date = NULL, is_fertilized = 0, updated_at = NOW() 
            WHERE id = ?
        ');
        $stmt->execute([$farmId]);

        $db->commit();

        jsonResponse([
            'success' => true,
            'message' => 'Hasil panen berhasil dicatat dan status lahan telah di-reset!'
        ], 201);

    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['success' => false, 'message' => 'Gagal mencatat panen: ' . $e->getMessage()], 500);
    }
}

// ============================================
// DELETE HARVEST LOG
// ============================================
function deleteHarvest(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $logId = (int) ($input['id'] ?? $_GET['id'] ?? 0);

    if (!$logId) {
        jsonResponse(['success' => false, 'message' => 'ID log panen wajib diisi'], 422);
    }

    $db = getDB();

    // Verify ownership of the log
    $stmt = $db->prepare('
        SELECT hl.id 
        FROM harvest_logs hl
        JOIN farms f ON hl.farm_id = f.id
        WHERE hl.id = ? AND f.user_id = ?
    ');
    $stmt->execute([$logId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Log panen tidak ditemukan'], 404);
    }

    // Delete
    $stmt = $db->prepare('DELETE FROM harvest_logs WHERE id = ?');
    $stmt->execute([$logId]);

    jsonResponse([
        'success' => true,
        'message' => 'Log riwayat panen berhasil dihapus'
    ]);
}
