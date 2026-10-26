import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  X,
  Plus,
  Menu,
  User,
  Bell,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useGuestRestriction } from '../context/GuestRestrictionContext';
import { PromboLogo } from './PromboLogo';
import { AuthService } from '../services/authService';
import { CommunityUser } from '../types';
import { DEFAULT_AVATAR_URL } from '../utils/authUtils';
import { SupportService } from '../services/supportService';
import { UserAvatar } from './UserAvatar';
import { UserNotificationService } from '../services/userNotificationService';
import { NotificationCenterDropdown } from './NotificationCenterDropdown';

/**
 * Truncates user display name based on character count (String.length)
 * Appends '..' if length exceeds maxChars
 */
const truncateDisplayName = (fullName: string | undefined | null, maxChars: number): string => {
  if (!fullName) return '';
  return fullName.length > maxChars ? `${fullName.slice(0, maxChars)}..` : fullName;
};

const MOBILE_PROMPT_LABELS: Record<string, string> = {
  ar: 'برومبت/مهارة',
  en: 'Prompt/Skill',
  fr: 'Prompt/Skill',
  es: 'Prompt/Skill',
  zh: '提示词/技能',
  hi: 'प्रॉम्प्ट/स्किल',
  ja: 'プロンプト/スキル',
};

const DESKTOP_PROMPT_LABELS: Record<string, string> = {
  ar: 'إضافة برومبت/مهارة',
  en: 'Add Prompt/Skill',
  fr: 'Ajouter un prompt/skill',
  es: 'Agregar prompt/skill',
  zh: '添加提示词/技能',
  hi: 'प्रॉम्प्ट/स्किल जोड़ें',
  ja: 'プロンプト/スキルを追加',
};

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateToHome: () => void;
  onOpenAddPrompt: () => void;
  onOpenAuthDrawer: () => void;
  currentView: 'home' | 'admin' | 'community';
  allowPublicSubmissions?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onNavigateToHome,
  onOpenAddPrompt,
  onOpenAuthDrawer,
  currentView,
  allowPublicSubmissions = true,
}) => {
  const { t, language, isRTL } = useApp();
  const { isGuest, openAuthModal } = useGuestRestriction();

  // Localized prompt submission button labels with fallback across all 7 supported languages
  const rawMobileLabel = t('addPromptNavButtonMobile');
  const mobilePromptLabel =
    rawMobileLabel && rawMobileLabel !== 'addPromptNavButtonMobile'
      ? rawMobileLabel
      : (MOBILE_PROMPT_LABELS[language] || 'Prompt/Skill');

  const rawDesktopLabel = t('addPromptNavButton');
  const desktopPromptLabel =
    rawDesktopLabel && rawDesktopLabel !== 'addPromptNavButton'
      ? rawDesktopLabel
      : (DESKTOP_PROMPT_LABELS[language] || 'Add Prompt/Skill');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(AuthService.getCurrentUser());
  const [hasUnreadSupport, setHasUnreadSupport] = useState<boolean>(() => {
    const uid = currentUser?.id || 'guest_user';
    return SupportService.getUnreadCountForUser(uid) > 0;
  });

  // User Notifications state
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(() =>
    UserNotificationService.getUnreadCount(currentUser?.id, currentUser?.email)
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    const updateNotifCount = () => {
      const user = AuthService.getCurrentUser();
      setUnreadNotificationsCount(UserNotificationService.getUnreadCount(user?.id, user?.email));
    };
    updateNotifCount();

    window.addEventListener('prombo_user_notification_added', updateNotifCount);
    window.addEventListener('prombo_notifications_updated', updateNotifCount);
    window.addEventListener('prombo_auth_change', updateNotifCount);

    return () => {
      window.removeEventListener('prombo_user_notification_added', updateNotifCount);
      window.removeEventListener('prombo_notifications_updated', updateNotifCount);
      window.removeEventListener('prombo_auth_change', updateNotifCount);
    };
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const handleAuthChange = (e: any) => {
      const user = e.detail || AuthService.getCurrentUser();
      setCurrentUser(user);
      const uid = user?.id || 'guest_user';
      setHasUnreadSupport(SupportService.getUnreadCountForUser(uid) > 0);
    };
    window.addEventListener('prombo_auth_change', handleAuthChange);
    return () => window.removeEventListener('prombo_auth_change', handleAuthChange);
  }, []);

  useEffect(() => {
    const checkUnread = () => {
      const uid = currentUser?.id || 'guest_user';
      setHasUnreadSupport(SupportService.getUnreadCountForUser(uid) > 0);
    };
    checkUnread();
    const unsubscribe = SupportService.subscribe(checkUnread);
    return () => unsubscribe();
  }, [currentUser?.id]);

  const touchStartY = useRef<number>(0);

  // Scroll handler: Smart Scroll-Hide behavior across window, root, and scrollable containers
  useEffect(() => {
    const getScrollTop = (target?: EventTarget | null): number => {
      let targetScroll = 0;
      if (target && target instanceof HTMLElement) {
        // Do not trigger header hide when scrolling inner modal or comment dropdown dialogs
        if (target.closest('[role="dialog"]') || target.closest('.modal-container')) {
          return lastScrollY.current;
        }
        if (typeof target.scrollTop === 'number' && target.scrollTop > 0) {
          targetScroll = target.scrollTop;
        }
      }

      const windowScroll = Math.max(
        window.pageYOffset || 0,
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );

      const mainEl = document.querySelector('main');
      const mainScroll = mainEl ? mainEl.scrollTop : 0;
      const rootEl = document.getElementById('root');
      const rootScroll = rootEl ? rootEl.scrollTop : 0;

      return Math.max(windowScroll, document.documentElement?.scrollTop || 0, document.body?.scrollTop || 0, mainScroll, rootScroll, targetScroll);
    };

    const handleScroll = (e?: Event) => {
      const currentScrollY = getScrollTop(e?.target);

      // Edge case: Always ensure the header remains visible when at or near the very top of the page
      if (currentScrollY <= 10) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Delta threshold to avoid micro-jitter on touch devices
      const diff = currentScrollY - lastScrollY.current;
      if (Math.abs(diff) < 3) return;

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling DOWN and past 50px -> hide header
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling UP -> instantly show header back
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    const handleWheel = (e: WheelEvent) => {
      const currentScroll = getScrollTop();
      if (currentScroll <= 10 && e.deltaY < 0) {
        setIsVisible(true);
        return;
      }
      if (e.deltaY > 15 && currentScroll > 50) {
        setIsVisible(false);
      } else if (e.deltaY < -15) {
        setIsVisible(true);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || !e.touches[0]) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY.current;
      const currentScroll = getScrollTop();

      if (currentScroll <= 10) {
        setIsVisible(true);
        touchStartY.current = currentY;
        return;
      }

      if (deltaY < -20 && currentScroll > 50) {
        // Dragged finger up -> page scrolls down -> hide header
        setIsVisible(false);
        touchStartY.current = currentY;
      } else if (deltaY > 20) {
        // Dragged finger down -> page scrolls up -> show header
        setIsVisible(true);
        touchStartY.current = currentY;
      }
    };

    // Attach listeners with capture: true to catch all scroll events across window, document, and containers
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
      document.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Global shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsVisible(true);
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigateToHome();
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <header
        id="main-navigation-header"
        className={`fixed top-0 left-0 right-0 z-50 w-full bg-[#FDFBF7]/95 dark:bg-[#121824]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-[#2A384C] transition-transform duration-300 ease-in-out shadow-xs ${
          isVisible
            ? 'transform translate-y-0 pointer-events-auto'
            : 'transform -translate-y-full pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 md:gap-6">
          {/* Prombo Signature Brand Logo - Scrolls to Top on Click */}
          <button
            onClick={handleLogoClick}
            className="flex items-center group text-left focus:outline-none shrink-0 cursor-pointer"
            aria-label={t('brandName')}
          >
            <PromboLogo size="md" showText={true} />
          </button>

        {/* Global Search Bar (Shown on Home and Community Views) */}
        {(currentView === 'home' || currentView === 'community') && (
          <div className="flex-1 max-w-xl relative hidden md:block">
            <div className="relative flex items-center w-full">
              <Search className={`w-4 h-4 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} pointer-events-none`} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={
                  currentView === 'community'
                    ? (language === 'ar' ? 'ابحث في منشورات المجتمع، المبدعين...' : 'Search community posts, creators...')
                    : (language === 'ar' ? 'ابحث عن برومبت، نموذج، وسوم...' : t('searchPlaceholder'))
                }
                aria-label={currentView === 'community' ? (language === 'ar' ? 'بحث في المجتمع' : 'Search community') : t('searchAria')}
                className={`w-full ${isRTL ? 'pr-9 pl-20' : 'pl-9 pr-20'} py-2 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors shadow-xs`}
              />
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange('')}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer`}
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className={`flex items-center gap-1 absolute ${isRTL ? 'left-3' : 'right-3'} pointer-events-none`}>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                    {t('shortcutBadge')}
                  </kbd>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls Container */}
        {/* Strict Outer Edge -> Innermost Sequence: [Drawer] -> [Bell] -> [Add Prompt (Home only)] -> [Profile Avatar] */}
        <div
          dir={isRTL ? 'ltr' : 'rtl'}
          className="flex flex-row items-center gap-1.5 sm:gap-2.5 shrink-0"
        >
          {/* 1st - Outer Edge: Navigation Drawer Toggle Button ("3 bars" menu icon) */}
          <button
            id="navbar-hamburger-btn"
            onClick={onOpenAuthDrawer}
            title={t('menuButton')}
            aria-label={t('menuButton')}
            className="relative p-1.5 sm:p-2 rounded-xl bg-white dark:bg-[#182232] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#2A384C] hover:bg-orange-50 dark:hover:bg-[#1f2b3e] hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
            {hasUnreadSupport && (
              <span
                id="navbar-support-badge-dot"
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#121824] animate-pulse pointer-events-none"
              />
            )}
          </button>

          {/* 2nd: Notification Bell Icon Button & Dropdown */}
          <div className="relative shrink-0">
            <button
              id="navbar-notification-bell-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsNotificationOpen((prev) => !prev);
              }}
              title={language === 'ar' ? 'الإشعارات' : 'Notifications'}
              aria-label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
              aria-expanded={isNotificationOpen}
              className={`relative p-1.5 sm:p-2 rounded-xl border transition-colors shadow-2xs cursor-pointer shrink-0 ${
                isNotificationOpen
                  ? 'bg-orange-50 dark:bg-[#1f2b3e] text-orange-600 dark:text-orange-400 border-orange-400 dark:border-orange-500'
                  : 'bg-white dark:bg-[#182232] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#2A384C] hover:bg-orange-50 dark:hover:bg-[#1f2b3e] hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span
                  id="navbar-unread-notification-badge"
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-[#121824] shadow-xs"
                >
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <NotificationCenterDropdown
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
            />
          </div>

          {/* 3rd: Add Prompt/Skill Button (Home page only) */}
          {currentView === 'home' && allowPublicSubmissions && (
            <button
              id="btn-nav-add-prompt"
              onClick={() => {
                if (!currentUser || currentUser.isGuest || isGuest) {
                  openAuthModal('signin');
                  return;
                }
                onOpenAddPrompt();
              }}
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              title={desktopPromptLabel}
              aria-label={desktopPromptLabel}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="block sm:hidden whitespace-nowrap leading-none">{mobilePromptLabel}</span>
              <span className="hidden sm:block whitespace-nowrap leading-none">{desktopPromptLabel}</span>
            </button>
          )}

          {/* 4th (Home) / 3rd (Community): User Profile Avatar Button (100% VISIBLE across ALL viewports, strictly circular) */}
          <button
            id="navbar-user-profile-btn"
            onClick={onOpenAuthDrawer}
            title={currentUser?.name || t('signInTab')}
            aria-label={currentUser?.name || t('signInTab')}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full aspect-square p-0 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] hover:border-orange-500 dark:hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20 transition-all cursor-pointer shrink-0 shadow-2xs overflow-hidden"
          >
            <div className="w-full h-full rounded-full aspect-square overflow-hidden flex items-center justify-center">
              <UserAvatar
                user={currentUser || { name: 'Guest', isGuest: true }}
                size="md"
                showGlow={false}
                className="w-full h-full object-cover rounded-full aspect-square"
              />
            </div>
          </button>
        </div>
      </div>
    </header>
    {/* Layout Spacer to preserve page flow height with fixed navbar */}
    <div className="h-16 shrink-0 w-full pointer-events-none" aria-hidden="true" />
  </>
);
};

