import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

const getGeminiAI = (apiKey?: string) => {
  const key = (apiKey && apiKey.trim() !== "") ? apiKey : (process.env.GEMINI_API_KEY || "");
  return new GoogleGenAI({ apiKey: key });
};

const getOpenAI = (apiKey?: string) => {
  if (!apiKey && !process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY || "" });
};

export const generateArticle = async (topic: string, config: { model: string, apiKey: string }) => {
  const currentYear = 2026;
  const prompt = `أنت خبير سيو (SEO) محترف. قم بكتابة مقال شامل وحصري ومتوافق تماماً مع معايير السيو حول الموضوع التالي: "${topic}".
    
    تعليمات هامة:
    - استخدم السنة الحالية (${currentYear}) في العنوان والوصف والمحتوى إذا كان ذلك مناسباً للموضوع.
    - يجب أن تكون الإحصائيات (metrics) حقيقية وواقعية تماماً بناءً على المقال الذي كتبته فعلياً.
    - احسب عدد الكلمات (word_count) بدقة للمحتوى الذي أنشأته.
    - حدد قوة المقال (strength) ودرجة السيو (seo_score) بناءً على معايير حقيقية (توزيع الكلمات المفتاحية، طول الفقرات، جودة الترويسات).

    يجب أن يتضمن الرد كائن JSON يحتوي على:
    1. seo_title: عنوان جذاب يحتوي على الكلمة المفتاحية الرئيسية.
    2. seo_description: وصف ميتا جذاب للمقال.
    3. content: محتوى المقال كاملاً بتنسيق Markdown مع ترويسات (H1, H2, H3) وفقرات وقوائم.
    4. metrics: كائن يحتوي على:
       - strength: قوة المقال كنسبة مئوية (0-100) بناءً على جودة المحتوى وتغطية الموضوع.
       - seo_score: درجة السيو (0-100) بناءً على توزيع الكلمات والترويسات.
       - word_count: عدد الكلمات الفعلي للمقال.
    
    اكتب المقال باللغة العربية بأسلوب احترافي وجذاب يساعد في تصدر نتائج البحث.
    
    Return the result as a JSON object with the following structure:
    {
      "seo_title": "...",
      "seo_description": "...",
      "content": "...",
      "metrics": {
        "strength": 0,
        "seo_score": 0,
        "word_count": 0
      }
    }`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "أنت خبير سيو (SEO) محترف." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          seo_title: { type: Type.STRING },
          seo_description: { type: Type.STRING },
          content: { type: Type.STRING },
          metrics: {
            type: Type.OBJECT,
            properties: {
              strength: { type: Type.NUMBER },
              seo_score: { type: Type.NUMBER },
              word_count: { type: Type.NUMBER }
            },
            required: ["strength", "seo_score", "word_count"]
          }
        },
        required: ["seo_title", "seo_description", "content", "metrics"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const paraphraseText = async (text: string, config: { model: string, apiKey: string }) => {
  const prompt = `أنت خبير في إعادة الصياغة واللغويات. قم بإعادة صياغة النص التالي بأسلوب احترافي مع الحفاظ على المعنى الأصلي تماماً.
    
    النص المراد إعادة صياغته: "${text}"

    المطلوب:
    1. نص كامل معاد صياغته (paraphrased_text).
    2. قائمة بالكلمات التي تم تغييرها (changed_words) حيث يحتوي كل عنصر على:
       - original: الكلمة الأصلية.
       - modified: الكلمة الجديدة.
       - synonyms: قائمة بـ 3 مرادفات بديلة أخرى لنفس السياق.
    
    يجب أن يكون الرد بتنسيق JSON:
    {
      "paraphrased_text": "...",
      "changed_words": [
        {
          "original": "...",
          "modified": "...",
          "synonyms": ["...", "...", "..."]
        }
      ]
    }`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "أنت خبير في إعادة الصياغة." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          paraphrased_text: { type: Type.STRING },
          changed_words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                modified: { type: Type.STRING },
                synonyms: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["original", "modified", "synonyms"]
            }
          }
        },
        required: ["paraphrased_text", "changed_words"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const checkPlagiarism = async (text: string, config: { model: string, apiKey: string }) => {
  const prompt = `Analyze the following text for uniqueness and plagiarism: "${text.substring(0, 2000)}".
    Provide a professional analysis in Arabic.
    Include:
    1. Uniqueness percentage (0-100).
    2. Plagiarism percentage (0-100).
    3. A brief summary of the analysis.
    
    Return the result as a JSON object:
    {
      "uniqueness": 0,
      "plagiarism": 0,
      "summary": "..."
    }`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          uniqueness: { type: Type.NUMBER },
          plagiarism: { type: Type.NUMBER },
          summary: { type: Type.STRING }
        },
        required: ["uniqueness", "plagiarism", "summary"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const analyzeKeywords = async (keywords: string, country: string, config: { model: string, apiKey: string }) => {
  const prompt = `Analyze the following keywords for SEO in the context of ${country}: ${keywords}. 
    Provide a JSON response with:
    1. difficulty (1-100)
    2. search volume estimation
    3. country: ${country}
    4. short_tail_suggestions: 10-15 short-tail keywords with their difficulty (1-100).
    5. long_tail_suggestions: 10-15 long-tail keywords (easy to rank) with their difficulty (1-100).
    6. top_10_competitors: top 10 competitors ranking for this keyword in Google.
       Include for each: name, url, word_count, rank (1-10), strength_percentage (0-100), and weaknesses (list of strings).
    
    Format: {
      "analysis": [{
        "keyword": "...",
        "difficulty": 0,
        "volume": "...",
        "country": "...",
        "short_tail_suggestions": [{"keyword": "...", "difficulty": 0}],
        "long_tail_suggestions": [{"keyword": "...", "difficulty": 0}],
        "competitors": [{
          "name": "...",
          "url": "...",
          "word_count": 0,
          "rank": 0,
          "strength": 0,
          "weaknesses": ["..."]
        }]
      }]
    }`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                keyword: { type: Type.STRING },
                difficulty: { type: Type.NUMBER },
                volume: { type: Type.STRING },
                country: { type: Type.STRING },
                short_tail_suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      keyword: { type: Type.STRING },
                      difficulty: { type: Type.NUMBER }
                    },
                    required: ["keyword", "difficulty"]
                  }
                },
                long_tail_suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      keyword: { type: Type.STRING },
                      difficulty: { type: Type.NUMBER }
                    },
                    required: ["keyword", "difficulty"]
                  }
                },
                competitors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      url: { type: Type.STRING },
                      word_count: { type: Type.NUMBER },
                      rank: { type: Type.NUMBER },
                      strength: { type: Type.NUMBER },
                      weaknesses: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ["name", "url", "word_count", "rank", "strength", "weaknesses"]
                  }
                }
              },
              required: ["keyword", "difficulty", "volume", "country", "short_tail_suggestions", "long_tail_suggestions", "competitors"]
            }
          }
        },
        required: ["analysis"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const createToolDetails = async (toolName: string, config: { model: string, apiKey: string }) => {
  const prompt = `أريد إنشاء أداة سيو جديدة باسم: "${toolName}". 
    قم بتوليد:
    1. slug فريد بالإنجليزية للأداة (مثلاً: article-generator).
    2. تعليمات نظام (system instruction) مفصلة للذكاء الاصطناعي ليعمل كخبير في هذه الأداة تحديداً.
    3. وصف قصير للأداة بالعربية.
    
    أرجع النتيجة بتنسيق JSON.`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          slug: { type: Type.STRING },
          system_instruction: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["slug", "system_instruction", "description"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const runCustomTool = async (prompt: string, systemInstruction: string, config: { model: string, apiKey: string }) => {
  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ]
    });
    return response.choices[0].message.content;
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: systemInstruction
    }
  });
  return response.text;
};

export const generateMetaTags = async (title: string, description: string, config: { model: string, apiKey: string }) => {
  const prompt = `Generate SEO Meta Tags (Title, Description, Keywords) in Arabic for a page with: Title: ${title}, Description: ${description}. Return as a JSON object.`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          seo_title: { type: Type.STRING },
          seo_description: { type: Type.STRING },
          seo_keywords: { type: Type.STRING },
          og_tags: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        },
        required: ["seo_title", "seo_description", "seo_keywords"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const analyzeBacklinks = async (url: string, config: { model: string, apiKey: string }) => {
  const prompt = `أنت الآن خبير سيو (SEO) محترف وتعمل كمحاكي متقدم لأداة Ahrefs Backlink Checker. 
    مهمتك هي إجراء تحليل حقيقي وعميق للروابط الخلفية (Backlinks) للموقع التالي: ${url}.
    
    باستخدام أدوات البحث المتاحة لك، ابحث عن الروابط الخلفية الحقيقية، الإشارات (Mentions)، والمقالات التي تشير إلى هذا الموقع.
    
    يجب أن تتضمن النتائج:
    1. Domain Rating (DR): تقييم دقيق لقوة الدومين بناءً على ملف الروابط الحقيقي.
    2. Backlinks: عدد الروابط الخلفية المكتشفة فعلياً.
    3. Referring Domains: عدد النطاقات الفريدة التي تشير للموقع.
    4. قائمة بـ 10-15 رابط خلفي حقيقي (URLs حقيقية وموجودة فعلاً) تتضمن:
       - URL: رابط الصفحة المصدر.
       - DR: قوة الدومين المصدر.
       - Anchor: النص المستخدم في الرابط.
       - Target URL: الصفحة التي يوجه إليها الرابط في الموقع المحلل.
       - Type: هل الرابط dofollow أم nofollow.
    5. ملخص استراتيجي احترافي يحلل جودة الروابط وتوزيعها.
    6. توصيات عملية ومحددة لتحسين ملف الروابط الخلفية بناءً على معايير Ahrefs العالمية.
    
    يجب أن تكون جميع البيانات والروابط حقيقية قدر الإمكان وتعكس الوضع الفعلي للموقع على شبكة الإنترنت.
    
    Return the result as a JSON object with the following structure:
    {
      "domain_rating": 0,
      "total_backlinks": 0,
      "referring_domains": 0,
      "backlinks_list": [{"url": "...", "dr": 0, "anchor": "...", "target_url": "...", "type": "dofollow/nofollow"}],
      "analysis_summary": "...",
      "recommendations": ["..."]
    }`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          domain_rating: { type: Type.NUMBER },
          total_backlinks: { type: Type.NUMBER },
          referring_domains: { type: Type.NUMBER },
          backlinks_list: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                url: { type: Type.STRING },
                dr: { type: Type.NUMBER },
                anchor: { type: Type.STRING },
                target_url: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["url", "dr", "anchor", "target_url", "type"]
            }
          },
          analysis_summary: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["domain_rating", "total_backlinks", "referring_domains", "backlinks_list", "analysis_summary", "recommendations"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const analyzeSeoUrl = async (html: string, config: { model: string, apiKey: string }, stats?: any) => {
  const prompt = `أنت خبير سيو (SEO) محترف. قم بتحليل كود HTML التالي تحليلاً عميقاً وشاملاً لاستخراج مقاييس السيو الحقيقية.
    
    لقد قمنا بإجراء فحص برمجي دقيق للمقاييس التالية، يجب عليك استخدامها في تقريرك لضمان الدقة:
    - عدد الكلمات الفعلي: ${stats?.wordCount || 'غير محدد'}
    - ترويسات H1: ${JSON.stringify(stats?.headings?.h1 || [])}
    - ترويسات H2: ${JSON.stringify(stats?.headings?.h2 || [])}
    - ترويسات H3: ${JSON.stringify(stats?.headings?.h3 || [])}
    - إجمالي الصور: ${stats?.images?.total || 0}
    - صور بدون Alt: ${stats?.images?.missing_alt || 0}
    - روابط داخلية: ${stats?.links?.internal || 0}
    - روابط خارجية: ${stats?.links?.external || 0}

    كود HTML (جزء منه):
    ${html.substring(0, 10000)}
    
    يجب أن يتضمن التحليل:
    1. Title: هل موجود؟ ما هو؟ هل طوله مناسب؟
    2. Meta Description: هل موجود؟ ما هو؟ هل طوله مناسب؟
    3. Headings (H1-H6): هل هي مرتبة بشكل صحيح؟ (استخدم البيانات البرمجية أعلاه)
    4. Images: هل تحتوي على Alt tags؟ (استخدم البيانات البرمجية أعلاه)
    5. Links: عدد الروابط الداخلية والخارجية. (استخدم البيانات البرمجية أعلاه)
    6. Content: طول المحتوى وكثافة الكلمات المفتاحية. (استخدم البيانات البرمجية أعلاه)
    7. Mobile Friendly: هل توجد ترويسة viewport؟
    
    أرجع النتيجة بتنسيق JSON يحتوي على:
    {
      "score": 0,
      "title": { "content": "...", "isValid": true, "message": "..." },
      "description": { "content": "...", "isValid": true, "message": "..." },
      "headings": { "h1": ["..."], "h2": ["..."], "h3": ["..."], "structure_valid": true },
      "images": { "total": 0, "missing_alt": 0, "message": "..." },
      "links": { "internal": 0, "external": 0 },
      "content_stats": { "word_count": 0, "reading_time": 0 },
      "technical": { "viewport": true, "charset": true },
      "recommendations": ["..."]
    }`;

  if (config.model === 'openai') {
    const openai = getOpenAI(config.apiKey);
    if (!openai) throw new Error("OpenAI API Key is missing");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  }

  const ai = getGeminiAI(config.apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          title: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              isValid: { type: Type.BOOLEAN },
              message: { type: Type.STRING }
            },
            required: ["content", "isValid", "message"]
          },
          description: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              isValid: { type: Type.BOOLEAN },
              message: { type: Type.STRING }
            },
            required: ["content", "isValid", "message"]
          },
          headings: {
            type: Type.OBJECT,
            properties: {
              h1: { type: Type.ARRAY, items: { type: Type.STRING } },
              h2: { type: Type.ARRAY, items: { type: Type.STRING } },
              h3: { type: Type.ARRAY, items: { type: Type.STRING } },
              structure_valid: { type: Type.BOOLEAN }
            },
            required: ["h1", "h2", "h3", "structure_valid"]
          },
          images: {
            type: Type.OBJECT,
            properties: {
              total: { type: Type.NUMBER },
              missing_alt: { type: Type.NUMBER },
              message: { type: Type.STRING }
            },
            required: ["total", "missing_alt", "message"]
          },
          links: {
            type: Type.OBJECT,
            properties: {
              internal: { type: Type.NUMBER },
              external: { type: Type.NUMBER }
            },
            required: ["internal", "external"]
          },
          content_stats: {
            type: Type.OBJECT,
            properties: {
              word_count: { type: Type.NUMBER },
              reading_time: { type: Type.NUMBER }
            },
            required: ["word_count", "reading_time"]
          },
          technical: {
            type: Type.OBJECT,
            properties: {
              viewport: { type: Type.BOOLEAN },
              charset: { type: Type.BOOLEAN }
            },
            required: ["viewport", "charset"]
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["score", "title", "description", "headings", "images", "links", "content_stats", "technical", "recommendations"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};
