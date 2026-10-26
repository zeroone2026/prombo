import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Code2,
  Tag,
  SlidersHorizontal,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Video as VideoIcon,
} from 'lucide-react';
import { Prompt, Category, PromptVariable } from '../../types';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../UserAvatar';

interface PromptEditorModalProps {
  isOpen: boolean;
  prompt: Prompt | null;
  categories: Category[];
  onClose: () => void;
  onSave: (prompt: Partial<Prompt>) => void;
}

interface AttachedMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({
  isOpen,
  prompt,
  categories,
  onClose,
  onSave,
}) => {
  const { t, language, isRTL } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [targetModel, setTargetModel] = useState('Claude 3.7 Sonnet / Cursor');
  const [author, setAuthor] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [variables, setVariables] = useState<PromptVariable[]>([]);

  // Attached Media List (Full Array Mapping & Delete-Only Mode)
  const [mediaItems, setMediaItems] = useState<AttachedMediaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title || '');
      setDescription(prompt.description || '');
      setPromptText(prompt.prompt || '');
      setCategoryId(prompt.categoryId || (categories[0]?.id || 'vibe-coding'));
      setSubcategory(prompt.subcategory || '');
      setTargetModel(prompt.targetModel || 'Claude 3.7 Sonnet / Cursor');
      setAuthor(prompt.author || '');
      setAuthorEmail(prompt.authorEmail || '');
      setTags(prompt.tags || []);
      setVariables(prompt.variables || []);

      // Full Multi-Media Mapping: Map over all attached images and videos
      const items: AttachedMediaItem[] = [];
      const imageArray = prompt.images && prompt.images.length > 0
        ? prompt.images
        : (prompt.imageUrl ? [prompt.imageUrl] : []);
      imageArray.forEach((imgUrl, i) => {
        if (imgUrl) {
          items.push({ id: `img-${i}-${Date.now()}`, url: imgUrl, type: 'image' });
        }
      });

      const videoArray = prompt.videos && prompt.videos.length > 0
        ? prompt.videos
        : (prompt.videoUrl ? [prompt.videoUrl] : []);
      videoArray.forEach((vidUrl, i) => {
        if (vidUrl) {
          items.push({ id: `vid-${i}-${Date.now()}`, url: vidUrl, type: 'video' });
        }
      });

      setMediaItems(items);
    } else {
      setTitle('');
      setDescription('');
      setPromptText('');
      setCategoryId(categories[0]?.id || 'vibe-coding');
      setSubcategory('');
      setTargetModel('Claude 3.7 Sonnet / Cursor');
      setAuthor('');
      setAuthorEmail('');
      setTags(['AI', 'Prompt']);
      setVariables([]);
      setMediaItems([]);
    }
  }, [prompt, categories, isOpen]);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddVariable = () => {
    setVariables([
      ...variables,
      {
        name: `var_${variables.length + 1}`,
        label: `Variable ${variables.length + 1}`,
        placeholder: 'Enter variable value...',
        defaultValue: '',
      },
    ]);
  };

  const handleUpdateVariable = (index: number, updated: Partial<PromptVariable>) => {
    const next = [...variables];
    next[index] = { ...next[index], ...updated };
    setVariables(next);
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  // Delete-Only Media Handler: Allows only deletion of existing media items
  const handleRemoveMediaItem = (idToRemove: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const remainingImages = mediaItems.filter((m) => m.type === 'image').map((m) => m.url);
      const remainingVideos = mediaItems.filter((m) => m.type === 'video').map((m) => m.url);
      const finalImageUrl = remainingImages.length > 0 ? remainingImages[0] : '';
      const finalVideoUrl = remainingVideos.length > 0 ? remainingVideos[0] : '';

      onSave({
        id: prompt?.id,
        title: title.trim(),
        description: description.trim(),
        // Lock and preserve original approved prompt text
        prompt: prompt?.prompt || promptText.trim(),
        categoryId: categoryId || categories[0]?.id,
        subcategory: subcategory.trim(),
        targetModel: targetModel.trim(),
        // Immutable author identity sourced from original author
        author: prompt?.author || author.trim() || undefined,
        authorEmail: prompt?.authorEmail || authorEmail.trim() || undefined,
        imageUrl: finalImageUrl,
        imageThumbnailUrl: finalImageUrl,
        images: remainingImages,
        videos: remainingVideos,
        videoUrl: finalVideoUrl,
        media: [...remainingImages, ...remainingVideos] as any,
        media_urls: [...remainingImages, ...remainingVideos] as any,
        mediaType: remainingImages.length > 0 && remainingVideos.length > 0
          ? 'mixed'
          : remainingVideos.length > 0
          ? 'video'
          : remainingImages.length > 0
          ? 'image'
          : 'none',
        tags,
        variables,
        copyCount: prompt?.copyCount || 0,
        isEdited: prompt ? true : prompt?.isEdited,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-[calc(100vw-2rem)] sm:w-full max-w-3xl mx-auto bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2A384C] bg-slate-50 dark:bg-[#141c2b]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {prompt ? (language === 'ar' ? 'تعديل الأمر' : 'Edit Prompt') : (language === 'ar' ? 'إنشاء أمر جديد' : 'Create New Prompt')}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label={t('modalClose')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Form */}
          <form id="prompt-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Title & Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('promptTitleLabel') || (language === 'ar' ? 'اسم البرومبت/المهارة' : 'Prompt/Skill Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next.js 15 Full-Stack Component Architect"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {language === 'ar' ? 'التصنيف *' : 'Category *'}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-[#182232]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Immutable Author Identity (Read-only, dynamically sourced from author profile) */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#121824] rounded-xl border border-slate-200 dark:border-[#2A384C]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                    <UserAvatar
                      name={author || prompt?.author || 'Creator'}
                      avatar={prompt?.authorAvatar}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {author || prompt?.author || (language === 'ar' ? 'الناشر المعتمد' : 'Verified Author')}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{language === 'ar' ? 'هوية موثقة' : 'Verified'}</span>
                      </span>
                    </div>
                    {(authorEmail || prompt?.authorEmail) && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        {authorEmail || prompt?.authorEmail}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  {language === 'ar' ? 'غير قابل للتعديل' : 'Read-only'}
                </span>
              </div>
            </div>

            {/* Target Model & Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {language === 'ar' ? 'نموذج الذكاء الاصطناعي المستهدف' : 'Target AI Model / Tool'}
                </label>
                <input
                  type="text"
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  placeholder="e.g. Claude 3.7 Sonnet / Cursor / Midjourney v6"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {language === 'ar' ? 'التصنيف الفرعي / التخصص' : 'Subcategory / Niche'}
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g. Architecture & Components"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Attached Multi-Media Gallery (Full Array Rendering & Delete-Only Mode - No Uploads) */}
            <div className="space-y-2.5 p-4 bg-slate-50 dark:bg-[#121824] rounded-xl border border-slate-200 dark:border-[#2A384C]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {language === 'ar'
                      ? `الوسائط المرفقة (${mediaItems.length})`
                      : `Attached Media (${mediaItems.length})`}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {language === 'ar' ? 'وضع الحذف فقط' : 'Delete-only Mode'}
                </span>
              </div>

              {mediaItems.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#2A384C] text-center text-xs text-slate-400">
                  {language === 'ar' ? 'لا توجد وسائط مرفقة بهذا البرومبت حالياً' : 'No media items currently attached to this prompt'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-[#2A384C] bg-white dark:bg-[#182232] aspect-video sm:aspect-square flex items-center justify-center"
                    >
                      {item.type === 'image' ? (
                        <img
                          src={item.url}
                          alt={`Media ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-300 p-2">
                          <VideoIcon className="w-6 h-6 text-orange-400 mb-1" />
                          <span className="text-[10px] font-mono truncate max-w-full px-1">
                            {item.url.slice(-20)}
                          </span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <span className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        {item.type === 'video'
                          ? (language === 'ar' ? 'فيديو' : 'Video')
                          : (language === 'ar' ? 'صورة' : 'Image')}
                      </span>

                      {/* Delete-Only "X" Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMediaItem(item.id)}
                        className="absolute top-1.5 end-1.5 p-1 rounded-full bg-red-600/90 hover:bg-red-500 text-white shadow-md transition-transform hover:scale-110 cursor-pointer"
                        title={language === 'ar' ? 'حذف هذه الوسائط' : 'Remove media'}
                        aria-label={language === 'ar' ? 'حذف هذه الوسائط' : 'Remove media'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'في وضع التعديل، يُسمح فقط بإزالة الوسائط السابقة، ولا يمكن إضافة وسائط جديدة.'
                    : 'In edit mode, only deletion of existing media is allowed. New uploads are disabled.'}
                </span>
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {language === 'ar' ? 'الوصف المختصر' : 'Short Description / Purpose'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'ar' ? 'اشرح بإيجاز ما ينتجه هذا الأمر...' : 'Briefly explain what this prompt produces and its primary advantages...'}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Prompt Body (Locked / Immutable in Edit Mode) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === 'ar' ? 'نص البرومبت/المهارة (مقفل للأمان)' : 'Prompt/Skill Text Content (Locked)'}</span>
                </label>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{language === 'ar' ? 'غير قابل للتعديل بعد النشر' : 'Locked after publishing'}</span>
                </span>
              </div>
              <textarea
                dir="ltr"
                rows={6}
                disabled={true}
                readOnly={true}
                value={promptText}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#0e1420] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 focus:outline-none cursor-not-allowed opacity-90 select-all"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'لحماية أمان وموثوقية الأوامر المعتمدة، لا يمكن تعديل نص البرومبت الأساسي بعد النشر.'
                    : 'To protect the integrity and safety of approved prompts, prompt instructions cannot be altered after publishing.'}
                </span>
              </p>
            </div>

            {/* Dynamic Variables Section */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-[#121824] rounded-xl border border-slate-200 dark:border-[#2A384C]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {language === 'ar' ? `المتغيرات التفاعلية (${variables.length})` : `Interactive Variables (${variables.length})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'إضافة متغير' : 'Add Variable'}
                </button>
              </div>

              {variables.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  {language === 'ar' ? 'لا توجد متغيرات مخصصة. أضف متغيرات ليتمكن المستخدم من تخصيصها قبل النسخ.' : 'No custom variables defined.'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {variables.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-[#182232] p-2.5 rounded-lg border border-slate-200 dark:border-[#2A384C]">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleUpdateVariable(idx, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                        placeholder="var_name"
                        className="w-1/4 px-2.5 py-1 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded text-xs font-mono text-orange-600 dark:text-orange-400"
                      />
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => handleUpdateVariable(idx, { label: e.target.value })}
                        placeholder="Display Label"
                        className="w-1/3 px-2.5 py-1 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded text-xs text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={v.defaultValue || ''}
                        onChange={(e) => handleUpdateVariable(idx, { defaultValue: e.target.value })}
                        placeholder="Default Value"
                        className="flex-1 px-2.5 py-1 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded text-xs text-slate-700 dark:text-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariable(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {language === 'ar' ? 'الوسوم (Tags)' : 'Tags'}
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-[#121824] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#2A384C]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={language === 'ar' ? 'اكتب الوسم واضغط إضافة...' : 'Type tag name and press Add...'}
                  className="flex-1 px-3.5 py-1.5 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إضافة وسم' : 'Add Tag'}
                </button>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#2A384C] bg-slate-50 dark:bg-[#141c2b]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('adminCancel')}
            </button>
            <button
              type="submit"
              form="prompt-form"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('adminSave')}</span>
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
