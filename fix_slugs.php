<?php
require_once 'php_version/includes/db.php';

$tools = [
    ['name' => 'كاتب المقالات الذكي', 'slug' => 'writer'],
    ['name' => 'محلل الكلمات المفتاحية', 'slug' => 'keywords'],
    ['name' => 'مولد الميتا تاج', 'slug' => 'meta'],
    ['name' => 'فاحص الروابط الخلفية', 'slug' => 'backlink'],
    ['name' => 'Plagiarism Check', 'slug' => 'checker'],
    ['name' => 'محلل السيو التقني', 'slug' => 'seo-analyzer'],
    ['name' => 'إعادة الصياغة', 'slug' => 'paraphraser']
];

foreach ($tools as $t) {
    $stmt = $pdo->prepare("UPDATE tools SET slug = ?, name = ? WHERE slug = ? OR name = ?");
    $stmt->execute([$t['slug'], $t['name'], $t['slug'], $t['name']]);
}

echo "Slugs updated.";
unlink(__FILE__);
?>
