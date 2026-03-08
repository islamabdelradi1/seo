<?php
/**
 * Security & Rate Limiting
 * نظام الحماية وتحديد معدل الطلبات
 */

session_start();

function checkRateLimit($limit, $window) {
    $now = time();
    
    // تهيئة الجلسة إذا كانت فارغة
    if (!isset($_SESSION['request_count'])) {
        $_SESSION['request_count'] = 0;
        $_SESSION['first_request_time'] = $now;
    }

    // إعادة تعيين العداد إذا انتهت الفترة الزمنية
    if ($now - $_SESSION['first_request_time'] > $window) {
        $_SESSION['request_count'] = 0;
        $_SESSION['first_request_time'] = $now;
    }

    // التحقق من التجاوز
    if ($_SESSION['request_count'] >= $limit) {
        $timeLeft = $window - ($now - $_SESSION['first_request_time']);
        $minutesLeft = ceil($timeLeft / 60);
        return [
            'allowed' => false,
            'message' => "لقد تجاوزت الحد المسموح (3 طلبات في الساعة). يرجى الانتظار $minutesLeft دقيقة."
        ];
    }

    return ['allowed' => true];
}

function incrementRequestCount() {
    $_SESSION['request_count']++;
}
?>
