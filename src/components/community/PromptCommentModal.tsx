import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  Heart,
  CornerDownLeft,
  User,
  Cpu,
  Bookmark,
  Clock,
  Pin,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  MoreVertical,
  Flag,
} from 'lucide-react';
import { Prompt, CommunityPost, CommunityUser, Category } from '../../types';
import { CommunityService } from '../../services/communityService';
import { AuthService } from '../../services/authService';
import { useApp } from '../../context/AppContext';
import { useReportModal } from '../../context/ReportModalContext';
import { useGuestRestriction } from '../../context/GuestRestrictionContext';
import { CommentBubbleIcon } from '../CommentBubbleIcon';
import { formatTimeAgo } from '../../utils/dateUtils';
import { isAdminUser, DEFAULT_AVATAR_URL } from '../../utils/authUtils';
import { MentionDropdown, renderContentWithMentions, MentionUser } from './MentionDropdown';
import { UserAvatar } from '../UserAvatar';
import { TranslatableContent } from '../TranslatableContent';
import { TranslatableAuthorName } from '../TranslatableAuthorName';

interface PromptCommentModalProps {
  isOpen: boolean;
  prompt: Prompt | null;
  category?: Category;
  onClose: () => void;
  onPostCreated?: () => void;
}

export const PromptCommentModal: React.FC<PromptCommentModalProps> = ({
  isOpen,
  prompt,
  category,
  onClose,
  onPostCreated,
}) => {
  const { t, language } = useApp();
  const { openReportModal } = useReportModal();
  const { isGuest, openAuthModal } = useGuestRestriction();
  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(() => AuthService.getCurrentUser());
  const isUnauthOrGuest = !currentUser || Boolean(currentUser.isGuest) || isGuest;
  const [comments, setComments] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionHighlightedIndex, setMentionHighlightedIndex] = useState<number>(0);

  // Edit State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // Delete Confirmation State
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Kebab 3-dots Dropdown State (Author only)
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);

  // Scroll Container Ref to maintain exact scroll position
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const captureScrollPosition = () => {
    return commentsContainerRef.current ? commentsContainerRef.current.scrollTop : 0;
  };

  const restoreScrollPosition = (scrollTop: number) => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop = scrollTop;
    }
    requestAnimationFrame(() => {
      if (commentsContainerRef.current) {
        commentsContainerRef.current.scrollTop = scrollTop;
      }
    });
  };

  const showDiscreetToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToastNotice({ message, type });
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Listen to auth changes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setCurrentUser(e.detail);
    };
    window.addEventListener('prombo_auth_change', handleAuthChange);
    return () => window.removeEventListener('prombo_auth_change', handleAuthChange);
  }, []);

  // Fetch comments for this specific prompt
  useEffect(() => {
    if (!isOpen || !prompt) return;
    loadComments();
  }, [isOpen, prompt?.id]);

  const loadComments = async () => {
    if (!prompt) return;
    if (comments.length === 0) {
      setIsLoading(true);
    }
    try {
      const fetched = await CommunityService.getPosts({ promptId: prompt.id });
      setComments(fetched);
    } catch (err) {
      console.warn('Error fetching prompt comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimistic Add Comment (Top Level)
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce strict Guest/Unauthenticated User Restriction
    if (isUnauthOrGuest) {
      showDiscreetToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة تعليق'
          : 'Registration is required to post comments',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    // Enforce strict ban restrictions
    if (currentUser?.isBanned || currentUser?.isCommunityBanned) {
      showDiscreetToast(
        language === 'ar'
          ? 'تم تقييد حسابك من قبل الإدارة. لا يمكنك كتابة تعليقات.'
          : 'Your account has been restricted by administration. You cannot post comments.',
        'error'
      );
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    if (!currentUser) {
      openAuthModal('signin');
      return;
    }

    const scrollPos = captureScrollPosition();
    setIsSubmitting(true);

    const tempId = `temp_c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const optimisticComment: CommunityPost = {
      id: tempId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar || DEFAULT_AVATAR_URL,
      promptId: prompt.id,
      promptTitle: prompt.title,
      promptCategory: prompt.categoryId,
      promptModel: prompt.targetModel,
      content: trimmed,
      parentId: null,
      likesCount: 0,
      repliesCount: 0,
      isPinned: false,
      isLikedByMe: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      replies: [],
    };

    // 1. Optimistic Targeted State Insertion
    setComments((prev) => [optimisticComment, ...prev]);
    setCommentText('');
    restoreScrollPosition(scrollPos);

    // 2. Server Sync
    try {
      const saved = await CommunityService.createPost({
        user: currentUser,
        content: trimmed,
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptCategory: prompt.categoryId,
        promptModel: prompt.targetModel,
      });

      // Replace optimistic comment with saved data
      setComments((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error('Failed to create comment:', err);
      // Revert optimistic addition
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCommentText(trimmed);
      showDiscreetToast(language === 'ar' ? 'تعذر حفظ التعليق' : 'Failed to save comment', 'error');
    } finally {
      setIsSubmitting(false);
      restoreScrollPosition(scrollPos);
    }
  };

  // Optimistic Add Reply / Comment
  const handleSendReply = async (parentId: string, optionalText?: string) => {
    // Enforce strict Guest/Unauthenticated User Restriction
    if (isUnauthOrGuest) {
      showDiscreetToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة رد'
          : 'Registration is required to post replies',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    // Enforce strict ban restrictions
    if (currentUser?.isBanned || currentUser?.isCommunityBanned) {
      showDiscreetToast(
        language === 'ar'
          ? 'تم تقييد حسابك من قبل الإدارة. لا يمكنك كتابة ردود.'
          : 'Your account has been restricted by administration. You cannot post replies.',
        'error'
      );
      return;
    }

    const trimmed = (optionalText !== undefined ? optionalText : replyText).trim();
    if (!trimmed) return;

    if (!currentUser) {
      openAuthModal('signin');
      return;
    }

    const scrollPos = captureScrollPosition();
    setIsSubmitting(true);

    const tempId = `temp_rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const optimisticReply: CommunityPost = {
      id: tempId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatar || DEFAULT_AVATAR_URL,
      promptId: prompt.id,
      content: trimmed,
      parentId,
      likesCount: 0,
      repliesCount: 0,
      isPinned: false,
      isLikedByMe: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      replies: [],
    };

    // 1. Optimistic Targeted Append
    setComments((prev) =>
      prev.map((post) => {
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

    setReplyText('');
    setReplyingToId(null);
    restoreScrollPosition(scrollPos);

    // 2. Server Sync
    try {
      const savedReply = await CommunityService.createPost({
        user: currentUser,
        content: trimmed,
        promptId: prompt.id,
        parentId,
      });

      // Replace optimistic placeholder with real record
      setComments((prev) =>
        prev.map((post) => {
          if (post.id === parentId) {
            return {
              ...post,
              replies: (post.replies || []).map((r) => (r.id === tempId ? savedReply : r)),
            };
          }
          return post;
        })
      );
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error('Failed to create reply:', err);
      // Revert optimistic reply
      setComments((prev) =>
        prev.map((post) => {
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
      setReplyText(trimmed);
      setReplyingToId(parentId);
      showDiscreetToast(language === 'ar' ? 'تعذر حفظ التعليق' : 'Failed to save comment', 'error');
    } finally {
      setIsSubmitting(false);
      restoreScrollPosition(scrollPos);
    }
  };

  const handleAddComment = handleSendReply;

  // Optimistic Toggle Like
  const handleToggleLike = async (postId: string) => {
    if (isUnauthOrGuest) {
      showDiscreetToast(
        language === 'ar'
          ? 'يلزم تسجيل الدخول أو إنشاء حساب للإعجاب بالتعليقات'
          : 'Registration is required to like comments',
        'error'
      );
      openAuthModal('signin');
      return;
    }

    if (currentUser?.isBanned) {
      showDiscreetToast(
        language === 'ar'
          ? 'تم تقييد حسابك من قبل الإدارة. لا يمكنك التفاعل مع التعليقات.'
          : 'Your account has been restricted by administration.',
        'error'
      );
      return;
    }

    const scrollPos = captureScrollPosition();

    // Optimistic toggle in local state
    setComments((prev) =>
      prev.map((post) => {
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

    restoreScrollPosition(scrollPos);

    try {
      await CommunityService.toggleLike(postId, currentUser.id);
    } catch (err) {
      console.warn('Failed to toggle like on comment:', err);
    } finally {
      restoreScrollPosition(scrollPos);
    }
  };

  // Start Editing
  const handleStartEdit = (post: CommunityPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setConfirmDeletePostId(null);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
  };

  // Optimistic Edit Comment
  const handleSaveEdit = async (postId: string, optionalNewContent?: string) => {
    const trimmed = (optionalNewContent !== undefined ? optionalNewContent : editContent).trim();
    if (!trimmed) return;

    // Strict Authorization & Ownership Check
    if (!currentUser || currentUser.isGuest || !currentUser.id) {
      showDiscreetToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    // Capture previous content for rollback & verify ownership
    let targetItem: CommunityPost | undefined;
    let previousContent = '';
    for (const post of comments) {
      if (post.id === postId) {
        targetItem = post;
        previousContent = post.content;
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
      showDiscreetToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    const scrollPos = captureScrollPosition();
    setIsEditingSaving(true);

    const now = new Date().toISOString();

    // 1. Optimistic Targeted Content Update
    setComments((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            content: trimmed,
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
    restoreScrollPosition(scrollPos);

    // 2. Server Sync
    try {
      const updated = await CommunityService.editPost(postId, trimmed, currentUser.id);
      if (updated) {
        setComments((prev) =>
          prev.map((post) => {
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
    } catch (err) {
      console.error('Failed to edit comment:', err);
      // Revert content
      setComments((prev) =>
        prev.map((post) => {
          if (post.id === postId) return { ...post, content: previousContent };
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
      showDiscreetToast(language === 'ar' ? 'تعذر حفظ التعليق' : 'Failed to save comment', 'error');
    } finally {
      setIsEditingSaving(false);
      restoreScrollPosition(scrollPos);
    }
  };

  const handleEditComment = handleSaveEdit;

  // Start Deleting with Confirmation
  const handleTriggerDelete = (postId: string) => {
    setConfirmDeletePostId(postId);
    setEditingPostId(null);
  };

  const handleCancelDelete = () => {
    setConfirmDeletePostId(null);
  };

  // Optimistic Delete Comment
  const handleConfirmDelete = async (postId: string) => {
    // Strict Authorization & Ownership Check
    if (!currentUser || currentUser.isGuest || !currentUser.id) {
      showDiscreetToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    let targetItem: CommunityPost | undefined;
    for (const post of comments) {
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
      showDiscreetToast(
        language === 'ar' ? 'غير مصرح لك بإجراء هذا التعديل' : 'You are not authorized to perform this modification',
        'error'
      );
      return;
    }

    const scrollPos = captureScrollPosition();
    const previousCommentsSnapshot = [...comments];

    // 1. Optimistic Targeted Deletion
    setComments((prev) =>
      prev
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
    restoreScrollPosition(scrollPos);

    // 2. Server Sync
    try {
      const success = await CommunityService.deletePost(postId, currentUser.id);
      if (!success) {
        throw new Error('Delete returned false');
      }
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error('Failed to delete comment:', err);
      // Revert snapshot
      setComments(previousCommentsSnapshot);
      showDiscreetToast(language === 'ar' ? 'تعذر حذف التعليق' : 'Failed to delete comment', 'error');
    } finally {
      restoreScrollPosition(scrollPos);
    }
  };

  const handleDeleteComment = handleConfirmDelete;

  const formatRelativeTime = (dateStr: string) => {
    return formatTimeAgo(dateStr, language);
  };

  // Strict ownership check: ONLY the explicit creator/author can edit or delete this comment/reply.
  // Global admin powers are isolated strictly to the /admin dashboard.
  const canManagePost = (post: CommunityPost) => {
    if (!currentUser || currentUser.isGuest || !currentUser.id) return false;
    return currentUser.id === post.userId;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && prompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-[calc(100vw-2rem)] sm:w-full max-w-2xl mx-auto bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2A384C] flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#121824]/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25 flex items-center justify-center">
                  <CommentBubbleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{t('commentsTitle')}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
                      {comments.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {prompt.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1f2b3e] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt Quick Info Banner */}
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-orange-50/50 dark:bg-orange-500/5 border-b border-orange-200/50 dark:border-orange-500/10 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-bold text-orange-800 dark:text-orange-300 shrink-0">
                  {language === 'ar' ? 'البرومبت:' : 'Prompt:'}
                </span>
                <TranslatableContent
                  content={prompt.title}
                  as="span"
                  className="text-slate-800 dark:text-slate-200 font-semibold truncate flex-1 min-w-0"
                  id={`comment-modal-title-${prompt.id}`}
                />
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] font-mono text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
                {prompt.targetModel}
              </span>
            </div>

            {/* Toast Notification for Modal */}
            <AnimatePresence>
              {toastNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mx-4 sm:mx-6 mt-3 p-2.5 rounded-xl text-xs font-bold text-center shadow-md ${
                    toastNotice.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {toastNotice.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comments Stream / List */}
            <div ref={commentsContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs">{language === 'ar' ? 'جاري تحميل النقاشات...' : 'Loading comments...'}</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <CommentBubbleIcon className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {language === 'ar' ? 'كن أول من يعلّق أو يشارك تجربته مع هذا الأمر!' : 'Be the first to comment on this prompt!'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {language === 'ar'
                      ? 'شارك نتائج تجربتك مع الـ AI، اقترح تحسينات، أو اطرح سؤالاً.'
                      : 'Share your testing results, suggested tweaks, or ask questions.'}
                  </p>
                </div>
              ) : (
                comments.map((post) => {
                  const isEditingThisPost = editingPostId === post.id;
                  const isConfirmingDeleteThisPost = confirmDeletePostId === post.id;

                  return (
                    <div
                      key={post.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121824] border border-slate-200/80 dark:border-[#2A384C] space-y-3"
                    >
                      {/* Author Meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatar={post.userAvatar}
                            name={post.userName}
                            isGuest={post.isGuest}
                            size="sm"
                            showGlow={true}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <TranslatableAuthorName
                                name={post.userName}
                                userId={post.userId}
                                className="text-xs font-bold text-slate-900 dark:text-slate-100"
                              />
                              {post.isPinned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  <Pin className="w-2.5 h-2.5" />
                                  <span>{t('pinnedBadge')}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatRelativeTime(post.createdAt)}</span>
                              </span>
                              {post.isEdited && (
                                <span className="text-amber-600/80 dark:text-amber-400/80 font-medium">
                                  ({t('edited')})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3-Dots Kebab Menu (Management & Report) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuCommentId(openMenuCommentId === post.id ? null : post.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202c3e] transition-colors cursor-pointer"
                            title={language === 'ar' ? 'خيارات' : 'Options'}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          <AnimatePresence>
                            {openMenuCommentId === post.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setOpenMenuCommentId(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                  transition={{ duration: 0.12 }}
                                  className={`absolute top-full mt-1 z-40 min-w-[130px] rounded-xl bg-white dark:bg-[#1c2638] border border-slate-200 dark:border-[#2e3e57] shadow-xl py-1 text-xs font-medium divide-y divide-slate-100 dark:divide-slate-800 ${
                                    language === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                                  }`}
                                >
                                  {canManagePost(post) && (
                                    <div className="py-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuCommentId(null);
                                          handleStartEdit(post);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#253348] text-start transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                        <span>{t('actions.edit')}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuCommentId(null);
                                          handleTriggerDelete(post.id);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        <span>{t('actions.delete')}</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Report Option */}
                                  <div className="py-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuCommentId(null);
                                        if (isGuest) {
                                          openAuthModal('signin');
                                          return;
                                        }
                                        openReportModal({
                                          targetType: 'comment',
                                          targetId: post.id,
                                          targetTitle: `تعليق من ${post.userName} على ${prompt?.title || ''}`,
                                          targetContent: post.content,
                                          reportedUserId: post.userId,
                                          reportedUserName: post.userName,
                                          reportedUserEmail: post.userEmail,
                                          contentUrl: `${window.location.origin}/#prompt-${prompt?.id || ''}-comment-${post.id}`,
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
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
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                            <span>{t('deleteConfirmQuestion')}</span>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={handleCancelDelete}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#1f2b3e] transition-colors cursor-pointer"
                            >
                              {t('cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(post.id)}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{t('confirmDelete')}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Content or Edit Box */}
                      {isEditingThisPost ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            ref={(el) => {
                              if (el) el.focus({ preventScroll: true });
                            }}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 text-xs sm:text-sm bg-white dark:bg-[#182232] border border-orange-400 dark:border-orange-500/50 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            placeholder={t('commentPlaceholder')}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1f2b3e] cursor-pointer"
                            >
                              {t('cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(post.id)}
                              disabled={!editContent.trim() || isEditingSaving}
                              className="px-3.5 py-1 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{t('confirmEdit')}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <TranslatableContent
                          content={post.content}
                          renderFormatted={renderContentWithMentions}
                          className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap"
                        />
                      )}

                      {/* Actions: Like & Reply */}
                      <div className="flex items-center gap-4 pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(post.id)}
                          className={`inline-flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                            post.isLikedByMe
                              ? 'text-rose-500'
                              : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${post.isLikedByMe ? 'fill-current' : ''}`} />
                          <span>{post.likesCount || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isUnauthOrGuest) {
                              showDiscreetToast(
                                language === 'ar'
                                  ? 'يلزم تسجيل الدخول أو إنشاء حساب للرد على التعليقات'
                                  : 'Registration is required to reply to comments',
                                'error'
                              );
                              openAuthModal('signin');
                              return;
                            }
                            setReplyingToId(replyingToId === post.id ? null : post.id);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                        >
                          <CornerDownLeft className="w-3.5 h-3.5" />
                          <span>{t('replyButton')}</span>
                          {post.replies && post.replies.length > 0 && (
                            <span className="text-[11px] opacity-75">({post.replies.length})</span>
                          )}
                        </button>
                      </div>

                      {/* Reply Composer Input */}
                      {replyingToId === post.id && (
                        <div className="pt-2 relative">
                          {/* Floating @Mention Autocomplete Dropdown */}
                          <MentionDropdown
                            isOpen={mentionQuery !== null}
                            query={mentionQuery || ''}
                            postAuthor={{ name: post.userName, avatar: post.userAvatar }}
                            threadUsers={(post.replies || []).map((r) => ({
                              name: r.userName,
                              avatar: r.userAvatar,
                            }))}
                            onSelect={(chosenName) => {
                              const updated = replyText.replace(/(?:^|\s)@([^\s@]*)$/, (fullMatch) => {
                                const startsWithSpace = fullMatch.startsWith(' ');
                                return `${startsWithSpace ? ' ' : ''}@${chosenName} `;
                              });
                              setReplyText(updated);
                              setMentionQuery(null);
                            }}
                            onClose={() => setMentionQuery(null)}
                            language={language}
                            position="bottom"
                            highlightedIndex={mentionHighlightedIndex}
                          />

                          <div className="flex items-center gap-2 bg-white dark:bg-[#182232] border border-orange-300 dark:border-orange-500/40 rounded-xl p-1.5">
                            <input
                              ref={(el) => {
                                if (el) el.focus({ preventScroll: true });
                              }}
                              type="text"
                              value={replyText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReplyText(val);
                                const match = val.match(/(?:^|\s)@([^\s@]*)$/);
                                if (match) {
                                  setMentionQuery(match[1]);
                                  setMentionHighlightedIndex(0);
                                } else {
                                  setMentionQuery(null);
                                }
                              }}
                              placeholder={t('replyPlaceholder')}
                              className="flex-1 px-2.5 py-1 text-xs bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                              onKeyDown={(e) => {
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
                                      const updated = replyText.replace(/(?:^|\s)@([^\s@]*)$/, (fullMatch) => {
                                        const startsWithSpace = fullMatch.startsWith(' ');
                                        return `${startsWithSpace ? ' ' : ''}@${chosen.name} `;
                                      });
                                      setReplyText(updated);
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
                                  handleSendReply(post.id);
                                }
                              }}
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToId(null);
                                  setReplyText('');
                                }}
                                className="px-2.5 py-1 bg-transparent border border-slate-300 dark:border-white/30 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isUnauthOrGuest) {
                                    showDiscreetToast(
                                      language === 'ar'
                                        ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة رد'
                                        : 'Registration is required to post replies',
                                      'error'
                                    );
                                    openAuthModal('signin');
                                    return;
                                  }
                                  handleSendReply(post.id);
                                }}
                                disabled={(!replyText.trim() && !isUnauthOrGuest) || isSubmitting}
                                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-orange-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>{language === 'ar' ? 'إرسال' : 'Reply'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nested Replies (Facebook Thread Style) */}
                      {post.replies && post.replies.length > 0 && (
                        <div className="space-y-2.5 ps-4 border-s-2 border-orange-500/30 dark:border-orange-500/20 pt-1">
                          {post.replies.map((reply) => {
                            const isEditingReply = editingPostId === reply.id;
                            const isConfirmingDeleteReply = confirmDeletePostId === reply.id;

                            return (
                              <div
                                key={reply.id}
                                className="p-3 rounded-xl bg-white dark:bg-[#182232] border border-slate-200/70 dark:border-[#2A384C] space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <UserAvatar
                                      avatar={reply.userAvatar}
                                      name={reply.userName}
                                      isGuest={reply.isGuest}
                                      size="xs"
                                      showGlow={false}
                                    />
                                    <div>
                                      <TranslatableAuthorName
                                        name={reply.userName}
                                        userId={reply.userId}
                                        className="text-[11px] font-bold text-slate-800 dark:text-slate-200"
                                      />
                                      <span className="text-[10px] text-slate-400 ms-1.5">
                                        {formatRelativeTime(reply.createdAt)}
                                      </span>
                                      {reply.isEdited && (
                                        <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium ms-1">
                                          ({t('edited')})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* 3-Dots Kebab Menu for Reply */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setOpenMenuCommentId(openMenuCommentId === reply.id ? null : reply.id)}
                                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202c3e] transition-colors cursor-pointer"
                                      title={language === 'ar' ? 'خيارات' : 'Options'}
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </button>

                                    <AnimatePresence>
                                      {openMenuCommentId === reply.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-30"
                                            onClick={() => setOpenMenuCommentId(null)}
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                            transition={{ duration: 0.12 }}
                                            className={`absolute top-full mt-1 z-40 min-w-[120px] rounded-xl bg-white dark:bg-[#1c2638] border border-slate-200 dark:border-[#2e3e57] shadow-xl py-1 text-xs font-medium divide-y divide-slate-100 dark:divide-slate-800 ${
                                              language === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                                            }`}
                                          >
                                            {canManagePost(reply) && (
                                              <div className="py-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOpenMenuCommentId(null);
                                                    handleStartEdit(reply);
                                                  }}
                                                  className="w-full flex items-center gap-2 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#253348] text-start transition-colors cursor-pointer"
                                                >
                                                  <Edit2 className="w-3 h-3 text-orange-500 shrink-0" />
                                                  <span>{t('actions.edit')}</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOpenMenuCommentId(null);
                                                    handleTriggerDelete(reply.id);
                                                  }}
                                                  className="w-full flex items-center gap-2 px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                                                >
                                                  <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                                                  <span>{t('actions.delete')}</span>
                                                </button>
                                              </div>
                                            )}

                                            {/* Report Option for Reply */}
                                            <div className="py-0.5">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenMenuCommentId(null);
                                                  if (isGuest) {
                                                    openAuthModal('signin');
                                                    return;
                                                  }
                                                  openReportModal({
                                                    targetType: 'reply',
                                                    targetId: reply.id,
                                                    targetTitle: `رد من ${reply.userName} على تعليق`,
                                                    targetContent: reply.content,
                                                    reportedUserId: reply.userId,
                                                    reportedUserName: reply.userName,
                                                    reportedUserEmail: reply.userEmail,
                                                    contentUrl: `${window.location.origin}/#prompt-${prompt?.id || ''}-reply-${reply.id}`,
                                                  });
                                                }}
                                                className="w-full flex items-center gap-2 px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
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

                                {isConfirmingDeleteReply && (
                                  <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg space-y-2">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 dark:text-red-300">
                                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                                      <span>{t('deleteConfirmQuestion')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={handleCancelDelete}
                                        className="px-2 py-0.5 rounded text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60"
                                      >
                                        {t('cancel')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmDelete(reply.id)}
                                        className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                        <span>{t('confirmDelete')}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {isEditingReply ? (
                                  <div className="space-y-1.5 pt-1">
                                    <textarea
                                      ref={(el) => {
                                        if (el) el.focus({ preventScroll: true });
                                      }}
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      rows={2}
                                      className="w-full p-2 text-xs bg-slate-50 dark:bg-[#121824] border border-orange-400 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                                    />
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-2 py-0.5 rounded text-[11px] font-bold text-slate-500"
                                      >
                                        {t('cancel')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEdit(reply.id)}
                                        disabled={!editContent.trim() || isEditingSaving}
                                        className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-orange-600 text-white flex items-center gap-1"
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
                                    className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap"
                                  />
                                )}

                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLike(reply.id)}
                                    className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                                      reply.isLikedByMe ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                                    }`}
                                  >
                                    <Heart className={`w-3 h-3 ${reply.isLikedByMe ? 'fill-current' : ''}`} />
                                    <span>{reply.likesCount || 0}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom New Comment Form */}
            <div className="p-3 sm:p-5 border-t border-slate-200 dark:border-[#2A384C] bg-slate-50/90 dark:bg-[#121824]/90 shrink-0">
              <form onSubmit={handleSendComment} className="space-y-2">
                <div className="relative">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onClick={() => {
                      if (isUnauthOrGuest) {
                        showDiscreetToast(
                          language === 'ar'
                            ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة تعليق'
                            : 'Registration is required to post comments',
                          'error'
                        );
                        openAuthModal('signin');
                      }
                    }}
                    placeholder={!isUnauthOrGuest ? t('commentPlaceholder') : (language === 'ar' ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة تعليق...' : 'Sign in or register to add a comment...')}
                    rows={2}
                    className="w-full px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none pb-12 sm:pb-2.5 sm:pe-28"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    onClick={(e) => {
                      if (isUnauthOrGuest) {
                        e.preventDefault();
                        showDiscreetToast(
                          language === 'ar'
                            ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة تعليق'
                            : 'Registration is required to post comments',
                          'error'
                        );
                        openAuthModal('signin');
                      }
                    }}
                    disabled={(!commentText.trim() && !isUnauthOrGuest) || isSubmitting}
                    className="absolute bottom-2.5 end-2.5 px-3.5 sm:px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{t('sendComment')}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isUnauthOrGuest && (
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {language === 'ar' ? 'يلزم تسجيل الدخول أو إنشاء حساب لإضافة تعليق' : 'Registration required to post comments'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        openAuthModal('signin');
                      }}
                      className="text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                    >
                      {language === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>
    </>
  );
};
