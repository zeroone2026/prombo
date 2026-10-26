import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  SlidersHorizontal,
  Terminal,
  RotateCcw,
  User,
  Calendar,
  Cpu,
  Tag,
  Maximize2,
  Lightbulb,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Prompt, Category } from '../types';
import { useApp } from '../context/AppContext';
import { CategoryIcon } from './CategoryIcon';
import { TranslatableContent } from './TranslatableContent';
import { getLocalizedCategoryName } from '../utils/categoryUtils';
import { MediaGrid } from './community/MediaGrid';
import { AuthService } from '../services/authService';

interface VariableModalProps {
  prompt: Prompt | null;
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onCopy: (finalPrompt: string, promptId: string) => void;
  onSelectTag?: (tag: string) => void;
}

export const VariableModal: React.FC<VariableModalProps> = ({
  prompt,
  category,
  isOpen,
  onClose,
  onCopy,
  onSelectTag,
}) => {
  const { t, language } = useApp();
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (prompt) {
      const initial: Record<string, string> = {};
      if (prompt.variables && prompt.variables.length > 0) {
        prompt.variables.forEach((v) => {
          initial[v.name] = v.defaultValue || '';
        });
      } else {
        const matches = prompt.prompt.match(/\{([a-zA-Z0-9_-]+)\}/g) || [];
        matches.forEach((m) => {
          const varName = m.replace(/[{}]/g, '');
          initial[varName] = '';
        });
      }
      setValues(initial);
      setCopied(false);
    }
  }, [prompt]);

  // Compute final prompt text
  let finalPrompt = prompt?.prompt || '';
  Object.entries(values).forEach(([key, val]) => {
    const stringVal = typeof val === 'string' ? val.trim() : String(val || '');
    const replacement = stringVal || `{${key}}`;
    finalPrompt = finalPrompt.split(`{${key}}`).join(replacement);
  });

  const handleReset = () => {
    if (!prompt) return;
    const initial: Record<string, string> = {};
    if (prompt.variables && prompt.variables.length > 0) {
      prompt.variables.forEach((v) => {
        initial[v.name] = v.defaultValue || '';
      });
    }
    setValues(initial);
  };

  const handleCopy = () => {
    if (!prompt) return;
    onCopy(finalPrompt, prompt.id);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1200);
  };

  const variablesList =
    prompt?.variables && prompt.variables.length > 0
      ? prompt.variables
      : Object.keys(values).map((k) => ({
          name: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          placeholder: `Enter ${k}...`,
          defaultValue: '',
        }));

  const getLocalizedCategoryNameHelper = (cat: Category): string => {
    return getLocalizedCategoryName(cat, t, language);
  };

  const formattedDate = prompt?.createdAt
    ? new Date(prompt.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const currentUser = AuthService.getCurrentUser();
  const isCurrentUserAuthor = Boolean(
    currentUser &&
    !currentUser.isGuest &&
    currentUser.id &&
    prompt &&
    ((prompt.authorId && prompt.authorId === currentUser.id) ||
     (prompt.author_id && prompt.author_id === currentUser.id) ||
     (prompt.userId && prompt.userId === currentUser.id) ||
     (prompt.authorEmail && currentUser.email && prompt.authorEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()))
  );

  const authorDisplayName = isCurrentUserAuthor && currentUser?.name?.trim()
    ? currentUser.name.trim()
    : prompt?.author &&
      prompt.author.trim() !== '' &&
      prompt.author.trim().toLowerCase() !== 'anonymous' &&
      prompt.author.trim() !== 'مجهول'
    ? prompt.author.trim()
    : language === 'ar'
    ? 'مجهول'
    : 'Anonymous';

  return (
    <AnimatePresence>
      {isOpen && prompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/75 backdrop-blur-xs">
          {/* Backdrop click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-[calc(100vw-2rem)] sm:w-full max-w-3xl mx-auto bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-[#2A384C] bg-slate-50 dark:bg-[#141c2b] shrink-0">
              <div className="space-y-2 max-w-[85%]">
                <div className="flex items-center gap-2 flex-wrap">
                  {category && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                      <CategoryIcon name={category.icon} className="w-3.5 h-3.5 shrink-0" />
                      <TranslatableContent
                        content={getLocalizedCategoryNameHelper(category)}
                        as="span"
                        id={`var-modal-cat-${prompt.id}`}
                      />
                    </span>
                  )}
                  {(prompt.isSponsored || prompt.isPromoted) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('sponsored')}</span>
                    </span>
                  )}
                  {prompt.targetModel && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#121824] text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold border border-slate-200 dark:border-[#2A384C]">
                      <Cpu className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                      <span>{prompt.targetModel}</span>
                    </span>
                  )}
                  {prompt.subcategory && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                      <TranslatableContent
                        content={prompt.subcategory}
                        as="span"
                        id={`var-modal-subcat-${prompt.id}`}
                      />
                    </span>
                  )}
                </div>

                {/* Title - Wrapped in TranslatableContent with smart script guardrails */}
                <TranslatableContent
                  content={prompt.title}
                  as="h3"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug"
                  id={`var-modal-title-${prompt.id}`}
                />
              </div>

              <button
                onClick={onClose}
                aria-label={t('modalClose')}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Complete Payload Details */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-100 dark:divide-[#243042]">
              {/* Attached Images, Videos, or URL Preview */}
              {((prompt.images && prompt.images.length > 0) || (prompt.videos && prompt.videos.length > 0) || prompt.videoUrl || prompt.imageUrl) && (
                <div className="space-y-2">
                  <MediaGrid
                    images={prompt.images && prompt.images.length > 0 ? prompt.images : (prompt.imageUrl ? [prompt.imageUrl] : [])}
                    videos={prompt.videos}
                    videoUrl={prompt.videoUrl}
                    title={prompt.title}
                    author={authorDisplayName}
                  />
                </div>
              )}

              {/* Author, Description & Metadata Section */}
              <div className="pt-4 first:pt-0 space-y-3">
                {/* Metadata Row */}
                <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {/* Author Attribution */}
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-600 dark:text-orange-500" />
                    <span>
                      {language === 'ar'
                        ? `تمت الإضافة بواسطة: ${authorDisplayName}`
                        : `Submitted by: ${authorDisplayName}`}
                    </span>
                  </div>

                  {/* Created Date */}
                  {formattedDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                  )}

                  {/* Copy Count */}
                  <div className="flex items-center gap-1.5 font-mono">
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {prompt.copyCount || 0} {language === 'ar' ? 'نسخة' : 'copies'}
                    </span>
                  </div>
                </div>

                {/* Description - Wrapped in TranslatableContent with smart script guardrails */}
                {prompt.description && (
                  <TranslatableContent
                    content={prompt.description}
                    as="p"
                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                    id={`var-modal-desc-${prompt.id}`}
                  />
                )}

                {/* Category Tags */}
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {prompt.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (onSelectTag) {
                            onSelectTag(tag);
                            onClose();
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-[#121824] hover:bg-orange-50 dark:hover:bg-orange-500/10 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer"
                        title={language === 'ar' ? `تصفية حسب الوسم: ${tag}` : `Filter by tag: ${tag}`}
                      >
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Variables Customization Section */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    <span>{t('modalVariableValues')}</span>
                  </h4>
                  {variablesList.length > 0 && (
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('modalReset')}</span>
                    </button>
                  )}
                </div>

                {variablesList.length > 0 ? (
                  <div className="space-y-3">
                    {variablesList.map((v) => (
                      <div key={v.name} className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {v.label}
                        </label>
                        {v.options && v.options.length > 0 ? (
                          <select
                            value={values[v.name] || ''}
                            onChange={(e) => setValues({ ...values, [v.name]: e.target.value })}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          >
                            {v.options.map((opt) => (
                              <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={values[v.name] || ''}
                            onChange={(e) => setValues({ ...values, [v.name]: e.target.value })}
                            placeholder={v.placeholder}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-500/20 text-xs text-orange-900 dark:text-orange-200 flex items-center gap-2.5">
                    <Lightbulb className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span>
                      {language === 'ar'
                        ? 'هذا الأمر جاهز للاستخدام المباشر دون الحاجة لتخصيص متغيرات. يمكنك نسخه فوراً أدناه.'
                        : 'This prompt is ready for instant use without custom variables. You can copy it directly below.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Complete Prompt Payload & Live Preview (NEVER ABRIDGED OR TRIMMED) */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    <span>{language === 'ar' ? 'الأمر البرمجي كاملاً' : t('modalLivePreview')}</span>
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {finalPrompt.length} {language === 'ar' ? 'حرف' : 'chars'}
                  </span>
                </div>

                <div
                  dir="ltr"
                  className="p-4 bg-slate-50 dark:bg-[#121824] rounded-xl border border-slate-200 dark:border-[#2A384C] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto selection:bg-orange-600 selection:text-white text-left shadow-inner"
                >
                  {finalPrompt}
                </div>
              </div>

              {/* Tips & Recommendations (if any) */}
              {prompt.tips && prompt.tips.length > 0 && (
                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('tips')}</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
                    {prompt.tips.map((tip, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-[#2A384C] bg-slate-50 dark:bg-[#141c2b] shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {t('modalClose')}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer shadow-xs active:scale-95 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-orange-600 hover:bg-orange-500 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تم النسخ بنجاح!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t('modalCopyButton')}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
