import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storage';
import { useApp } from '../../context/AppContext';

interface AdminOwnershipTransferTabProps {
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onTransferSuccess: () => void;
}

export const AdminOwnershipTransferTab: React.FC<AdminOwnershipTransferTabProps> = ({
  onShowToast,
  onTransferSuccess,
}) => {
  const { language, isRTL } = useApp();

  // Current Owner fields - strictly initialized to empty strings
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // New Owner fields - strictly initialized to empty strings
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Confirmation modal & processing
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [understoodRisks, setUnderstoodRisks] = useState(false);

  // Validate form prior to opening modal
  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCurrEmail = currentEmail.trim().toLowerCase();
    const cleanNewEmail = newEmail.trim().toLowerCase();

    if (!cleanCurrEmail || !cleanCurrEmail.includes('@')) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني للمالك الحالي بشكل صحيح' : 'Please enter a valid current owner email');
      return;
    }
    if (!currentPassword) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال كلمة مرور المالك الحالي' : 'Current owner password is required');
      return;
    }
    if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني للمالك الجديد بشكل صحيح' : 'Please enter a valid new owner email');
      return;
    }
    if (cleanCurrEmail === cleanNewEmail) {
      setErrorMsg(language === 'ar' ? 'البريد الإلكتروني للمالك الجديد يجب أن يختلف عن المالك الحالي' : 'New owner email must be different from current owner email');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg(language === 'ar' ? 'كلمة المرور الجديدة يجب ألا تقل عن 8 خانات' : 'New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(language === 'ar' ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين' : 'New password and confirmation do not match');
      return;
    }

    setUnderstoodRisks(false);
    setIsConfirmModalOpen(true);
  };

  // Perform transfer
  const handleExecuteTransfer = async () => {
    if (!understoodRisks || isProcessing) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await AuthService.transferOwnership({
        currentOwnerEmail: currentEmail,
        currentOwnerPassword: currentPassword,
        newOwnerEmail: newEmail,
        newOwnerPassword: newPassword,
        confirmNewOwnerPassword: confirmPassword,
      });

      if (!res.success) {
        setIsProcessing(false);
        setIsConfirmModalOpen(false);
        setErrorMsg(res.error || (language === 'ar' ? 'فشلت عملية نقل الملكية' : 'Ownership transfer failed'));
        onShowToast(res.error || 'Failed to transfer ownership', 'error');
        return;
      }

      onShowToast(
        language === 'ar'
          ? 'تم نقل ملكية الموقع بالكامل بنجاح. سيتم توجيهك لتسجيل الدخول.'
          : 'Ownership transferred successfully. Redirecting to login...',
        'success'
      );

      setIsConfirmModalOpen(false);

      // Redirect after brief delay
      setTimeout(() => {
        onTransferSuccess();
      }, 1500);
    } catch (err: any) {
      setIsProcessing(false);
      setIsConfirmModalOpen(false);
      const msg = err?.message || (language === 'ar' ? 'حدث خطأ غير متوقع أثناء نقل الملكية' : 'Unexpected error during transfer');
      setErrorMsg(msg);
      onShowToast(msg, 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Banner Warning */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 border border-red-500/30 text-slate-800 dark:text-slate-200">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-red-600 dark:text-red-400">
              {language === 'ar' ? 'إدارة ونقل ملكية المنصة بالكامل' : 'Site Ownership Transfer Control'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {language === 'ar'
                ? 'تتيح لك هذه اللوحة التنازل الآمن عن ملكية الموقع وحساب الإدارة الرئيسي بالكامل إلى بريد وكلمة مرور مالك جديد. تتطلب هذه العملية إعادة المصادقة على كلمة المرور الحالية، وتؤدي فور إتمامها إلى تدمير كافة الجلسات الحالية عالمياً.'
                : 'This panel allows you to securely transfer full site ownership and primary administrative credentials to a new owner. This action re-authenticates current credentials and forces immediate global session termination.'}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleOpenConfirmModal} className="space-y-6" autoComplete="off">
        {/* Invisible decoy inputs to prevent browser autofill/password manager injection */}
        <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
        <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

        {/* Section 1: Current Owner Verification */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-[#2A384C]">
            <KeyRound className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'الخطوة 1: التحقق من هوية المالك الحالي' : 'Step 1: Current Owner Verification'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'أدخل بيانات الاعتماد النشطة للتأكد من هويتك كمالك مرخص للمنصة'
                  : 'Enter current active credentials to verify your authorization'}
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'البريد الإلكتروني للمالك الحالي' : 'Current Owner Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  placeholder="admin@prombo.ai"
                  autoComplete="off"
                  className="w-full ps-9 pe-3.5 py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'كلمة مرور المالك الحالي' : 'Current Owner Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className="w-full ps-9 pe-10 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: New Owner Setup */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-[#2A384C]">
            <ArrowRightLeft className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'الخطوة 2: إعداد بيانات المالك الجديد' : 'Step 2: New Owner Setup'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'سيصبح هذا الحساب هو المسؤول والمالك الوحيد للموقع بعد النقل'
                  : 'This account will become the sole primary administrator of the platform'}
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'البريد الإلكتروني للمالك الجديد' : 'New Owner Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newowner@example.com"
                  autoComplete="off"
                  className="w-full ps-9 pe-3.5 py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'كلمة مرور المالك الجديد' : 'New Owner Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full ps-9 pe-10 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  {language === 'ar' ? 'الحد الأدنى 8 خانات' : 'Minimum 8 characters'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'تأكيد كلمة مرور المالك الجديد' : 'Confirm New Owner Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full ps-9 pe-10 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword && (
                  <p className={`text-[10px] flex items-center gap-1 ${newPassword === confirmPassword ? 'text-emerald-500' : 'text-red-500'}`}>
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{language === 'ar' ? 'كلمات المرور متطابقة' : 'Passwords match'}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>{language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{language === 'ar' ? 'نقل ملكية الموقع بالكامل' : 'Transfer Site Ownership'}</span>
          </button>
        </div>
      </form>

      {/* Explicit Security Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setIsConfirmModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#151D2A] border-2 border-red-500/40 rounded-2xl shadow-2xl p-6 z-10 space-y-5"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-red-500/20 text-red-600 dark:text-red-400">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-red-600 dark:text-red-400">
                      {language === 'ar' ? 'تحذير شديد الخطورة: نقل الملكية' : 'CRITICAL WARNING: Ownership Transfer'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'ar' ? 'عملية لا يمكن التراجع عنها بعد تأكيدها' : 'Irreversible Administrative Action'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning Content */}
              <div className="space-y-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-red-700 dark:text-red-300">
                  {language === 'ar'
                    ? 'أنت على وشك التنازل الكامل عن ملكية هذا الموقع إلى:'
                    : 'You are transferring complete ownership of this platform to:'}
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#2A384C] font-mono text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                  {newEmail}
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                  <li>
                    {language === 'ar'
                      ? 'سيتم تدمير جلستك الحالية فوراً وإلغاء صلاحيات حسابك كمالك.'
                      : 'Your current session will be immediately destroyed and admin privileges revoked.'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'لن يتمكن حسابك القديم من تسجيل الدخول إلى لوحة التحكم.'
                      : 'Your former credentials will no longer grant access to the Admin Dashboard.'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'لا يمكن التراجع إلا إذا قام المالك الجديد بإعادة نقلها إليك.'
                      : 'This cannot be reversed without the new owner explicitly transferring it back.'}
                  </li>
                </ul>
              </div>

              {/* Checkbox confirmation */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={understoodRisks}
                  onChange={(e) => setUnderstoodRisks(e.target.checked)}
                  disabled={isProcessing}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-normal">
                  {language === 'ar'
                    ? 'أقر بأنني فهمت جميع العواقب وأوافق على التنازل عن ملكية الموقع للمالك الجديد.'
                    : 'I acknowledge that I understand the consequences and agree to transfer site ownership.'}
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[#2A384C] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#182232] transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={!understoodRisks || isProcessing}
                  onClick={handleExecuteTransfer}
                  className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all ${
                    understoodRisks && !isProcessing
                      ? 'bg-red-600 hover:bg-red-500 cursor-pointer shadow-red-600/30'
                      : 'bg-red-900/50 text-red-200/50 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'ar' ? 'جارٍ نقل الملكية وتأمين النظام...' : 'Transferring Ownership...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>{language === 'ar' ? 'نعم، أنقل الملكية الآن' : 'Confirm & Transfer Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
