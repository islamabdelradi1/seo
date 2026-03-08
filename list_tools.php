<?php
require_once 'php_version/includes/db.php';
$stmt = $pdo->query("SELECT name, slug FROM tools");
$tools = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($tools);
unlink(__FILE__);
?>
