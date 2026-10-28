<?php
require_once __DIR__ . '/../config/database.php';

try {
    $db = getDB();
    $db->beginTransaction();

    $email = 'demo@terrasense.id';
    $password = 'password123';
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $name = 'Budi Pratama (Petani Demo)';
    $phone = '081234567890';
    $location = 'Lembang, Kab. Bandung Barat';
    $bio = 'Petani hortikultura & pangan presisi. Menggunakan TerraSense Agri untuk pemetaan GIS dan rekomendasi pupuk ilmiah berbasis standar Balai Penelitian Tanah.';

    // Check if demo user already exists
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing) {
        $userId = (int) $existing['id'];
        $stmt = $db->prepare('UPDATE users SET name = ?, password = ?, phone = ?, location = ?, bio = ? WHERE id = ?');
        $stmt->execute([$name, $hashedPassword, $phone, $location, $bio, $userId]);
    } else {
        $stmt = $db->prepare('INSERT INTO users (name, email, password, phone, location, bio) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$name, $email, $hashedPassword, $phone, $location, $bio]);
        $userId = (int) $db->lastInsertId();
    }

    // Clean up old demo farms if re-running
    $stmt = $db->prepare('SELECT id FROM farms WHERE user_id = ?');
    $stmt->execute([$userId]);
    $farmIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($farmIds)) {
        $inClause = implode(',', array_map('intval', $farmIds));
        $db->exec("DELETE FROM farm_activities WHERE farm_id IN ($inClause)");
        $db->exec("DELETE FROM planting_cycles WHERE farm_id IN ($inClause)");
        $db->exec("DELETE FROM harvest_logs WHERE farm_id IN ($inClause)");
        $db->exec("DELETE FROM farm_analyses WHERE farm_id IN ($inClause)");
        $db->exec("DELETE FROM evaluations WHERE id_farm IN ($inClause)");
        $db->exec("DELETE FROM farms WHERE user_id = $userId");
    }

    // 1. FARM 1: Kebun Hortikultura Lembang (Highland)
    $geojson1 = json_encode([
        "type" => "Feature",
        "properties" => ["name" => "Kebun Hortikultura Lembang"],
        "geometry" => [
            "type" => "Polygon",
            "coordinates" => [[
                [107.6160, -6.8145],
                [107.6195, -6.8140],
                [107.6190, -6.8170],
                [107.6158, -6.8165],
                [107.6160, -6.8145]
            ]]
        ]
    ]);

    $stmt = $db->prepare('
        INSERT INTO farms (user_id, name, geojson, area_ha, elevation, zone, latitude, longitude, notes, crop_id, planting_date, irrigation_status, is_fertilized, soil_texture, slope_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $userId,
        'Kebun Sayur Lembang',
        $geojson1,
        1.45,
        1280,
        'highland',
        -6.8155,
        107.6175,
        'Lahan vulkanis dataran tinggi, sistem bedengan dengan mulsa plastik perak.',
        'Kentang Granola',
        '2026-08-15',
        'Irigasi Sprinkler',
        1,
        'sedang',
        6.5
    ]);
    $farm1Id = (int) $db->lastInsertId();

    // 2. FARM 2: Sawah Irigasi Subang (Lowland)
    $geojson2 = json_encode([
        "type" => "Feature",
        "properties" => ["name" => "Sawah Irigasi Subang"],
        "geometry" => [
            "type" => "Polygon",
            "coordinates" => [[
                [107.7585, -6.5660],
                [107.7630, -6.5665],
                [107.7625, -6.5700],
                [107.7580, -6.5695],
                [107.7585, -6.5660]
            ]]
        ]
    ]);
    $stmt->execute([
        $userId,
        'Sawah Irigasi Subang',
        $geojson2,
        2.30,
        45,
        'lowland',
        -6.5680,
        107.7605,
        'Sawah teknis saluran primer Tarum Timur. Pasokan air stabil sepanjang tahun.',
        'Padi Sawah',
        '2026-09-01',
        'Irigasi Teknis',
        1,
        'halus',
        1.5
    ]);
    $farm2Id = (int) $db->lastInsertId();

    // 3. FARM 3: Kebun Cabai & Jagung Sumedang (Midland)
    $geojson3 = json_encode([
        "type" => "Feature",
        "properties" => ["name" => "Kebun Cabai & Jagung Sumedang"],
        "geometry" => [
            "type" => "Polygon",
            "coordinates" => [[
                [107.9200, -6.8505],
                [107.9240, -6.8510],
                [107.9235, -6.8540],
                [107.9195, -6.8535],
                [107.9200, -6.8505]
            ]]
        ]
    ]);
    $stmt->execute([
        $userId,
        'Kebun Cabai & Jagung Sumedang',
        $geojson3,
        0.95,
        580,
        'midland',
        -6.8522,
        107.9218,
        'Lahan tegalan perbukitan berteras. Cocok untuk tumpangsari cabai rawit dan jagung.',
        'Cabai Rawit',
        '2026-07-20',
        'Tadah Hujan',
        1,
        'sedang',
        7.5
    ]);
    $farm3Id = (int) $db->lastInsertId();

    // FARM ANALYSES
    $recomFarm1 = json_encode([
        'suitability' => 'S1 (Sangat Sesuai)',
        'crop' => 'Kentang Granola',
        'limiting_factors' => [],
        'score' => 96,
        'summary' => 'Suhu optimal 18-22°C dan elevasi 1280 MDPL sangat cocok untuk pembentukan umbi berkualitas prima.'
    ]);
    $dosageFarm1 = json_encode([
        'urea_per_ha' => 200,
        'sp36_per_ha' => 150,
        'kcl_per_ha'  => 120,
        'npk_per_ha'  => 300,
        'total_urea'  => 290,
        'total_sp36'  => 217.5,
        'total_kcl'   => 174
    ]);

    $recomFarm2 = json_encode([
        'suitability' => 'S1 (Sangat Sesuai)',
        'crop' => 'Padi Sawah',
        'limiting_factors' => [],
        'score' => 93,
        'summary' => 'Ketersediaan air irigasi teknis dan tanah lempung liat halus ideal untuk fase vegetatif dan pengisian bulir.'
    ]);
    $dosageFarm2 = json_encode([
        'urea_per_ha' => 250,
        'sp36_per_ha' => 100,
        'kcl_per_ha'  => 100,
        'npk_per_ha'  => 300,
        'total_urea'  => 575,
        'total_sp36'  => 230,
        'total_kcl'   => 230
    ]);

    $stmtAnalysis = $db->prepare('
        INSERT INTO farm_analyses (farm_id, temperature, humidity, precipitation, zone, recommendations, dosage, analyzed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmtAnalysis->execute([$farm1Id, 20.4, 84.0, 160.0, 'highland', $recomFarm1, $dosageFarm1, '2026-10-20 08:30:00']);
    $stmtAnalysis->execute([$farm2Id, 30.5, 76.0, 115.0, 'lowland', $recomFarm2, $dosageFarm2, '2026-10-22 09:15:00']);
    $stmtAnalysis->execute([$farm3Id, 26.2, 79.0, 135.0, 'midland', $recomFarm1, $dosageFarm1, '2026-10-25 14:00:00']);

    // EVALUATIONS TABLE
    $stmtEval = $db->prepare('
        INSERT INTO evaluations (id_farm, id_komoditas, kelas_akhir, faktor_pembatas, skor_kecocokan, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmtEval->execute([$farm1Id, 7, 'S1', json_encode([]), 96, '2026-10-20 08:35:00']);
    $stmtEval->execute([$farm2Id, 1, 'S1', json_encode([]), 93, '2026-10-22 09:20:00']);
    $stmtEval->execute([$farm3Id, 9, 'S2', json_encode(['Kemiringan lereng sedang (7.5%)']), 84, '2026-10-25 14:05:00']);

    // PLANTING CYCLES
    $stmtCycle = $db->prepare('
        INSERT INTO planting_cycles (farm_id, user_id, komoditas_id, crop_name, planting_date, expected_harvest_days, area_ha, status, seed_cost, notes, ended_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    // Active cycle Farm 1
    $stmtCycle->execute([$farm1Id, $userId, 7, 'Kentang Granola', '2026-08-15', 105, 1.45, 'aktif', 2500000, 'Bibit G2 sertifikasi Balitsa', null, '2026-08-15 07:00:00']);
    $cycle1Id = (int) $db->lastInsertId();

    // Active cycle Farm 2
    $stmtCycle->execute([$farm2Id, $userId, 1, 'Padi Sawah', '2026-09-01', 115, 2.30, 'aktif', 1800000, 'Varietas Inpari 32', null, '2026-09-01 07:30:00']);
    $cycle2Id = (int) $db->lastInsertId();

    // Completed cycle Farm 1 (Past)
    $stmtCycle->execute([$farm1Id, $userId, 7, 'Kentang Granola', '2026-04-10', 105, 1.45, 'dipanen', 2400000, 'Musim tanam I 2026', '2026-07-25', '2026-04-10 08:00:00']);
    $cycleOld1 = (int) $db->lastInsertId();

    // Completed cycle Farm 2 (Past)
    $stmtCycle->execute([$farm2Id, $userId, 1, 'Padi Sawah', '2026-03-01', 115, 2.30, 'dipanen', 1750000, 'Musim rendeng MT 1', '2026-06-28', '2026-03-01 08:00:00']);
    $cycleOld2 = (int) $db->lastInsertId();

    // Completed cycle Farm 3 (Past)
    $stmtCycle->execute([$farm3Id, $userId, 9, 'Cabai Rawit', '2026-02-15', 95, 0.95, 'dipanen', 1200000, 'Varietas Ori 212', '2026-05-20', '2026-02-15 08:00:00']);
    $cycleOld3 = (int) $db->lastInsertId();

    // FARM ACTIVITIES for Active Cycles
    $stmtAct = $db->prepare('
        INSERT INTO farm_activities (cycle_id, farm_id, type, activity_date, fertilizer_name, fertilizer_phase, amount, unit, water_method, duration_min, growth_stage, plant_height_cm, `condition`, pest_disease, cost, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    // Farm 1 activities
    $stmtAct->execute([$cycle1Id, $farm1Id, 'pupuk', '2026-08-20', 'NPK Phonska', 'Dasar', 150.0, 'kg', null, null, null, null, null, null, 450000, 'Pemupukan dasar saat olah tanah']);
    $stmtAct->execute([$cycle1Id, $farm1Id, 'pengairan', '2026-09-05', null, null, null, null, 'Sprinkler', 45, null, null, null, null, 50000, 'Penyiraman pagi hari']);
    $stmtAct->execute([$cycle1Id, $farm1Id, 'pupuk', '2026-09-25', 'Urea', 'Susulan 1', 100.0, 'kg', null, null, null, null, null, null, 280000, 'Aplikasi fase vegetatif']);
    $stmtAct->execute([$cycle1Id, $farm1Id, 'observasi', '2026-10-10', null, null, null, null, null, null, 'Pembentukan Umbi', 48.5, 'baik', 'Nihil', 0, 'Daun hijau tua segar, kanopi rapat']);

    // Farm 2 activities
    $stmtAct->execute([$cycle2Id, $farm2Id, 'pupuk', '2026-09-08', 'Urea & SP-36', 'Dasar', 250.0, 'kg', null, null, null, null, null, null, 720000, 'Aplikasi dasar umur 7 HST']);
    $stmtAct->execute([$cycle2Id, $farm2Id, 'observasi', '2026-10-15', null, null, null, null, null, null, 'Anakan Aktif', 55.0, 'baik', 'Sedikit wereng terpantau aman', 0, 'Anakan per rumpun rata-rata 24 batang']);

    // HARVEST LOGS (Historical Data for Charts & Reporting)
    $stmtHarvest = $db->prepare('
        INSERT INTO harvest_logs (farm_id, crop_id, crop_name, planting_date, harvest_date, estimated_yield_ton, actual_yield_ton, notes, cycle_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $stmtHarvest->execute([
        $farm1Id,
        'Kentang Granola',
        'Kentang Granola',
        '2026-04-10',
        '2026-07-25',
        26.50,
        28.40,
        'Hasil panen melampaui estimasi 7.1%. Umbi dominan grade Super A (150-200g/butir). Efisiensi pupuk KCL sangat nyata.',
        $cycleOld1,
        '2026-07-25 11:30:00'
    ]);

    $stmtHarvest->execute([
        $farm2Id,
        'Padi Sawah',
        'Padi Sawah',
        '2026-03-01',
        '2026-06-28',
        14.00,
        15.60,
        'Bulir padi terisi penuh, kadar air gabah kering panen (GKP) 21%. Terjual langsung ke penggilingan lokal.',
        $cycleOld2,
        '2026-06-28 15:00:00'
    ]);

    $stmtHarvest->execute([
        $farm3Id,
        'Cabai Rawit',
        'Cabai Rawit',
        '2026-02-15',
        '2026-05-20',
        6.50,
        7.15,
        'Total akumulasi 8 kali pemetikan. Tingkat kepedasan dan warna merah pekat optimal.',
        $cycleOld3,
        '2026-05-20 16:45:00'
    ]);

    $stmtHarvest->execute([
        $farm1Id,
        'Kubis Ungu',
        'Kubis Ungu',
        '2025-11-05',
        '2026-02-10',
        18.00,
        19.20,
        'Panen musim penghujan, krop padat tanpa busuk basah berkat drainase bedengan tinggi.',
        null,
        '2026-02-10 10:15:00'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Akun dummy dan seluruh data percontohan berhasil dibuat!',
        'account' => [
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'phone' => $phone,
            'location' => $location,
            'farms' => 3,
            'harvest_logs' => 4,
            'analyses' => 3,
            'cycles' => 5
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
