import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TopReportToastProps {
  isVisible: boolean;
  onDismiss: () => void;
  message?: string;
}

export const TopReportToast: React.FC<TopReportToastProps> = ({
  isVisible,
  onDismiss,
  message,
}) => {
  const { isRTL, t } = useApp();
  const displayMessage = message || t('reportSuccessToast');

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3800);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] pointer-events-none flex justify-center w-full px-4 max-w-md"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-2.5 py-2 px-4.5 rounded-xl bg-[#fafaf9] border border-slate-200/90 shadow-lg text-[#1e3a8a] backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-[#1e3a8a] shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-tight text-[#1e3a8a]">
              {displayMessage}
            </span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
