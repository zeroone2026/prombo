import { Category, Prompt, AdminUser, PromptStatus, PlatformSettings, AdsEngineConfig, AdSlotId, AdSlotConfig, ContentMediaSettings, SectionMediaConfig, FeedAdSlotConfig, CommunityPost } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PROMPTS } from '../data/seedData';
import { hashPassword, verifyPassword, sanitizeUrl, sanitizeAdSnippet, safeStorage } from '../utils/securityUtils';
import { isAdminEmail } from '../utils/authUtils';
import { SupabaseDbService, isSupabaseConfigured, getSupabaseClient } from './supabaseClient';
import { SoundNotificationService } from './soundNotificationService';
import { UserNotificationService } from './userNotificationService';
import { AuditService } from './auditService';
import { AuthService } from './authService';

const PROMPTS_STORAGE_KEY = 'prombo_prompts_v1';
const CATEGORIES_STORAGE_KEY = 'prombo_categories_v1';
const FAVORITES_STORAGE_KEY = 'prombo_favorites_v1';
const ADMIN_USER_STORAGE_KEY = 'prombo_admin_user_v1';
const ADMIN_SESSION_STORAGE_KEY = 'prombo_admin_session_v1';
const SETTINGS_STORAGE_KEY = 'prombo_platform_settings_v1';
const ADS_CONFIG_STORAGE_KEY = 'prombo_ads_engine_v2';

export const DEFAULT_CONTENT_MEDIA_SETTINGS: ContentMediaSettings = {
  priorModerationEnabled: true, // "تفعيل الإشراف المسبق قبل النشر"
  homePrompts: {
    masterEnabled: true,
    enablePhotoUploads: true,
    enableVideoUploads: true,
    maxPhotoSizeMB: 5,
    maxVideoSizeMB: 50,
    maxPhotosCount: 4,
    maxVideoDurationSec: 120,
  },
  community: {
    masterEnabled: true,
    enablePhotoUploads: true,
    enableVideoUploads: true,
    maxPhotoSizeMB: 5,
    maxVideoSizeMB: 50,
    maxPhotosCount: 4,
    maxVideoDurationSec: 120,
  },
};

const DEFAULT_SETTINGS: PlatformSettings = {
  allowPublicSubmissions: true,
  requireAdminApproval: true,
  imageUpload: {
    masterEnabled: true,
    allowedCategoryIds: ['vibe-coding', 'ai-images', 'commercial-video', 'copywriting', 'marketing-growth', 'mobile-apps'],
    maxFileSizeMB: 2,
  },
  contentMedia: DEFAULT_CONTENT_MEDIA_SETTINGS,
  appearance: {
    homeGridColumns: 3,
    cardSpacing: 'normal',
    showCategoryBadge: true,
  },
};

export function createDefaultHomeSlots(): Record<string, FeedAdSlotConfig> {
  const slots: Record<string, FeedAdSlotConfig> = {};
  for (let i = 0; i < 10; i++) {
    slots[`home_feed_ad_${i}`] = {
      id: `home_feed_ad_${i}`,
      enabled: true,
      ctaUrl: 'https://example.com',
      snippet: '',
      title: '',
      description: '',
      clickCount: 0,
    };
  }
  return slots;
}

export function createDefaultCommunitySlots(): Record<string, FeedAdSlotConfig> {
  const slots: Record<string, FeedAdSlotConfig> = {};
  for (let i = 0; i < 10; i++) {
    slots[`comm_feed_ad_${i}`] = {
      id: `comm_feed_ad_${i}`,
      enabled: true,
      ctaUrl: 'https://example.com',
      snippet: '',
      title: '',
      description: '',
      clickCount: 0,
    };
  }
  return slots;
}

const DEFAULT_ADS_CONFIG: AdsEngineConfig = {
  masterEnabled: true,
  homeAdFrequency: 5,
  communityAdFrequency: 5,
  homeFeedEnabled: true,
  communityFeedEnabled: true,
  homeFeedCtaUrl: 'https://example.com',
  communityFeedCtaUrl: 'https://example.com',
  homeFeedSnippet: '',
  communityFeedSnippet: '',
  homeSlots: createDefaultHomeSlots(),
  communitySlots: createDefaultCommunitySlots(),
  slots: {
    popupEntry: {
      id: 'popupEntry',
      name: 'Modal Pop-up on Site Entry',
      nameAr: 'إعلان منبثق عند دخول الموقع (Pop-up Modal)',
      description: 'Modal pop-up overlay displayed to visitors when they first enter the application.',
      descriptionAr: 'نافذة إعلانية منبثقة تظهر للمستخدم فور دخوله إلى الموقع مع مؤقت إغلاق وخيار تكرار.',
      isEnabled: true,
      triggerType: 'modal',
      delaySeconds: 1,
      showFrequency: 'once_per_session',
      deviceTargeting: 'all',
      cooldownMinutes: 0,
      autoCloseSeconds: 10,
      clickCount: 0,
      codeSnippet: `<div style="text-align:center; padding: 20px; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; border: 1px solid #f97316; color: #fff;">
  <video src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" autoplay loop muted playsinline style="width: 100%; height: 180px; object-fit: cover; border-radius: 10px; margin-bottom: 12px;"></video>
  <div style="font-size: 11px; text-transform: uppercase; color: #f97316; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">Prombo Sponsored Partner</div>
  <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #fff;">🚀 Explore Premium AI Tools & Cloud Compute</h3>
  <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">Accelerate your Vibe Coding workflow with 99.9% GPU uptime.</p>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="display:inline-block; background: #f97316; color: #fff; font-weight: 700; font-size: 13px; padding: 10px 24px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);">Claim Special Deal &rarr;</a>
</div>`,
    },
    onCopyPrompt: {
      id: 'onCopyPrompt',
      name: 'Triggered Ad on "Copy Prompt"',
      nameAr: 'إعلان تفاعلي عند نسخ الأمر (On Copy Prompt)',
      description: 'Triggered ad unit shown right after the user copies any prompt to clipboard.',
      descriptionAr: 'إعلان ينبثق للمستخدم مباشرة بعد نقره على زر نسخ أي برومبت.',
      isEnabled: true,
      triggerType: 'modal',
      delaySeconds: 0,
      showFrequency: 'every_3_actions',
      deviceTargeting: 'all',
      cooldownMinutes: 5,
      autoCloseSeconds: 8,
      clickCount: 0,
      codeSnippet: `<div style="text-align: center; padding: 18px; background: #182232; border-radius: 14px; border: 1px solid #334155; color: #fff;">
  <div style="font-size: 10px; color: #f97316; font-weight: 700; margin-bottom: 4px;">⚡ SPECIAL DEVELOPER OFFER</div>
  <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px; color: #fff;">Prompt Copied! Need Supercharged API Access?</div>
  <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Get instant high-speed LLM tokens with 50% discount today.</p>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="display:inline-block; background: #f97316; color: #fff; font-size: 12px; font-weight: 700; padding: 8px 18px; border-radius: 8px; text-decoration: none;">Explore Fast Models &rarr;</a>
</div>`,
    },
    onSubmitPrompt: {
      id: 'onSubmitPrompt',
      name: 'Triggered Ad on Prompt Submission',
      nameAr: 'إعلان بعد إرسال برومبت جديد (Post-Submission)',
      description: 'Banner ad displayed inside or after public prompt submission confirmation.',
      descriptionAr: 'بانر إعلاني يظهر للمستخدم بعد إرسال برومبت جديد بنجاح للمكتبة.',
      isEnabled: true,
      triggerType: 'banner',
      showFrequency: 'always',
      deviceTargeting: 'all',
      cooldownMinutes: 0,
      autoCloseSeconds: 0,
      clickCount: 0,
      codeSnippet: `<div style="text-align:center; padding: 14px; background: #0f172a; border-radius: 12px; border: 1px solid #f97316; color: #fff;">
  <div style="font-size: 13px; font-weight: 700; color: #f97316;">🌟 Thank you for contributing to Prombo!</div>
  <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">Looking to deploy your AI applications in 1-click? Check out our partner cloud platforms.</div>
</div>`,
    },
    headerBanner: {
      id: 'headerBanner',
      name: 'Sticky Top Header Leaderboard (728x90)',
      nameAr: 'بانر أعلى الصفحة (Sticky Header Banner)',
      description: 'Horizontal banner placed directly below the navbar.',
      descriptionAr: 'بانر أفقي عريض يظهر في أعلى الموقع أسفل شريط التنقل مباشرة.',
      isEnabled: true,
      triggerType: 'banner',
      showFrequency: 'always',
      deviceTargeting: 'all',
      cooldownMinutes: 0,
      autoCloseSeconds: 0,
      clickCount: 0,
      codeSnippet: `<div style="width: 100%; max-width: 970px; height: 90px; max-height: 90px; margin: 0 auto; background: linear-gradient(90deg, #182232, #24344d); border-radius: 12px; border: 1px solid #2a384c; display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; color: #fff; box-sizing: border-box; overflow: hidden; gap: 12px;">
  <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80" alt="Prombo Ad" style="width: 76px; height: 76px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" />
    <div style="text-align: left; min-width: 0;">
      <div style="font-size: 10px; color: #f97316; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">PROMPT ENGINE PRO</div>
      <div style="font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Ultra-Fast Cursor & Claude 3.7 Templates</div>
      <div style="font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Supercharge your workflow with verified AI prompts.</div>
    </div>
  </div>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="background: #f97316; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap; flex-shrink: 0;">Get Pro &rarr;</a>
</div>`,
    },
    footerBanner: {
      id: 'footerBanner',
      name: 'Sticky Bottom Footer Banner',
      nameAr: 'بانر أسفل الصفحة الثابت (Sticky Footer Banner)',
      description: 'Sticky horizontal bottom bar with sponsor message & close button.',
      descriptionAr: 'شريط إعلاني ثابت في أسفل الشاشة مع إمكانية الإغلاق والمتابعة.',
      isEnabled: true,
      triggerType: 'banner',
      showFrequency: 'always',
      deviceTargeting: 'all',
      cooldownMinutes: 0,
      autoCloseSeconds: 0,
      clickCount: 0,
      codeSnippet: `<div style="width: 100%; max-width: 970px; height: 90px; max-height: 90px; margin: 0 auto; background: #0f172a; border-radius: 12px; border: 1px solid #f97316; display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; color: #fff; box-sizing: border-box; overflow: hidden; gap: 12px;">
  <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
    <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=160&auto=format&fit=crop&q=80" alt="Prombo Sponsor" style="width: 76px; height: 76px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" />
    <div style="text-align: left; min-width: 0;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="background: #f97316; color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">AD</span>
        <span style="font-size: 13px; font-weight: 800; color: #fff;">Next-Gen Full-Stack AI Workflows</span>
      </div>
      <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Build full-stack AI apps 10x faster with AI-powered development environments.</div>
    </div>
  </div>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="background: #f97316; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap; flex-shrink: 0;">Learn More &rarr;</a>
</div>`,
    },
    sidebarLeft: {
      id: 'sidebarLeft',
      name: 'Left Sidebar Skyscraper (160x600)',
      nameAr: 'إعلان ناطحة سحاب الجانبي الأيسر (Left Skyscraper)',
      description: 'Vertical skyscraper ad placed on the left side on desktop screens.',
      descriptionAr: 'بانر عمودي يظهر في الجانب الأيسر للشاشات الكبيرة بحجم ناطحة سحاب.',
      isEnabled: true,
      triggerType: 'skyscraper',
      showFrequency: 'always',
      deviceTargeting: 'desktop',
      cooldownMinutes: 0,
      autoCloseSeconds: 0,
      clickCount: 0,
      codeSnippet: `<div style="width: 100%; max-width: 100%; height: auto; background: #141c2b; border: 1px solid #2a384c; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; color: #fff; text-align: center; box-sizing: border-box; gap: 16px;">
  <div>
    <div style="font-size: 9px; color: #f97316; font-weight: 800; text-transform: uppercase;">Prombo Sponsor</div>
    <div style="font-weight: 800; font-size: 13px; margin-top: 10px; line-height: 1.3;">Unlimited AI Prompts & Templates</div>
    <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Claude 3.7 • Midjourney • Vibe Coding</div>
  </div>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="background: #f97316; color: #fff; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">Join Free</a>
</div>`,
    },
    sidebarRight: {
      id: 'sidebarRight',
      name: 'Right Sidebar Skyscraper (160x600)',
      nameAr: 'إعلان ناطحة سحاب الجانبي الأيمن (Right Skyscraper)',
      description: 'Vertical skyscraper ad placed on the right side on desktop screens.',
      descriptionAr: 'بانر عمودي يظهر في الجانب الأيمن للشاشات الكبيرة بحجم ناطحة سحاب.',
      isEnabled: true,
      triggerType: 'skyscraper',
      showFrequency: 'always',
      deviceTargeting: 'desktop',
      cooldownMinutes: 0,
      autoCloseSeconds: 0,
      clickCount: 0,
      codeSnippet: `<div style="width: 100%; max-width: 100%; height: auto; background: #141c2b; border: 1px solid #2a384c; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; color: #fff; text-align: center; box-sizing: border-box; gap: 16px;">
  <div>
    <div style="font-size: 9px; color: #f97316; font-weight: 800; text-transform: uppercase;">Prombo Sponsor</div>
    <div style="font-weight: 800; font-size: 13px; margin-top: 10px; line-height: 1.3;">Deploy AI Models with 1 Click</div>
    <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Instant Cloud GPUs & Dedicated Hosting</div>
  </div>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="background: #f97316; color: #fff; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">Get Started</a>
</div>`,
    },
    gridNative: {
      id: 'gridNative',
      name: 'In-Feed Native Grid Ad Card',
      nameAr: 'إعلان نيتف مدمج في شبكة البطاقات (In-Feed Grid Ad)',
      description: 'Auto-adapting native ad card seamlessly integrated directly into the prompt cards grid.',
      descriptionAr: 'بطاقة إعلانية متجاوبة ذكية تندمج تلقائياً داخل شبكة البرومبتات في الصفحة الرئيسية.',
      isEnabled: true,
      triggerType: 'inline',
      showFrequency: 'always',
      deviceTargeting: 'all',
      cooldownMinutes: 0,
      autoCloseSeconds: 0,
      clickCount: 0,
      codeSnippet: `<div style="width: 100%; height: 100%; min-height: 220px; background: linear-gradient(135deg, #182232, #1e293b); border: 1px solid #334155; border-radius: 14px; padding: 20px; color: #fff; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; text-align: center;">
  <div>
    <div style="font-size: 10px; color: #f97316; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Sponsored Partner</div>
    <div style="font-weight: 800; font-size: 15px; margin-top: 8px; color: #fff;">Supercharge Your AI Workflows</div>
    <div style="font-size: 12px; color: #94a3b8; margin-top: 6px; line-height: 1.5;">Deploy next-generation models with zero latency and high developer reliability.</div>
  </div>
  <div style="margin-top: 16px;">
    <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #f97316; color: #fff; font-size: 12px; font-weight: 700; padding: 8px 18px; border-radius: 8px; text-decoration: none;">Explore Platform &rarr;</a>
  </div>
</div>`,
    },
  },
};

/**
 * Safely merge raw ads config from storage or remote database with defaults
 */
export function mergeAdsConfig(source: any): AdsEngineConfig {
  if (!source || typeof source !== 'object') {
    return DEFAULT_ADS_CONFIG;
  }
  const raw = source.value || source.config || source.settings || source.data || source;
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_ADS_CONFIG;
  }

  const mergedSlots = { ...DEFAULT_ADS_CONFIG.slots };
  if (raw.slots && typeof raw.slots === 'object') {
    for (const [key, slot] of Object.entries(raw.slots as Record<string, any>)) {
      const sid = key as AdSlotId;
      if (mergedSlots[sid] && slot && typeof slot === 'object') {
        const snippet = slot.codeSnippet || '';
        const isLegacyHardcoded = snippet.includes('550px') || snippet.includes('min-height: 500px') || snippet.includes('height: 550px');
        mergedSlots[sid] = {
          ...mergedSlots[sid],
          ...slot,
          clickCount: typeof slot.clickCount === 'number' ? slot.clickCount : (mergedSlots[sid].clickCount || 0),
          codeSnippet: isLegacyHardcoded ? DEFAULT_ADS_CONFIG.slots[sid].codeSnippet : (snippet || DEFAULT_ADS_CONFIG.slots[sid].codeSnippet),
        };
      }
    }
  }

  const defaultHomeSlots = createDefaultHomeSlots();
  const defaultCommSlots = createDefaultCommunitySlots();

  const mergedHomeSlots: Record<string, FeedAdSlotConfig> = {};
  for (let i = 0; i < 10; i++) {
    const sid = `home_feed_ad_${i}`;
    const existing = (raw.homeSlots && raw.homeSlots[sid]) || {};
    mergedHomeSlots[sid] = {
      ...defaultHomeSlots[sid],
      ...existing,
      clickCount: typeof existing.clickCount === 'number' ? existing.clickCount : 0,
    };
  }

  const mergedCommSlots: Record<string, FeedAdSlotConfig> = {};
  for (let i = 0; i < 10; i++) {
    const sid = `comm_feed_ad_${i}`;
    const existing = (raw.communitySlots && raw.communitySlots[sid]) || {};
    mergedCommSlots[sid] = {
      ...defaultCommSlots[sid],
      ...existing,
      clickCount: typeof existing.clickCount === 'number' ? existing.clickCount : 0,
    };
  }

  return {
    masterEnabled: raw.masterEnabled ?? true,
    slots: mergedSlots,
    homeAdFrequency: typeof raw.homeAdFrequency === 'number' ? raw.homeAdFrequency : 5,
    communityAdFrequency: typeof raw.communityAdFrequency === 'number' ? raw.communityAdFrequency : 5,
    homeFeedEnabled: raw.homeFeedEnabled ?? (mergedSlots.gridNative ? mergedSlots.gridNative.isEnabled : true),
    communityFeedEnabled: raw.communityFeedEnabled ?? true,
    homeFeedSnippet: raw.homeFeedSnippet || (mergedSlots.gridNative ? mergedSlots.gridNative.codeSnippet : ''),
    communityFeedSnippet: raw.communityFeedSnippet || '',
    homeFeedCtaUrl: raw.homeFeedCtaUrl || 'https://example.com',
    communityFeedCtaUrl: raw.communityFeedCtaUrl || 'https://example.com',
    homeSlots: mergedHomeSlots,
    communitySlots: mergedCommSlots,
  };
}

// Default Admin Config template
const DEFAULT_ADMIN: AdminUser = {
  email: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_ADMIN_EMAIL || '')) || 'zero.oneone.gamer@gmail.com',
  role: 'admin',
  lastLogin: '',
};

export const StorageService = {
  // PROMPTS CRUD
  getPrompts(): Prompt[] {
    try {
      const stored = safeStorage.getItem(PROMPTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.warn('Failed to read prompts from storage:', e);
      return [];
    }
  },

  async fetchPrompts(): Promise<Prompt[]> {
    if (isSupabaseConfigured()) {
      try {
        const remote = await SupabaseDbService.getPrompts();
        if (remote !== null && Array.isArray(remote)) {
          // Immediately synchronize authentic Supabase database state into local storage
          safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(remote));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('prombo_prompts_change', { detail: remote }));
          }
          return remote;
        }
      } catch (err) {
        console.warn('Failed to fetch prompts from Supabase:', err);
      }
    }
    return this.getPrompts();
  },

  /**
   * Fetch Community Posts from Supabase `community_posts` table and sync to local cache
   */
  async fetchCommunityPosts(options?: { promptId?: string }): Promise<CommunityPost[]> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('community_posts')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });

        if (options?.promptId) {
          query = query.eq('prompt_id', options.promptId);
        }

        const currentUser = AuthService.getCurrentUser();
        if (currentUser?.id) {
          // Fetch active posts, and also pending posts belonging to the current user so they don't vanish
          query = query.or(`status.eq.active,user_id.eq.${currentUser.id}`);
        } else {
          query = query.eq('status', 'active');
        }

        const { data, error } = await query;
        if (!error && data !== null && Array.isArray(data)) {
          // Get local like status if available
          let userLikes: Record<string, boolean> = {};
          try {
            const storedLikes = safeStorage.getItem('prombo_community_likes_v1');
            if (storedLikes) userLikes = JSON.parse(storedLikes);
          } catch {}

          const rawPosts: CommunityPost[] = data.map((r: any) => ({
            id: r.id,
            userId: r.user_id || 'anonymous',
            userName: r.user_name || 'Member',
            userEmail: r.user_email || undefined,
            userAvatar: r.user_avatar || undefined,
            promptId: r.prompt_id || undefined,
            promptTitle: r.prompt_title || undefined,
            promptCategory: r.prompt_category || undefined,
            promptModel: r.prompt_model || undefined,
            content: r.content,
            parentId: r.parent_id || null,
            likesCount: Number(r.likes_count) || 0,
            repliesCount: Number(r.replies_count) || 0,
            isPinned: Boolean(r.is_pinned),
            isLikedByMe: !!userLikes[r.id],
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            images: Array.isArray(r.images) ? r.images : [],
            videos: Array.isArray(r.videos) ? r.videos : [],
            videoUrl: r.video_url || undefined,
            mediaType: r.media_type || (r.videos?.length || r.video_url ? 'video' : (r.images?.length ? 'image' : 'none')),
            rejectionReason: r.rejection_reason || undefined,
            moderatedAt: r.moderated_at || undefined,
            moderatedBy: r.moderated_by || undefined,
            replies: [],
          }));

          const topLevelPosts = rawPosts.filter((p) => !p.parentId);
          const replies = rawPosts.filter((p) => !!p.parentId);

          topLevelPosts.forEach((parent) => {
            const postReplies = replies.filter((r) => r.parentId === parent.id);
            parent.replies = postReplies;
            parent.repliesCount = Math.max(Number(parent.repliesCount) || 0, postReplies.length);
          });

          // Sync authentic state into local storage
          safeStorage.setItem('prombo_community_posts_v1', JSON.stringify(topLevelPosts));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: topLevelPosts }));
          }
          return topLevelPosts;
        }
      } catch (err) {
        console.warn('Failed to fetch community posts from Supabase:', err);
      }
    }

    // Local storage fallback
    try {
      const stored = safeStorage.getItem('prombo_community_posts_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const currentUserId = AuthService.getCurrentUser()?.id;
          const filtered = parsed.filter(
            (p: CommunityPost) => p.status === 'active' || (p.status === 'pending' && (!currentUserId || p.userId === currentUserId))
          );
          return options?.promptId ? filtered.filter((p: CommunityPost) => p.promptId === options.promptId) : filtered;
        }
      }
    } catch {}
    return [];
  },

  /**
   * Subscribe to live postgres_changes for community posts
   */
  subscribeToCommunityPosts(callback: (posts: CommunityPost[]) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return () => {};
    }

    try {
      const channel = supabase
        .channel(`community_posts_realtime_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_posts',
          },
          async () => {
            const updated = await this.fetchCommunityPosts();
            callback(updated);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Failed to subscribe to community posts realtime channel:', err);
      return () => {};
    }
  },

  addPrompt(prompt: Partial<Prompt>): Prompt {
    return this.savePrompt(prompt);
  },

  getPromptById(id: string): Prompt | undefined {
    return this.getPrompts().find(p => p.id === id);
  },

  async fetchPromptById(id: string): Promise<Prompt | undefined> {
    const cleanId = (id || '').trim();
    if (!cleanId) return undefined;

    // 1. Check local cache
    const local = this.getPromptById(cleanId);
    if (local) return local;

    // 2. Query Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const remote = await SupabaseDbService.getPromptById(cleanId);
        if (remote) {
          const prompts = this.getPrompts();
          if (!prompts.some(p => p.id === remote.id)) {
            prompts.push(remote);
            safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
          }
          return remote;
        }
      } catch (err) {
        console.warn('Failed to fetch prompt from Supabase:', err);
      }
    }
    return undefined;
  },

  savePrompt(prompt: Partial<Prompt>): Prompt {
    const prompts = this.getPrompts();
    const now = new Date().toISOString();
    
    if (prompt.id) {
      // Update
      const index = prompts.findIndex(p => p.id === prompt.id);
      if (index !== -1) {
        const existingPrompt = prompts[index];
        const updated: Prompt = {
          ...existingPrompt,
          ...prompt,
          imageUrl: prompt.imageUrl !== undefined ? (prompt.imageUrl || undefined) : existingPrompt.imageUrl,
          imageThumbnailUrl: prompt.imageThumbnailUrl !== undefined ? (prompt.imageThumbnailUrl || undefined) : existingPrompt.imageThumbnailUrl,
          images: Array.isArray(prompt.images) ? prompt.images : existingPrompt.images,
          videos: Array.isArray(prompt.videos) ? prompt.videos : existingPrompt.videos,
          videoUrl: prompt.videoUrl !== undefined ? (prompt.videoUrl || undefined) : existingPrompt.videoUrl,
          mediaType: prompt.mediaType !== undefined ? prompt.mediaType : existingPrompt.mediaType,
          updatedAt: now,
        } as Prompt;
        prompts[index] = updated;
        safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
        if (isSupabaseConfigured()) {
          SupabaseDbService.savePrompt(updated).catch((e) => console.warn('Supabase sync warning [savePrompt update]:', e));
        }

        // Centrally audit prompt update
        AuditService.logAction({
          action: 'UPDATE_PROMPT',
          userId: updated.authorId || updated.userId,
          userName: updated.author,
          userEmail: updated.authorEmail,
          targetId: updated.id,
          targetType: 'prompt',
          targetTitle: updated.title,
          contentUrl: `https://prombo.app/prompt/${updated.id}`,
          details: { categoryId: updated.categoryId, status: updated.status },
        }).catch((err) => console.warn('AuditLog notice [UPDATE_PROMPT]:', err));

        return updated;
      }
    }

    // Create new
    // Centralized Action Guardrail: Strict guest restriction for new prompt creation
    const activeUser = AuthService.getCurrentUser();
    if (!prompt.id && (!activeUser || activeUser.isGuest)) {
      throw new Error('Authentication required: Registration is required to submit prompts.');
    }

    const newPrompt: Prompt = {
      id: prompt.id || `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: prompt.title || 'Untitled Prompt',
      description: prompt.description || '',
      prompt: prompt.prompt || '',
      categoryId: prompt.categoryId || 'vibe-coding',
      subcategory: prompt.subcategory || '',
      tags: prompt.tags || [],
      targetModel: prompt.targetModel || 'General AI',
      author: prompt.author || activeUser?.name || 'Community Contributor',
      authorEmail: prompt.authorEmail || activeUser?.email || '',
      authorId: prompt.authorId || activeUser?.id || (prompt as any).userId || (prompt as any).author_id || undefined,
      author_id: (prompt as any).author_id || prompt.authorId || activeUser?.id || (prompt as any).userId || undefined,
      userId: (prompt as any).userId || prompt.authorId || activeUser?.id || (prompt as any).author_id || undefined,
      status: prompt.status || 'approved',
      submittedAt: prompt.submittedAt || now,
      isFeatured: prompt.isFeatured || false,
      copyCount: prompt.copyCount || 0,
      imageUrl: prompt.imageUrl || undefined,
      imageThumbnailUrl: prompt.imageThumbnailUrl || undefined,
      images: prompt.images || (prompt.imageUrl ? [prompt.imageUrl] : []),
      videos: prompt.videos || (prompt.videoUrl ? [prompt.videoUrl] : []),
      videoUrl: prompt.videoUrl || undefined,
      mediaType: prompt.mediaType || (prompt.videos?.length || prompt.videoUrl ? 'video' : (prompt.images?.length || prompt.imageUrl ? 'image' : 'none')),
      rejectionReason: prompt.rejectionReason || undefined,
      moderatedAt: prompt.moderatedAt || undefined,
      variables: prompt.variables || [],
      parameters: prompt.parameters || {},
      tips: prompt.tips || [],
      createdAt: now,
      updatedAt: now,
    };

    prompts.unshift(newPrompt);
    safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));

    // Sound notification if created as approved/published directly
    if (newPrompt.status === 'approved' || (newPrompt.status as any) === 'published') {
      try {
        SoundNotificationService.notifyPromptPublished({
          id: newPrompt.id,
          title: newPrompt.title,
          author: newPrompt.author,
          authorId: newPrompt.authorId || newPrompt.userId,
        });
      } catch (err) {
        console.warn('Sound notification trigger failed on savePrompt', err);
      }
    }

    // Asynchronously push to Supabase if configured
    if (isSupabaseConfigured()) {
      SupabaseDbService.savePrompt(newPrompt).catch((e) => console.warn('Supabase sync warning [savePrompt]:', e));
    }

    // Centrally audit prompt creation
    AuditService.logAction({
      action: 'CREATE_PROMPT',
      userId: newPrompt.authorId || newPrompt.userId,
      userName: newPrompt.author,
      userEmail: newPrompt.authorEmail,
      targetId: newPrompt.id,
      targetType: 'prompt',
      targetTitle: newPrompt.title,
      contentUrl: `https://prombo.app/prompt/${newPrompt.id}`,
      details: { categoryId: newPrompt.categoryId, status: newPrompt.status, model: newPrompt.targetModel },
    }).catch((err) => console.warn('AuditLog notice [CREATE_PROMPT]:', err));

    return newPrompt;
  },

  updatePrompt(id: string, updates: Partial<Prompt>, requestingUserId?: string, isAdmin: boolean = false): Prompt | null {
    // Centralized Action Guardrail: Strict guest restriction
    const activeUser = AuthService.getCurrentUser();
    if (!activeUser || activeUser.isGuest) {
      console.warn(`StorageService.updatePrompt: guests cannot edit prompts`);
      return null;
    }

    const prompts = this.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    if (index === -1) return null;

    if (requestingUserId && !isAdmin) {
      const target = prompts[index];
      const isOwner = Boolean(
        (target.authorId && target.authorId === requestingUserId) ||
        (target.author_id && target.author_id === requestingUserId) ||
        (target.userId && target.userId === requestingUserId)
      );
      if (!isOwner) {
        console.warn(`StorageService.updatePrompt: unauthorized update attempt on prompt ${id} by user ${requestingUserId}`);
        return null;
      }
    }

    return this.savePrompt({ ...prompts[index], ...updates, id });
  },

  updatePromptStatus(id: string, status: PromptStatus, requestingUserId?: string, isAdmin: boolean = false, rejectionReason?: string): boolean {
    const prompts = this.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    if (index !== -1) {
      if (requestingUserId && !isAdmin) {
        const target = prompts[index];
        const isOwner = Boolean(
          (target.authorId && target.authorId === requestingUserId) ||
          (target.author_id && target.author_id === requestingUserId) ||
          (target.userId && target.userId === requestingUserId)
        );
        if (!isOwner) {
          console.warn(`StorageService.updatePromptStatus: unauthorized status update attempt on prompt ${id} by user ${requestingUserId}`);
          return false;
        }
      }

      const previousStatus = prompts[index].status;
      prompts[index].status = status;
      prompts[index].updatedAt = new Date().toISOString();
      if (status === 'rejected' && rejectionReason) {
        prompts[index].rejectionReason = rejectionReason;
      }
      if (status === 'approved') {
        prompts[index].moderatedAt = new Date().toISOString();
      }
      safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));

      // Notification on publishing approved prompt
      const isNowPublished = status === 'approved' || (status as any) === 'published';
      const wasPublished = previousStatus === 'approved' || (previousStatus as any) === 'published';
      const targetUserId = prompts[index].authorId || prompts[index].author_id || prompts[index].userId;

      if (isNowPublished && !wasPublished) {
        try {
          SoundNotificationService.notifyPromptPublished({
            id: prompts[index].id,
            title: prompts[index].title,
            author: prompts[index].author,
            authorId: targetUserId,
          });
        } catch (err) {
          console.warn('Sound notification trigger failed on updatePromptStatus', err);
        }

        if (targetUserId) {
          try {
            UserNotificationService.notifyUser({
              userId: targetUserId,
              userEmail: prompts[index].authorEmail,
              type: 'moderation_approved',
              title: 'تمت الموافقة على البرومبت',
              titleKey: 'notifPromptApprovedTitle',
              message: `تم اعتماد ونشر البرومبت "${prompts[index].title}" بنجاح في المكتبة!`,
              messageKey: 'notifPromptApprovedMsg',
              messageParams: { title: prompts[index].title },
              entityType: 'prompt',
              entityId: id,
            });
          } catch {}
        }
      } else if (status === 'rejected' && targetUserId) {
        try {
          UserNotificationService.notifyUser({
            userId: targetUserId,
            userEmail: prompts[index].authorEmail,
            type: 'moderation_rejected',
            title: 'تم رفض نشر البرومبت',
            titleKey: 'notifPromptRejectedTitle',
            message: `تم رفض نشر البرومبت "${prompts[index].title}".`,
            messageKey: 'notifPromptRejectedMsg',
            messageParams: { title: prompts[index].title },
            reason: rejectionReason,
            entityType: 'prompt',
            entityId: id,
          });
        } catch {}
      }

      if (isSupabaseConfigured()) {
        SupabaseDbService.updateStatus(id, status).catch((e) => console.warn('Supabase sync warning [updateStatus]:', e));
      }
      return true;
    }
    return false;
  },

  deletePrompt(id: string, requestingUserId?: string, isAdmin: boolean = false): boolean {
    // Centralized Action Guardrail: Strict guest restriction
    const activeUser = AuthService.getCurrentUser();
    if (!activeUser || activeUser.isGuest) {
      console.warn(`StorageService.deletePrompt: guests cannot delete prompts`);
      return false;
    }

    const prompts = this.getPrompts();
    const target = prompts.find(p => p.id === id);
    if (!target) return false;

    if (requestingUserId && !isAdmin) {
      const isOwner = Boolean(
        (target.authorId && target.authorId === requestingUserId) ||
        (target.author_id && target.author_id === requestingUserId) ||
        (target.userId && target.userId === requestingUserId)
      );
      if (!isOwner) {
        console.warn(`StorageService.deletePrompt: unauthorized delete attempt on prompt ${id} by user ${requestingUserId}`);
        return false;
      }
    }

    const filtered = prompts.filter(p => p.id !== id);
    if (filtered.length !== prompts.length) {
      safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(filtered));
      if (isSupabaseConfigured()) {
        SupabaseDbService.deletePrompt(id).catch((e) => console.warn('Supabase sync warning [deletePrompt]:', e));
      }

      // Centrally audit prompt deletion
      AuditService.logAction({
        action: 'DELETE_PROMPT',
        userId: requestingUserId || target.authorId || target.userId,
        userName: target.author,
        userEmail: target.authorEmail,
        targetId: target.id,
        targetType: 'prompt',
        targetTitle: target.title,
        contentUrl: `https://prombo.app/prompt/${target.id}`,
        details: { deletedBy: requestingUserId, isAdmin },
      }).catch((err) => console.warn('AuditLog notice [DELETE_PROMPT]:', err));

      return true;
    }
    return false;
  },

  /**
   * Update Author Name & Avatar across all prompts authored by this user
   */
  async updateUserAuthorDetails(userId: string, newName: string, newAvatar: string): Promise<void> {
    const cleanUserId = (userId || '').trim();
    const cleanName = (newName || '').trim();
    if (!cleanUserId || !cleanName) return;

    const prompts = this.getPrompts();
    let modified = false;

    const updated = prompts.map((prompt) => {
      const isOwner = Boolean(
        (prompt.authorId && prompt.authorId === cleanUserId) ||
        (prompt.author_id && prompt.author_id === cleanUserId) ||
        (prompt.userId && prompt.userId === cleanUserId)
      );

      if (isOwner) {
        modified = true;
        return {
          ...prompt,
          author: cleanName,
          authorAvatar: newAvatar || prompt.authorAvatar,
          updatedAt: new Date().toISOString(),
        };
      }
      return prompt;
    });

    if (modified) {
      safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prombo_prompts_change', { detail: updated }));
      }
    }

    // Sync to Supabase prompts table if configured
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseClient();
        if (client) {
          await client
            .from('prompts')
            .update({
              author: cleanName,
              author_avatar: newAvatar || undefined,
            })
            .or(`author_id.eq.${cleanUserId},user_id.eq.${cleanUserId}`);
        }
      } catch (err) {
        console.warn('Supabase prompt author update warning:', err);
      }
    }
  },

  incrementCopyCount(id: string): number {
    const prompts = this.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    if (index !== -1) {
      prompts[index].copyCount = (prompts[index].copyCount || 0) + 1;
      safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
      if (isSupabaseConfigured()) {
        SupabaseDbService.incrementCopyCount(id).catch((e) => console.warn('Supabase sync warning [incrementCopyCount]:', e));
      }
      return prompts[index].copyCount;
    }
    return 0;
  },

  // FAVORITES
  getFavorites(): string[] {
    try {
      const stored = safeStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(promptId: string): boolean {
    const favorites = this.getFavorites();
    const exists = favorites.includes(promptId);
    let updated: string[];
    if (exists) {
      updated = favorites.filter(id => id !== promptId);
    } else {
      updated = [...favorites, promptId];
    }
    safeStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    return !exists;
  },

  // CATEGORIES CRUD
  getCategories(): Category[] {
    try {
      const stored = safeStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.warn('Failed to read categories from storage:', e);
      return [];
    }
  },

  async fetchCategories(): Promise<Category[]> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('order_num', { ascending: true });

        if (!error && data !== null && Array.isArray(data)) {
          const remoteCategories: Category[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            nameAr: row.name_ar,
            slug: row.slug,
            description: row.description || '',
            descriptionAr: row.description_ar,
            icon: row.icon || 'Bookmark',
            color: row.color || '#38bdf8',
            badgeBg: row.badge_bg || 'bg-sky-500/10 text-sky-400',
            badgeBorder: row.badge_border || 'border-sky-500/30',
            order: row.order_num ?? row.order ?? 0,
          }));

          // Immediately synchronize authentic Supabase database state into local storage
          safeStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(remoteCategories));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('prombo_categories_change', { detail: remoteCategories }));
          }
          return remoteCategories;
        }
      } catch (err) {
        console.warn('Failed to fetch categories from Supabase:', err);
      }
    }
    return this.getCategories();
  },

  saveCategory(category: Partial<Category>): Category {
    const categories = this.getCategories();
    if (category.id) {
      const index = categories.findIndex(c => c.id === category.id);
      if (index !== -1) {
        const updated: Category = {
          ...categories[index],
          ...category,
        } as Category;
        categories[index] = updated;
        safeStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
        return updated;
      }
    }

    const slug = (category.name || 'new-category')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newCategory: Category = {
      id: category.id || slug || `cat-${Date.now()}`,
      name: category.name || 'New Category',
      slug: slug || 'new-category',
      description: category.description || '',
      icon: category.icon || 'Bookmark',
      color: category.color || '#38bdf8',
      badgeBg: category.badgeBg || 'bg-sky-500/10 text-sky-400',
      badgeBorder: category.badgeBorder || 'border-sky-500/30',
      order: category.order || categories.length + 1,
    };

    categories.push(newCategory);
    safeStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    return newCategory;
  },

  deleteCategory(id: string): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter(c => c.id !== id);
    if (filtered.length !== categories.length) {
      safeStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  },

  // ADMIN AUTH & CREDENTIALS
  getAdminConfig(): AdminUser {
    try {
      const stored = safeStorage.getItem(ADMIN_USER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return DEFAULT_ADMIN;
    } catch {
      return DEFAULT_ADMIN;
    }
  },

  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: AdminUser }> {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseClient();
    
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error || !data?.user) {
          return { success: false, message: error?.message || 'Invalid email or password' };
        }

        const role = data.user.user_metadata?.role || data.user.app_metadata?.role;
        if (role !== 'admin' && !isAdminEmail(cleanEmail)) {
          await supabase.auth.signOut({ scope: 'global' });
          return { success: false, message: 'This account does not have administrator privileges' };
        }

        const session = {
          email: cleanEmail,
          role: 'admin',
          lastLogin: new Date().toISOString(),
          token: data.session?.access_token || `tok_${Date.now()}`
        };
        safeStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
        safeStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify({ email: cleanEmail, role: 'admin', lastLogin: new Date().toISOString() }));
        return { success: true, message: 'Logged in successfully', user: session as unknown as AdminUser };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Authentication error' };
      }
    }

    return { success: false, message: 'Authentication service unavailable' };
  },

  async loginWithPassphrase(password: string, email?: string): Promise<{ success: boolean; message: string; user?: AdminUser }> {
    const admin = this.getAdminConfig();
    const targetEmail = (email && email.trim()) ? email.trim() : admin.email;
    if (!targetEmail) {
      return { success: false, message: 'Admin email is not configured' };
    }
    return this.login(targetEmail, password);
  },

  isLoggedIn(): boolean {
    try {
      const sessionStr = safeStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
      if (!sessionStr) return false;
      const session = JSON.parse(sessionStr);
      if (!session || typeof session !== 'object') return false;

      // Require role === 'admin' and non-empty valid string email
      if (session.role !== 'admin' || typeof session.email !== 'string' || !session.email.trim()) {
        return false;
      }

      // Max session age: 7 days
      if (session.lastLogin) {
        const loginTime = new Date(session.lastLogin).getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        if (isNaN(loginTime) || Date.now() - loginTime > maxAge) {
          safeStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
          return false;
        }
      }

      // SEC-02: Require that the session email is genuinely authorized
      if (!isAdminEmail(session.email)) {
        safeStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },

  getCurrentSession(): { email: string; role: string; lastLogin: string } | null {
    try {
      const sessionStr = safeStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
      if (!sessionStr) return null;
      const session = JSON.parse(sessionStr);
      if (!session || typeof session !== 'object' || session.role !== 'admin') {
        return null;
      }
      if (!session.email || !isAdminEmail(session.email)) {
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  getAdminSession(): { email: string; role: string; lastLogin: string } | null {
    return this.getCurrentSession();
  },

  logout(): void {
    safeStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  },

  updateAdminEmail(newEmail: string): boolean {
    if (!newEmail || !newEmail.includes('@')) return false;
    const admin = this.getAdminConfig();
    admin.email = newEmail.trim().toLowerCase();
    safeStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(admin));

    // Update active session if exists
    const session = this.getCurrentSession();
    if (session) {
      session.email = admin.email;
      safeStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    return true;
  },

  async updateAdminPassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long' };
    }
    const admin = this.getAdminConfig();
    const isOldValid = await verifyPassword(oldPassword, admin.passwordHash);
    if (!isOldValid) {
      return { success: false, message: 'Current password does not match' };
    }
    admin.passwordHash = await hashPassword(newPassword);
    safeStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(admin));
    return { success: true, message: 'Password updated successfully' };
  },

  // PLATFORM GLOBAL SETTINGS
  getPlatformSettings(): PlatformSettings {
    try {
      const stored = safeStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          imageUpload: {
            ...DEFAULT_SETTINGS.imageUpload,
            ...(parsed.imageUpload || {}),
          },
          contentMedia: {
            ...DEFAULT_CONTENT_MEDIA_SETTINGS,
            ...(parsed.contentMedia || {}),
            homePrompts: {
              ...DEFAULT_CONTENT_MEDIA_SETTINGS.homePrompts,
              ...(parsed.contentMedia?.homePrompts || {}),
            },
            community: {
              ...DEFAULT_CONTENT_MEDIA_SETTINGS.community,
              ...(parsed.contentMedia?.community || {}),
            },
          },
        };
      }
      safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Fetch Platform Settings from Supabase `platform_settings` (or `system_config`) table
   */
  async fetchPlatformSettings(): Promise<PlatformSettings> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        // 1. Check dedicated platform_settings table
        const { data: psData, error: psError } = await supabase
          .from('platform_settings')
          .select('*')
          .limit(1);

        if (!psError && psData && psData.length > 0) {
          const row = psData[0];
          const raw = row.value || row.settings || row.data || row;
          const merged: PlatformSettings = {
            ...DEFAULT_SETTINGS,
            ...raw,
            imageUpload: {
              ...DEFAULT_SETTINGS.imageUpload,
              ...(raw.imageUpload || {}),
            },
            contentMedia: {
              ...DEFAULT_CONTENT_MEDIA_SETTINGS,
              ...(raw.contentMedia || {}),
              homePrompts: {
                ...DEFAULT_CONTENT_MEDIA_SETTINGS.homePrompts,
                ...(raw.contentMedia?.homePrompts || {}),
              },
              community: {
                ...DEFAULT_CONTENT_MEDIA_SETTINGS.community,
                ...(raw.contentMedia?.community || {}),
              },
            },
            appearance: {
              ...DEFAULT_SETTINGS.appearance,
              ...(raw.appearance || {}),
            },
          };
          safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('prombo_platform_settings_change', { detail: merged }));
          }
          return merged;
        }

        // 2. Fallback to system_config table (key = 'platform_settings')
        const sysSettings = await SupabaseDbService.getPlatformSettings();
        if (sysSettings) {
          const merged: PlatformSettings = {
            ...DEFAULT_SETTINGS,
            ...sysSettings,
            imageUpload: {
              ...DEFAULT_SETTINGS.imageUpload,
              ...(sysSettings.imageUpload || {}),
            },
            contentMedia: {
              ...DEFAULT_CONTENT_MEDIA_SETTINGS,
              ...(sysSettings.contentMedia || {}),
              homePrompts: {
                ...DEFAULT_CONTENT_MEDIA_SETTINGS.homePrompts,
                ...(sysSettings.contentMedia?.homePrompts || {}),
              },
              community: {
                ...DEFAULT_CONTENT_MEDIA_SETTINGS.community,
                ...(sysSettings.contentMedia?.community || {}),
              },
            },
            appearance: {
              ...DEFAULT_SETTINGS.appearance,
              ...(sysSettings.appearance || {}),
            },
          };
          safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('prombo_platform_settings_change', { detail: merged }));
          }
          return merged;
        }
      } catch (err) {
        console.warn('Failed to fetch platform settings from Supabase:', err);
      }
    }
    return this.getPlatformSettings();
  },

  savePlatformSettings(settings: PlatformSettings): PlatformSettings {
    return this.updatePlatformSettings(settings);
  },

  updatePlatformSettings(settings: Partial<PlatformSettings>): PlatformSettings {
    const current = this.getPlatformSettings();
    const updated: PlatformSettings = {
      ...current,
      ...settings,
      imageUpload: {
        ...current.imageUpload,
        ...(settings.imageUpload || {}),
      },
      contentMedia: {
        ...current.contentMedia,
        ...(settings.contentMedia || {}),
        homePrompts: {
          ...current.contentMedia?.homePrompts,
          ...(settings.contentMedia?.homePrompts || {}),
        },
        community: {
          ...current.contentMedia?.community,
          ...(settings.contentMedia?.community || {}),
        },
      },
      appearance: {
        ...current.appearance,
        ...(settings.appearance || {}),
      },
    };

    safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_platform_settings_change', { detail: updated }));
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Upsert to platform_settings table (key/id: 'default', value: platformSettings)
        (async () => {
          try {
            const payload = {
              id: 'default',
              key: 'default',
              value: updated,
              settings: updated,
              updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
              .from('platform_settings')
              .upsert([payload], { onConflict: 'id' });

            if (error) {
              console.warn('[StorageService.updatePlatformSettings] platform_settings upsert warning (trying onConflict key):', error);
              const fallbackRes = await supabase
                .from('platform_settings')
                .upsert([payload], { onConflict: 'key' });

              if (fallbackRes.error) {
                // Fallback to system_config table
                await SupabaseDbService.savePlatformSettings(updated).catch(() => {});
              }
            }
          } catch {
            await SupabaseDbService.savePlatformSettings(updated).catch(() => {});
          }
        })();
      }
    }
    return updated;
  },

  /**
   * Subscribe to live postgres_changes for platform settings
   */
  subscribeToPlatformSettings(callback: (settings: PlatformSettings) => void): () => void {
    const supabase = getSupabaseClient();

    // Local in-browser event listener
    const localHandler = (e: any) => {
      if (e?.detail) {
        callback(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('prombo_platform_settings_change', localHandler);
    }

    if (!supabase || !isSupabaseConfigured()) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('prombo_platform_settings_change', localHandler);
        }
      };
    }

    try {
      const channel = supabase
        .channel(`platform_settings_realtime_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'platform_settings',
          },
          async (payload) => {
            console.log('[PROMBOT_DEBUG] Supabase Realtime received platform_settings change:', payload);
            const updated = await this.fetchPlatformSettings();
            callback(updated);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'system_config',
            filter: 'key=eq.platform_settings',
          },
          async () => {
            const updated = await this.fetchPlatformSettings();
            callback(updated);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        if (typeof window !== 'undefined') {
          window.removeEventListener('prombo_platform_settings_change', localHandler);
        }
      };
    } catch (err) {
      console.warn('Failed to subscribe to platform settings realtime channel:', err);
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('prombo_platform_settings_change', localHandler);
        }
      };
    }
  },

  // CONTENT & MEDIA SETTINGS
  getContentMediaSettings(): ContentMediaSettings {
    const platform = this.getPlatformSettings();
    return platform.contentMedia || DEFAULT_CONTENT_MEDIA_SETTINGS;
  },

  updateContentMediaSettings(settings: Partial<ContentMediaSettings>): ContentMediaSettings {
    const current = this.getContentMediaSettings();
    const updated: ContentMediaSettings = {
      ...current,
      ...settings,
      homePrompts: {
        ...current.homePrompts,
        ...(settings.homePrompts || {}),
      },
      community: {
        ...current.community,
        ...(settings.community || {}),
      },
    };
    this.updatePlatformSettings({ contentMedia: updated });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_content_media_settings_changed', { detail: updated }));
    }
    return updated;
  },

  // ADS & MONETIZATION ENGINE CONFIG
  getAdsConfig(): AdsEngineConfig {
    try {
      let stored = safeStorage.getItem(ADS_CONFIG_STORAGE_KEY);
      
      // Migrate from v1 cache if v2 not yet created
      if (!stored) {
        const oldV1 = safeStorage.getItem('prombo_ads_engine_v1');
        if (oldV1) {
          try {
            const parsedOld = JSON.parse(oldV1);
            const migratedSlots = { ...DEFAULT_ADS_CONFIG.slots };
            if (parsedOld.slots) {
              for (const [key, slot] of Object.entries(parsedOld.slots as Record<string, any>)) {
                const sid = key as AdSlotId;
                if (migratedSlots[sid]) {
                  const snippet = slot.codeSnippet || '';
                  const isLegacyHardcoded = snippet.includes('550px') || snippet.includes('min-height: 500px') || snippet.includes('height: 550px');
                  migratedSlots[sid] = {
                    ...migratedSlots[sid],
                    ...slot,
                    codeSnippet: isLegacyHardcoded ? DEFAULT_ADS_CONFIG.slots[sid].codeSnippet : snippet,
                  };
                }
              }
            }
            const migratedConfig: AdsEngineConfig = {
              masterEnabled: parsedOld.masterEnabled ?? true,
              slots: migratedSlots,
            };
            safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(migratedConfig));
            return migratedConfig;
          } catch {
            // fallback to default
          }
        }
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        return mergeAdsConfig(parsed);
      }
      safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_ADS_CONFIG));
      return DEFAULT_ADS_CONFIG;
    } catch {
      return DEFAULT_ADS_CONFIG;
    }
  },

  /**
   * Save Ads Config to local storage and perform remote upsert to Supabase table `ads_config`
   */
  saveAdsConfig(config: AdsEngineConfig): AdsEngineConfig {
    // Keep gridNative slot in sync with homeFeedEnabled and homeFeedSnippet
    if (config.slots?.gridNative) {
      if (typeof config.homeFeedEnabled === 'boolean') {
        config.slots.gridNative.isEnabled = config.homeFeedEnabled;
      }
      if (config.homeFeedSnippet && config.homeFeedSnippet.trim()) {
        config.slots.gridNative.codeSnippet = config.homeFeedSnippet;
      }
    }

    safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(config));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_ads_config_changed', { detail: config }));
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        (async () => {
          try {
            const payload = {
              key: 'default',
              value: config,
              updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
              .from('ads_config')
              .upsert([payload], { onConflict: 'key' });

            if (error) {
              console.warn('[StorageService.saveAdsConfig] ads_config upsert error:', error);
              // Fallback to legacy ads_settings table
              await SupabaseDbService.saveAdsConfig(config).catch(() => {});
            }
          } catch (err) {
            console.warn('[StorageService.saveAdsConfig] Exception during remote upsert:', err);
            await SupabaseDbService.saveAdsConfig(config).catch(() => {});
          }
        })();
      }
    }

    return config;
  },

  /**
   * Fetch Ads Config from Supabase `ads_config` table (with fallback to `ads_settings` and local storage)
   */
  async fetchAdsConfig(): Promise<AdsEngineConfig> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        // 1. Query dedicated ads_config table
        const { data: acData, error: acError } = await supabase
          .from('ads_config')
          .select('*')
          .limit(1);

        if (!acError && acData && acData.length > 0) {
          const row = acData[0];
          const raw = row.value || row.config || row.settings || row.data || row;
          const merged = mergeAdsConfig(raw);
          safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(merged));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('prombo_ads_config_changed', { detail: merged }));
          }
          return merged;
        }

        // 2. Fallback to ads_settings table (key = 'ads_config')
        const legacyAds = await SupabaseDbService.getAdsConfig();
        if (legacyAds) {
          const merged = mergeAdsConfig(legacyAds);
          safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(merged));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('prombo_ads_config_changed', { detail: merged }));
          }
          return merged;
        }
      } catch (err) {
        console.warn('Failed to fetch ads config from Supabase:', err);
      }
    }
    return this.getAdsConfig();
  },

  /**
   * Subscribe to live postgres_changes for ads config
   */
  subscribeToAdsConfig(callback: (config: AdsEngineConfig) => void): () => void {
    const supabase = getSupabaseClient();

    // Local in-browser event listener
    const localHandler = (e: any) => {
      if (e?.detail) {
        callback(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('prombo_ads_config_changed', localHandler);
    }

    if (!supabase || !isSupabaseConfigured()) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('prombo_ads_config_changed', localHandler);
        }
      };
    }

    try {
      const channel = supabase
        .channel(`ads_config_realtime_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ads_config',
          },
          async (payload) => {
            console.log('[PROMBOT_DEBUG] Supabase Realtime received ads_config change:', payload);
            const updated = await this.fetchAdsConfig();
            callback(updated);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ads_settings',
            filter: 'key=eq.ads_config',
          },
          async () => {
            const updated = await this.fetchAdsConfig();
            callback(updated);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        if (typeof window !== 'undefined') {
          window.removeEventListener('prombo_ads_config_changed', localHandler);
        }
      };
    } catch (err) {
      console.warn('Failed to subscribe to ads config realtime channel:', err);
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('prombo_ads_config_changed', localHandler);
        }
      };
    }
  },

  /**
   * Safely records and increments click count for a given feed ad slot
   */
  recordFeedAdClick(slotId: string): number {
    try {
      const config = this.getAdsConfig();
      let updatedCount = 0;
      let slotFound = false;

      if (config.homeSlots && config.homeSlots[slotId]) {
        const slot = config.homeSlots[slotId];
        slot.clickCount = (slot.clickCount || 0) + 1;
        updatedCount = slot.clickCount;
        slotFound = true;
      } else if (config.communitySlots && config.communitySlots[slotId]) {
        const slot = config.communitySlots[slotId];
        slot.clickCount = (slot.clickCount || 0) + 1;
        updatedCount = slot.clickCount;
        slotFound = true;
      }

      if (slotFound) {
        this.saveAdsConfig(config);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('prombo_ads_click_recorded', {
              detail: { slotId, clickCount: updatedCount, config },
            })
          );
        }
        return updatedCount;
      }
    } catch (err) {
      console.warn('StorageService.recordFeedAdClick error:', err);
    }
    return 0;
  },

  /**
   * Resets feed ad clicks (for a single slot or all 20 slots)
   */
  resetFeedAdClicks(slotId?: string): void {
    try {
      const config = this.getAdsConfig();
      if (slotId) {
        if (config.homeSlots && config.homeSlots[slotId]) {
          config.homeSlots[slotId].clickCount = 0;
        }
        if (config.communitySlots && config.communitySlots[slotId]) {
          config.communitySlots[slotId].clickCount = 0;
        }
      } else {
        if (config.homeSlots) {
          Object.values(config.homeSlots).forEach((s: FeedAdSlotConfig) => {
            s.clickCount = 0;
          });
        }
        if (config.communitySlots) {
          Object.values(config.communitySlots).forEach((s: FeedAdSlotConfig) => {
            s.clickCount = 0;
          });
        }
      }
      this.saveAdsConfig(config);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prombo_ads_config_changed', { detail: config }));
      }
    } catch (err) {
      console.warn('StorageService.resetFeedAdClicks error:', err);
    }
  },

  /**
   * Normalizes slot key aliases to standard AdSlotId
   */
  normalizeGlobalSlotId(slotKey: string): AdSlotId | null {
    if (!slotKey) return null;
    const clean = slotKey.trim();
    if (clean === 'popup' || clean === 'popupEntry') return 'popupEntry';
    if (clean === 'header' || clean === 'headerBanner') return 'headerBanner';
    if (clean === 'footer' || clean === 'footerBanner') return 'footerBanner';
    if (clean === 'sidebarLeft') return 'sidebarLeft';
    if (clean === 'sidebarRight') return 'sidebarRight';
    if (clean === 'onCopyPrompt') return 'onCopyPrompt';
    if (clean === 'onSubmitPrompt') return 'onSubmitPrompt';
    if (clean === 'gridNative') return 'gridNative';
    return null;
  },

  /**
   * Safely records and increments click count for any global ad slot
   */
  recordGlobalAdClick(slotKey: string): number {
    try {
      const config = this.getAdsConfig();
      const slotId = this.normalizeGlobalSlotId(slotKey);
      if (slotId && config.slots[slotId]) {
        const slot = config.slots[slotId];
        slot.clickCount = (slot.clickCount || 0) + 1;
        this.saveAdsConfig(config);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('prombo_ads_click_recorded', {
              detail: { slotId, clickCount: slot.clickCount, config, isGlobal: true },
            })
          );
        }
        return slot.clickCount;
      }
    } catch (err) {
      console.warn('StorageService.recordGlobalAdClick error:', err);
    }
    return 0;
  },

  /**
   * Resets global ad clicks (for a single slot or all global slots)
   */
  resetGlobalAdClicks(slotKey?: string): void {
    try {
      const config = this.getAdsConfig();
      if (slotKey) {
        const slotId = this.normalizeGlobalSlotId(slotKey);
        if (slotId && config.slots[slotId]) {
          config.slots[slotId].clickCount = 0;
        }
      } else {
        Object.keys(config.slots).forEach((key) => {
          const sid = key as AdSlotId;
          if (config.slots[sid]) {
            config.slots[sid].clickCount = 0;
          }
        });
      }
      this.saveAdsConfig(config);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prombo_ads_config_changed', { detail: config }));
      }
    } catch (err) {
      console.warn('StorageService.resetGlobalAdClicks error:', err);
    }
  },

  setMasterAdsEnabled(enabled: boolean): boolean {
    const config = this.getAdsConfig();
    config.masterEnabled = enabled;
    this.saveAdsConfig(config);
    return enabled;
  },

  updateAdSlot(slotId: AdSlotId, slotConfig: Partial<AdSlotConfig>): AdsEngineConfig {
    const config = this.getAdsConfig();
    if (config.slots[slotId]) {
      config.slots[slotId] = {
        ...config.slots[slotId],
        ...slotConfig,
      };
      safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
    return config;
  },

  // BACKUP & EXPORT / IMPORT
  exportBackupJSON(): string {
    const data = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      prompts: this.getPrompts(),
      categories: this.getCategories(),
      favorites: this.getFavorites(),
      settings: this.getPlatformSettings(),
      adsConfig: this.getAdsConfig(),
    };
    return JSON.stringify(data, null, 2);
  },

  importBackupJSON(jsonStr: string): { success: boolean; message: string; count?: number } {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid JSON structure' };
      }

      if (!Array.isArray(data.prompts) || !Array.isArray(data.categories)) {
        return { success: false, message: 'Invalid backup file: prompts and categories arrays are required' };
      }

      // Schema validation and sanitization for prompts
      const validatedPrompts: Prompt[] = data.prompts
        .filter((p: any) => p && typeof p === 'object' && typeof p.title === 'string' && typeof p.prompt === 'string')
        .map((p: any) => ({
          id: String(p.id || `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
          title: String(p.title).trim(),
          description: String(p.description || ''),
          prompt: String(p.prompt),
          categoryId: String(p.categoryId || 'vibe-coding'),
          subcategory: String(p.subcategory || ''),
          tags: Array.isArray(p.tags) ? p.tags.map((t: any) => String(t)) : [],
          targetModel: String(p.targetModel || 'General AI'),
          author: String(p.author || 'Community Contributor'),
          authorEmail: p.authorEmail ? String(p.authorEmail) : '',
          status: (p.status === 'pending' || p.status === 'rejected' || p.status === 'approved') ? p.status : 'approved',
          submittedAt: String(p.submittedAt || new Date().toISOString()),
          isFeatured: Boolean(p.isFeatured),
          copyCount: Number(p.copyCount) || 0,
          imageUrl: p.imageUrl ? sanitizeUrl(String(p.imageUrl)) : undefined,
          imageThumbnailUrl: p.imageThumbnailUrl ? sanitizeUrl(String(p.imageThumbnailUrl)) : undefined,
          variables: Array.isArray(p.variables) ? p.variables : [],
          parameters: typeof p.parameters === 'object' && p.parameters ? p.parameters : {},
          tips: Array.isArray(p.tips) ? p.tips : [],
          createdAt: String(p.createdAt || new Date().toISOString()),
          updatedAt: String(p.updatedAt || new Date().toISOString()),
        }));

      // Schema validation and sanitization for categories
      const validatedCategories: Category[] = data.categories
        .filter((c: any) => c && typeof c === 'object' && typeof c.id === 'string' && typeof c.name === 'string')
        .map((c: any) => ({
          id: String(c.id).trim(),
          name: String(c.name).trim(),
          nameAr: c.nameAr ? String(c.nameAr).trim() : undefined,
          icon: String(c.icon || 'Bookmark'),
          description: String(c.description || ''),
          descriptionAr: c.descriptionAr ? String(c.descriptionAr) : undefined,
          count: Number(c.count) || 0,
          subcategories: Array.isArray(c.subcategories) ? c.subcategories.map((s: any) => String(s)) : [],
        }));

      safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(validatedPrompts));
      safeStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(validatedCategories));

      if (Array.isArray(data.favorites)) {
        const validFavorites = data.favorites.filter((f: any) => typeof f === 'string');
        safeStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(validFavorites));
      }
      if (data.settings && typeof data.settings === 'object') {
        safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...data.settings }));
      }
      if (data.adsConfig && typeof data.adsConfig === 'object') {
        const safeAdsConfig: AdsEngineConfig = {
          masterEnabled: Boolean(data.adsConfig.masterEnabled ?? true),
          slots: { ...DEFAULT_ADS_CONFIG.slots },
        };
        if (data.adsConfig.slots && typeof data.adsConfig.slots === 'object') {
          Object.entries(data.adsConfig.slots).forEach(([key, slot]: [string, any]) => {
            const slotId = key as AdSlotId;
            if (safeAdsConfig.slots[slotId] && slot && typeof slot === 'object') {
              safeAdsConfig.slots[slotId] = {
                ...safeAdsConfig.slots[slotId],
                ...slot,
                codeSnippet: sanitizeAdSnippet(slot.codeSnippet || safeAdsConfig.slots[slotId].codeSnippet),
              };
            }
          });
        }
        safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(safeAdsConfig));
      }

      return {
        success: true,
        message: `Successfully imported ${validatedPrompts.length} prompts and ${validatedCategories.length} categories!`,
        count: validatedPrompts.length,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to parse JSON file' };
    }
  },

  resetToDefault(): void {
    safeStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(INITIAL_PROMPTS));
    safeStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES));
    safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    safeStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_ADS_CONFIG));
    safeStorage.removeItem(FAVORITES_STORAGE_KEY);
  }
};
