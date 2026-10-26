import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, ArrowRight, Key, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { useApp } from '../../context/AppContext';

interface AdminAuthScreenProps {
  onLoginSuccess: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateHome: () => void;
}

export const AdminAuthScreen: React.FC<AdminAuthScreenProps> = ({
  onLoginSuccess,
  onShowToast,
  onNavigateHome,
}) => {
  const { t, isRTL, language } = useApp();
  const [passphrase, setPassphrase] = useState('');
  const [email, setEmail] = useState('');
  const [showCustomEmail, setShowCustomEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPassphrase = passphrase.trim();
    if (!cleanPassphrase) {
      const errorMsg = language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter the admin password';
      setError(errorMsg);
      onShowToast(errorMsg, 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await StorageService.loginWithPassphrase(
        cleanPassphrase,
        showCustomEmail && email.trim() ? email.trim() : undefined
      );

      setLoading(false);

      if (result.success) {
        onLoginSuccess();
      } else {
        const errorMsg = language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid admin password';
        setError(errorMsg);
        onShowToast(errorMsg, 'error');
      }
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err?.message || (language === 'ar' ? 'حدث خطأ أثناء التحقق' : 'Authentication error');
      setError(errorMsg);
      onShowToast(errorMsg, 'error');
    }
  };

  return (
    <main
      id="admin-auth-screen"
      className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative min-h-[calc(100vh-80px)]"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
          {/* Header Shield & Brand Badge */}
          <div className="text-center space-y-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-200/80 dark:border-orange-500/30 flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {language === 'ar' ? 'تسجيل الدخول كأدمن' : 'Admin Login'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {language === 'ar'
                  ? 'يرجى إدخال كلمة مرور الإدارة للوصول إلى لوحة التحكم'
                  : 'Please enter your administrator passphrase to access the dashboard'}
              </p>
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Optional Custom Email Expandable Field */}
            {showCustomEmail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5"
              >
                <label
                  htmlFor="admin-email-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  {t('adminEmailLabel')}
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
                    id="admin-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="admin@example.com"
                    className={`w-full ${
                      isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
                    } py-2.5 bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors shadow-xs`}
                  />
                </div>
              </motion.div>
            )}

            {/* Admin Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-passphrase-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  {t('adminPasswordLabel')}
                </label>
                <button
                  type="button"
                  id="toggle-custom-email-btn"
                  onClick={() => setShowCustomEmail((prev) => !prev)}
                  className="text-[11px] text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{showCustomEmail ? (language === 'ar' ? 'إخفاء البريد' : 'Hide email') : (language === 'ar' ? 'تحديد بريد خاص' : 'Use specific email')}</span>
                  {showCustomEmail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
                  id="admin-passphrase-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={language === 'ar' ? 'أدخل كلمة المرور...' : 'Enter admin password...'}
                  autoComplete="current-password"
                  className={`w-full ${
                    isRTL ? 'pr-10 pl-11' : 'pl-10 pr-11'
                  } py-2.5 bg-slate-50 dark:bg-[#111827] border ${
                    error
                      ? 'border-red-400 dark:border-red-500/70 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-[#2A384C] focus:border-orange-500 focus:ring-orange-500'
                  } rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors shadow-xs`}
                />
                <button
                  type="button"
                  id="toggle-admin-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className={`absolute inset-y-0 ${
                    isRTL ? 'left-0 pl-3.5' : 'right-0 pr-3.5'
                  } flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              id="admin-login-submit-btn"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تسجيل الدخول كأدمن' : 'Admin Login'}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Back to Library Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              id="admin-return-home-btn"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
            >
              {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{language === 'ar' ? 'العودة إلى المكتبة الرئيسية' : 'Return to Library'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
};
