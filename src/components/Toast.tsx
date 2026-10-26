import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastNotification } from '../types';
import { useApp } from '../context/AppContext';

interface ToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  const { t } = useApp();

  return (
    <div className="fixed bottom-6 start-4 end-4 sm:start-auto sm:end-6 z-50 flex flex-col gap-2 pointer-events-none w-[calc(100vw-2rem)] sm:w-full max-w-md mx-auto sm:mx-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const displayMessage = toast.messageKey ? (t(toast.messageKey, toast.params) || toast.message) : toast.message;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all ${
                toast.customClass
                  ? toast.customClass
                  : toast.type === 'success'
                  ? 'bg-white dark:bg-[#182232] border-emerald-500/40 text-slate-900 dark:text-slate-100 shadow-emerald-500/5'
                  : toast.type === 'error'
                  ? 'bg-white dark:bg-[#182232] border-red-500/40 text-slate-900 dark:text-slate-100 shadow-red-500/5'
                  : 'bg-white dark:bg-[#182232] border-cyan-500/40 text-slate-900 dark:text-slate-100 shadow-cyan-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className={`w-7 h-7 rounded-lg ${toast.customClass ? 'bg-red-500/15 text-red-500 dark:text-red-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'} flex items-center justify-center shrink-0`}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                )}
                <p className={`text-xs sm:text-sm font-semibold leading-snug ${toast.customClass ? 'text-red-500 dark:text-red-400' : ''}`}>{displayMessage}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss toast"
                className={`p-1 rounded-lg transition-colors ms-2 ${toast.customClass ? 'text-red-400 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
