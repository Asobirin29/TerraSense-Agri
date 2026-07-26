<?php
require_once __DIR__ . '/../config/database.php';
$db = getDB();

try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS harvest_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farm_id INT NOT NULL,
            crop_id VARCHAR(50) NOT NULL,
            crop_name VARCHAR(100) NOT NULL,
            planting_date DATE NOT NULL,
            harvest_date DATE NOT NULL,
            estimated_yield_ton DECIMAL(10,2) DEFAULT NULL,
            actual_yield_ton DECIMAL(10,2) NOT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
            INDEX idx_farm_id (farm_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Migration successful: harvest_logs table created!\n";
} catch(PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
