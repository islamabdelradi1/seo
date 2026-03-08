<?php
/**
 * SEO AI API Handler (Secured)
 */

define('SECURE_ACCESS', true);
require_once 'security.php';
$config = require 'config.php';

header('Content-Type: application/json');

// التحقق من معدل الطلبات (Rate Limiting)
$rateLimit = checkRateLimit($config['RATE_LIMIT_COUNT'], $config['RATE_LIMIT_WINDOW']);
if (!$rateLimit['allowed']) {
    echo json_encode(['error' => $rateLimit['message']]);
    exit;
}

$api_key = $config['OPENAI_API_KEY'];

// استقبال البيانات المرسلة عبر AJAX
$input_data = json_decode(file_get_contents('php://input'), true);
$prompt = $input_data['prompt'] ?? '';

if (empty($prompt)) {
    echo json_encode(['error' => 'الرجاء إدخال النص المطلوب']);
    exit;
}

// إعداد بيانات الطلب لـ OpenAI
$data = [
    'model' => 'gpt-3.5-turbo',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'أنت خبير سيو محترف، ساعد المستخدم في كتابة محتوى متوافق مع محركات البحث.'
        ],
        [
            'role' => 'user',
            'content' => $prompt
        ]
    ],
    'temperature' => 0.7
];

// إعداد cURL
$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $api_key
]);

// تنفيذ الطلب
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo json_encode(['error' => 'خطأ في الاتصال: ' . curl_error($ch)]);
} else {
    if ($http_code !== 200) {
        echo json_encode(['error' => 'خطأ من API: ' . $response]);
    } else {
        // زيادة عداد الطلبات عند النجاح
        incrementRequestCount();
        // إرسال النتيجة النهائية
        echo $response;
    }
}

curl_close($ch);
?>
