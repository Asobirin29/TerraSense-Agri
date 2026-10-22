<?php
// ============================================
// TerraSense Agri — Komoditas Data Seeder
// ============================================
// Run once via browser: /api/seed.php
// Seeds komoditas, syarat_tumbuh, and pupuk_standar tables
// with 15 major agricultural commodities for Indonesia/Sumedang region.
// ============================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/migrate.php';

requireLocalAccess();

header('Content-Type: application/json; charset=utf-8');

// Run migrations first to ensure tables exist
runMigrations();

try {
    $db = getDB();

    // Check if data already seeded
    $stmt = $db->query('SELECT COUNT(*) FROM komoditas');
    $count = (int) $stmt->fetchColumn();

    if ($count > 0) {
        echo json_encode([
            'success' => true,
            'message' => "Data komoditas sudah ada ($count komoditas). Gunakan ?force=1 untuk re-seed.",
            'count'   => $count,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db->beginTransaction();

    // ============================================
    // KOMODITAS DATA
    // ============================================
    $komoditas = [
        // Tanaman Pangan
        [1,  'Padi Sawah',       'Oryza sativa',        'Tanaman Pangan', 12,  '🌾', 'Tanaman pangan utama Indonesia. Sangat cocok untuk dataran rendah dengan sistem irigasi teknis basah.'],
        [2,  'Jagung Hibrida',   'Zea mays',            'Tanaman Pangan', 41,  '🌽', 'Varietas jagung unggul produktivitas tinggi. Tahan terhadap kekeringan dan adaptif di dataran menengah.'],
        [3,  'Kedelai',          'Glycine max',         'Tanaman Pangan', 55,  '🫘', 'Tanaman semusim baik untuk rotasi tanam — memperbaiki kesuburan Nitrogen di dalam tanah.'],
        [4,  'Singkong',         'Manihot esculenta',   'Tanaman Pangan', 62,  '🥔', 'Sangat adaptif di tanah marginal dan curah hujan rendah. Komoditas ketahanan pangan nasional.'],
        [5,  'Ubi Cilembu',      'Ipomoea batatas',     'Tanaman Pangan', 67,  '🍠', 'Komoditas khas Sumedang berasa manis seperti madu. Membutuhkan kadar Kalium yang melimpah.'],
        // Hortikultura
        [6,  'Kubis Ungu',       'Brassica oleracea',   'Hortikultura',   78,  '🥬', 'Sayuran dataran tinggi dengan warna ungu eksotis. Tumbuh subur di udara dingin pegunungan.'],
        [7,  'Kentang Granola',  'Solanum tuberosum',   'Hortikultura',   85,  '🥔', 'Menyukai tanah vulkanis gembur dan kaya organik. Bebas dari genangan air tersumbat.'],
        [8,  'Tomat',            'Solanum lycopersicum','Hortikultura',   91,  '🍅', 'Memerlukan sirkulasi udara baik, ajir penyangga, dan irigasi tetes berkala.'],
        [9,  'Cabai Rawit',      'Capsicum frutescens', 'Hortikultura',   98,  '🌶️', 'Toleran terhadap variasi suhu. Sangat baik di tanah gembur yang kaya unsur hara makro.'],
        [10, 'Bawang Merah',     'Allium cepa',         'Hortikultura',   105, '🧅', 'Membutuhkan sinar matahari penuh, tanah lempung berpasir, dan drainase yang sangat lancar.'],
        // Buah
        [11, 'Mangga Gedong Gincu','Mangifera indica',  'Hortikultura',   112, '🥭', 'Mangga khas pesisir yang harum dan manis. Butuh musim kering tegas agar pembungaan optimal.'],
        [12, 'Semangka',         'Citrullus lanatus',   'Hortikultura',   118, '🍉', 'Sangat menyukai suhu hangat dan paparan sinar matahari terik khas iklim pantai pesisir.'],
        // Perkebunan
        [13, 'Kopi Arabika',     'Coffea arabica',      'Perkebunan',     122, '☕', 'Komoditas bernilai tinggi. Butuh elevasi tinggi dan suhu dingin agar cita rasa kopi keluar maksimal.'],
        [14, 'Kopi Robusta',     'Coffea canephora',    'Perkebunan',     128, '☕', 'Lebih adaptif dan tahan penyakit karat daun dibanding arabika. Cocok di lereng bukit menengah.'],
        [15, 'Teh Hijau',        'Camellia sinensis',   'Perkebunan',     134, '🍵', 'Membutuhkan kelembapan tinggi, kabut pegunungan tebal, dan tanah dengan keasaman tinggi.'],
        [16, 'Kelapa Sawit',     'Elaeis guineensis',   'Perkebunan',     140, '🌴', 'Komoditas perkebunan utama. Butuh curah hujan stabil tinggi dan drainase tanah yang baik.'],
        // Rempah
        [17, 'Jahe',             'Zingiber officinale', 'Rempah dan Obat',148, '🫚', 'Rempah bernilai tinggi. Cocok di tanah gembur yang subur dengan drainase baik.'],
        [18, 'Kunyit',           'Curcuma longa',       'Rempah dan Obat',153, '🟡', 'Komoditas rempah obat yang adaptif. Menyukai tanah lempung berpasir yang kaya organik.'],
        [19, 'Lada Hitam',       'Piper nigrum',        'Rempah dan Obat',158, '🌿', 'Tanaman merambat yang membutuhkan tiang panjat dan intensitas cahaya tinggi.'],
        [20, 'Cengkeh',          'Syzygium aromaticum', 'Perkebunan',     163, '🌺', 'Tanaman perkebunan jangka panjang. Toleran naungan ringan, cocok di lereng perbukitan.'],
    ];

    $stmtK = $db->prepare('INSERT INTO komoditas (id_komoditas, nama_komoditas, nama_latin, kelompok, halaman_ref, icon_emoji, deskripsi_umum) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($komoditas as $k) {
        $stmtK->execute($k);
    }

    // ============================================
    // SYARAT TUMBUH (Growth Requirements)
    // Format: [id_komoditas, kode_kriteria, parameter, kelas, val_min, val_max, val_text]
    // ============================================
    $syarat = [
        // 1. Padi Sawah
        [1,'tc','temperatur','S1',24,29,null], [1,'tc','temperatur','S2',22,32,null],
        [1,'wa','curah_hujan','S1',1500,2500,null], [1,'wa','curah_hujan','S2',1200,3000,null],
        [1,'eh','lereng','S1',0,3,null], [1,'eh','lereng','S2',3,8,null],
        [1,'rc','tekstur','S1',null,null,'halus, agak_halus'], [1,'rc','tekstur','S2',null,null,'sedang'],
        // 2. Jagung Hibrida
        [2,'tc','temperatur','S1',20,26,null], [2,'tc','temperatur','S2',26,30,null],
        [2,'wa','curah_hujan','S1',500,1200,null], [2,'wa','curah_hujan','S2',1200,1600,null],
        [2,'eh','lereng','S1',0,8,null], [2,'eh','lereng','S2',8,16,null], [2,'eh','lereng','S3',16,30,null],
        [2,'rc','tekstur','S1',null,null,'halus, agak_halus, sedang'], [2,'rc','tekstur','S2',null,null,'agak_kasar'],
        // 3. Kedelai
        [3,'tc','temperatur','S1',23,30,null], [3,'tc','temperatur','S2',30,35,null],
        [3,'wa','curah_hujan','S1',450,700,null], [3,'wa','curah_hujan','S2',350,1000,null],
        [3,'eh','lereng','S1',0,5,null], [3,'eh','lereng','S2',5,15,null],
        [3,'rc','tekstur','S1',null,null,'sedang, agak_halus'], [3,'rc','tekstur','S2',null,null,'halus, agak_kasar'],
        // 4. Singkong
        [4,'tc','temperatur','S1',20,30,null], [4,'tc','temperatur','S2',30,35,null],
        [4,'wa','curah_hujan','S1',500,1500,null], [4,'wa','curah_hujan','S2',1500,2500,null],
        [4,'eh','lereng','S1',0,8,null], [4,'eh','lereng','S2',8,16,null], [4,'eh','lereng','S3',16,30,null],
        [4,'rc','tekstur','S1',null,null,'sedang, agak_kasar'], [4,'rc','tekstur','S2',null,null,'agak_halus, kasar'],
        // 5. Ubi Cilembu
        [5,'tc','temperatur','S1',20,26,null], [5,'tc','temperatur','S2',26,30,null],
        [5,'wa','curah_hujan','S1',750,1500,null], [5,'wa','curah_hujan','S2',1500,2000,null],
        [5,'eh','lereng','S1',0,8,null], [5,'eh','lereng','S2',8,16,null],
        [5,'rc','tekstur','S1',null,null,'sedang, agak_kasar'], [5,'rc','tekstur','S2',null,null,'agak_halus'],
        // 6. Kubis Ungu
        [6,'tc','temperatur','S1',15,20,null], [6,'tc','temperatur','S2',20,25,null],
        [6,'wa','curah_hujan','S1',1000,1500,null], [6,'wa','curah_hujan','S2',1500,2000,null],
        [6,'eh','lereng','S1',0,8,null], [6,'eh','lereng','S2',8,15,null],
        [6,'rc','tekstur','S1',null,null,'halus, agak_halus, sedang'], [6,'rc','tekstur','S2',null,null,'agak_kasar'],
        // 7. Kentang Granola
        [7,'tc','temperatur','S1',14,18,null], [7,'tc','temperatur','S2',18,22,null],
        [7,'wa','curah_hujan','S1',1000,1500,null], [7,'wa','curah_hujan','S2',700,2000,null],
        [7,'eh','lereng','S1',0,8,null], [7,'eh','lereng','S2',8,16,null],
        [7,'rc','tekstur','S1',null,null,'sedang, agak_halus'], [7,'rc','tekstur','S2',null,null,'halus'],
        // 8. Tomat
        [8,'tc','temperatur','S1',18,25,null], [8,'tc','temperatur','S2',25,29,null],
        [8,'wa','curah_hujan','S1',750,1250,null], [8,'wa','curah_hujan','S2',1250,2000,null],
        [8,'eh','lereng','S1',0,8,null], [8,'eh','lereng','S2',8,16,null],
        [8,'rc','tekstur','S1',null,null,'sedang, agak_halus'], [8,'rc','tekstur','S2',null,null,'halus, agak_kasar'],
        // 9. Cabai Rawit
        [9,'tc','temperatur','S1',18,28,null], [9,'tc','temperatur','S2',28,32,null],
        [9,'wa','curah_hujan','S1',600,1250,null], [9,'wa','curah_hujan','S2',1250,2500,null],
        [9,'eh','lereng','S1',0,8,null], [9,'eh','lereng','S2',8,16,null],
        [9,'rc','tekstur','S1',null,null,'sedang, agak_halus'], [9,'rc','tekstur','S2',null,null,'agak_kasar'],
        // 10. Bawang Merah
        [10,'tc','temperatur','S1',25,32,null], [10,'tc','temperatur','S2',22,25,null],
        [10,'wa','curah_hujan','S1',300,500,null], [10,'wa','curah_hujan','S2',500,1000,null],
        [10,'eh','lereng','S1',0,3,null], [10,'eh','lereng','S2',3,8,null],
        [10,'rc','tekstur','S1',null,null,'sedang, agak_kasar'], [10,'rc','tekstur','S2',null,null,'agak_halus'],
        // 11. Mangga Gedong Gincu
        [11,'tc','temperatur','S1',25,32,null], [11,'tc','temperatur','S2',32,35,null],
        [11,'wa','curah_hujan','S1',750,1500,null], [11,'wa','curah_hujan','S2',1500,2000,null],
        [11,'eh','lereng','S1',0,8,null], [11,'eh','lereng','S2',8,16,null],
        [11,'rc','tekstur','S1',null,null,'agak_halus, sedang'], [11,'rc','tekstur','S2',null,null,'halus, agak_kasar'],
        // 12. Semangka
        [12,'tc','temperatur','S1',25,35,null], [12,'tc','temperatur','S2',22,25,null],
        [12,'wa','curah_hujan','S1',400,600,null], [12,'wa','curah_hujan','S2',600,1500,null],
        [12,'eh','lereng','S1',0,3,null], [12,'eh','lereng','S2',3,8,null],
        [12,'rc','tekstur','S1',null,null,'agak_kasar, sedang'], [12,'rc','tekstur','S2',null,null,'agak_halus'],
        // 13. Kopi Arabika
        [13,'tc','temperatur','S1',15,21,null], [13,'tc','temperatur','S2',21,24,null],
        [13,'wa','curah_hujan','S1',1500,2500,null], [13,'wa','curah_hujan','S2',2500,3000,null],
        [13,'eh','lereng','S1',0,8,null], [13,'eh','lereng','S2',8,16,null], [13,'eh','lereng','S3',16,25,null],
        [13,'rc','tekstur','S1',null,null,'halus, agak_halus, sedang'], [13,'rc','tekstur','S2',null,null,'agak_kasar'],
        // 14. Kopi Robusta
        [14,'tc','temperatur','S1',18,24,null], [14,'tc','temperatur','S2',24,28,null],
        [14,'wa','curah_hujan','S1',1500,2500,null], [14,'wa','curah_hujan','S2',2500,3000,null],
        [14,'eh','lereng','S1',0,8,null], [14,'eh','lereng','S2',8,16,null],
        [14,'rc','tekstur','S1',null,null,'agak_halus, sedang'], [14,'rc','tekstur','S2',null,null,'halus, agak_kasar'],
        // 15. Teh Hijau
        [15,'tc','temperatur','S1',13,18,null], [15,'tc','temperatur','S2',18,22,null],
        [15,'wa','curah_hujan','S1',2000,3000,null], [15,'wa','curah_hujan','S2',1500,4000,null],
        [15,'eh','lereng','S1',0,15,null], [15,'eh','lereng','S2',15,25,null],
        [15,'rc','tekstur','S1',null,null,'agak_halus, sedang'], [15,'rc','tekstur','S2',null,null,'halus'],
        // 16. Kelapa Sawit
        [16,'tc','temperatur','S1',24,30,null], [16,'tc','temperatur','S2',30,33,null],
        [16,'wa','curah_hujan','S1',1750,2500,null], [16,'wa','curah_hujan','S2',1500,3000,null],
        [16,'eh','lereng','S1',0,8,null], [16,'eh','lereng','S2',8,16,null], [16,'eh','lereng','S3',16,25,null],
        [16,'rc','tekstur','S1',null,null,'halus, agak_halus, sedang'], [16,'rc','tekstur','S2',null,null,'agak_kasar'],
        // 17. Jahe
        [17,'tc','temperatur','S1',20,28,null], [17,'tc','temperatur','S2',28,32,null],
        [17,'wa','curah_hujan','S1',1500,3000,null], [17,'wa','curah_hujan','S2',1000,4000,null],
        [17,'eh','lereng','S1',0,8,null], [17,'eh','lereng','S2',8,16,null],
        [17,'rc','tekstur','S1',null,null,'sedang, agak_halus'], [17,'rc','tekstur','S2',null,null,'halus'],
        // 18. Kunyit
        [18,'tc','temperatur','S1',22,30,null], [18,'tc','temperatur','S2',30,35,null],
        [18,'wa','curah_hujan','S1',1000,2000,null], [18,'wa','curah_hujan','S2',2000,3000,null],
        [18,'eh','lereng','S1',0,8,null], [18,'eh','lereng','S2',8,16,null],
        [18,'rc','tekstur','S1',null,null,'sedang, agak_kasar'], [18,'rc','tekstur','S2',null,null,'agak_halus'],
        // 19. Lada Hitam
        [19,'tc','temperatur','S1',22,30,null], [19,'tc','temperatur','S2',30,34,null],
        [19,'wa','curah_hujan','S1',2000,3000,null], [19,'wa','curah_hujan','S2',1500,4000,null],
        [19,'eh','lereng','S1',0,8,null], [19,'eh','lereng','S2',8,16,null],
        [19,'rc','tekstur','S1',null,null,'agak_halus, sedang'], [19,'rc','tekstur','S2',null,null,'halus'],
        // 20. Cengkeh
        [20,'tc','temperatur','S1',20,27,null], [20,'tc','temperatur','S2',27,30,null],
        [20,'wa','curah_hujan','S1',1500,3000,null], [20,'wa','curah_hujan','S2',1000,4000,null],
        [20,'eh','lereng','S1',0,15,null], [20,'eh','lereng','S2',15,25,null],
        [20,'rc','tekstur','S1',null,null,'agak_halus, sedang'], [20,'rc','tekstur','S2',null,null,'halus, agak_kasar'],
    ];

    $stmtS = $db->prepare('INSERT INTO syarat_tumbuh (id_komoditas, kode_kriteria, parameter, kelas_kesesuaian, val_min, val_max, val_text) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($syarat as $s) {
        $stmtS->execute($s);
    }

    // ============================================
    // PUPUK STANDAR (Standard Fertilizer Dosage/Ha)
    // ============================================
    $pupuk = [
        // Padi Sawah
        [1, 'Dasar (Basal)', 'Urea',   200, 'kg', null],
        [1, 'Dasar (Basal)', 'SP-36',  100, 'kg', null],
        [1, 'Dasar (Basal)', 'KCl',     75, 'kg', null],
        [1, 'Vegetatif',     'Urea',   100, 'kg', 'Aplikasi 3 MST'],
        // Jagung Hibrida
        [2, 'Dasar (Basal)', 'Urea',   100, 'kg', null],
        [2, 'Dasar (Basal)', 'SP-36',  150, 'kg', null],
        [2, 'Dasar (Basal)', 'KCl',     50, 'kg', null],
        [2, 'Vegetatif',     'Urea',   100, 'kg', 'Aplikasi saat 4 MST'],
        // Kedelai
        [3, 'Dasar (Basal)', 'Urea',    50, 'kg', 'Dosis rendah; Rhizobium akan fikasasi Nitrogen'],
        [3, 'Dasar (Basal)', 'SP-36',  100, 'kg', null],
        [3, 'Dasar (Basal)', 'KCl',     75, 'kg', null],
        // Singkong
        [4, 'Dasar (Basal)', 'Urea',   100, 'kg', null],
        [4, 'Dasar (Basal)', 'SP-36',   75, 'kg', null],
        [4, 'Dasar (Basal)', 'KCl',    100, 'kg', 'Kalium penting untuk umbi'],
        // Ubi Cilembu
        [5, 'Dasar (Basal)', 'Urea',    75, 'kg', 'Hindari kelebihan N'],
        [5, 'Dasar (Basal)', 'SP-36',   75, 'kg', null],
        [5, 'Dasar (Basal)', 'KCl',    200, 'kg', 'Kalium tinggi untuk rasa manis'],
        // Kubis Ungu
        [6, 'Dasar (Basal)', 'Urea',   100, 'kg', null],
        [6, 'Dasar (Basal)', 'SP-36',  100, 'kg', null],
        [6, 'Dasar (Basal)', 'KCl',     75, 'kg', null],
        // Kentang Granola
        [7, 'Dasar (Basal)', 'Urea',   150, 'kg', null],
        [7, 'Dasar (Basal)', 'SP-36',  200, 'kg', null],
        [7, 'Dasar (Basal)', 'KCl',    200, 'kg', 'Kalium tinggi untuk umbi besar'],
        // Tomat
        [8, 'Dasar (Basal)', 'Urea',   100, 'kg', null],
        [8, 'Dasar (Basal)', 'SP-36',  150, 'kg', null],
        [8, 'Dasar (Basal)', 'KCl',    100, 'kg', null],
        // Cabai Rawit
        [9, 'Dasar (Basal)', 'Urea',   150, 'kg', null],
        [9, 'Dasar (Basal)', 'SP-36',  150, 'kg', null],
        [9, 'Dasar (Basal)', 'KCl',    100, 'kg', null],
        // Bawang Merah
        [10, 'Dasar (Basal)', 'Urea',  120, 'kg', null],
        [10, 'Dasar (Basal)', 'SP-36', 120, 'kg', null],
        [10, 'Dasar (Basal)', 'KCl',    80, 'kg', null],
        // Mangga Gedong Gincu
        [11, 'Dasar (Basal)', 'Urea',  150, 'kg', 'Per tahun per hektar'],
        [11, 'Dasar (Basal)', 'SP-36', 200, 'kg', null],
        [11, 'Dasar (Basal)', 'KCl',   150, 'kg', null],
        // Semangka
        [12, 'Dasar (Basal)', 'Urea',  120, 'kg', null],
        [12, 'Dasar (Basal)', 'SP-36', 150, 'kg', null],
        [12, 'Dasar (Basal)', 'KCl',    80, 'kg', null],
        // Kopi Arabika
        [13, 'Dasar (Basal)', 'Urea',  100, 'kg', null],
        [13, 'Dasar (Basal)', 'SP-36', 200, 'kg', null],
        [13, 'Dasar (Basal)', 'KCl',   100, 'kg', null],
        // Kopi Robusta
        [14, 'Dasar (Basal)', 'Urea',  120, 'kg', null],
        [14, 'Dasar (Basal)', 'SP-36', 180, 'kg', null],
        [14, 'Dasar (Basal)', 'KCl',   100, 'kg', null],
        // Teh Hijau
        [15, 'Dasar (Basal)', 'Urea',  250, 'kg', null],
        [15, 'Dasar (Basal)', 'SP-36', 100, 'kg', null],
        [15, 'Dasar (Basal)', 'KCl',    75, 'kg', null],
        // Kelapa Sawit
        [16, 'Dasar (Basal)', 'Urea',  400, 'kg', null],
        [16, 'Dasar (Basal)', 'SP-36', 250, 'kg', null],
        [16, 'Dasar (Basal)', 'KCl',   350, 'kg', null],
        // Jahe
        [17, 'Dasar (Basal)', 'Urea',  100, 'kg', null],
        [17, 'Dasar (Basal)', 'SP-36', 100, 'kg', null],
        [17, 'Dasar (Basal)', 'KCl',   100, 'kg', null],
        // Kunyit
        [18, 'Dasar (Basal)', 'Urea',   75, 'kg', null],
        [18, 'Dasar (Basal)', 'SP-36',  75, 'kg', null],
        [18, 'Dasar (Basal)', 'KCl',    75, 'kg', null],
        // Lada Hitam
        [19, 'Dasar (Basal)', 'Urea',  150, 'kg', null],
        [19, 'Dasar (Basal)', 'SP-36', 200, 'kg', null],
        [19, 'Dasar (Basal)', 'KCl',   150, 'kg', null],
        // Cengkeh
        [20, 'Dasar (Basal)', 'Urea',  150, 'kg', null],
        [20, 'Dasar (Basal)', 'SP-36', 200, 'kg', null],
        [20, 'Dasar (Basal)', 'KCl',   100, 'kg', null],
    ];

    $stmtP = $db->prepare('INSERT INTO pupuk_standar (id_komoditas, fase_tanam, nama_pupuk, dosis_per_ha, satuan, catatan_agronomi) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ($pupuk as $p) {
        $stmtP->execute($p);
    }

    $db->commit();

    echo json_encode([
        'success'   => true,
        'message'   => 'Seeder berhasil! Data komoditas telah diisi.',
        'seeded'    => [
            'komoditas'     => count($komoditas),
            'syarat_tumbuh' => count($syarat),
            'pupuk_standar' => count($pupuk),
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    logError('seed.php', $e);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Seeder gagal: ' . $e->getMessage(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
