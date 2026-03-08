<?php
require_once 'php_version/includes/db.php';

// Update Content Checker to Plagiarism Check
$stmt = $pdo->prepare("UPDATE tools SET name = 'Plagiarism Check' WHERE slug = 'checker'");
$stmt->execute();

echo "Tool name updated successfully.";
unlink(__FILE__);
?>
