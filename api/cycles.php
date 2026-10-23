<?php
// ============================================
// TerraSense Agri — Planting Cycles API (Musim Tanam)
// ============================================
// GET    ?farm_id=X        — Semua musim tanam satu lahan + ringkasan
// GET    ?action=detail&id=Y — Satu musim tanam + timeline kegiatan
// POST   ?action=start     — Mulai musim tanam baru (maks. 1 aktif per lahan)
// POST   ?action=update    — Ubah data musim tanam
// POST   ?action=fail      — Tandai gagal panen
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
    if ($action === 'detail') {
        getCycleDetail($userId);
    } else {
        listCycles($userId);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    switch ($action) {
        case 'start':
            startCycle($userId);
            break;
        case 'update':
            updateCycle($userId);
            break;
        case 'fail':
            failCycle($userId);
            break;
        default:
            jsonResponse(['success' => false, 'message' => 'Action tidak valid'], 400);
    }
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function readInput(): array {
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

/** Optional non-negative number from input, or null. */
function optionalNumber(array $input, string $key): ?float {
    if (!isset($input[$key]) || $input[$key] === '') return null;
    if (!is_numeric($input[$key]) || $input[$key] < 0) {
        jsonResponse(['success' => false, 'message' => "Nilai $key tidak valid"], 422);
    }
    return (float) $input[$key];
}

function harvestDays(array $input, int $fallback): int {
    if (!isset($input['expected_harvest_days']) || $input['expected_harvest_days'] === '') return $fallback;
    $days = (int) $input['expected_harvest_days'];
    if ($days < 1 || $days > 3650) {
        jsonResponse(['success' => false, 'message' => 'Umur panen harus antara 1 dan 3650 hari'], 422);
    }
    return $days;
}

// ============================================
// LIST CYCLES OF ONE FARM
// ============================================
function listCycles(int $userId): void {
    $farmId = (int) ($_GET['farm_id'] ?? 0);
    if (!$farmId) {
        jsonResponse(['success' => false, 'message' => 'ID lahan wajib diisi'], 422);
    }

    $db = getDB();
    if (!CycleService::findFarm($db, $farmId, $userId)) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }

    $stmt = $db->prepare('
        SELECT pc.*, hl.id AS harvest_id, hl.harvest_date, hl.actual_yield_ton, hl.estimated_yield_ton
        FROM planting_cycles pc
        LEFT JOIN harvest_logs hl ON hl.cycle_id = pc.id
        WHERE pc.farm_id = ?
        ORDER BY (pc.status = \'aktif\') DESC, pc.planting_date DESC, pc.id DESC
    ');
    $stmt->execute([$farmId]);
    $cycles = $stmt->fetchAll();

    foreach ($cycles as &$cycle) {
        $cycle['summary'] = CycleService::summarize($db, $cycle);
    }
    unset($cycle);

    // Harvests recorded before cycles existed (cycle_id IS NULL)
    $stmt = $db->prepare('SELECT * FROM harvest_logs WHERE farm_id = ? AND cycle_id IS NULL ORDER BY harvest_date DESC');
    $stmt->execute([$farmId]);

    jsonResponse([
        'success' => true,
        'cycles' => $cycles,
        'legacy_harvests' => $stmt->fetchAll(),
    ]);
}

// ============================================
// CYCLE DETAIL + TIMELINE
// ============================================
function getCycleDetail(int $userId): void {
    $cycleId = (int) ($_GET['id'] ?? 0);
    $db = getDB();
    $cycle = $cycleId ? CycleService::findCycle($db, $cycleId, $userId) : null;
    if (!$cycle) {
        jsonResponse(['success' => false, 'message' => 'Musim tanam tidak ditemukan'], 404);
    }

    $stmt = $db->prepare('SELECT * FROM farm_activities WHERE cycle_id = ? ORDER BY activity_date DESC, id DESC');
    $stmt->execute([$cycleId]);
    $cycle['activities'] = $stmt->fetchAll();
    $cycle['summary'] = CycleService::summarize($db, $cycle);

    $stmt = $db->prepare('SELECT * FROM harvest_logs WHERE cycle_id = ? LIMIT 1');
    $stmt->execute([$cycleId]);
    $cycle['harvest'] = $stmt->fetch() ?: null;

    jsonResponse(['success' => true, 'cycle' => $cycle]);
}

// ============================================
// START NEW CYCLE
// ============================================
function startCycle(int $userId): void {
    $input = readInput();
    $farmId = (int) ($input['farm_id'] ?? 0);
    $cropName = sanitize($input['crop_name'] ?? '');
    $plantingDate = $input['planting_date'] ?? '';

    if (!$farmId || $cropName === '') {
        jsonResponse(['success' => false, 'message' => 'Lahan dan nama tanaman wajib diisi'], 422);
    }
    if (!CycleService::validDate($plantingDate)) {
        jsonResponse(['success' => false, 'message' => 'Tanggal tanam tidak valid'], 422);
    }

    $db = getDB();
    $farm = CycleService::findFarm($db, $farmId, $userId);
    if (!$farm) {
        jsonResponse(['success' => false, 'message' => 'Lahan tidak ditemukan'], 404);
    }
    if (CycleService::getActiveCycle($db, $farmId)) {
        jsonResponse(['success' => false, 'message' => 'Lahan ini masih memiliki musim tanam aktif. Catat panen atau tandai gagal terlebih dahulu.'], 409);
    }

    $data = [
        'komoditas_id' => isset($input['komoditas_id']) && is_numeric($input['komoditas_id']) ? (int) $input['komoditas_id'] : null,
        'crop_name' => $cropName,
        'planting_date' => $plantingDate,
        'expected_harvest_days' => harvestDays($input, CycleService::DEFAULT_HARVEST_DAYS),
        'seed_cost' => optionalNumber($input, 'seed_cost'),
        'notes' => sanitize($input['notes'] ?? '') ?: null,
    ];

    try {
        $db->beginTransaction();
        $cycleId = CycleService::start($db, $farm, $data);
        $db->commit();
    } catch (PDOException $e) {
        $db->rollBack();
        logError('cycles - start', $e);
        jsonResponse(['success' => false, 'message' => 'Gagal memulai musim tanam'], 500);
    }

    jsonResponse(['success' => true, 'message' => 'Musim tanam dimulai!', 'cycle_id' => $cycleId], 201);
}

// ============================================
// UPDATE CYCLE
// ============================================
function updateCycle(int $userId): void {
    $input = readInput();
    $cycleId = (int) ($input['id'] ?? 0);
    $db = getDB();
    $cycle = $cycleId ? CycleService::findCycle($db, $cycleId, $userId) : null;
    if (!$cycle) {
        jsonResponse(['success' => false, 'message' => 'Musim tanam tidak ditemukan'], 404);
    }

    $cropName = isset($input['crop_name']) ? sanitize($input['crop_name']) : $cycle['crop_name'];
    if ($cropName === '') {
        jsonResponse(['success' => false, 'message' => 'Nama tanaman wajib diisi'], 422);
    }
    $plantingDate = $input['planting_date'] ?? $cycle['planting_date'];
    if (!CycleService::validDate($plantingDate)) {
        jsonResponse(['success' => false, 'message' => 'Tanggal tanam tidak valid'], 422);
    }
    $days = harvestDays($input, (int) $cycle['expected_harvest_days']);
    $seedCost = array_key_exists('seed_cost', $input) ? optionalNumber($input, 'seed_cost') : $cycle['seed_cost'];
    $notes = array_key_exists('notes', $input) ? (sanitize($input['notes']) ?: null) : $cycle['notes'];

    $db->prepare('UPDATE planting_cycles SET crop_name = ?, planting_date = ?, expected_harvest_days = ?, seed_cost = ?, notes = ? WHERE id = ?')
       ->execute([$cropName, $plantingDate, $days, $seedCost, $notes, $cycleId]);

    if ($cycle['status'] === 'aktif') {
        $db->prepare('UPDATE farms SET crop_id = ?, planting_date = ?, updated_at = NOW() WHERE id = ?')
           ->execute([$cropName, $plantingDate, $cycle['farm_id']]);
    }

    jsonResponse(['success' => true, 'message' => 'Musim tanam diperbarui']);
}

// ============================================
// MARK CYCLE AS FAILED (gagal panen)
// ============================================
function failCycle(int $userId): void {
    $input = readInput();
    $cycleId = (int) ($input['id'] ?? 0);
    $db = getDB();
    $cycle = $cycleId ? CycleService::findCycle($db, $cycleId, $userId) : null;
    if (!$cycle || $cycle['status'] !== 'aktif') {
        jsonResponse(['success' => false, 'message' => 'Musim tanam aktif tidak ditemukan'], 404);
    }

    $endedAt = $input['ended_at'] ?? date('Y-m-d');
    if (!CycleService::validDate($endedAt)) {
        jsonResponse(['success' => false, 'message' => 'Tanggal tidak valid'], 422);
    }
    $reason = sanitize($input['notes'] ?? '');

    try {
        $db->beginTransaction();
        CycleService::close($db, $cycleId, (int) $cycle['farm_id'], 'gagal', $endedAt);
        if ($reason !== '') {
            $notes = trim(($cycle['notes'] ?? '') . "\nGagal panen: " . $reason);
            $db->prepare('UPDATE planting_cycles SET notes = ? WHERE id = ?')->execute([$notes, $cycleId]);
        }
        $db->commit();
    } catch (PDOException $e) {
        $db->rollBack();
        logError('cycles - fail', $e);
        jsonResponse(['success' => false, 'message' => 'Gagal memperbarui musim tanam'], 500);
    }

    jsonResponse(['success' => true, 'message' => 'Musim tanam ditandai gagal panen']);
}
