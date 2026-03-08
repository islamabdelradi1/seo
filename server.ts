import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import db from "./src/db.ts";
import { 
  generateArticle, 
  analyzeKeywords, 
  generateMetaTags, 
  createToolDetails, 
  runCustomTool,
  analyzeBacklinks,
  checkPlagiarism,
  analyzeSeoUrl,
  paraphraseText
} from "./src/services/geminiService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Admin Routes ---
  
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admin WHERE username = ? AND password = ?').get(username, password);
    if (admin) {
      res.json({ success: true, admin });
    } else {
      res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }
  });

  app.get("/api/admin/stats", (req, res) => {
    const users = db.prepare('SELECT count(*) as count FROM users').get() as any;
    const activeTokens = db.prepare("SELECT count(*) as count FROM tokens WHERE status = 'active'").get() as any;
    const inactiveTokens = db.prepare("SELECT count(*) as count FROM tokens WHERE status != 'active'").get() as any;
    res.json({ 
      users: users.count, 
      activeTokens: activeTokens.count, 
      inactiveTokens: inactiveTokens.count 
    });
  });

  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  app.get("/api/admin/tokens", (req, res) => {
    const tokens = db.prepare('SELECT tokens.*, users.name as user_name FROM tokens LEFT JOIN users ON tokens.user_id = users.id').all();
    res.json(tokens);
  });

  app.post("/api/admin/tokens/generate", (req, res) => {
    const { username, expiryDays, type } = req.body;
    
    // Find user by name, create if not exists
    let user = db.prepare('SELECT id FROM users WHERE name = ?').get(username) as any;
    if (!user) {
      const result = db.prepare('INSERT INTO users (name, email, status) VALUES (?, ?, ?)').run(username, `${username.toLowerCase().replace(/\s+/g, '')}@example.com`, 'active');
      user = { id: result.lastInsertRowid };
    } else {
      // Prevent multiple active tokens for the same user
      const existingToken = db.prepare("SELECT id FROM tokens WHERE user_id = ? AND status = 'active' AND expiry_date > ?").get(user.id, new Date().toISOString());
      if (existingToken) {
        return res.status(400).json({ success: false, message: "هذا المستخدم لديه اشتراك نشط بالفعل" });
      }
    }

    const token = `GARDIO-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
    
    try {
      db.prepare('INSERT INTO tokens (token, user_id, expiry_date, type) VALUES (?, ?, ?, ?)').run(token, user.id, expiryDate.toISOString(), type || 'paid');
      res.json({ success: true, token });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  });

  app.post("/api/fetch-url", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const html = await response.text();
      
      // Programmatic Analysis for Accuracy
      const $ = cheerio.load(html);
      
      // Focus on Article Content only
      // Try to find the main article container
      const articleSelectors = ['article', '.post-content', '.entry-content', '.article-content', '#article-body', '.main-content', '#content', 'main'];
      let $article = null;
      
      for (const selector of articleSelectors) {
        if ($(selector).length > 0) {
          $article = $(selector).first();
          break;
        }
      }
      
      // If no specific container found, use the body but try to be smart
      const $content = $article || $('body');

      // Clone to avoid modifying original for other checks if needed
      const $cleanContent = $content.clone();
      
      // Remove noise from the content area
      $cleanContent.find('script, style, noscript, iframe, svg, nav, footer, header, aside, .sidebar, .comments, .ads, .related-posts, .social-share').remove();
      
      const text = $cleanContent.text().replace(/\s+/g, ' ').trim();
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      
      const h1 = $cleanContent.find('h1').map((i, el) => $(el).text().trim()).get();
      const h2 = $cleanContent.find('h2').map((i, el) => $(el).text().trim()).get();
      const h3 = $cleanContent.find('h3').map((i, el) => $(el).text().trim()).get();
      
      const images = $cleanContent.find('img').length;
      const imagesWithAlt = $cleanContent.find('img[alt]').length;
      const imagesMissingAlt = images - imagesWithAlt;
      
      const links = $cleanContent.find('a').map((i, el) => $(el).attr('href')).get();
      const urlObj = new URL(url);
      const internalLinks = links.filter(l => {
        if (!l) return false;
        if (l.startsWith('/') || l.startsWith('#')) return true;
        try {
          const lObj = new URL(l);
          return lObj.hostname === urlObj.hostname;
        } catch {
          return false;
        }
      }).length;
      const externalLinks = links.length - internalLinks;

      res.json({ 
        html: $cleanContent.html()?.substring(0, 20000) || html.substring(0, 20000), 
        stats: {
          wordCount,
          headings: { h1, h2, h3 },
          images: { total: images, missing_alt: imagesMissingAlt },
          links: { internal: internalLinks, external: externalLinks }
        }
      });
    } catch (error: any) {
      console.error("Fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch URL" });
    }
  });

  app.post("/api/admin/tokens/toggle", (req, res) => {
    const { id, status } = req.body;
    db.prepare('UPDATE tokens SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  });

  app.post("/api/admin/tokens/delete", (req, res) => {
    const { id } = req.body;
    db.prepare('DELETE FROM tokens WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.get("/api/admin/articles", (req, res) => {
    const articles = db.prepare('SELECT articles.*, users.name as user_name FROM articles LEFT JOIN users ON articles.user_id = users.id ORDER BY created_at DESC').all();
    res.json(articles);
  });

  app.post("/api/admin/settings/update", (req, res) => {
    const { username, password, email } = req.body;
    db.prepare('UPDATE admin SET username = ?, password = ?, email = ? WHERE id = 1').run(username, password, email);
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all() as any[];
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    // Also include tools for landing page
    const landingTools = db.prepare('SELECT name, slug, plan_type FROM tools WHERE is_active = 1 AND show_on_landing = 1').all();
    settingsMap.landing_tools = landingTools;
    
    res.json(settingsMap);
  });

  app.post("/api/admin/settings/update", (req, res) => {
    const { settings } = req.body; // Object with key-value pairs
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        update.run(key, String(value));
      }
    })();
    
    res.json({ success: true });
  });

  app.get("/api/admin/tools", (req, res) => {
    const tools = db.prepare('SELECT * FROM tools').all();
    res.json(tools);
  });

  app.post("/api/admin/tools/toggle", (req, res) => {
    const { id, is_active } = req.body;
    db.prepare('UPDATE tools SET is_active = ? WHERE id = ?').run(is_active, id);
    res.json({ success: true });
  });

  app.post("/api/admin/tools/toggle-landing", (req, res) => {
    const { id, show_on_landing } = req.body;
    db.prepare('UPDATE tools SET show_on_landing = ? WHERE id = ?').run(show_on_landing, id);
    res.json({ success: true });
  });

  app.post("/api/admin/tools/update-plan", (req, res) => {
    const { id, plan_type } = req.body;
    db.prepare('UPDATE tools SET plan_type = ? WHERE id = ?').run(plan_type, id);
    res.json({ success: true });
  });

  app.post("/api/admin/tools/add", async (req, res) => {
    const { name, isAiGenerated } = req.body;
    try {
      let slug, systemInstruction;
      
      if (isAiGenerated) {
        const settings = db.prepare('SELECT * FROM settings').all() as any[];
        const activeModel = settings.find(s => s.key === 'active_ai_model')?.value || 'gemini';
        const geminiKey = settings.find(s => s.key === 'gemini_api_key')?.value || process.env.GEMINI_API_KEY;
        const openaiKey = settings.find(s => s.key === 'openai_api_key')?.value || process.env.OPENAI_API_KEY;
        
        const aiConfig = {
          model: activeModel,
          apiKey: activeModel === 'openai' ? openaiKey : geminiKey
        };
        
        const details = await createToolDetails(name, aiConfig);
        slug = details.slug;
        systemInstruction = details.system_instruction;
      } else {
        slug = req.body.slug;
        systemInstruction = req.body.system_instruction;
      }

      db.prepare('INSERT INTO tools (name, slug, system_instruction) VALUES (?, ?, ?)').run(name, slug, systemInstruction);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'فشل إنشاء الأداة' });
    }
  });

  app.post("/api/admin/tools/delete", (req, res) => {
    const { id } = req.body;
    db.prepare('DELETE FROM tools WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.get("/api/admin/settings", (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.get("/api/admin/ads", (req, res) => {
    const ads = db.prepare('SELECT * FROM ads').all();
    res.json(ads);
  });

  app.post("/api/admin/ads/update", (req, res) => {
    const { id, type, content, link, is_active } = req.body;
    db.prepare('UPDATE ads SET type = ?, content = ?, link = ?, is_active = ? WHERE id = ?')
      .run(type, content, link, is_active ? 1 : 0, id);
    res.json({ success: true });
  });

  app.get("/api/ads", (req, res) => {
    const ads = db.prepare('SELECT * FROM ads WHERE is_active = 1').all();
    res.json(ads);
  });

  app.post("/api/admin/settings/global", (req, res) => {
    const settings = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && value !== null) {
        stmt.run(key, String(value));
      }
    }
    res.json({ success: true });
  });

  app.post("/api/articles/save", (req, res) => {
    const { title, content, token } = req.body;
    // Find user by token
    const tokenData = db.prepare('SELECT user_id FROM tokens WHERE token = ?').get(token) as any;
    if (tokenData) {
      db.prepare('INSERT INTO articles (user_id, title, content) VALUES (?, ?, ?)').run(tokenData.user_id, title, content);
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  });

  // --- Rate Limiting for Preview ---
  const rateLimits = new Map<string, { count: number, resetTime: number }>();
  
  app.post("/api/auth/token-login", (req, res) => {
    const { token, deviceId } = req.body;
    const tokenData = db.prepare('SELECT tokens.*, users.name as user_name FROM tokens LEFT JOIN users ON tokens.user_id = users.id WHERE token = ?').get(token) as any;
    
    if (!tokenData) {
      return res.status(401).json({ success: false, message: 'التوكن غير صحيح.' });
    }

    const expiryDate = new Date(tokenData.expiry_date);
    if (expiryDate <= new Date()) {
      return res.status(403).json({ success: false, message: 'انتهت صلاحية التوكن.' });
    }

    if (tokenData.status !== 'active') {
      return res.status(403).json({ success: false, message: 'هذا التوكن معطل حالياً.' });
    }

    // Update last_device_id to the current one (this kicks out other devices)
    db.prepare('UPDATE tokens SET last_device_id = ? WHERE token = ?').run(deviceId, token);
    
    res.json({ success: true, user: { name: tokenData.user_name, token: tokenData.token, type: tokenData.type, expiry: tokenData.expiry_date } });
  });

  app.get("/api/user/usage", (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(401).json({ error: 'Token required' });
    
    const tokenData = db.prepare('SELECT type FROM tokens WHERE token = ?').get(token) as any;
    if (!tokenData) return res.status(401).json({ error: 'Invalid token' });

    const today = new Date().toISOString().split('T')[0];
    const usage = db.prepare('SELECT tool_slug, count FROM tool_usage WHERE token = ? AND usage_date = ?').all(token, today) as any[];
    
    const settings = db.prepare('SELECT * FROM settings WHERE key LIKE ?').all('%_limit') as any[];
    const limits: any = {};
    settings.forEach(s => {
      limits[s.key] = s.value;
    });

    res.json({ usage, limits, plan: tokenData.type });
  });

  app.get("/api/user/articles", (req, res) => {
    const { token } = req.query;
    const tokenData = db.prepare('SELECT user_id FROM tokens WHERE token = ?').get(token) as any;
    if (tokenData) {
      const articles = db.prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC').all(tokenData.user_id);
      res.json(articles);
    } else {
      res.status(401).json({ success: false });
    }
  });

  app.post("/api/save-article", (req, res) => {
    const { token, title, content } = req.body;
    const tokenData = db.prepare('SELECT * FROM tokens WHERE token = ?').get(token) as any;
    if (!tokenData) return res.status(401).json({ error: 'Invalid token' });
    
    try {
      db.prepare('INSERT INTO articles (user_id, title, content) VALUES (?, ?, ?)').run(tokenData.user_id, title, content);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save article' });
    }
  });

  app.post("/api/seo-task", async (req, res) => {
    const { token, deviceId, topic, tool } = req.body;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'يرجى تسجيل الدخول باستخدام توكن الاشتراك للوصول إلى هذه الأداة.' 
      });
    }

    // Check if token is valid
    const tokenData = db.prepare('SELECT * FROM tokens WHERE token = ?').get(token) as any;
    
    if (!tokenData) {
      return res.status(401).json({ 
        error: 'التوكن غير صحيح أو منتهي الصلاحية.' 
      });
    }

    // Device restriction check
    if (tokenData.last_device_id && tokenData.last_device_id !== deviceId) {
      return res.status(403).json({ 
        error: 'عذراً، هذا التوكن مستخدم حالياً على جهاز آخر. يسمح بجهاز واحد فقط في نفس الوقت.' 
      });
    }

    // Check if token is expired
    const expiryDate = new Date(tokenData.expiry_date);
    if (expiryDate <= new Date()) {
      return res.status(403).json({ 
        error: 'لقد انتهت صلاحية اشتراكك.' 
      });
    }

    // Permission check for 'free' tokens (example: limit to certain tools or counts)
    if (tokenData.type === 'free') {
      // You can add specific logic for free tokens here
      // For now, let's just let them through but maybe log it
    }

    // Check if token is active
    if (tokenData.status !== 'active') {
      return res.status(403).json({ 
        error: 'هذا التوكن معطل حالياً. يرجى التواصل مع الإدارة.' 
      });
    }

    // Check if tool is active and allowed for this plan
    const toolData = db.prepare('SELECT * FROM tools WHERE slug = ?').get(tool) as any;
    if (!toolData || !toolData.is_active) {
      return res.status(403).json({ error: 'هذه الأداة غير متوفرة حالياً.' });
    }

    if (toolData.plan_type !== 'both' && toolData.plan_type !== tokenData.type) {
      return res.status(403).json({ 
        error: `هذه الأداة متوفرة فقط لمشتركي الخطة ${toolData.plan_type === 'paid' ? 'الاحترافية' : 'المجانية'}.` 
      });
    }

    // Check usage limits
    const settings = db.prepare('SELECT * FROM settings').all() as any[];
    const freeLimit = parseInt(settings.find(s => s.key === 'free_plan_usage_limit')?.value || '5');
    const paidLimit = parseInt(settings.find(s => s.key === 'paid_plan_usage_limit')?.value || '1000');
    const currentLimit = tokenData.type === 'paid' ? paidLimit : freeLimit;

    if (tokenData.usage_count >= currentLimit) {
      return res.status(403).json({ 
        error: `لقد استنفدت الحد الأقصى للاستخدام المسموح به لخطة ${tokenData.type === 'paid' ? 'الاحترافية' : 'المجانية'} (${currentLimit} طلب). يرجى التواصل مع الإدارة لزيادة الحد.` 
      });
    }

    // Per-tool limit check
    const toolLimitKey = `${tool}_${tokenData.type}_limit`;
    const toolLimit = parseInt(settings.find(s => s.key === toolLimitKey)?.value || '0');
    
    const today = new Date().toISOString().split('T')[0];
    const currentToolUsage = db.prepare('SELECT count FROM tool_usage WHERE token = ? AND tool_slug = ? AND usage_date = ?').get(token, tool, today) as any;
    const usageCount = currentToolUsage ? currentToolUsage.count : 0;

    if (usageCount >= toolLimit) {
      return res.status(403).json({
        error: `انتهت عدد المحاولات اليومية لهذه الأداة (${toolLimit} محاولة). يرجى المحاولة غداً أو الترقية لخطة أعلى.`
      });
    }

    // Increment usage count
    db.prepare('UPDATE tokens SET usage_count = usage_count + 1 WHERE token = ?').run(token);
    
    // Increment per-tool usage
    if (currentToolUsage) {
      db.prepare('UPDATE tool_usage SET count = count + 1 WHERE id = ?').run(currentToolUsage.id);
    } else {
      db.prepare('INSERT INTO tool_usage (token, tool_slug, usage_date, count) VALUES (?, ?, ?, 1)').run(token, tool, today);
    }

    // Get AI settings
    const showAISelection = settings.find(s => s.key === 'show_ai_selection')?.value === '1';
    const { selectedAI: requestedAI } = req.body;
    
    let activeModel = settings.find(s => s.key === 'active_ai_model')?.value || 'gemini';
    
    // If selection is enabled and user sent a preference, use it
    if (showAISelection && requestedAI && (requestedAI === 'gemini' || requestedAI === 'openai')) {
      activeModel = requestedAI;
    }
    
    // Check if enabled
    const isGeminiEnabled = settings.find(s => s.key === 'gemini_enabled')?.value === '1';
    const isOpenAIEnabled = settings.find(s => s.key === 'openai_enabled')?.value === '1';

    if (activeModel === 'gemini' && !isGeminiEnabled) {
      return res.status(400).json({ error: 'محرك Gemini معطل حالياً من قبل الإدارة.' });
    }
    if (activeModel === 'openai' && !isOpenAIEnabled) {
      return res.status(400).json({ error: 'محرك OpenAI معطل حالياً من قبل الإدارة.' });
    }

    const geminiKeysRaw = settings.find(s => s.key === 'gemini_api_key')?.value || process.env.GEMINI_API_KEY || '';
    const openaiKeysRaw = settings.find(s => s.key === 'openai_api_key')?.value || process.env.OPENAI_API_KEY || '';
    
    const geminiKeys = geminiKeysRaw.split('\n').map(k => k.trim()).filter(k => k !== '');
    const openaiKeys = openaiKeysRaw.split('\n').map(k => k.trim()).filter(k => k !== '');
    
    const geminiKey = geminiKeys.length > 0 ? geminiKeys[Math.floor(Math.random() * geminiKeys.length)] : '';
    const openaiKey = openaiKeys.length > 0 ? openaiKeys[Math.floor(Math.random() * openaiKeys.length)] : '';
    
    if (activeModel === 'openai' && !openaiKey) {
      return res.status(400).json({ error: 'مفتاح OpenAI API غير متوفر. يرجى ضبطه في لوحة التحكم.' });
    }
    if (activeModel === 'gemini' && !geminiKey) {
      return res.status(400).json({ error: 'مفتاح Gemini API غير متوفر. يرجى ضبطه في لوحة التحكم.' });
    }

    const aiConfig = {
      model: activeModel,
      apiKey: activeModel === 'openai' ? openaiKey : geminiKey
    };

    // If Gemini, return config for frontend to execute
    if (activeModel === 'gemini') {
      return res.json({ 
        use_client: true, 
        model: 'gemini',
        apiKey: geminiKey 
      });
    }

    try {
      let result;
      // Note: Gemini tools are now handled by the client (see use_client block above)
      // This block only handles OpenAI or other models if implemented server-side
      if (activeModel === 'openai') {
        if (tool === 'writer') {
          result = await generateArticle(topic, aiConfig);
          db.prepare('INSERT INTO articles (user_id, title, content) VALUES (?, ?, ?)').run(tokenData.user_id, result.seo_title, JSON.stringify(result));
        } else if (tool === 'keywords') {
          const { country = 'Egypt' } = req.body;
          result = await analyzeKeywords(topic, country, aiConfig);
        } else if (tool === 'meta') {
          const { title, description } = req.body;
          result = await generateMetaTags(title, description, aiConfig);
        } else if (tool === 'backlink') {
          result = await analyzeBacklinks(topic, aiConfig);
        } else if (tool === 'plagiarism') {
          result = await checkPlagiarism(topic, aiConfig);
        } else if (tool === 'paraphraser') {
          result = await paraphraseText(topic, aiConfig);
        } else if (tool === 'analyzer') {
          const { html, stats } = req.body;
          result = await analyzeSeoUrl(html, aiConfig, stats);
        } else if (toolData.system_instruction) {
          const { prompt } = req.body;
          result = await runCustomTool(prompt || topic, toolData.system_instruction, aiConfig);
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
