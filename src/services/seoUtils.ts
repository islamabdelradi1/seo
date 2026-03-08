/**
 * SEO Utility Functions (TypeScript Version for UI)
 */

export const calculateKeywordDensity = (text: string) => {
  if (!text) return [];
  
  // Clean text and split into words
  const cleanText = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '');
  const words = cleanText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  const totalWords = words.length;
  if (totalWords === 0) return [];

  const counts: Record<string, number> = {};
  words.forEach(word => {
    counts[word] = (counts[word] || 0) + 1;
  });

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word, count]) => ({
      word,
      count,
      percentage: ((count / totalWords) * 100).toFixed(2) + '%'
    }));
};

export const checkMetaLength = (title: string, description: string) => {
  const titleLimit = 60;
  const descLimit = 160;
  
  return {
    title: {
      length: title.length,
      isValid: title.length <= titleLimit,
      message: title.length > titleLimit 
        ? `تنبيه: العنوان طويل جداً (${title.length} حرف). الحد الأقصى هو ${titleLimit}.`
        : `العنوان مناسب (${title.length} حرف).`
    },
    description: {
      length: description.length,
      isValid: description.length <= descLimit,
      message: description.length > descLimit 
        ? `تنبيه: الوصف طويل جداً (${description.length} حرف). الحد الأقصى هو ${descLimit}.`
        : `الوصف مناسب (${description.length} حرف).`
    }
  };
};
