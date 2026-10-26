import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthService } from '../../services/authService';
import { CommunityUser } from '../../types';
import { parseAuthError, formatAuthError, LocalizedAuthErrorPayload } from '../../utils/authErrorUtils';

export type AuthFormMode = 'signin' | 'signup' | 'forgot' | 'reset';

interface UnifiedAuthFormProps {
  onSuccess: (user: CommunityUser) => void;
  onCancel?: () => void;
  compact?: boolean;
  showGuestOption?: boolean; // Deprecated - guest flow is strictly disabled
  initialEmail?: string;
  initialMode?: AuthFormMode;
  onModeChange?: (mode: AuthFormMode) => void;
  scrollable?: boolean;
  onOpenLegalPolicy?: () => void;
}

const REMEMBER_ME_STORAGE_KEY = 'prombo_remember_me_pref';
const REMEMBERED_EMAIL_STORAGE_KEY = 'prombo_remembered_email';
const RECOVERY_EMAIL_STORAGE_KEY = 'prombo_recovery_email';

export const UnifiedAuthForm: React.FC<UnifiedAuthFormProps> = ({
  onSuccess,
  compact = false,
  initialEmail = '',
  initialMode = 'signin',
  onModeChange,
  scrollable = false,
  onOpenLegalPolicy,
}) => {
  const { t, language } = useApp();

  // Mode: 'signin' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState<AuthFormMode>(initialMode);
  const prevInitialModeRef = useRef(initialMode);

  // Sync mode ONLY if initialMode prop genuinely changes from parent
  useEffect(() => {
    if (initialMode && initialMode !== prevInitialModeRef.current) {
      prevInitialModeRef.current = initialMode;
      setMode(initialMode);
    }
  }, [initialMode]);

  // Remember Me state - strictly defaults to false unless explicitly saved as 'true'
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => {
    if (initialEmail && initialEmail.trim()) {
      return initialEmail.trim();
    }
    try {
      if (initialMode === 'reset' || initialMode === 'forgot') {
        const storedRecoveryEmail = sessionStorage.getItem(RECOVERY_EMAIL_STORAGE_KEY);
        if (storedRecoveryEmail && storedRecoveryEmail.trim()) {
          return storedRecoveryEmail.trim();
        }
      }
      const isRemembered = localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === 'true';
      if (isRemembered) {
        const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY);
        if (savedEmail && savedEmail.trim()) {
          return savedEmail.trim();
        }
      }
    } catch {}
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Synchronize email state from initialEmail prop or sessionStorage if mode is reset/forgot
  useEffect(() => {
    if (initialEmail && initialEmail.trim()) {
      setEmail(initialEmail.trim());
    } else if (mode === 'reset' || mode === 'forgot') {
      try {
        const stored = sessionStorage.getItem(RECOVERY_EMAIL_STORAGE_KEY);
        if (stored && stored.trim()) {
          setEmail(stored.trim());
        }
      } catch {}
    }
  }, [initialEmail, mode]);

  // Password Reset Specific Fields
  const [recoveryStep, setRecoveryStep] = useState<'otp' | 'password'>('otp');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const isManualOtpSubmittingRef = useRef(false);

  // Sign up step: 'form' | 'otp'
  const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Loading state
  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'github' | 'apple' | 'submit' | 'otp' | 'resend' | 'reset' | null
  >(null);

  // Feedback Messages with Dynamic Multi-Language (i18n) Support
  const [errorPayload, setErrorPayload] = useState<LocalizedAuthErrorPayload | null>(null);
  const [successPayload, setSuccessPayload] = useState<LocalizedAuthErrorPayload | null>(null);

  // Automatically re-evaluates in the active language whenever language or t changes
  const errorMsg = useMemo(() => {
    if (!errorPayload) return null;
    return formatAuthError(errorPayload, t);
  }, [errorPayload, t]);

  const successMsg = useMemo(() => {
    if (!successPayload) return null;
    if (successPayload.key) return t(successPayload.key, successPayload.params) || successPayload.raw || null;
    return successPayload.raw || null;
  }, [successPayload, t]);

  const setErrorMsg = useCallback((err: string | LocalizedAuthErrorPayload | null, params?: Record<string, any>) => {
    if (!err) {
      setErrorPayload(null);
      return;
    }
    if (typeof err === 'string') {
      const parsed = parseAuthError(err);
      if (params) {
        parsed.params = { ...parsed.params, ...params };
      }
      setErrorPayload(parsed);
    } else {
      setErrorPayload(err);
    }
  }, []);

  const setSuccessMsg = useCallback((msg: string | { key: string; params?: Record<string, any> } | null) => {
    if (!msg) {
      setSuccessPayload(null);
      return;
    }
    if (typeof msg === 'string') {
      setSuccessPayload({ raw: msg });
    } else {
      setSuccessPayload(msg);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Listen for Supabase password recovery events (e.g. from email magic link callbacks)
  useEffect(() => {
    const handleRecovery = (e: any) => {
      // Ignore background recovery events if a manual OTP submission is actively being verified
      if (isManualOtpSubmittingRef.current || loadingProvider === 'otp') {
        return;
      }
      setMode('reset');
      setRecoveryStep('password');
      setIsRecoverySession(true);
      const recoveryEmail = (e?.detail?.email || '').trim();
      if (recoveryEmail) {
        setEmail((prev) => prev || recoveryEmail);
        try {
          sessionStorage.setItem(RECOVERY_EMAIL_STORAGE_KEY, recoveryEmail);
        } catch {}
      } else {
        try {
          const stored = sessionStorage.getItem(RECOVERY_EMAIL_STORAGE_KEY);
          if (stored) {
            setEmail((prev) => prev || stored);
          }
        } catch {}
      }
      setSuccessMsg({ key: 'authRecoveryLinkVerified' });
    };
    window.addEventListener('prombo_password_recovery', handleRecovery);
    return () => window.removeEventListener('prombo_password_recovery', handleRecovery);
  }, [loadingProvider]);

  // Toggle Remember Me and save preference
  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    try {
      if (checked) {
        localStorage.setItem(REMEMBER_ME_STORAGE_KEY, 'true');
        if (email.trim()) {
          localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email.trim());
        }
      } else {
        localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
        localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
      }
    } catch {}
  };

  // Switch between Sign In, Sign Up, Forgot, and Reset modes
  const handleSwitchMode = (newMode: AuthFormMode) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSignupStep('form');
    setRecoveryStep('otp');
    setIsRecoverySession(false);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    if (newMode === 'signin' || newMode === 'signup') {
      try {
        sessionStorage.removeItem(RECOVERY_EMAIL_STORAGE_KEY);
      } catch {}
    }
    setMode(newMode);
    prevInitialModeRef.current = newMode;
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  // Social Auth Handler - Strict Verified OAuth Providers
  const handleSocialAuth = async (provider: 'google' | 'github' | 'apple') => {
    setErrorMsg(null);
    setLoadingProvider(provider);
    const providerLabel = provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'Apple';

    try {
      const res = await AuthService.signInWithOAuth(provider);
      if (res.success && res.user) {
        try {
          sessionStorage.removeItem(RECOVERY_EMAIL_STORAGE_KEY);
        } catch {}
        setSuccessMsg(t.signedInSuccessfully);
        setTimeout(() => {
          onSuccess(res.user!);
        }, 350);
      } else {
        const parsed = parseAuthError(res.error || 'authOAuthDisabled');
        if (!parsed.params?.provider) {
          parsed.params = { provider: providerLabel };
        }
        setErrorMsg(parsed);

        // Dispatch prominent error toast with i18n key and params
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('prombo_toast', {
              detail: {
                message: formatAuthError(parsed, t),
                messageKey: parsed.key,
                params: parsed.params,
                type: 'error',
                duration: 5000,
              },
            })
          );
        }
      }
    } catch (err: any) {
      const parsed = parseAuthError(err?.message || 'authOAuthDisabled');
      if (!parsed.params?.provider) {
        parsed.params = { provider: providerLabel };
      }
      setErrorMsg(parsed);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('prombo_toast', {
            detail: {
              message: formatAuthError(parsed, t),
              messageKey: parsed.key,
              params: parsed.params,
              type: 'error',
              duration: 5000,
            },
          })
        );
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // Email Sign In Handler
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('emailRequired');
      return;
    }

    if (!password) {
      setErrorMsg('authPasswordRequired');
      return;
    }

    setLoadingProvider('submit');
    try {
      const res = await AuthService.signInWithEmail(cleanEmail, password);
      if (res.success && res.user) {
        try {
          sessionStorage.removeItem(RECOVERY_EMAIL_STORAGE_KEY);
          if (rememberMe) {
            localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, cleanEmail);
            localStorage.setItem(REMEMBER_ME_STORAGE_KEY, 'true');
          } else {
            localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
            localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
          }
        } catch {}
        setSuccessMsg(t.signedInSuccessfully);
        setTimeout(() => {
          onSuccess(res.user!);
        }, 350);
      } else {
        setErrorMsg(res.error || 'authInvalidCredentials');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authInvalidCredentials');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Email Sign Up Handler: Expects a 6-digit OTP code ({{ .Token }})
  const handleRequestOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('usernameRequired');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('emailRequired');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('passwordTooShort');
      return;
    }

    // 2. Immediately transition the UI to the 6-digit verification code input screen
    setSignupStep('otp');
    setOtpCode('');
    setResendCooldown(60);
    setLoadingProvider('submit');

    try {
      const res = await AuthService.signUpWithEmail(cleanEmail, password, cleanName);
      if (res.success) {
        setSuccessMsg({ key: 'authOtpSentSuccess' });
      } else {
        setErrorMsg(res.error || 'authFailedToSendOtp');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authUnexpectedError');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Verify OTP Handler - Strict 6-digit verification via supabase.auth.verifyOtp({ email, token, type: 'signup' })
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanToken = otpCode.trim();
    if (!cleanToken || cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      setErrorMsg('authEnterOtpDigits');
      return;
    }

    setLoadingProvider('otp');
    try {
      const res = await AuthService.verifyEmailOtp(email.trim().toLowerCase(), cleanToken, name.trim());
      if (res.success && res.user) {
        try {
          sessionStorage.removeItem(RECOVERY_EMAIL_STORAGE_KEY);
        } catch {}
        setSuccessMsg(t.accountCreatedSuccessfully);
        setTimeout(() => {
          onSuccess(res.user!);
        }, 300);
      } else {
        setErrorMsg(res.error || 'authOtpInvalidOrExpired');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authOtpInvalidOrExpired');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Resend OTP via Supabase Auth
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    setLoadingProvider('resend');
    try {
      const res = await AuthService.resendVerificationOtp(email.trim());
      if (res.success) {
        setSuccessMsg({ key: 'authOtpResentSuccess' });
        setResendCooldown(60);
      } else {
        setErrorMsg(res.error || 'authFailedToResendCode');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authFailedToResendCode');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Password Reset Request Handler ('forgot' mode)
  const handleRequestResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('emailRequired');
      return;
    }

    setLoadingProvider('reset');
    try {
      const res = await AuthService.resetPassword(cleanEmail);
      if (res.success) {
        try {
          sessionStorage.setItem(RECOVERY_EMAIL_STORAGE_KEY, cleanEmail);
        } catch {}
        setSuccessMsg({ key: 'authPasswordResetSent' });
        setMode('reset');
        prevInitialModeRef.current = 'reset';
        if (onModeChange) {
          onModeChange('reset');
        }
        setRecoveryStep('otp');
        setOtpCode('');
        setResendCooldown(60);
      } else {
        setErrorMsg(res.error || 'authFailedToSendOtp');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authUnexpectedError');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Resend Reset OTP Handler
  const handleResendResetOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    let targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      try {
        targetEmail = (sessionStorage.getItem(RECOVERY_EMAIL_STORAGE_KEY) || '').trim().toLowerCase();
        if (targetEmail) setEmail(targetEmail);
      } catch {}
    }
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('emailRequired');
      return;
    }

    setLoadingProvider('resend');
    try {
      const res = await AuthService.resetPassword(targetEmail);
      if (res.success) {
        try {
          sessionStorage.setItem(RECOVERY_EMAIL_STORAGE_KEY, targetEmail);
        } catch {}
        setSuccessMsg({ key: 'authOtpResentSuccess' });
        setResendCooldown(60);
      } else {
        setErrorMsg(res.error || 'authFailedToResendCode');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authFailedToResendCode');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Step 1: Verify Password Recovery OTP Code
  const handleVerifyResetOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      try {
        cleanEmail = (sessionStorage.getItem(RECOVERY_EMAIL_STORAGE_KEY) || '').trim().toLowerCase();
        if (cleanEmail) {
          setEmail(cleanEmail);
        }
      } catch {}
    }
    const cleanToken = otpCode.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('emailRequired');
      return;
    }

    if (!cleanToken || cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      setErrorMsg('authEnterOtpDigits');
      return;
    }

    setLoadingProvider('otp');
    isManualOtpSubmittingRef.current = true;
    try {
      const res = await AuthService.verifyRecoveryOtp(cleanEmail, cleanToken);
      if (res.success) {
        try {
          sessionStorage.setItem(RECOVERY_EMAIL_STORAGE_KEY, cleanEmail);
        } catch {}
        setSuccessMsg({ key: 'authIdentityVerified' });
        // Advance to Step 2 (Password screen) - completely unmounts the OTP timer/cooldown
        setMode('reset');
        setRecoveryStep('password');
        setIsRecoverySession(true);
      } else {
        setErrorMsg(res.error || 'authOtpInvalidOrExpired');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authOtpInvalidOrExpired');
    } finally {
      isManualOtpSubmittingRef.current = false;
      setLoadingProvider(null);
    }
  };

  // Step 2: Update Password Handler ('password' step)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      try {
        cleanEmail = (sessionStorage.getItem(RECOVERY_EMAIL_STORAGE_KEY) || '').trim().toLowerCase();
        if (cleanEmail) {
          setEmail(cleanEmail);
        }
      } catch {}
    }
    const cleanToken = otpCode.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('emailRequired');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('passwordTooShort');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('authPasswordsDoNotMatch');
      return;
    }

    setLoadingProvider('reset');
    try {
      let res: { success: boolean; user?: CommunityUser; error?: string };

      // Try authenticated updateUser first (session established by verifyRecoveryOtp or magic link)
      res = await AuthService.updatePassword(newPassword);

      // Fallback: If session was lost or expired, retry with OTP token if still available
      if (!res.success && cleanToken && cleanToken.length === 6) {
        res = await AuthService.verifyRecoveryOtpAndSetPassword(cleanEmail, cleanToken, newPassword);
      }

      if (res.success) {
        try {
          sessionStorage.removeItem(RECOVERY_EMAIL_STORAGE_KEY);
        } catch {}
        setSuccessMsg({ key: 'authPasswordResetSuccess' });
        if (res.user) {
          setTimeout(() => {
            onSuccess(res.user!);
          }, 600);
        } else {
          setTimeout(() => {
            handleSwitchMode('signin');
          }, 1200);
        }
      } else {
        setErrorMsg(res.error || 'authFailedToUpdatePassword');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'authUnexpectedError');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div
      className={`w-full touch-pan-y px-0.5 sm:px-1 py-1 select-text focus:outline-none flex flex-col ${
        scrollable
          ? 'max-h-[85vh] sm:max-h-[80vh] overflow-y-auto overscroll-contain touch-scroll-container'
          : ''
      } ${compact ? 'space-y-3 pb-2' : 'space-y-4 pb-2'}`}
      style={{
        touchAction: 'pan-y',
        ...(scrollable
          ? {
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorY: 'contain',
            }
          : {}),
      }}
    >
      {/* Inline Feedback Alerts */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold overflow-hidden"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold overflow-hidden"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP SECTION: DIRECT EXPANDED EMAIL & PASSWORD FORM (NO COLLAPSIBLE ACCORDION) */}
      <div className="space-y-3">
        {/* Mode Switcher Tabs: "تسجيل الدخول" vs "إنشاء حساب جديد" */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            id="auth-tab-signin"
            onClick={() => handleSwitchMode('signin')}
            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.signInTab || 'Sign In'}
          </button>
          <button
            type="button"
            id="auth-tab-signup"
            onClick={() => handleSwitchMode('signup')}
            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.signUpTab || 'Create Account'}
          </button>
        </div>

        {/* MODE 1: SIGN IN (Direct Email & Password Form) */}
        {mode === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="space-y-3" autoComplete="off">
            {/* Hidden decoy fields to divert browser password managers / autofill */}
            <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

            {/* Email Field */}
            <div className="space-y-1">
              <label
                htmlFor="auth-signin-email-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t.enterYourEmail}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-signin-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailAuthPlaceholder}
                  required
                  autoComplete="off"
                  className="w-full min-h-[44px] h-11 ps-10 pe-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label
                htmlFor="auth-signin-password-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t.passwordField}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-signin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  required
                  autoComplete="new-password"
                  className="w-full min-h-[44px] h-11 ps-10 pe-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  id="auth-toggle-password-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox & Forgot Password Link */}
            <div className="flex items-center justify-between pt-1 pb-0.5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="auth-remember-me-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => handleRememberMeChange(e.target.checked)}
                  className="w-4 h-4 rounded-md text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors cursor-pointer accent-orange-600"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t.rememberMe}
                </span>
              </label>

              <button
                type="button"
                id="auth-forgot-password-trigger"
                onClick={() => handleSwitchMode('forgot')}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 hover:underline cursor-pointer transition-all inline-flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30"
              >
                <span>{t.forgotPassword}</span>
              </button>
            </div>

            {/* Submit Sign In Button */}
            <button
              type="submit"
              id="auth-signin-submit-btn"
              disabled={loadingProvider === 'submit'}
              className="w-full min-h-[44px] h-11 mt-1 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 hover:shadow-lg hover:shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingProvider === 'submit' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.signInTab || 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 2: SIGN UP WITH STRICT EMAIL OTP VERIFICATION */}
        {mode === 'signup' && (
          <div>
            {signupStep === 'form' ? (
              /* STEP 1: Registration Credentials Input */
              <form onSubmit={handleRequestOtpSubmit} className="space-y-3">
                {/* Name / Display Name */}
                <div className="space-y-1">
                  <label
                    htmlFor="auth-signup-name-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t.usernameField}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-signup-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.usernamePlaceholder}
                      required
                      autoComplete="name"
                      className="w-full min-h-[44px] h-11 ps-10 pe-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="auth-signup-email-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t.enterYourEmail}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-signup-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailAuthPlaceholder}
                      required
                      autoComplete="email"
                      className="w-full min-h-[44px] h-11 ps-10 pe-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="auth-signup-password-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t.passwordField}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-signup-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.passwordPlaceholder}
                      required
                      autoComplete="new-password"
                      className="w-full min-h-[44px] h-11 ps-10 pe-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Strict Email Verification Security Badge */}
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-2 text-orange-700 dark:text-orange-300">
                  <ShieldCheck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    {t.authStrictVerificationNotice || 'Strict Verification: Creating an account requires real email verification (OTP) to prevent fake accounts.'}
                  </p>
                </div>

                {/* Request OTP Submit Button */}
                <button
                  type="submit"
                  id="auth-signup-request-otp-btn"
                  disabled={loadingProvider === 'submit'}
                  className="w-full min-h-[44px] h-11 mt-1 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 hover:shadow-lg hover:shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingProvider === 'submit' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{t.sendOtpOrMagicLink || 'Send Verification Code'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </>
                  )}
                </button>

                {/* Legal Consent Disclaimer */}
                <div className="pt-2 px-1 text-center">
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    <span>{t.termsAndPrivacyConsentPrefix || 'By creating an account, you agree to the'}{' '}</span>
                    <button
                      type="button"
                      id="auth-signup-legal-policy-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenLegalPolicy?.();
                      }}
                      className="font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {t.termsAndPrivacyPolicy || 'Terms of Service & Privacy Policy'}
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              /* STEP 2: Strict OTP Code Entry */
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-3.5">
                {/* Notice on target email */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.otpSentNotice || 'Verification code sent to:'}
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-white break-all">{email}</p>
                  <button
                    type="button"
                    onClick={() => setSignupStep('form')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer pt-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{t.changeEmail}</span>
                  </button>
                </div>

                {/* OTP Input Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-otp-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {t.enterVerificationCode}
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {otpCode.length}/6
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      required
                      autoFocus
                      className="w-full min-h-[48px] h-12 text-center text-lg tracking-[0.35em] font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Resend OTP button */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loadingProvider === 'resend'}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${loadingProvider === 'resend' ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0
                        ? `${t.resendOtpCode} (${resendCooldown}s)`
                        : t.resendOtpCode}
                    </span>
                  </button>
                </div>

                {/* Confirm OTP Button */}
                <button
                  type="submit"
                  id="auth-otp-verify-submit-btn"
                  disabled={loadingProvider === 'otp' || otpCode.trim().length !== 6}
                  className="w-full min-h-[44px] h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingProvider === 'otp' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.verifyAndSignIn}</span>
                    </>
                  )}
                </button>

                {/* Legal Consent Disclaimer */}
                <div className="pt-1.5 px-1 text-center">
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    <span>{t.termsAndPrivacyConsentPrefix || 'By creating an account, you agree to the'}{' '}</span>
                    <button
                      type="button"
                      id="auth-otp-legal-policy-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenLegalPolicy?.();
                      }}
                      className="font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {t.termsAndPrivacyPolicy || 'Terms of Service & Privacy Policy'}
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODE 3: FORGOT PASSWORD REQUEST FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleRequestResetSubmit} className="space-y-3.5">
            {/* Context Card */}
            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center space-y-1.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md shadow-orange-500/25">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.resetPasswordTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.resetPasswordDesc}
              </p>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label
                htmlFor="auth-forgot-email-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t.enterYourEmail}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-forgot-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailAuthPlaceholder || 'yourname@example.com'}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full min-h-[44px] h-11 ps-10 pe-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Send Reset Code Button */}
            <button
              type="submit"
              id="auth-forgot-submit-btn"
              disabled={loadingProvider === 'reset'}
              className="w-full min-h-[44px] h-11 mt-1 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 hover:shadow-lg hover:shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingProvider === 'reset' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.authSendResetCode || 'Send Reset Code'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>

            {/* Back to Sign In Link */}
            <div className="text-center pt-1">
              <button
                type="button"
                id="auth-forgot-back-to-signin-btn"
                onClick={() => handleSwitchMode('signin')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
                <span>{t.backToSignIn}</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 4: RECOVERY OTP & NEW PASSWORD FLOW (SPLIT INTO TWO DISTINCT STEPS) */}
        {mode === 'reset' && (
          <div>
            {recoveryStep === 'otp' ? (
              /* STEP 1: OTP Code Verification Screen */
              <form onSubmit={handleVerifyResetOtpSubmit} className="space-y-3.5">
                {/* Header Context Card */}
                <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center space-y-1.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md shadow-orange-500/25">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.authVerifyResetCode || 'Verify Reset Code'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t.authVerificationCodeSentTo || t.otpSentNotice}
                  </p>
                  {email ? (
                    <>
                      <p className="text-xs font-bold text-slate-800 dark:text-white break-all">{email}</p>
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('forgot')}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer pt-0.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{t.changeEmail}</span>
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      {t.pleaseEnterEmail}
                    </p>
                  )}
                </div>

                {/* Fallback Email Input if email state is empty */}
                {!email && (
                  <div className="space-y-1">
                    <label
                      htmlFor="auth-reset-otp-email-fallback-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {t.emailAuthLabel || t.enterYourEmail}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-reset-otp-email-fallback-input"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEmail(val);
                          try {
                            if (val.trim()) {
                              sessionStorage.setItem(RECOVERY_EMAIL_STORAGE_KEY, val.trim().toLowerCase());
                            }
                          } catch {}
                        }}
                        placeholder={t.emailAuthPlaceholder || 'yourname@example.com'}
                        required
                        dir="ltr"
                        autoComplete="email"
                        className="w-full min-h-[44px] h-11 ps-10 pe-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* 6-digit OTP Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-reset-otp-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {t.enterVerificationCode}
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {otpCode.length}/6
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-reset-otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      required
                      autoFocus
                      className="w-full min-h-[48px] h-12 text-center text-lg tracking-[0.35em] font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Cooldown Timer & Resend Button */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loadingProvider === 'resend'}
                    onClick={handleResendResetOtp}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${loadingProvider === 'resend' ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0
                        ? `${t.resendOtpCode} (${resendCooldown}s)`
                        : t.resendOtpCode}
                    </span>
                  </button>
                </div>

                {/* Primary Action Button: Verify Code */}
                <button
                  type="submit"
                  id="auth-reset-verify-otp-btn"
                  disabled={loadingProvider === 'otp' || otpCode.trim().length !== 6}
                  className="w-full min-h-[44px] h-11 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 hover:shadow-lg hover:shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingProvider === 'otp' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.authVerifyCodeAndProceed || 'Verify Code & Proceed'}</span>
                    </>
                  )}
                </button>

                {/* Secondary Action: Back to Sign In */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    id="auth-reset-otp-back-to-signin-btn"
                    onClick={() => handleSwitchMode('signin')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
                    <span>{t.backToSignIn}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Password Entry Screen (Completely free of ticking timers & OTP fields) */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                {/* Header Context Card without Timer */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center mx-auto shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {t.authIdentityVerified || 'Identity Verified'}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {t.authIdentityVerified || 'You can now set a new secure password for your account:'}
                  </p>
                  {email ? (
                    <p className="text-xs font-bold text-slate-800 dark:text-white break-all">{email}</p>
                  ) : null}
                </div>

                {/* Fallback Email Input if email state is empty in Step 2 */}
                {!email && (
                  <div className="space-y-1">
                    <label
                      htmlFor="auth-reset-step2-email-fallback-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {t.emailAuthLabel || t.enterYourEmail}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-reset-step2-email-fallback-input"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEmail(val);
                          try {
                            if (val.trim()) {
                              sessionStorage.setItem(RECOVERY_EMAIL_STORAGE_KEY, val.trim().toLowerCase());
                            }
                          } catch {}
                        }}
                        placeholder={t.emailAuthPlaceholder || 'yourname@example.com'}
                        required
                        dir="ltr"
                        autoComplete="email"
                        className="w-full min-h-[44px] h-11 ps-10 pe-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* New Password Input */}
                <div className="space-y-1">
                  <label
                    htmlFor="auth-reset-new-password-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t.newPasswordLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-reset-new-password-input"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.authNewPasswordPlaceholder || 'At least 6 characters'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      className="w-full min-h-[44px] h-11 ps-10 pe-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors p-1"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password Input */}
                <div className="space-y-1">
                  <label
                    htmlFor="auth-reset-confirm-password-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t.authConfirmNewPassword || 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-reset-confirm-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.authConfirmNewPasswordPlaceholder || 'Re-enter your password to confirm'}
                      required
                      autoComplete="new-password"
                      className="w-full min-h-[44px] h-11 ps-10 pe-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors p-1"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button: Update Password & Sign In */}
                <button
                  type="submit"
                  id="auth-reset-submit-btn"
                  disabled={loadingProvider === 'reset'}
                  className="w-full min-h-[44px] h-11 mt-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingProvider === 'reset' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.updatePasswordButton}</span>
                    </>
                  )}
                </button>

                {/* Secondary Action: Back to Sign In */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    id="auth-reset-back-to-signin-btn"
                    onClick={() => handleSwitchMode('signin')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
                    <span>{t.backToSignIn}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* 2. CLEAN DIVIDER & QUICK OAUTH (ONLY ON SIGNIN / SIGNUP MODES) */}
      {(mode === 'signin' || mode === 'signup') && (
        <>
          <div className="relative flex items-center justify-center my-3.5">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            <span className="absolute px-3 bg-white dark:bg-[#182232] text-xs font-bold text-slate-400 dark:text-slate-500">
              {t.authOrContinueWith || t.orContinueWith || 'Or continue with'}
            </span>
          </div>

          {/* 3. QUICK OAUTH BUTTONS POSITIONED BELOW THE DIVIDER LINE */}
          <div className="space-y-2">
            {/* Continue with Google */}
            <button
              type="button"
              id="auth-social-google-btn"
              onClick={() => handleSocialAuth('google')}
              disabled={!!loadingProvider}
              className="w-full min-h-[44px] h-11 px-4 rounded-2xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                {loadingProvider === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span className="font-bold">
                  {loadingProvider === 'google' ? t.authConnecting : t.signInWithGoogle}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                Google
              </span>
            </button>

            {/* Continue with GitHub */}
            <button
              type="button"
              id="auth-social-github-btn"
              onClick={() => handleSocialAuth('github')}
              disabled={!!loadingProvider}
              className="w-full min-h-[44px] h-11 px-4 rounded-2xl bg-[#24292e] hover:bg-[#1b1f23] text-white border border-slate-700/80 font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                {loadingProvider === 'github' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                )}
                <span className="font-bold">
                  {loadingProvider === 'github' ? t.authConnecting : t.signInWithGitHub}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-200">
                GitHub
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
