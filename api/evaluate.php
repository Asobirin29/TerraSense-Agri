<?php
require_once '../config/database.php';

header('Content-Type: application/json');

// Read JSON payload
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(["error" => "Invalid JSON payload."]);
    exit;
}

// Extract payload data
$area_ha = isset($data['area_ha']) ? (float)$data['area_ha'] : 0;
$elevation = isset($data['elevation']) ? (float)$data['elevation'] : 0;
$temperature = isset($data['temperature']) ? (float)$data['temperature'] : 0;
$rainfall = isset($data['rainfall']) ? (float)$data['rainfall'] : 0;
$slope = isset($data['slope']) ? (float)$data['slope'] : 0;
$texture = isset($data['texture']) ? $data['texture'] : 'sedang';

// 1. Regional Assumptions for Sumedang
$soil_type = '';
$regional_note = '';
if ($elevation > 800) {
    $soil_type = 'Andosol';
    $regional_note = 'Volcanic, fertile, high organic matter. Cocok untuk hortikultura dan perkebunan.';
} elseif ($elevation >= 400 && $elevation <= 800) {
    $soil_type = 'Latosol / Andosol Transition';
    $regional_note = 'Ideal for Ubi Cilembu; requires High-Potassium / KCl, avoid excess Nitrogen.';
} else {
    $soil_type = 'Aluvial / Regosol';
    $regional_note = 'Ideal for Rice and Mango Gedong Gincu; intensive irrigation required.';
}

// 2. Fetch all commodities
try {
    $stmt = $pdo->query("SELECT * FROM komoditas");
    $komoditas_list = $stmt->fetchAll();
} catch (Exception $e) {
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    exit;
}

$results = [];

foreach ($komoditas_list as $komoditas) {
    $id_komoditas = $komoditas['id_komoditas'];
    
    // Fetch requirements for this commodity
    $stmt = $pdo->prepare("SELECT * FROM syarat_tumbuh WHERE id_komoditas = ?");
    $stmt->execute([$id_komoditas]);
    $syarat_list = $stmt->fetchAll();
    
    // Law of minimum logic
    $s_final = 'S1'; // Start with best assumption
    $faktor_pembatas = [];
    
    // Group requirements by parameter so we evaluate each parameter holistically
    $params = [];
    foreach ($syarat_list as $syarat) {
        $params[$syarat['parameter']][] = $syarat;
    }
    
    foreach ($params as $param_name => $criteria) {
        $param_class = 'N'; // Default to Not Suitable if no matching class found
        $matched = false;
        
        $value_to_check = null;
        if ($param_name === 'temperatur') $value_to_check = $temperature;
        if ($param_name === 'curah_hujan') $value_to_check = $rainfall;
        if ($param_name === 'lereng') $value_to_check = $slope;
        
        // Evaluate numerical parameters
        if ($value_to_check !== null) {
            // Priority check: S1 -> S2 -> S3 -> N
            foreach (['S1', 'S2', 'S3'] as $c) {
                foreach ($criteria as $req) {
                    if ($req['kelas_kesesuaian'] === $c && $req['val_min'] !== null && $req['val_max'] !== null) {
                        if ($value_to_check >= $req['val_min'] && $value_to_check <= $req['val_max']) {
                            $param_class = $c;
                            $matched = true;
                            break 2;
                        }
                    }
                }
            }
        } else {
            // String matching (e.g., texture)
            $str_val = null;
            if ($param_name === 'tekstur') $str_val = $texture;
            
            if ($str_val !== null) {
                foreach (['S1', 'S2', 'S3'] as $c) {
                    foreach ($criteria as $req) {
                        if ($req['kelas_kesesuaian'] === $c && $req['val_text'] !== null) {
                            $allowed_texts = array_map('trim', explode(',', strtolower($req['val_text'])));
                            if (in_array(strtolower($str_val), $allowed_texts)) {
                                $param_class = $c;
                                $matched = true;
                                break 2;
                            }
                        }
                    }
                }
            }
        }
        
        // Update Law of Minimum
        if ($param_class === 'N') {
            $s_final = 'N';
            $faktor_pembatas[] = $param_name;
        } elseif ($param_class === 'S3' && $s_final !== 'N') {
            $s_final = 'S3';
            $faktor_pembatas[] = $param_name;
        } elseif ($param_class === 'S2' && !in_array($s_final, ['N', 'S3'])) {
            $s_final = 'S2';
            $faktor_pembatas[] = $param_name;
        }
    }
    
    // 3. Fetch Standard Fertilizer Dosage
    $dosis_pupuk = [];
    $stmt = $pdo->prepare("SELECT * FROM pupuk_standar WHERE id_komoditas = ?");
    $stmt->execute([$id_komoditas]);
    $pupuk_list = $stmt->fetchAll();
    
    foreach ($pupuk_list as $pupuk) {
        // Dosage math based on area
        $total_kg = $pupuk['dosis_per_ha'] * $area_ha;
        
        if ($total_kg < 10) {
            $formatted = number_format($total_kg, 1, ',', '.') . ' ' . $pupuk['satuan'];
        } else {
            $formatted = number_format(round($total_kg), 0, ',', '.') . ' ' . $pupuk['satuan'];
        }
        
        $dosis_pupuk[] = [
            "fase" => $pupuk['fase_tanam'],
            "nama_pupuk" => $pupuk['nama_pupuk'],
            "kebutuhan_total" => $formatted
        ];
    }
    
    $results[] = [
        "id_komoditas" => $komoditas['id_komoditas'],
        "nama_komoditas" => $komoditas['nama_komoditas'],
        "icon" => $komoditas['icon_emoji'],
        "kelompok" => $komoditas['kelompok'],
        "kelas_kesesuaian" => $s_final,
        "faktor_pembatas" => !empty($faktor_pembatas) ? array_unique($faktor_pembatas) : null,
        "rekomendasi_pupuk" => $dosis_pupuk
    ];
}

// Sort results: S1 first, then S2, S3, N
$class_order = ['S1' => 1, 'S2' => 2, 'S3' => 3, 'N' => 4];
usort($results, function($a, $b) use ($class_order) {
    return $class_order[$a['kelas_kesesuaian']] <=> $class_order[$b['kelas_kesesuaian']];
});

echo json_encode([
    "success" => true,
    "regional_assumptions" => [
        "soil_type" => $soil_type,
        "note" => $regional_note
    ],
    "evaluations" => $results
]);
?>
