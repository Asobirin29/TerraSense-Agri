-- ============================================
-- TerraSense Agri — Database Schema
-- Platform Multi-Petani
-- ============================================

CREATE DATABASE IF NOT EXISTS terrasense_agri
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE terrasense_agri;

-- ============================================
-- Tabel: users (Akun Petani)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    location VARCHAR(255) DEFAULT 'Sumedang, Jawa Barat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabel: farms (Data Lahan/Perkebunan)
-- ============================================
CREATE TABLE IF NOT EXISTS farms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL DEFAULT 'Lahan Saya',
    geojson LONGTEXT NOT NULL,
    area_ha DECIMAL(10,4) DEFAULT 0,
    elevation DECIMAL(8,2) DEFAULT 0,
    zone ENUM('highland','midland','lowland') DEFAULT 'midland',
    latitude DECIMAL(10,7) DEFAULT NULL,
    longitude DECIMAL(10,7) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabel: farm_analyses (Riwayat Analisis)
-- ============================================
CREATE TABLE IF NOT EXISTS farm_analyses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    temperature DECIMAL(5,2) DEFAULT NULL,
    humidity DECIMAL(5,2) DEFAULT NULL,
    precipitation DECIMAL(8,2) DEFAULT NULL,
    zone ENUM('highland','midland','lowland') DEFAULT 'midland',
    recommendations JSON DEFAULT NULL,
    dosage JSON DEFAULT NULL,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    INDEX idx_farm_id (farm_id),
    INDEX idx_analyzed_at (analyzed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
