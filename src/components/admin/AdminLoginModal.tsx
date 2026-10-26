import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import { getSupabaseClient } from '../../services/supabaseClient';
import { AuthService, getRandomAvatar } from '../../services/authService';
import { isAdminEmail } from '../../utils/authUtils';
import { safeStorage } from '../../utils/securityUtils';
import { CommunityUser } from '../../types';
import { useApp } from '../../context/AppContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

type AdminAuthMode = 'login' | 'forgot_email' | 'forgot_otp' | 'forgot_password';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { t, isRTL, language } = useApp();
  const [mode, setMode] = useState<AdminAuthMode>('login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & feedback
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 60-second OTP resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Reset inputs and mode whenever the modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
      setShowPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setLoading(false);
      setIsResending(false);
      setResendCooldown(0);
      setMode('login');
      try {
        sessionStorage.removeItem('prombo_admin_recovery_active');
      } catch {}
    } else {
      try {
        sessionStorage.removeItem('prombo_admin_recovery_active');
      } catch {}
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    try {
      sessionStorage.removeItem('prombo_admin_recovery_active');
    } catch {}
    onClose();
  };

  // Listen for Supabase password recovery events (e.g. from magic link callbacks)
  useEffect(() => {
    const handleRecovery = (e: any) => {
      const recoveryEmail = e?.detail?.email || e?.detail?.session?.user?.email;
      if (recoveryEmail) {
        setEmail(recoveryEmail);
      }
      try {
        sessionStorage.setItem('prombo_admin_recovery_active', 'true');
      } catch {}
      setMode('forgot_password');
    };
    window.addEventListener('prombo_password_recovery', handleRecovery);
    return () => window.removeEventListener('prombo_password_recovery', handleRecovery);
  }, []);

  // -------------------------------------------------------------
  // 1. ADMIN LOGIN HANDLER
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
          : 'Please enter both email and password'
      );
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(
        language === 'ar'
          ? 'خدمة المصادقة غير مهيأة حالياً'
          : 'Authentication service is not configured'
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Direct Supabase Auth invocation
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError || !data?.user) {
        setLoading(false);
        const rawMsg = authError?.message || '';
        if (
          rawMsg.toLowerCase().includes('invalid login credentials') ||
          rawMsg.toLowerCase().includes('invalid_grant')
        ) {
          setError(
            language === 'ar'
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
              : 'Invalid email or password'
          );
        } else if (rawMsg.toLowerCase().includes('email not confirmed')) {
          setError(
            language === 'ar'
              ? 'يرجى تأكيد بريدك الإلكتروني أولاً قبل المتابعة'
              : 'Please confirm your email address before signing in'
          );
        } else {
          setError(rawMsg || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Sign in failed'));
        }
        return;
      }

      // 2. Strict Admin Authority Verification
      const user = data.user;
      const userRole = user.user_metadata?.role || user.app_metadata?.role;
      const existingProfile = AuthService.getAllProfiles().find(
        (p) => p.id === user.id || (p.email && p.email.toLowerCase() === cleanEmail)
      );

      const isAuthorizedAdmin =
        userRole === 'admin' ||
        existingProfile?.role === 'admin' ||
        isAdminEmail(cleanEmail);

      if (!isAuthorizedAdmin) {
        await supabase.auth.signOut({ scope: 'global' });
        setLoading(false);
        setError(
          language === 'ar'
            ? 'عذراً، هذا الحساب لا يمتلك صلاحيات المشرف للوصول إلى لوحة التحكم'
            : 'Access denied: This account does not have administrator privileges'
        );
        return;
      }

      // 3. Establish synchronized admin user & session
      const adminCommunityUser: CommunityUser = {
        id: user.id,
        name: user.user_metadata?.name || existingProfile?.name || cleanEmail.split('@')[0],
        username: user.user_metadata?.username || existingProfile?.username || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: user.user_metadata?.avatar_url || existingProfile?.avatar || getRandomAvatar(user.id),
        role: 'admin',
        isGuest: false,
        isBanned: false,
        createdAt: user.created_at || new Date().toISOString(),
      };

      AuthService.upsertProfile(adminCommunityUser);
      AuthService.setCurrentUser(adminCommunityUser);

      // Store admin session and config for backward compatibility across tabs
      safeStorage.setItem(
        'prombo_admin_session_v1',
        JSON.stringify({
          email: cleanEmail,
          role: 'admin',
          lastLogin: new Date().toISOString(),
          token: data.session?.access_token || `tok_${Date.now()}`,
        })
      );
      safeStorage.setItem(
        'prombo_admin_user_v1',
        JSON.stringify({
          email: cleanEmail,
          role: 'admin',
          lastLogin: new Date().toISOString(),
        })
      );

      setLoading(false);
      // ONLY trigger onLoginSuccess(); DO NOT invoke onClose() here as onClose resets route to home
      onLoginSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(
        err?.message ||
          (language === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'An error occurred during login')
      );
    }
  };

  // -------------------------------------------------------------
  // 2. STEP 1: REQUEST OTP CODE (forgot_email)
  // -------------------------------------------------------------
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صالح'
          : 'Please enter a valid email address'
      );
      return;
    }

    setLoading(true);

    try {
      try {
        sessionStorage.setItem('prombo_admin_recovery_active', 'true');
      } catch {}
      const res = await AuthService.resetPassword(cleanEmail);
      setLoading(false);

      if (res.success) {
        setOtpCode('');
        setResendCooldown(60);
        setMode('forgot_otp');
        setSuccessMsg(
          language === 'ar'
            ? 'تم إرسال رمز التحقق (OTP) المكون من 6 أرقام إلى بريدك الإلكتروني.'
            : 'A 6-digit verification code has been sent to your email.'
        );
      } else {
        setError(
          res.error ||
            (language === 'ar' ? 'تعذر إرسال رمز التحقق' : 'Failed to send verification code')
        );
      }
    } catch (err: any) {
      setLoading(false);
      setError(
        err?.message ||
          (language === 'ar'
            ? 'حدث خطأ أثناء إرسال الرمز'
            : 'An error occurred while sending the code')
      );
    }
  };

  // -------------------------------------------------------------
  // 3. STEP 2: RESEND OTP CODE
  // -------------------------------------------------------------
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError(language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      return;
    }

    setIsResending(true);
    try {
      const res = await AuthService.resetPassword(cleanEmail);
      setIsResending(false);

      if (res.success) {
        setResendCooldown(60);
        setSuccessMsg(
          language === 'ar'
            ? 'تمت إعادة إرسال رمز التحقق (OTP) الجديد بنجاح.'
            : 'A new 6-digit verification code has been resent successfully.'
        );
      } else {
        setError(res.error || (language === 'ar' ? 'تعذر إعادة إرسال الرمز' : 'Failed to resend code'));
      }
    } catch (err: any) {
      setIsResending(false);
      setError(
        err?.message ||
          (language === 'ar' ? 'حدث خطأ أثناء إعادة الإرسال' : 'Error resending verification code')
      );
    }
  };

  // -------------------------------------------------------------
  // 4. STEP 2: VERIFY 6-DIGIT OTP CODE (forgot_otp)
  // -------------------------------------------------------------
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = otpCode.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Valid email is required');
      return;
    }

    if (!cleanToken || cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام بدقة.'
          : 'Please enter the exact 6-digit verification code.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await AuthService.verifyRecoveryOtp(cleanEmail, cleanToken);
      setLoading(false);

      if (res.success) {
        setSuccessMsg(
          language === 'ar'
            ? 'تم تأكيد الرمز بنجاح! يمكنك الآن كتابة كلمة المرور الجديدة.'
            : 'Code verified successfully! You can now set your new password.'
        );
        setMode('forgot_password');
      } else {
        setError(
          res.error ||
            (language === 'ar'
              ? 'رمز التحقق غير صالح أو منتهي الصلاحية'
              : 'Invalid or expired verification code')
        );
      }
    } catch (err: any) {
      setLoading(false);
      setError(
        err?.message ||
          (language === 'ar' ? 'حدث خطأ أثناء التحقق من الرمز' : 'Error verifying verification code')
      );
    }
  };

  // -------------------------------------------------------------
  // 5. STEP 3: SET NEW PASSWORD (forgot_password)
  // -------------------------------------------------------------
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = otpCode.trim();

    if (!newPassword || newPassword.length < 6) {
      setError(
        language === 'ar'
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        language === 'ar'
          ? 'كلمات المرور غير متطابقة، يرجى التأكد وإعادة المحاولة'
          : 'Passwords do not match. Please verify and try again.'
      );
      return;
    }

    setLoading(true);

    try {
      let res = await AuthService.updatePassword(newPassword);

      // Fallback: If session was lost or expired, retry with verified OTP token
      if (!res.success && cleanToken && cleanToken.length === 6) {
        res = await AuthService.verifyRecoveryOtpAndSetPassword(cleanEmail, cleanToken, newPassword);
      }

      setLoading(false);

      if (res.success) {
        try {
          sessionStorage.removeItem('prombo_admin_recovery_active');
          if (cleanEmail) {
            safeStorage.setItem(
              'prombo_admin_user_v1',
              JSON.stringify({
                email: cleanEmail,
                role: 'admin',
                lastLogin: new Date().toISOString(),
              })
            );

            // Also ensure the profile in PROFILES_KEY has role: 'admin'
            const allProfiles = AuthService.getAllProfiles();
            const existingIdx = allProfiles.findIndex(
              (p) => p.email && p.email.toLowerCase() === cleanEmail
            );
            if (existingIdx !== -1) {
              allProfiles[existingIdx].role = 'admin';
              AuthService.saveProfiles(allProfiles);
            } else {
              const newAdminProfile: CommunityUser = {
                id: res.user?.id || `user-admin-${Date.now()}`,
                name: res.user?.name || cleanEmail.split('@')[0],
                username: res.user?.username || cleanEmail.split('@')[0],
                email: cleanEmail,
                avatar: res.user?.avatar || 'preset_26_lightning',
                role: 'admin',
                isGuest: false,
                isBanned: false,
                createdAt: new Date().toISOString(),
              };
              AuthService.upsertProfile(newAdminProfile);
            }
          }
        } catch {}
        setEmail('');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setMode('login');
        setSuccessMsg(
          language === 'ar'
            ? 'تم تحديث كلمة المرور بنجاح! يرجى إدخال بريدك الإلكتروني وكلمة المرور الجديدة لتسجيل الدخول.'
            : 'Password updated successfully! Please enter your email and new password to sign in.'
        );
      } else {
        setError(
          res.error ||
            (language === 'ar' ? 'تعذر تحديث كلمة المرور' : 'Failed to update password')
        );
      }
    } catch (err: any) {
      setLoading(false);
      setError(
        err?.message ||
          (language === 'ar' ? 'حدث خطأ أثناء تحديث كلمة المرور' : 'An error occurred')
      );
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-[calc(100vw-2rem)] sm:w-full max-w-md mx-auto bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8"
          >
            {/* Close / Return button (Strictly calls handleCloseModal without triggering login success) */}
            <button
              type="button"
              onClick={handleCloseModal}
              aria-label={t('modalClose')}
              className={`absolute top-4 ${
                isRTL ? 'left-4' : 'right-4'
              } p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center mx-auto shadow-xs">
                {mode === 'forgot_otp' ? (
                  <KeyRound className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {mode === 'login' &&
                  (t('adminLoginTitle') || (language === 'ar' ? 'تسجيل دخول المشرف' : 'Admin Login'))}
                {mode === 'forgot_email' &&
                  (language === 'ar' ? 'استعادة كلمة مرور المشرف' : 'Reset Admin Password')}
                {mode === 'forgot_otp' &&
                  (language === 'ar' ? 'تأكيد رمز التحقق (OTP)' : 'Verify Reset Code (OTP)')}
                {mode === 'forgot_password' &&
                  (language === 'ar' ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {mode === 'login' &&
                  (t('adminLoginSubtext') ||
                    (language === 'ar'
                      ? 'أدخل بيانات حساب المشرف للمتابعة إلى لوحة التحكم'
                      : 'Enter your administrator credentials to access the panel'))}
                {mode === 'forgot_email' &&
                  (language === 'ar'
                    ? 'أدخل البريد الإلكتروني للمشرف لتلقي رمز التحقق المكون من 6 أرقام'
                    : 'Enter your admin email to receive a 6-digit recovery code')}
                {mode === 'forgot_otp' &&
                  (language === 'ar'
                    ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني'
                    : 'Enter the 6-digit verification code sent to your email')}
                {mode === 'forgot_password' &&
                  (language === 'ar'
                    ? 'اكتب كلمة مرور جديدة قوية ومؤكدة لحساب المشرف'
                    : 'Create a new secure password for your administrator account')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* VIEW 1: LOGIN */}
            {/* -------------------------------------------------------- */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                {/* Hidden decoy fields to divert browser password managers / autofill */}
                <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('adminEmailLabel') || (language === 'ar' ? 'البريد الإلكتروني' : 'Admin Email')}
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${
                        isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
                      } flex items-center pointer-events-none text-slate-400`}
                    >
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل بريد الإدارة...' : 'admin@example.com'}
                      autoComplete="off"
                      className={`w-full ${
                        isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'
                      } py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('adminPasswordLabel') || (language === 'ar' ? 'كلمة المرور' : 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setSuccessMsg('');
                        try {
                          sessionStorage.setItem('prombo_admin_recovery_active', 'true');
                        } catch {}
                        setMode('forgot_email');
                      }}
                      className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline cursor-pointer"
                    >
                      {language === 'ar' ? 'نسيت كلمة السر؟' : 'Forgot password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${
                        isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
                      } flex items-center pointer-events-none text-slate-400`}
                    >
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className={`w-full ${
                        isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
                      } py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 ${
                        isRTL ? 'left-0 pl-3' : 'right-0 pr-3'
                      } flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {t('adminSignInButton') ||
                          (language === 'ar' ? 'تسجيل الدخول إلى لوحة التحكم' : 'Sign In to Dashboard')}
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* -------------------------------------------------------- */}
            {/* VIEW 2: STEP 1 - ENTER EMAIL FOR OTP (forgot_email) */}
            {/* -------------------------------------------------------- */}
            {mode === 'forgot_email' && (
              <form onSubmit={handleRequestResetOtp} className="space-y-4" autoComplete="off">
                <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {language === 'ar' ? 'بريد حساب المشرف' : 'Admin Account Email'}
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${
                        isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
                      } flex items-center pointer-events-none text-slate-400`}
                    >
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل بريد المشرف...' : 'admin@example.com'}
                      autoComplete="off"
                      className={`w-full ${
                        isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'
                      } py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>
                        {language === 'ar'
                          ? 'إرسال رمز التحقق (OTP)'
                          : 'Send 6-digit Verification Code'}
                      </span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMsg('');
                      try {
                        sessionStorage.removeItem('prombo_admin_recovery_active');
                      } catch {}
                      setMode('login');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <BackIcon className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Admin Login'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* -------------------------------------------------------- */}
            {/* VIEW 3: STEP 2 - ENTER 6-DIGIT OTP (forgot_otp) */}
            {/* -------------------------------------------------------- */}
            {mode === 'forgot_otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4" autoComplete="off">
                <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                {/* Header Context Box */}
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center space-y-1">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {language === 'ar'
                      ? 'تم إرسال رمز التحقق المكون من 6 أرقام إلى:'
                      : 'A 6-digit verification code has been sent to:'}
                  </p>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 break-all">
                    {email}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMsg('');
                      setMode('forgot_email');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer pt-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{language === 'ar' ? 'تعديل البريد الإلكتروني' : 'Change email'}</span>
                  </button>
                </div>

                {/* 6-digit OTP Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {language === 'ar' ? 'رمز التحقق (OTP)' : '6-digit OTP Code'}
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {otpCode.length}/6
                    </span>
                  </div>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${
                        isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
                      } flex items-center pointer-events-none text-slate-400`}
                    >
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
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
                      className="w-full py-2.5 text-center text-lg tracking-[0.35em] font-mono font-bold bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Resend Cooldown Button */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isResending}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0
                        ? `${language === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code'} (${resendCooldown}s)`
                        : language === 'ar'
                        ? 'إعادة إرسال الرمز'
                        : 'Resend code'}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.trim().length !== 6}
                  className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === 'ar' ? 'تأكيد الرمز والمتابعة' : 'Verify Code & Proceed'}</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMsg('');
                      try {
                        sessionStorage.removeItem('prombo_admin_recovery_active');
                      } catch {}
                      setMode('login');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <BackIcon className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إلغاء والعودة لتسجيل الدخول' : 'Cancel & Return to Login'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* -------------------------------------------------------- */}
            {/* VIEW 4: STEP 3 - ENTER NEW PASSWORD (forgot_password) */}
            {/* -------------------------------------------------------- */}
            {mode === 'forgot_password' && (
              <form onSubmit={handleSetNewPassword} className="space-y-4" autoComplete="off">
                <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {language === 'ar' ? 'تم تأكيد الهوية بنجاح' : 'Identity Verified'}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {language === 'ar'
                      ? 'يمكنك الآن كتابة وتأكيد كلمة المرور الجديدة لحساب المشرف:'
                      : 'You can now set a new secure password for your administrator account:'}
                  </p>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${
                        isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
                      } flex items-center pointer-events-none text-slate-400`}
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل 6 أحرف على الأقل' : 'At least 6 characters'}
                      autoComplete="new-password"
                      className={`w-full ${
                        isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
                      } py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute inset-y-0 ${
                        isRTL ? 'left-0 pl-3' : 'right-0 pr-3'
                      } flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer`}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 ${
                        isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'
                      } flex items-center pointer-events-none text-slate-400`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور للتأكيد' : 'Re-enter to confirm'}
                      autoComplete="new-password"
                      className={`w-full ${
                        isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
                      } py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute inset-y-0 ${
                        isRTL ? 'left-0 pl-3' : 'right-0 pr-3'
                      } flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer`}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {language === 'ar'
                          ? 'تحديث كلمة المرور والدخول'
                          : 'Update Password & Proceed to Login'}
                      </span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMsg('');
                      try {
                        sessionStorage.removeItem('prombo_admin_recovery_active');
                      } catch {}
                      setMode('login');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <BackIcon className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Admin Login'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
