<?php
require_once __DIR__ . '/../config/database.php';
$db = getDB();

try {
    $db->exec("ALTER TABLE farms ADD COLUMN crop_id VARCHAR(50) NULL");
} catch(PDOException $e) {}

try {
    $db->exec("ALTER TABLE farms ADD COLUMN planting_date DATE NULL");
} catch(PDOException $e) {}

try {
    $db->exec("ALTER TABLE farms ADD COLUMN irrigation_status VARCHAR(50) DEFAULT 'Tidak Ada Irigasi'");
} catch(PDOException $e) {}

echo "Migration successful!\n";
?>
