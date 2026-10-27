import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Search, RotateCcw, X, Headphones } from 'lucide-react';
import { Prompt, Category, ToastNotification, PlatformSettings, PromptStatus, AdsEngineConfig, AdSlotConfig, SiteSettings, CommunityUser } from './types';
import { StorageService } from './services/storage';
import { CommunityService } from './services/communityService';
import { AnalyticsService } from './services/analyticsService';
import { AppProvider, useApp } from './context/AppContext';
import { GuestRestrictionProvider, useGuestRestriction } from './context/GuestRestrictionContext';
import { ReportModalProvider } from './context/ReportModalContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { DesktopFilterSidebar } from './components/DesktopFilterSidebar';
import { MobileFilterDropdown } from './components/MobileFilterDropdown';
import { PromptCard } from './components/PromptCard';
import { ToastContainer } from './components/Toast';
import { BottomNavBar } from './components/BottomNavBar';
import { AdSlotRenderer } from './components/ads/AdSlotRenderer';
import { DismissableAdWrapper } from './components/ads/DismissableAdWrapper';
import { AdBanner } from './components/ads/AdBanner';
import { NativeFeedAdCard } from './components/ads/NativeFeedAdCard';
import { ShareButtons } from './components/ShareButtons';
import { AuthService } from './services/authService';
import { SupportService } from './services/supportService';
import { canDisplayModalAd } from './utils/adsUtils';
import { isAdminUser, isAdminEmail } from './utils/authUtils';
import { getSupabaseClient, isSupabaseConfigured } from './services/supabaseClient';
import { SoundNotificationService } from './services/soundNotificationService';
import { BrowserNotificationService } from './services/browserNotificationService';
import { updateDocumentMetadata } from './utils/seoUtils';
import { matchesHomeSearch } from './utils/searchEngine';
import { copyTextToClipboard } from './utils/slugUtils';
import { AuthDrawer } from './components/AuthDrawer';

// Code-split dynamic imports for heavy views & modals (Phase 2 optimization)
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminLoginModal = lazy(() => import('./components/admin/AdminLoginModal').then(m => ({ default: m.AdminLoginModal })));
const PromptEditorModal = lazy(() => import('./components/admin/PromptEditorModal').then(m => ({ default: m.PromptEditorModal })));
const PublicAddPromptModal = lazy(() => import('./components/PublicAddPromptModal').then(m => ({ default: m.PublicAddPromptModal })));
const CommunityFeed = lazy(() => import('./components/community/CommunityFeed').then(m => ({ default: m.CommunityFeed })));
const PromptCommentModal = lazy(() => import('./components/community/PromptCommentModal').then(m => ({ default: m.PromptCommentModal })));
const VariableModal = lazy(() => import('./components/VariableModal').then(m => ({ default: m.VariableModal })));
const AdModal = lazy(() => import('./components/ads/AdModal').then(m => ({ default: m.AdModal })));
const SupportChatModal = lazy(() => import('./components/support/SupportChatModal').then(m => ({ default: m.SupportChatModal })));

function MainApp() {
  const { t, language, theme, toggleLanguage, toggleTheme, isRTL } = useApp();
  const {
    isGuest,
    openAuthModal,
    isAuthDrawerOpen,
    setIsAuthDrawerOpen,
    openAuthDrawer,
    closeAuthDrawer,
    authDrawerMode,
    authDrawerEmail,
    handleAuthSuccess,
  } = useGuestRestriction();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() =>
    StorageService.getPlatformSettings()
  );
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() =>
    CommunityService.getSiteSettings()
  );
  const [adsConfig, setAdsConfig] = useState<AdsEngineConfig>(() => StorageService.getAdsConfig());
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());

  // Dismissed Feed Native Ad Slots (with localStorage persistence)
  const [dismissedFeedAds, setDismissedFeedAds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('prombo_dismissed_feed_ads');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleDismissFeedAd = useCallback((adId: string) => {
    setDismissedFeedAds((prev) => {
      const updated = new Set(prev);
      updated.add(adId);
      try {
        localStorage.setItem('prombo_dismissed_feed_ads', JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });
  }, []);

  // Sync adsConfig when ads settings or click counts change
  useEffect(() => {
    const handleAdsConfigSync = () => {
      setAdsConfig(StorageService.getAdsConfig());
    };
    window.addEventListener('prombo_ads_config_changed', handleAdsConfigSync);
    window.addEventListener('prombo_ads_click_recorded', handleAdsConfigSync);
    return () => {
      window.removeEventListener('prombo_ads_config_changed', handleAdsConfigSync);
      window.removeEventListener('prombo_ads_click_recorded', handleAdsConfigSync);
    };
  }, []);

  // Live Technical Support Chat Modal & unread notification
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [unreadUserSupportCount, setUnreadUserSupportCount] = useState<number>(0);

  useEffect(() => {
    const updateSupportCount = () => {
      const user = AuthService.getCurrentUser();
      const uid = user ? user.id : 'user-guest-support';
      setUnreadUserSupportCount(SupportService.getUnreadCountForUser(uid));
    };
    updateSupportCount();
    const unsubscribe = SupportService.subscribe(updateSupportCount);
    return () => unsubscribe();
  }, [currentUser]);

  // Ad Popups & Triggers
  const [isEntryAdOpen, setIsEntryAdOpen] = useState(false);
  const [isTriggeredAdOpen, setIsTriggeredAdOpen] = useState(false);
  const [triggeredAdSlot, setTriggeredAdSlot] = useState<any>(null);

  // Navigation & Admin
  const [currentView, setCurrentView] = useState<'home' | 'community' | 'admin'>('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Strict role-based admin check: checks persistent admin session in safeStorage, in-memory state, and community user profile
  const isUserAdmin = (() => {
    const adminSession = StorageService.getCurrentSession();
    if (StorageService.isLoggedIn() && adminSession?.role === 'admin' && isAdminEmail(adminSession.email)) {
      return true;
    }
    if (isAdminLoggedIn) {
      if (currentUser && !currentUser.isGuest && isAdminUser(currentUser)) {
        return true;
      }
      if (adminSession && isAdminEmail(adminSession.email)) {
        return true;
      }
    }
    if (currentUser) {
      if (currentUser.isGuest) return false;
      return isAdminUser(currentUser);
    }
    return false;
  })();

  // SEC-05: Strict route guard for /admin route
  useEffect(() => {
    if (currentView === 'admin' && !isUserAdmin) {
      try {
        window.history.replaceState(null, '', '/');
      } catch (e) {}
      setCurrentView('home');
      setIsAdminModalOpen(true);
    }
  }, [currentView, isUserAdmin]);

  // Modals & Drawers state
  const [isPublicAddModalOpen, setIsPublicAddModalOpen] = useState(false);
  const [commentingPrompt, setCommentingPrompt] = useState<Prompt | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [communityPostsCount, setCommunityPostsCount] = useState<number>(0);
  
  // Advanced header search filter drawer/bar collapsed (hidden) by default as requested
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);

  // Filters: Chronological order by newest first by default
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'title'>('newest');

  // Home Feed Grid Columns Controller (1, 2, 3, 4 - Priority Fallback: User Preference -> Admin Platform Setting)
  const [gridColumns, setGridColumns] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      // 1. High Priority: Explicit User Preference (overrides platform default strictly for this user)
      const userPref = localStorage.getItem('prombo_user_grid_preference');
      if (userPref) {
        const num = parseInt(userPref, 10);
        if ([1, 2, 3, 4].includes(num)) {
          return window.innerWidth < 768 ? 1 : num;
        }
      }

      // 2. Platform Admin Setting (system_settings)
      const platformCols = StorageService.getPlatformSettings().appearance?.homeGridColumns;
      if (platformCols && [1, 2, 3, 4].includes(platformCols)) {
        return window.innerWidth < 768 ? 1 : platformCols;
      }

      // 3. Saved device layout preference
      const saved = localStorage.getItem('prombo_home_grid_columns');
      if (saved) {
        const num = parseInt(saved, 10);
        if ([1, 2, 3, 4].includes(num)) return window.innerWidth < 768 ? 1 : num;
      }

      return window.innerWidth < 768 ? 1 : 3;
    }
    return 3;
  });

  useEffect(() => {
    // When a user selects their layout preference in AuthDrawer
    const handleUserGridChange = (e: any) => {
      if (e.detail?.columns && [1, 2, 3, 4].includes(e.detail.columns)) {
        setGridColumns(window.innerWidth < 768 ? 1 : e.detail.columns);
      }
    };

    // When Admin updates the platform default:
    // If the user has NOT explicitly locked a personal preference, immediately apply the Admin's platform default!
    const handlePlatformAppearanceChange = (e: any) => {
      const userPref = localStorage.getItem('prombo_user_grid_preference');
      if (!userPref && e.detail?.homeGridColumns && [1, 2, 3, 4].includes(e.detail.homeGridColumns)) {
        setGridColumns(window.innerWidth < 768 ? 1 : e.detail.homeGridColumns);
      }
    };

    window.addEventListener('prombo_grid_columns_change', handleUserGridChange);
    window.addEventListener('prombo_appearance_settings_change', handlePlatformAppearanceChange);
    return () => {
      window.removeEventListener('prombo_grid_columns_change', handleUserGridChange);
      window.removeEventListener('prombo_appearance_settings_change', handlePlatformAppearanceChange);
    };
  }, []);

  // Variable modal state
  const [variablePrompt, setVariablePrompt] = useState<Prompt | null>(null);
  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [highlightedPromptId, setHighlightedPromptId] = useState<string | null>(null);
  const [deepLinkPostId, setDeepLinkPostId] = useState<string | null>(null);

  // Dynamic OpenGraph, Twitter, and document head metadata updater
  useEffect(() => {
    if (isVarModalOpen && variablePrompt) {
      updateDocumentMetadata({
        language,
        promptTitle: variablePrompt.title,
        promptDescription: variablePrompt.description,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
    } else if (currentView === 'community') {
      const commTitle = language === 'ar' ? 'مجتمع برومبو' : 'Prombo Community';
      updateDocumentMetadata({
        language,
        pageTitle: commTitle,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
    } else {
      updateDocumentMetadata({
        language,
        url: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
    }
  }, [language, isVarModalOpen, variablePrompt, currentView]);

  // Load initial data from StorageService & CommunityService
  const loadData = () => {
    setPrompts(StorageService.getPrompts());
    setCategories(StorageService.getCategories());
    setFavorites(StorageService.getFavorites());
    setIsAdminLoggedIn(StorageService.isLoggedIn());
    setPlatformSettings(StorageService.getPlatformSettings());
    setAdsConfig(StorageService.getAdsConfig());
    setSiteSettings(CommunityService.getSiteSettings());
    const counts = CommunityService.getCommunityCounts();
    setCommunityPostsCount(counts.totalPosts);
  };

  // Track page views on route switch
  useEffect(() => {
    AnalyticsService.trackPageView(currentView);
  }, [currentView]);

  // Initialize Realtime Sound Notification System & First Interaction Browser Permission
  useEffect(() => {
    SoundNotificationService.init();
    BrowserNotificationService.initFirstInteractionPermissionRequest();
  }, []);

  // Synchronize authentic state from Supabase on mount when connected
  useEffect(() => {
    if (isSupabaseConfigured()) {
      StorageService.fetchPrompts().then((remotePrompts) => {
        if (remotePrompts && Array.isArray(remotePrompts)) {
          setPrompts(remotePrompts);
        }
      }).catch(() => {});

      StorageService.fetchCategories().then((remoteCategories) => {
        if (remoteCategories && Array.isArray(remoteCategories)) {
          setCategories(remoteCategories);
        }
      }).catch(() => {});
    }
  }, []);

  // Listen to auth & profile changes and realtime prompts updates
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      const user = e.detail || AuthService.getCurrentUser();
      setCurrentUser(user);
      if (user?.id && user?.name) {
        setPrompts((prev) =>
          prev.map((prompt) => {
            const isOwner = Boolean(
              (prompt.authorId && prompt.authorId === user.id) ||
              (prompt.author_id && prompt.author_id === user.id) ||
              (prompt.userId && prompt.userId === user.id)
            );
            if (isOwner) {
              return {
                ...prompt,
                author: user.name,
                authorAvatar: user.avatar || prompt.authorAvatar,
              };
            }
            return prompt;
          })
        );
      }
    };

    const handlePromptsChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPrompts(e.detail);
      } else {
        setPrompts(StorageService.getPrompts());
      }
    };

    window.addEventListener('prombo_auth_change', handleAuthChange);
    window.addEventListener('prombo_prompts_change', handlePromptsChange);
    return () => {
      window.removeEventListener('prombo_auth_change', handleAuthChange);
      window.removeEventListener('prombo_prompts_change', handlePromptsChange);
    };
  }, []);

  // Listen to community settings broadcast
  useEffect(() => {
    const handleSettingsChange = (e: any) => {
      setSiteSettings(e.detail);
    };
    window.addEventListener('prombo_community_settings_change', handleSettingsChange);
    return () => window.removeEventListener('prombo_community_settings_change', handleSettingsChange);
  }, []);

  // Direct Route Protection: If community is disabled while currently on community view, redirect immediately to Home
  useEffect(() => {
    if (!siteSettings.communityEnabled && currentView === 'community') {
      try {
        if (window.location.pathname.startsWith('/community') || window.location.hash.startsWith('#community')) {
          window.history.replaceState(null, '', '/');
        }
      } catch (e) {}
      setCurrentView('home');
    }
  }, [siteSettings.communityEnabled, currentView]);

  // URL Route Detection for `/admin`, `#admin`, `#community`
  useEffect(() => {
    loadData();

    const checkRoute = async () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const isAdminRoute = path.startsWith('/admin') || hash === '#admin';
      const isCommunityRoute = path.startsWith('/community') || hash === '#community';

      // 1. Post deep link: /post/:id or #post-id or ?post=id
      let deepPostId = '';
      if (path.startsWith('/post/')) {
        deepPostId = decodeURIComponent(path.replace('/post/', '').split('/')[0]);
      } else if (hash.startsWith('#post-')) {
        deepPostId = decodeURIComponent(hash.replace('#post-', ''));
      } else {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const p = urlParams.get('post');
          if (p) deepPostId = p;
        } catch (e) {}
      }

      // 2. Prompt deep link: /prompt/:id or #prompt-id or ?prompt=id
      let deepPromptId = '';
      if (path.startsWith('/prompt/')) {
        deepPromptId = decodeURIComponent(path.replace('/prompt/', '').split('/')[0]);
      } else if (hash.startsWith('#prompt-')) {
        deepPromptId = decodeURIComponent(hash.replace('#prompt-', ''));
      } else {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const p = urlParams.get('prompt');
          if (p) deepPromptId = p;
        } catch (e) {}
      }

      if (isAdminRoute) {
        let isSessionValid = false;
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
              const email = (data.session.user.email || '').toLowerCase();
              const userRole = data.session.user.user_metadata?.role || data.session.user.app_metadata?.role;
              const existingProfile = AuthService.getAllProfiles().find(
                (p) => p.id === data.session.user.id || (p.email && p.email.toLowerCase() === email)
              );
              if (isAdminEmail(email) || userRole === 'admin' || existingProfile?.role === 'admin') {
                isSessionValid = true;
                setIsAdminLoggedIn(true);
              }
            }
          } catch {}
        } else {
          if (StorageService.isLoggedIn() && StorageService.getCurrentSession()?.role === 'admin') {
            isSessionValid = true;
          }
        }

        if (!isSessionValid) {
          try {
            window.history.replaceState(null, '', '/');
          } catch (e) {}
          setCurrentView('home');
          setIsAdminLoggedIn(false);
          setIsAdminModalOpen(true);
          return;
        }

        setIsAdminLoggedIn(true);
        setCurrentView('admin');
        setIsAdminModalOpen(false);
        return;
      } else if (deepPostId || isCommunityRoute) {
        const currentSettings = CommunityService.getSiteSettings();
        if (currentSettings.communityEnabled) {
          setCurrentView('community');
          setIsAdminModalOpen(false);
          if (deepPostId) {
            setDeepLinkPostId(deepPostId);
          }
        } else {
          // If a user attempts to access /community directly via the browser URL while disabled, redirect them immediately back to the Home page ('/')
          try {
            window.history.replaceState(null, '', '/');
          } catch (e) {}
          setCurrentView('home');
          setIsAdminModalOpen(false);
        }
      } else {
        setCurrentView('home');
        setIsAdminModalOpen(false);

        // Deep-linking support for direct prompt links (/prompt/xyz, #prompt-xyz, or ?prompt=xyz)
        if (deepPromptId) {
          const target = await StorageService.fetchPromptById(deepPromptId);
          if (target && target.status !== 'inactive') {
            setSearchQuery('');
            setSelectedTag('');
            setOnlyFavorites(false);
            setSelectedCategoryId('');
            setHighlightedPromptId(deepPromptId);
            setVariablePrompt(target);
            setIsVarModalOpen(true);
            setTimeout(() => {
              const card = document.getElementById(`prompt-card-${deepPromptId}`);
              if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
            setTimeout(() => {
              setHighlightedPromptId((curr) => (curr === deepPromptId ? null : curr));
            }, 5000);
          } else {
            showToast(t('promptUnavailable'), 'error');
          }
        }
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // Entry Pop-up Ad trigger (Strictly suppressed on Admin routes and views)
  useEffect(() => {
    // Check if on Admin route or view
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const isAdminRoute = currentView === 'admin' || path.startsWith('/admin') || path.includes('/admin') || hash === '#admin' || hash.startsWith('#admin');
    if (isAdminRoute) {
      return;
    }

    const cfg = StorageService.getAdsConfig();
    if (cfg.masterEnabled && canDisplayModalAd(cfg.slots.popupEntry)) {
      const delay = (cfg.slots.popupEntry.delaySeconds ?? 1) * 1000;
      const timer = setTimeout(() => {
        // Double-check path and view before triggering
        const currPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const currHash = typeof window !== 'undefined' ? window.location.hash : '';
        if (currentView === 'admin' || currPath.startsWith('/admin') || currPath.includes('/admin') || currHash === '#admin' || currHash.startsWith('#admin')) {
          return;
        }
        setIsEntryAdOpen(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Toast Notification Helper
  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success',
    duration: number = 3500,
    customClass?: string,
    messageKey?: string,
    params?: Record<string, any>
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = { id, message, type, customClass, duration, messageKey, params };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  // Listen to global prombo_toast events
  useEffect(() => {
    const handleGlobalToast = (e: any) => {
      if (e.detail?.message || e.detail?.messageKey) {
        const rawMsg = e.detail.messageKey ? (t(e.detail.messageKey, e.detail.params) || e.detail.message || '') : (e.detail.message || '');
        showToast(
          rawMsg,
          e.detail.type || 'success',
          e.detail.duration || 3500,
          e.detail.customClass,
          e.detail.messageKey,
          e.detail.params
        );
      }
    };
    window.addEventListener('prombo_toast', handleGlobalToast);
    return () => window.removeEventListener('prombo_toast', handleGlobalToast);
  }, [t]);

  const handleDisabledCommentClick = () => {
    showToast(
      t.toastCommunityDisabled || 'Community feature is currently disabled',
      'error',
      3000,
      'border-red-500 text-red-500 bg-red-50 dark:bg-red-950/30',
      'toastCommunityDisabled'
    );
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Public prompt submission handler
  const handleOpenAddPrompt = () => {
    const user = AuthService.getCurrentUser();
    if (!user || user.isGuest || isGuest) {
      showToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة برومبت جديد'
          : 'Registration is required to add new prompts',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    if (user.isBanned) {
      showToast(
        language === 'ar'
          ? 'تم تقييد حسابك من قبل الإدارة. لا يمكنك إضافة أو نشر أوامر برومبت جديدة.'
          : 'Your account has been restricted by administration. You cannot publish new prompts.',
        'error'
      );
      return;
    }

    setIsPublicAddModalOpen(true);
  };

  const handlePublicSubmit = (promptData: Partial<Prompt>) => {
    const user = AuthService.getCurrentUser();
    if (!user || user.isGuest || isGuest) {
      showToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب لإرسال البرومبت للمراجعة'
          : 'Registration is required to submit prompts',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    if (user.isBanned) {
      showToast(
        language === 'ar'
          ? 'تم تقييد حسابك من قبل الإدارة. لا يمكنك إرسال أوامر للنشر.'
          : 'Your account has been restricted by administration. You cannot submit prompts.',
        'error'
      );
      return;
    }

    const settings = StorageService.getPlatformSettings();
    const initialStatus: PromptStatus = settings.requireAdminApproval ? 'pending' : 'approved';
    StorageService.addPrompt({
      ...promptData,
      status: initialStatus,
      submittedAt: new Date().toISOString(),
    });
    loadData();

    // Trigger ad on submit prompt if configured
    const currentAds = StorageService.getAdsConfig();
    if (currentAds.masterEnabled && canDisplayModalAd(currentAds.slots.onSubmitPrompt)) {
      setTriggeredAdSlot(currentAds.slots.onSubmitPrompt);
      setIsTriggeredAdOpen(true);
    }

    if (initialStatus === 'approved') {
      showToast(
        language === 'ar' ? 'تم النشر' : (t('toastPromptPublished') || 'Published'),
        'success'
      );
    } else {
      showToast(t('publicSubmitSuccessAlert'), 'success');
    }
  };

  // Copy to clipboard handler
  const handleCopyPrompt = useCallback(async (text: string, promptId: string) => {
    try {
      await copyTextToClipboard(text);
      StorageService.incrementCopyCount(promptId);
      AnalyticsService.trackPromptCopy(promptId);
      loadData();
      showToast(t('copySuccess'), 'success');

      // Trigger ad on copy prompt if configured
      const currentAds = StorageService.getAdsConfig();
      if (currentAds.masterEnabled && canDisplayModalAd(currentAds.slots.onCopyPrompt)) {
        setTriggeredAdSlot(currentAds.slots.onCopyPrompt);
        setIsTriggeredAdOpen(true);
      }
    } catch (e) {
      showToast(t('copySuccess'), 'success');
    }
  }, [t]);

  // Favorites toggle handler
  const handleToggleFavorite = useCallback((id: string) => {
    const user = AuthService.getCurrentUser();
    if (!user || user.isGuest) {
      openAuthModal('signin');
      return;
    }
    const isFavNow = StorageService.toggleFavorite(id);
    setFavorites(StorageService.getFavorites());
    showToast(isFavNow ? t('favoriteAdded') : t('favoriteRemoved'), 'info');
  }, [openAuthModal, t]);

  // Open Variable Customizer
  const handleOpenVariables = useCallback((prompt: Prompt) => {
    setVariablePrompt(prompt);
    setIsVarModalOpen(true);
  }, []);

  // Tag filter selection
  const handleSelectTag = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev === tag ? '' : tag));
    setSelectedCategoryId('');
  }, []);

  // Open Comments Modal handler
  const handleOpenComments = useCallback((prompt: Prompt) => {
    setCommentingPrompt(prompt);
    setIsCommentModalOpen(true);
  }, []);

  // Navigation handlers
  const handleNavigateHome = () => {
    try {
      window.history.pushState(null, '', '/');
    } catch (e) {}
    setCurrentView('home');
    setIsAdminModalOpen(false);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleNavigateCommunity = () => {
    if (!siteSettings.communityEnabled) {
      handleDisabledCommentClick();
      return;
    }
    try {
      window.history.pushState(null, '', '/#community');
    } catch (e) {}
    setCurrentView('community');
    AnalyticsService.trackCommunityView('bottom_bar');
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleNavigateToPrompt = (promptId: string) => {
    const allPrompts = StorageService.getPrompts();
    const targetPrompt = prompts.find((p) => p.id === promptId) || allPrompts.find((p) => p.id === promptId);

    if (!targetPrompt || targetPrompt.status === 'inactive') {
      showToast(t('promptUnavailable'), 'error');
      return;
    }

    // 1. Reset any active filters so the target prompt is visible on Home
    setSearchQuery('');
    setSelectedTag('');
    setOnlyFavorites(false);
    setSelectedCategoryId('');

    // 2. Switch to Home view
    setCurrentView('home');
    setIsAdminModalOpen(false);

    // 3. Update canonical deep link
    try {
      window.history.pushState(null, '', `/prompt/${promptId}`);
    } catch (e) {}

    // 4. Highlight the target card and open its customization/details modal
    setHighlightedPromptId(promptId);
    setVariablePrompt(targetPrompt);
    setIsVarModalOpen(true);

    // 5. Smoothly scroll into view
    setTimeout(() => {
      const element = document.getElementById(`prompt-card-${promptId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    // 6. Reset highlight pulse after 5 seconds
    setTimeout(() => {
      setHighlightedPromptId((curr) => (curr === promptId ? null : curr));
    }, 5000);
  };

  const handleOpenPromptDetail = (promptId: string) => {
    const allPrompts = StorageService.getPrompts();
    const targetPrompt = prompts.find((p) => p.id === promptId) || allPrompts.find((p) => p.id === promptId);

    if (!targetPrompt || targetPrompt.status === 'inactive') {
      showToast(t('promptUnavailable'), 'error');
      return;
    }

    // Open full Prompt Detail Modal directly on top of the Community page without redirecting or scrolling away
    try {
      window.history.pushState(null, '', `/prompt/${promptId}`);
    } catch (e) {}
    setVariablePrompt(targetPrompt);
    setIsVarModalOpen(true);
  };

  const handleUpdateSiteSettings = async (settings: Partial<SiteSettings>) => {
    const updated = await CommunityService.updateSiteSettings(settings);
    setSiteSettings(updated);
    showToast(
      language === 'ar'
        ? 'تم تحديث إعدادات المجتمع بنجاح'
        : 'Community settings updated successfully',
      'success'
    );
  };

  const handleAdminLoginSuccess = () => {
    loadData();
    setIsAdminLoggedIn(true);
    setCurrentView('admin');
    setIsAdminModalOpen(false);
    try {
      window.history.pushState(null, '', '/admin');
    } catch (e) {}
    showToast(language === 'ar' ? 'مرحباً بك في لوحة تحكم المسؤول' : 'Welcome to the Admin Dashboard!', 'success');
  };

  const handleAdminLogout = async () => {
    await AuthService.signOut();
    setIsAdminLoggedIn(false);
    StorageService.logout();
    handleNavigateHome();
    try {
      window.history.replaceState(null, '', '/');
    } catch (e) {}
    setIsAdminModalOpen(true);
    showToast(
      language === 'ar'
        ? 'تم تسجيل الخروج وتدمير الجلسة بنجاح'
        : 'Logged out and session terminated',
      'info'
    );
  };

  // Ownership helper: checks if the given user is the explicit creator/owner of the prompt
  const isPromptOwner = (prompt: Prompt, user: CommunityUser | null): boolean => {
    if (!user || user.isGuest || !user.id) return false;
    return Boolean(
      (prompt.authorId && user.id === prompt.authorId) ||
      (prompt.author_id && user.id === prompt.author_id) ||
      (prompt.userId && user.id === prompt.userId) ||
      (user.email && prompt.authorEmail && user.email.toLowerCase().trim() === prompt.authorEmail.toLowerCase().trim())
    );
  };

  const handleDeletePrompt = useCallback((promptId: string) => {
    const targetPrompt = prompts.find((p) => p.id === promptId);
    if (!targetPrompt) return;

    const activeUser = currentUser || AuthService.getCurrentUser();
    const isOwner = isPromptOwner(targetPrompt, activeUser);
    const isAuthorized = isOwner || (currentView === 'admin' && isUserAdmin);

    if (!isAuthorized) {
      showToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    StorageService.deletePrompt(promptId, activeUser?.id, currentView === 'admin' && isUserAdmin);
    loadData();
    showToast(language === 'ar' ? 'تم حذف البرومبت بنجاح' : 'Prompt deleted successfully', 'info');
  }, [prompts, currentUser, currentView, isUserAdmin, language]);

  const handleTogglePromptStatus = useCallback((promptId: string, newStatus: PromptStatus) => {
    const targetPrompt = prompts.find((p) => p.id === promptId);
    if (!targetPrompt) return;

    const activeUser = currentUser || AuthService.getCurrentUser();
    const isOwner = isPromptOwner(targetPrompt, activeUser);
    const isAuthorized = isOwner || (currentView === 'admin' && isUserAdmin);

    if (!isAuthorized) {
      showToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    StorageService.updatePromptStatus(promptId, newStatus, activeUser?.id, currentView === 'admin' && isUserAdmin);
    loadData();
    showToast(
      language === 'ar' ? 'تم تحديث حالة البرومبت بنجاح' : 'Prompt status updated successfully',
      'success'
    );
  }, [prompts, currentUser, currentView, isUserAdmin, language]);

  // Prompt Editor Modal State (For Authors & Admins)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);

  const handleOpenPromptEditor = useCallback((prompt: Prompt) => {
    const activeUser = currentUser || AuthService.getCurrentUser();
    const isOwner = isPromptOwner(prompt, activeUser);
    const isAuthorized = isOwner || (currentView === 'admin' && isUserAdmin);

    if (!isAuthorized) {
      showToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    setEditingPrompt(prompt);
    setIsPromptEditorOpen(true);
  }, [currentUser, currentView, isUserAdmin, language]);

  const handleSavePrompt = (promptData: Partial<Prompt>) => {
    if (!editingPrompt) return;
    const targetPrompt = prompts.find((p) => p.id === editingPrompt.id) || editingPrompt;

    const activeUser = currentUser || AuthService.getCurrentUser();
    const isOwner = isPromptOwner(targetPrompt, activeUser);
    const isAuthorized = isOwner || (currentView === 'admin' && isUserAdmin);

    if (!isAuthorized) {
      showToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    const updated = StorageService.updatePrompt(editingPrompt.id, promptData, activeUser?.id, currentView === 'admin' && isUserAdmin);
    if (updated) {
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      loadData();
      showToast(
        language === 'ar' ? 'تم تحديث البرومبت بنجاح' : 'Prompt updated successfully',
        'success'
      );
    }
    setIsPromptEditorOpen(false);
    setEditingPrompt(null);
  };

  // Memoized prompt comment counts map (O(1) lookup, completely avoids N synchronous localStorage + JSON.parse calls in feed loop)
  const commentsCountMap = useMemo(() => {
    try {
      const posts = CommunityService.getLocalPosts();
      const map: Record<string, number> = {};
      for (let i = 0; i < posts.length; i++) {
        const p = posts[i];
        if (p.promptId && (p.status === 'active' || !p.status)) {
          map[p.promptId] = (map[p.promptId] || 0) + 1;
        }
      }
      return map;
    } catch {
      return {};
    }
  }, [communityPostsCount]);

  // Memoized category dictionary map for O(1) category lookups
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (let i = 0; i < categories.length; i++) {
      map.set(categories[i].id, categories[i]);
    }
    return map;
  }, [categories]);

  // Only show APPROVED prompts on the public library page (or all for admin, or own prompts for authors)
  const publicPrompts = useMemo(() => {
    if (isUserAdmin) return prompts;
    return prompts.filter((p) => {
      if (!p.status || p.status === 'approved') return true;
      // Authors can also see their own inactive/pending prompts
      if (currentUser && !currentUser.isGuest) {
        if (p.authorId && p.authorId === currentUser.id) return true;
        if (p.author_id && p.author_id === currentUser.id) return true;
        if (p.userId && p.userId === currentUser.id) return true;
        if (currentUser.email && p.authorEmail && currentUser.email.toLowerCase().trim() === p.authorEmail.toLowerCase().trim()) return true;
        if (currentUser.name && p.author && currentUser.name.toLowerCase().trim() === p.author.toLowerCase().trim()) return true;
      }
      return false;
    });
  }, [isUserAdmin, prompts, currentUser]);

  // Filter and Sort Prompts
  const filteredPrompts = useMemo(() => {
    return publicPrompts
      .filter((prompt) => {
        // Category filter
        if (selectedCategoryId && prompt.categoryId !== selectedCategoryId) {
          return false;
        }
        // Favorites filter
        if (onlyFavorites && !favorites.includes(prompt.id)) {
          return false;
        }
        // Tag filter
        if (selectedTag && !prompt.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }
        // Search query filter (Smart Contextual Fuzzy & Tokenized Search)
        if (searchQuery.trim()) {
          if (!matchesHomeSearch(prompt, categories, searchQuery)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          return (b.copyCount || 0) - (a.copyCount || 0);
        }
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.title.localeCompare(b.title);
      });
  }, [publicPrompts, selectedCategoryId, onlyFavorites, favorites, selectedTag, searchQuery, categories, sortBy]);

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white transition-colors duration-200">
      {/* Sticky Navigation Bar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigateToHome={handleNavigateHome}
        onOpenAddPrompt={handleOpenAddPrompt}
        onOpenAuthDrawer={() => openAuthDrawer('signin')}
        currentView={currentView}
        allowPublicSubmissions={platformSettings.allowPublicSubmissions}
      />

      {/* Main View Router */}
      {currentView === 'admin' ? (
        isUserAdmin ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <AdminDashboard
              prompts={prompts}
              categories={categories}
              siteSettings={siteSettings}
              onUpdateSiteSettings={handleUpdateSiteSettings}
              onRefreshData={loadData}
              onNavigateHome={handleNavigateHome}
              onShowToast={showToast}
              onLogout={handleAdminLogout}
            />
          </Suspense>
        ) : null
      ) : currentView === 'community' ? (
        <main className="flex-1 pb-24 relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <CommunityFeed
              prompts={publicPrompts}
              categories={categories}
              siteSettings={siteSettings}
              onCopyPrompt={handleCopyPrompt}
              onShowToast={showToast}
              onNavigateToPrompt={handleNavigateToPrompt}
              onOpenPromptDetail={handleOpenPromptDetail}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              initialPostId={deepLinkPostId}
            />
          </Suspense>
        </main>
      ) : (
        <main className="flex-1 pb-24 relative">
          {/* Left Skyscraper Ad Slot (Wide Screens) */}
          <div className="hidden 2xl:block fixed left-4 top-28 z-20 pointer-events-auto w-[160px] 3xl:w-[200px] h-fit">
            <DismissableAdWrapper
              slot={adsConfig.slots.sidebarLeft}
              masterEnabled={adsConfig.masterEnabled}
              slotType="skyscraper"
              className="w-full h-fit"
            />
          </div>

          {/* Right Skyscraper Ad Slot (Wide Screens) */}
          <div className="hidden 2xl:block fixed right-4 top-28 z-20 pointer-events-auto w-[160px] 3xl:w-[200px] h-fit">
            <DismissableAdWrapper
              slot={adsConfig.slots.sidebarRight}
              masterEnabled={adsConfig.masterEnabled}
              slotType="skyscraper"
              className="w-full h-fit"
            />
          </div>

          {/* Hero Section */}
          <Hero />

          {/* Top Leaderboard Header Ad Banner (Compact Horizontal IAB Leaderboard) */}
          {Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true') &&
            Boolean(
              adsConfig?.slots?.headerBanner?.isEnabled === undefined ||
              adsConfig?.slots?.headerBanner?.isEnabled === true ||
              String(adsConfig?.slots?.headerBanner?.isEnabled) === 'true'
            ) && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-2 flex justify-center w-full h-fit">
                <AdBanner
                  slot={adsConfig?.slots?.headerBanner || { id: 'headerBanner', isEnabled: true, codeSnippet: '' }}
                  masterEnabled={Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true')}
                  slotType="banner"
                  className="w-full"
                />
              </div>
          )}

          {/* Library Content Section with Responsive Filter Layout */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Desktop & Tablet Sticky Sidebar Filter (Hanging/sticky on the side, with Favorites as 2nd choice) */}
              <DesktopFilterSidebar
                isOpen={isDesktopSidebarOpen}
                onToggleOpen={() => setIsDesktopSidebarOpen((prev) => !prev)}
                categories={categories}
                prompts={publicPrompts}
                selectedCategoryId={selectedCategoryId}
                onlyFavorites={onlyFavorites}
                favoritesCount={favorites.length}
                sortBy={sortBy}
                onChangeSortBy={setSortBy}
                onSelectCategory={(catId) => {
                  setSelectedCategoryId(catId);
                  setSelectedTag('');
                }}
                onToggleOnlyFavorites={() => {
                  setOnlyFavorites(!onlyFavorites);
                  setSelectedCategoryId('');
                  setSelectedTag('');
                }}
                onResetFilters={() => {
                  setSelectedCategoryId('');
                  setOnlyFavorites(false);
                  setSelectedTag('');
                  setSearchQuery('');
                }}
              />

              {/* Main Content & Prompts Grid */}
              <div className="flex-1 min-w-0 w-full space-y-4">
                {/* Mobile Search & Filter Header: In normal document flow, scrolls naturally with the feed */}
                <div className="md:hidden relative w-full flex items-center gap-2 mb-2">
                  {/* Filter Toggle Button & Active Controls (Anchored at start) */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <MobileFilterDropdown
                      categories={categories}
                      prompts={publicPrompts}
                      selectedCategoryId={selectedCategoryId}
                      onlyFavorites={onlyFavorites}
                      favoritesCount={favorites.length}
                      sortBy={sortBy}
                      onChangeSortBy={setSortBy}
                      onSelectCategory={(catId) => {
                        setSelectedCategoryId(catId);
                        setSelectedTag('');
                      }}
                      onToggleOnlyFavorites={() => {
                        setOnlyFavorites(!onlyFavorites);
                        setSelectedCategoryId('');
                        setSelectedTag('');
                      }}
                      onResetFilters={() => {
                        setSelectedCategoryId('');
                        setOnlyFavorites(false);
                        setSelectedTag('');
                        setSearchQuery('');
                      }}
                    />

                    {/* Active filters reset shortcut button */}
                    {(selectedCategoryId || onlyFavorites || selectedTag || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId('');
                          setOnlyFavorites(false);
                          setSelectedTag('');
                          setSearchQuery('');
                        }}
                        title={t('resetFilters')}
                        aria-label={t('resetFilters')}
                        className="p-2 rounded-xl bg-orange-100/80 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-300/60 dark:border-orange-500/40 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Permanently Visible Main Search Input */}
                  <div className="relative flex-1 min-w-0">
                    <Search
                      className={`w-4 h-4 text-slate-400 absolute ${
                        isRTL ? 'right-3' : 'left-3'
                      } top-1/2 -translate-y-1/2 pointer-events-none`}
                    />
                    <input
                      type="text"
                      id="mobile-home-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        language === 'ar'
                          ? 'بحث في العناوين، الوسوم، أو اسم الناشر...'
                          : 'Search titles, tags, or author...'
                      }
                      aria-label={language === 'ar' ? 'البحث في البرومبتات' : 'Search prompts'}
                      className={`w-full ${
                        isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'
                      } py-2 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 shadow-2xs`}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label={t('clearFilter')}
                        className={`absolute ${
                          isRTL ? 'left-2.5' : 'right-2.5'
                        } top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Tag Filter Indicator */}
                {selectedTag && (
                  <div className="flex items-center gap-2 p-2.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl text-xs text-orange-700 dark:text-orange-300">
                    <span>
                      {language === 'ar' ? 'تم التصفية حسب الوسم:' : 'Filtered by tag:'}{' '}
                      <strong>#{selectedTag}</strong>
                    </span>
                    <button
                      onClick={() => setSelectedTag('')}
                      className="ms-auto underline text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 cursor-pointer"
                    >
                      {t('clearFilter')}
                    </button>
                  </div>
                )}

                {/* Prompt Cards Grid */}
                {filteredPrompts.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-[#182232] rounded-2xl border border-slate-200 dark:border-[#2A384C] space-y-4 max-w-lg mx-auto shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {t('noPromptsFound')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('noPromptsSubtext')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategoryId('');
                        setSelectedTag('');
                        setOnlyFavorites(false);
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {t('resetFilters')}
                    </button>
                  </div>
                ) : (
                  <div
                    className={`grid ${
                      gridColumns === 1
                        ? 'grid-cols-1'
                        : gridColumns === 2
                        ? 'grid-cols-1 md:grid-cols-2'
                        : gridColumns === 3
                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    } gap-5`}
                  >
                    {(() => {
                      // 1. Collect all active, non-dismissed home ad slots in numerical order
                      const activeHomeSlots: { slotId: string; slotIndex: number; config: any }[] = [];
                      const isMaster = Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true');
                      const isHomeFeedEnabled = adsConfig?.homeFeedEnabled === undefined || adsConfig?.homeFeedEnabled === true || String(adsConfig?.homeFeedEnabled) === 'true';

                      if (isMaster && isHomeFeedEnabled) {
                        const homeSlots = adsConfig?.homeSlots || {};
                        const isAdmin = StorageService.isLoggedIn();
                        for (let i = 0; i < 10; i++) {
                          const slotId = `home_feed_ad_${i}`;
                          const slot = homeSlots[slotId] || {
                            id: slotId,
                            enabled: true,
                            ctaUrl: adsConfig?.homeFeedCtaUrl || 'https://example.com',
                            snippet: adsConfig?.homeFeedSnippet || '',
                          };
                          const isSlotActive = (slot.enabled === undefined && slot.isEnabled === undefined)
                            ? true
                            : Boolean(slot.enabled === true || String(slot.enabled) === 'true' || slot.isEnabled === true || String(slot.isEnabled) === 'true');

                          if (isSlotActive && (isAdmin || !dismissedFeedAds.has(slotId))) {
                            activeHomeSlots.push({
                              slotId,
                              slotIndex: i,
                              config: slot,
                            });
                          }
                        }
                      }

                      const homeFrequency = Math.max(2, Math.min(15, adsConfig?.homeAdFrequency || 5));

                      return filteredPrompts.map((prompt, index) => {
                        const category = categoryMap.get(prompt.categoryId);
                        const isFav = favorites.includes(prompt.id);

                        // 2. Select specific active slot for this interval position (rotates continuously through active slots)
                        let slotToRender: { slotId: string; slotIndex: number; config: any } | null = null;
                        if (activeHomeSlots.length > 0) {
                          if ((index + 1) % homeFrequency === 0) {
                            const slotPosition = Math.floor((index + 1) / homeFrequency) - 1;
                            if (slotPosition >= 0) {
                              slotToRender = activeHomeSlots[slotPosition % activeHomeSlots.length];
                            }
                          } else if (filteredPrompts.length < homeFrequency && index === filteredPrompts.length - 1) {
                            slotToRender = activeHomeSlots[0];
                          }
                        }

                        return (
                          <React.Fragment key={prompt.id}>
                            <PromptCard
                              prompt={prompt}
                              category={category}
                              isFavorite={isFav}
                              isHighlighted={highlightedPromptId === prompt.id}
                              currentUser={currentUser}
                              onToggleFavorite={handleToggleFavorite}
                              onCopy={handleCopyPrompt}
                              onOpenVariables={handleOpenVariables}
                              onSelectTag={handleSelectTag}
                              onOpenComments={handleOpenComments}
                              onDisabledCommentClick={handleDisabledCommentClick}
                              communityEnabled={siteSettings.communityEnabled}
                              commentsCount={commentsCountMap[prompt.id] || 0}
                              isAdmin={false}
                              onEdit={handleOpenPromptEditor}
                              onDelete={handleDeletePrompt}
                              onAdminToggleStatus={handleTogglePromptStatus}
                            />
                            {slotToRender && (
                              <NativeFeedAdCard
                                key={slotToRender.slotId}
                                adSlotId={slotToRender.slotId}
                                slotIndex={slotToRender.slotIndex}
                                slotConfig={slotToRender.config}
                                masterEnabled={isMaster}
                                onDismiss={handleDismissFeedAd}
                                onAdClick={() => setAdsConfig(StorageService.getAdsConfig())}
                                feedType="home"
                              />
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Pre-Footer Ad Banner (Compact Horizontal IAB Leaderboard - Mobile Safe Spacing) */}
          {Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true') &&
            Boolean(
              adsConfig?.slots?.footerBanner?.isEnabled === undefined ||
              adsConfig?.slots?.footerBanner?.isEnabled === true ||
              String(adsConfig?.slots?.footerBanner?.isEnabled) === 'true'
            ) && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 mb-20 sm:mb-4 flex justify-center w-full h-fit">
                <AdBanner
                  slot={adsConfig?.slots?.footerBanner || { id: 'footerBanner', isEnabled: true, codeSnippet: '' }}
                  masterEnabled={Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true')}
                  slotType="banner"
                  className="w-full"
                />
              </div>
          )}
        </main>
      )}

      {/* Clean Minimalist Footer with Integrated Social Share */}
      <footer className="border-t border-slate-200 dark:border-[#2A384C] bg-white/70 dark:bg-[#0B0F17]/70 pt-6 pb-20 sm:pb-20 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          {/* Social Share section integrated directly inside the top padding of the footer */}
          {currentView !== 'admin' && (
            <div className="w-full flex flex-col items-center">
              <ShareButtons variant="footer" />
            </div>
          )}

          {/* Subtle separator between share row and copyright/support links */}
          {currentView !== 'admin' && (
            <div className="w-full max-w-sm h-px bg-slate-200/60 dark:bg-slate-800/60 my-0.5" />
          )}

          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{t('brandName')}</span>
              <span className="mx-2">•</span>
              <span>{t('footerCopyright')}</span>
            </div>

            {/* Light-blue, borderless link: Contact Technical Support */}
            <div className="flex items-center gap-2">
              <button
                id="footer-contact-support-btn"
                type="button"
                onClick={() => setIsSupportChatOpen(true)}
                className="inline-flex items-center gap-1.5 text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 font-medium transition-colors cursor-pointer border-none bg-transparent outline-none text-xs md:text-[13.8px] lg:text-[13.8px]"
              >
                <Headphones className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>{t('support.contactSupport')}</span>
                {unreadUserSupportCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
              <span>{t('catVibeCoding')}</span>
              <span>•</span>
              <span>{t('catAiImages')}</span>
              <span>•</span>
              <span>{t('catCommercialVideo')}</span>
              <span>•</span>
              <span>{t('catCopywriting')}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Floating Navigation Bar (الرئيسية & المجتمع) */}
      {currentView !== 'admin' && siteSettings.communityEnabled && (
        <BottomNavBar
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'home') handleNavigateHome();
            else handleNavigateCommunity();
          }}
          communityCount={communityPostsCount}
          communityEnabled={siteSettings.communityEnabled}
        />
      )}

      {/* Dynamic Lazy Modals Container */}
      <Suspense fallback={null}>
        {/* Prompt-Specific Comment & Discussion Modal */}
        {isCommentModalOpen && (
          <PromptCommentModal
            isOpen={isCommentModalOpen}
            prompt={commentingPrompt}
            category={commentingPrompt ? categoryMap.get(commentingPrompt.categoryId) : undefined}
            onClose={() => {
              setIsCommentModalOpen(false);
              setCommentingPrompt(null);
            }}
            onPostCreated={() => {
              loadData();
            }}
          />
        )}

        {/* Full-Detail & Interactive Variable Customization Modal */}
        {isVarModalOpen && (
          <VariableModal
            prompt={variablePrompt}
            category={variablePrompt ? categoryMap.get(variablePrompt.categoryId) : undefined}
            isOpen={isVarModalOpen}
            onClose={() => {
              setIsVarModalOpen(false);
              try {
                if (window.location.pathname.startsWith('/prompt/') || window.location.hash.startsWith('#prompt-')) {
                  window.history.replaceState(null, '', currentView === 'community' ? '/community' : '/');
                }
              } catch (e) {}
            }}
            onCopy={handleCopyPrompt}
            onSelectTag={handleSelectTag}
          />
        )}

        {/* Public Add Prompt Modal (Community Submissions) */}
        {isPublicAddModalOpen && (
          <PublicAddPromptModal
            isOpen={isPublicAddModalOpen}
            categories={categories}
            onClose={() => setIsPublicAddModalOpen(false)}
            onSubmit={handlePublicSubmit}
          />
        )}

        {/* Admin Login Modal (Triggered ONLY via direct /admin route navigation) */}
        {isAdminModalOpen && (
          <AdminLoginModal
            isOpen={isAdminModalOpen}
            onClose={() => {
              setIsAdminModalOpen(false);
              handleNavigateHome();
            }}
            onLoginSuccess={() => {
              setIsAdminModalOpen(false);
              handleAdminLoginSuccess();
            }}
          />
        )}

        {/* Entry Landing Modal Ad (Strictly suppressed on Admin routes) */}
        {isEntryAdOpen && currentView !== 'admin' && (typeof window === 'undefined' || (!window.location.pathname.includes('/admin') && !window.location.hash.includes('admin'))) && (
          <AdModal
            isOpen={isEntryAdOpen}
            onClose={() => setIsEntryAdOpen(false)}
            slot={adsConfig.slots.popupEntry}
            masterEnabled={adsConfig.masterEnabled}
          />
        )}

        {/* Action-Triggered Modal Ad (Copy / Submit) */}
        {isTriggeredAdOpen && (
          <AdModal
            isOpen={isTriggeredAdOpen}
            onClose={() => setIsTriggeredAdOpen(false)}
            slot={triggeredAdSlot}
            masterEnabled={adsConfig.masterEnabled}
          />
        )}

        {/* Prompt Editor Modal for Authors & Admins */}
        {isPromptEditorOpen && (
          <PromptEditorModal
            isOpen={isPromptEditorOpen}
            prompt={editingPrompt}
            categories={categories}
            onClose={() => {
              setIsPromptEditorOpen(false);
              setEditingPrompt(null);
            }}
            onSave={handleSavePrompt}
          />
        )}

        {/* Modern Slide-out Auth & Navigation Drawer */}
        {isAuthDrawerOpen && (
          <AuthDrawer
            isOpen={isAuthDrawerOpen}
            onClose={closeAuthDrawer}
            language={language}
            onLanguageToggle={toggleLanguage}
            isDark={theme === 'dark'}
            onThemeToggle={toggleTheme}
            activeView={currentView}
            communityEnabled={siteSettings.communityEnabled}
            initialMode={authDrawerMode}
            initialEmail={authDrawerEmail}
            onAuthSuccess={handleAuthSuccess}
            onNavigate={(view) => {
              if (view === 'home') handleNavigateHome();
              else if (view === 'community') handleNavigateCommunity();
              else if (view === 'admin') {
                try {
                  window.history.pushState(null, '', '/admin');
                } catch (e) {}
                setCurrentView('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onOpenAddPrompt={handleOpenAddPrompt}
            onOpenSupport={() => setIsSupportChatOpen(true)}
          />
        )}

        {/* User Live Technical Support Floating Chat Modal */}
        {isSupportChatOpen && (
          <SupportChatModal
            isOpen={isSupportChatOpen}
            onClose={() => setIsSupportChatOpen(false)}
          />
        )}
      </Suspense>

      {/* Floating Toast System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <GuestRestrictionProvider>
        <ReportModalProvider>
          <MainApp />
        </ReportModalProvider>
      </GuestRestrictionProvider>
    </AppProvider>
  );
}
