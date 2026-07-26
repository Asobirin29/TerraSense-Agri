-- ============================================
-- TerraSense Agri — Database Schema & Data
-- ============================================

CREATE DATABASE IF NOT EXISTS terrasense_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE terrasense_db;

-- Disable foreign key checks during creation
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabel Pengguna / Petani
CREATE TABLE IF NOT EXISTS users (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    nomor_wa VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_premium TINYINT(1) DEFAULT 0, -- 0: Free Tier, 1: Premium Tier
    subscription_expiry DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Lahan Pertanian (Menyimpan poligon dari Leaflet)
CREATE TABLE IF NOT EXISTS farms (
    id_farm INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT NOT NULL,
    nama_lahan VARCHAR(100) NOT NULL,
    luas_hektar FLOAT NOT NULL,
    luas_meter FLOAT NOT NULL,
    centroid_lat DOUBLE(10, 8) NOT NULL,
    centroid_lng DOUBLE(11, 8) NOT NULL,
    polygon_geojson JSON NOT NULL, -- Menyimpan koordinat poligon utuh
    elevasi_mdpl INT NOT NULL,
    riwayat_banjir ENUM('F0', 'F1', 'F2', 'F3', 'F4') DEFAULT 'F0',
    kedalaman_tanah ENUM('dalam', 'sedang', 'dangkal', 'sangat_dangkal') DEFAULT 'dalam',
    tekstur_basah ENUM('halus', 'agak_halus', 'sedang', 'agak_kasar', 'kasar') DEFAULT 'sedang',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Daftar 112 Komoditas Pertanian
CREATE TABLE IF NOT EXISTS komoditas (
    id_komoditas INT AUTO_INCREMENT PRIMARY KEY,
    nama_komoditas VARCHAR(100) NOT NULL,
    nama_latin VARCHAR(100) NULL,
    kelompok ENUM('Tanaman Pangan', 'Hortikultura', 'Perkebunan', 'Rempah dan Obat', 'Hijauan Pakan', 'Perikanan Payau') NOT NULL,
    halaman_ref INT NOT NULL, -- Referensi halaman di buku Juknis Balittanah 2003
    icon_emoji VARCHAR(10) DEFAULT '🌱',
    deskripsi_umum TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Matriks Syarat Tumbuh (Inti Evaluasi Lahan)
CREATE TABLE IF NOT EXISTS syarat_tumbuh (
    id_syarat INT AUTO_INCREMENT PRIMARY KEY,
    id_komoditas INT NOT NULL,
    kode_kriteria VARCHAR(20) NOT NULL, -- tc: temperatur, wa: air, oa: oksigen, rc: perakaran, eh: erosi, fh: banjir
    parameter VARCHAR(50) NOT NULL, -- e.g., 'temperatur', 'curah_hujan', 'lereng', 'tekstur', 'drainase'
    kelas_kesesuaian ENUM('S1', 'S2', 'S3', 'N') NOT NULL,
    val_min FLOAT NULL,
    val_max FLOAT NULL,
    val_text VARCHAR(150) NULL, -- Untuk tipe data string seperti 'baik, agak terhambat' atau 'halus, sedang'
    FOREIGN KEY (id_komoditas) REFERENCES komoditas(id_komoditas) ON DELETE CASCADE,
    INDEX idx_matching (id_komoditas, parameter, kelas_kesesuaian)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Riwayat Hasil Evaluasi & Rekomendasi
CREATE TABLE IF NOT EXISTS evaluations (
    id_eval INT AUTO_INCREMENT PRIMARY KEY,
    id_farm INT NOT NULL,
    id_komoditas INT NOT NULL,
    kelas_akhir ENUM('S1', 'S2', 'S3', 'N') NOT NULL,
    faktor_pembatas VARCHAR(255) NULL, -- Menyimpan nama parameter yang menyebabkan S2/S3/N
    skor_kecocokan INT NOT NULL, -- 0 - 100%
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_farm) REFERENCES farms(id_farm) ON DELETE CASCADE,
    FOREIGN KEY (id_komoditas) REFERENCES komoditas(id_komoditas) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabel Dosis Pupuk Standar (Per Hektar)
CREATE TABLE IF NOT EXISTS pupuk_standar (
    id_pupuk INT AUTO_INCREMENT PRIMARY KEY,
    id_komoditas INT NOT NULL,
    fase_tanam VARCHAR(50) NOT NULL, -- e.g., 'Dasar (Basal)', 'Vegetatif', 'Generatif (Pembesaran Umbi)'
    nama_pupuk VARCHAR(100) NOT NULL,
    dosis_per_ha FLOAT NOT NULL, -- Dosis dalam kg/Ha atau liter/Ha
    satuan VARCHAR(20) DEFAULT 'kg',
    catatan_agronomi TEXT NULL,
    FOREIGN KEY (id_komoditas) REFERENCES komoditas(id_komoditas) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================
-- Sample Data Insertion for Testing
-- ============================================

-- Insert Komoditas
INSERT INTO komoditas (id_komoditas, nama_komoditas, nama_latin, kelompok, halaman_ref, icon_emoji) VALUES
(1, 'Jagung', 'Zea mays', 'Tanaman Pangan', 41, '🌽'),
(2, 'Kopi Arabika', 'Coffea arabica', 'Perkebunan', 122, '☕');

-- Requirements for Jagung (Corn)
INSERT INTO syarat_tumbuh (id_komoditas, kode_kriteria, parameter, kelas_kesesuaian, val_min, val_max, val_text) VALUES
(1, 'tc', 'temperatur', 'S1', 20, 26, NULL),
(1, 'tc', 'temperatur', 'S2', 26, 30, NULL),
(1, 'wa', 'curah_hujan', 'S1', 500, 1200, NULL),
(1, 'wa', 'curah_hujan', 'S2', 1200, 1600, NULL),
(1, 'eh', 'lereng', 'S1', 0, 8, NULL),
(1, 'eh', 'lereng', 'S2', 8, 16, NULL),
(1, 'eh', 'lereng', 'S3', 16, 30, NULL),
(1, 'rc', 'tekstur', 'S1', NULL, NULL, 'halus, agak_halus, sedang'),
(1, 'rc', 'tekstur', 'S2', NULL, NULL, 'agak_kasar'),
(1, 'rc', 'tekstur', 'S3', NULL, NULL, 'kasar');

-- Fertilizer standard for Jagung
INSERT INTO pupuk_standar (id_komoditas, fase_tanam, nama_pupuk, dosis_per_ha, satuan) VALUES
(1, 'Dasar (Basal)', 'Urea', 100, 'kg'),
(1, 'Dasar (Basal)', 'SP-36', 150, 'kg'),
(1, 'Dasar (Basal)', 'KCl', 50, 'kg');
