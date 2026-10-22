-- ============================================
-- TerraSense Agri — Database Schema
-- ============================================
-- Harus selalu sama dengan api/migrate.php (sumber kebenaran skema).
-- Data komoditas, syarat tumbuh, dan pupuk diisi lewat seeder:
--   php api/seed.php   (atau buka /api/seed.php dari localhost)
-- ============================================

CREATE DATABASE IF NOT EXISTS terrasense_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE terrasense_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Pengguna / Petani
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

-- 2. Lahan Pertanian (poligon dari Leaflet)
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
    soil_texture      VARCHAR(20) NULL, -- halus|agak_halus|sedang|agak_kasar|kasar (kuesioner)
    slope_pct         FLOAT NULL,       -- kemiringan lereng (%) dari kuesioner
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Riwayat Analisis Lahan (cuaca + rekomendasi)
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
    INDEX idx_farm_id (farm_id),
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Log Panen
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
    INDEX idx_farm_id      (farm_id),
    INDEX idx_harvest_date (harvest_date),
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Komoditas Pertanian
CREATE TABLE IF NOT EXISTS komoditas (
    id_komoditas   INT AUTO_INCREMENT PRIMARY KEY,
    nama_komoditas VARCHAR(100) NOT NULL,
    nama_latin     VARCHAR(100) NULL,
    kelompok       ENUM('Tanaman Pangan', 'Hortikultura', 'Perkebunan', 'Rempah dan Obat', 'Hijauan Pakan', 'Perikanan Payau') NOT NULL,
    halaman_ref    INT NOT NULL DEFAULT 0, -- Referensi halaman Juknis Balittanah 2003
    icon_emoji     VARCHAR(10) DEFAULT '🌱',
    deskripsi_umum TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Matriks Syarat Tumbuh (inti evaluasi lahan)
CREATE TABLE IF NOT EXISTS syarat_tumbuh (
    id_syarat        INT AUTO_INCREMENT PRIMARY KEY,
    id_komoditas     INT NOT NULL,
    kode_kriteria    VARCHAR(20) NOT NULL, -- tc, wa, oa, rc, eh, fh
    parameter        VARCHAR(50) NOT NULL, -- temperatur, curah_hujan, lereng, tekstur, ...
    kelas_kesesuaian ENUM('S1', 'S2', 'S3', 'N') NOT NULL,
    val_min          FLOAT NULL,
    val_max          FLOAT NULL,
    val_text         VARCHAR(150) NULL,
    INDEX idx_matching (id_komoditas, parameter, kelas_kesesuaian),
    FOREIGN KEY (id_komoditas) REFERENCES komoditas(id_komoditas) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Dosis Pupuk Standar (per hektar)
CREATE TABLE IF NOT EXISTS pupuk_standar (
    id_pupuk         INT AUTO_INCREMENT PRIMARY KEY,
    id_komoditas     INT NOT NULL,
    fase_tanam       VARCHAR(50) NOT NULL,
    nama_pupuk       VARCHAR(100) NOT NULL,
    dosis_per_ha     FLOAT NOT NULL,
    satuan           VARCHAR(20) DEFAULT 'kg',
    catatan_agronomi TEXT NULL,
    INDEX idx_komoditas (id_komoditas),
    FOREIGN KEY (id_komoditas) REFERENCES komoditas(id_komoditas) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Riwayat Evaluasi Kesesuaian Lahan (id_farm -> farms.id)
CREATE TABLE IF NOT EXISTS evaluations (
    id_eval         INT AUTO_INCREMENT PRIMARY KEY,
    id_farm         INT NOT NULL,
    id_komoditas    INT NOT NULL,
    kelas_akhir     ENUM('S1', 'S2', 'S3', 'N') NOT NULL,
    faktor_pembatas VARCHAR(255) NULL,
    skor_kecocokan  INT NOT NULL DEFAULT 0, -- 0 - 100
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_farm      (id_farm),
    INDEX idx_komoditas (id_komoditas),
    FOREIGN KEY (id_farm) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (id_komoditas) REFERENCES komoditas(id_komoditas) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Token Reset Password (token disimpan sebagai hash SHA-256)
CREATE TABLE IF NOT EXISTS password_resets (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    token      VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at    DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
