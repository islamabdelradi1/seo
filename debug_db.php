<?php
require_once 'php_version/includes/db.php';
$stmt = $pdo->query("SELECT * FROM tools");
$tools = $stmt->fetchAll(PDO::FETCH_ASSOC);
file_put_contents('tools_debug.json', json_encode($tools));
echo "Done";
unlink(__FILE__);
?>
