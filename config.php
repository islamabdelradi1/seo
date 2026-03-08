<?php
/**
 * Configuration File
 * تأمين ملف الإعدادات ومنع الوصول المباشر له
 */

if (!defined('SECURE_ACCESS')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Access Denied');
}

// إعدادات المفاتيح
return [
    'OPENAI_API_KEY' => getenv('OPENAI_API_KEY') ?: 'YOUR_OPENAI_API_KEY',
    'GEMINI_API_KEY' => getenv('GEMINI_API_KEY') ?: 'YOUR_GEMINI_API_KEY',
    'RATE_LIMIT_COUNT' => 3,
    'RATE_LIMIT_WINDOW' => 3600 // ساعة واحدة بالثواني
];
?>
