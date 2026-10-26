import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, UserPlus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface GuestRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickRegister: () => void;
}

export const GuestRestrictionModal: React.FC<GuestRestrictionModalProps> = ({
  isOpen,
  onClose,
  onQuickRegister,
}) => {
  const { t, isRTL } = useApp();

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Backdrop click to dismiss */}
          <div
            className="fixed inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Centered White Modal with Red Border */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-sm bg-white dark:bg-[#151D2A] rounded-2xl border-2 border-red-500 shadow-2xl p-6 sm:p-7 text-center space-y-5 z-10"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close corner button */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.cancel}
              className="absolute top-3 end-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Badge */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-500 shadow-xs">
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            </div>

            {/* Prompt Modal Interceptor Text */}
            <div className="space-y-1.5">
              <h3 className="text-red-600 dark:text-red-400 font-extrabold text-lg sm:text-xl leading-snug tracking-tight">
                {t.guestRestrictedTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t.guestRestrictedSubtitle}
              </p>
            </div>

            {/* Two Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {/* Cancel Button */}
              <button
                type="button"
                id="guest-modal-cancel-btn"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>

              {/* Quick Register Button */}
              <button
                type="button"
                id="guest-modal-quick-register-btn"
                onClick={() => {
                  onClose();
                  onQuickRegister();
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>{t.quickRegister}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
