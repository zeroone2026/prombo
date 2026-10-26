import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Users,
  Send,
  Heart,
  Pin,
  Trash2,
  Edit2,
  Check,
  MoreVertical,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Flag,
  Share2,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import { CommunityPost, CommunityUser, Prompt } from '../../types';
import { UserAvatar } from '../UserAvatar';
import { formatTimeAgo } from '../../utils/dateUtils';
import { MentionDropdown, renderContentWithMentions, MentionUser } from './MentionDropdown';
import { useApp } from '../../context/AppContext';
import { useReportModal } from '../../context/ReportModalContext';
import { useGuestRestriction } from '../../context/GuestRestrictionContext';
import { getPostUrl, copyTextToClipboard } from '../../utils/slugUtils';
import { TranslatableContent } from '../TranslatableContent';
import { TranslatableAuthorName } from '../TranslatableAuthorName';
import { MediaGrid } from './MediaGrid';
import { useContentMediaSettings } from '../../hooks/useContentMediaSettings';
import { validatePhotoFile, validateVideoFile, fileToDataUrl, isValidVideoUrl } from '../../utils/mediaValidation';
import { compressImage } from '../../utils/imageUtils';
import { uploadCommunityMediaToSupabase, uploadPromptMediaToSupabase } from '../../services/supabaseClient';

interface PostRepliesModalProps {
  isOpen: boolean;
  post: CommunityPost | null;
  onClose: () => void;
  currentUser: CommunityUser | null;
  onToggleLike: (replyId: string) => Promise<void>;
  onCreateReply: (
    postId: string,
    content: string,
    mediaPayload?: { images?: string[]; videos?: string[]; videoUrl?: string }
  ) => Promise<void>;
  onTogglePinReply: (postId: string, replyId: string, isPinned: boolean) => Promise<void>;
  onDeleteReply: (postId: string, replyId: string) => Promise<void>;
  onEditReply: (postId: string, replyId: string, content: string) => Promise<void>;
  onOpenAuth: () => void;
  allPrompts?: Prompt[];
  siteSettings?: any;
}

export const PostRepliesModal: React.FC<PostRepliesModalProps> = ({
  isOpen,
  post,
  onClose,
  currentUser,
  onToggleLike,
  onCreateReply,
  onTogglePinReply,
  onDeleteReply,
  onEditReply,
  onOpenAuth,
}) => {
  const { language, t } = useApp();
  const { openReportModal } = useReportModal();
  const { isGuest, openAuthModal } = useGuestRestriction();
  const contentMedia = useContentMediaSettings();
  const communityMedia = contentMedia.community;
  const isRTL = language === 'ar';
  const isUnauthOrGuest = !currentUser || Boolean(currentUser.isGuest) || isGuest;

  // Sorting: Default to 'newest' (الأجدد)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [justCopiedPostLink, setJustCopiedPostLink] = useState(false);

  // New Reply Input
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Media attachments for reply
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replyImageFiles, setReplyImageFiles] = useState<{ file: File | Blob; dataUrl: string; name: string }[]>([]);
  const [replyVideos, setReplyVideos] = useState<string[]>([]);
  const [replyVideoFiles, setReplyVideoFiles] = useState<{ file: File; dataUrl: string; name: string }[]>([]);
  const [replyVideoUrl, setReplyVideoUrl] = useState<string>('');
  const [showVideoUrlBox, setShowVideoUrlBox] = useState<boolean>(false);
  const [mediaError, setMediaError] = useState<string>('');
  const [isProcessingMedia, setIsProcessingMedia] = useState<boolean>(false);
  const replyImageInputRef = useRef<HTMLInputElement | null>(null);
  const replyVideoInputRef = useRef<HTMLInputElement | null>(null);

  // Mention Autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionHighlightedIndex, setMentionHighlightedIndex] = useState(0);

  // Comment Actions
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or post changes
  useEffect(() => {
    if (isOpen) {
      setReplyContent('');
      setEditingReplyId(null);
      setConfirmDeleteId(null);
      setOpenMenuId(null);
      setReplyImages([]);
      setReplyImageFiles([]);
      setReplyVideos([]);
      setReplyVideoFiles([]);
      setReplyVideoUrl('');
      setShowVideoUrlBox(false);
      setMediaError('');
    }
  }, [isOpen, post?.id]);

  const replies = post?.replies || [];

  // Sort comments: Keep author-pinned reply at the top, then sort remainder chronologically
  const pinnedReply = replies.find((r) => r.isPinned);
  const unpinnedReplies = replies.filter((r) => !r.isPinned);

  const sortedUnpinned = [...unpinnedReplies].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (sortBy === 'newest') {
      return timeB - timeA; // Newest first
    }
    return timeA - timeB; // Oldest first
  });

  const displayReplies = pinnedReply ? [pinnedReply, ...sortedUnpinned] : sortedUnpinned;

  // Strict Permission Helpers
  const isPostAuthor = (user: CommunityUser | null): boolean => {
    if (!user || !user.id) return false;
    return user.id === post.userId;
  };

  const isCommentAuthor = (user: CommunityUser | null, reply: CommunityPost): boolean => {
    if (!user || !user.id) return false;
    return user.id === reply.userId;
  };

  const handleReplyImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    setMediaError('');

    const maxPhotos = communityMedia.maxPhotosCount || 4;
    const remainingSlots = maxPhotos - replyImages.length;
    if (remainingSlots <= 0) {
      setMediaError(
        language === 'ar'
          ? `الحد الأقصى للصور هو ${maxPhotos} صور لكل تعليق.`
          : `Maximum limit is ${maxPhotos} photos per reply.`
      );
      return;
    }

    const filesToProcess: File[] = files.slice(0, remainingSlots);
    setIsProcessingMedia(true);

    try {
      const newImages: string[] = [];
      const newFiles: { file: File | Blob; dataUrl: string; name: string }[] = [];
      for (const file of filesToProcess) {
        const validation = validatePhotoFile(file, communityMedia);
        if (!validation.valid) {
          setMediaError(language === 'ar' ? (validation.errorAr || validation.error!) : validation.error!);
          continue;
        }

        try {
          const compressed = await compressImage(file, {
            maxSizeMB: communityMedia.maxPhotoSizeMB || 5,
            maxWidthOrHeight: 1600,
            quality: 0.82,
            outputFormat: 'image/webp',
          });
          newImages.push(compressed.dataUrl);
          newFiles.push({ file: compressed.blob, dataUrl: compressed.dataUrl, name: file.name.replace(/\.[^/.]+$/, "") + ".webp" });
        } catch {
          const fallbackDataUrl = await fileToDataUrl(file);
          newImages.push(fallbackDataUrl);
          newFiles.push({ file, dataUrl: fallbackDataUrl, name: file.name });
        }
      }

      if (newImages.length > 0) {
        setReplyImages((prev) => [...prev, ...newImages]);
        setReplyImageFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err: any) {
      setMediaError(err.message || 'Error processing photo');
    } finally {
      setIsProcessingMedia(false);
      if (replyImageInputRef.current) {
        replyImageInputRef.current.value = '';
      }
    }
  };

  const handleReplyVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError('');
    setIsProcessingMedia(true);

    try {
      const validation = await validateVideoFile(file, communityMedia);
      if (!validation.valid) {
        setMediaError(language === 'ar' ? (validation.errorAr || validation.error!) : validation.error!);
        setIsProcessingMedia(false);
        return;
      }

      const videoDataUrl = await fileToDataUrl(file);
      setReplyVideos([videoDataUrl]);
      setReplyVideoFiles([{ file, dataUrl: videoDataUrl, name: file.name || `video_${Date.now()}.mp4` }]);
    } catch (err: any) {
      setMediaError(err.message || 'Error processing video');
    } finally {
      setIsProcessingMedia(false);
      if (replyVideoInputRef.current) {
        replyVideoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveReplyImage = (index: number) => {
    setReplyImages((prev) => prev.filter((_, idx) => idx !== index));
    setReplyImageFiles((prev) => prev.filter((_, idx) => idx !== index));
    setMediaError('');
  };

  const handleRemoveReplyVideo = () => {
    setReplyVideos([]);
    setReplyVideoFiles([]);
    setMediaError('');
  };

  const handleRemoveReplyVideoUrl = () => {
    setReplyVideoUrl('');
    setShowVideoUrlBox(false);
    setMediaError('');
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isUnauthOrGuest) {
      openAuthModal('signin');
      onOpenAuth();
      return;
    }

    const hasMedia = replyImages.length > 0 || replyVideos.length > 0 || Boolean(replyVideoUrl.trim());
    if ((!replyContent.trim() && !hasMedia) || isSubmitting) return;

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload images to Supabase 'community-media'
      const finalUploadedImages: string[] = [];
      if (replyImageFiles.length > 0) {
        for (const img of replyImageFiles) {
          try {
            const res = await uploadCommunityMediaToSupabase(img.file, img.name);
            if (res.success && res.publicUrl) {
              finalUploadedImages.push(res.publicUrl);
            } else {
              finalUploadedImages.push(img.dataUrl);
            }
          } catch {
            finalUploadedImages.push(img.dataUrl);
          }
        }
      } else if (replyImages.length > 0) {
        finalUploadedImages.push(...replyImages);
      }

      // 2. Upload videos to Supabase 'community-media'
      const finalUploadedVideos: string[] = [];
      if (replyVideoFiles.length > 0) {
        for (const vid of replyVideoFiles) {
          try {
            const res = await uploadPromptMediaToSupabase(vid.file, vid.name, 'community-media');
            if (res.success && res.publicUrl) {
              finalUploadedVideos.push(res.publicUrl);
            } else {
              finalUploadedVideos.push(vid.dataUrl);
            }
          } catch {
            finalUploadedVideos.push(vid.dataUrl);
          }
        }
      } else if (replyVideos.length > 0) {
        finalUploadedVideos.push(...replyVideos);
      }

      const cleanVideoUrl = replyVideoUrl.trim();

      await onCreateReply(post.id, replyContent.trim(), {
        images: finalUploadedImages.length > 0 ? finalUploadedImages : undefined,
        videos: finalUploadedVideos.length > 0 ? finalUploadedVideos : undefined,
        videoUrl: cleanVideoUrl || finalUploadedVideos[0] || undefined,
      });

      setReplyContent('');
      setReplyImages([]);
      setReplyImageFiles([]);
      setReplyVideos([]);
      setReplyVideoFiles([]);
      setReplyVideoUrl('');
      setShowVideoUrlBox(false);
      setMentionQuery(null);
      // Scroll down to newly added reply
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Failed to submit reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (replyId: string) => {
    const trimmed = editReplyContent.trim();
    if (!trimmed || isEditingSaving) return;

    setIsEditingSaving(true);
    try {
      await onEditReply(post.id, replyId, trimmed);
      setEditingReplyId(null);
      setEditReplyContent('');
    } catch (err) {
      console.error('Failed to edit reply:', err);
    } finally {
      setIsEditingSaving(false);
    }
  };

  const handleConfirmDelete = async (replyId: string) => {
    try {
      await onDeleteReply(post.id, replyId);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete reply:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && post && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-5 py-3.5 sm:py-4 border-b border-slate-200 dark:border-[#2A384C] flex items-center justify-between gap-3 bg-slate-50/95 dark:bg-[#121824]/95 backdrop-blur-sm shrink-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'عرض الردود' : 'Post Comments'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
                    {replies.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? `ردود على منشور ${post.userName}` : `Replies to ${post.userName}'s post`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort By Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] text-slate-700 dark:text-slate-200 hover:border-orange-400 dark:hover:border-orange-500/50 transition-all cursor-pointer shadow-2xs"
                  title={language === 'ar' ? 'ترتيب الردود' : 'Sort comments'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
                  <span>
                    {sortBy === 'newest'
                      ? (language === 'ar' ? 'الأجدد' : 'Newest')
                      : (language === 'ar' ? 'الأقدم' : 'Oldest')}
                  </span>
                </button>

                <AnimatePresence>
                  {isSortDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsSortDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        className={`absolute top-full mt-1.5 z-30 min-w-[130px] rounded-xl bg-white dark:bg-[#1c2638] border border-slate-200 dark:border-[#2e3e57] shadow-xl p-1 text-xs font-semibold ${
                          isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('newest');
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer text-start ${
                            sortBy === 'newest'
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#253348]'
                          }`}
                        >
                          <span>{language === 'ar' ? 'الأجدد' : 'Newest'}</span>
                          {sortBy === 'newest' && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('oldest');
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer text-start ${
                            sortBy === 'oldest'
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#253348]'
                          }`}
                        >
                          <span>{language === 'ar' ? 'الأقدم' : 'Oldest'}</span>
                          {sortBy === 'oldest' && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Copy Post Link Button */}
              <button
                type="button"
                onClick={async () => {
                  const url = getPostUrl(post.id);
                  const ok = await copyTextToClipboard(url);
                  if (ok) {
                    setJustCopiedPostLink(true);
                    setTimeout(() => setJustCopiedPostLink(false), 2000);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  justCopiedPostLink
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] text-slate-700 dark:text-slate-200 hover:border-orange-400 dark:hover:border-orange-500/50'
                }`}
                title={language === 'ar' ? 'نسخ رابط المنشور' : 'Copy post link'}
              >
                {justCopiedPostLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{language === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-orange-500" />
                    <span className="hidden sm:inline">{language === 'ar' ? 'مشاركة' : 'Share'}</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={t('modalClose')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Unified Scroll Container (Facebook Style: Parent Post + Replies list scroll together seamlessly) */}
          <div
            ref={commentsContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-[#222E40]"
          >
            {/* Original Parent Post Content (Scrolls up and out of view when scrolling down through replies) */}
            <div className="p-4 sm:p-5 bg-orange-500/5 dark:bg-orange-500/10 flex items-start gap-3">
              <UserAvatar
                user={{ name: post.userName, avatar: post.userAvatar }}
                size="xs"
                showGlow={false}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <TranslatableAuthorName
                    name={post.userName}
                    userId={post.userId}
                    className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
                  />
                  <span className="text-[10px] text-slate-400">
                    {formatTimeAgo(post.createdAt, language)}
                  </span>
                  {(post.isEdited || (post.updatedAt && post.createdAt && new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 1000)) && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
                      title={language === 'ar' ? 'تم تعديل هذا المنشور' : 'This post was edited'}
                    >
                      {language === 'ar' ? 'مُعَدَّل' : (t('edited') || 'Edited')}
                    </span>
                  )}
                </div>
                <TranslatableContent
                  content={post.content}
                  className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words"
                />
                {/* Attached Post Media */}
                {((post.images && post.images.length > 0) || (post.videos && post.videos.length > 0) || post.videoUrl) && (
                  <MediaGrid
                    images={post.images}
                    videos={post.videos}
                    videoUrl={post.videoUrl}
                    title={post.promptTitle || post.userName}
                    author={post.userName}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* Continuous Replies Stream (No isolated overflow-y or fixed height) */}
            <div className="p-4 sm:p-5 space-y-3">
            {displayReplies.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto shadow-inner">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {language === 'ar' ? 'لا يوجد أي ردود حتى الآن' : 'No comments yet'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'لا يوجد أي ردود, كن أنت أول شخص' : 'Be the first person to share a comment!'}
                  </p>
                </div>
              </div>
            ) : (
              displayReplies.map((reply) => {
                const isEditing = editingReplyId === reply.id;
                const isConfirmingDelete = confirmDeleteId === reply.id;
                const userIsPostAuthor = isPostAuthor(currentUser);
                const userIsCommentAuthor = isCommentAuthor(currentUser, reply);
                const canOpenMenu = userIsPostAuthor || userIsCommentAuthor;

                return (
                  <div
                    key={reply.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      reply.isPinned
                        ? 'bg-orange-500/5 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/40 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#121824] border-slate-200/80 dark:border-[#2A384C]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <UserAvatar
                          avatar={reply.userAvatar}
                          name={reply.userName}
                          size="xs"
                          showGlow={false}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <TranslatableAuthorName
                              name={reply.userName}
                              userId={reply.userId}
                              className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] sm:max-w-xs"
                            />

                            {/* Author Indicator */}
                            {reply.userId === post.userId && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                {language === 'ar' ? 'صاحب المنشور' : (language === 'fr' ? 'Auteur' : (language === 'es' ? 'Autor' : (language === 'zh' ? '作者' : (language === 'hi' ? 'लेखक' : (language === 'ja' ? '投稿者' : 'Author')))))}
                              </span>
                            )}

                            {/* Pinned Badge */}
                            {reply.isPinned && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.2 rounded-md border border-orange-200 dark:border-orange-800">
                                <Pin className="w-2.5 h-2.5 fill-current" />
                                <span>{language === 'ar' ? 'رد مثبت' : 'Pinned'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span>{formatTimeAgo(reply.createdAt, language)}</span>
                            {(reply.isEdited || (reply.updatedAt && reply.createdAt && new Date(reply.updatedAt).getTime() > new Date(reply.createdAt).getTime() + 1000)) && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
                                title={language === 'ar' ? 'تم تعديل هذا الرد' : 'This reply was edited'}
                              >
                                {language === 'ar' ? 'مُعَدَّل' : (t('edited') || 'Edited')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3-Dots Kebab Menu for Reply */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === reply.id ? null : reply.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#202c3e] rounded transition-colors cursor-pointer"
                          title={language === 'ar' ? 'خيارات' : 'Options'}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        <AnimatePresence>
                          {openMenuId === reply.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.12 }}
                                className={`absolute top-full mt-1 z-40 min-w-[140px] rounded-xl bg-white dark:bg-[#1c2638] border border-slate-200 dark:border-[#2e3e57] shadow-xl py-1 text-xs font-medium divide-y divide-slate-100 dark:divide-slate-800 ${
                                  isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                                }`}
                              >
                                {(userIsPostAuthor || userIsCommentAuthor) && (
                                  <div className="py-0.5">
                                    {/* Post Author Pin / Unpin Option */}
                                    {userIsPostAuthor && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          onTogglePinReply(post.id, reply.id, !reply.isPinned);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#253348] text-start transition-colors cursor-pointer"
                                      >
                                        <Pin className={`w-3 h-3 text-orange-500 shrink-0 ${reply.isPinned ? 'fill-current' : ''}`} />
                                        <span>
                                          {reply.isPinned
                                            ? (language === 'ar' ? 'إلغاء التثبيت' : 'Unpin comment')
                                            : (language === 'ar' ? 'تثبيت' : 'Pin comment')}
                                        </span>
                                      </button>
                                    )}

                                    {/* Comment Author Edit (Authors cannot edit other people's comments) */}
                                    {userIsCommentAuthor && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setEditingReplyId(reply.id);
                                          setEditReplyContent(reply.content);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#253348] text-start transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3 text-orange-500 shrink-0" />
                                        <span>{t('actions.edit')}</span>
                                      </button>
                                    )}

                                    {/* Comment Author Delete */}
                                    {userIsCommentAuthor && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setConfirmDeleteId(reply.id);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                                        <span>{t('actions.delete')}</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Universal Report Reply Option */}
                                <div className="py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      if (isGuest) {
                                        openAuthModal('signin');
                                        return;
                                      }
                                      openReportModal({
                                        targetType: 'reply',
                                        targetId: reply.id,
                                        targetTitle: `رد من ${reply.userName}`,
                                        targetContent: reply.content,
                                        reportedUserId: reply.userId,
                                        reportedUserName: reply.userName,
                                        reportedUserEmail: reply.userEmail,
                                        contentUrl: `${window.location.origin}/#post-${post.id}-reply-${reply.id}`,
                                      });
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                                  >
                                    <Flag className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>{t('actions.report')}</span>
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Delete Confirmation Dialog */}
                    {isConfirmingDelete && (
                      <div className="mt-2.5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                          <span>{t('deleteConfirmQuestion')}</span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1 bg-transparent border border-slate-300 dark:border-white/30 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(reply.id)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t('confirmDelete')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Input Box */}
                    {isEditing ? (
                      <div className="mt-2.5 space-y-2">
                        <textarea
                          value={editReplyContent}
                          onChange={(e) => setEditReplyContent(e.target.value)}
                          rows={2}
                          className="w-full p-2.5 text-xs bg-white dark:bg-[#182232] border border-orange-400 dark:border-orange-500/50 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReplyId(null);
                              setEditReplyContent('');
                            }}
                            className="px-3 py-1.5 bg-transparent border border-slate-300 dark:border-white/30 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(reply.id)}
                            disabled={!editReplyContent.trim() || isEditingSaving}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>{t('confirmEdit')}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <TranslatableContent
                        content={reply.content}
                        renderFormatted={renderContentWithMentions}
                        className="mt-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words"
                      />
                    )}

                    {/* Render Image Gallery and Video Player if reply has media */}
                    {((reply.images && reply.images.length > 0) || (reply.videos && reply.videos.length > 0) || Boolean(reply.videoUrl)) && (
                      <MediaGrid
                        images={reply.images}
                        videos={reply.videos}
                        videoUrl={reply.videoUrl}
                        title={reply.userName}
                        author={reply.userName}
                        className="mt-2"
                      />
                    )}

                    {/* Like Action */}
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-[#2A384C]/50 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (isUnauthOrGuest) {
                            openAuthModal('signin');
                            onOpenAuth();
                            return;
                          }
                          onToggleLike(reply.id);
                        }}
                        className={`inline-flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                          reply.isLikedByMe
                            ? 'text-rose-500 scale-105'
                            : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${reply.isLikedByMe ? 'fill-current' : ''}`} />
                        <span>{reply.likesCount || 0}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Bottom Reply Composer Form (Fixed/Sticky at Bottom) */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-[#2A384C] bg-slate-50/95 dark:bg-[#121824]/95 backdrop-blur-sm shrink-0 z-20">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={replyImageInputRef}
              accept={communityMedia.acceptedPhotoFormats?.join(',') || 'image/jpeg,image/png,image/webp'}
              multiple
              className="hidden"
              onChange={handleReplyImageSelect}
            />
            <input
              type="file"
              ref={replyVideoInputRef}
              accept={communityMedia.acceptedVideoFormats?.join(',') || 'video/mp4,video/webm,video/quicktime'}
              className="hidden"
              onChange={handleReplyVideoSelect}
            />

            <form onSubmit={handleSendReply} className="space-y-2.5">
              {/* Media Error Alert */}
              {mediaError && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{mediaError}</span>
                  <button
                    type="button"
                    onClick={() => setMediaError('')}
                    className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Media Previews Container */}
              {(replyImages.length > 0 || replyVideos.length > 0 || replyVideoUrl) && (
                <div className="p-2 bg-white dark:bg-[#182232] rounded-xl border border-slate-200 dark:border-[#2A384C] space-y-2">
                  {/* Images Thumbnails Strip */}
                  {replyImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                      {replyImages.map((img, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-[#2A384C] group shadow-2xs">
                          <img src={img} alt="Reply preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveReplyImage(idx)}
                            className="absolute top-0.5 right-0.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                            title={language === 'ar' ? 'حذف الصورة' : 'Remove image'}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Video Thumbnail / Chip */}
                  {replyVideos.length > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <VideoIcon className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {replyVideoFiles[0]?.name || (language === 'ar' ? 'فيديو مرفق' : 'Attached Video')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReplyVideo}
                        className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded transition-colors cursor-pointer"
                        title={language === 'ar' ? 'حذف الفيديو' : 'Remove video'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Video URL Badge */}
                  {replyVideoUrl && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate text-[11px]">
                          {replyVideoUrl}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReplyVideoUrl}
                        className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded transition-colors cursor-pointer"
                        title={language === 'ar' ? 'حذف الرابط' : 'Remove link'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Video URL Input */}
              {showVideoUrlBox && (
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-[#182232] border border-orange-300 dark:border-orange-500/40 rounded-xl shadow-2xs">
                  <LinkIcon className="w-4 h-4 text-orange-500 shrink-0" />
                  <input
                    type="url"
                    value={replyVideoUrl}
                    onChange={(e) => setReplyVideoUrl(e.target.value)}
                    placeholder={language === 'ar' ? 'رابط يوتيوب أو فيميو أو MP4 مباشر...' : 'YouTube, Vimeo, or direct MP4 URL...'}
                    className="flex-1 text-xs bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                  />
                  {replyVideoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveReplyVideoUrl}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="relative">
                {/* Mention Autocomplete Dropdown */}
                <MentionDropdown
                  isOpen={mentionQuery !== null}
                  query={mentionQuery || ''}
                  postAuthor={{ name: post.userName, avatar: post.userAvatar }}
                  threadUsers={replies.map((r) => ({
                    name: r.userName,
                    avatar: r.userAvatar,
                  }))}
                  onSelect={(chosenName) => {
                    const updated = replyContent.replace(/(?:^|\s)@([^\s@]*)$/, (fullMatch) => {
                      const startsWithSpace = fullMatch.startsWith(' ');
                      return `${startsWithSpace ? ' ' : ''}@${chosenName} `;
                    });
                    setReplyContent(updated);
                    setMentionQuery(null);
                  }}
                  onClose={() => setMentionQuery(null)}
                  language={language}
                  position="top"
                  highlightedIndex={mentionHighlightedIndex}
                />

                <input
                  ref={replyInputRef}
                  type="text"
                  value={replyContent}
                  onClick={() => {
                    if (isUnauthOrGuest) {
                      openAuthModal('signin');
                      onOpenAuth();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReplyContent(val);
                    const match = val.match(/(?:^|\s)@([^\s@]*)$/);
                    if (match) {
                      setMentionQuery(match[1]);
                      setMentionHighlightedIndex(0);
                    } else {
                      setMentionQuery(null);
                    }
                  }}
                  placeholder={
                    !isUnauthOrGuest
                      ? t('replyPlaceholder')
                      : (language === 'ar' ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة رد...' : 'Sign in or register to reply...')
                  }
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  onKeyDown={(e) => {
                    const postAuthor = { name: post.userName, avatar: post.userAvatar };
                    const threadUsers = replies.map((r) => ({ name: r.userName, avatar: r.userAvatar }));
                    const authorItem: MentionUser = { name: postAuthor.name, avatar: postAuthor.avatar, isAuthor: true };
                    const uniqueUsers: MentionUser[] = [];
                    const seen = new Set<string>();
                    seen.add(postAuthor.name.toLowerCase());
                    threadUsers.forEach((u) => {
                      if (u.name && !seen.has(u.name.toLowerCase())) {
                        seen.add(u.name.toLowerCase());
                        uniqueUsers.push({ name: u.name, avatar: u.avatar });
                      }
                    });
                    const allSuggestions = [authorItem, ...uniqueUsers];
                    const cleanQ = (mentionQuery || '').trim().toLowerCase();
                    const filtered = cleanQ
                      ? allSuggestions.filter((item) => item.name.toLowerCase().includes(cleanQ))
                      : allSuggestions;

                    if (mentionQuery !== null && filtered.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setMentionHighlightedIndex((prev) => (prev + 1) % filtered.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setMentionHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                        return;
                      }
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        const chosen = filtered[mentionHighlightedIndex];
                        if (chosen) {
                          const updated = replyContent.replace(/(?:^|\s)@([^\s@]*)$/, (fullMatch) => {
                            const startsWithSpace = fullMatch.startsWith(' ');
                            return `${startsWithSpace ? ' ' : ''}@${chosen.name} `;
                          });
                          setReplyContent(updated);
                          setMentionQuery(null);
                        }
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setMentionQuery(null);
                        return;
                      }
                    }

                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
              </div>

              {/* Actions row: Media Attachment Controls + Cancel Button alongside Orange Submit Button */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Media Attachment Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {communityMedia.allowPhotos !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnauthOrGuest) {
                          openAuthModal('signin');
                          onOpenAuth();
                          return;
                        }
                        replyImageInputRef.current?.click();
                      }}
                      disabled={isProcessingMedia || replyImages.length >= (communityMedia.maxPhotosCount || 4)}
                      className="p-2 rounded-xl text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                      title={language === 'ar' ? 'إرفاق صورة' : 'Attach photo'}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}

                  {communityMedia.allowVideos !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnauthOrGuest) {
                          openAuthModal('signin');
                          onOpenAuth();
                          return;
                        }
                        replyVideoInputRef.current?.click();
                      }}
                      disabled={isProcessingMedia || replyVideos.length > 0}
                      className="p-2 rounded-xl text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                      title={language === 'ar' ? 'إرفاق فيديو MP4' : 'Attach video file'}
                    >
                      <VideoIcon className="w-4 h-4" />
                    </button>
                  )}

                  {communityMedia.allowVideoUrl !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnauthOrGuest) {
                          openAuthModal('signin');
                          onOpenAuth();
                          return;
                        }
                        setShowVideoUrlBox(!showVideoUrlBox);
                      }}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        showVideoUrlBox || replyVideoUrl
                          ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10'
                          : 'text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                      }`}
                      title={language === 'ar' ? 'إضافة رابط فيديو' : 'Add video link'}
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  )}

                  {isProcessingMedia && (
                    <span className="text-[11px] text-orange-600 dark:text-orange-400 animate-pulse font-medium px-1">
                      {language === 'ar' ? 'جارٍ معالجة الوسائط...' : 'Processing media...'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 ms-auto">
                  {isUnauthOrGuest && (
                    <button
                      type="button"
                      onClick={() => {
                        openAuthModal('signin');
                        onOpenAuth();
                      }}
                      className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer me-2"
                    >
                      {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setReplyContent('');
                      setReplyImages([]);
                      setReplyImageFiles([]);
                      setReplyVideos([]);
                      setReplyVideoFiles([]);
                      setReplyVideoUrl('');
                      setShowVideoUrlBox(false);
                      onClose();
                    }}
                    className="px-4 py-2 bg-transparent border border-slate-300 dark:border-white/30 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    onClick={(e) => {
                      if (isUnauthOrGuest) {
                        e.preventDefault();
                        openAuthModal('signin');
                        onOpenAuth();
                      }
                    }}
                    disabled={
                      ((!replyContent.trim() && replyImages.length === 0 && replyVideos.length === 0 && !replyVideoUrl.trim()) && !isUnauthOrGuest) ||
                      isSubmitting ||
                      isProcessingMedia
                    }
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/25 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إرسال الرد' : 'Send Reply'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
