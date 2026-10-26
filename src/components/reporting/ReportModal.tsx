import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert } from 'lucide-react';
import { ReportTargetPayload } from '../../types';
import { PREDEFINED_REPORT_TAGS, PredefinedReportTag, ReportService } from '../../services/reportService';
import { useApp } from '../../context/AppContext';
import { TranslationDictionary } from '../../i18n/translations';

const TAG_KEY_MAP: Record<PredefinedReportTag, keyof TranslationDictionary> = {
  'محتال': 'reportTagFraud',
  'مزعج': 'reportTagSpam',
  'عنصري': 'reportTagRacist',
  'مضلل': 'reportTagMisleading',
  'بذيء': 'reportTagObscene',
  'عدواني': 'reportTagAggressive',
  'متحرش': 'reportTagHarassment',
  'مهدد': 'reportTagThreatening',
  'مخترق': 'reportTagHacked',
  'منتحل': 'reportTagImpersonation',
  'مشبوه': 'reportTagSuspicious',
  'منتهك': 'reportTagInfringing',
  'مسروق': 'reportTagStolen',
  'خادع': 'reportTagDeceptive',
  'استغلالي': 'reportTagExploitative',
  'مسيء': 'reportTagAbusive',
  'غير لائق': 'reportTagInappropriate',
  'تحريضي': 'reportTagInciting',
  'متعصب': 'reportTagFanatical',
};

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ReportTargetPayload | null;
  onSuccessNotification?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccessNotification,
}) => {
  const { language, isRTL, t } = useApp();
  const [selectedTag, setSelectedTag] = useState<PredefinedReportTag | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setSelectedTag(null);
      setCustomReason('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Basic focus trap within the modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex="0"], textarea:not([disabled]), input:not([disabled])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  // Mutual Exclusivity Logic:
  // 1. If Section 2 has text: Section 1 is grayed out and locked.
  const isSection2Active = customReason.trim().length > 0;
  const isSection1Locked = isSection2Active;

  // 2. If a tag is selected: Section 2 (custom text box) is disabled/locked with a muted light gray border.
  const isSection1Active = selectedTag !== null;
  const isSection2Locked = isSection1Active;

  // Submit button active state:
  // Default disabled gray. Activating either Section 1 or Section 2 turns it active Dark Blue (#1e3a8a).
  const isSubmitActive = isSection1Active || isSection2Active;

  const handleTagClick = (tag: PredefinedReportTag) => {
    if (isSection1Locked) return;
    if (selectedTag === tag) {
      // Unselect unlocks Section 2
      setSelectedTag(null);
    } else {
      // Selecting tag changes its text color to solid gray and locks Section 2
      setSelectedTag(tag);
    }
  };

  const handleCustomReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isSection2Locked) return;
    setCustomReason(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitActive || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await ReportService.submitReport({
        target,
        tag: selectedTag || undefined,
        customReason: isSection2Active ? customReason.trim() : undefined,
      });

      // Trigger success callback (which triggers the thin top off-white/Dark Blue toast)
      if (onSuccessNotification) {
        onSuccessNotification();
      }

      onClose();
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetTypeLocalized = (type: string): string => {
    switch (type) {
      case 'prompt':
        return t('targetPrompt');
      case 'post':
        return t('targetPost');
      case 'reply':
        return t('targetReply');
      case 'comment':
        return t('targetComment');
      default:
        return t('targetContent');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && target && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white text-slate-900 border-2 border-slate-900 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 my-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Top Header */}
          <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2
                  id="report-modal-title"
                  className="text-base font-bold text-slate-900 leading-tight"
                >
                  {t('reportViolation')}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                  <span className="px-1.5 py-0.2 rounded-md bg-slate-100 border border-slate-300 font-semibold text-slate-700 text-[11px]">
                    {getTargetTypeLocalized(target.targetType)}
                  </span>
                  {target.targetTitle && (
                    <span className="truncate max-w-[200px] sm:max-w-[240px] font-medium text-slate-700">
                      «{target.targetTitle}»
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Section 1: Predefined Reasons Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{t('predefinedReasons')}</span>
                </label>
                {isSection1Locked && (
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {t('lockedCustomActive')}
                  </span>
                )}
              </div>

              {/* 19 Predefined Tags Grid */}
              <div
                className={`grid grid-cols-3 sm:grid-cols-4 gap-1.5 transition-opacity duration-150 ${
                  isSection1Locked ? 'opacity-35 pointer-events-none' : 'opacity-100'
                }`}
              >
                {PREDEFINED_REPORT_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag;
                  const localizedTag = TAG_KEY_MAP[tag] ? t(TAG_KEY_MAP[tag]) : tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={isSection1Locked}
                      onClick={() => handleTagClick(tag)}
                      className={`text-xs py-1.5 px-2 rounded-lg text-center font-medium transition-all select-none cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 border-2 border-slate-500 text-gray-700 font-bold shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-800'
                      }`}
                    >
                      {localizedTag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Custom Text Box */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="report-custom-reason"
                  className={`text-xs font-bold transition-colors ${
                    isSection2Locked ? 'text-slate-400' : 'text-slate-800'
                  }`}
                >
                  <span>{t('orCustomReasonDetails')}</span>
                </label>
                {isSection2Locked && (
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {t('lockedTagSelected')}
                  </span>
                )}
              </div>

              <div className="relative">
                <textarea
                  id="report-custom-reason"
                  ref={textareaRef}
                  disabled={isSection2Locked}
                  value={customReason}
                  onChange={handleCustomReasonChange}
                  rows={3}
                  placeholder={
                    isSection2Locked
                      ? t('lockedCustomReasonPlaceholder')
                      : t('customReasonPlaceholder')
                  }
                  className={`w-full text-xs p-2.5 rounded-xl resize-none transition-all outline-hidden ${
                    isSection2Locked
                      ? 'border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                      : 'border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Bottom Actions: Cancel & Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>

              {/* Submit Button:
                  - Default disabled solid gray
                  - Turns active Dark Blue (#1e3a8a) when either Section 1 or Section 2 is active
              */}
              <button
                type="submit"
                disabled={!isSubmitActive || isSubmitting}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 ${
                  isSubmitActive && !isSubmitting
                    ? 'bg-[#1e3a8a] hover:bg-[#172554] text-white border border-[#1e3a8a] cursor-pointer shadow-md'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                }`}
              >
                <span>
                  {isSubmitting
                    ? t('submittingReport')
                    : t('confirmReport')}
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
