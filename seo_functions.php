<?php
/**
 * SEO Utility Functions
 * وظائف برمجية لتحسين السيو
 */

/**
 * وظيفة calculateKeywordDensity: تأخذ نصاً وتعيد قائمة بأكثر 5 كلمات تكراراً مع نسبتها المئوية.
 */
function calculateKeywordDensity($text) {
    if (empty($text)) return [];

    // تنظيف النص من الرموز وتحويله لمصفوفة كلمات (يدعم العربية)
    $cleanText = preg_replace('/[^\p{L}\p{N}\s]/u', '', $text);
    $words = preg_split('/\s+/u', mb_strtolower($cleanText), -1, PREG_SPLIT_NO_EMPTY);
    
    $totalWords = count($words);
    if ($totalWords === 0) return [];

    // حساب التكرارات
    $wordCounts = array_count_values($words);
    arsort($wordCounts);

    // استخراج أعلى 5 كلمات
    $topWords = array_slice($wordCounts, 0, 5, true);
    
    $result = [];
    foreach ($topWords as $word => $count) {
        $percentage = ($count / $totalWords) * 100;
        $result[] = [
            'word' => $word,
            'count' => $count,
            'percentage' => round($percentage, 2) . '%'
        ];
    }

    return $result;
}

/**
 * وظيفة checkMetaLength: تتأكد أن العنوان أقل من 60 حرفاً والوصف أقل من 160 حرفاً
 * وتعطي تنبيهاً باللون الأحمر إذا زاد الطول.
 */
function checkMetaLength($title, $description) {
    $titleLimit = 60;
    $descLimit = 160;
    
    $titleLen = mb_strlen($title);
    $descLen = mb_strlen($description);
    
    $results = [
        'title' => [
            'length' => $titleLen,
            'status' => $titleLen > $titleLimit ? 'error' : 'success',
            'message' => $titleLen > $titleLimit ? "تنبيه: العنوان طويل جداً ($titleLen حرف). الحد الأقصى هو $titleLimit." : "العنوان مناسب ($titleLen حرف)."
        ],
        'description' => [
            'length' => $descLen,
            'status' => $descLen > $descLimit ? 'error' : 'success',
            'message' => $descLen > $descLimit ? "تنبيه: الوصف طويل جداً ($descLen حرف). الحد الأقصى هو $descLimit." : "الوصف مناسب ($descLen حرف)."
        ]
    ];
    
    return $results;
}
?>
