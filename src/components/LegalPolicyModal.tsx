import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  UserCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LEGAL_POLICIES } from '../data/legalPolicies';

interface LegalPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'terms' | 'privacy' | 'rights';
}

export const LegalPolicyModal: React.FC<LegalPolicyModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms',
}) => {
  const { language, isRTL, t } = useApp();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'rights'>(defaultTab);

  // Sync tab if defaultTab changes on reopen
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Retrieve policies for current language (fallback to English if missing)
  const currentPolicies = LEGAL_POLICIES[language] || LEGAL_POLICIES.en;
  const currentDoc = currentPolicies[activeTab] || currentPolicies.terms;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 z-10"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2
                      id="legal-modal-title"
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight"
                    >
                      {t.termsAndPrivacyPolicy || 'Terms of Service & Privacy Policy'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Prombo • AI Prompt Engineering & Community Platform
                    </p>
                  </div>
                </div>

                {/* Close Button ("X") */}
                <button
                  type="button"
                  id="close-legal-modal-btn"
                  onClick={onClose}
                  aria-label={t.closeLegalPolicy || 'Close'}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-4 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  id="legal-tab-terms"
                  onClick={() => setActiveTab('terms')}
                  className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'terms'
                      ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t.termsOfService || 'Terms of Service'}</span>
                </button>

                <button
                  type="button"
                  id="legal-tab-privacy"
                  onClick={() => setActiveTab('privacy')}
                  className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'privacy'
                      ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t.privacyPolicy || 'Privacy Policy'}</span>
                </button>

                <button
                  type="button"
                  id="legal-tab-rights"
                  onClick={() => setActiveTab('rights')}
                  className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'rights'
                      ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{t.legalDataRights || 'Data Rights & GDPR'}</span>
                </button>
              </div>
            </div>

            {/* Document Content Area (High Legibility Off-White/White) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-white dark:bg-slate-900">
              {/* Document Overview Banner */}
              <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentDoc.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {currentDoc.summary}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-orange-700 dark:text-orange-300 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{currentDoc.lastUpdated}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Sections */}
              <div className="space-y-6">
                {currentDoc.sections.map((section) => (
                  <div
                    key={section.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/60 pb-2.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {section.title}
                      </h4>
                      {section.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {section.badge}
                        </span>
                      )}
                    </div>

                    {/* Paragraphs */}
                    {section.paragraphs.map((p, idx) => (
                      <p
                        key={idx}
                        className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}

                    {/* Bullets */}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="space-y-2 pt-1">
                        {section.bullets.map((bullet, bIdx) => (
                          <li
                            key={bIdx}
                            className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Callout Notice */}
                    {section.callout && (
                      <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{section.callout}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-start">
                <span>{t.legalEffectiveDate || 'Effective: 2026'}</span> •{' '}
                <span>Prombo Global Compliance & Privacy</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="legal-modal-bottom-close-btn"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  {t.closeLegalPolicy || t.close || 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LegalPolicyModal;
