import React, { useState, useEffect } from 'react';
import {
  Eye,
  Copy,
  Users,
  MessageSquare,
  Heart,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Shield,
  Trash2,
  Pin,
  RefreshCw,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  UserCheck,
  UserX,
  Code2,
  Check,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AnalyticsSummary, SiteSettings, CommunityPost, CommunityUser } from '../../types';
import { AnalyticsService } from '../../services/analyticsService';
import { CommunityService } from '../../services/communityService';
import { AuthService } from '../../services/authService';
import { copyTextToClipboard } from '../../utils/slugUtils';
import { useApp } from '../../context/AppContext';
import { AdminConfirmationModal, ConfirmationVariant } from './AdminConfirmationModal';

interface AdminAnalyticsTabProps {
  siteSettings: SiteSettings;
  onUpdateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const SUPABASE_SCHEMA_SQL = `-- =====================================================================
-- PROMBO WEB APPLICATION: FULL SUPABASE DATABASE SCHEMA & RLS POLICIES
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_banned BOOLEAN NOT NULL DEFAULT false,
  is_community_banned BOOLEAN NOT NULL DEFAULT false,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration columns for existing databases
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_community_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- 3. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial default settings if empty
INSERT INTO public.site_settings (key, value)
VALUES (
  'community_config',
  '{"communityEnabled": true, "allowGuestViewing": true, "requireAuthForComments": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. COMMUNITY POSTS TABLE
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_avatar TEXT,
  prompt_id TEXT,
  content TEXT NOT NULL,
  parent_id TEXT REFERENCES public.community_posts(id) ON DELETE CASCADE,
  likes_count INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. POST LIKES TABLE
CREATE TABLE IF NOT EXISTS public.post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 6. PAGE & PROMPT ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'prompt_copy', 'community_view', 'comment_created', 'like_toggle', 'custom')),
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_community_posts_parent ON public.community_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_prompt ON public.community_posts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.page_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON public.page_analytics(event_type);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_banned = false
  ) OR (COALESCE(auth.jwt() ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_user_banned()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_banned = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to all profiles" 
  ON public.profiles FOR ALL USING (public.is_admin());

CREATE POLICY "Site settings are viewable by everyone" 
  ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can modify site settings" 
  ON public.site_settings FOR ALL USING (public.is_admin());

CREATE POLICY "Active posts are viewable by everyone" 
  ON public.community_posts FOR SELECT USING (status = 'active' OR public.is_admin());
CREATE POLICY "Non-banned users and guests can insert posts" 
  ON public.community_posts FOR INSERT WITH CHECK (NOT public.is_user_banned());
CREATE POLICY "Authors can update own posts" 
  ON public.community_posts FOR UPDATE USING ((auth.uid() = user_id AND NOT public.is_user_banned()) OR public.is_admin());
CREATE POLICY "Authors or Admins can delete posts" 
  ON public.community_posts FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Likes are viewable by everyone" 
  ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can toggle likes" 
  ON public.post_likes FOR INSERT WITH CHECK (NOT public.is_user_banned());
CREATE POLICY "Users can remove own likes" 
  ON public.post_likes FOR DELETE USING (true);

CREATE POLICY "Analytics can be logged by anyone" 
  ON public.page_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Analytics are viewable by admins" 
  ON public.page_analytics FOR SELECT USING (public.is_admin());

-- 9. PROFILE AUTO-CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, role, is_banned)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.profiles.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({
  siteSettings,
  onUpdateSiteSettings,
  onShowToast,
}) => {
  const { t, language } = useApp();
  const [subTab, setSubTab] = useState<'overview' | 'users' | 'schema'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profiles, setProfiles] = useState<CommunityUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingSwitch, setIsTogglingSwitch] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setIsLoading(true);
    const [summary, communityPosts] = await Promise.all([
      AnalyticsService.getAnalyticsSummary(timeRange),
      CommunityService.getPosts(),
    ]);

    const counts = CommunityService.getCommunityCounts();
    summary.totalCommunityPosts = counts.totalPosts;
    summary.totalReplies = counts.totalReplies;
    summary.totalLikes = counts.totalLikes;

    setAnalytics(summary);
    setPosts(communityPosts);
    setProfiles(AuthService.getAllProfiles());
    setIsLoading(false);
  };

  const handleToggleCommunitySwitch = async () => {
    setIsTogglingSwitch(true);
    const newValue = !siteSettings.communityEnabled;
    console.log('%c[PROMBOT_DEBUG] AdminAnalyticsTab -> Admin clicked Community toggle switch:', 'background: #db2777; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;', {
      previousValue: siteSettings.communityEnabled,
      newValue,
    });
    await onUpdateSiteSettings({ communityEnabled: newValue });
    setIsTogglingSwitch(false);
    onShowToast(
      language === 'ar'
        ? newValue
          ? 'تم تفعيل ميزة المجتمع لجميع زوار الموقع'
          : 'تم إيقاف وتعطيل ميزة المجتمع'
        : newValue
        ? 'Community feature enabled site-wide'
        : 'Community feature disabled site-wide',
      newValue ? 'success' : 'info'
    );
  };

  // Confirmation dialog state for sensitive admin actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmationVariant;
    details?: { label: string; value: string }[];
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const handleDeletePost = (postId: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'ar' ? 'حذف المشاركة نهائياً' : 'Delete Community Post',
      description: language === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا المنشور من المجتمع بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to permanently delete this community post? This cannot be undone.',
      variant: 'danger',
      confirmText: language === 'ar' ? 'تأكيد الحذف' : 'Delete Post',
      details: [
        { label: language === 'ar' ? 'معرف المنشور' : 'Post ID', value: postId },
      ],
      onConfirm: async () => {
        await CommunityService.deletePost(postId);
        onShowToast(language === 'ar' ? 'تم حذف المشاركة' : 'Post deleted', 'info');
        await loadData();
      },
    });
  };

  const handleTogglePin = async (postId: string, currentPin: boolean) => {
    await CommunityService.togglePinPost(postId, !currentPin);
    onShowToast(
      language === 'ar'
        ? !currentPin
          ? 'تم تثبيت المنشور في أعلى المجتمع'
          : 'تم إلغاء تثبيت المنشور'
        : !currentPin
        ? 'Post pinned to top'
        : 'Post unpinned',
      'success'
    );
    await loadData();
  };

  const handleToggleBanUser = (userId: string, currentBan: boolean, userName: string) => {
    const nextBan = !currentBan;
    setConfirmModal({
      isOpen: true,
      title: nextBan
        ? (language === 'ar' ? 'حظر المستخدم' : 'Ban User')
        : (language === 'ar' ? 'فك حظر المستخدم' : 'Unban User'),
      description: nextBan
        ? (language === 'ar' ? `هل أنت متأكد من حظر المستخدم "${userName}" ومنعه من التفاعل والتعليق؟` : `Are you sure you want to ban user "${userName}"?`)
        : (language === 'ar' ? `هل أنت متأكد من إلغاء حظر المستخدم "${userName}"؟` : `Are you sure you want to unban user "${userName}"?`),
      variant: nextBan ? 'danger' : 'info',
      confirmText: nextBan ? (language === 'ar' ? 'حظر المستخدم' : 'Ban User') : (language === 'ar' ? 'فك الحظر' : 'Unban User'),
      details: [
        { label: language === 'ar' ? 'المستخدم' : 'User', value: userName },
        { label: 'ID', value: userId },
      ],
      onConfirm: async () => {
        await AuthService.toggleBanUser(userId, nextBan);
        setProfiles(AuthService.getAllProfiles());
        if (nextBan) {
          onShowToast(
            language === 'ar'
              ? `تم حظر المستخدم "${userName}" ومنعه من التفاعل والتعليق.`
              : `User "${userName}" has been banned.`,
            'info'
          );
        } else {
          onShowToast(
            language === 'ar'
              ? `تم إلغاء حظر المستخدم "${userName}".`
              : `User "${userName}" has been unbanned.`,
            'success'
          );
        }
      },
    });
  };

  const handleToggleUserRole = (userId: string, currentRole: 'admin' | 'user' | 'moderator', userName: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setConfirmModal({
      isOpen: true,
      title: newRole === 'admin'
        ? (language === 'ar' ? 'ترقية المستخدم إلى مدير (Admin)' : 'Promote User to Admin')
        : (language === 'ar' ? 'تجريد المستخدم من صلاحية الإدارة' : 'Demote Admin to User'),
      description: newRole === 'admin'
        ? (language === 'ar' ? `هل أنت متأكد من منح صلاحيات الإدارة الكاملة للمستخدم "${userName}"؟` : `Are you sure you want to grant full admin permissions to "${userName}"?`)
        : (language === 'ar' ? `هل أنت متأكد من سحب صلاحيات الإدارة من "${userName}" وتحويله لمستخدم عادي؟` : `Are you sure you want to revoke admin privileges from "${userName}"?`),
      variant: newRole === 'admin' ? 'warning' : 'danger',
      confirmText: newRole === 'admin' ? (language === 'ar' ? 'ترقية لمسؤول' : 'Promote') : (language === 'ar' ? 'تجريد الصلاحية' : 'Demote'),
      details: [
        { label: language === 'ar' ? 'المستخدم' : 'User', value: userName },
        { label: language === 'ar' ? 'الصلاحية الجديدة' : 'New Role', value: newRole === 'admin' ? 'Admin' : 'User' },
      ],
      onConfirm: async () => {
        await AuthService.updateUserRole(userId, newRole);
        setProfiles(AuthService.getAllProfiles());
        onShowToast(
          language === 'ar'
            ? `تم تحديث صلاحية المستخدم "${userName}" إلى ${newRole === 'admin' ? 'مسؤول' : 'عضو'}.`
            : `User "${userName}" role changed to ${newRole}.`,
          'success'
        );
      },
    });
  };

  const handleCopySql = async () => {
    await copyTextToClipboard(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    onShowToast(
      language === 'ar' ? 'تم نسخ كود SQL لـ Supabase إلى الحافظة!' : 'Supabase SQL script copied to clipboard!',
      'success'
    );
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const filteredUsers = profiles.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar inside Analytics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2A384C] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            <span>{t('analyticsOverviewTitle')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('analyticsOverviewSubtitle')}
          </p>
        </div>

        {/* Sub-tab Pill Switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-[#2A384C] shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'overview'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {language === 'ar' ? 'نظرة عامة وإحصائيات' : 'Overview & Metrics'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('users')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'users'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('userManagementTitle')}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              subTab === 'users' ? 'bg-white text-orange-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {profiles.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('schema')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'schema'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{t('sqlSchemaTitle')}</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: OVERVIEW METRICS */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Time Range Selector & Refresh */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-[#121824] p-1.5 rounded-2xl border border-slate-200 dark:border-[#2A384C]">
              {(['today', '7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    timeRange === range
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {range === 'today' && (language === 'ar' ? 'اليوم' : 'Today')}
                  {range === '7d' && (language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days')}
                  {range === '30d' && (language === 'ar' ? 'آخر 30 يوم' : 'Last 30 Days')}
                  {range === 'all' && (language === 'ar' ? 'الكل' : 'All Time')}
                </button>
              ))}
              <button
                type="button"
                onClick={loadData}
                title="Refresh"
                className="p-1.5 text-slate-400 hover:text-orange-500 rounded-xl hover:bg-slate-100 dark:hover:bg-[#182232] cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Master Switch Panel */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-2 border-orange-500/30 dark:border-orange-500/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-orange-500 text-white shadow-xs">
                    <Shield className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {t('communityMasterSwitchLabel')}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  {t('communityMasterSwitchDesc')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleCommunitySwitch}
                disabled={isTogglingSwitch}
                className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer shrink-0 ${
                  siteSettings.communityEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {siteSettings.communityEnabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 stroke-[2.5]" />
                    <span>{language === 'ar' ? 'المجتمع مفعّل حالياً' : 'Community Active'}</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 stroke-[2.5]" />
                    <span>{language === 'ar' ? 'المجتمع معطّل' : 'Community Disabled'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metrics Counter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Metric 1: Total Page Views */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">{t('totalPageViewsLabel')}</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {analytics?.totalPageViews.toLocaleString() || '0'}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>+14.2% {language === 'ar' ? 'نمو' : 'growth'}</span>
              </div>
            </div>

            {/* Metric 2: Prompt Copies */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">{t('promptCopiesLabel')}</span>
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <Copy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {analytics?.totalPromptCopies.toLocaleString() || '0'}
              </div>
              <div className="text-[11px] text-orange-600 dark:text-orange-400 font-bold">
                {language === 'ar' ? 'تفاعل عالي' : 'High engagement'}
              </div>
            </div>

            {/* Metric 3: Active Users */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">{t('activeUsersLabel')}</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {analytics?.activeUsers.toLocaleString() || '0'}
              </div>
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                {language === 'ar' ? 'جلسات تفاعلية' : 'Active sessions'}
              </div>
            </div>

            {/* Metric 4: Community Posts */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">{t('communityPostsLabel')}</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {analytics?.totalCommunityPosts || '0'}
              </div>
              <div className="text-[11px] text-slate-400">
                {analytics?.totalReplies || 0} {language === 'ar' ? 'ردود متداخلة' : 'replies'}
              </div>
            </div>

            {/* Metric 5: Total Likes */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs space-y-2 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">{t('totalLikesLabel')}</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {analytics?.totalLikes || '0'}
              </div>
              <div className="text-[11px] text-rose-500 font-bold">
                {language === 'ar' ? 'تفاعلات إعجاب' : 'Total Likes'}
              </div>
            </div>
          </div>

          {/* Daily Activity Visual Bar Chart & Top Prompts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'نشاط المشاهدات والنسخ اليومي' : 'Daily Views & Copy Activity'}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-blue-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    {language === 'ar' ? 'مشاهدات' : 'Views'}
                  </span>
                  <span className="flex items-center gap-1.5 text-orange-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    {language === 'ar' ? 'نسخ الأوامر' : 'Copies'}
                  </span>
                </div>
              </div>

              <div className="h-52 flex items-end justify-between gap-2 pt-6">
                {analytics?.viewsByDay.map((day, idx) => {
                  const maxVal = Math.max(
                    ...analytics.viewsByDay.map((d) => Math.max(d.views, d.copies)),
                    1
                  );
                  const viewHeight = Math.round((day.views / maxVal) * 100);
                  const copyHeight = Math.round((day.copies / maxVal) * 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="w-full max-w-[28px] flex items-end justify-center gap-1 h-36">
                        <div
                          style={{ height: `${Math.max(viewHeight, 8)}%` }}
                          className="w-1/2 bg-blue-500 rounded-t-md transition-all group-hover:bg-blue-400"
                          title={`Views: ${day.views}`}
                        />
                        <div
                          style={{ height: `${Math.max(copyHeight, 6)}%` }}
                          className="w-1/2 bg-orange-500 rounded-t-md transition-all group-hover:bg-orange-400"
                          title={`Copies: ${day.copies}`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold truncate w-full text-center">
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Copied Prompts Leaderboard */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {language === 'ar' ? 'الأوامر الأكثر نسخاً' : 'Top Copied Prompts'}
                </h3>
              </div>

              <div className="space-y-3">
                {analytics?.topCopiedPrompts && analytics.topCopiedPrompts.length > 0 ? (
                  analytics.topCopiedPrompts.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121824] border border-slate-200/80 dark:border-[#2A384C] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-mono font-bold shrink-0">
                        {item.count} {language === 'ar' ? 'نسخة' : 'copies'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {language === 'ar' ? 'لا توجد بيانات نسخ مسجلة حالياً' : 'No prompt copies recorded yet'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: USER DIRECTORY & MANAGEMENT */}
      {subTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={language === 'ar' ? 'البحث عن مستخدم بالاسم أو البريد...' : 'Search users by name or email...'}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {filteredUsers.length} {language === 'ar' ? 'مستخدم مسجل' : 'users found'}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#141c2b] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2A384C]">
                  <tr>
                    <th className="p-3.5 font-semibold">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th className="p-3.5 font-semibold">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th className="p-3.5 font-semibold text-center">{language === 'ar' ? 'الدور / الصلاحية' : 'Role'}</th>
                    <th className="p-3.5 font-semibold text-center">{language === 'ar' ? 'حالة الحساب' : 'Status'}</th>
                    <th className="p-3.5 font-semibold text-right">{language === 'ar' ? 'إجراءات الإشراف' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2A384C]/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        {language === 'ar' ? 'لا يوجد مستخدمين يطابقون البحث.' : 'No users found matching query.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1f2b3e]/60 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-orange-500/20"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">{user.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {user.id.substring(0, 12)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {user.email || (language === 'ar' ? 'حساب زائر' : 'Guest')}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserRole(user.id, user.role || 'user', user.name)}
                            title="Click to toggle role"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              user.role === 'admin'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{user.role === 'admin' ? t('adminRole') : t('userRole')}</span>
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          {user.isBanned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <UserX className="w-3 h-3" />
                              <span>{t('bannedStatus')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <UserCheck className="w-3 h-3" />
                              <span>{language === 'ar' ? 'نشط' : 'Active'}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleBanUser(user.id, !!user.isBanned, user.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                              user.isBanned
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            {user.isBanned ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{t('unbanUser')}</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>{t('banUser')}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SUPABASE SQL SCHEMA SETUP */}
      {subTab === 'schema' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-orange-500" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {t('sqlSchemaTitle')}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('sqlSchemaSubtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : t('copySqlMigration')}</span>
              </button>
            </div>

            {/* SQL Code Preview Container */}
            <div className="relative rounded-2xl bg-slate-950 text-slate-200 border border-slate-800 p-4 font-mono text-xs overflow-x-auto max-h-[500px]">
              <pre dir="ltr" className="leading-relaxed selection:bg-orange-600 selection:text-white">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Unified Styled Admin Confirmation Modal */}
      <AdminConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        details={confirmModal.details}
      />
    </div>
  );
};
