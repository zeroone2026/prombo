import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Code2,
  Cpu,
  User,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Tag,
  Video as VideoIcon,
  ExternalLink,
  Play,
  ThumbsUp,
  ThumbsDown,
  Maximize2,
} from 'lucide-react';
import { Prompt, Category, PromptStatus } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { useApp } from '../../context/AppContext';
import { VideoPlayer } from '../VideoPlayer';
import { copyTextToClipboard } from '../../utils/slugUtils';

interface PromptInspectionModalProps {
  isOpen: boolean;
  prompt: Prompt | null;
  category?: Category;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: PromptStatus, title: string, rejectionReason?: string) => void;
}

export const PromptInspectionModal: React.FC<PromptInspectionModalProps> = ({
  isOpen,
  prompt,
  category,
  onClose,
  onUpdateStatus,
}) => {
  const { language, isRTL } = useApp();
  const [copied, setCopied] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleCopy = async () => {
    if (!prompt) return;
    const ok = await copyTextToClipboard(prompt.prompt);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const status = prompt?.status || 'approved';
  const submittedDate = prompt?.submittedAt || prompt?.createdAt;
  const formattedDate = submittedDate
    ? new Date(submittedDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // Extract all media items
  const images = prompt?.images && prompt.images.length > 0
    ? prompt.images
    : (prompt?.imageUrl ? [prompt.imageUrl] : []);

  const videos = prompt?.videos && prompt.videos.length > 0
    ? prompt.videos
    : (prompt?.videoUrl ? [prompt.videoUrl] : []);

  const totalMediaCount = images.length + videos.length;

  const handleApprove = () => {
    if (!prompt || !onUpdateStatus) return;
    onUpdateStatus(prompt.id, 'approved', prompt.title);
    onClose();
  };

  const handleReject = () => {
    if (!prompt || !onUpdateStatus) return;
    onUpdateStatus(prompt.id, 'rejected', prompt.title, rejectionReason.trim() || undefined);
    setShowRejectBox(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && prompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-[calc(100vw-1.5rem)] max-w-3xl mx-auto bg-white dark:bg-[#151d2a] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#28364b] overflow-hidden z-10 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 dark:border-[#222f42] bg-slate-50/70 dark:bg-[#192333]/50">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Code2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                      {prompt.title}
                    </h2>
                    {/* Status Badge */}
                    {status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{language === 'ar' ? 'معتمد ومنشور' : 'Approved'}</span>
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                        <Clock className="w-3 h-3" />
                        <span>{language === 'ar' ? 'بانتظار المراجعة' : 'Pending'}</span>
                      </span>
                    )}
                    {status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                        <Ban className="w-3 h-3" />
                        <span>{language === 'ar' ? 'مرفوض' : 'Rejected'}</span>
                      </span>
                    )}
                    {status === 'inactive' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Ban className="w-3 h-3" />
                        <span>{language === 'ar' ? 'مخفي / معطل' : 'Inactive'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {category && (
                      <span className="inline-flex items-center gap-1">
                        <CategoryIcon name={category.icon || 'Bookmark'} className="w-3.5 h-3.5 text-orange-500" />
                        <span>{category.name}</span>
                      </span>
                    )}
                    {prompt.subcategory && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>{prompt.subcategory}</span>
                      </>
                    )}
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-blue-500" />
                      <span>{prompt.targetModel}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202c3e] rounded-xl transition-colors cursor-pointer shrink-0"
                title={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Author and Date Meta Box */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#192333]/40 border border-slate-100 dark:border-[#222f42] text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prompt.author || (language === 'ar' ? 'مرسِل مجهول' : 'Anonymous Author')}</span>
                  </div>
                  {prompt.authorEmail && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{prompt.authorEmail}</span>
                    </div>
                  )}
                </div>
                {formattedDate && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formattedDate}</span>
                  </div>
                )}
              </div>

              {/* Rejection Reason notice if previously rejected */}
              {prompt.rejectionReason && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{language === 'ar' ? 'سبب الرفض المسجل سابقاً:' : 'Previous Rejection Reason:'}</span>
                  </div>
                  <p>{prompt.rejectionReason}</p>
                </div>
              )}

              {/* Comprehensive Media Inspector (Images & Videos with Test Link) */}
              {totalMediaCount > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-orange-500" />
                      <span>
                        {language === 'ar'
                          ? `معاينة الوسائط المرفقة (${totalMediaCount})`
                          : `Attached Media Inspector (${totalMediaCount})`}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {images.length} {language === 'ar' ? 'صور' : 'images'} • {videos.length} {language === 'ar' ? 'فيديو' : 'videos'}
                    </span>
                  </div>

                  {/* Images Grid */}
                  {images.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'الصور المرفقة:' : 'Attached Images:'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-[#2A384C] aspect-video bg-black/5 dark:bg-black/20"
                          >
                            <img
                              src={imgUrl}
                              alt={`Prompt Media ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                              onClick={() => setZoomedImage(imgUrl)}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                              <span className="p-1.5 rounded-lg bg-black/60 text-white text-xs">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </span>
                            </div>
                            <span className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white backdrop-blur-xs">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos List with Test Link & Player */}
                  {videos.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#222E40]">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'ملفات وروابط الفيديو المرفقة:' : 'Attached Videos & Links:'}
                      </span>
                      <div className="space-y-2.5">
                        {videos.map((vidUrl, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                                  <VideoIcon className="w-4 h-4" />
                                </div>
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate max-w-md">
                                  {vidUrl}
                                </span>
                              </div>

                              {/* Test Video Link Button */}
                              <a
                                href={vidUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 transition-colors cursor-pointer shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'فحص رابط الفيديو ↗' : 'Test Video Link ↗'}</span>
                              </a>
                            </div>

                            {/* Native Video Player Preview (YouTube, Vimeo, or HTML5 MP4/WebM) */}
                            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-[#2A384C] bg-black aspect-video max-h-60">
                              <VideoPlayer url={vidUrl} title={prompt.title} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description if available */}
              {prompt.description && (
                <div>
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {language === 'ar' ? 'الوصف التوضيحي:' : 'Description:'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#121824] p-3 rounded-xl border border-slate-100 dark:border-[#222f42]">
                    {prompt.description}
                  </p>
                </div>
              )}

              {/* Prompt Text Payload Container */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span>{language === 'ar' ? 'نص البرومبت الكامل (Payload)' : 'Full Prompt Text Payload'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {prompt.prompt.length} {language === 'ar' ? 'حرف' : 'chars'}
                  </span>
                </div>

                <div className="relative group">
                  <pre className="w-full max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-all border border-slate-800">
                    {prompt.prompt}
                  </pre>
                </div>
              </div>

              {/* Prompt Variables (if any) */}
              {prompt.variables && prompt.variables.length > 0 && (
                <div>
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    {language === 'ar' ? 'المتغيرات المدمجة:' : 'Template Variables:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {prompt.variables.map((v, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-[11px] font-mono text-orange-800 dark:text-orange-300"
                      >
                        <span className="font-bold">[{v.name}]</span>
                        {v.defaultValue && <span className="opacity-75 ms-1">= {v.defaultValue}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags (if any) */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {prompt.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 text-[11px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Rejection input box if open */}
              {showRejectBox && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 space-y-2">
                  <label className="block text-xs font-bold text-rose-800 dark:text-rose-300">
                    {language === 'ar' ? 'سبب الرفض (سيتم إرساله في إشعار للكاتب):' : 'Rejection Reason (sent to author):'}
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل سبباً واضحاً للمساعدة في تحسين البرومبت...' : 'Enter clear feedback for author...'}
                    className="w-full p-2.5 bg-white dark:bg-[#121824] border border-rose-200 dark:border-rose-500/30 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs"
                    >
                      {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions with Direct Moderation Controls */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-100 dark:border-[#222f42] bg-slate-50/70 dark:bg-[#192333]/50 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#222f42] transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ النص' : 'Copy')}</span>
                </button>
              </div>

              {/* Direct Moderation Approval / Rejection Controls */}
              {onUpdateStatus && (
                <div className="flex items-center gap-2">
                  {status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(!showRejectBox)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'رفض الطلب' : 'Reject'}</span>
                    </button>
                  )}

                  {status !== 'approved' && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'قبول ونشر الآن' : 'Approve & Publish'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Full Screen Image Zoom Overlay */}
          {zoomedImage && (
            <div
              className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setZoomedImage(null)}
            >
              <img
                src={zoomedImage}
                alt="Zoomed Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 end-4 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
