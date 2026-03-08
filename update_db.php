<?php
require_once 'php_version/includes/db.php';

try {
    // 1. Add tool_slug to articles table
    $pdo->exec("ALTER TABLE articles ADD COLUMN tool_slug VARCHAR(50) DEFAULT 'writer'");
    
    // 2. Add custom_css and custom_tailwind to tools table for tool-specific designs
    $pdo->exec("ALTER TABLE tools ADD COLUMN custom_css TEXT");
    $pdo->exec("ALTER TABLE tools ADD COLUMN custom_tailwind TEXT");
    
    // 3. Add global custom design settings if not exists (already added in previous turn but let's be sure)
    // Actually they are in settings table.
    
    echo "Database schema updated successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
unlink(__FILE__);
?>
