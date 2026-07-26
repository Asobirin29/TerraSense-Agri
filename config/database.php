<?php
/**
 * Database Connection using PDO
 * Preventions for SQL Injection
 */

$host = 'localhost';
$dbname = 'terrasense_db';
$username = 'root';
$password = ''; // Default Laragon/XAMPP password is empty

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    // Set the PDO error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Set default fetch mode to associative array
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // In production, log the error and don't output the actual exception message to the user.
    die(json_encode(["error" => "Database connection failed: " . $e->getMessage()]));
}
?>
