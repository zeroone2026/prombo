import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Send,
  Heart,
  CornerDownLeft,
  Code2,
  Plus,
  Search,
  Filter,
  Pin,
  Sparkles,
  Trash2,
  Lock,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Bookmark,
  Share2,
  Copy,
  Check,
  AlertCircle,
  ShieldAlert,
  Edit2,
  AlertTriangle,
  X,
  ArrowUpRight,
  Maximize2,
  MoreVertical,
  MessageSquare,
  Flag,
  Image as ImageIcon,
  Video as VideoIcon,
  UploadCloud,
  Link as LinkIcon,
} from 'lucide-react';
import { CommunityPost, Prompt, Category, CommunityUser, SiteSettings } from '../../types';
import { CommunityService } from '../../services/communityService';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storage';
import { AnalyticsService } from '../../services/analyticsService';
import { useApp } from '../../context/AppContext';
import { useReportModal } from '../../context/ReportModalContext';
import { useGuestRestriction } from '../../context/GuestRestrictionContext';
import { CommentBubbleIcon } from '../CommentBubbleIcon';
import { formatTimeAgo } from '../../utils/dateUtils';
import { isAdminUser, DEFAULT_AVATAR_URL } from '../../utils/authUtils';
import { MentionDropdown, renderContentWithMentions, MentionUser } from './MentionDropdown';
import { UserAvatar } from '../UserAvatar';
import { PostRepliesModal } from './PostRepliesModal';
import { getPostUrl, copyTextToClipboard } from '../../utils/slugUtils';
import { TranslatableContent } from '../TranslatableContent';
import { TranslatableAuthorName } from '../TranslatableAuthorName';
import { MediaGrid } from './MediaGrid';
import { DraggableMediaReorder, DraggableMediaItem } from '../media/DraggableMediaReorder';
import { useContentMediaSettings } from '../../hooks/useContentMediaSettings';
import { validatePhotoFile, validateVideoFile, fileToDataUrl, isValidVideoUrl } from '../../utils/mediaValidation';
import { compressImage } from '../../utils/imageUtils';
import { matchesCommunitySearch } from '../../utils/searchEngine';
import { uploadCommunityMediaToSupabase, uploadPromptMediaToSupabase } from '../../services/supabaseClient';
import { NativeFeedAdCard } from '../ads/NativeFeedAdCard';
import { AdBanner } from '../ads/AdBanner';

interface CommunityFeedProps {
  prompts: Prompt[];
  categories: Category[];
  siteSettings: SiteSettings;
  onCopyPrompt: (text: string, promptId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateToPrompt?: (promptId: string) => void;
  onOpenPromptDetail?: (promptId: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  initialPostId?: string | null;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  prompts,
  categories,
  siteSettings,
  onCopyPrompt,
  onShowToast,
  onNavigateToPrompt,
  onOpenPromptDetail,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  initialPostId,
}) => {
  const { t, language, isRTL } = useApp();
  const { openReportModal } = useReportModal();
  const { isGuest, openAuthModal } = useGuestRestriction();
  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(() => AuthService.getCurrentUser());
  const isUnauthOrGuest = !currentUser || Boolean(currentUser.isGuest) || isGuest;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    setInternalSearchQuery(val);
    if (externalOnSearchChange) {
      externalOnSearchChange(val);
    }
  };
  
  // New Post Form
  const [isPostingOpen, setIsPostingOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [attachedPromptId, setAttachedPromptId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply Thread States & @Mention Autocomplete
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionHighlightedIndex, setMentionHighlightedIndex] = useState<number>(0);

  // Edit State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [editMediaItems, setEditMediaItems] = useState<DraggableMediaItem[]>([]);
  const [editVideoUrl, setEditVideoUrl] = useState<string>('');
  const [showEditVideoUrlBox, setShowEditVideoUrlBox] = useState<boolean>(false);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);
  const editVideoInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation State
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);

  // Kebab 3-Dots Dropdown State (Author only)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Dedicated Post Replies Modal State
  const [repliesModalPostId, setRepliesModalPostId] = useState<string | null>(null);

  // Dynamic In-Feed Native Ads State (with localStorage persistence)
  const [adsConfig, setAdsConfig] = useState(() => StorageService.getAdsConfig());
  const [dismissedFeedAds, setDismissedFeedAds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('prombo_dismissed_feed_ads');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sync adsConfig when ads settings or click counts change
  useEffect(() => {
    const handleAdsConfigSync = () => {
      setAdsConfig(StorageService.getAdsConfig());
    };
    window.addEventListener('prombo_ads_config_changed', handleAdsConfigSync);
    window.addEventListener('prombo_ads_click_recorded', handleAdsConfigSync);
    return () => {
      window.removeEventListener('prombo_ads_config_changed', handleAdsConfigSync);
      window.removeEventListener('prombo_ads_click_recorded', handleAdsConfigSync);
    };
  }, []);

  const handleDismissFeedAd = (adId: string) => {
    setDismissedFeedAds((prev) => {
      const updated = new Set(prev);
      updated.add(adId);
      try {
        localStorage.setItem('prombo_dismissed_feed_ads', JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });
  };

  // Real-time Content & Media Settings
  const contentMedia = useContentMediaSettings();
  const communityMedia = contentMedia.community;

  // New Post Media Attachments State
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedImageFiles, setAttachedImageFiles] = useState<{ file: File | Blob; dataUrl: string; name: string }[]>([]);
  const [attachedVideos, setAttachedVideos] = useState<string[]>([]);
  const [attachedVideoFiles, setAttachedVideoFiles] = useState<{ file: File; dataUrl: string; name: string }[]>([]);
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [showVideoUrlBox, setShowVideoUrlBox] = useState(false);
  const [mediaError, setMediaError] = useState<string>('');
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const postVideoInputRef = useRef<HTMLInputElement | null>(null);

  // Unified Media Items for Composer Drag-and-Drop Reordering
  const composerMediaItems: DraggableMediaItem[] = React.useMemo(() => {
    const list: DraggableMediaItem[] = [];
    attachedImages.forEach((img, idx) => {
      list.push({
        id: `comp-img-${idx}-${img.slice(-12)}`,
        url: img,
        type: 'image',
        name: attachedImageFiles[idx]?.name || `photo_${idx + 1}`,
      });
    });
    attachedVideos.forEach((vid, idx) => {
      list.push({
        id: `comp-vid-${idx}-${vid.slice(-12)}`,
        url: vid,
        type: 'video',
        name: attachedVideoFiles[idx]?.name || `video_${idx + 1}`,
      });
    });
    return list;
  }, [attachedImages, attachedVideos, attachedImageFiles, attachedVideoFiles]);

  const handleComposerReorder = (reordered: DraggableMediaItem[]) => {
    const newImages: string[] = [];
    const newImageFiles: { file: File | Blob; dataUrl: string; name: string }[] = [];
    const newVideos: string[] = [];
    const newVideoFiles: { file: File; dataUrl: string; name: string }[] = [];

    reordered.forEach((item) => {
      if (item.type === 'image') {
        const idx = attachedImages.indexOf(item.url);
        if (idx !== -1) {
          newImages.push(item.url);
          if (attachedImageFiles[idx]) newImageFiles.push(attachedImageFiles[idx]);
        }
      } else {
        const vIdx = attachedVideos.indexOf(item.url);
        if (vIdx !== -1) {
          newVideos.push(item.url);
          if (attachedVideoFiles[vIdx]) newVideoFiles.push(attachedVideoFiles[vIdx]);
        }
      }
    });

    setAttachedImages(newImages);
    setAttachedImageFiles(newImageFiles);
    setAttachedVideos(newVideos);
    setAttachedVideoFiles(newVideoFiles);
  };

  const handleComposerRemove = (index: number) => {
    const item = composerMediaItems[index];
    if (!item) return;
    if (item.type === 'image') {
      const imgIndex = attachedImages.indexOf(item.url);
      if (imgIndex !== -1) handleRemoveAttachedImage(imgIndex);
    } else {
      const vidIndex = attachedVideos.indexOf(item.url);
      if (vidIndex !== -1) handleRemoveAttachedVideo();
    }
  };

  const handleEditPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (files.length === 0) return;
    setIsProcessingMedia(true);
    try {
      for (const file of files) {
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
          setEditMediaItems((prev) => [
            ...prev,
            { id: `edit-img-${Date.now()}-${Math.random()}`, url: compressed.dataUrl, type: 'image', name: file.name },
          ]);
        } catch {
          const dataUrl = await fileToDataUrl(file);
          setEditMediaItems((prev) => [
            ...prev,
            { id: `edit-img-${Date.now()}-${Math.random()}`, url: dataUrl, type: 'image', name: file.name },
          ]);
        }
      }
    } finally {
      setIsProcessingMedia(false);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
    }
  };

  const handleEditVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingMedia(true);
    try {
      const validation = await validateVideoFile(file, communityMedia);
      if (!validation.valid) {
        setMediaError(language === 'ar' ? (validation.errorAr || validation.error!) : validation.error!);
        setIsProcessingMedia(false);
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      setEditMediaItems((prev) => [
        ...prev,
        { id: `edit-vid-${Date.now()}`, url: dataUrl, type: 'video', name: file.name },
      ]);
    } catch (err: any) {
      setMediaError(err.message || 'Error processing video');
    } finally {
      setIsProcessingMedia(false);
      if (editVideoInputRef.current) editVideoInputRef.current.value = '';
    }
  };

  useEffect(() => {
    AnalyticsService.trackCommunityView('community_feed');
    loadPosts();

    const handleAuth = (e: any) => {
      setCurrentUser(e.detail);
      // Optimistically sync author details in existing in-memory posts if the user updated their profile
      if (e.detail?.id && e.detail?.name) {
        setPosts((prev) =>
          prev.map((post) => {
            let changed = false;
            let p = { ...post };
            if (p.userId === e.detail.id) {
              p.userName = e.detail.name;
              p.userAvatar = e.detail.avatar;
              changed = true;
            }
            if (p.replies && p.replies.length > 0) {
              const updatedReplies = p.replies.map((reply) => {
                if (reply.userId === e.detail.id) {
                  changed = true;
                  return {
                    ...reply,
                    userName: e.detail.name,
                    userAvatar: e.detail.avatar,
                  };
                }
                return reply;
              });
              if (changed) {
                p.replies = updatedReplies;
              }
            }
            return changed ? p : post;
          })
        );
      }
    };

    const handleCommunityPostsChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPosts(e.detail);
      } else {
        loadPosts();
      }
    };

    const handleUserProfileUpdate = (e: any) => {
      const user = e.detail;
      if (user?.id && user?.name) {
        setPosts((prev) =>
          prev.map((post) => {
            let changed = false;
            let p = { ...post };
            if (p.userId === user.id) {
              p.userName = user.name;
              p.userAvatar = user.avatar;
              changed = true;
            }
            if (p.replies && p.replies.length > 0) {
              const updatedReplies = p.replies.map((reply) => {
                if (reply.userId === user.id) {
                  changed = true;
                  return {
                    ...reply,
                    userName: user.name,
                    userAvatar: user.avatar,
                  };
                }
                return reply;
              });
              if (changed) {
                p.replies = updatedReplies;
              }
            }
            return changed ? p : post;
          })
        );
      }
    };

    window.addEventListener('prombo_auth_change', handleAuth);
    window.addEventListener('prombo_community_posts_change', handleCommunityPostsChange);
    window.addEventListener('prombo_user_profile_update', handleUserProfileUpdate);
    window.addEventListener('prombo_post_created', loadPosts);

    return () => {
      window.removeEventListener('prombo_auth_change', handleAuth);
      window.removeEventListener('prombo_community_posts_change', handleCommunityPostsChange);
      window.removeEventListener('prombo_user_profile_update', handleUserProfileUpdate);
      window.removeEventListener('prombo_post_created', loadPosts);
    };
  }, []);

  const handleOpenRepliesModal = (postId: string) => {
    setRepliesModalPostId(postId);
    try {
      window.history.pushState(null, '', `/post/${postId}`);
    } catch (e) {}
  };

  const handleCloseRepliesModal = () => {
    setRepliesModalPostId(null);
    try {
      if (window.location.pathname.startsWith('/post/') || window.location.hash.startsWith('#post-')) {
        window.history.replaceState(null, '', '/community');
      }
    } catch (e) {}
  };

  // Deep-linking direct resolution for /post/:id
  useEffect(() => {
    if (!initialPostId) return;

    let isMounted = true;
    const resolveDeepPost = async () => {
      // 1. Check in currently loaded posts
      const found = posts.find((p) => p.id === initialPostId);
      if (found) {
        setRepliesModalPostId(initialPostId);
        setTimeout(() => {
          const el = document.getElementById(`post-card-${initialPostId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        return;
      }

      // 2. Fetch directly from CommunityService (Supabase / local fallback)
      try {
        const fetched = await CommunityService.getPostById(initialPostId);
        if (!isMounted) return;
        if (fetched) {
          setPosts((prev) => {
            if (prev.some((p) => p.id === fetched.id)) return prev;
            return [fetched, ...prev];
          });
          setRepliesModalPostId(initialPostId);
          setTimeout(() => {
            const el = document.getElementById(`post-card-${initialPostId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        } else if (!isLoading) {
          onShowToast(
            language === 'ar' ? 'المنشور المطلوب غير موجود أو تم حذفه' : 'Post not found or has been removed',
            'error'
          );
        }
      } catch (err) {
        console.warn('Error resolving deep post:', err);
      }
    };

    resolveDeepPost();

    return () => {
      isMounted = false;
    };
  }, [initialPostId, posts.length, isLoading]);

  // Scroll Preservation Utilities
  const captureScrollPosition = () => {
    return window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0;
  };

  const restoreScrollPosition = (scrollY: number) => {
    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    });
  };

  const loadPosts = async () => {
    if (posts.length === 0) {
      setIsLoading(true);
    }
    try {
      const data = await CommunityService.getPosts();
      setPosts(data);
    } catch (err) {
      console.warn('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUnauthOrGuest) {
      onShowToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب لنشر منشور جديد في المجتمع'
          : 'Registration is required to publish community posts',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    if (!newPostContent.trim()) return;

    if (!currentUser) {
      openAuthModal('signin');
      return;
    }

    if (currentUser.isBanned || currentUser.isCommunityBanned) {
      onShowToast(
        language === 'ar'
          ? 'تم تقييد حسابك من النشر في المجتمع. يمكنك تصفح المحتوى أو التواصل مع الدعم الفني.'
          : 'Your account is restricted from posting in the community.',
        'error'
      );
      return;
    }

    const scrollY = captureScrollPosition();
    setIsSubmitting(true);
    const attachedPrompt = prompts.find((p) => p.id === attachedPromptId);

    const cleanVideoUrl = videoUrlInput.trim();

    // 1. Upload images to Supabase 'community-media' bucket, falling back to dataUrl
    const finalUploadedImages: string[] = [];
    if (attachedImageFiles.length > 0) {
      for (const img of attachedImageFiles) {
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
    } else if (attachedImages.length > 0) {
      finalUploadedImages.push(...attachedImages);
    }

    // 2. Upload video files to Supabase 'community-media' bucket, falling back to dataUrl
    const finalUploadedVideos: string[] = [];
    if (attachedVideoFiles.length > 0) {
      for (const vid of attachedVideoFiles) {
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
    } else if (attachedVideos.length > 0) {
      finalUploadedVideos.push(...attachedVideos);
    }

    let mediaType: 'none' | 'image' | 'video' | 'mixed' = 'none';
    if (finalUploadedImages.length > 0 && (finalUploadedVideos.length > 0 || cleanVideoUrl)) {
      mediaType = 'mixed';
    } else if (finalUploadedImages.length > 0) {
      mediaType = 'image';
    } else if (finalUploadedVideos.length > 0 || cleanVideoUrl) {
      mediaType = 'video';
    }

    try {
      const createdPost = await CommunityService.createPost({
        user: currentUser,
        content: newPostContent.trim(),
        promptId: attachedPromptId || undefined,
        promptTitle: attachedPrompt?.title,
        promptCategory: attachedPrompt?.categoryId,
        promptModel: attachedPrompt?.targetModel,
        images: finalUploadedImages.length > 0 ? finalUploadedImages : undefined,
        videos: finalUploadedVideos.length > 0 ? finalUploadedVideos : undefined,
        videoUrl: cleanVideoUrl || finalUploadedVideos[0] || undefined,
        mediaType,
      });

      // Prepend to posts locally only if active/published
      if (createdPost.status === 'pending') {
        onShowToast(
          language === 'ar'
            ? 'تم إرسال مشاركتك بانتظار موافقة الإدارة قبل النشر العلني.'
            : 'Your post was submitted for admin review before publication.',
          'info'
        );
      } else {
        setPosts((prev) => [createdPost, ...prev]);
        onShowToast(language === 'ar' ? 'تم النشر' : (t('toastPromptPublished') || 'Published'), 'success');
      }
      setNewPostContent('');
      setAttachedPromptId('');
      setAttachedImages([]);
      setAttachedImageFiles([]);
      setAttachedVideos([]);
      setAttachedVideoFiles([]);
      setVideoUrlInput('');
      setShowVideoUrlBox(false);
      setMediaError('');
      setIsPostingOpen(false);
    } catch (err) {
      console.error('Failed to create post:', err);
      onShowToast(language === 'ar' ? 'تعذر نشر المشاركة' : 'Failed to publish post', 'error');
    } finally {
      setIsSubmitting(false);
      restoreScrollPosition(scrollY);
    }
  };

  // Media Attachment Selection Handlers for Community Post
  const handlePostImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    setMediaError('');

    const maxPhotos = communityMedia.maxPhotosCount || 4;
    const remainingSlots = maxPhotos - attachedImages.length;
    if (remainingSlots <= 0) {
      setMediaError(
        language === 'ar'
          ? `الحد الأقصى للصور هو ${maxPhotos} صور لكل منشور.`
          : `Maximum limit is ${maxPhotos} photos per post.`
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
        setAttachedImages((prev) => [...prev, ...newImages]);
        setAttachedImageFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err: any) {
      setMediaError(err.message || 'Error processing photo');
    } finally {
      setIsProcessingMedia(false);
      if (postImageInputRef.current) {
        postImageInputRef.current.value = '';
      }
    }
  };

  const handlePostVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setAttachedVideos([videoDataUrl]);
      setAttachedVideoFiles([{ file, dataUrl: videoDataUrl, name: file.name || `video_${Date.now()}.mp4` }]);
    } catch (err: any) {
      setMediaError(err.message || 'Error processing video');
    } finally {
      setIsProcessingMedia(false);
      if (postVideoInputRef.current) {
        postVideoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachedImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== index));
    setAttachedImageFiles((prev) => prev.filter((_, idx) => idx !== index));
    setMediaError('');
  };

  const handleRemoveAttachedVideo = () => {
    setAttachedVideos([]);
    setAttachedVideoFiles([]);
    setMediaError('');
  };

  const handleRemoveVideoUrl = () => {
    setVideoUrlInput('');
    setShowVideoUrlBox(false);
    setMediaError('');
  };

  // Optimistic Add Comment / Reply Handler
  const handleAddComment = async (
    parentId: string,
    optionalContent?: string,
    mediaPayload?: { images?: string[]; videos?: string[]; videoUrl?: string }
  ) => {
    if (isUnauthOrGuest) {
      onShowToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب للرد على المنشور'
          : 'Registration is required to reply to community posts',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    const trimmed = (optionalContent !== undefined ? optionalContent : replyContent).trim();
    const hasMedia = (mediaPayload?.images && mediaPayload.images.length > 0) ||
      (mediaPayload?.videos && mediaPayload.videos.length > 0) ||
      Boolean(mediaPayload?.videoUrl);

    if (!trimmed && !hasMedia) return;

    if (!currentUser) {
      openAuthModal('signin');
      return;
    }

    if (currentUser.isBanned || currentUser.isCommunityBanned) {
      onShowToast(
        language === 'ar'
          ? 'تم تقييد حسابك من الرد في المجتمع. يمكنك التواصل مع الدعم الفني.'
          : 'Your account is restricted from replying in the community.',
        'error'
      );
      return;
    }

    const scrollY = captureScrollPosition();
    setIsSubmitting(true);

    const replyImages = mediaPayload?.images;
    const replyVideos = mediaPayload?.videos;
    const replyVideoUrl = mediaPayload?.videoUrl;
    let replyMediaType: 'none' | 'image' | 'video' | 'mixed' = 'none';
    if (replyImages && replyImages.length > 0 && ((replyVideos && replyVideos.length > 0) || replyVideoUrl)) {
      replyMediaType = 'mixed';
    } else if (replyImages && replyImages.length > 0) {
      replyMediaType = 'image';
    } else if ((replyVideos && replyVideos.length > 0) || replyVideoUrl) {
      replyMediaType = 'video';
    }

    // Generate optimistic reply record
    const tempId = `temp_reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const optimisticReply: CommunityPost = {
      id: tempId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar || DEFAULT_AVATAR_URL,
      content: trimmed,
      parentId,
      likesCount: 0,
      repliesCount: 0,
      isPinned: false,
      isLikedByMe: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      images: replyImages,
      videos: replyVideos,
      videoUrl: replyVideoUrl,
      mediaType: replyMediaType,
      replies: [],
    };

    // 1. Optimistic Targeted State Update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === parentId) {
          const currentReplies = post.replies || [];
          return {
            ...post,
            repliesCount: (post.repliesCount || 0) + 1,
            replies: [...currentReplies, optimisticReply],
          };
        }
        return post;
      })
    );

    // Clear input buffer without abrupt layout jump
    setReplyContent('');
    restoreScrollPosition(scrollY);

    // 2. Async Server Sync
    try {
      const savedReply = await CommunityService.createPost({
        user: currentUser,
        content: trimmed,
        parentId,
        images: replyImages,
        videos: replyVideos,
        videoUrl: replyVideoUrl,
        mediaType: replyMediaType,
      });

      // Replace optimistic placeholder with real persisted reply
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === parentId) {
            return {
              ...post,
              replies: (post.replies || []).map((r) => (r.id === tempId ? savedReply : r)),
            };
          }
          return post;
        })
      );

      onShowToast(language === 'ar' ? 'تمت إضافة ردك بنجاح' : 'Reply added successfully', 'success');
    } catch (err) {
      console.error('Failed to create reply:', err);
      // Revert optimistic addition safely
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === parentId) {
            return {
              ...post,
              repliesCount: Math.max(0, (post.repliesCount || 1) - 1),
              replies: (post.replies || []).filter((r) => r.id !== tempId),
            };
          }
          return post;
        })
      );
      // Restore user input so it is not lost
      setReplyContent(trimmed);
      onShowToast(language === 'ar' ? 'تعذر حفظ التعليق' : 'Failed to save comment', 'error');
    } finally {
      setIsSubmitting(false);
      restoreScrollPosition(scrollY);
    }
  };

  const handleCreateReply = handleAddComment;

  const handleTogglePinReply = async (postId: string, replyId: string, isPinned: boolean) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId && p.replies) {
          return {
            ...p,
            replies: p.replies.map((r) => ({
              ...r,
              isPinned: r.id === replyId ? isPinned : (isPinned ? false : r.isPinned),
            })),
          };
        }
        return p;
      })
    );

    try {
      await CommunityService.togglePinReply(postId, replyId, isPinned);
      onShowToast(
        isPinned
          ? (language === 'ar' ? 'تم تثبيت الرد بنجاح' : 'Reply pinned successfully')
          : (language === 'ar' ? 'تم إلغاء تثبيت الرد' : 'Reply unpinned successfully'),
        'success'
      );
    } catch (err) {
      console.error('Failed to toggle pin reply:', err);
      onShowToast(language === 'ar' ? 'تعذر تعديل التثبيت' : 'Failed to update pin', 'error');
    }
  };

  // Optimistic Toggle Like Handler
  const handleToggleLike = async (postId: string) => {
    if (isUnauthOrGuest) {
      onShowToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب للإعجاب بالمنشور'
          : 'Registration is required to like posts',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    if (!currentUser) {
      openAuthModal('signin');
      return;
    }

    if (currentUser.isBanned || currentUser.isCommunityBanned) {
      onShowToast(
        language === 'ar' ? 'حسابك مقيد من التفاعل في المجتمع' : 'Your account is restricted from interacting in the community',
        'error'
      );
      return;
    }

    const scrollY = captureScrollPosition();

    // Optimistic toggle in local state
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const wasLiked = !!post.isLikedByMe;
          return {
            ...post,
            isLikedByMe: !wasLiked,
            likesCount: wasLiked ? Math.max(0, (post.likesCount || 1) - 1) : (post.likesCount || 0) + 1,
          };
        }
        if (post.replies && post.replies.some((r) => r.id === postId)) {
          return {
            ...post,
            replies: post.replies.map((r) => {
              if (r.id === postId) {
                const wasLiked = !!r.isLikedByMe;
                return {
                  ...r,
                  isLikedByMe: !wasLiked,
                  likesCount: wasLiked ? Math.max(0, (r.likesCount || 1) - 1) : (r.likesCount || 0) + 1,
                };
              }
              return r;
            }),
          };
        }
        return post;
      })
    );

    restoreScrollPosition(scrollY);

    try {
      await CommunityService.toggleLike(postId, currentUser.id);
    } catch (err) {
      console.warn('Failed to sync like with backend:', err);
    } finally {
      restoreScrollPosition(scrollY);
    }
  };

  // Edit Handlers
  const handleStartEdit = (post: CommunityPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setEditVideoUrl(post.videoUrl || '');
    setShowEditVideoUrlBox(Boolean(post.videoUrl));
    const items: DraggableMediaItem[] = [];
    (post.images || []).forEach((img, idx) => {
      items.push({
        id: `edit-img-${idx}-${Date.now()}`,
        url: img,
        type: 'image',
      });
    });
    (post.videos || []).forEach((vid, idx) => {
      items.push({
        id: `edit-vid-${idx}-${Date.now()}`,
        url: vid,
        type: 'video',
      });
    });
    setEditMediaItems(items);
    setConfirmDeletePostId(null);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
    setEditMediaItems([]);
    setEditVideoUrl('');
    setShowEditVideoUrlBox(false);
  };

  // Optimistic Edit Comment / Post Handler
  const handleEditComment = async (
    postId: string,
    optionalNewContent?: string,
    mediaUpdates?: { images?: string[]; videos?: string[]; videoUrl?: string }
  ) => {
    const trimmed = (optionalNewContent !== undefined ? optionalNewContent : editContent).trim();
    if (!trimmed) return;

    // Strict Authorization & Ownership Check
    if (!currentUser || currentUser.isGuest || !currentUser.id) {
      onShowToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    // Locate the target post or comment
    let targetItem: CommunityPost | undefined;
    let previousContent = '';
    let previousImages = targetItem?.images;
    let previousVideos = targetItem?.videos;
    let previousVideoUrl = targetItem?.videoUrl;
    for (const post of posts) {
      if (post.id === postId) {
        targetItem = post;
        previousContent = post.content;
        previousImages = post.images;
        previousVideos = post.videos;
        previousVideoUrl = post.videoUrl;
        break;
      }
      const matchedReply = post.replies?.find((r) => r.id === postId);
      if (matchedReply) {
        targetItem = matchedReply;
        previousContent = matchedReply.content;
        break;
      }
    }

    if (!targetItem || targetItem.userId !== currentUser.id) {
      onShowToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    const scrollY = captureScrollPosition();
    setIsEditingSaving(true);

    const now = new Date().toISOString();

    const optimisticMedia = mediaUpdates
      ? {
          images: mediaUpdates.images !== undefined ? mediaUpdates.images : targetItem.images,
          videos: mediaUpdates.videos !== undefined ? mediaUpdates.videos : targetItem.videos,
          videoUrl: mediaUpdates.videoUrl !== undefined ? mediaUpdates.videoUrl : targetItem.videoUrl,
          mediaType:
            (mediaUpdates.videos && mediaUpdates.videos.length > 0) || mediaUpdates.videoUrl
              ? ('video' as const)
              : mediaUpdates.images && mediaUpdates.images.length > 0
              ? ('image' as const)
              : ('none' as const),
        }
      : {};

    // 1. Targeted Optimistic Update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            content: trimmed,
            ...optimisticMedia,
            isEdited: true,
            updatedAt: now,
          };
        }
        if (post.replies && post.replies.some((r) => r.id === postId)) {
          return {
            ...post,
            replies: post.replies.map((r) =>
              r.id === postId ? { ...r, content: trimmed, isEdited: true, updatedAt: now } : r
            ),
          };
        }
        return post;
      })
    );

    setEditingPostId(null);
    setEditContent('');
    setEditMediaItems([]);
    setEditVideoUrl('');
    setShowEditVideoUrlBox(false);
    restoreScrollPosition(scrollY);

    // 2. Async Server Sync
    try {
      const updated = await CommunityService.editPost(
        postId,
        trimmed,
        currentUser.id,
        currentUser.role === 'admin',
        mediaUpdates
      );
      if (updated) {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id === postId) return { ...post, ...updated };
            if (post.replies && post.replies.some((r) => r.id === postId)) {
              return {
                ...post,
                replies: post.replies.map((r) => (r.id === postId ? { ...r, ...updated } : r)),
              };
            }
            return post;
          })
        );
      }
      onShowToast(t('editSuccess'), 'success');
    } catch (err) {
      console.error('Failed to edit comment:', err);
      // Rollback to original content
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              content: previousContent,
              images: previousImages,
              videos: previousVideos,
              videoUrl: previousVideoUrl,
            };
          }
          if (post.replies && post.replies.some((r) => r.id === postId)) {
            return {
              ...post,
              replies: post.replies.map((r) =>
                r.id === postId ? { ...r, content: previousContent } : r
              ),
            };
          }
          return post;
        })
      );
      onShowToast(language === 'ar' ? 'تعذر حفظ التعليق' : 'Failed to save comment', 'error');
    } finally {
      setIsEditingSaving(false);
      restoreScrollPosition(scrollY);
    }
  };

  const handleSaveEdit = (postId: string) => {
    const postImages = editMediaItems.filter((m) => m.type === 'image').map((m) => m.url);
    const postVideos = editMediaItems.filter((m) => m.type === 'video').map((m) => m.url);
    handleEditComment(postId, editContent, {
      images: postImages,
      videos: postVideos,
      videoUrl: editVideoUrl.trim() || undefined,
    });
  };

  // Delete Confirmation Handlers
  const handleTriggerDelete = (postId: string) => {
    setConfirmDeletePostId(postId);
    setEditingPostId(null);
  };

  const handleCancelDelete = () => {
    setConfirmDeletePostId(null);
  };

  // Optimistic Delete Comment / Post Handler
  const handleDeleteComment = async (postId: string) => {
    // Strict Authorization & Ownership Check
    if (!currentUser || currentUser.isGuest || !currentUser.id) {
      onShowToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    // Locate the target post or comment
    let targetItem: CommunityPost | undefined;
    for (const post of posts) {
      if (post.id === postId) {
        targetItem = post;
        break;
      }
      const matchedReply = post.replies?.find((r) => r.id === postId);
      if (matchedReply) {
        targetItem = matchedReply;
        break;
      }
    }

    if (!targetItem || targetItem.userId !== currentUser.id) {
      onShowToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    const scrollY = captureScrollPosition();
    const previousPostsSnapshot = [...posts];

    // 1. Targeted Optimistic Removal
    setPosts((prevPosts) =>
      prevPosts
        .filter((post) => post.id !== postId)
        .map((post) => {
          if (post.replies && post.replies.some((r) => r.id === postId)) {
            return {
              ...post,
              repliesCount: Math.max(0, (post.repliesCount || 1) - 1),
              replies: post.replies.filter((r) => r.id !== postId),
            };
          }
          return post;
        })
    );

    setConfirmDeletePostId(null);
    restoreScrollPosition(scrollY);

    // 2. Async Server Sync
    try {
      const success = await CommunityService.deletePost(postId, currentUser.id);
      if (!success) {
        throw new Error('Delete returned unsuccessful status');
      }
      onShowToast(t('deleteSuccess'), 'info');
    } catch (err) {
      console.error('Failed to delete comment:', err);
      // Rollback
      setPosts(previousPostsSnapshot);
      onShowToast(language === 'ar' ? 'تعذر حذف التعليق' : 'Failed to delete comment', 'error');
    } finally {
      restoreScrollPosition(scrollY);
    }
  };

  const handleConfirmDelete = handleDeleteComment;

  const handleCopyAttachedPrompt = (prompt: Prompt) => {
    onCopyPrompt(prompt.prompt, prompt.id);
    setJustCopiedId(prompt.id);
    setTimeout(() => setJustCopiedId(null), 2000);
  };

  const handleOpenPromptFolder = (targetPromptId: string) => {
    if (!targetPromptId) {
      onShowToast(t('promptUnavailable'), 'error');
      return;
    }
    const allPrompts = StorageService.getPrompts();
    const prompt = prompts.find((p) => p.id === targetPromptId) || allPrompts.find((p) => p.id === targetPromptId);
    if (!prompt || prompt.status === 'inactive') {
      onShowToast(t('promptUnavailable'), 'error');
      return;
    }
    if (onOpenPromptDetail) {
      onOpenPromptDetail(targetPromptId);
    } else if (onNavigateToPrompt) {
      onNavigateToPrompt(targetPromptId);
    }
  };

  const handleNavigateToPrompt = (targetPromptId: string) => {
    if (!targetPromptId) {
      onShowToast(t('promptUnavailable'), 'error');
      return;
    }
    const allPrompts = StorageService.getPrompts();
    const prompt = prompts.find((p) => p.id === targetPromptId) || allPrompts.find((p) => p.id === targetPromptId);
    if (!prompt || prompt.status === 'inactive') {
      onShowToast(t('promptUnavailable'), 'error');
      return;
    }
    if (onNavigateToPrompt) {
      onNavigateToPrompt(targetPromptId);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    return formatTimeAgo(dateStr, language);
  };

  // Strict ownership check: ONLY the explicit creator/author can edit or delete their post/comment.
  // Global admin powers are isolated strictly to the /admin dashboard.
  const canManagePost = (post: CommunityPost) => {
    if (!currentUser || currentUser.isGuest || !currentUser.id) return false;
    return currentUser.id === post.userId;
  };

  // Smart contextual search filter across Post content, Usernames/@handles, Replies, and Attached Prompts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = matchesCommunitySearch(post, searchQuery, prompts);
    const matchesPrompt = selectedPromptId ? post.promptId === selectedPromptId : true;
    return matchesSearch && matchesPrompt;
  });

  // Sort posts: Pinned posts first, then strictly chronological by newest first
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0B101B] text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-28 pt-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Top Header Leaderboard Ad Banner (Community View) */}
        {Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true') &&
          Boolean(
            adsConfig?.slots?.headerBanner?.isEnabled === undefined ||
            adsConfig?.slots?.headerBanner?.isEnabled === true ||
            String(adsConfig?.slots?.headerBanner?.isEnabled) === 'true'
          ) && (
            <div className="mb-6 flex justify-center w-full h-fit">
              <AdBanner
                slot={adsConfig?.slots?.headerBanner || { id: 'headerBanner', isEnabled: true, codeSnippet: '' }}
                masterEnabled={Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true')}
                slotType="banner"
                className="w-full"
              />
            </div>
        )}

        {/* Notice if Community is Disabled by Admin */}
        {!siteSettings.communityEnabled && (
          <div className="mb-8 p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold">{t('communityDisabledTitle')}</h3>
                <p className="text-xs sm:text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  {t('communityDisabledDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero & New Post Header */}
        <div className="mb-8 p-6 sm:p-8 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200/80 dark:border-orange-500/20 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-500/20">
                <CommentBubbleIcon className="w-3.5 h-3.5" />
                <span>{t('communityBadge')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {t('communityTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                {t('communitySubtitle')}
              </p>
            </div>

            <button
              type="button"
              id="btn-community-new-post"
              onClick={() => {
                if (isUnauthOrGuest) {
                  onShowToast(
                    language === 'ar'
                      ? 'يلزم تسجيل الدخول أو إنشاء حساب لنشر منشور جديد في المجتمع'
                      : 'Registration is required to publish community posts',
                    'error'
                  );
                  openAuthModal('signin');
                  return;
                }
                setIsPostingOpen(!isPostingOpen);
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('communityNewPost')}</span>
            </button>
          </div>
        </div>

        {/* New Post Expansion Composer */}
        <AnimatePresence>
          {isPostingOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-8 overflow-hidden"
            >
              <form
                onSubmit={handleCreatePost}
                className="p-5 sm:p-6 bg-white dark:bg-[#182232] border-2 border-orange-500/40 rounded-3xl shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-[#2A384C] pb-3">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      user={currentUser || undefined}
                      size="sm"
                      showGlow={true}
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentUser?.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPostingOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={t('communityPostPlaceholder')}
                  rows={4}
                  className="w-full p-4 bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none"
                />

                {/* Media Attachment Toolbar & Previews (Respects Admin Flags) */}
                {communityMedia.masterEnabled && (communityMedia.enablePhotoUploads || communityMedia.enableVideoUploads) && (
                  <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-[#2A384C]/60">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Photo Upload Button */}
                        {communityMedia.enablePhotoUploads && (
                          <>
                            <input
                              type="file"
                              ref={postImageInputRef}
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handlePostImageSelect}
                            />
                            <button
                              type="button"
                              onClick={() => postImageInputRef.current?.click()}
                              disabled={isProcessingMedia || attachedImages.length >= (communityMedia.maxPhotosCount || 4)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#121824] hover:bg-orange-500/10 hover:text-orange-500 dark:hover:bg-orange-500/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer disabled:opacity-40"
                              title={language === 'ar' ? `رفع صور (حد أقصى ${communityMedia.maxPhotosCount || 4}، ${communityMedia.maxPhotoSizeMB}MB)` : `Attach Photos (Max ${communityMedia.maxPhotosCount || 4}, ${communityMedia.maxPhotoSizeMB}MB)`}
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                              <span>{language === 'ar' ? 'صورة' : 'Photo'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({attachedImages.length}/{communityMedia.maxPhotosCount || 4})
                              </span>
                            </button>
                          </>
                        )}

                        {/* Video Upload Button */}
                        {communityMedia.enableVideoUploads && (
                          <>
                            <input
                              type="file"
                              ref={postVideoInputRef}
                              accept="video/*"
                              className="hidden"
                              onChange={handlePostVideoSelect}
                            />
                            <button
                              type="button"
                              onClick={() => postVideoInputRef.current?.click()}
                              disabled={isProcessingMedia || attachedVideos.length > 0}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#121824] hover:bg-orange-500/10 hover:text-orange-500 dark:hover:bg-orange-500/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer disabled:opacity-40"
                              title={language === 'ar' ? `رفع فيديو (${communityMedia.maxVideoSizeMB}MB، أقصى مدة ${communityMedia.maxVideoDurationSec} ثانية)` : `Attach Video (${communityMedia.maxVideoSizeMB}MB, max ${communityMedia.maxVideoDurationSec}s)`}
                            >
                              <VideoIcon className="w-3.5 h-3.5 text-orange-500" />
                              <span>{language === 'ar' ? 'فيديو' : 'Video'}</span>
                            </button>

                            {/* Video URL Link Toggle */}
                            <button
                              type="button"
                              onClick={() => setShowVideoUrlBox(!showVideoUrlBox)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                                showVideoUrlBox || videoUrlInput
                                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                                  : 'bg-slate-100 dark:bg-[#121824] border-slate-200 dark:border-[#2A384C] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                              }`}
                              title={language === 'ar' ? 'رابط يوتيوب أو فيديو خارجي' : 'External Video URL'}
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span className="text-[11px]">{language === 'ar' ? 'رابط فيديو' : 'Video URL'}</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Constraints Hint */}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {communityMedia.enablePhotoUploads && `صور: ${communityMedia.maxPhotoSizeMB}MB `}
                        {communityMedia.enableVideoUploads && `| فيديو: ${communityMedia.maxVideoDurationSec}s`}
                      </span>
                    </div>

                    {/* Video URL Input Field */}
                    {showVideoUrlBox && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="url"
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          placeholder={language === 'ar' ? 'الصق رابط فيديو (YouTube, Vimeo, MP4)...' : 'Paste video URL (YouTube, Vimeo, MP4)...'}
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                        {videoUrlInput && (
                          <button
                            type="button"
                            onClick={handleRemoveVideoUrl}
                            className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Media Error Message */}
                    {mediaError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{mediaError}</span>
                      </div>
                    )}

                    {/* Previews of Attached Media with Drag & Drop Reordering */}
                    {(composerMediaItems.length > 0 || videoUrlInput) && (
                      <div className="space-y-2 pt-1">
                        {composerMediaItems.length > 0 && (
                          <DraggableMediaReorder
                            items={composerMediaItems}
                            onReorder={handleComposerReorder}
                            onRemove={handleComposerRemove}
                          />
                        )}

                        {/* Video URL Preview */}
                        {videoUrlInput && !attachedVideos.length && (
                          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#121824] rounded-xl border border-slate-200 dark:border-[#2A384C] text-xs">
                            <span className="truncate text-slate-600 dark:text-slate-300 max-w-[80%] font-mono text-[11px]">
                              {videoUrlInput}
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveVideoUrl}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Prompt Attachment Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>{language === 'ar' ? 'إرفاق برومبت من المكتبة (اختياري):' : 'Attach Prompt (Optional):'}</span>
                  </label>
                  <select
                    value={attachedPromptId}
                    onChange={(e) => setAttachedPromptId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 truncate"
                  >
                    <option value="">{language === 'ar' ? '-- بدون إرفاق برومبت --' : '-- No attached prompt --'}</option>
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.targetModel})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPostingOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#121824] transition-colors cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!newPostContent.trim() || isSubmitting}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/25 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('communityPublishButton')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter & Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
          {/* Standalone Search Bar (Mobile only, unified desktop Navbar handles md+) */}
          <div className="relative flex-1 w-full md:hidden">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'ابحث في منشورات المجتمع، المبدعين...'
                  : 'Search community posts, creators...'
              }
              className="w-full ps-10 pe-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="w-full sm:w-auto md:ms-auto flex items-center gap-2">
            <select
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="">{language === 'ar' ? 'جميع النقاشات' : 'All Discussions'}</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Posts Stream */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">{language === 'ar' ? 'جاري تحميل مشاركات المجتمع...' : 'Loading community posts...'}</p>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="py-16 text-center p-8 bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-[#2A384C]">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <CommentBubbleIcon className="w-8 h-8" />
            </div>
            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
              {language === 'ar' ? 'لا توجد مشاركات تطابق بحثك حالياً' : 'No posts match your filter'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'ar'
                ? 'كن أول من يبدأ نقاشاً جديداً أو يشارك برومبت مفضل مع المجتمع!'
                : 'Start the conversation and share your vibe coding journey!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {(() => {
              // 1. Collect all active, non-dismissed community ad slots in numerical order
              const activeCommSlots: { slotId: string; slotIndex: number; config: any }[] = [];
              const isMaster = Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true');
              const isCommFeedEnabled = adsConfig?.communityFeedEnabled === undefined || adsConfig?.communityFeedEnabled === true || String(adsConfig?.communityFeedEnabled) === 'true';

              if (isMaster && isCommFeedEnabled) {
                const commSlots = adsConfig?.communitySlots || {};
                const isAdmin = StorageService.isLoggedIn();
                for (let i = 0; i < 10; i++) {
                  const slotId = `comm_feed_ad_${i}`;
                  const slot = commSlots[slotId] || {
                    id: slotId,
                    enabled: true,
                    ctaUrl: adsConfig?.communityFeedCtaUrl || 'https://example.com',
                    snippet: adsConfig?.communityFeedSnippet || '',
                  };
                  const isSlotActive = (slot.enabled === undefined && slot.isEnabled === undefined)
                    ? true
                    : Boolean(slot.enabled === true || String(slot.enabled) === 'true' || slot.isEnabled === true || String(slot.isEnabled) === 'true');

                  if (isSlotActive && (isAdmin || !dismissedFeedAds.has(slotId))) {
                    activeCommSlots.push({
                      slotId,
                      slotIndex: i,
                      config: slot,
                    });
                  }
                }
              }

              const commFrequency = Math.max(2, Math.min(15, adsConfig?.communityAdFrequency || 5));

              return sortedPosts.map((post, postIndex) => {
                const attachedPrompt = prompts.find((p) => p.id === post.promptId) || (post.promptId ? StorageService.getPrompts().find((p) => p.id === post.promptId) : undefined);
                const isEditingThisPost = editingPostId === post.id;
                const isConfirmingDeleteThisPost = confirmDeletePostId === post.id;

                // 2. Select specific active slot for this interval position (rotates continuously through active slots)
                let slotToRender: { slotId: string; slotIndex: number; config: any } | null = null;
                if (activeCommSlots.length > 0) {
                  if ((postIndex + 1) % commFrequency === 0) {
                    const slotPosition = Math.floor((postIndex + 1) / commFrequency) - 1;
                    if (slotPosition >= 0) {
                      slotToRender = activeCommSlots[slotPosition % activeCommSlots.length];
                    }
                  } else if (sortedPosts.length < commFrequency && postIndex === sortedPosts.length - 1) {
                    slotToRender = activeCommSlots[0];
                  }
                }

                return (
                  <React.Fragment key={post.id}>
                    <motion.div
                      key={post.id}
                  id={`post-card-${post.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-5 sm:p-6 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-3xl shadow-sm space-y-4 max-w-full overflow-hidden break-words"
                >
                  {/* Top Author Meta */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserAvatar
                        avatar={post.userAvatar}
                        name={post.userName}
                        isGuest={post.isGuest}
                        size="md"
                        showGlow={true}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TranslatableAuthorName
                            name={post.userName}
                            userId={post.userId}
                            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] sm:max-w-xs"
                          />
                          {post.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                              <Pin className="w-2.5 h-2.5" />
                              <span>{t('pinnedBadge')}</span>
                            </span>
                          )}
                          {(post.isSponsored || post.isPromoted) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{t('sponsored')}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeTime(post.createdAt)}</span>
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
                      </div>
                    </div>

                    {/* Post 3-Dots Kebab Menu (Management & Report) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202c3e] rounded-lg transition-colors cursor-pointer"
                        title={language === 'ar' ? 'خيارات' : 'Options'}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === post.id && (
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
                              {/* Author Options: Edit & Delete */}
                              {canManagePost(post) && (
                                <div className="py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleStartEdit(post);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#253348] text-start transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                    <span>{t('actions.edit')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleTriggerDelete(post.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>{t('actions.delete')}</span>
                                  </button>
                                </div>
                              )}

                              {/* Copy Post Link Option */}
                              <div className="py-0.5 border-b border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    const url = getPostUrl(post.id);
                                    const ok = await copyTextToClipboard(url);
                                    if (ok) {
                                      onShowToast(
                                        t('actions.linkCopied') || (language === 'ar'
                                          ? 'تم نسخ رابط المنشور بنجاح!'
                                          : 'Post link copied to clipboard!'),
                                        'success'
                                      );
                                    }
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                  <span>{t('actions.copyLink')}</span>
                                </button>
                              </div>

                              {/* Universal Report Option */}
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
                                      targetType: 'post',
                                      targetId: post.id,
                                      targetTitle: post.promptTitle || post.content.substring(0, 60),
                                      targetContent: post.content,
                                      reportedUserId: post.userId,
                                      reportedUserName: post.userName,
                                      reportedUserEmail: post.userEmail,
                                      contentUrl: getPostUrl(post.id),
                                    });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                                >
                                  <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span>{t('actions.report')}</span>
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* In-place Delete Confirmation Box */}
                  {isConfirmingDeleteThisPost && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2.5 max-w-full overflow-hidden">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span>{t('deleteConfirmQuestion')}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1f2b3e] transition-colors cursor-pointer"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(post.id)}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('confirmDelete')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Post Content or In-place Editor */}
                  {isEditingThisPost ? (
                    <div className="space-y-2 pt-1 max-w-full overflow-hidden">
                      <textarea
                        ref={(el) => {
                          if (el) el.focus({ preventScroll: true });
                        }}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full p-3 text-xs sm:text-sm bg-slate-50 dark:bg-[#121824] border border-orange-400 dark:border-orange-500/50 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        placeholder={t('commentPlaceholder')}
                      />

                      {/* Reorderable Media Attachments in Edit Mode (Delete-Only Mode) */}
                      {editMediaItems.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">
                              {language === 'ar'
                                ? `الوسائط المرفقة (${editMediaItems.length}) - وضع الحذف فقط`
                                : `Attached Media (${editMediaItems.length}) - Delete-only`}
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium border border-amber-500/20">
                              {language === 'ar' ? 'حذف فقط' : 'Delete only'}
                            </span>
                          </div>
                          <DraggableMediaReorder
                            items={editMediaItems}
                            onReorder={setEditMediaItems}
                            onRemove={(idx) => setEditMediaItems((prev) => prev.filter((_, i) => i !== idx))}
                          />
                        </div>
                      )}

                      {/* Edit Toolbar & Actions (Delete-only mode: No new file uploads allowed) */}
                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <span className="text-[11px] text-slate-400 italic">
                          {language === 'ar'
                            ? 'لا يُسمح بإضافة وسائط جديدة أثناء التعديل'
                            : 'Adding new media is disabled in edit mode'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1f2b3e] cursor-pointer"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(post.id)}
                            disabled={!editContent.trim() || isEditingSaving}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('confirmEdit')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <TranslatableContent
                      content={post.content}
                      renderFormatted={renderContentWithMentions}
                      className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words max-w-full overflow-hidden"
                    />
                  )}

                  {/* Attached Post Media (Photos, HTML5 Videos, and Video Links) - only shown when not editing */}
                  {((post.images && post.images.length > 0) || (post.videos && post.videos.length > 0) || post.videoUrl) && !isEditingThisPost && (
                    <MediaGrid
                      images={post.images}
                      videos={post.videos}
                      videoUrl={post.videoUrl}
                      title={post.promptTitle || post.userName}
                      author={post.userName}
                    />
                  )}

                  {/* Attached Prompt Card & Single Custom Link Above Prompt Box */}
                  {(attachedPrompt || post.promptId) && (
                    <div className="space-y-1.5 pt-1 max-w-full overflow-hidden">
                      {/* Single subtle orange text link directly ABOVE the embedded prompt box */}
                      <div className="flex items-center justify-start">
                        <button
                          type="button"
                          id={`link-open-prompt-folder-${post.id}`}
                          onClick={() => handleOpenPromptFolder(post.promptId || (attachedPrompt && attachedPrompt.id) || '')}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors cursor-pointer group/link"
                          title={t('openPromptFolder')}
                        >
                          <span>{t('openPromptFolder')}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 rtl:rotate-270 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 rtl:group-hover/link:-translate-x-0.5 transition-transform" />
                        </button>
                      </div>

                      {attachedPrompt ? (
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#121824] border border-orange-200/60 dark:border-orange-500/20 space-y-2.5 max-w-full overflow-hidden">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="p-1 rounded bg-orange-500/10 text-orange-600 shrink-0">
                                <Code2 className="w-3.5 h-3.5" />
                              </span>
                              <TranslatableContent
                                content={attachedPrompt.title}
                                as="span"
                                className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex-1 min-w-0 overflow-hidden text-ellipsis"
                                id={`feed-attached-prompt-title-${attachedPrompt.id}`}
                              />
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] font-mono text-[10px] text-slate-600 dark:text-slate-300 shrink-0 max-w-[100px] sm:max-w-[140px] truncate">
                              {attachedPrompt.targetModel}
                            </span>
                          </div>

                          <div className="p-2.5 bg-white dark:bg-[#182232] rounded-xl border border-slate-200 dark:border-[#2A384C] text-[11px] font-mono text-slate-700 dark:text-slate-300 line-clamp-2 overflow-hidden text-ellipsis break-words max-w-full">
                            {attachedPrompt.prompt}
                          </div>

                          {/* Embedded Prompt Image Rendering (Middle of Attached Prompt Card) */}
                          {attachedPrompt.imageUrl && (
                            <div className="pt-1">
                              <MediaGrid
                                images={[attachedPrompt.imageUrl]}
                                title={attachedPrompt.title}
                                author={attachedPrompt.author}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-xs">
                              {attachedPrompt.author && attachedPrompt.author !== 'anonymous'
                                ? (language === 'ar' ? `بواسطة: ${attachedPrompt.author}` : `By: ${attachedPrompt.author}`)
                                : (language === 'ar' ? 'جاهز للاستخدام' : 'Ready to use')}
                            </span>

                            {/* Copy Prompt Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyAttachedPrompt(attachedPrompt)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                justCopiedId === attachedPrompt.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-[#182232] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2A384C]'
                              }`}
                            >
                              {justCopiedId === attachedPrompt.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>{language === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>{t('copyPrompt')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#121824]/60 border border-dashed border-slate-200 dark:border-[#2A384C] flex items-center justify-between gap-2 text-xs text-slate-400 max-w-full overflow-hidden">
                          <span className="italic truncate min-w-0 flex-1 overflow-hidden text-ellipsis">{post.promptTitle || t('communityAttachedPrompt')}</span>
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                            {t('promptUnavailable')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions (Like & Reply Buttons) */}
                  <div className="flex items-center gap-6 pt-2 border-t border-slate-100 dark:border-[#2A384C] text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                        post.isLikedByMe
                          ? 'text-rose-500 scale-105'
                          : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.isLikedByMe ? 'fill-current' : ''}`} />
                      <span>
                        {post.likesCount || 0} {t('likes')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRepliesModal(post.id)}
                      className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{language === 'ar' ? 'عرض الردود' : 'Replies'}</span>
                      {post.replies && post.replies.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold">
                          {post.replies.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isUnauthOrGuest) {
                          onShowToast(
                            language === 'ar'
                              ? 'يلزم تسجيل الدخول أو إنشاء حساب للرد على المنشور'
                              : 'Registration is required to reply to community posts',
                            'error'
                          );
                          openAuthModal('signin');
                          return;
                        }
                        setActiveReplyPostId(activeReplyPostId === post.id ? null : post.id);
                        setReplyContent('');
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                      <span>{language === 'ar' ? 'رد سريع' : 'Quick reply'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const url = getPostUrl(post.id);
                        const ok = await copyTextToClipboard(url);
                        if (ok) {
                          onShowToast(
                            language === 'ar'
                              ? 'تم نسخ رابط المنشور بنجاح!'
                              : 'Post link copied to clipboard!',
                            'success'
                          );
                        }
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors cursor-pointer ms-auto"
                      title={language === 'ar' ? 'نسخ رابط المنشور' : 'Copy post link'}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{language === 'ar' ? 'مشاركة' : 'Share'}</span>
                    </button>
                  </div>

                  {/* Reply Input Box */}
                  {activeReplyPostId === post.id && (
                    <div className="pt-2 relative">
                      {/* Smart Floating @Mention Autocomplete Dropdown */}
                      <MentionDropdown
                        isOpen={mentionQuery !== null}
                        query={mentionQuery || ''}
                        postAuthor={{ name: post.userName, avatar: post.userAvatar }}
                        threadUsers={(post.replies || []).map((r) => ({
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
                        position="bottom"
                        highlightedIndex={mentionHighlightedIndex}
                      />

                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#121824] border border-orange-300 dark:border-orange-500/40 rounded-2xl p-2 shadow-xs">
                        <input
                          ref={(el) => {
                            if (el) el.focus({ preventScroll: true });
                          }}
                          type="text"
                          value={replyContent}
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
                          placeholder={t('replyPlaceholder')}
                          className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                          onKeyDown={(e) => {
                            // Compute current filtered list of suggestions for keyboard selection
                            const postAuthor = { name: post.userName, avatar: post.userAvatar };
                            const threadUsers = (post.replies || []).map((r) => ({ name: r.userName, avatar: r.userAvatar }));
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
                            const filtered = cleanQ ? allSuggestions.filter((item) => item.name.toLowerCase().includes(cleanQ)) : allSuggestions;

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
                              handleCreateReply(post.id);
                            }
                          }}
                        />

                        {/* Action Row: Bold rounded rectangular Cancel button alongside Orange Submit button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyPostId(null);
                              setReplyContent('');
                            }}
                            className="px-3 py-1.5 bg-transparent border border-slate-300 dark:border-white/30 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isUnauthOrGuest) {
                                onShowToast(
                                  language === 'ar'
                                    ? 'يلزم تسجيل الدخول أو إنشاء حساب لإرسال الرد'
                                    : 'Registration is required to reply to community posts',
                                  'error'
                                );
                                openAuthModal('signin');
                                return;
                              }
                              handleCreateReply(post.id);
                            }}
                            disabled={(!replyContent.trim() && !isUnauthOrGuest) || isSubmitting}
                            className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'إرسال' : 'Reply'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single-Line Comment Preview & Single Comment Enforcement */}
                  {(() => {
                    if (!post.replies || post.replies.length === 0) return null;
                    const activeReplies = post.replies.filter((r) => r.status !== 'deleted');
                    if (activeReplies.length === 0) return null;

                    // Prioritize Pinned comment by author, or secondarily the comment with highest likes
                    const topReply =
                      activeReplies.find((r) => r.isPinned) ||
                      [...activeReplies].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))[0];

                    if (!topReply) return null;

                    const totalRepliesCount = post.repliesCount || activeReplies.length;

                    return (
                      <div className="pt-2 ps-3 sm:ps-6 border-s-2 border-orange-500/30 dark:border-orange-500/20">
                        <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/90 dark:bg-[#121824]/90 border border-slate-200/70 dark:border-[#2A384C] flex items-center gap-2.5 sm:gap-3 max-w-full overflow-hidden">
                          {/* Commenter Avatar with Like Button & Count directly underneath */}
                          <div className="flex flex-col items-center justify-center shrink-0 gap-0.5 min-w-[32px]">
                            <UserAvatar
                              avatar={topReply.userAvatar}
                              name={topReply.userName}
                              isGuest={topReply.isGuest}
                              size="xs"
                              showGlow={false}
                            />
                            {/* Repositioned Likes Button & Count directly underneath the avatar image */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLike(topReply.id);
                              }}
                              aria-label={language === 'ar' ? 'إعجاب بالتعليق' : 'Like comment'}
                              className={`inline-flex items-center gap-0.5 text-[10px] font-bold cursor-pointer transition-colors pt-0.5 ${
                                topReply.isLikedByMe ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                              }`}
                            >
                              <Heart className={`w-2.5 h-2.5 ${topReply.isLikedByMe ? 'fill-current' : ''}`} />
                              <span>{topReply.likesCount || 0}</span>
                            </button>
                          </div>

                          {/* Comment Single-Line Content Column */}
                          <div
                            onClick={() => handleOpenRepliesModal(post.id)}
                            className="min-w-0 flex-1 cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-xs group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {topReply.userName}
                              </span>
                              {topReply.isPinned && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                  <Pin className="w-2 h-2" />
                                  <span>{t('pinnedBadge')}</span>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatRelativeTime(topReply.createdAt)}
                              </span>
                              {(topReply.isEdited || (topReply.updatedAt && topReply.createdAt && new Date(topReply.updatedAt).getTime() > new Date(topReply.createdAt).getTime() + 1000)) && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
                                  title={language === 'ar' ? 'تم تعديل هذا الرد' : 'This reply was edited'}
                                >
                                  {language === 'ar' ? 'مُعَدَّل' : (t('edited') || 'Edited')}
                                </span>
                              )}
                            </div>

                            {/* Strictly 1 Line Preview Text with Truncation */}
                            <div
                              className="text-xs text-slate-600 dark:text-slate-300 truncate line-clamp-1 max-w-full font-normal group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors"
                              title={topReply.content}
                            >
                              {topReply.content}
                            </div>
                          </div>

                          {/* View All Replies Modal Trigger */}
                          {totalRepliesCount > 1 && (
                            <button
                              type="button"
                              onClick={() => handleOpenRepliesModal(post.id)}
                              className="shrink-0 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline px-2 py-1 cursor-pointer bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-200/60 dark:border-orange-500/20"
                            >
                              {language === 'ar' ? `+${totalRepliesCount - 1} ردود` : `+${totalRepliesCount - 1} more`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
                {slotToRender && (
                  <NativeFeedAdCard
                    key={slotToRender.slotId}
                    adSlotId={slotToRender.slotId}
                    slotIndex={slotToRender.slotIndex}
                    slotConfig={slotToRender.config}
                    masterEnabled={Boolean(adsConfig?.masterEnabled === true || String(adsConfig?.masterEnabled) === 'true')}
                    onDismiss={handleDismissFeedAd}
                    onAdClick={() => setAdsConfig(StorageService.getAdsConfig())}
                    feedType="community"
                  />
                )}
              </React.Fragment>
            );
          });
        })()}
          </div>
        )}
      </div>

      {/* Dedicated Post Replies Modal */}
      {repliesModalPostId && (
        <PostRepliesModal
          isOpen={Boolean(repliesModalPostId)}
          onClose={handleCloseRepliesModal}
          post={posts.find((p) => p.id === repliesModalPostId) || null}
          currentUser={currentUser}
          siteSettings={siteSettings}
          onToggleLike={handleToggleLike}
          onCreateReply={async (postId, content, mediaPayload) => {
            await handleAddComment(postId, content, mediaPayload);
          }}
          onTogglePinReply={handleTogglePinReply}
          onDeleteReply={async (_postId, replyId) => {
            await handleDeleteComment(replyId);
          }}
          onEditReply={async (_postId, replyId, content) => {
            await handleEditComment(replyId, content);
          }}
          onOpenAuth={() => {
            openAuthModal('signin');
          }}
        />
      )}

    </div>
  );
};
