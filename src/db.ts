import Database from 'better-sqlite3';

const db = new Database('seo_app.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE,
    user_id INTEGER,
    expiry_date DATETIME,
    status TEXT DEFAULT 'active',
    last_device_id TEXT,
    type TEXT DEFAULT 'paid',
    usage_count INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    slug TEXT UNIQUE,
    is_active INTEGER DEFAULT 1,
    plan_type TEXT DEFAULT 'both',
    system_instruction TEXT,
    show_on_landing INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT UNIQUE,
    type TEXT DEFAULT 'code', -- 'code', 'image'
    content TEXT, -- HTML code or image URL
    link TEXT, -- Link for image ads
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS tool_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT,
    tool_slug TEXT,
    usage_date DATE DEFAULT (CURRENT_DATE),
    count INTEGER DEFAULT 0,
    UNIQUE(token, tool_slug, usage_date)
  );
`);

// Migration: Add plan_type and system_instruction to tools if they don't exist
try {
  db.prepare("ALTER TABLE tools ADD COLUMN plan_type TEXT DEFAULT 'both'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE tools ADD COLUMN system_instruction TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE tools ADD COLUMN show_on_landing INTEGER DEFAULT 1").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE tokens ADD COLUMN usage_count INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("CREATE TABLE IF NOT EXISTS ads (id INTEGER PRIMARY KEY AUTOINCREMENT, location TEXT UNIQUE, type TEXT DEFAULT 'code', content TEXT, link TEXT, is_active INTEGER DEFAULT 1)").run();
} catch (e) {}
try {
  db.prepare(`CREATE TABLE IF NOT EXISTS tool_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT,
    tool_slug TEXT,
    usage_date DATE DEFAULT (CURRENT_DATE),
    count INTEGER DEFAULT 0,
    UNIQUE(token, tool_slug, usage_date)
  )`).run();
} catch (e) {}

// Seed default settings
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('free_plan_usage_limit', '5');
insertSetting.run('paid_plan_usage_limit', '1000');

// Default tool limits
const tools = ['writer', 'keywords', 'meta', 'analyzer', 'backlink', 'plagiarism', 'paraphraser'];
tools.forEach(tool => {
  insertSetting.run(`${tool}_free_limit`, '3');
  insertSetting.run(`${tool}_paid_limit`, '50');
});

insertSetting.run('free_tier_limit', '3');
insertSetting.run('free_tier_enabled', '0');
insertSetting.run('subscription_price', '10');
insertSetting.run('whatsapp_number', '201234567890');
insertSetting.run('gemini_api_key', '');
insertSetting.run('openai_api_key', '');
insertSetting.run('gemini_display_name', 'ذكاء اصطناعي 1 (Gemini)');
insertSetting.run('openai_display_name', 'ذكاء اصطناعي 2 (OpenAI)');
insertSetting.run('active_ai_model', 'gemini');
insertSetting.run('gemini_enabled', '1');
insertSetting.run('openai_enabled', '0');
insertSetting.run('show_ai_selection', '0');
insertSetting.run('landing_hero_title', 'جاردو سيو - رفيقك الذكي لتصدر نتائج البحث');
insertSetting.run('landing_hero_desc', 'استخدم قوة الذكاء الاصطناعي لإنشاء محتوى متوافق مع السيو، تحليل الكلمات المفتاحية، وتحسين ظهور موقعك في محركات البحث العالمية.');
insertSetting.run('landing_about_text', 'نحن نقدم مجموعة متكاملة من الأدوات التي تساعد أصحاب المواقع والمدونين على تحسين ترتيب مواقعهم باستخدام أحدث تقنيات الذكاء الاصطناعي.');
insertSetting.run('landing_plan_free', 'خطة تجريبية محدودة للتعرف على جودة الأدوات.');
insertSetting.run('landing_plan_paid', 'وصول كامل لجميع الأدوات، دعم فني متواصل، وتحديثات دورية.');
insertSetting.run('landing_contact_info', 'للاشتراك أو الاستفسار، تواصل معنا عبر الواتساب أو البريد الإلكتروني.');
insertSetting.run('landing_features_json', JSON.stringify([
  { title: 'كاتب مقالات ذكي', desc: 'توليد مقالات حصرية متوافقة مع السيو في ثوانٍ.' },
  { title: 'تحليل الكلمات', desc: 'معرفة حجم البحث وصعوبة المنافسة بدقة.' },
  { title: 'تحسين الميتا تاج', desc: 'توليد عناوين وأوصاف تجذب الزوار ومحركات البحث.' },
  { title: 'محلل سيو برمجي', desc: 'فحص كثافة الكلمات وطول العناوين برمجياً.' },
  { title: 'إعادة صياغة متقدمة', desc: 'تطوير المحتوى بأسلوب احترافي مع الحفاظ على المعنى.' }
]));
insertSetting.run('landing_plans_json', JSON.stringify([
  { name: 'الخطة المجانية', price: '0', features: ['3 تجارب يومياً', 'أدوات محدودة', 'دعم مجتمعي'], type: 'free' },
  { name: 'الخطة الاحترافية', price: '10', features: ['وصول غير محدود', 'جميع الأدوات الذكية', 'دعم فني مباشر', 'تحديثات دورية'], type: 'paid' }
]));

// Seed default admin if not exists
const adminCount = db.prepare('SELECT count(*) as count FROM admin').get() as { count: number };
if (adminCount.count === 0) {
  db.prepare('INSERT INTO admin (username, password, email) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin@seo.com');
}

// Seed default tools
const toolsCount = db.prepare('SELECT count(*) as count FROM tools').get() as { count: number };
if (toolsCount.count === 0) {
  const insertTool = db.prepare('INSERT INTO tools (name, slug, plan_type) VALUES (?, ?, ?)');
  insertTool.run('كاتب المقالات', 'writer', 'paid');
  insertTool.run('فاحص الكلمات', 'keywords', 'both');
  insertTool.run('مولد الميتا تاج', 'meta', 'both');
  insertTool.run('محلل السيو', 'analyzer', 'both');
  insertTool.run('تحليل الباك لينك', 'backlink', 'paid');
  insertTool.run('فاحص المحتوى', 'plagiarism', 'paid');
}

// Seed default ads
const adsCount = db.prepare('SELECT count(*) as count FROM ads').get() as { count: number };
const insertAd = db.prepare('INSERT OR IGNORE INTO ads (location, type, content, is_active) VALUES (?, ?, ?, ?)');

if (adsCount.count === 0) {
  insertAd.run('header', 'code', '<!-- AdSense Header Code -->', 0);
  insertAd.run('sidebar_bottom', 'code', '<!-- Sidebar Ad -->', 0);
  insertAd.run('tool_above_result', 'code', '<!-- Above Result Ad -->', 0);
  insertAd.run('tool_below_result', 'code', '<!-- Below Result Ad -->', 0);
  insertAd.run('landing_middle', 'code', '<!-- Landing Page Ad -->', 0);
}

// Add new requested ad slots
insertAd.run('writer_after_title', 'code', '<!-- After Title Ad -->', 0);
insertAd.run('writer_after_meta', 'code', '<!-- After Meta Ad -->', 0);
insertAd.run('writer_after_content', 'code', '<!-- After Content Ad -->', 0);
insertAd.run('keywords_after_main', 'code', '<!-- After Keywords Main Ad -->', 0);
insertAd.run('keywords_after_competition', 'code', '<!-- After Competition Ad -->', 0);
insertAd.run('keywords_after_difficulty', 'code', '<!-- After Difficulty Ad -->', 0);
insertAd.run('keywords_after_short', 'code', '<!-- After Short Keywords Ad -->', 0);
insertAd.run('keywords_after_long', 'code', '<!-- After Long Keywords Ad -->', 0);
insertAd.run('keywords_after_competitors', 'code', '<!-- After Competitors Ad -->', 0);

// Ensure plagiarism tool exists
db.prepare("INSERT OR IGNORE INTO tools (name, slug, plan_type) VALUES ('فاحص المحتوى', 'plagiarism', 'paid')").run();
db.prepare("INSERT OR IGNORE INTO tools (name, slug, plan_type) VALUES ('إعادة الصياغة', 'paraphraser', 'both')").run();

export default db;
