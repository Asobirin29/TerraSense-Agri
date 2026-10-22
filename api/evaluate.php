<?php
// ============================================
// TerraSense Agri — Land Evaluation API Controller
// Delegates evaluation logic to LandEvaluator service
// ============================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/services/LandEvaluator.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$allowedOrigin = APP_ENV === 'production' ? 'https://yourdomain.com' : '*';
header('Access-Control-Allow-Origin: ' . $allowedOrigin);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

startSecureSession();

// Auth check — user must be logged in
$userId = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

// Rate limiting: max 60 evaluations per minute per session
$now    = time();
$window = array_filter($_SESSION['eval_requests'] ?? [], fn($t) => $t > $now - 60);
if (count($window) >= 60) {
    jsonResponse(['success' => false, 'message' => 'Terlalu banyak permintaan evaluasi. Coba lagi sebentar lagi.'], 429);
}
$window[] = $now;
$_SESSION['eval_requests'] = array_values($window);

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    jsonResponse(['success' => false, 'message' => 'Payload JSON tidak valid.'], 400);
}

try {
    $result = LandEvaluator::evaluate($input, $userId);
    jsonResponse($result);
} catch (InvalidArgumentException $e) {
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 422);
} catch (RuntimeException $e) {
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 404);
} catch (Throwable $e) {
    logError('evaluate - controller', $e);
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan sistem saat evaluasi lahan.'], 500);
}
