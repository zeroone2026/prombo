-- =====================================================================
-- PROMBO WEB APPLICATION: FULL SUPABASE DATABASE SCHEMA & RLS POLICIES
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE
-- Automatically synchronizes with auth.users and tracks roles / ban status
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  avatar_type TEXT DEFAULT 'preset',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure full_name and avatar_type exist for existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'preset';

-- 3. SITE SETTINGS TABLE
-- Global platform settings including master community toggle
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
-- Stores prompt comments, discussions, and nested replies
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
-- Tracks unique user likes per post/comment
CREATE TABLE IF NOT EXISTS public.post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 6. PAGE & PROMPT ANALYTICS TABLE
-- Tracks real-time page views, prompt copies, and community engagement
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_banned = false
  ) OR (auth.jwt() ->> 'email' = 'zero.oneone.gamer@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Check if current authenticated user is Banned
CREATE OR REPLACE FUNCTION public.is_user_banned()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_banned = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins have full access to all profiles" 
  ON public.profiles FOR ALL USING (public.is_admin());

-- Site Settings Policies
CREATE POLICY "Site settings are viewable by everyone" 
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can modify site settings" 
  ON public.site_settings FOR ALL USING (public.is_admin());

-- Community Posts Policies
CREATE POLICY "Active posts are viewable by everyone" 
  ON public.community_posts FOR SELECT USING (status = 'active' OR public.is_admin());

CREATE POLICY "Non-banned users can insert own posts" 
  ON public.community_posts FOR INSERT WITH CHECK (
    NOT public.is_user_banned() AND (auth.uid() IS NULL OR auth.uid() = user_id)
  );

CREATE POLICY "Authors can update own posts" 
  ON public.community_posts FOR UPDATE USING (
    (auth.uid() = user_id AND NOT public.is_user_banned()) OR public.is_admin()
  );

CREATE POLICY "Authors or Admins can delete posts" 
  ON public.community_posts FOR DELETE USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- Post Likes Policies
CREATE POLICY "Likes are viewable by everyone" 
  ON public.post_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can toggle likes" 
  ON public.post_likes FOR INSERT WITH CHECK (NOT public.is_user_banned());

CREATE POLICY "Users can remove own likes" 
  ON public.post_likes FOR DELETE USING (true);

-- Analytics Policies
CREATE POLICY "Analytics can be logged by anyone" 
  ON public.page_analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "Analytics are viewable by admins" 
  ON public.page_analytics FOR SELECT USING (public.is_admin());

-- 9. PROFILE AUTO-CREATION TRIGGER ON NEW AUTH USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, role, is_banned)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    CASE WHEN NEW.email = 'zero.oneone.gamer@gmail.com' THEN 'admin' ELSE 'user' END,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.profiles.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. STORAGE BUCKET FOR USER AVATARS
-- Create avatars bucket if storage schema exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Avatars Bucket RLS Policies
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

-- =====================================================================
-- 11. AUDIT LOGS TABLE & REALTIME MONITORING
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_avatar TEXT,
  user_slug TEXT,
  user_profile_url TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT NOT NULL,
  target_title TEXT NOT NULL,
  content_url TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON public.audit_logs(target_id);

-- Audit Logs RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable by admins"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Audit logs can be inserted by anyone or system"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================================
-- 12. PROMPTS & CATEGORIES CORE TABLES & RLS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  target_model TEXT,
  author TEXT NOT NULL,
  author_email TEXT,
  author_id TEXT,
  author_avatar TEXT,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected', 'archived')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_promoted BOOLEAN NOT NULL DEFAULT false,
  copy_count INT NOT NULL DEFAULT 0,
  image_url TEXT,
  image_thumbnail_url TEXT,
  images TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  video_url TEXT,
  media_type TEXT DEFAULT 'none',
  variables JSONB DEFAULT '[]'::jsonb,
  parameters JSONB DEFAULT '{}'::jsonb,
  tips TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompts_category ON public.prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON public.prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_author_id ON public.prompts(author_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved prompts are viewable by everyone"
  ON public.prompts FOR SELECT
  USING (status = 'approved' OR public.is_admin() OR (auth.uid()::text = author_id));

CREATE POLICY "Authenticated users can submit prompts"
  ON public.prompts FOR INSERT
  WITH CHECK (NOT public.is_user_banned() AND (auth.uid() IS NULL OR auth.uid()::text = author_id));

CREATE POLICY "Authors can update own prompts"
  ON public.prompts FOR UPDATE
  USING (
    ((auth.uid()::text = author_id) AND NOT public.is_user_banned()) OR public.is_admin()
  );

CREATE POLICY "Authors or Admins can delete prompts"
  ON public.prompts FOR DELETE
  USING ((auth.uid()::text = author_id) OR public.is_admin());

-- =====================================================================
-- 13. MODERATION REPORTS & PLATFORM CONFIG
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT,
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,
  reported_user_id TEXT,
  reported_user_name TEXT,
  reported_user_email TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  target_content TEXT,
  content_url TEXT,
  tag TEXT,
  custom_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports can be submitted by anyone"
  ON public.reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Reports are viewable and manageable by admins"
  ON public.reports FOR ALL
  USING (public.is_admin());

-- System Config & Ads Settings Tables
CREATE TABLE IF NOT EXISTS public.system_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System config viewable by everyone"
  ON public.system_config FOR SELECT USING (true);

CREATE POLICY "System config manageable by admins"
  ON public.system_config FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.ads_settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ads_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ads settings viewable by everyone"
  ON public.ads_settings FOR SELECT USING (true);

CREATE POLICY "Ads settings manageable by admins"
  ON public.ads_settings FOR ALL USING (public.is_admin());


