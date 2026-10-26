import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Trash2,
  Ban,
  Shield,
  ShieldAlert,
  LogOut,
  Key,
  Mail,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export type ConfirmationVariant = 'danger' | 'warning' | 'primary' | 'info';

export interface ConfirmationDetailItem {
  label: string;
  value: string;
}

export interface AdminConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: React.ReactNode;
  details?: ConfirmationDetailItem[];
  isLoading?: boolean;
}

export const AdminConfirmationModal: React.FC<AdminConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'danger',
  icon,
  details,
  isLoading: externalLoading = false,
}) => {
  const { language, isRTL } = useApp();
  const [internalLoading, setInternalLoading] = useState(false);

  const loading = externalLoading || internalLoading;

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  // Default labels based on language if not provided
  const resolvedConfirmText =
    confirmText ||
    (variant === 'danger'
      ? language === 'ar'
        ? 'تأكيد الحذف / الإجراء'
        : 'Confirm Action'
      : language === 'ar'
      ? 'تأكيد'
      : 'Confirm');

  const resolvedCancelText = cancelText || (language === 'ar' ? 'إلغاء' : 'Cancel');

  const handleConfirmClick = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error in confirmation action', err);
    } finally {
      setInternalLoading(false);
    }
  };

  // Color schemas based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30',
          buttonBg: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50 shadow-md shadow-red-600/20',
          defaultIcon: <Trash2 className="w-5 h-5" />,
          accentBorder: 'border-red-500/30',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500/50 shadow-md shadow-amber-600/20',
          defaultIcon: <AlertTriangle className="w-5 h-5" />,
          accentBorder: 'border-amber-500/30',
        };
      case 'info':
        return {
          iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30',
          buttonBg: 'bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500/50 shadow-md shadow-sky-600/20',
          defaultIcon: <Shield className="w-5 h-5" />,
          accentBorder: 'border-sky-500/30',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
          buttonBg: 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500/50 shadow-md shadow-orange-600/20',
          defaultIcon: <AlertTriangle className="w-5 h-5" />,
          accentBorder: 'border-orange-500/30',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="admin-confirmation-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={() => !loading && onClose()}
        >
          <motion.div
            id="admin-confirmation-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-[calc(100vw-1.5rem)] sm:w-full max-w-md mx-auto bg-white dark:bg-[#151D2A] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 z-10`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-modal-title"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
              className="absolute top-4 end-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2b3e] transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Icon */}
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${styles.iconBg}`}
              >
                {icon || styles.defaultIcon}
              </div>
              <div className="min-w-0 flex-1 pt-0.5 pe-6">
                <h3
                  id="confirmation-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug"
                >
                  {title}
                </h3>
              </div>
            </div>

            {/* Description / Body */}
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-line">
              {description}
            </div>

            {/* Optional Structured Details Box */}
            {details && details.length > 0 && (
              <div className="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-[#111722] border border-slate-200 dark:border-[#243142] space-y-2 text-xs">
                {details.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {item.label}:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-[#243142]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#2A384C] transition-colors cursor-pointer disabled:opacity-50"
              >
                {resolvedCancelText}
              </button>

              <button
                type="button"
                onClick={handleConfirmClick}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 ${styles.buttonBg}`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>{resolvedConfirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
