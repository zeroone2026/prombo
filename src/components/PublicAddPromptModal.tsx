import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Code2,
  Send,
  AlertCircle,
  FolderOpen,
  ChevronDown,
  Cpu,
  Tag as TagIcon,
  FileText,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Maximize2,
  Video as VideoIcon,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import { Category, Prompt, PlatformSettings } from '../types';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storage';
import { AuthService } from '../services/authService';
import { compressImage, formatBytes, CompressedImageResult } from '../utils/imageUtils';
import { uploadPromptImageToSupabase, uploadPromptMediaToSupabase } from '../services/supabaseClient';
import { useContentMediaSettings } from '../hooks/useContentMediaSettings';
import { validatePhotoFile, validateVideoFile, fileToDataUrl, isValidVideoUrl } from '../utils/mediaValidation';
import { DraggableMediaReorder, DraggableMediaItem } from './media/DraggableMediaReorder';

interface PublicAddPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (promptData: Partial<Prompt>) => void;
}

export const PublicAddPromptModal: React.FC<PublicAddPromptModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSubmit,
}) => {
  const { t, language, isRTL } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [targetModel, setTargetModel] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isOptionalExpanded, setIsOptionalExpanded] = useState(false);

  // Real-time Content & Media Settings
  const contentMedia = useContentMediaSettings();
  const homeMedia = contentMedia.homePrompts;

  // Media Attachments State (Photos, Videos, Video URL)
  const [selectedImages, setSelectedImages] = useState<CompressedImageResult[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedVideoFiles, setSelectedVideoFiles] = useState<{ file: File; dataUrl: string; name: string }[]>([]);
  const [promptVideoUrl, setPromptVideoUrl] = useState<string>('');
  const [showVideoUrlBox, setShowVideoUrlBox] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() =>
    StorageService.getPlatformSettings()
  );

  // Validation State
  const [showErrors, setShowErrors] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setPromptContent('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setDescription('');
      setTargetModel('General AI');
      setTags([]);
      setTagInput('');
      setIsOptionalExpanded(false);
      setSelectedImages([]);
      setSelectedVideos([]);
      setPromptVideoUrl('');
      setShowVideoUrlBox(false);
      setIsCompressing(false);
      setIsUploading(false);
      setImageError('');
      setShowErrors(false);
      setValidationError('');
      setPlatformSettings(StorageService.getPlatformSettings());
    }
  }, [isOpen, categories]);

  // Validation checks: EXACTLY 3 required fields
  const isTitleMissing = !title.trim();
  const isPromptMissing = !promptContent.trim();
  const isCategoryMissing = !categoryId.trim();
  const hasErrors = isTitleMissing || isPromptMissing || isCategoryMissing;

  const isMediaSectionActive = homeMedia.masterEnabled && (homeMedia.enablePhotoUploads || homeMedia.enableVideoUploads);
  const maxPhotosCount = homeMedia.maxPhotosCount || 4;
  const maxAllowedMB = homeMedia.maxPhotoSizeMB || 5;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    setImageError('');

    if (!homeMedia.masterEnabled || !homeMedia.enablePhotoUploads) {
      setImageError(
        language === 'ar'
          ? 'تم إيقاف رفع الصور حالياً من قبل إدارة المنصة.'
          : 'Image uploads are currently disabled by platform administration.'
      );
      return;
    }

    const remainingSlots = maxPhotosCount - selectedImages.length;
    if (remainingSlots <= 0) {
      setImageError(
        language === 'ar'
          ? `الحد الأقصى للصور هو ${maxPhotosCount} صور.`
          : `Maximum allowed photos is ${maxPhotosCount}.`
      );
      return;
    }

    const filesToProcess: File[] = files.slice(0, remainingSlots);
    setIsCompressing(true);

    try {
      const processed: CompressedImageResult[] = [];
      for (const file of filesToProcess) {
        const validation = validatePhotoFile(file, homeMedia);
        if (!validation.valid) {
          setImageError(language === 'ar' ? (validation.errorAr || validation.error!) : validation.error!);
          continue;
        }

        try {
          const compressed = await compressImage(file, {
            maxSizeMB: maxAllowedMB,
            maxWidthOrHeight: 1600,
            quality: 0.82,
            outputFormat: 'image/webp',
          });
          processed.push(compressed);
        } catch {
          const dataUrl = await fileToDataUrl(file);
          processed.push({
            file,
            blob: file,
            dataUrl,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            width: 800,
            height: 600,
            fileName: file.name,
          });
        }
      }

      if (processed.length > 0) {
        setSelectedImages((prev) => [...prev, ...processed]);
      }
    } catch (err: any) {
      setImageError(err.message || 'Failed to process image');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    setImageError('');
    setIsCompressing(true);

    const maxVideosCount = homeMedia.maxVideosCount || 2;
    const currentCount = selectedVideos.length;
    const availableSlots = maxVideosCount - currentCount;

    if (availableSlots <= 0) {
      setImageError(
        language === 'ar'
          ? `وصلت للحد الأقصى لعدد الفيديوهات المسموح بها (${maxVideosCount})`
          : `Maximum allowed videos reached (${maxVideosCount})`
      );
      setIsCompressing(false);
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);

    try {
      for (const file of filesToProcess) {
        const validation = await validateVideoFile(file, homeMedia);
        if (!validation.valid) {
          setImageError(language === 'ar' ? (validation.errorAr || validation.error!) : validation.error!);
          continue;
        }

        const videoDataUrl = await fileToDataUrl(file);
        setSelectedVideos((prev) => [...prev, videoDataUrl]);
        setSelectedVideoFiles((prev) => [
          ...prev,
          { file, dataUrl: videoDataUrl, name: file.name || `video_${Date.now()}.mp4` },
        ]);
      }
    } catch (err: any) {
      setImageError(err.message || 'Failed to process video');
    } finally {
      setIsCompressing(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
    setImageError('');
  };

  const handleRemoveVideo = (index: number = 0) => {
    setSelectedVideos((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedVideoFiles((prev) => prev.filter((_, idx) => idx !== index));
    setImageError('');
  };

  const handleRemoveVideoUrl = () => {
    setPromptVideoUrl('');
    setShowVideoUrlBox(false);
    setImageError('');
  };

  // Unified Media Items for Drag-and-Drop Reordering
  const draggableMediaItems: DraggableMediaItem[] = React.useMemo(() => {
    const list: DraggableMediaItem[] = [];
    selectedImages.forEach((img, idx) => {
      list.push({
        id: `img-${idx}-${img.fileName || idx}`,
        url: img.dataUrl,
        type: 'image',
        name: img.fileName,
      });
    });
    selectedVideos.forEach((vid, idx) => {
      list.push({
        id: `vid-${idx}`,
        url: vid,
        type: 'video',
        name: selectedVideoFiles[idx]?.name || `video_${idx + 1}`,
      });
    });
    return list;
  }, [selectedImages, selectedVideos, selectedVideoFiles]);

  const handleReorderMedia = (reordered: DraggableMediaItem[]) => {
    const newImages: CompressedImageResult[] = [];
    const newVideos: string[] = [];
    const newVideoFiles: { file: File; dataUrl: string; name: string }[] = [];

    reordered.forEach((item) => {
      if (item.type === 'image') {
        const found = selectedImages.find((img) => img.dataUrl === item.url);
        if (found) newImages.push(found);
      } else {
        const vIdx = selectedVideos.indexOf(item.url);
        if (vIdx !== -1) {
          newVideos.push(selectedVideos[vIdx]);
          if (selectedVideoFiles[vIdx]) newVideoFiles.push(selectedVideoFiles[vIdx]);
        }
      }
    });

    setSelectedImages(newImages);
    setSelectedVideos(newVideos);
    setSelectedVideoFiles(newVideoFiles);
  };

  const handleRemoveMediaItem = (index: number) => {
    const item = draggableMediaItems[index];
    if (!item) return;
    if (item.type === 'image') {
      const imgIdx = selectedImages.findIndex((img) => img.dataUrl === item.url);
      if (imgIdx !== -1) handleRemoveImage(imgIdx);
    } else {
      const vidIdx = selectedVideos.indexOf(item.url);
      if (vidIdx !== -1) handleRemoveVideo(vidIdx);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasErrors) {
      setShowErrors(true);
      const missingList: string[] = [];
      if (isTitleMissing) missingList.push(t('promptTitleLabel') || (language === 'ar' ? 'اسم البرومبت/المهارة' : 'Prompt/Skill Name'));
      if (isPromptMissing) missingList.push(t('promptContentLabel') || (language === 'ar' ? 'نص البرومبت/المهارة' : 'Prompt/Skill Text'));
      if (isCategoryMissing) missingList.push(language === 'ar' ? 'التصنيف' : 'Category');

      setValidationError(
        language === 'ar'
          ? `يرجى إكمال الحقول الإلزامية المطلوبة: (${missingList.join('، ')})`
          : `Please fill in all required fields: (${missingList.join(', ')})`
      );
      return;
    }

    const finalImages: string[] = [];
    const finalVideos: string[] = [];

    setIsUploading(true);

    // 1. Upload compressed images to Supabase Storage ('prompt-images' bucket) or fallback to dataUrl
    if (selectedImages.length > 0) {
      try {
        for (const img of selectedImages) {
          try {
            const uploadResult = await uploadPromptImageToSupabase(img.blob, img.fileName);
            if (uploadResult.success && uploadResult.publicUrl) {
              finalImages.push(uploadResult.publicUrl);
            } else {
              finalImages.push(img.dataUrl);
            }
          } catch {
            finalImages.push(img.dataUrl);
          }
        }
      } catch (err) {
        console.warn('Error during image upload:', err);
      }
    }

    // 2. Upload video files to Supabase Storage ('prompt-images' bucket) or fallback to dataUrl
    if (selectedVideoFiles.length > 0) {
      try {
        for (const vid of selectedVideoFiles) {
          try {
            const uploadResult = await uploadPromptMediaToSupabase(vid.file, vid.name, 'prompt-images');
            if (uploadResult.success && uploadResult.publicUrl) {
              finalVideos.push(uploadResult.publicUrl);
            } else {
              finalVideos.push(vid.dataUrl);
            }
          } catch {
            finalVideos.push(vid.dataUrl);
          }
        }
      } catch (err) {
        console.warn('Error during video upload:', err);
      }
    } else if (selectedVideos.length > 0) {
      finalVideos.push(...selectedVideos);
    }

    setIsUploading(false);

    const hasAnyMedia = finalImages.length > 0 || finalVideos.length > 0 || !!promptVideoUrl.trim();
    let mediaType: 'none' | 'image' | 'video' | 'mixed' = 'none';
    if (finalImages.length > 0 && (finalVideos.length > 0 || promptVideoUrl.trim())) {
      mediaType = 'mixed';
    } else if (finalImages.length > 0) {
      mediaType = 'image';
    } else if (finalVideos.length > 0 || promptVideoUrl.trim()) {
      mediaType = 'video';
    }

    // Submit valid payload
    const activeUser = AuthService.getCurrentUser();
    if (!activeUser || activeUser.isGuest) {
      setValidationError(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب لإرسال البرومبت للمراجعة.'
          : 'Registration is required to submit prompts for review.'
      );
      return;
    }

    const isRegistered = activeUser && !activeUser.isGuest;
    onSubmit({
      title: title.trim(),
      prompt: promptContent.trim(),
      categoryId: categoryId.trim(),
      author: isRegistered ? activeUser.name : (language === 'ar' ? 'مشارك مجتمعي' : 'Community Member'),
      authorEmail: isRegistered && activeUser.email ? activeUser.email : undefined,
      authorId: isRegistered ? activeUser.id : undefined,
      authorAvatar: activeUser?.avatar || undefined,
      userId: isRegistered ? activeUser.id : undefined,
      description: description.trim() || undefined,
      targetModel: targetModel.trim() || 'General AI',
      tags: tags.length > 0 ? tags : ['community'],
      imageUrl: finalImages[0] || undefined,
      images: finalImages.length > 0 ? finalImages : undefined,
      videos: finalVideos.length > 0 ? finalVideos : undefined,
      videoUrl: promptVideoUrl.trim() || finalVideos[0] || undefined,
      mediaType,
      status: (contentMedia.priorModerationEnabled && hasAnyMedia)
        ? 'pending'
        : (contentMedia.priorModerationEnabled ? 'pending' : 'approved'),
      submittedAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-[calc(100vw-2rem)] sm:w-full max-w-2xl mx-auto bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2A384C] bg-slate-50 dark:bg-[#141C2B] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center shadow-xs">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('publicSubmitPromptTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('publicSubmitPromptSubtitle')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('modalClose')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Top Alert for Missing Required Fields */}
          {showErrors && validationError && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border-2 border-red-500 dark:border-red-500 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5 animate-pulse shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Form Body (Scrollable) */}
          <form
            id="public-prompt-form"
            onSubmit={handleSubmit}
            className="p-6 space-y-5 overflow-y-auto flex-1"
          >
            {/* Required Fields Section Notice */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-[#222E40]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {language === 'ar' ? 'الحقول الإلزامية الثلاثة (مطلوبة للقبول):' : '3 Required Fields (Mandatory):'}
              </span>
              <span className="text-[11px] text-slate-400">
                {language === 'ar' ? '* حقول لا يمكن تخطيها' : '* Must not be empty'}
              </span>
            </div>

            {/* 1. Prompt Title (REQUIRED) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  {t('promptTitleLabel')}
                  <span className="text-red-500 font-bold">*</span>
                </span>
                {showErrors && isTitleMissing && (
                  <span className="text-[11px] text-red-500 font-semibold">
                    {language === 'ar' ? 'هذا الحقل مطلوب' : 'Required field'}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (showErrors && e.target.value.trim()) setValidationError('');
                }}
                placeholder={
                  language === 'ar'
                    ? 'مثال: مهندس الواجهات التفاعلية بـ Next.js 15 و Tailwind'
                    : 'e.g. Next.js 15 Full-Stack Component Architect'
                }
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121824] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all ${
                  showErrors && isTitleMissing
                    ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-500/5'
                    : 'border border-slate-300 dark:border-[#2A384C] focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                }`}
              />
            </div>

            {/* 2. Category (REQUIRED) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-orange-500" />
                  {t('categoryLabel')}
                  <span className="text-red-500 font-bold">*</span>
                </span>
                {showErrors && isCategoryMissing && (
                  <span className="text-[11px] text-red-500 font-semibold">
                    {language === 'ar' ? 'هذا الحقل مطلوب' : 'Required field'}
                  </span>
                )}
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (showErrors && e.target.value.trim()) setValidationError('');
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121824] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none transition-all cursor-pointer ${
                  showErrors && isCategoryMissing
                    ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-500/5'
                    : 'border border-slate-300 dark:border-[#2A384C] focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                }`}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-white dark:bg-[#182232]">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Prompt Content (REQUIRED) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  {t('promptContentLabel')}
                  <span className="text-red-500 font-bold">*</span>
                </span>
                {showErrors && isPromptMissing && (
                  <span className="text-[11px] text-red-500 font-semibold">
                    {language === 'ar' ? 'هذا الحقل مطلوب' : 'Required field'}
                  </span>
                )}
              </label>
              <textarea
                rows={5}
                value={promptContent}
                onChange={(e) => {
                  setPromptContent(e.target.value);
                  if (showErrors && e.target.value.trim()) setValidationError('');
                }}
                placeholder={
                  language === 'ar'
                    ? 'اكتب نص البرومبت/المهارة المفصل هنا. يمكنك استخدام متغيرات مثل {project_type} أو {goal}...'
                    : 'Enter the full AI system prompt or skill here. You may use dynamic brackets like {project_type} or {goal}...'
                }
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121824] rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all text-left ${
                  showErrors && isPromptMissing
                    ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-500/5'
                    : 'border border-slate-300 dark:border-[#2A384C] focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                }`}
              />
            </div>

            {/* 4. Local Media Attachments (Photos, Video Files, Video URLs) */}
            {isMediaSectionActive && (
              <div className="space-y-3 pt-2 pb-1 border-t border-slate-100 dark:border-[#222E40]">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                    <span>{language === 'ar' ? 'إرفاق وسائط للبرومبت (اختياري)' : 'Attach Prompt Media (Optional)'}</span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ar'
                      ? `صور (حتى ${maxPhotosCount} صور، بحد أقصى ${maxAllowedMB}MB)`
                      : `Images (up to ${maxPhotosCount}, max ${maxAllowedMB}MB)`}
                  </span>
                </div>

                {/* Media Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  {homeMedia.enablePhotoUploads && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedImages.length >= maxPhotosCount || isCompressing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? `إضافة صورة (${selectedImages.length}/${maxPhotosCount})` : `Add Photo (${selectedImages.length}/${maxPhotosCount})`}</span>
                    </button>
                  )}

                  {homeMedia.enableVideoUploads && (
                    <>
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={selectedVideos.length > 0 || isCompressing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <VideoIcon className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'رفع فيديو' : 'Upload Video'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowVideoUrlBox(!showVideoUrlBox)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span>{language === 'ar' ? 'رابط فيديو' : 'Video Link'}</span>
                      </button>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                </div>

                {/* Video URL Input Field */}
                {showVideoUrlBox && homeMedia.enableVideoUploads && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#121824] border border-blue-500/30">
                    <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
                    <input
                      type="url"
                      value={promptVideoUrl}
                      onChange={(e) => setPromptVideoUrl(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل رابط فيديو (YouTube / Vimeo / MP4 direct)...' : 'Paste video link (YouTube / Vimeo / MP4 direct)...'}
                      className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                    />
                    {promptVideoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveVideoUrl}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Attached Media Items Preview with Drag-and-Drop Reordering */}
                {draggableMediaItems.length > 0 && (
                  <div className="pt-1">
                    <DraggableMediaReorder
                      items={draggableMediaItems}
                      onReorder={handleReorderMedia}
                      onRemove={handleRemoveMediaItem}
                    />
                  </div>
                )}

                {imageError && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{imageError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Progressive Disclosure Accordion: Optional Fields (Description, Model, Tags) */}
            <div className="border border-slate-200 dark:border-[#2A384C] rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-[#121824]/40 transition-colors">
              <button
                type="button"
                id="toggle-optional-fields-accordion"
                onClick={() => setIsOptionalExpanded((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-start hover:bg-slate-100/70 dark:hover:bg-[#182232]/70 transition-colors cursor-pointer"
                aria-expanded={isOptionalExpanded}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOptionalExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {language === 'ar'
                        ? 'تفاصيل إضافية اختيارية (الوصف، النموذج، الوسوم)'
                        : 'Optional Additional Details (Description, Model, Tags)'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {language === 'ar'
                        ? 'تخصيص النموذج المستهدف، كتابة نبذة توضيحية، وإضافة وسوم'
                        : 'Specify target model, brief description, and tags'}
                    </span>
                  </div>
                </div>

                {(description.trim() || (targetModel.trim() && targetModel !== 'General AI') || tags.length > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0">
                    {language === 'ar' ? 'مخصص' : 'Customized'}
                  </span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOptionalExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-slate-200/80 dark:border-[#2A384C]/80"
                  >
                    <div className="p-4 space-y-4">
                      {/* Description & Target Model (OPTIONAL) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t('descriptionLabel')}
                          </label>
                          <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={
                              language === 'ar'
                                ? 'نبذة موجزة تشرح وظيفة الأمر...'
                                : 'Brief explanation of what this prompt accomplishes...'
                            }
                            className="w-full px-3.5 py-2 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Cpu className="w-3.5 h-3.5 text-slate-400" />
                            {t('targetModelLabel')}
                          </label>
                          <input
                            type="text"
                            value={targetModel}
                            onChange={(e) => setTargetModel(e.target.value)}
                            placeholder="e.g. Claude 3.7 / Cursor / Midjourney v6"
                            className="w-full px-3.5 py-2 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Tags (OPTIONAL) */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <TagIcon className="w-3.5 h-3.5 text-slate-400" />
                          {t('tagsLabel')}
                        </label>

                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#2A384C]"
                              >
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="hover:text-red-500 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder={language === 'ar' ? 'اكتب الوسم واضغط إضافة...' : 'Type tag and press Add...'}
                            className="flex-1 px-3.5 py-1.5 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            {language === 'ar' ? 'إضافة' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#2A384C] bg-slate-50 dark:bg-[#141C2B] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('adminCancel')}
            </button>
            <button
              type="submit"
              form="public-prompt-form"
              disabled={isUploading || isCompressing}
              className="inline-flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs md:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{language === 'ar' ? 'جارٍ الرفع...' : 'Uploading...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('submitPromptButton')}</span>
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
