<?php
// ============================================
// TerraSense Agri — Database Migration & Auto-Setup
// ============================================
// Run automatically via: require_once 'migrate.php'; runMigrations();
// Or directly via browser/CLI to set up the DB for the first time.
// ============================================

require_once __DIR__ . '/../config/database.php';

function runMigrations(): bool {
    try {
        $db = getDB();

        // Disable foreign key checks during migration
        $db->exec('SET FOREIGN_KEY_CHECKS = 0;');

        // ============================================
        // 1. Users Table
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                name       VARCHAR(100) NOT NULL,
                email      VARCHAR(100) NOT NULL UNIQUE,
                password   VARCHAR(255) NOT NULL,
                phone      VARCHAR(20)  NULL,
                location   VARCHAR(100) NULL,
                bio        TEXT         NULL,
                avatar     VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // Helper: safely add missing columns
        $ensureColumn = function (string $table, string $column, string $definition) use ($db): void {
            try {
                $stmt = $db->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
                if (!$stmt->fetch()) {
                    $db->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
                }
            } catch (PDOException $e) {
                error_log("[Migration] Cannot add column $table.$column: " . $e->getMessage());
            }
        };

        // Ensure all expected columns exist (legacy-safe)
        $ensureColumn('users', 'phone',    'VARCHAR(20) NULL');
        $ensureColumn('users', 'location', 'VARCHAR(100) NULL');
        $ensureColumn('users', 'bio',      'TEXT NULL');
        $ensureColumn('users', 'avatar',   'VARCHAR(255) NULL');

        // ============================================
        // 2. Farms Table
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS farms (
                id                INT AUTO_INCREMENT PRIMARY KEY,
                user_id           INT NOT NULL,
                name              VARCHAR(100) NOT NULL,
                geojson           LONGTEXT NULL,
                area_ha           FLOAT DEFAULT 0,
                elevation         INT DEFAULT 0,
                zone              VARCHAR(50) NULL,
                latitude          DOUBLE NULL,
                longitude         DOUBLE NULL,
                notes             TEXT NULL,
                crop_id           VARCHAR(50) NULL,
                planting_date     DATE NULL,
                irrigation_status VARCHAR(50) DEFAULT 'Tidak Ada Irigasi',
                is_fertilized     TINYINT(1) DEFAULT 0,
                soil_texture      VARCHAR(20) NULL,
                slope_pct         FLOAT NULL,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $ensureColumn('farms', 'crop_id',           'VARCHAR(50) NULL');
        $ensureColumn('farms', 'planting_date',     'DATE NULL');
        $ensureColumn('farms', 'irrigation_status', "VARCHAR(50) DEFAULT 'Tidak Ada Irigasi'");
        $ensureColumn('farms', 'is_fertilized',     'TINYINT(1) DEFAULT 0');
        $ensureColumn('farms', 'updated_at',        'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        $ensureColumn('farms', 'soil_texture',      'VARCHAR(20) NULL');
        $ensureColumn('farms', 'slope_pct',         'FLOAT NULL');

        // ============================================
        // 3. Farm Analyses Table
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS farm_analyses (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                farm_id         INT NOT NULL,
                temperature     FLOAT NULL,
                humidity        FLOAT NULL,
                precipitation   FLOAT NULL,
                zone            VARCHAR(50) NULL,
                recommendations TEXT NULL,
                dosage          TEXT NULL,
                analyzed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_farm_id (farm_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // ============================================
        // 4. Harvest Logs Table
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS harvest_logs (
                id                  INT AUTO_INCREMENT PRIMARY KEY,
                farm_id             INT NOT NULL,
                crop_id             VARCHAR(50) NOT NULL DEFAULT '',
                crop_name           VARCHAR(100) NOT NULL,
                planting_date       DATE NOT NULL,
                harvest_date        DATE NOT NULL,
                estimated_yield_ton DECIMAL(10,2) DEFAULT NULL,
                actual_yield_ton    DECIMAL(10,2) NOT NULL DEFAULT 0,
                notes               TEXT DEFAULT NULL,
                created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_farm_id   (farm_id),
                INDEX idx_harvest_date (harvest_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // ============================================
        // 5. Komoditas Table (112 Agricultural Commodities)
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS komoditas (
                id_komoditas  INT AUTO_INCREMENT PRIMARY KEY,
                nama_komoditas VARCHAR(100) NOT NULL,
                nama_latin    VARCHAR(100) NULL,
                kelompok      ENUM('Tanaman Pangan', 'Hortikultura', 'Perkebunan', 'Rempah dan Obat', 'Hijauan Pakan', 'Perikanan Payau') NOT NULL,
                halaman_ref   INT NOT NULL DEFAULT 0,
                icon_emoji    VARCHAR(10) DEFAULT '🌱',
                deskripsi_umum TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $ensureColumn('komoditas', 'nama_latin',    'VARCHAR(100) NULL');
        $ensureColumn('komoditas', 'deskripsi_umum','TEXT NULL');

        // ============================================
        // 6. Syarat Tumbuh Table (Growth Requirements)
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS syarat_tumbuh (
                id_syarat          INT AUTO_INCREMENT PRIMARY KEY,
                id_komoditas       INT NOT NULL,
                kode_kriteria      VARCHAR(20) NOT NULL,
                parameter          VARCHAR(50) NOT NULL,
                kelas_kesesuaian   ENUM('S1', 'S2', 'S3', 'N') NOT NULL,
                val_min            FLOAT NULL,
                val_max            FLOAT NULL,
                val_text           VARCHAR(150) NULL,
                INDEX idx_matching (id_komoditas, parameter, kelas_kesesuaian)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // ============================================
        // 7. Pupuk Standar Table (Standard Fertilizer Dosage)
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS pupuk_standar (
                id_pupuk          INT AUTO_INCREMENT PRIMARY KEY,
                id_komoditas      INT NOT NULL,
                fase_tanam        VARCHAR(50) NOT NULL,
                nama_pupuk        VARCHAR(100) NOT NULL,
                dosis_per_ha      FLOAT NOT NULL,
                satuan            VARCHAR(20) DEFAULT 'kg',
                catatan_agronomi  TEXT NULL,
                INDEX idx_komoditas (id_komoditas)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $ensureColumn('pupuk_standar', 'catatan_agronomi', 'TEXT NULL');

        // ============================================
        // 8. Evaluations Table (Land Evaluation History)
        //    NOTE: References farms(id), NOT farms(id_farm)
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS evaluations (
                id_eval          INT AUTO_INCREMENT PRIMARY KEY,
                id_farm          INT NOT NULL,
                id_komoditas     INT NOT NULL,
                kelas_akhir      ENUM('S1', 'S2', 'S3', 'N') NOT NULL,
                faktor_pembatas  VARCHAR(255) NULL,
                skor_kecocokan   INT NOT NULL DEFAULT 0,
                created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_farm   (id_farm),
                INDEX idx_komoditas (id_komoditas)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // ============================================
        // 9. Password Resets Table
        // ============================================
        $db->exec("
            CREATE TABLE IF NOT EXISTS password_resets (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                email      VARCHAR(100) NOT NULL,
                token      VARCHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at    DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_token (token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $db->exec('SET FOREIGN_KEY_CHECKS = 1;');

        return true;
    } catch (PDOException $e) {
        error_log('[TerraSense Migration Error] ' . $e->getMessage());
        return false;
    }
}

// Execute migration if called directly (one-time setup)
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'migrate.php') {
    requireLocalAccess();
    header('Content-Type: application/json; charset=utf-8');
    if (runMigrations()) {
        echo json_encode(['success' => true, 'message' => 'Database migration completed successfully!'], JSON_PRETTY_PRINT);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database migration failed. Check server error logs.'], JSON_PRETTY_PRINT);
    }
}
