import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prompt, Category, PlatformSettings, AdsEngineConfig, PromptStatus } from '../types';
import { safeStorage, verifyPassword } from '../utils/securityUtils';
import { isAdminEmail } from '../utils/authUtils';

const STORAGE_KEY_SUPABASE_URL = 'prombo_supabase_url_v1';
const STORAGE_KEY_SUPABASE_KEY = 'prombo_supabase_anon_key_v1';

// Supabase Environment variables read directly from Vite environment
const ENV_SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const ENV_SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

/**
 * Normalizes user or environment provided Supabase URL to standard project origin.
 * Automatically resolves and strips trailing paths such as /rest/v1/, /storage/v1, /auth/v1/,
 * accidental quotes, whitespace, and dashboard URLs to prevent PostgREST PGRST125 (invalid path) errors.
 */
export function normalizeSupabaseUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return '';
  let url = String(rawUrl).trim().replace(/^['"]|['"]$/g, '').trim();
  if (!url) return '';

  // Extract reference if user pasted a Supabase dashboard URL
  const dashboardMatch = url.match(/supabase\.com\/(?:dashboard\/)?project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);

    // Standard Supabase project URLs: always lock to pure origin (e.g. https://<ref>.supabase.co)
    if (parsed.hostname.toLowerCase().endsWith('.supabase.co')) {
      return parsed.origin;
    }

    // Custom domain or self-hosted Supabase: strip common sub-paths and trailing slashes
    let pathname = parsed.pathname.replace(/\/+$/, '');
    pathname = pathname.replace(/\/(rest|storage|auth|graphql|realtime)(\/v\d+)?\/?$/i, '');
    return parsed.origin + (pathname === '/' || pathname === '' ? '' : pathname);
  } catch {
    return url.replace(/\/+$/, '').replace(/\/(rest|storage|auth|graphql|realtime)(\/v\d+)?\/?$/i, '');
  }
}

/**
 * Normalizes anon API key by stripping quotes and whitespace
 */
export function normalizeSupabaseAnonKey(rawKey: string | undefined | null): string {
  if (!rawKey) return '';
  return String(rawKey).trim().replace(/^['"]|['"]$/g, '').trim();
}

/**
 * Validates that an anon key is not empty, dummy, or an incomplete placeholder
 */
export function isValidAnonKey(rawKey: string | undefined | null): boolean {
  if (!rawKey) return false;
  const key = normalizeSupabaseAnonKey(rawKey);
  if (!key || key.length < 20) return false;
  if (
    key.includes('...') ||
    key.includes('YOUR_') ||
    key.includes('MY_KEY') ||
    key.toLowerCase().includes('placeholder')
  ) {
    return false;
  }
  return true;
}

// Storage bucket names as specified in requirements
export const SUPABASE_STORAGE_BUCKET = 'prompt-images';
export const SUPABASE_AVATARS_BUCKET = 'avatars';
export const SUPABASE_COMMUNITY_BUCKET = 'community-media';

/**
 * Uploads a profile avatar image to Supabase 'avatars' storage bucket and retrieves public URL
 */
export async function uploadAvatarToSupabase(
  userId: string,
  fileOrBlob: Blob | File,
  fileExt: string = 'webp'
): Promise<{ publicUrl?: string; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: 'Supabase client is not connected' };
  }

  try {
    const timestamp = Date.now();
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `user_${cleanUserId}_${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_AVATARS_BUCKET)
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: fileOrBlob.type || 'image/webp',
      });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError);
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_AVATARS_BUCKET)
      .getPublicUrl(filePath);

    return { publicUrl: publicUrlData.publicUrl };
  } catch (err: any) {
    console.warn('Avatar upload exception:', err);
    return { error: err?.message || 'Failed to upload image' };
  }
}

/**
 * Helper to map Supabase snake_case schema row to camelCase TypeScript Prompt interface
 */
export function mapRowToPrompt(row: any): Prompt {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    prompt: row.prompt,
    categoryId: row.category_id,
    subcategory: row.subcategory || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    targetModel: row.target_model || 'General AI',
    author: row.author || 'Community Contributor',
    authorEmail: row.author_email || '',
    status: (row.status as PromptStatus) || 'approved',
    submittedAt: row.submitted_at || row.created_at,
    isFeatured: Boolean(row.is_featured),
    copyCount: Number(row.copy_count) || 0,
    imageUrl: row.image_url || undefined,
    imageThumbnailUrl: row.image_thumbnail_url || undefined,
    images: Array.isArray(row.images) ? row.images : (row.image_url ? [row.image_url] : []),
    videos: Array.isArray(row.videos) ? row.videos : (row.video_url ? [row.video_url] : []),
    videoUrl: row.video_url || undefined,
    mediaType: row.media_type || undefined,
    rejectionReason: row.rejection_reason || undefined,
    moderatedAt: row.moderated_at || undefined,
    authorId: row.author_id || row.user_id || undefined,
    author_id: row.author_id || row.user_id || undefined,
    userId: row.user_id || row.author_id || undefined,
    variables: Array.isArray(row.variables) ? row.variables : [],
    parameters: typeof row.parameters === 'object' && row.parameters ? row.parameters : {},
    tips: Array.isArray(row.tips) ? row.tips : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

let cachedClient: SupabaseClient | null = null;

const initialStoredUrl = safeStorage.getItem(STORAGE_KEY_SUPABASE_URL);
const initialStoredKey = safeStorage.getItem(STORAGE_KEY_SUPABASE_KEY);

// Purge any legacy placeholder or dummy values (e.g., aBcDe.supabase.co, your-project.supabase.co)
if (
  initialStoredUrl &&
  (initialStoredUrl.toLowerCase().includes('abcde') ||
    initialStoredUrl.toLowerCase().includes('your-project') ||
    initialStoredUrl.toLowerCase().includes('example.supabase.co'))
) {
  safeStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
  safeStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
}

// Environment variables from import.meta.env take primary precedence over local storage
const initialRawUrl = ENV_SUPABASE_URL || safeStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '';
const initialCleanUrl = normalizeSupabaseUrl(initialRawUrl);

const initialRawKey = ENV_SUPABASE_ANON_KEY || safeStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '';
const initialCleanKey = normalizeSupabaseAnonKey(initialRawKey);

// Auto-clean any previously stored malformed URLs in browser storage
if (initialStoredUrl && initialStoredUrl !== initialCleanUrl && !ENV_SUPABASE_URL) {
  safeStorage.setItem(STORAGE_KEY_SUPABASE_URL, initialCleanUrl);
}
if (initialStoredKey && initialStoredKey !== initialCleanKey && !ENV_SUPABASE_ANON_KEY) {
  safeStorage.setItem(STORAGE_KEY_SUPABASE_KEY, initialCleanKey);
}

let currentConfig = {
  url: initialCleanUrl,
  anonKey: initialCleanKey,
};

/**
 * Check if valid Supabase credentials exist and are configured
 */
export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(currentConfig.url);
  const anonKey = normalizeSupabaseAnonKey(currentConfig.anonKey);
  return !!(url && anonKey && url.startsWith('http') && isValidAnonKey(anonKey));
}

/**
 * Initialize or retrieve the active Supabase Client
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = normalizeSupabaseUrl(currentConfig.url);
  const anonKey = normalizeSupabaseAnonKey(currentConfig.anonKey);

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          apikey: anonKey,
        },
      },
    });
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Get the current Supabase config values (for Admin display/settings)
 */
export function getSupabaseConfig() {
  return {
    url: normalizeSupabaseUrl(currentConfig.url),
    anonKey: normalizeSupabaseAnonKey(currentConfig.anonKey),
    isConfigured: isSupabaseConfigured(),
  };
}

/**
 * Update Supabase configuration at runtime (e.g. from Admin Settings)
 */
export function updateSupabaseConfig(url: string, anonKey: string): boolean {
  try {
    const cleanUrl = normalizeSupabaseUrl(url);
    const cleanKey = normalizeSupabaseAnonKey(anonKey);
    currentConfig = {
      url: cleanUrl,
      anonKey: cleanKey,
    };
    safeStorage.setItem(STORAGE_KEY_SUPABASE_URL, cleanUrl);
    safeStorage.setItem(STORAGE_KEY_SUPABASE_KEY, cleanKey);
    cachedClient = null; // reset cached client
    return true;
  } catch (err) {
    console.error('Failed to update Supabase config:', err);
    return false;
  }
}

// ----------------------------------------------------
// 1. SUPABASE STORAGE: Image Upload Service
// ----------------------------------------------------

export interface UploadImageResponse {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload compressed media (image or video) to Supabase Storage bucket.
 * Generates and returns the permanent CDN public URL with graceful local fallback.
 */
export async function uploadPromptMediaToSupabase(
  file: File | Blob,
  fileName?: string,
  bucket: string = SUPABASE_STORAGE_BUCKET
): Promise<UploadImageResponse> {
  const supabase = getSupabaseClient();
  const rawFileName = fileName || `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;
  // Sanitize file name for safe storage path (avoid spaces, quotes, and non-ascii characters)
  const sanitizedFileName = rawFileName.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  const now = new Date();
  const filePath = `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${sanitizedFileName}`;

  // Helper to create client-side data URL fallback
  const createLocalFallbackUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  if (!supabase) {
    // If Supabase credentials are not yet configured, generate a local data URL preview
    console.info(`Supabase not connected. Using client-side storage simulation for ${sanitizedFileName}.`);
    const localUrl = await createLocalFallbackUrl();
    return {
      success: !!localUrl,
      publicUrl: localUrl,
    };
  }

  try {
    let contentType = (file as any).type;
    if (!contentType) {
      if (sanitizedFileName.endsWith('.webp')) contentType = 'image/webp';
      else if (sanitizedFileName.endsWith('.png')) contentType = 'image/png';
      else if (sanitizedFileName.endsWith('.jpg') || sanitizedFileName.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (sanitizedFileName.endsWith('.gif')) contentType = 'image/gif';
      else if (sanitizedFileName.endsWith('.mp4')) contentType = 'video/mp4';
      else if (sanitizedFileName.endsWith('.webm')) contentType = 'video/webm';
      else if (sanitizedFileName.endsWith('.mov')) contentType = 'video/quicktime';
      else contentType = 'application/octet-stream';
    }

    // Ensure bucket exists / upload file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '31536000', // 1 year cache
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.warn(`Supabase Storage upload error in ${bucket}, using local fallback:`, uploadError.message);
      const fallbackUrl = await createLocalFallbackUrl();
      return {
        success: false,
        error: uploadError.message,
        publicUrl: fallbackUrl || undefined,
      };
    }

    // Retrieve public URL from CDN
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (err: any) {
    console.warn('Error during media upload to Supabase, using local fallback:', err);
    const fallbackUrl = await createLocalFallbackUrl();
    return {
      success: false,
      error: err.message || 'Unexpected upload error',
      publicUrl: fallbackUrl || undefined,
    };
  }
}

/**
 * Upload prompt image specifically to 'prompt-images' bucket
 */
export async function uploadPromptImageToSupabase(
  file: File | Blob,
  fileName?: string
): Promise<UploadImageResponse> {
  return uploadPromptMediaToSupabase(file, fileName, SUPABASE_STORAGE_BUCKET);
}

/**
 * Upload community media (post/reply images or videos) specifically to 'community-media' bucket
 */
export async function uploadCommunityMediaToSupabase(
  file: File | Blob,
  fileName?: string
): Promise<UploadImageResponse> {
  return uploadPromptMediaToSupabase(file, fileName, SUPABASE_COMMUNITY_BUCKET);
}

// ----------------------------------------------------
// 2. SUPABASE AUTH: Admin Authentication Service
// ----------------------------------------------------

export async function signInWithSupabaseAuth(email: string, password: string): Promise<{ success: boolean; message: string; user?: any }> {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  
  if (!supabase) {
    return { success: false, message: 'Supabase client is not connected' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'Signed in successfully via Supabase Auth',
      user: data.user,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Authentication failed' };
  }
}

export async function signOutSupabaseAuth(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
}

// ----------------------------------------------------
// 3. SUPABASE DATABASE: Prompts Table CRUD
// ----------------------------------------------------

export const SupabaseDbService = {
  /**
   * Fetch all prompts from Supabase `prompts` table
   */
  async getPrompts(): Promise<Prompt[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching prompts from Supabase:', error);
        return null;
      }

      // Map Supabase snake_case schema to camelCase TypeScript interfaces via mapRowToPrompt
      return (data || []).map(mapRowToPrompt);
    } catch (err) {
      console.warn('Exception querying Supabase prompts table:', err);
      return null;
    }
  },

  /**
   * Fetch single prompt by ID from Supabase
   */
  async getPromptById(id: string): Promise<Prompt | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return mapRowToPrompt(data);
    } catch (err) {
      console.warn('Exception querying prompt by id from Supabase:', err);
      return null;
    }
  },

  /**
   * Save (Insert or Update) prompt in Supabase
   */
  async savePrompt(prompt: Partial<Prompt>): Promise<Prompt | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const now = new Date().toISOString();
    const id = prompt.id || `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const rowData = {
      id,
      title: prompt.title || 'Untitled Prompt',
      description: prompt.description || '',
      prompt: prompt.prompt || '',
      category_id: prompt.categoryId || 'vibe-coding',
      subcategory: prompt.subcategory || '',
      tags: prompt.tags || [],
      target_model: prompt.targetModel || 'General AI',
      author: prompt.author || 'Community Contributor',
      author_email: prompt.authorEmail || null,
      status: prompt.status || 'approved',
      submitted_at: prompt.submittedAt || now,
      is_featured: Boolean(prompt.isFeatured),
      copy_count: prompt.copyCount || 0,
      image_url: prompt.imageUrl || null,
      image_thumbnail_url: prompt.imageThumbnailUrl || null,
      images: Array.isArray(prompt.images) ? prompt.images : (prompt.imageUrl ? [prompt.imageUrl] : []),
      videos: Array.isArray(prompt.videos) ? prompt.videos : (prompt.videoUrl ? [prompt.videoUrl] : []),
      video_url: prompt.videoUrl || null,
      media_type: prompt.mediaType || (prompt.videos?.length || prompt.videoUrl ? 'video' : (prompt.images?.length || prompt.imageUrl ? 'image' : 'none')),
      rejection_reason: prompt.rejectionReason || null,
      moderated_at: prompt.moderatedAt || null,
      author_id: prompt.authorId || (prompt as any).userId || (prompt as any).author_id || null,
      user_id: (prompt as any).userId || prompt.authorId || (prompt as any).author_id || null,
      variables: prompt.variables || [],
      parameters: prompt.parameters || {},
      tips: prompt.tips || [],
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('prompts')
        .upsert([rowData])
        .select()
        .single();

      if (error) {
        console.error('Failed to upsert prompt in Supabase:', error);
        return null;
      }

      return mapRowToPrompt(data);
    } catch (err) {
      console.error('Exception during Supabase savePrompt:', err);
      return null;
    }
  },

  /**
   * Delete prompt from Supabase
   */
  async deletePrompt(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Update prompt status in Supabase
   */
  async updateStatus(id: string, status: PromptStatus): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('prompts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Increment copy counter directly in database
   */
  async incrementCopyCount(id: string): Promise<number | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data } = await supabase
        .from('prompts')
        .select('copy_count')
        .eq('id', id)
        .single();
      
      const newCount = (data?.copy_count || 0) + 1;
      await supabase.from('prompts').update({ copy_count: newCount }).eq('id', id);
      return newCount;
    } catch {
      return null;
    }
  },

  /**
   * Fetch all categories from Supabase
   */
  async getCategories(): Promise<Category[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_num', { ascending: true });

      if (error || !data || data.length === 0) return null;

      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        nameAr: row.name_ar,
        slug: row.slug,
        description: row.description || '',
        descriptionAr: row.description_ar,
        icon: row.icon || 'Bookmark',
        color: row.color,
        badgeBg: row.badge_bg,
        badgeBorder: row.badge_border,
        order: row.order_num,
        count: row.count || 0,
        subcategories: row.subcategories || [],
      }));
    } catch {
      return null;
    }
  },

  /**
   * Save Category to Supabase
   */
  async saveCategory(cat: Partial<Category>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const rowData = {
        id: cat.id,
        name: cat.name,
        name_ar: cat.nameAr || null,
        slug: cat.slug || cat.id,
        description: cat.description || '',
        description_ar: cat.descriptionAr || null,
        icon: cat.icon || 'Bookmark',
        color: cat.color || '#F97316',
        badge_bg: cat.badgeBg || 'bg-orange-500/10 text-orange-400',
        badge_border: cat.badgeBorder || 'border-orange-500/30',
        order_num: cat.order || 1,
      };

      const { error } = await supabase.from('categories').upsert([rowData]);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Delete Category from Supabase
   */
  async deleteCategory(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Fetch platform settings from `platform_settings` table (key/id: 'default'), fallback to `system_config`
   */
  async getPlatformSettings(): Promise<PlatformSettings | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      // 1. Query dedicated platform_settings table
      const { data: psData, error: psError } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1);

      if (!psError && psData && psData.length > 0) {
        const row = psData[0];
        const val = row.value || row.settings || row.data || row;
        return val as PlatformSettings;
      }

      // 2. Fallback to system_config table
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'platform_settings')
        .single();

      if (error || !data) return null;
      return data.value as PlatformSettings;
    } catch {
      return null;
    }
  },

  /**
   * Save platform settings to `platform_settings` table (key/id: 'default', value: platformSettings)
   */
  async savePlatformSettings(settings: PlatformSettings): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const payload = {
        id: 'default',
        key: 'default',
        value: settings,
        settings,
        updated_at: new Date().toISOString(),
      };

      const { error: psError } = await supabase
        .from('platform_settings')
        .upsert([payload], { onConflict: 'id' });

      if (psError) {
        const fallbackRes = await supabase
          .from('platform_settings')
          .upsert([payload], { onConflict: 'key' });

        if (fallbackRes.error) {
          // Fallback to system_config table
          const { error: sysError } = await supabase
            .from('system_config')
            .upsert([{ key: 'platform_settings', value: settings, updated_at: new Date().toISOString() }]);
          return !sysError;
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Fetch Ads settings from `ads_config` table (key/id: 'default'), fallback to `ads_settings`
   */
  async getAdsConfig(): Promise<AdsEngineConfig | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      // 1. Query dedicated ads_config table
      const { data: acData, error: acError } = await supabase
        .from('ads_config')
        .select('*')
        .limit(1);

      if (!acError && acData && acData.length > 0) {
        const row = acData[0];
        const val = row.value || row.config || row.settings || row.data || row;
        return val as AdsEngineConfig;
      }

      // 2. Fallback to ads_settings table
      const { data, error } = await supabase
        .from('ads_settings')
        .select('value')
        .eq('key', 'ads_config')
        .single();

      if (error || !data) return null;
      return data.value as AdsEngineConfig;
    } catch {
      return null;
    }
  },

  /**
   * Save Ads settings to `ads_config` table (key/id: 'default', value: adsConfig)
   */
  async saveAdsConfig(config: AdsEngineConfig): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const payload = {
        id: 'default',
        key: 'default',
        value: config,
        updated_at: new Date().toISOString(),
      };

      const { error: acError } = await supabase
        .from('ads_config')
        .upsert([payload], { onConflict: 'key' }); // تم التعديل إلى 'key' بنجاح

      if (acError) {
        const fallbackRes = await supabase
          .from('ads_config')
          .upsert([payload], { onConflict: 'id' });

        if (fallbackRes.error) {
          // Fallback to ads_settings table
          const { error: legacyError } = await supabase
            .from('ads_settings')
            .upsert([{ key: 'ads_config', value: config, updated_at: new Date().toISOString() }]);
          return !legacyError;
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Comprehensive System Connectivity & Health Diagnostic Check
   */
  async runHealthCheck(): Promise<{
    envLoaded: boolean;
    supabaseUrl: string;
    hasAnonKey: boolean;
    dbConnected: boolean;
    tables: {
      prompts: { exists: boolean; count: number; error?: string };
      categories: { exists: boolean; count: number; error?: string };
      ads_settings: { exists: boolean; error?: string };
      system_config: { exists: boolean; error?: string };
    };
    storageBucket: {
      name: string;
      reachable: boolean;
      publicUrlTest: string;
      error?: string;
    };
    authInitialized: boolean;
    readyForProduction: boolean;
  }> {
    const config = getSupabaseConfig();
    const envLoaded = isSupabaseConfigured();
    const supabase = getSupabaseClient();

    const report = {
      envLoaded,
      supabaseUrl: config.url ? config.url.replace(/^(https?:\/\/[^.]+).*/, '$1.supabase.co') : 'Not Configured (Using Local Fallback)',
      hasAnonKey: !!config.anonKey,
      dbConnected: false,
      tables: {
        prompts: { exists: false, count: 0 as number, error: undefined as string | undefined },
        categories: { exists: false, count: 0 as number, error: undefined as string | undefined },
        ads_settings: { exists: false, error: undefined as string | undefined },
        system_config: { exists: false, error: undefined as string | undefined },
      },
      storageBucket: {
        name: SUPABASE_STORAGE_BUCKET,
        reachable: false,
        publicUrlTest: '',
        error: undefined as string | undefined,
      },
      authInitialized: false,
      readyForProduction: false,
    };

    if (!supabase) {
      report.authInitialized = true; // Fallback auth engine active
      report.storageBucket.publicUrlTest = 'DataURL / Local Blob engine active';
      return report;
    }

    try {
      // 1. Check Auth Initialization
      const { data: authData, error: authError } = await supabase.auth.getSession();
      report.authInitialized = !authError || authData !== undefined;
    } catch {
      report.authInitialized = false;
    }

    // 2. Check Database Tables
    try {
      // Categories Table
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id', { count: 'exact' });
      if (!catError) {
        report.tables.categories.exists = true;
        report.tables.categories.count = catData?.length || 0;
      } else {
        report.tables.categories.error = catError.message;
      }

      // Prompts Table
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .select('id', { count: 'exact' });
      if (!promptError) {
        report.tables.prompts.exists = true;
        report.tables.prompts.count = promptData?.length || 0;
      } else {
        report.tables.prompts.error = promptError.message;
      }

      // Ads Settings Table
      const { error: adsError } = await supabase
        .from('ads_settings')
        .select('key')
        .limit(1);
      if (!adsError) {
        report.tables.ads_settings.exists = true;
      } else {
        report.tables.ads_settings.error = adsError.message;
      }

      // System Config Table
      const { error: sysError } = await supabase
        .from('system_config')
        .select('key')
        .limit(1);
      if (!sysError) {
        report.tables.system_config.exists = true;
      } else {
        report.tables.system_config.error = sysError.message;
      }

      report.dbConnected = report.tables.categories.exists || report.tables.prompts.exists;
    } catch (err: any) {
      report.dbConnected = false;
    }

    // 3. Check Storage Bucket
    try {
      const { data: pubUrlData } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl('test-sample.webp');
      
      report.storageBucket.publicUrlTest = pubUrlData?.publicUrl || '';
      report.storageBucket.reachable = !!pubUrlData?.publicUrl;
    } catch (err: any) {
      report.storageBucket.error = err.message || 'Storage bucket check failed';
    }

    report.readyForProduction = report.dbConnected && report.storageBucket.reachable && report.authInitialized;
    return report;
  },
};
