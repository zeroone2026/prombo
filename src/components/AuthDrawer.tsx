import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Shield,
  LogOut,
  MessageSquare,
  Compass,
  PlusCircle,
  LogIn,
  UserPlus,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Settings,
  Camera,
  Sparkles,
  Eye,
  EyeOff,
  UserCog,
  LayoutGrid,
  Share2,
  Check,
  Link as LinkIcon,
  Headphones,
} from 'lucide-react';
import { PromboLogo } from './PromboLogo';
import { CommunityUser } from '../types';
import { AuthService } from '../services/authService';
import { StorageService } from '../services/storage';
import { SupportService } from '../services/supportService';
import { Language } from '../i18n/translations';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { isAdminUser, DEFAULT_AVATAR_URL } from '../utils/authUtils';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggleButton } from './ThemeToggleButton';
import { SoundNotificationSettings } from './SoundNotificationSettings';
import { UserAvatar } from './UserAvatar';
import { AvatarPickerModal } from './AvatarPickerModal';
import { ProfileEditModal } from './ProfileEditModal';
import { UnifiedAuthForm } from './auth/UnifiedAuthForm';
import { ShareButtons } from './ShareButtons';
import { LegalPolicyModal } from './LegalPolicyModal';
import { getUserProfileUrl, formatUserSlug, copyTextToClipboard } from '../utils/slugUtils';
import { useApp } from '../context/AppContext';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageToggle: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
  activeView: 'home' | 'community' | 'admin';
  onNavigate: (view: 'home' | 'community' | 'admin') => void;
  onOpenAddPrompt: () => void;
  communityEnabled?: boolean;
  onOpenSupport?: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot' | 'reset';
  initialEmail?: string;
  onAuthSuccess?: (user: CommunityUser) => void;
}

export const AuthDrawer: React.FC<AuthDrawerProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageToggle,
  isDark,
  onThemeToggle,
  activeView,
  onNavigate,
  onOpenAddPrompt,
  communityEnabled = true,
  onOpenSupport,
  initialMode = 'signin',
  initialEmail = '',
  onAuthSuccess,
}) => {
  const { t } = useApp();
  const isRtl = language === 'ar';

  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(AuthService.getCurrentUser());
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(initialMode);
  const [authEmail, setAuthEmail] = useState<string>(initialEmail);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  // Sync mode and email when props change
  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialEmail !== undefined) {
      setAuthEmail(initialEmail);
    }
  }, [initialEmail]);

  // Listen for Supabase password recovery events directly within AuthDrawer
  useEffect(() => {
    const handleRecovery = (e: any) => {
      try {
        const path = window.location.pathname;
        const hash = window.location.hash;
        const isAdminRoute = path.startsWith('/admin') || hash.startsWith('#admin');
        const isAdminRecoveryActive = sessionStorage.getItem('prombo_admin_recovery_active') === 'true';
        if (isAdminRoute || isAdminRecoveryActive || e?.detail?.source === 'admin') {
          return;
        }
      } catch {}

      const recoveryEmail = (e?.detail?.email || '').trim();
      if (recoveryEmail) {
        setAuthEmail(recoveryEmail);
        try {
          sessionStorage.setItem('prombo_recovery_email', recoveryEmail);
        } catch {}
      }
      setAuthMode('reset');
    };
    window.addEventListener('prombo_password_recovery', handleRecovery);
    return () => window.removeEventListener('prombo_password_recovery', handleRecovery);
  }, []);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'guest'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [chosenSignupAvatar, setChosenSignupAvatar] = useState<string>('');
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);

  // Sync support unread count
  useEffect(() => {
    const updateUnread = () => {
      const user = AuthService.getCurrentUser();
      const uid = user ? user.id : 'user-guest-support';
      setUnreadSupportCount(SupportService.getUnreadCountForUser(uid));
    };
    updateUnread();
    const unsubscribe = SupportService.subscribe(updateUnread);
    return () => unsubscribe();
  }, [currentUser]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [copiedAccountLink, setCopiedAccountLink] = useState(false);

  const handleCopyAccountLink = async () => {
    if (!currentUser) return;
    const url = getUserProfileUrl(currentUser.username || currentUser.name);
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedAccountLink(true);
      setTimeout(() => setCopiedAccountLink(false), 2000);
    }
  };

  // Home Grid Columns Setting (1, 2, 3, 4 - User Personal Preference)
  const [gridColumns, setGridColumns] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const userPref = localStorage.getItem('prombo_user_grid_preference');
      if (userPref) {
        const num = parseInt(userPref, 10);
        if ([1, 2, 3, 4].includes(num)) return num;
      }
      const platformCols = StorageService.getPlatformSettings().appearance?.homeGridColumns;
      if (platformCols && [1, 2, 3, 4].includes(platformCols)) {
        return platformCols;
      }
      const saved = localStorage.getItem('prombo_home_grid_columns');
      if (saved) {
        const num = parseInt(saved, 10);
        if ([1, 2, 3, 4].includes(num)) return num;
      }
      return 3;
    }
    return 3;
  });

  const handleGridColumnsChange = (cols: number) => {
    setGridColumns(cols);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prombo_user_grid_preference', String(cols));
      localStorage.setItem('prombo_home_grid_columns', String(cols));
      window.dispatchEvent(new CustomEvent('prombo_grid_columns_change', { detail: { columns: cols } }));
    }
  };

  // Sync auth state
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setCurrentUser(e.detail || AuthService.getCurrentUser());
    };
    window.addEventListener('prombo_auth_change', handleAuthChange);
    return () => window.removeEventListener('prombo_auth_change', handleAuthChange);
  }, []);

  const isCurrentUserAdmin = Boolean(
    (currentUser && !currentUser.isGuest && (currentUser.role === 'admin' || isAdminUser(currentUser))) ||
    (StorageService.isLoggedIn() && StorageService.getCurrentSession()?.role === 'admin')
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await AuthService.signInWithEmail(email, password);
      if (res.success) {
        setSuccessMsg(language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Signed in successfully!');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 900);
      } else {
        setErrorMsg(res.error || (language === 'ar' ? 'تعذر تسجيل الدخول' : 'Failed to sign in'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await AuthService.signUp(name, email, password, chosenSignupAvatar || undefined);
      if (res.success) {
        setSuccessMsg(language === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'Account created successfully!');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 900);
      } else {
        setErrorMsg(res.error || (language === 'ar' ? 'تعذر إنشاء الحساب' : 'Failed to create account'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAvatar = async (avatar: string) => {
    if (currentUser) {
      await AuthService.updateAvatar(avatar);
      setCurrentUser(AuthService.getCurrentUser());
      setSuccessMsg(language === 'ar' ? 'تم تحديث صورتك الشخصية بنجاح!' : 'Profile avatar updated!');
      setTimeout(() => setSuccessMsg(null), 2500);
    } else {
      setChosenSignupAvatar(avatar);
    }
    setIsAvatarPickerOpen(false);
  };

  const handleSignOutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmSignOut = async () => {
    await AuthService.signOut();
    setIsLogoutModalOpen(false);
    setSuccessMsg(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out');
    setTimeout(() => setSuccessMsg(null), 1500);
  };

  const drawerVariants = {
    closed: {
      x: isRtl ? '-100%' : '100%',
      opacity: 0,
      transition: { type: 'spring', damping: 28, stiffness: 300 },
    },
    open: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 28, stiffness: 300 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Side Drawer Container (Slides from SAME SIDE as Toggle Button: Left in RTL, Right in LTR) */}
          <div className={`fixed inset-y-0 ${isRtl ? 'left-0' : 'right-0'} max-w-full flex`}>
            <motion.div
              variants={drawerVariants}
              initial="closed"
              animate="open"
              exit="closed"
              onClick={(e) => e.stopPropagation()}
              className="w-screen max-w-[calc(100vw-1rem)] sm:max-w-md bg-white dark:bg-[#12161f] border-x border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 shrink-0">
                {/* Single Brand Logo / Title alongside Close Button */}
                <div className="flex items-center justify-between gap-3">
                  <PromboLogo size="sm" showText={true} />

                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                    aria-label={t.modalClose}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Clean, single scrollable/compact inline share row for mobile & desktop */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                    {t('sharePrombo')}
                  </span>
                  <ShareButtons variant="compact" className="shrink-0" />
                </div>
              </div>

              {/* VERY TOP OF SIDE DRAWER: Theme Toggle & Language Switcher & Grid Column Controller */}
              <div className="px-5 py-3 bg-slate-50/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>{t.appearanceAndLanguage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LanguageSwitcher size="sm" />
                    <ThemeToggleButton size="sm" />
                  </div>
                </div>

                {/* Grid Column Controller: 1, 2, 3, 4 - Exclusively rendered on md+ screens, hidden on mobile */}
                <div className="hidden md:flex items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <LayoutGrid className="w-3.5 h-3.5 text-orange-500" />
                    <span>{t.homeGridColumns}</span>
                  </div>
                  <select
                    id="grid-columns-selector"
                    value={gridColumns}
                    onChange={(e) => handleGridColumnsChange(Number(e.target.value))}
                    className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-[#182232] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer shadow-2xs"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
              </div>

              {/* Immediately below the top control bar: Contact Technical Support Link with Responsive Font Scaling */}
              <div className="px-5 py-2.5 bg-sky-50/50 dark:bg-sky-950/25 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  id="drawer-contact-support-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenSupport) onOpenSupport();
                  }}
                  className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 font-semibold text-xs md:text-[13.8px] lg:text-[13.8px] transition-colors cursor-pointer border-none bg-transparent outline-none py-1.5 px-2.5 rounded-lg hover:bg-sky-100/50 dark:hover:bg-sky-900/30"
                >
                  <Headphones className="w-4 h-4 md:w-[18px] md:h-[18px] text-sky-500 dark:text-sky-400 shrink-0" />
                  <span>
                    {(t as any)['support.contactSupport'] ||
                      (t as any).support?.contactSupport ||
                      (isRtl ? 'تواصل مع الدعم الفني' : 'Contact Support')}
                  </span>
                  {unreadSupportCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  )}
                </button>
                {unreadSupportCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                    {unreadSupportCount}
                  </span>
                )}
              </div>

              {/* Scrollable Content */}
              <div
                className="flex-1 overflow-y-auto touch-pan-y overscroll-contain p-4 sm:p-5 space-y-6 custom-scrollbar touch-scroll-container"
                style={{
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehaviorY: 'contain',
                  touchAction: 'pan-y',
                }}
              >
                {/* Status Messages */}
                {successMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-rose-800 dark:text-rose-300 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* AUTHENTICATED USER PROFILE CARD AT TOP OF DRAWER */}
                {currentUser && authMode !== 'reset' && authMode !== 'forgot' ? (
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div
                        onClick={() => setIsAvatarPickerOpen(true)}
                        className="relative group cursor-pointer shrink-0"
                        title={t.clickToChangeAvatar}
                      >
                        <UserAvatar
                          user={currentUser}
                          size="lg"
                          showGlow={true}
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {currentUser.name}
                          </h3>
                          {isCurrentUserAdmin ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" />
                              {t.adminRole}
                            </span>
                          ) : currentUser.isGuest ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {t.guestAccount}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
                              {t.userRole}
                            </span>
                          )}
                        </div>
                        {currentUser.username && (
                          <p className="text-[11px] font-mono font-bold text-orange-600 dark:text-orange-400 truncate mt-0.5" dir="ltr">
                            {formatUserSlug(currentUser.username)}
                          </p>
                        )}
                        {currentUser.email && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {currentUser.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Prominent Copy Account Link button inside drawer header for logged-in users */}
                    {!currentUser.isGuest && (
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                        <button
                          type="button"
                          id="drawer-copy-account-link-btn"
                          onClick={handleCopyAccountLink}
                          className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            copiedAccountLink
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20 scale-[1.01]'
                              : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white shadow-orange-500/20'
                          }`}
                        >
                          {copiedAccountLink ? (
                            <>
                              <Check className="w-4 h-4 text-white animate-in zoom-in-50" />
                              <span>{language === 'ar' ? 'تم النسخ! ✓' : t.accountLinkCopied}</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              <span>{t.copyAccountLink}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Ban Restriction Alert if banned */}
                    {currentUser.isBanned && (
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                        <span>{t.bannedAlert}</span>
                      </div>
                    )}

                    {/* Community Ban Alert if community banned */}
                    {currentUser.isCommunityBanned && !currentUser.isBanned && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                        <span>
                          {language === 'ar'
                            ? 'تم تقييد حسابك من النشر في مجتمع Prombo. يمكنك تصفح الأوامر والتواصل مع الدعم الفني.'
                            : 'Your account is restricted from posting in the Prombo Community. Library browsing and support remain active.'}
                        </span>
                      </div>
                    )}

                    {/* Quick Profile Actions */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        id="drawer-edit-profile-btn"
                        onClick={() => setIsProfileEditModalOpen(true)}
                        className="flex-1 py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-orange-500/20"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>{t.editProfileAndAvatar}</span>
                      </button>
                      <button
                        type="button"
                        id="drawer-sign-out-btn"
                        onClick={handleSignOutClick}
                        className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 border border-red-500/20 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title={t.signOut}
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                        <span className="hidden sm:inline">{t.signOut}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* FRICTIONLESS UNIFIED AUTH SECTION */
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                      <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {authMode === 'reset'
                            ? (language === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password')
                            : authMode === 'forgot'
                            ? (language === 'ar' ? 'نسيت كلمة المرور' : 'Forgot Password')
                            : t.unifiedAuthTitle}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {authMode === 'reset'
                            ? (language === 'ar' ? 'أدخل رمز التحقق (OTP) وعيّن كلمة المرور الجديدة' : 'Enter 6-digit OTP and set your new password')
                            : authMode === 'forgot'
                            ? (language === 'ar' ? 'أدخل بريدك الإلكتروني لتلقي رمز التحقق' : 'Enter your registered email to receive a code')
                            : t.unifiedAuthSubtitle}
                        </p>
                      </div>
                    </div>

                    <UnifiedAuthForm
                      key={isOpen ? 'auth-drawer-form-instance' : 'auth-drawer-closed'}
                      compact={true}
                      showGuestOption={false}
                      initialMode={authMode}
                      initialEmail={authEmail}
                      onModeChange={(newMode) => setAuthMode(newMode)}
                      onOpenLegalPolicy={() => setIsLegalModalOpen(true)}
                      onSuccess={(user) => {
                        setCurrentUser(user);
                        setSuccessMsg(t.signedInSuccessfully);
                        if (onAuthSuccess) {
                          onAuthSuccess(user);
                        }
                        setTimeout(() => {
                          setSuccessMsg(null);
                          onClose();
                        }, 500);
                      }}
                    />
                  </div>
                )}

                {/* NAVIGATION DIRECT LINKS */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    {t.navigationSection}
                  </div>

                  <button
                    onClick={() => {
                      onNavigate('home');
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                      activeView === 'home'
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-400/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <Compass className="w-4 h-4" />
                      </div>
                      <span>{t.navHome}</span>
                    </div>
                    {isRtl ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  {communityEnabled && (
                    <button
                      onClick={() => {
                        onNavigate('community');
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                        activeView === 'community'
                          ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{t.navCommunity}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            {t.liveBadge}
                          </span>
                        </div>
                      </div>
                      {isRtl ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onOpenAddPrompt();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <span>{t.publicAddPrompt}</span>
                    </div>
                    {isRtl ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>

                {/* Sound Notification Settings */}
                <SoundNotificationSettings />

                {/* Legal & Privacy Policy Link */}
                <div className="pt-3 pb-2 text-center border-t border-slate-200/80 dark:border-slate-800/80">
                  <button
                    type="button"
                    id="drawer-legal-policy-btn"
                    onClick={() => setIsLegalModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-colors cursor-pointer group py-1.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
                    <span className="underline underline-offset-2">
                      {t.termsAndPrivacyPolicy || 'Terms of Service & Privacy Policy'}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Prombo © 2026 • Global AI Library & Community
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Logout Confirmation Modal */}
          <LogoutConfirmModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={handleConfirmSignOut}
          />

          {/* Avatar Picker Modal */}
          <AvatarPickerModal
            isOpen={isAvatarPickerOpen}
            onClose={() => setIsAvatarPickerOpen(false)}
            onSelectAvatar={handleSelectAvatar}
            currentAvatar={currentUser ? currentUser.avatar : chosenSignupAvatar}
            userName={currentUser ? currentUser.name : (name || 'Prombo')}
            isGuest={Boolean(currentUser?.isGuest)}
          />

          {/* Profile Edit Modal */}
          {currentUser && (
            <ProfileEditModal
              isOpen={isProfileEditModalOpen}
              onClose={() => setIsProfileEditModalOpen(false)}
              user={currentUser}
              onProfileUpdated={(updated) => {
                setCurrentUser(updated);
              }}
            />
          )}

          {/* Legal Policy Modal */}
          <LegalPolicyModal
            isOpen={isLegalModalOpen}
            onClose={() => setIsLegalModalOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthDrawer;
