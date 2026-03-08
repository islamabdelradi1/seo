<?php
require_once 'php_version/includes/db.php';
try {
    $pdo->exec("ALTER TABLE articles ADD COLUMN tool_slug VARCHAR(50) DEFAULT NULL AFTER user_id");
    echo "Column tool_slug added to articles table successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
unlink(__FILE__);
?>
