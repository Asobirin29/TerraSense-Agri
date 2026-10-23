<?php
// ============================================
// TerraSense Agri — Farm Activities API
// ============================================
// GET    ?cycle_id=X       — Kegiatan satu musim tanam
// POST   ?action=save      — Catat kegiatan (pupuk / pengairan / observasi / lainnya)
// POST   ?action=delete    — Hapus kegiatan
// ============================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/services/CycleService.php';

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
    listActivities($userId);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'save') {
        saveActivity($userId);
    } elseif ($action === 'delete') {
        deleteActivity($userId);
    } else {
        jsonResponse(['success' => false, 'message' => 'Action tidak valid'], 400);
    }
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

/** Optional non-negative number from input, or null. */
function numberOrNull(array $input, string $key, string $label): ?float {
    if (!isset($input[$key]) || $input[$key] === '') return null;
    if (!is_numeric($input[$key]) || $input[$key] < 0) {
        jsonResponse(['success' => false, 'message' => "$label tidak valid"], 422);
    }
    return (float) $input[$key];
}

function textOrNull(array $input, string $key, int $maxLen = 255): ?string {
    $value = sanitize($input[$key] ?? '');
    return $value === '' ? null : mb_substr($value, 0, $maxLen);
}

// ============================================
// LIST ACTIVITIES OF ONE CYCLE
// ============================================
function listActivities(int $userId): void {
    $cycleId = (int) ($_GET['cycle_id'] ?? 0);
    $db = getDB();
    if (!$cycleId || !CycleService::findCycle($db, $cycleId, $userId)) {
        jsonResponse(['success' => false, 'message' => 'Musim tanam tidak ditemukan'], 404);
    }

    $stmt = $db->prepare('SELECT * FROM farm_activities WHERE cycle_id = ? ORDER BY activity_date DESC, id DESC');
    $stmt->execute([$cycleId]);
    jsonResponse(['success' => true, 'activities' => $stmt->fetchAll()]);
}

// ============================================
// SAVE ACTIVITY
// ============================================
function saveActivity(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = [];

    $db = getDB();

    // Target cycle: explicit cycle_id, or the active cycle of farm_id
    $cycle = null;
    if (!empty($input['cycle_id'])) {
        $cycle = CycleService::findCycle($db, (int) $input['cycle_id'], $userId);
    } elseif (!empty($input['farm_id']) && CycleService::findFarm($db, (int) $input['farm_id'], $userId)) {
        $cycle = CycleService::getActiveCycle($db, (int) $input['farm_id']);
    }
    if (!$cycle) {
        jsonResponse(['success' => false, 'message' => 'Musim tanam tidak ditemukan. Mulai tanam terlebih dahulu.'], 404);
    }

    $type = $input['type'] ?? '';
    if (!in_array($type, ['pupuk', 'pengairan', 'observasi', 'lainnya'], true)) {
        jsonResponse(['success' => false, 'message' => 'Jenis kegiatan tidak valid'], 422);
    }
    $date = $input['activity_date'] ?? date('Y-m-d');
    if (!CycleService::validDate($date)) {
        jsonResponse(['success' => false, 'message' => 'Tanggal kegiatan tidak valid'], 422);
    }
    if ($date < $cycle['planting_date']) {
        jsonResponse(['success' => false, 'message' => 'Tanggal kegiatan tidak boleh sebelum tanggal tanam'], 422);
    }

    $row = [
        'fertilizer_name' => null, 'fertilizer_phase' => null, 'amount' => null, 'unit' => null,
        'water_method' => null, 'duration_min' => null,
        'growth_stage' => null, 'plant_height_cm' => null, 'condition' => null, 'pest_disease' => null,
    ];

    if ($type === 'pupuk') {
        $row['fertilizer_name'] = textOrNull($input, 'fertilizer_name', 100);
        $row['amount'] = numberOrNull($input, 'amount', 'Jumlah pupuk');
        if (!$row['fertilizer_name'] || !$row['amount']) {
            jsonResponse(['success' => false, 'message' => 'Nama pupuk dan jumlahnya wajib diisi'], 422);
        }
        $unit = $input['unit'] ?? 'kg';
        $row['unit'] = in_array($unit, ['kg', 'liter', 'karung', 'gram', 'ml'], true) ? $unit : 'kg';
        $row['fertilizer_phase'] = textOrNull($input, 'fertilizer_phase', 50);
    } elseif ($type === 'pengairan') {
        $row['water_method'] = textOrNull($input, 'water_method', 50);
        $duration = numberOrNull($input, 'duration_min', 'Durasi');
        $row['duration_min'] = $duration === null ? null : (int) $duration;
    } elseif ($type === 'observasi') {
        $row['growth_stage'] = textOrNull($input, 'growth_stage', 50);
        $row['plant_height_cm'] = numberOrNull($input, 'plant_height_cm', 'Tinggi tanaman');
        $condition = $input['condition'] ?? '';
        $row['condition'] = in_array($condition, ['baik', 'sedang', 'buruk'], true) ? $condition : null;
        $row['pest_disease'] = textOrNull($input, 'pest_disease');
    }

    $cost = numberOrNull($input, 'cost', 'Biaya');
    $notes = textOrNull($input, 'notes', 2000);
    if ($type === 'lainnya' && !$notes) {
        jsonResponse(['success' => false, 'message' => 'Keterangan kegiatan wajib diisi'], 422);
    }

    $stmt = $db->prepare('
        INSERT INTO farm_activities (cycle_id, farm_id, type, activity_date, fertilizer_name, fertilizer_phase, amount, unit,
                                     water_method, duration_min, growth_stage, plant_height_cm, `condition`, pest_disease, cost, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $cycle['id'], $cycle['farm_id'], $type, $date,
        $row['fertilizer_name'], $row['fertilizer_phase'], $row['amount'], $row['unit'],
        $row['water_method'], $row['duration_min'],
        $row['growth_stage'], $row['plant_height_cm'], $row['condition'], $row['pest_disease'],
        $cost, $notes,
    ]);
    $activityId = (int) $db->lastInsertId();

    if ($type === 'pupuk' && $cycle['status'] === 'aktif') {
        $db->prepare('UPDATE farms SET is_fertilized = 1, updated_at = NOW() WHERE id = ?')->execute([$cycle['farm_id']]);
    }

    jsonResponse(['success' => true, 'message' => 'Kegiatan berhasil dicatat', 'activity_id' => $activityId], 201);
}

// ============================================
// DELETE ACTIVITY
// ============================================
function deleteActivity(int $userId): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $activityId = (int) ($input['id'] ?? $_GET['id'] ?? 0);

    $db = getDB();
    $stmt = $db->prepare('
        SELECT fa.id, fa.farm_id, pc.id AS cycle_id, pc.status
        FROM farm_activities fa
        JOIN planting_cycles pc ON pc.id = fa.cycle_id
        WHERE fa.id = ? AND pc.user_id = ?
    ');
    $stmt->execute([$activityId, $userId]);
    $activity = $stmt->fetch();
    if (!$activity) {
        jsonResponse(['success' => false, 'message' => 'Kegiatan tidak ditemukan'], 404);
    }

    $db->prepare('DELETE FROM farm_activities WHERE id = ?')->execute([$activityId]);

    // Keep farms.is_fertilized consistent with what is left in the active cycle
    if ($activity['status'] === 'aktif') {
        $stmt = $db->prepare("SELECT COUNT(*) FROM farm_activities WHERE cycle_id = ? AND type = 'pupuk'");
        $stmt->execute([$activity['cycle_id']]);
        $db->prepare('UPDATE farms SET is_fertilized = ? WHERE id = ?')
           ->execute([(int) $stmt->fetchColumn() > 0 ? 1 : 0, $activity['farm_id']]);
    }

    jsonResponse(['success' => true, 'message' => 'Kegiatan dihapus']);
}
