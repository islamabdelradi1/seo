/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PenTool, 
  Search, 
  Tags, 
  Loader2, 
  ChevronRight,
  Copy,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  LogIn,
  LogOut,
  Key,
  ShieldCheck,
  Users,
  History,
  Settings,
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  Calendar,
  UserCog,
  MessageCircle,
  CreditCard,
  Check,
  Lock,
  Trash2,
  Sparkles,
  Menu,
  X,
  Wand2,
  ExternalLink,
  Activity,
  PieChart,
  Eye,
  FileText,
  User,
  Image,
  Globe,
  Clock,
  Link,
  FileCode,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateArticle, 
  analyzeKeywords, 
  generateMetaTags, 
  checkPlagiarism, 
  runCustomTool, 
  analyzeBacklinks,
  analyzeSeoUrl,
  paraphraseText
} from './services/geminiService';
import { calculateKeywordDensity, checkMetaLength } from './services/seoUtils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { diff_match_patch } from 'diff-match-patch';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tool = 'writer' | 'keywords' | 'meta' | 'analyzer' | 'backlink' | 'plagiarism' | 'paraphraser';
type AdminPage = 'overview' | 'users' | 'tokens' | 'articles' | 'tools' | 'settings' | 'landing' | 'ads';

const COUNTRIES = [
  'مصر', 'السعودية', 'الإمارات', 'الكويت', 'قطر', 'عمان', 'البحرين', 'الأردن', 'لبنان', 'العراق', 'المغرب', 'تونس', 'الجزائر', 'ليبيا', 'السودان', 'اليمن', 'فلسطين', 'سوريا'
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPage, setAdminPage] = useState<AdminPage>('overview');
  const [adminData, setAdminData] = useState<any>(null);
  
  const [token, setToken] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTool, setActiveTool] = useState<Tool>('writer');
  const [loading, setLoading] = useState(false);
  const [toolResults, setToolResults] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  // Form States
  const [topic, setTopic] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');

  // Analyzer States
  const [analyzerText, setAnalyzerText] = useState('');
  const [analyzerUrl, setAnalyzerUrl] = useState('');
  const [analyzerTitle, setAnalyzerTitle] = useState('');
  const [analyzerDesc, setAnalyzerDesc] = useState('');
  const [backlinkUrl, setBacklinkUrl] = useState('');
  const [backlinkPage, setBacklinkPage] = useState(1);
  const [backlinkPerPage, setBacklinkPerPage] = useState(5);
  const [plagiarismText, setPlagiarismText] = useState('');
  const [paraphraseInput, setParaphraseInput] = useState('');
  const [paraphraseResult, setParaphraseResult] = useState<any>(null);
  const [selectedSynonymWord, setSelectedSynonymWord] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState('مصر');
  const [showAllSuggestions, setShowAllSuggestions] = useState<{ type: 'short' | 'long', data: any[] } | null>(null);
  const [userArticles, setUserArticles] = useState<any[]>([]);
  const [creationProgress, setCreationProgress] = useState(0);
  const [requestProgress, setRequestProgress] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [viewingArticle, setViewingArticle] = useState<any>(null);

  // Admin States
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTokens, setAdminTokens] = useState<any[]>([]);
  const [adminArticles, setAdminArticles] = useState<any[]>([]);
  const [adminTools, setAdminTools] = useState<any[]>([]);
  const [adminAds, setAdminAds] = useState<any[]>([]);
  const [publicAds, setPublicAds] = useState<any[]>([]);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [globalSettings, setGlobalSettings] = useState<any>({ 
    free_tier_limit: '3', 
    free_tier_enabled: '1',
    subscription_price: '10',
    whatsapp_number: ''
  });
  const [newToolName, setNewToolName] = useState('');
  const [newToolSlug, setNewToolSlug] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [usageStats, setUsageStats] = useState<{ usage: any[], limits: any, plan: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'hero' | 'features' | 'plans' | 'contact' | 'login'>('hero');
  const [landingSettings, setLandingSettings] = useState<any>({
    landing_hero_title: '',
    landing_hero_desc: '',
    landing_about_text: '',
    landing_about_image: '',
    landing_plans_json: '[]',
    landing_features_json: '[]',
    landing_contact_info: ''
  });

  const [autoSubmit, setAutoSubmit] = useState(false);
  const [selectedAI, setSelectedAI] = useState<'gemini' | 'openai'>('gemini');

  useEffect(() => {
    if (autoSubmit) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      setAutoSubmit(false);
    }
  }, [autoSubmit, activeTool]);

  useEffect(() => {
    fetchSettings();
    const savedToken = localStorage.getItem('gardio_token');
    const savedAdmin = localStorage.getItem('gardio_admin');
    const savedUser = localStorage.getItem('gardio_user');

    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      if (savedUser) setUserData(JSON.parse(savedUser));
    }
    if (savedAdmin) {
      setIsAdminMode(true);
      setAdminData(JSON.parse(savedAdmin));
      fetchAdminStats();
    }

    if (isAdminMode) {
      fetchAdminStats();
      fetchAdminUsers();
      fetchAdminTokens();
      fetchAdminArticles();
      fetchAdminTools();
      fetchAdminAds();
    }
    fetchPublicAds();
  }, [isLoggedIn, isAdminMode]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      button, a, [role="button"] {
        cursor: pointer !important;
      }
      .animate-shake {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
      }
      @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const fetchUserArticles = async () => {
    const savedToken = localStorage.getItem('gardio_token') || token;
    if (!savedToken) return;
    try {
      const res = await fetch(`/api/user/articles?token=${savedToken}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUserArticles(data);
        if (data.length > 0 && !toolResults.writer) {
          try {
            const lastArticle = JSON.parse(data[0].content);
            setToolResults(prev => ({ ...prev, writer: lastArticle }));
          } catch(e) {}
        }
      }
    } catch (e) {
      console.error('Failed to fetch user articles');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setGlobalSettings(data);
      setLandingSettings(data);
    } catch (e) {
      console.error('Failed to fetch settings');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const res = await fetch('/api/auth/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceId })
      });
      const data = await res.json();
      
      if (data.success) {
        setIsLoggedIn(true);
        setUserData(data.user);
        localStorage.setItem('gardio_token', token);
        localStorage.setItem('gardio_user', JSON.stringify(data.user));
        setLoginError('');
        showToast('تم تسجيل الدخول بنجاح');
      } else {
        setLoginError(data.message || 'التوكن غير صحيح أو منتهي الصلاحية.');
      }
    } catch (error) {
      setLoginError('حدث خطأ أثناء الاتصال بالخادم.');
    }
  };

  const fetchUsageStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/user/usage?token=${token}`);
      const data = await res.json();
      if (res.ok) setUsageStats(data);
    } catch (e) {
      console.error("Failed to fetch usage stats", e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUsageStats();
    }
  }, [isLoggedIn, activeTool]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdminMode(false);
    setToken('');
    setUserData(null);
    setToolResults({});
    localStorage.removeItem('gardio_token');
    localStorage.removeItem('gardio_user');
    localStorage.removeItem('gardio_admin');
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminMode(true);
        setIsSidebarOpen(true);
        setAdminData(data.admin);
        setAdminUsername(data.admin.username);
        setAdminEmail(data.admin.email);
        localStorage.setItem('gardio_admin', JSON.stringify(data.admin));
        fetchAdminStats();
      } else {
        showToast(data.message || 'خطأ في بيانات الدخول', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  const updateLandingSettings = async (newSettings: any) => {
    try {
      const res = await fetch('/api/admin/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings })
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم تحديث الإعدادات بنجاح');
        fetchSettings();
      }
    } catch (e) {
      showToast('فشل تحديث الإعدادات', 'error');
    }
  };

  const fetchAdminStats = async () => {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    setAdminStats(data);
    fetchGlobalSettings();
  };

  const fetchGlobalSettings = async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    setGlobalSettings(data);
  };

  const handleUpdateGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateGlobalSettings(globalSettings);
    showToast('تم حفظ الإعدادات بنجاح');
  };

  const updateGlobalSettings = async (settings: any) => {
    await fetch('/api/admin/settings/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  };

  const fetchAdminUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setAdminUsers(data);
  };

  const fetchAdminTokens = async () => {
    const res = await fetch('/api/admin/tokens');
    const data = await res.json();
    setAdminTokens(data);
  };

  const handleToggleToken = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await fetch('/api/admin/tokens/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      fetchAdminTokens();
      showToast('تم تحديث حالة التوكن');
    }
  };

  const fetchAdminArticles = async () => {
    const res = await fetch('/api/admin/articles');
    const data = await res.json();
    setAdminArticles(data);
  };

  const fetchAdminTools = async () => {
    const res = await fetch('/api/admin/tools');
    const data = await res.json();
    setAdminTools(data);
  };

  const fetchAdminAds = async () => {
    const res = await fetch('/api/admin/ads');
    const data = await res.json();
    setAdminAds(data);
  };

  const fetchPublicAds = async () => {
    const res = await fetch('/api/ads');
    const data = await res.json();
    setPublicAds(data);
  };

  const handleUpdateAd = async (ad: any) => {
    const res = await fetch('/api/admin/ads/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ad)
    });
    if (res.ok) {
      showToast('تم تحديث الإعلان بنجاح');
      fetchAdminAds();
      fetchPublicAds();
    }
  };

  const handleGenerateToken = async (username: string, days: number, type: string) => {
    const res = await fetch('/api/admin/tokens/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, expiryDays: days, type })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`تم إنشاء التوكن: ${data.token}`);
      fetchAdminTokens();
    } else {
      showToast(data.message || 'فشل إنشاء التوكن', 'error');
    }
  };

  const handleDeleteToken = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا التوكن؟')) return;
    await fetch('/api/admin/tokens/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchAdminTokens();
    showToast('تم حذف التوكن بنجاح');
  };

  const handleToggleTool = async (id: number, currentStatus: number) => {
    await fetch('/api/admin/tools/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: currentStatus ? 0 : 1 })
    });
    fetchAdminTools();
  };

  const handleToggleLanding = async (id: number, currentStatus: number) => {
    await fetch('/api/admin/tools/toggle-landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, show_on_landing: currentStatus ? 0 : 1 })
    });
    fetchAdminTools();
  };

  const handleUpdateToolPlan = async (id: number, plan_type: string) => {
    const res = await fetch('/api/admin/tools/update-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plan_type })
    });
    if (res.ok) {
      showToast('تم تحديث خطة الأداة');
      fetchAdminTools();
    }
  };

  const handleAddTool = async (e: React.FormEvent, isAiGenerated: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    setCreationProgress(0);
    
    let progressInterval: any;
    if (isAiGenerated) {
      progressInterval = setInterval(() => {
        setCreationProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 10;
        });
      }, 800);
    }

    try {
      const res = await fetch('/api/admin/tools/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newToolName, 
          slug: newToolSlug, 
          isAiGenerated 
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreationProgress(100);
        setNewToolName('');
        setNewToolSlug('');
        fetchAdminTools();
        showToast(isAiGenerated ? 'تم إنشاء الأداة بواسطة الذكاء الاصطناعي' : 'تمت إضافة الأداة');
      } else {
        showToast(data.message || 'فشل إضافة الأداة', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال', 'error');
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setTimeout(() => {
        setLoading(false);
        setCreationProgress(0);
      }, 500);
    }
  };

  const handleDeleteTool = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الأداة؟')) return;
    await fetch('/api/admin/tools/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchAdminTools();
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUsername, password: adminPassword, email: adminEmail })
    });
    const data = await res.json();
    if (data.success) showToast('تم تحديث البيانات بنجاح');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('تم النسخ إلى الحافظة بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRequestProgress(0);
    
    // Progress simulation
    const progressInterval = setInterval(() => {
      setRequestProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      if (activeTool === 'analyzer') {
        const fetchRes = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: analyzerUrl })
        });
        const fetchData = await fetchRes.json();
        if (!fetchRes.ok) {
          showToast(fetchData.error || 'فشل جلب محتوى الرابط', 'error');
          setLoading(false);
          clearInterval(progressInterval);
          return;
        }

        const res = await fetch('/api/seo-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            deviceId, 
            tool: activeTool,
            html: fetchData.html,
            stats: fetchData.stats
          })
        });
        let data = await res.json();
        
        if (data.use_client) {
          const aiConfig = { model: data.model, apiKey: data.apiKey };
          data = await analyzeSeoUrl(fetchData.html, aiConfig, fetchData.stats);
        }

        clearInterval(progressInterval);
        setRequestProgress(100);
        setToolResults(prev => ({ ...prev, [activeTool]: data }));
        setLoading(false);
        fetchUsageStats();
        return;
      }

      const res = await fetch('/api/seo-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          deviceId, 
          topic: activeTool === 'keywords' ? keywordsInput : 
                 activeTool === 'backlink' ? backlinkUrl : 
                 activeTool === 'plagiarism' ? plagiarismText : 
                 activeTool === 'paraphraser' ? paraphraseInput.replace(/<[^>]*>/g, ' ').trim() : topic, 
          tool: activeTool,
          country: selectedCountry,
          title: metaTitle || analyzerTitle,
          description: metaDesc || analyzerDesc
        })
      });
      let data = await res.json();
      
      // If backend says use client (for Gemini)
      if (data.use_client) {
        const aiConfig = { model: data.model, apiKey: data.apiKey };
        const topicToUse = activeTool === 'keywords' ? keywordsInput : 
                           activeTool === 'backlink' ? backlinkUrl : 
                           activeTool === 'plagiarism' ? plagiarismText : 
                           activeTool === 'paraphraser' ? paraphraseInput.replace(/<[^>]*>/g, ' ').trim() : topic;

        if (activeTool === 'writer') {
          data = await generateArticle(topicToUse, aiConfig);
          // Save article to backend
          await fetch('/api/save-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, title: data.seo_title, content: JSON.stringify(data) })
          });
        } else if (activeTool === 'keywords') {
          data = await analyzeKeywords(topicToUse, selectedCountry, aiConfig);
        } else if (activeTool === 'meta') {
          data = await generateMetaTags(metaTitle || analyzerTitle, metaDesc || analyzerDesc, aiConfig);
        } else if (activeTool === 'backlink') {
          data = await analyzeBacklinks(topicToUse, aiConfig);
        } else if (activeTool === 'plagiarism') {
          data = await checkPlagiarism(topicToUse, aiConfig);
        } else if (activeTool === 'paraphraser') {
          data = await paraphraseText(topicToUse, aiConfig);
          if (!data || !data.paraphrased_text) {
            throw new Error("فشل الحصول على نص معاد صياغته");
          }
          setParaphraseResult(data);
        } else {
          // Custom tools
          const toolData = adminTools.find(t => t.slug === activeTool);
          data = await runCustomTool(topicToUse, toolData?.system_instruction || "", aiConfig);
        }
      }

      clearInterval(progressInterval);
      setRequestProgress(100);

      if (!res.ok) {
        setToolResults(prev => ({ ...prev, [activeTool]: { error: data.error } }));
        if (res.status === 403 && data.error?.includes('جهاز آخر')) {
          handleLogout();
        }
        return;
      }

      setToolResults(prev => ({ ...prev, [activeTool]: data }));
      fetchUsageStats();
      
      if (activeTool === 'writer') {
        fetchUserArticles();
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      setToolResults(prev => ({ ...prev, [activeTool]: { error: 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.' } }));
    } finally {
      setLoading(false);
    }
  };

  const AdSlot = ({ location, className }: { location: string, className?: string }) => {
    const ad = publicAds.find(a => a.location === location);
    if (!ad || !ad.is_active) return null;

    return (
      <div className={cn("my-8 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-center", className)}>
        {ad.type === 'code' ? (
          <div dangerouslySetInnerHTML={{ __html: ad.content }} />
        ) : (
          <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <img src={ad.content} alt="Advertisement" className="w-full h-auto object-contain mx-auto" />
          </a>
        )}
      </div>
    );
  };

  const renderRemainingAttempts = (toolSlug: string) => {
    if (!usageStats) return null;
    const limitKey = `${toolSlug}_${usageStats.plan}_limit`;
    const limit = parseInt(usageStats.limits[limitKey] || '0');
    const used = usageStats.usage.find(u => u.tool_slug === toolSlug)?.count || 0;
    const remaining = Math.max(0, limit - used);

    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-2xl border border-zinc-100">
        <Activity className={cn("w-4 h-4", remaining <= 0 ? "text-red-500" : "text-indigo-600")} />
        <span className="text-sm font-bold text-zinc-600">
          المحاولات المتبقية: <span className={cn("font-black", remaining <= 0 ? "text-red-600" : "text-indigo-600")}>{remaining}</span>
        </span>
      </div>
    );
  };

  const renderToolContent = () => {
    if (!isAdminMode && !isLoggedIn) {
      let plans = [];
      let features = [];
      try {
        plans = JSON.parse(landingSettings.landing_plans_json || '[]');
        features = JSON.parse(landingSettings.landing_features_json || '[]');
      } catch (e) {
        console.error('Failed to parse landing JSON', e);
      }

      return (
        <div className="min-h-screen bg-white font-sans text-right" dir="rtl">
          {/* Navigation */}
          <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-zinc-100">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Sparkles className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-black text-zinc-900 tracking-tighter">GARDIO</span>
              </div>
              
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm font-bold text-zinc-500 hover:text-indigo-600 transition-colors">الأدوات</a>
                <a href="#about" className="text-sm font-bold text-zinc-500 hover:text-indigo-600 transition-colors">عن الموقع</a>
                <a href="#plans" className="text-sm font-bold text-zinc-500 hover:text-indigo-600 transition-colors">الخطط</a>
                <a href="#contact" className="text-sm font-bold text-zinc-500 hover:text-indigo-600 transition-colors">اتصل بنا</a>
              </div>

              <div className="flex items-center gap-4">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const loginSection = document.getElementById('login');
                    loginSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 cursor-pointer"
                >
                  دخول المشتركين
                </motion.button>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="pt-40 pb-20 px-6">
            <div className="max-w-7xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black animate-bounce">
                <Sparkles className="w-4 h-4" />
                أدوات السيو المدعومة بالذكاء الاصطناعي
              </div>
              <h1 className="text-5xl md:text-8xl font-black text-zinc-900 leading-[1.1] tracking-tight">
                {landingSettings.landing_hero_title || 'استخدم قوة الذكاء الاصطناعي'} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-600 to-violet-500">لتحسين ترتيب موقعك</span>
              </h1>
              <p className="text-xl text-zinc-500 leading-relaxed max-w-3xl mx-auto font-medium">
                {landingSettings.landing_hero_desc || 'منصة GARDIO توفر لك أحدث الأدوات الذكية لإنشاء محتوى متوافق مع السيو، تحليل الكلمات المفتاحية، وتصدر نتائج البحث بكل سهولة.'}
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full md:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 cursor-pointer"
                >
                  ابدأ الآن مجاناً <ChevronRight className="w-6 h-6 rotate-180" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full md:w-auto bg-zinc-100 text-zinc-600 px-10 py-5 rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  استكشف الأدوات
                </motion.button>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-24 bg-zinc-50">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16 space-y-4">
                <h2 className="text-4xl font-black text-zinc-900">أهم ما نقدمه من أدوات</h2>
                <p className="text-zinc-500 font-medium">مجموعة متكاملة من الأدوات الذكية لتطوير موقعك</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(landingSettings.landing_tools && landingSettings.landing_tools.length > 0) ? (
                  landingSettings.landing_tools.map((tool: any, i: number) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm hover:shadow-xl transition-all group"
                    >
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {tool.slug === 'writer' ? <PenTool className="w-8 h-8 text-indigo-600" /> : 
                         tool.slug === 'keywords' ? <Search className="w-8 h-8 text-indigo-600" /> :
                         tool.slug === 'meta' ? <Tags className="w-8 h-8 text-indigo-600" /> :
                         tool.slug === 'backlink' ? <History className="w-8 h-8 text-indigo-600" /> :
                         <Wand2 className="w-8 h-8 text-indigo-600" />}
                      </div>
                      <h3 className="text-xl font-black text-zinc-900 mb-3">{tool.name}</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                        {tool.slug === 'writer' ? 'توليد مقالات حصرية متوافقة مع السيو في ثوانٍ.' :
                         tool.slug === 'keywords' ? 'معرفة حجم البحث وصعوبة المنافسة بدقة.' :
                         tool.slug === 'meta' ? 'توليد عناوين وأوصاف تجذب الزوار ومحركات البحث.' :
                         tool.slug === 'backlink' ? 'تحليل الروابط الخلفية لموقعك ومنافسيك.' :
                         'أداة ذكية مخصصة لتحسين أداء موقعك.'}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  features.map((feat: any, i: number) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm hover:shadow-xl transition-all group"
                    >
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {i === 0 ? <PenTool className="w-8 h-8 text-indigo-600" /> : 
                         i === 1 ? <Search className="w-8 h-8 text-indigo-600" /> :
                         i === 2 ? <Tags className="w-8 h-8 text-indigo-600" /> :
                         <BarChart3 className="w-8 h-8 text-indigo-600" />}
                      </div>
                      <h3 className="text-xl font-black text-zinc-900 mb-3">{feat.title}</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed font-medium">{feat.desc}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-6">
            <AdSlot location="landing_middle" />
          </div>

          {/* About Section */}
          <section id="about" className="py-24">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <h2 className="text-4xl font-black text-zinc-900">عن منصة GARDIO</h2>
                <p className="text-xl text-zinc-500 leading-relaxed font-medium">
                  {landingSettings.landing_about_text || 'نحن نقدم مجموعة متكاملة من الأدوات التي تساعد أصحاب المواقع والمدونين على تحسين ترتيب مواقعهم باستخدام أحدث تقنيات الذكاء الاصطناعي.'}
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-3xl font-black text-indigo-600">+10k</div>
                    <div className="text-sm font-bold text-zinc-400 uppercase">مقال تم توليده</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-black text-indigo-600">+500</div>
                    <div className="text-sm font-bold text-zinc-400 uppercase">مستخدم نشط</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="aspect-square bg-zinc-100 rounded-[3rem] relative overflow-hidden">
                  <img 
                    src={landingSettings.landing_about_image || "https://picsum.photos/seed/seo/800/800"} 
                    alt="SEO Analysis" 
                    className="w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/20 to-transparent"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Plans Section */}
          <section id="plans" className="py-24 bg-zinc-900 text-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16 space-y-4">
                <h2 className="text-4xl font-black">خطط الاشتراك</h2>
                <p className="text-zinc-400 font-medium">اختر الخطة المناسبة لاحتياجاتك</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {plans.map((plan: any, i: number) => (
                  <div key={i} className={cn(
                    "p-10 rounded-[3rem] border transition-all relative overflow-hidden group",
                    plan.type === 'paid' ? "bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-900/20" : "bg-zinc-800 border-zinc-700"
                  )}>
                    {plan.type === 'paid' && (
                      <div className="absolute top-6 left-6 bg-white text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">الأكثر طلباً</div>
                    )}
                    <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mb-8">
                      <span className="text-5xl font-black">${plan.price}</span>
                      <span className="text-zinc-400 font-bold">/شهرياً</span>
                    </div>
                    <ul className="space-y-4 mb-10">
                      {plan.features.map((f: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-3 text-sm font-bold">
                          <CheckCircle2 className={cn("w-5 h-5", plan.type === 'paid' ? "text-indigo-200" : "text-indigo-500")} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (plan.type === 'free') {
                          document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          window.open(`https://wa.me/${globalSettings.whatsapp_number}?text=${encodeURIComponent('أريد الاشتراك في الخطة الاحترافية')}`, '_blank');
                        }
                      }}
                      className={cn(
                        "w-full py-5 rounded-2xl font-black text-lg transition-all cursor-pointer",
                        plan.type === 'paid' ? "bg-white text-indigo-600 hover:bg-zinc-100" : "bg-zinc-700 text-white hover:bg-zinc-600"
                      )}
                    >
                      {plan.type === 'paid' ? 'اشترك الآن' : 'ابدأ مجاناً'}
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Login Section */}
          <section id="login" className="py-24">
            <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
              <div className="bg-white p-10 md:p-16 rounded-[3rem] border border-zinc-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] w-full max-w-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-150 duration-1000"></div>
                
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-10 mx-auto shadow-2xl shadow-indigo-200 rotate-6 group-hover:rotate-0 transition-all duration-500">
                    <Lock className="w-10 h-10 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-black text-zinc-900 mb-3 text-center">دخول المشتركين</h2>
                  <p className="text-zinc-500 font-medium mb-10 text-center">أدخل التوكن الخاص بك للبدء في استخدام الأدوات</p>

                  <form onSubmit={handleLogin} className="space-y-8 text-right">
                    <div className="space-y-3">
                      <label className="block text-sm font-extrabold text-zinc-800 mr-2 uppercase tracking-wider">توكن الاشتراك</label>
                      <div className="relative">
                        <Key className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
                        <input 
                          type="password" 
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="GARDIO-xxxx..."
                          className="w-full pr-14 pl-6 py-5 rounded-2xl border-2 border-zinc-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all bg-zinc-50/30 text-lg font-bold placeholder:text-zinc-300"
                          required
                        />
                      </div>
                    </div>
                    
                    {loginError && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-3 animate-shake">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {loginError}
                      </div>
                    )}

                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 text-lg cursor-pointer"
                    >
                      دخول للمنصة <ChevronRight className="w-6 h-6 rotate-180" />
                    </motion.button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-24 bg-zinc-50">
            <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
              <h2 className="text-4xl font-black text-zinc-900">تواصل معنا للاشتراك</h2>
              <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">
                {landingSettings.landing_contact_info || 'للاشتراك أو الاستفسار، تواصل معنا عبر الواتساب أو البريد الإلكتروني.'}
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <a 
                  href={`https://wa.me/${globalSettings.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all w-full md:w-auto"
                >
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-400 uppercase">واتساب</div>
                    <div className="text-lg font-black text-zinc-900" dir="ltr">+{globalSettings.whatsapp_number}</div>
                  </div>
                </a>
                <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all w-full md:w-auto">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-400 uppercase">البريد الإلكتروني</div>
                    <div className="text-lg font-black text-zinc-900">support@gardio.com</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t border-zinc-100">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                  <Sparkles className="text-white w-4 h-4" />
                </div>
                <span className="text-xl font-black text-zinc-900 tracking-tighter">GARDIO</span>
              </div>
              <p className="text-sm font-bold text-zinc-400">© 2026 GARDIO SEO AI. جميع الحقوق محفوظة.</p>
              <button 
                onClick={() => setIsAdminMode(true)}
                className="text-xs font-bold text-zinc-300 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                دخول الإدارة
              </button>
            </div>
          </footer>
        </div>
      );
    }

    if (isAdminMode) {
      switch (adminPage) {
        case 'overview':
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Users /></div>
                  <div>
                    <p className="text-sm text-zinc-500">إجمالي المستخدمين</p>
                    <p className="text-2xl font-bold">{adminStats?.users || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Key /></div>
                  <div>
                    <p className="text-sm text-zinc-500">التوكنات النشطة</p>
                    <p className="text-2xl font-bold">{adminStats?.activeTokens || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl text-red-600"><AlertCircle /></div>
                  <div>
                    <p className="text-sm text-zinc-500">التوكنات غير النشطة</p>
                    <p className="text-2xl font-bold">{adminStats?.inactiveTokens || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 'tokens':
          return (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="font-bold mb-4">إنشاء توكن جديد لمستخدم</h3>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleGenerateToken(String(formData.get('username')), Number(formData.get('days')), String(formData.get('type')));
                  }} 
                  className="flex gap-4 items-end"
                >
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500 mb-1">اسم المستخدم</label>
                    <input name="username" type="text" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none" placeholder="أدخل اسم المستخدم بدقة" required />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-zinc-500 mb-1">النوع</label>
                    <select name="type" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none" required>
                      <option value="paid">مدفوع</option>
                      <option value="free">مجاني</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-zinc-500 mb-1">المدة (أيام)</label>
                    <input name="days" type="number" defaultValue="30" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none" required />
                  </div>
                  <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">إنشاء</button>
                </form>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="p-4 font-bold">التوكن</th>
                      <th className="p-4 font-bold">المستخدم</th>
                      <th className="p-4 font-bold">النوع</th>
                      <th className="p-4 font-bold">الاستخدام</th>
                      <th className="p-4 font-bold">تاريخ الانتهاء</th>
                      <th className="p-4 font-bold">الحالة</th>
                      <th className="p-4 font-bold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminTokens.map(t => (
                      <tr key={t.id} className="border-b border-zinc-100">
                        <td className="p-4 font-mono text-xs">{t.token}</td>
                        <td className="p-4">{t.user_name || 'غير محدد'}</td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                            t.type === 'paid' ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"
                          )}>
                            {t.type === 'paid' ? 'مدفوع' : 'مجاني'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-zinc-900">{t.usage_count || 0} طلب</span>
                            <div className="w-16 h-1 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500" 
                                style={{ 
                                  width: `${Math.min(100, ((t.usage_count || 0) / (t.type === 'paid' ? (parseInt(globalSettings.paid_plan_usage_limit) || 1000) : (parseInt(globalSettings.free_plan_usage_limit) || 5))) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs">{new Date(t.expiry_date).toLocaleDateString('ar-EG')}</td>
                        <td className="p-4">
                          <button 
                            onClick={() => handleToggleToken(t.id, t.status)}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              t.status === 'active' ? "text-green-600 bg-green-50" : "text-zinc-400 bg-zinc-50"
                            )}
                            title={t.status === 'active' ? "تعطيل التوكن" : "تفعيل التوكن"}
                          >
                            {t.status === 'active' ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                          </button>
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => handleDeleteToken(t.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="حذف التوكن"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        case 'articles':
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-black mb-6">سجل المقالات المولدة</h2>
              <div className="grid grid-cols-1 gap-4">
                {adminArticles.map(a => (
                  <motion.div 
                    key={a.id} 
                    whileHover={{ scale: 1.01 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-xl text-zinc-900 mb-1">{a.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-zinc-400 font-bold">
                          <span className="flex items-center gap-1"><User className="w-4 h-4" /> {a.username}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(a.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(a.content);
                            setViewingArticle({ ...a, parsed });
                          } catch(e) {
                            showToast('فشل تحميل المقال', 'error');
                          }
                        }}
                        className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                        title="عرض المقال"
                      >
                        <Eye className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="line-clamp-2 text-zinc-500 font-medium leading-relaxed" dir="rtl">
                      {(() => {
                        try {
                          const parsed = JSON.parse(a.content);
                          return typeof parsed.content === 'string' ? parsed.content : 'محتوى غير صالح';
                        } catch(e) {
                          return 'محتوى غير صالح';
                        }
                      })()}
                    </div>
                  </motion.div>
                ))}
              </div>
              {adminArticles.length === 0 && (
                <div className="text-center py-20 bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200">
                  <FileText className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-400 font-bold">لا يوجد مقالات مولدة بعد</p>
                </div>
              )}
            </div>
          );
        case 'tools':
          return (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-1000"></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <PlusCircle className="text-indigo-600" />
                    إضافة أداة جديدة
                  </h3>
                  <form onSubmit={(e) => handleAddTool(e, false)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="اسم الأداة (مثلاً: كاتب وصف يوتيوب)"
                        value={newToolName}
                        onChange={e => setNewToolName(e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold"
                        required
                      />
                      <input 
                        type="text" 
                        placeholder="slug (e.g. youtube-desc)"
                        value={newToolSlug}
                        onChange={e => setNewToolSlug(e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-3">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-zinc-900 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        إضافة يدوية
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={(e) => handleAddTool(e as any, true)}
                        disabled={loading || !newToolName}
                        className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        إنشاء بالذكاء الاصطناعي
                      </motion.button>
                    </div>
                    {loading && creationProgress > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <span>جاري التحليل والإنشاء...</span>
                          <span>{Math.round(creationProgress)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${creationProgress}%` }}
                            className="h-full bg-indigo-600"
                          />
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminTools.map(tool => (
                  <motion.div 
                    layout
                    key={tool.id} 
                    className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-lg text-zinc-900">{tool.name}</h3>
                        <p className="text-xs font-mono text-zinc-400">{tool.slug}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleToggleTool(tool.id, tool.is_active)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            tool.is_active ? "text-green-600 bg-green-50" : "text-zinc-400 bg-zinc-50"
                          )}
                          title={tool.is_active ? "تعطيل الأداة" : "تفعيل الأداة"}
                        >
                          {tool.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                        </button>
                        <button 
                          onClick={() => handleToggleLanding(tool.id, tool.show_on_landing)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            tool.show_on_landing ? "text-indigo-600 bg-indigo-50" : "text-zinc-400 bg-zinc-50"
                          )}
                          title={tool.show_on_landing ? "إخفاء من الرئيسية" : "إظهار في الرئيسية"}
                        >
                          <LayoutDashboard className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTool(tool.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                          title="حذف الأداة"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-50">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase">حد المجاني</label>
                        <input 
                          type="number"
                          value={globalSettings[`${tool.slug}_free_limit`] || '0'}
                          onChange={(e) => {
                            const newSettings = { ...globalSettings, [`${tool.slug}_free_limit`]: e.target.value };
                            setGlobalSettings(newSettings);
                            updateGlobalSettings(newSettings);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-100 text-xs font-bold outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase">حد المدفوع</label>
                        <input 
                          type="number"
                          value={globalSettings[`${tool.slug}_paid_limit`] || '0'}
                          onChange={(e) => {
                            const newSettings = { ...globalSettings, [`${tool.slug}_paid_limit`]: e.target.value };
                            setGlobalSettings(newSettings);
                            updateGlobalSettings(newSettings);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-100 text-xs font-bold outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-50 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">متاحة في:</span>
                      <div className="flex bg-zinc-50 p-1 rounded-xl">
                        {['free', 'paid', 'both'].map((p) => (
                          <button
                            key={p}
                            onClick={() => handleUpdateToolPlan(tool.id, p)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                              tool.plan_type === p ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                            )}
                          >
                            {p === 'free' ? 'المجانية' : p === 'paid' ? 'المدفوعة' : 'الكل'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        case 'landing':
          return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xl font-bold">إعدادات الصفحة الهبوط (Landing Page)</h3>
                  <button 
                    onClick={() => updateLandingSettings(landingSettings)}
                    className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    حفظ التعديلات
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">عنوان الهيرو (Hero Title)</label>
                    <input 
                      type="text" 
                      value={landingSettings.landing_hero_title || ''}
                      onChange={(e) => setLandingSettings({...landingSettings, landing_hero_title: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">وصف الهيرو (Hero Description)</label>
                    <textarea 
                      rows={3}
                      value={landingSettings.landing_hero_desc || ''}
                      onChange={(e) => setLandingSettings({...landingSettings, landing_hero_desc: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-zinc-700">رابط صورة "عن الموقع" (About Image URL)</label>
                    <div className="flex gap-4">
                      <input 
                        type="text" 
                        value={landingSettings.landing_about_image || ''}
                        onChange={(e) => setLandingSettings({...landingSettings, landing_about_image: e.target.value})}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500"
                      />
                      {landingSettings.landing_about_image && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200">
                          <img src={landingSettings.landing_about_image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-zinc-700">نص "عن الموقع" (About Text)</label>
                    <textarea 
                      rows={4}
                      value={landingSettings.landing_about_text || ''}
                      onChange={(e) => setLandingSettings({...landingSettings, landing_about_text: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-zinc-700">معلومات التواصل (Contact Info)</label>
                    <textarea 
                      rows={2}
                      value={landingSettings.landing_contact_info || ''}
                      onChange={(e) => setLandingSettings({...landingSettings, landing_contact_info: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 flex items-center justify-between">
                      الخطط (JSON Format)
                      <span className="text-[10px] text-zinc-400 font-normal">[{'{'} "name": "...", "price": "...", "features": ["..."], "type": "free|paid" {'}'}]</span>
                    </label>
                    <textarea 
                      rows={8}
                      value={landingSettings.landing_plans_json || ''}
                      onChange={(e) => setLandingSettings({...landingSettings, landing_plans_json: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 flex items-center justify-between">
                      المميزات (JSON Format)
                      <span className="text-[10px] text-zinc-400 font-normal">[{'{'} "title": "...", "desc": "..." {'}'}]</span>
                    </label>
                    <textarea 
                      rows={8}
                      value={landingSettings.landing_features_json || ''}
                      onChange={(e) => setLandingSettings({...landingSettings, landing_features_json: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        case 'settings':
          return (
            <div className="space-y-6 max-w-xl">
              <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Settings className="text-indigo-600" />
                  إعدادات الذكاء الاصطناعي (AI)
                </h3>
                <form onSubmit={handleUpdateGlobalSettings} className="space-y-6">
                  <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-black text-zinc-700">المحرك النشط حالياً</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newSettings = { ...globalSettings, gemini_enabled: '1', openai_enabled: '1' };
                            setGlobalSettings(newSettings);
                            updateGlobalSettings(newSettings);
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase"
                        >
                          تفعيل الكل
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newSettings = { ...globalSettings, gemini_enabled: '0', openai_enabled: '0' };
                            setGlobalSettings(newSettings);
                            updateGlobalSettings(newSettings);
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase"
                        >
                          تعطيل الكل
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGlobalSettings({...globalSettings, active_ai_model: 'gemini'})}
                        className={cn(
                          "py-3 rounded-xl font-bold border-2 transition-all",
                          globalSettings.active_ai_model === 'gemini' 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                            : "border-zinc-200 bg-white text-zinc-400"
                        )}
                      >
                        Gemini (Google)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlobalSettings({...globalSettings, active_ai_model: 'openai'})}
                        className={cn(
                          "py-3 rounded-xl font-bold border-2 transition-all",
                          globalSettings.active_ai_model === 'openai' 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                            : "border-zinc-200 bg-white text-zinc-400"
                        )}
                      >
                        GPT (OpenAI)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-black text-zinc-700">إظهار اختيار المحرك للمستخدم</label>
                      <p className="text-[10px] text-zinc-400 font-bold">تفعيل هذا الخيار يتيح للمستخدم اختيار المحرك يدوياً</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGlobalSettings({...globalSettings, show_ai_selection: globalSettings.show_ai_selection === '1' ? '0' : '1'})}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        globalSettings.show_ai_selection === '1' ? "bg-indigo-600" : "bg-zinc-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        globalSettings.show_ai_selection === '1' ? "right-1" : "right-7"
                      )} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold">إعدادات Gemini</label>
                      <div className="flex gap-2">
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> الحصول على مفتاح
                        </a>
                        <button
                          type="button"
                          onClick={() => setGlobalSettings({...globalSettings, gemini_enabled: globalSettings.gemini_enabled === '1' ? '0' : '1'})}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all",
                            globalSettings.gemini_enabled === '1' ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-400"
                          )}
                        >
                          {globalSettings.gemini_enabled === '1' ? 'مفعل' : 'معطل'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400">اسم العرض للمستخدم</label>
                      <input 
                        type="text" 
                        value={globalSettings.gemini_display_name || ''}
                        onChange={e => setGlobalSettings({...globalSettings, gemini_display_name: e.target.value})}
                        placeholder="مثال: ذكاء اصطناعي 1 (Gemini)"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400">مفاتيح API (ضع كل مفتاح في سطر جديد للتدوير)</label>
                      <textarea 
                        rows={3}
                        value={globalSettings.gemini_api_key || ''}
                        onChange={e => setGlobalSettings({...globalSettings, gemini_api_key: e.target.value})}
                        placeholder="أدخل مفاتيح Gemini هنا..."
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold">إعدادات OpenAI (GPT)</label>
                      <div className="flex gap-2">
                        <a 
                          href="https://platform.openai.com/api-keys" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> الحصول على مفتاح
                        </a>
                        <button
                          type="button"
                          onClick={() => setGlobalSettings({...globalSettings, openai_enabled: globalSettings.openai_enabled === '1' ? '0' : '1'})}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all",
                            globalSettings.openai_enabled === '1' ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-400"
                          )}
                        >
                          {globalSettings.openai_enabled === '1' ? 'مفعل' : 'معطل'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400">اسم العرض للمستخدم</label>
                      <input 
                        type="text" 
                        value={globalSettings.openai_display_name || ''}
                        onChange={e => setGlobalSettings({...globalSettings, openai_display_name: e.target.value})}
                        placeholder="مثال: ذكاء اصطناعي 2 (OpenAI)"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400">مفاتيح API (ضع كل مفتاح في سطر جديد للتدوير)</label>
                      <textarea 
                        rows={3}
                        value={globalSettings.openai_api_key || ''}
                        onChange={e => setGlobalSettings({...globalSettings, openai_api_key: e.target.value})}
                        placeholder="أدخل مفاتيح OpenAI هنا..."
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-xl shadow-indigo-100 cursor-pointer">حفظ إعدادات المحركات</button>
                </form>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6">إعدادات الاشتراك والأسعار</h3>
                <form onSubmit={handleUpdateGlobalSettings} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">سعر الاشتراك الشهري ($)</label>
                    <input 
                      type="text" 
                      value={globalSettings.subscription_price || ''}
                      onChange={e => setGlobalSettings({...globalSettings, subscription_price: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">حد استخدام الخطة المجانية</label>
                      <input 
                        type="number" 
                        value={globalSettings.free_plan_usage_limit || ''}
                        onChange={e => setGlobalSettings({...globalSettings, free_plan_usage_limit: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">حد استخدام الخطة المدفوعة</label>
                      <input 
                        type="number" 
                        value={globalSettings.paid_plan_usage_limit || ''}
                        onChange={e => setGlobalSettings({...globalSettings, paid_plan_usage_limit: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">رقم الواتساب (بدون +)</label>
                    <input 
                      type="text" 
                      value={globalSettings.whatsapp_number || ''}
                      onChange={e => setGlobalSettings({...globalSettings, whatsapp_number: e.target.value})}
                      placeholder="مثال: 201234567890"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold cursor-pointer">حفظ إعدادات التواصل</button>
                </form>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6">تغيير بيانات الأدمن</h3>
                <form onSubmit={handleUpdateAdmin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم المستخدم</label>
                    <input 
                      type="text" 
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold cursor-pointer">حفظ بيانات الأدمن</button>
                </form>
              </div>
            </div>
          );
        case 'ads':
          return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-3xl font-black mb-8">إدارة الإعلانات</h2>
              <div className="grid grid-cols-1 gap-6">
                {adminAds.map(ad => (
                  <div key={ad.id} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-zinc-900">
                        {ad.location === 'header' && 'إعلان الهيدر (أعلى الموقع)'}
                        {ad.location === 'sidebar_bottom' && 'إعلان القائمة الجانبية (الأسفل)'}
                        {ad.location === 'tool_above_result' && 'إعلان فوق النتائج'}
                        {ad.location === 'tool_below_result' && 'إعلان تحت النتائج'}
                        {ad.location === 'landing_middle' && 'إعلان وسط صفحة الهبوط'}
                        {ad.location === 'writer_after_title' && 'كاتب المقالات: بعد العنوان'}
                        {ad.location === 'writer_after_meta' && 'كاتب المقالات: بعد الميتا'}
                        {ad.location === 'writer_after_content' && 'كاتب المقالات: بعد المحتوى'}
                        {ad.location === 'keywords_after_main' && 'الكلمات المفتاحية: بعد الإحصائيات'}
                        {ad.location === 'keywords_after_competition' && 'الكلمات المفتاحية: بعد المنافسة'}
                        {ad.location === 'keywords_after_difficulty' && 'الكلمات المفتاحية: بعد الصعوبة'}
                        {ad.location === 'keywords_after_short' && 'الكلمات المفتاحية: بعد الكلمات القصيرة'}
                        {ad.location === 'keywords_after_long' && 'الكلمات المفتاحية: بعد الكلمات الطويلة'}
                        {ad.location === 'keywords_after_competitors' && 'الكلمات المفتاحية: بعد تحليل المنافسين'}
                      </h3>
                      <button 
                        onClick={() => handleUpdateAd({...ad, is_active: ad.is_active ? 0 : 1})}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                          ad.is_active ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-400"
                        )}
                      >
                        {ad.is_active ? 'مفعل' : 'معطل'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-700">نوع الإعلان</label>
                        <select 
                          value={ad.type}
                          onChange={e => handleUpdateAd({...ad, type: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500"
                        >
                          <option value="code">كود مخصص (AdSense/HTML)</option>
                          <option value="image">صورة مع رابط</option>
                        </select>
                      </div>

                      {ad.type === 'image' && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-zinc-700">رابط التوجيه (Link)</label>
                          <input 
                            type="text" 
                            value={ad.link || ''}
                            onChange={e => handleUpdateAd({...ad, link: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500"
                            placeholder="https://example.com"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">
                        {ad.type === 'code' ? 'كود الإعلان (HTML/JS)' : 'رابط الصورة أو كود Base64'}
                      </label>
                      <textarea 
                        rows={5}
                        value={ad.content || ''}
                        onChange={e => handleUpdateAd({...ad, content: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-indigo-500 font-mono text-xs"
                        placeholder={ad.type === 'code' ? '<script>...</script>' : 'https://... or data:image/...'}
                      />
                    </div>

                    {ad.type === 'image' && ad.content && (
                      <div className="mt-4 p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">معاينة الصورة:</p>
                        <img src={ad.content} alt="Preview" className="max-h-32 rounded-lg mx-auto" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
      }
    }

    const currentToolData = adminTools.find(t => t.slug === activeTool);
    const result = toolResults[activeTool];

    if (currentToolData && !['writer', 'keywords', 'meta', 'analyzer', 'backlink', 'plagiarism'].includes(activeTool)) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Wand2 className="w-6 h-6" />
                </div>
                {currentToolData.name}
              </h2>
              {renderRemainingAttempts(activeTool)}
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-black text-zinc-700 mr-2">أدخل التفاصيل أو الموضوع</label>
                <textarea 
                  rows={4}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="اكتب هنا ما تريد من الأداة القيام به..."
                  className="w-full px-6 py-4 rounded-3xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg"
                  required
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-100 text-xl"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6" /> تنفيذ المهمة</>}
              </motion.button>
            </form>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm relative group"
              >
                <button 
                  onClick={() => handleCopy(result)}
                  className="absolute top-6 left-6 p-3 hover:bg-zinc-100 rounded-2xl transition-colors"
                  title="نسخ النتيجة"
                >
                  {copied ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6 text-zinc-400" />}
                </button>
                <div className="prose prose-zinc max-w-none text-right font-medium leading-relaxed" dir="rtl">
                  <Markdown>{result}</Markdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    switch (activeTool) {
      case 'writer':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
              {(isLoggedIn || isAdminMode) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-black flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <PenTool className="w-7 h-7" />
                    </div>
                    كاتب المقالات الذكي
                  </h2>
                  {renderRemainingAttempts('writer')}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-black text-zinc-700 mr-2">موضوع المقال</label>
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="مثال: أهمية تحسين محركات البحث في 2026"
                    className="w-full px-6 py-4 rounded-3xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg"
                    required
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-100 text-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6" /> توليد المقال</>}
                </motion.button>
              </form>

              {loading && (
                <div className="mt-8 space-y-3">
                  <div className="flex justify-between text-sm font-black text-zinc-400">
                    <span>جاري كتابة المقال...</span>
                    <span>{Math.round(requestProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${requestProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {result && result.content && (
              <div className="space-y-8">
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-2">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">قوة المقال</p>
                    <p className="text-4xl font-black text-indigo-600">{result.metrics?.strength}%</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-2">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">درجة السيو</p>
                    <p className="text-4xl font-black text-emerald-600">{result.metrics?.seo_score}%</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-2">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">عدد الكلمات</p>
                    <p className="text-4xl font-black text-zinc-900">{result.metrics?.word_count}</p>
                  </div>
                </div>

                {/* Title Section */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-zinc-900">العنوان المقترح</h3>
                    <button onClick={() => handleCopy(result.seo_title)} className="text-indigo-600 font-bold text-sm flex items-center gap-2 hover:underline cursor-pointer">
                      <Copy className="w-4 h-4" /> نسخ العنوان
                    </button>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 font-bold text-xl">{result.seo_title}</div>
                </div>

                <AdSlot location="writer_after_title" />

                {/* Description Section */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-zinc-900">وصف الميتا</h3>
                    <button onClick={() => handleCopy(result.seo_description)} className="text-indigo-600 font-bold text-sm flex items-center gap-2 hover:underline cursor-pointer">
                      <Copy className="w-4 h-4" /> نسخ الوصف
                    </button>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-zinc-600 font-medium leading-relaxed">{result.seo_description}</div>
                </div>

                <AdSlot location="writer_after_meta" />

                {/* Content Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm relative group"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-zinc-900">محتوى المقال</h3>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          setPlagiarismText(result.content);
                          setActiveTool('plagiarism');
                          setAutoSubmit(true);
                        }}
                        className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" /> فحص الحصرية
                      </button>
                      <button 
                        onClick={() => handleCopy(result.content)}
                        className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4" /> نسخ المقال
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-zinc max-w-none text-right font-medium leading-relaxed" dir="rtl">
                    <Markdown>{result.content}</Markdown>
                  </div>
                </motion.div>

                <AdSlot location="writer_after_content" />
              </div>
            )}

            {/* Saved Articles for User - Always Visible */}
            {userArticles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-zinc-900 mr-4">سجل مقالاتك السابقة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userArticles.map((art, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                      <div className="truncate max-w-[200px]">
                        <p className="font-bold text-zinc-900 truncate">{art.title}</p>
                        <p className="text-xs text-zinc-400 font-medium">{new Date(art.created_at).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <button 
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(art.content);
                            setToolResults(prev => ({ ...prev, writer: parsed }));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } catch(e) {
                            showToast('فشل تحميل المقال', 'error');
                          }
                        }}
                        className="p-2 bg-zinc-50 text-zinc-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'keywords':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
              {(isLoggedIn || isAdminMode) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-black flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Search className="w-7 h-7" />
                    </div>
                    فاحص الكلمات المفتاحية
                  </h2>
                  {renderRemainingAttempts('keywords')}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-zinc-700 mr-2">الكلمات المفتاحية</label>
                    <textarea 
                      value={keywordsInput}
                      onChange={(e) => setKeywordsInput(e.target.value)}
                      placeholder="مثال: سيو، تسويق الكتروني"
                      className="w-full px-6 py-4 rounded-3xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg h-32"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-zinc-700 mr-2">الدولة المستهدفة</label>
                    <select 
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full px-6 py-4 rounded-3xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg h-32 appearance-none bg-white"
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-100 text-xl"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><BarChart3 className="w-6 h-6" /> تحليل الكلمات</>}
                </motion.button>
              </form>

              {loading && (
                <div className="mt-8 space-y-3">
                  <div className="flex justify-between text-sm font-black text-zinc-400">
                    <span>جاري تحليل البيانات...</span>
                    <span>{Math.round(requestProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${requestProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {result?.analysis && (
              <div className="space-y-12">
                {result.analysis.map((item: any, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Keyword Title & Volume Card */}
                      <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full -mr-20 -mt-20 transition-transform group-hover:scale-110" />
                        <div className="relative">
                          <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                              <Search className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-3xl font-black text-zinc-900">{item.keyword}</h3>
                              <div className="flex items-center gap-2 text-zinc-400 font-bold text-sm">
                                <Users className="w-4 h-4" />
                                <span>المنافسة في {item.country || selectedCountry}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">حجم البحث الشهري</p>
                            <p className="text-5xl font-black text-indigo-600 tabular-nums">{item.volume}</p>
                          </div>
                        </div>
                        <div className="mt-10 pt-8 border-t border-zinc-50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            <span className="text-lg font-bold text-emerald-600">طلب متزايد</span>
                          </div>
                          <button 
                            onClick={() => handleCopy(item.keyword)}
                            className="p-3 hover:bg-zinc-50 rounded-xl transition-all text-zinc-400 hover:text-indigo-600"
                            title="نسخ الكلمة"
                          >
                            <Copy className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      {/* Difficulty Gauge Card */}
                      <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6 relative group">
                        <div className="relative inline-flex items-center justify-center">
                          <svg className="w-48 h-48 transform -rotate-90">
                            <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-zinc-50" />
                            <motion.circle 
                              initial={{ strokeDasharray: "0 502" }}
                              animate={{ strokeDasharray: `${(item.difficulty / 100) * 502} 502` }}
                              transition={{ duration: 2, ease: "easeOut" }}
                              cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" strokeLinecap="round" 
                              className={cn(
                                "transition-all duration-1000",
                                item.difficulty < 30 ? "text-emerald-400" : item.difficulty < 70 ? "text-yellow-400" : "text-red-400"
                              )}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-5xl font-black text-zinc-900">{item.difficulty}</span>
                            <span className="text-sm font-black text-zinc-400 uppercase tracking-widest">صعوبة الكلمة</span>
                          </div>
                        </div>
                        <div className={cn(
                          "px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                          item.difficulty < 30 ? "bg-emerald-50 text-emerald-600" : item.difficulty < 70 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                        )}>
                          {item.difficulty < 30 ? "فرصة ممتازة" : item.difficulty < 70 ? "منافسة متوسطة" : "منافسة شرسة"}
                        </div>
                      </div>

                      {/* Summary Card */}
                      <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm flex flex-col justify-center space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-xl font-black text-zinc-900">ملخص التحليل</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                              <span className="text-zinc-500 font-bold">سهولة التصدر</span>
                              <span className={cn("font-black", item.difficulty < 30 ? "text-emerald-600" : "text-zinc-900")}>
                                {100 - item.difficulty}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                              <span className="text-zinc-500 font-bold">عدد المنافسين</span>
                              <span className="font-black text-zinc-900">{item.competitors?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                              <span className="text-zinc-500 font-bold">الدولة</span>
                              <span className="font-black text-zinc-900">{item.country || selectedCountry}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <AdSlot location="keywords_after_main" />

                    {/* Suggestions Section - Two Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Short Tail Suggestions */}
                      <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-2xl font-black text-zinc-900 flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                              <Tags className="w-6 h-6" />
                            </div>
                            كلمات قصيرة
                          </h4>
                          <button 
                            onClick={() => handleCopy(item.short_tail_suggestions?.map((s: any) => s.keyword).join(', '))}
                            className="p-3 bg-zinc-50 hover:bg-indigo-50 text-zinc-400 hover:text-indigo-600 rounded-xl transition-all"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {item.short_tail_suggestions?.slice(0, 5).map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-zinc-100">
                              <span className="font-bold text-zinc-700">{s.keyword}</span>
                              <div className="flex items-center gap-4">
                                <span className={cn("text-xs font-black px-3 py-1 rounded-full", s.difficulty < 30 ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600")}>
                                  {s.difficulty}%
                                </span>
                                <button onClick={() => handleCopy(s.keyword)} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-indigo-600">
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {item.short_tail_suggestions?.length > 5 && (
                            <button 
                              onClick={() => setShowAllSuggestions({ type: 'short', data: item.short_tail_suggestions })}
                              className="w-full py-4 text-indigo-600 font-black text-sm hover:bg-indigo-50 rounded-2xl transition-all"
                            >
                              مشاهدة المزيد
                            </button>
                          )}
                        </div>
                      </div>

                      <AdSlot location="keywords_after_short" />

                      {/* Long Tail Suggestions */}
                      <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-2xl font-black text-zinc-900 flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                              <Sparkles className="w-6 h-6" />
                            </div>
                            كلمات طويلة (سهلة)
                          </h4>
                          <button 
                            onClick={() => handleCopy(item.long_tail_suggestions?.map((s: any) => s.keyword).join(', '))}
                            className="p-3 bg-zinc-50 hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 rounded-xl transition-all"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {item.long_tail_suggestions?.slice(0, 5).map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-zinc-100">
                              <span className="font-bold text-zinc-700">{s.keyword}</span>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black text-emerald-600 uppercase">سهولة:</span>
                                  <span className="text-xs font-black text-emerald-700">{100 - s.difficulty}%</span>
                                </div>
                                <button onClick={() => handleCopy(s.keyword)} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-indigo-600">
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {item.long_tail_suggestions?.length > 5 && (
                            <button 
                              onClick={() => setShowAllSuggestions({ type: 'long', data: item.long_tail_suggestions })}
                              className="w-full py-4 text-emerald-600 font-black text-sm hover:bg-emerald-50 rounded-2xl transition-all"
                            >
                              مشاهدة المزيد
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <AdSlot location="keywords_after_long" />

                    {/* Detailed Competitors Table */}
                    <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
                      <h4 className="text-2xl font-black text-zinc-900 mb-8 flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
                          <Users className="w-6 h-6" />
                        </div>
                        تحليل المنافسين (أول 10 نتائج)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right">
                          <thead>
                            <tr className="border-b border-zinc-100">
                              <th className="pb-6 font-black text-zinc-400 text-sm">الترتيب</th>
                              <th className="pb-6 font-black text-zinc-400 text-sm">الموقع</th>
                              <th className="pb-6 font-black text-zinc-400 text-sm">عدد الكلمات</th>
                              <th className="pb-6 font-black text-zinc-400 text-sm">قوة الصفحة</th>
                              <th className="pb-6 font-black text-zinc-400 text-sm">نقاط الضعف</th>
                              <th className="pb-6 font-black text-zinc-400 text-sm">رابط</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {item.competitors?.map((comp: any, i: number) => (
                              <tr key={i} className="group hover:bg-zinc-50 transition-colors">
                                <td className="py-6">
                                  <span className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-lg font-black text-zinc-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    {comp.rank || i + 1}
                                  </span>
                                </td>
                                <td className="py-6 font-bold text-zinc-900">{comp.name}</td>
                                <td className="py-6 font-mono text-zinc-500">{comp.word_count || 'غير معروف'}</td>
                                <td className="py-6">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden w-20">
                                      <div className="h-full bg-indigo-600" style={{ width: `${comp.strength}%` }} />
                                    </div>
                                    <span className="text-xs font-black text-zinc-400">{comp.strength}%</span>
                                  </div>
                                </td>
                                <td className="py-6">
                                  <div className="flex flex-wrap gap-1">
                                    {comp.weaknesses?.map((w: string, wi: number) => (
                                      <span key={wi} className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 rounded-md">
                                        {w}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-6">
                                  <a href={comp.url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-300 hover:text-indigo-600 transition-colors">
                                    <ExternalLink className="w-5 h-5" />
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <AdSlot location="keywords_after_competitors" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );
      case 'meta':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              {(isLoggedIn || isAdminMode) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Tags className="w-5 h-5 text-indigo-600" />
                    مولد الميتا تاج
                  </h2>
                  {renderRemainingAttempts('meta')}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">عنوان الصفحة</label>
                  <input 
                    type="text" 
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="مثال: خدمات السيو الاحترافية"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">وصف الصفحة</label>
                  <textarea 
                    value={metaDesc}
                    onChange={(e) => setMetaDesc(e.target.value)}
                    placeholder="اكتب وصفاً مختصراً لخدماتك..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-24"
                    required
                  />
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'توليد التاجات'}
                </button>
              </form>
            </div>

            <AdSlot location="tool_above_result" />

            {result?.seo_title && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 text-zinc-300 p-6 rounded-2xl font-mono text-sm overflow-x-auto relative group"
              >
                <button 
                  onClick={() => handleCopy(`
<title>${result.seo_title}</title>
<meta name="description" content="${result.seo_description}">
<meta name="keywords" content="${result.seo_keywords}">
<meta property="og:title" content="${result.og_tags?.title || result.seo_title}">
<meta property="og:description" content="${result.og_tags?.description || result.seo_description}">
                  `.trim())}
                  className="absolute top-4 left-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-zinc-500" />}
                </button>
                <div className="space-y-2">
                  <p className="text-indigo-400">&lt;title&gt;<span className="text-white">{result.seo_title}</span>&lt;/title&gt;</p>
                  <p className="text-indigo-400">&lt;meta <span className="text-emerald-400">name</span>="description" <span className="text-emerald-400">content</span>="<span className="text-white">{result.seo_description}</span>"&gt;</p>
                  <p className="text-indigo-400">&lt;meta <span className="text-emerald-400">name</span>="keywords" <span className="text-emerald-400">content</span>="<span className="text-white">{result.seo_keywords}</span>"&gt;</p>
                  <p className="text-zinc-500 mt-4">// Open Graph</p>
                  <p className="text-indigo-400">&lt;meta <span className="text-emerald-400">property</span>="og:title" <span className="text-emerald-400">content</span>="<span className="text-white">{result.og_tags?.title || result.seo_title}</span>"&gt;</p>
                  <p className="text-indigo-400">&lt;meta <span className="text-emerald-400">property</span>="og:description" <span className="text-emerald-400">content</span>="<span className="text-white">{result.og_tags?.description || result.seo_description}</span>"&gt;</p>
                </div>
              </motion.div>
            )}
          </div>
        );
      case 'analyzer':
        const analyzerResult = toolResults['analyzer'];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
              {(isLoggedIn || isAdminMode) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-black flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <BarChart3 className="w-7 h-7" />
                    </div>
                    محلل السيو البرمجي الاحترافي
                  </h2>
                  {renderRemainingAttempts('analyzer')}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-black text-zinc-700 mr-2">رابط المقالة للفحص (URL)</label>
                  <p className="text-[10px] text-zinc-400 mr-2 mb-2">ملاحظة: يقوم المحلل بفحص محتوى المقالة فقط ويتجاهل القوائم الجانبية والهيدر والفوتر لضمان دقة النتائج.</p>
                  <div className="relative">
                    <input 
                      type="url" 
                      value={analyzerUrl}
                      onChange={(e) => setAnalyzerUrl(e.target.value)}
                      placeholder="https://example.com/article-slug"
                      className="w-full px-6 py-5 pr-14 rounded-3xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg"
                      required
                    />
                    <Globe className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 w-6 h-6" />
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-100 text-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Activity className="w-6 h-6" /> تحليل السيو الآن</>}
                </motion.button>
              </form>

              {loading && (
                <div className="mt-8 space-y-3">
                  <div className="flex justify-between text-sm font-black text-zinc-400">
                    <span>جاري جلب وتحليل الصفحة...</span>
                    <span>{Math.round(requestProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${requestProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <AdSlot location="tool_above_result" />

            {analyzerResult && !analyzerResult.error && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Score Header */}
                <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center gap-10">
                  <div className="relative inline-flex items-center justify-center shrink-0">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-zinc-100" />
                      <motion.circle 
                        initial={{ strokeDasharray: "0 527" }}
                        animate={{ strokeDasharray: `${(analyzerResult.score / 100) * 527} 527` }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="16" fill="transparent" strokeLinecap="round" 
                        className={cn(
                          analyzerResult.score > 80 ? "text-emerald-500" : 
                          analyzerResult.score > 50 ? "text-amber-500" : "text-red-500"
                        )}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-5xl font-black text-zinc-900">{analyzerResult.score}</span>
                      <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">SEO Score</span>
                    </div>
                  </div>
                  <div className="space-y-4 text-center md:text-right">
                    <h3 className="text-3xl font-black text-zinc-900">نتيجة فحص السيو</h3>
                    <p className="text-zinc-500 font-medium text-lg leading-relaxed">
                      {analyzerResult.score > 80 ? "أداء ممتاز! صفحتك مهيأة بشكل جيد لمحركات البحث." : 
                       analyzerResult.score > 50 ? "أداء جيد، ولكن هناك بعض التحسينات الضرورية لرفع ترتيبك." : 
                       "تحتاج الصفحة إلى الكثير من العمل لتحسين ظهورها في نتائج البحث."}
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold text-zinc-600">{analyzerResult.content_stats?.reading_time} دقيقة قراءة</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold text-zinc-600">{analyzerResult.content_stats?.word_count} كلمة</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={cn(
                    "p-8 rounded-[2.5rem] border shadow-sm space-y-4",
                    analyzerResult.title?.isValid ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                  )}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-zinc-900 flex items-center gap-2">
                        <Tags className="w-5 h-5 text-indigo-600" />
                        عنوان الصفحة (Title)
                      </h4>
                      {analyzerResult.title?.isValid ? <CheckCircle2 className="text-emerald-600 w-6 h-6" /> : <AlertCircle className="text-red-600 w-6 h-6" />}
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-zinc-100 font-bold text-zinc-700">
                      {analyzerResult.title?.content || "غير موجود"}
                    </div>
                    <p className="text-sm font-medium text-zinc-600">{analyzerResult.title?.message}</p>
                  </div>

                  <div className={cn(
                    "p-8 rounded-[2.5rem] border shadow-sm space-y-4",
                    analyzerResult.description?.isValid ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                  )}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-zinc-900 flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-indigo-600" />
                        وصف الميتا (Meta Description)
                      </h4>
                      {analyzerResult.description?.isValid ? <CheckCircle2 className="text-emerald-600 w-6 h-6" /> : <AlertCircle className="text-red-600 w-6 h-6" />}
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-zinc-100 font-bold text-zinc-700 text-sm">
                      {analyzerResult.description?.content || "غير موجود"}
                    </div>
                    <p className="text-sm font-medium text-zinc-600">{analyzerResult.description?.message}</p>
                  </div>
                </div>

                {/* Headings Structure */}
                <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                      <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                      هيكلية الترويسات (Headings)
                    </h4>
                    <span className={cn(
                      "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      analyzerResult.headings?.structure_valid ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                      {analyzerResult.headings?.structure_valid ? "هيكل سليم" : "هيكل غير منظم"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600 font-black">
                        <span className="text-xs bg-indigo-50 px-2 py-1 rounded-md">H1</span>
                        <span>({analyzerResult.headings?.h1?.length || 0})</span>
                      </div>
                      <div className="space-y-2">
                        {analyzerResult.headings?.h1?.map((h: string, i: number) => (
                          <div key={i} className="p-3 bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 border border-zinc-100">{h}</div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-zinc-900 font-black">
                        <span className="text-xs bg-zinc-100 px-2 py-1 rounded-md">H2</span>
                        <span>({analyzerResult.headings?.h2?.length || 0})</span>
                      </div>
                      <div className="space-y-2">
                        {analyzerResult.headings?.h2?.slice(0, 5).map((h: string, i: number) => (
                          <div key={i} className="p-3 bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 border border-zinc-100">{h}</div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-zinc-400 font-black">
                        <span className="text-xs bg-zinc-50 px-2 py-1 rounded-md">H3</span>
                        <span>({analyzerResult.headings?.h3?.length || 0})</span>
                      </div>
                      <div className="space-y-2">
                        {analyzerResult.headings?.h3?.slice(0, 5).map((h: string, i: number) => (
                          <div key={i} className="p-3 bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 border border-zinc-100">{h}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Images & Links Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                      <Image className="w-6 h-6" />
                    </div>
                    <h5 className="font-black text-zinc-900">تحليل الصور</h5>
                    <div className="flex justify-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-black text-zinc-900">{analyzerResult.images?.total}</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">إجمالي</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-red-500">{analyzerResult.images?.missing_alt}</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">بدون Alt</div>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-zinc-500">{analyzerResult.images?.message}</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
                      <Link className="w-6 h-6" />
                    </div>
                    <h5 className="font-black text-zinc-900">تحليل الروابط</h5>
                    <div className="flex justify-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-black text-zinc-900">{analyzerResult.links?.internal}</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">داخلية</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-indigo-600">{analyzerResult.links?.external}</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">خارجية</div>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-zinc-500">توزيع جيد للروابط يساعد في تحسين الأرشفة.</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h5 className="font-black text-zinc-900">المعايير التقنية</h5>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 rounded-xl">
                        <span className="text-xs font-bold text-zinc-600">Viewport Tag</span>
                        {analyzerResult.technical?.viewport ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 rounded-xl">
                        <span className="text-xs font-bold text-zinc-600">Charset Tag</span>
                        {analyzerResult.technical?.charset ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-zinc-900 p-10 rounded-[3rem] text-white space-y-6">
                  <h4 className="text-2xl font-black flex items-center gap-3">
                    <Sparkles className="text-indigo-400" />
                    توصيات الخبراء للتحسين
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyzerResult.recommendations?.map((rec: string, i: number) => (
                      <div key={i} className="flex items-start gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                        <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-sm font-bold text-zinc-300">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );
      case 'plagiarism':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
              {(isLoggedIn || isAdminMode) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-black flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    فاحص المحتوى
                  </h2>
                  {renderRemainingAttempts('plagiarism')}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-black text-zinc-700 mr-2">نص المقال للفحص</label>
                  <textarea 
                    value={plagiarismText}
                    onChange={(e) => setPlagiarismText(e.target.value)}
                    placeholder="الصق نص المقال هنا لفحص مدى حصريته..."
                    className="w-full px-6 py-4 rounded-3xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg h-64"
                    required
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-100 text-xl"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Search className="w-6 h-6" /> فحص الحصرية</>}
                </motion.button>
              </form>

              {loading && (
                <div className="mt-8 space-y-3">
                  <div className="flex justify-between text-sm font-black text-zinc-400">
                    <span>جاري تحليل النص...</span>
                    <span>{Math.round(requestProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${requestProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {result && result.uniqueness !== undefined && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm text-center space-y-4"
                  >
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">نسبة الحصرية</p>
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-zinc-100" />
                        <motion.circle 
                          initial={{ strokeDasharray: "0 352" }}
                          animate={{ strokeDasharray: `${(result.uniqueness / 100) * 352} 352` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" strokeLinecap="round" 
                          className="text-emerald-500"
                        />
                      </svg>
                      <span className="absolute text-3xl font-black text-emerald-600">{result.uniqueness}%</span>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm text-center space-y-4"
                  >
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">نسبة الانتحال</p>
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-zinc-100" />
                        <motion.circle 
                          initial={{ strokeDasharray: "0 352" }}
                          animate={{ strokeDasharray: `${(result.plagiarism / 100) * 352} 352` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" strokeLinecap="round" 
                          className="text-red-500"
                        />
                      </svg>
                      <span className="absolute text-3xl font-black text-red-600">{result.plagiarism}%</span>
                    </div>
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900 p-10 rounded-[3rem] text-white"
                >
                  <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                    <AlertCircle className="text-indigo-400" />
                    خلاصة التحليل
                  </h3>
                  <p className="text-zinc-400 leading-relaxed text-lg font-medium">{result.summary}</p>
                </motion.div>
              </div>
            )}

            <AdSlot location="tool_below_result" />
          </div>
        );
      case 'paraphraser':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
              {(isLoggedIn || isAdminMode) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-black flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    أداة إعادة الصياغة المتقدمة
                  </h2>
                  {renderRemainingAttempts('paraphraser')}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mr-2">
                    <label className="block text-sm font-black text-zinc-700">النص الأصلي</label>
                    <span className="text-xs font-bold text-zinc-400">عدد الكلمات: {paraphraseInput.replace(/<[^>]*>/g, ' ').trim() ? paraphraseInput.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length : 0}</span>
                  </div>
                  <div className="quill-container">
                    <ReactQuill 
                      theme="snow"
                      value={paraphraseInput}
                      onChange={setParaphraseInput}
                      placeholder="أدخل النص الذي تريد إعادة صياغته هنا..."
                      className="bg-white rounded-3xl overflow-hidden border-2 border-zinc-100 focus-within:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-100 text-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6" /> إعادة الصياغة الآن</>}
                </motion.button>
              </form>

              {loading && (
                <div className="mt-8 space-y-3">
                  <div className="flex justify-between text-sm font-black text-zinc-400">
                    <span>جاري إعادة الصياغة...</span>
                    <span>{Math.round(requestProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${requestProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {paraphraseResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm relative">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-zinc-900">النص المطور</h3>
                      <span className="text-xs font-bold text-zinc-400">عدد الكلمات: {paraphraseResult?.paraphrased_text?.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length || 0}</span>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          setPlagiarismText(paraphraseResult?.paraphrased_text || '');
                          setActiveTool('plagiarism');
                        }}
                        className="p-3 bg-zinc-50 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-xl transition-all flex items-center gap-2"
                        title="فحص المقال"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-bold hidden md:inline">فحص المقال</span>
                      </button>
                      <button 
                        onClick={() => {
                          const text = paraphraseResult?.paraphrased_text || '';
                          const element = document.createElement("a");
                          const file = new Blob([text], {type: 'text/plain'});
                          element.href = URL.createObjectURL(file);
                          element.download = "paraphrased_text.txt";
                          document.body.appendChild(element);
                          element.click();
                        }}
                        className="p-3 bg-zinc-50 hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 rounded-xl transition-all"
                        title="تحميل النص"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleCopy(paraphraseResult?.paraphrased_text || '')}
                        className="p-3 bg-zinc-50 hover:bg-indigo-50 text-zinc-400 hover:text-indigo-600 rounded-xl transition-all"
                        title="نسخ النص"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 min-h-[200px] relative">
                    <div className="prose prose-zinc max-w-none text-right font-medium leading-relaxed" dir="rtl">
                      {paraphraseResult?.paraphrased_text?.split(' ').map((word: string, i: number) => {
                        const changed = paraphraseResult?.changed_words?.find((cw: any) => cw.modified === word.replace(/[.,!?;:]/g, ''));
                        if (changed) {
                          return (
                            <span 
                              key={i} 
                              className="bg-indigo-100 text-indigo-700 px-1 rounded cursor-pointer hover:bg-indigo-200 transition-colors relative group"
                              onClick={() => setSelectedSynonymWord(changed)}
                            >
                              {word}{' '}
                              <AnimatePresence>
                                {selectedSynonymWord === changed && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-3 z-50"
                                  >
                                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">مرادفات بديلة:</p>
                                    <div className="flex flex-col gap-1">
                                      {changed.synonyms.map((syn: string, si: number) => (
                                        <button 
                                          key={si}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newText = paraphraseResult.paraphrased_text.replace(word, syn);
                                            setParaphraseResult({ ...paraphraseResult, paraphrased_text: newText });
                                            setSelectedSynonymWord(null);
                                          }}
                                          className="text-right px-3 py-1.5 hover:bg-zinc-50 rounded-lg text-sm font-bold text-zinc-700 transition-colors"
                                        >
                                          {syn}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </span>
                          );
                        }
                        return <span key={i}>{word} </span>;
                      })}
                    </div>
                  </div>
                </div>

                {/* Diff Checker */}
                <div className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
                  <h3 className="text-xl font-black text-zinc-900 mb-6">مقارنة التغييرات</h3>
                  <div className="p-6 bg-zinc-900 rounded-[2rem] text-right" dir="rtl">
                    {(() => {
                      const dmp = new diff_match_patch();
                      const cleanInput = paraphraseInput.replace(/<[^>]*>/g, ' ');
                      const cleanResult = paraphraseResult?.paraphrased_text?.replace(/<[^>]*>/g, ' ') || '';
                      const diffs = dmp.diff_main(cleanInput, cleanResult);
                      dmp.diff_cleanupSemantic(diffs);
                      return diffs.map(([type, text], i) => {
                        if (type === 0) return <span key={i} className="text-zinc-400">{text}</span>;
                        if (type === 1) return <span key={i} className="text-emerald-400 bg-emerald-400/10 px-1 rounded">{text}</span>;
                        if (type === -1) return <span key={i} className="text-red-400 bg-red-400/10 px-1 rounded line-through">{text}</span>;
                        return null;
                      });
                    })()}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );
      case 'backlink':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
              {(isLoggedIn || isAdminMode) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Search className="w-6 h-6" />
                    </div>
                    تحليل الباك لينك الاحترافي
                  </h2>
                  {renderRemainingAttempts('backlink')}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-black text-zinc-700 mr-2">رابط الموقع (URL)</label>
                  <input 
                    type="url" 
                    value={backlinkUrl}
                    onChange={(e) => setBacklinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-6 py-4 rounded-3xl border-2 border-zinc-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg"
                    required
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-100 text-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><BarChart3 className="w-6 h-6" /> تحليل الروابط الخلفية</>}
                </motion.button>
              </form>
            </div>

            <AdSlot location="tool_above_result" />

            {result && !result.error && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">إجمالي الباك لينك</p>
                    <p className="text-5xl font-black text-indigo-600 tabular-nums">{result.total_backlinks?.toLocaleString()}</p>
                    <div className="flex justify-center">
                      <div className="w-12 h-1 bg-indigo-50 rounded-full"></div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">قوة الدومين (DR)</p>
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100" />
                        <motion.circle 
                          initial={{ strokeDasharray: "0 251" }}
                          animate={{ strokeDasharray: `${(result.domain_rating / 100) * 251} 251` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeLinecap="round" className="text-emerald-500" 
                        />
                      </svg>
                      <span className="absolute text-2xl font-black text-emerald-600">{result.domain_rating}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-400">Domain Rating</p>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm text-center space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">الدومينات المحيلة</p>
                    <p className="text-5xl font-black text-amber-600 tabular-nums">{result.referring_domains?.toLocaleString()}</p>
                    <div className="flex justify-center">
                      <div className="w-12 h-1 bg-amber-50 rounded-full"></div>
                    </div>
                    <p className="text-xs font-bold text-zinc-400">Referring Domains</p>
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <History className="w-5 h-5" />
                      </div>
                      قائمة الروابط الخلفية المكتشفة
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-2 bg-indigo-50 rounded-2xl text-xs font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">
                        {result.backlinks_list?.length} رابط مكتشف
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b border-zinc-100">
                          <th className="pb-4 font-black text-zinc-400 text-xs uppercase tracking-widest px-4">الموقع المصدر</th>
                          <th className="pb-4 font-black text-zinc-400 text-xs uppercase tracking-widest px-4">DR</th>
                          <th className="pb-4 font-black text-zinc-400 text-xs uppercase tracking-widest px-4">نص الرابط (Anchor)</th>
                          <th className="pb-4 font-black text-zinc-400 text-xs uppercase tracking-widest px-4">الصفحة المستهدفة</th>
                          <th className="pb-4 font-black text-zinc-400 text-xs uppercase tracking-widest px-4">النوع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {result.backlinks_list?.map((link: any, i: number) => (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={i} 
                            className="group hover:bg-zinc-50/50 transition-colors"
                          >
                            <td className="py-5 px-4">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold text-sm truncate max-w-[200px] block">
                                {link.url}
                              </a>
                            </td>
                            <td className="py-5 px-4">
                              <span className="font-black text-zinc-900 text-sm">{link.dr}</span>
                            </td>
                            <td className="py-5 px-4 font-bold text-zinc-600 text-sm">{link.anchor}</td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                                <ChevronRight className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{link.target_url || 'الصفحة الرئيسية'}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                link.type === 'dofollow' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-zinc-100 text-zinc-400"
                              )}>
                                {link.type}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-zinc-900 p-10 rounded-[3rem] text-white space-y-8 shadow-2xl shadow-zinc-200 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      ملخص التحليل الاستراتيجي
                    </h3>
                    <p className="text-zinc-400 leading-relaxed text-lg font-medium">{result.analysis_summary}</p>
                  </div>
                  <div className="pt-8 border-t border-white/10 relative z-10">
                    <h3 className="text-xl font-black mb-6">توصيات الخبراء للتحسين</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.recommendations?.map((rec: string, i: number) => (
                        <motion.div 
                          whileHover={{ x: -5 }}
                          key={i} 
                          className="flex items-start gap-4 bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className="w-6 h-6 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-bold text-zinc-200">{rec}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
                <AdSlot location="tool_below_result" />
              </motion.div>
            )}
          </div>
        );
    }
  };

  if (!isLoggedIn && !isAdminMode) {
    return (
      <div className="min-h-screen bg-white font-sans" dir="rtl">
        {toast && (
          <div className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 flex items-center gap-3",
            toast.type === 'success' ? "bg-zinc-900 text-white" : "bg-red-600 text-white"
          )}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        )}
        {renderToolContent()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans relative" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-zinc-200 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black text-zinc-900 tracking-tighter">GARDIO</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6 text-zinc-400" /> : <Menu className="w-6 h-6 text-zinc-400" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 flex items-center gap-3",
          toast.type === 'success' ? "bg-zinc-900 text-white" : "bg-red-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      {(isLoggedIn || (isAdminMode && adminData)) && (
        <aside className={cn(
          "fixed md:sticky top-0 right-0 h-screen bg-white border-l border-zinc-200 flex flex-col z-50 transition-all duration-500 overflow-hidden shadow-2xl md:shadow-none",
          isSidebarOpen ? "w-80 translate-x-0" : "w-0 md:w-20 -translate-x-full md:translate-x-0"
        )}>
          <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
            <div className={cn("flex items-center gap-4", !isSidebarOpen && "md:hidden")}>
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500",
                isAdminMode ? "bg-zinc-900 shadow-zinc-200 rotate-0" : "bg-indigo-600 shadow-indigo-100 rotate-3"
              )}>
                {isAdminMode ? <UserCog className="text-white w-6 h-6" /> : <LayoutDashboard className="text-white w-6 h-6" />}
              </div>
              <div>
                <h1 className="font-black text-2xl text-zinc-900 leading-none tracking-tighter">{isAdminMode ? 'لوحة التحكم' : 'GARDIO'}</h1>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">{isAdminMode ? 'Admin Dashboard' : 'SEO AI Platform'}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors hidden md:block cursor-pointer"
            >
              <Menu className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {isAdminMode && adminData ? (
              <>
                <button 
                  onClick={() => { setAdminPage('overview'); fetchAdminStats(); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm cursor-pointer",
                    adminPage === 'overview' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-100 translate-x-1" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                    !isSidebarOpen && "md:justify-center md:px-0"
                  )}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className={cn(!isSidebarOpen && "md:hidden")}>نظرة عامة</span>
                </button>
                <button 
                  onClick={() => { setAdminPage('tokens'); fetchAdminTokens(); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm cursor-pointer",
                    adminPage === 'tokens' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-100 translate-x-1" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                    !isSidebarOpen && "md:justify-center md:px-0"
                  )}
                >
                  <Key className="w-5 h-5" />
                  <span className={cn(!isSidebarOpen && "md:hidden")}>التوكنات</span>
                </button>
                <button 
                  onClick={() => { setAdminPage('articles'); fetchAdminArticles(); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm cursor-pointer",
                    adminPage === 'articles' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-100 translate-x-1" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                    !isSidebarOpen && "md:justify-center md:px-0"
                  )}
                >
                  <History className="w-5 h-5" />
                  <span className={cn(!isSidebarOpen && "md:hidden")}>المقالات</span>
                </button>
                <button 
                  onClick={() => { setAdminPage('tools'); fetchAdminTools(); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm cursor-pointer",
                    adminPage === 'tools' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-100 translate-x-1" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                    !isSidebarOpen && "md:justify-center md:px-0"
                  )}
                >
                  <Settings className="w-5 h-5" />
                  <span className={cn(!isSidebarOpen && "md:hidden")}>الأدوات</span>
                </button>
                <button 
                  onClick={() => { setAdminPage('landing'); fetchSettings(); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm",
                    adminPage === 'landing' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-100 translate-x-1" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                    !isSidebarOpen && "md:justify-center md:px-0"
                  )}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className={cn(!isSidebarOpen && "md:hidden")}>الصفحة الرئيسية</span>
                </button>
                <button 
                  onClick={() => { setAdminPage('ads'); fetchAdminAds(); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm cursor-pointer",
                    adminPage === 'ads' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-100 translate-x-1" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                    !isSidebarOpen && "md:justify-center md:px-0"
                  )}
                >
                  <Image className="w-5 h-5" />
                  <span className={cn(!isSidebarOpen && "md:hidden")}>الإعلانات</span>
                </button>
                <div className="pt-6 mt-6 border-t border-zinc-100">
                  <button 
                    onClick={() => setAdminPage('settings')}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm",
                      adminPage === 'settings' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-100 translate-x-1" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                      !isSidebarOpen && "md:justify-center md:px-0"
                    )}
                  >
                    <UserCog className="w-5 h-5" />
                    <span className={cn(!isSidebarOpen && "md:hidden")}>بيانات الأدمن</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {adminTools.filter(t => t.is_active).map((tool) => (
                  <motion.button 
                    key={tool.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { 
                      setActiveTool(tool.slug as Tool); 
                      setParaphraseResult(null);
                      setParaphraseInput('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group font-bold text-sm cursor-pointer",
                      activeTool === tool.slug ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                      !isSidebarOpen && "md:justify-center md:px-0"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {tool.slug === 'writer' ? <PenTool className="w-5 h-5" /> :
                       tool.slug === 'keywords' ? <Search className="w-5 h-5" /> :
                       tool.slug === 'meta' ? <Tags className="w-5 h-5" /> :
                       tool.slug === 'analyzer' ? <BarChart3 className="w-5 h-5" /> :
                       tool.slug === 'backlink' ? <ExternalLink className="w-5 h-5" /> :
                       tool.slug === 'plagiarism' ? <ShieldCheck className="w-5 h-5" /> :
                       tool.slug === 'paraphraser' ? <Sparkles className="w-5 h-5" /> :
                       <Wand2 className="w-5 h-5" />}
                      <span className={cn(!isSidebarOpen && "md:hidden")}>{tool.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {usageStats && (
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-md",
                          !isSidebarOpen && "md:hidden",
                          (usageStats.limits[`${tool.slug}_${usageStats.plan}_limit`] - (usageStats.usage.find(u => u.tool_slug === tool.slug)?.count || 0)) <= 0 
                            ? "bg-red-100 text-red-600" 
                            : "bg-zinc-100 text-zinc-500"
                        )}>
                          {Math.max(0, (parseInt(usageStats.limits[`${tool.slug}_${usageStats.plan}_limit`] || '0') - (usageStats.usage.find(u => u.tool_slug === tool.slug)?.count || 0)))} محاولة
                        </span>
                      )}
                      <ChevronRight className={cn("w-4 h-4 transition-transform", activeTool === tool.slug ? "rotate-180 opacity-100" : "opacity-0 group-hover:opacity-100", !isSidebarOpen && "md:hidden")} />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </nav>

          <div className="p-6 border-t border-zinc-100">
            <AdSlot location="sidebar_bottom" className="mb-4" />
            {!isAdminMode && isLoggedIn && (
              <div className="space-y-4">
                <div className={cn(
                  "bg-indigo-600 p-4 rounded-2xl text-white transition-all duration-300",
                  !isSidebarOpen && "md:p-2 md:rounded-xl"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[10px] font-bold uppercase", !isSidebarOpen && "md:hidden")}>اشتراك نشط</span>
                    <button onClick={handleLogout} className={cn("p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer", !isSidebarOpen && "md:w-full md:flex md:justify-center")}>
                      <LogOut className={cn("w-3 h-3", !isSidebarOpen && "md:w-5 md:h-5")} />
                    </button>
                  </div>
                  <p className={cn("text-xs font-mono truncate opacity-80", !isSidebarOpen && "md:hidden")}>{token}</p>
                </div>
              </div>
            )}
            {isAdminMode && adminData && (
              <button 
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm cursor-pointer",
                  !isSidebarOpen && "md:justify-center md:px-0"
                )}
              >
                <LogOut className="w-5 h-5" />
                <span className={cn(!isSidebarOpen && "md:hidden")}>تسجيل الخروج</span>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full">
        <AdSlot location="header" className="mb-6" />
        {isAdminMode && !adminData ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <UserCog className="w-10 h-10 text-zinc-900" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">دخول الإدارة</h2>
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl w-full max-w-md">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="text-right">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">اسم المستخدم</label>
                  <input 
                    type="text" 
                    value={adminUsername}
                    onChange={e => setAdminUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none"
                    required
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">كلمة المرور</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none"
                    required
                  />
                </div>
                <button className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold cursor-pointer">دخول</button>
              </form>
              <button 
                onClick={() => setIsAdminMode(false)}
                className="mt-4 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                العودة للواجهة الرئيسية
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="mb-10 flex justify-between items-start">
              <div>
                {(isAdminMode || isLoggedIn) && (
                  <h2 className="text-3xl font-bold text-zinc-900 mb-2">
                    {isAdminMode ? (
                      adminPage === 'overview' ? 'نظرة عامة' :
                      adminPage === 'tokens' ? 'إدارة التوكنات' :
                      adminPage === 'articles' ? 'سجل المقالات' :
                      adminPage === 'tools' ? 'إعدادات الأدوات' : 'إعدادات الحساب'
                    ) : (
                      activeTool === 'writer' ? 'إنشاء محتوى متوافق مع السيو' : 
                      activeTool === 'keywords' ? 'تحليل الكلمات المفتاحية' : 
                      activeTool === 'meta' ? 'تحسين الميتا تاج' : 'محلل السيو البرمجي'
                    )}
                  </h2>
                )}
                <p className="text-zinc-500">
                  {isAdminMode ? 'تحكم في كافة تفاصيل المنصة والمشتركين.' : (isLoggedIn ? 'استخدم قوة الذكاء الاصطناعي لتحسين ترتيب موقعك في محركات البحث.' : '')}
                </p>
              </div>
              {isAdminMode && (
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-zinc-400 hover:text-red-600 transition-colors text-sm font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </button>
              )}
            </header>

            {toolResults[activeTool]?.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{toolResults[activeTool].error}</p>
              </div>
            )}

            {renderToolContent()}
          </>
        )}
      </main>
      {/* Admin Article View Modal */}
      <AnimatePresence>
        {viewingArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-zinc-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-full overflow-hidden rounded-[3rem] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 mb-1">{viewingArticle.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-zinc-400 font-bold">
                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> {viewingArticle.username}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(viewingArticle.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingArticle(null)}
                  className="p-4 hover:bg-zinc-200 rounded-2xl transition-all cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">قوة المقال</p>
                    <p className="text-4xl font-black text-indigo-600">{viewingArticle.parsed?.metrics?.strength || 0}%</p>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">SEO Score</p>
                    <p className="text-4xl font-black text-emerald-600">{viewingArticle.parsed?.metrics?.seo_score || 0}/100</p>
                  </div>
                  <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">عدد الكلمات</p>
                    <p className="text-4xl font-black text-zinc-900">{viewingArticle.parsed?.metrics?.word_count || 0}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <section>
                    <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">العنوان المقترح (SEO Title)</h4>
                    <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 font-bold text-lg relative group">
                      {viewingArticle.parsed?.seo_title}
                      <button 
                        onClick={() => handleCopy(viewingArticle.parsed?.seo_title)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">الوصف المقترح (Meta Description)</h4>
                    <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 font-bold relative group">
                      {viewingArticle.parsed?.seo_description}
                      <button 
                        onClick={() => handleCopy(viewingArticle.parsed?.seo_description)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">محتوى المقال</h4>
                    <div className="prose prose-zinc max-w-none bg-white p-8 rounded-3xl border border-zinc-100 shadow-inner relative group">
                      <button 
                        onClick={() => handleCopy(viewingArticle.parsed?.content)}
                        className="absolute left-4 top-4 p-2 bg-zinc-50 shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <Markdown>{viewingArticle.parsed?.content}</Markdown>
                    </div>
                  </section>
                </div>
              </div>
              <div className="p-8 border-t border-zinc-100 bg-zinc-50 flex justify-end">
                <button 
                  onClick={() => setViewingArticle(null)}
                  className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  إغلاق العرض
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Suggestions Modal */}
      <AnimatePresence>
        {showAllSuggestions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllSuggestions(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-2xl font-black text-zinc-900">
                  {showAllSuggestions.type === 'short' ? 'جميع الكلمات القصيرة' : 'جميع الكلمات الطويلة (السهلة)'}
                </h3>
                <button 
                  onClick={() => setShowAllSuggestions(null)}
                  className="p-3 hover:bg-zinc-100 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-3">
                {showAllSuggestions.data.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-zinc-50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-zinc-100">
                    <span className="font-bold text-zinc-700 text-lg">{s.keyword}</span>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-xs font-black px-4 py-1.5 rounded-full",
                        s.difficulty < 30 ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                      )}>
                        {showAllSuggestions.type === 'short' ? `${s.difficulty}%` : `سهولة: ${100 - s.difficulty}%`}
                      </span>
                      <button 
                        onClick={() => { handleCopy(s.keyword); }}
                        className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-8 bg-zinc-50 border-t border-zinc-100">
                <button 
                  onClick={() => handleCopy(showAllSuggestions.data.map(s => s.keyword).join(', '))}
                  className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                >
                  <Copy className="w-6 h-6" /> نسخ جميع الكلمات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
