<?php
// Skrip Migrasi: Menambahkan kolom is_fertilized ke tabel farms
require_once __DIR__ . '/../config/database.php';

try {
    $db = getDB();
    
    // Cek apakah kolom sudah ada
    $stmt = $db->query("SHOW COLUMNS FROM farms LIKE 'is_fertilized'");
    $exists = $stmt->fetch();
    
    if (!$exists) {
        $db->exec("ALTER TABLE farms ADD COLUMN is_fertilized TINYINT(1) DEFAULT 0 AFTER planting_date");
        echo "✅ Kolom is_fertilized berhasil ditambahkan ke tabel farms.\n";
    } else {
        echo "ℹ️ Kolom is_fertilized sudah ada di tabel farms.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
