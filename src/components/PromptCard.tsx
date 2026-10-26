import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Bookmark,
  SlidersHorizontal,
  Tag,
  Cpu,
  User,
  Maximize2,
  Image as ImageIcon,
  Shield,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Sparkles,
  Layers,
  MoreVertical,
  Clock,
  Share2,
  Flag,
} from 'lucide-react';
import { Prompt, Category, CommunityUser } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { CommentBubbleIcon } from './CommentBubbleIcon';
import { UserAvatar } from './UserAvatar';
import { formatTimeAgo } from '../utils/dateUtils';
import { useApp } from '../context/AppContext';
import { AuthService } from '../services/authService';
import { useGuestRestriction } from '../context/GuestRestrictionContext';
import { useReportModal } from '../context/ReportModalContext';
import { getContentUrl, copyTextToClipboard } from '../utils/slugUtils';
import { TranslatableAuthorName } from './TranslatableAuthorName';
import { TranslatableContent } from './TranslatableContent';
import { getLocalizedCategoryName } from '../utils/categoryUtils';
import { MediaGrid } from './community/MediaGrid';
import { updateDocumentMetadata } from '../utils/seoUtils';

interface PromptCardProps {
  prompt: Prompt;
  category?: Category;
  isFavorite: boolean;
  isHighlighted?: boolean;
  currentUser?: CommunityUser | null;
  onToggleFavorite: (id: string) => void;
  onCopy: (text: string, promptId: string) => void;
  onOpenVariables: (prompt: Prompt) => void;
  onSelectTag?: (tag: string) => void;
  onOpenComments?: (prompt: Prompt) => void;
  onDisabledCommentClick?: () => void;
  communityEnabled?: boolean;
  commentsCount?: number;
  isAdmin?: boolean;
  onEdit?: (prompt: Prompt) => void;
  onAdminEdit?: (prompt: Prompt) => void;
  onDelete?: (promptId: string) => void;
  onAdminDelete?: (promptId: string) => void;
  onAdminToggleStatus?: (promptId: string, newStatus: 'approved' | 'pending' | 'inactive') => void;
}

const PromptCardComponent: React.FC<PromptCardProps> = ({
  prompt,
  category,
  isFavorite,
  isHighlighted = false,
  currentUser,
  onToggleFavorite,
  onCopy,
  onOpenVariables,
  onSelectTag,
  onOpenComments,
  onDisabledCommentClick,
  communityEnabled = true,
  commentsCount,
  isAdmin = false,
  onEdit,
  onAdminEdit,
  onDelete,
  onAdminDelete,
  onAdminToggleStatus,
}) => {
  const { t, language, isRTL } = useApp();
  const { isGuest, openAuthModal } = useGuestRestriction();
  const { openReportModal } = useReportModal();
  const [isExpanded, setIsExpanded] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [justCopiedLink, setJustCopiedLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getContentUrl(prompt.id);
    updateDocumentMetadata({
      language,
      promptTitle: prompt.title,
      promptDescription: prompt.description,
      url,
    });
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setJustCopiedLink(true);
      setTimeout(() => {
        setJustCopiedLink(false);
        setIsMenuOpen(false);
      }, 1400);
    }
  };

  // User resolution: from props or AuthService
  const effectiveUser = currentUser !== undefined ? currentUser : AuthService.getCurrentUser();

  // Strict ownership check: EXPLICIT author/owner of the prompt
  const isAuthor = Boolean(
    effectiveUser &&
    !effectiveUser.isGuest &&
    effectiveUser.id &&
    (
      (prompt.authorId && effectiveUser.id === prompt.authorId) ||
      (prompt.author_id && effectiveUser.id === prompt.author_id) ||
      (prompt.userId && effectiveUser.id === prompt.userId) ||
      (effectiveUser.email && prompt.authorEmail && effectiveUser.email.toLowerCase().trim() === prompt.authorEmail.toLowerCase().trim())
    )
  );

  // Requirement 1 & 3: Global admin powers are isolated strictly to /admin dashboard.
  // In public feed prompt cards, render Edit/Delete/Hide actions ONLY IF the user is the explicit author/owner.
  const canManage = isAuthor;

  // Check if prompt has variables
  const hasVariables =
    (prompt.variables && prompt.variables.length > 0) ||
    /\{([a-zA-Z0-9_-]+)\}/.test(prompt.prompt);

  const handleDirectCopy = () => {
    onCopy(prompt.prompt, prompt.id);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const getLocalizedCategoryNameHelper = (cat: Category): string => {
    return getLocalizedCategoryName(cat, t, language);
  };

  const handleDeletePrompt = () => {
    if (onDelete) {
      onDelete(prompt.id);
    } else if (onAdminDelete) {
      onAdminDelete(prompt.id);
    }
    setShowDeleteConfirm(false);
  };

  // Check if current authenticated user is the explicit author of this prompt
  const isCurrentUserAuthor = Boolean(
    currentUser &&
    !currentUser.isGuest &&
    currentUser.id &&
    ((prompt.authorId && prompt.authorId === currentUser.id) ||
     (prompt.author_id && prompt.author_id === currentUser.id) ||
     (prompt.userId && prompt.userId === currentUser.id) ||
     (prompt.authorEmail && currentUser.email && prompt.authorEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()))
  );

  const authorDisplayName = isCurrentUserAuthor && currentUser?.name?.trim()
    ? currentUser.name.trim()
    : prompt.author &&
      prompt.author.trim() !== '' &&
      prompt.author.trim().toLowerCase() !== 'anonymous' &&
      prompt.author.trim() !== 'مجهول'
    ? prompt.author.trim()
    : language === 'ar'
    ? 'مجهول'
    : 'Anonymous';

  // Resolve author avatar from currentUser if matching author, else prompt.authorAvatar or matching profile in AuthService
  const resolvedAuthorAvatar = isCurrentUserAuthor && currentUser?.avatar
    ? currentUser.avatar
    : prompt.authorAvatar ||
      (() => {
        if (prompt.authorId || prompt.authorEmail || prompt.author) {
          try {
            const profiles = AuthService.getAllProfiles();
            const match = profiles.find(
              (p) =>
                (prompt.authorId && p.id === prompt.authorId) ||
                (prompt.authorEmail && p.email?.toLowerCase() === prompt.authorEmail.toLowerCase()) ||
                (prompt.author && p.name.toLowerCase() === prompt.author.toLowerCase())
            );
            if (match?.avatar) return match.avatar;
          } catch (e) {
            // fallback to dynamic initial
          }
        }
        return undefined;
      })();

  return (
    <>
      <motion.div
        id={`prompt-card-${prompt.id}`}
        data-prompt-id={prompt.id}
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: isHighlighted ? [1, 1.02, 1] : 1,
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className={`group relative flex flex-col justify-between bg-white dark:bg-[#182232] rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-xs hover:shadow-md ${
          isHighlighted
            ? 'border-2 border-orange-500 dark:border-orange-500 ring-4 ring-orange-500/25 dark:ring-orange-400/25 shadow-xl shadow-orange-500/20'
            : 'border border-slate-200 dark:border-[#2A384C] hover:border-orange-500/60 dark:hover:border-orange-500/60'
        }`}
      >
        {/* Highlight Target Prompt Badge */}
        {isHighlighted && (
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white shadow-md shadow-orange-600/30 animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>{t('targetPromptBadge')}</span>
            </span>
          </div>
        )}

        {/* Top Meta Bar */}
        <div className="space-y-3">
          {/* Delete Confirmation Alert (Triggered from menu) */}
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{t('deletePromptConfirm')}</span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeletePrompt}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {t('confirmDelete')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Top Header: Author Attribution (Matching exact Community Feed visual style) & Top Action Controls */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-[#2A384C]/60">
            {/* Prompt Author (Matching Community Feed style with UserAvatar glow, full name and relative time) */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <UserAvatar
                avatar={resolvedAuthorAvatar}
                name={authorDisplayName}
                size="sm"
                showGlow={true}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <TranslatableAuthorName
                    name={authorDisplayName}
                    userId={prompt.userId}
                    className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] sm:max-w-xs"
                  />
                  {prompt.isFeatured && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                      <Zap className="w-2.5 h-2.5" />
                      <span>{t('featured')}</span>
                    </span>
                  )}
                  {(prompt.isSponsored || prompt.isPromoted) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{t('sponsored')}</span>
                    </span>
                  )}
                </div>
                {prompt.createdAt && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    <span>{formatTimeAgo(prompt.createdAt, language)}</span>
                    {(prompt.isEdited || (prompt.updatedAt && prompt.createdAt && new Date(prompt.updatedAt).getTime() > new Date(prompt.createdAt).getTime() + 1000)) && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
                        title={language === 'ar' ? 'تم تعديل هذا البرومبت' : 'This prompt was edited'}
                      >
                        {language === 'ar' ? 'مُعَدَّل' : 'Edited'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Comment Button (Custom Double-Bubble Icon with 'علق' / 'comment' label underneath) */}
              {onOpenComments && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!communityEnabled) {
                      onDisabledCommentClick?.();
                      return;
                    }
                    onOpenComments(prompt);
                  }}
                  aria-label={t.comments || 'comment'}
                  aria-disabled={!communityEnabled}
                  title={
                    !communityEnabled
                      ? (t.toastCommunityDisabled || 'Community feature is currently disabled')
                      : (t.commentOnPrompt || 'Comment on this prompt')
                  }
                  className={`group/comment flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all duration-150 min-w-[42px] select-none ${
                    !communityEnabled
                      ? 'bg-gray-400/20 dark:bg-gray-700/40 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed shadow-none'
                      : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200/80 dark:border-orange-500/30 shadow-xs cursor-pointer'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <CommentBubbleIcon
                      className={`w-4 h-4 transition-transform ${
                        !communityEnabled
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-orange-600 dark:text-orange-400 group-hover/comment:scale-110'
                      }`}
                    />
                    {typeof commentsCount === 'number' && commentsCount > 0 && (
                      <span
                        className={`absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-black min-w-[13px] text-center leading-none shadow-xs ${
                          !communityEnabled
                            ? 'bg-gray-400 dark:bg-gray-600 text-white'
                            : 'bg-orange-600 text-white'
                        }`}
                      >
                        {commentsCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-0.5 leading-tight select-none ${
                      !communityEnabled
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}
                  >
                    {t('comment')}
                  </span>
                </button>
              )}

              {/* Favorite Button (restricted for guests) */}
              <button
                type="button"
                id={`prompt-card-favorite-btn-${prompt.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isGuest || !effectiveUser || effectiveUser.isGuest) {
                    openAuthModal('signin');
                  } else {
                    onToggleFavorite(prompt.id);
                  }
                }}
                aria-label={isFavorite ? 'Remove bookmark' : 'Bookmark prompt'}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isFavorite
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-orange-400'
                    : 'bg-slate-100 dark:bg-[#121824] border-slate-200 dark:border-[#2A384C] text-slate-400 hover:text-orange-500'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>

              {/* Kebab 3-Dots Menu (Available for all prompts with Copy Link + author management options) */}
              <div className="relative">
                <button
                  type="button"
                  id={`prompt-card-menu-btn-${prompt.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  aria-label={language === 'ar' ? 'خيارات البرومبت' : 'Prompt options'}
                  title={language === 'ar' ? 'خيارات البرومبت' : 'Prompt options'}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isMenuOpen
                      ? 'bg-orange-100 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400'
                      : 'bg-slate-100 dark:bg-[#121824] border-slate-200 dark:border-[#2A384C] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      {/* Click-away backdrop */}
                      <div
                        className="fixed inset-0 z-30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                        }}
                      />

                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-full mt-1.5 ${
                          isRTL ? 'left-0' : 'right-0'
                        } z-40 w-48 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-xl shadow-xl py-1 overflow-hidden text-xs divide-y divide-slate-100 dark:divide-slate-800`}
                      >
                        {/* Universal Option: Copy Link */}
                        <div className="py-0.5">
                          <button
                            type="button"
                            id={`prompt-card-copy-link-btn-${prompt.id}`}
                            onClick={handleCopyLink}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors cursor-pointer text-start font-medium"
                          >
                            {justCopiedLink ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {t('actions.linkCopied')}
                                </span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-4 h-4 text-orange-500 shrink-0" />
                                <span>{t('actions.copyLink')}</span>
                              </>
                            )}
                          </button>

                          {/* Universal Option: Report Prompt */}
                          <button
                            type="button"
                            id={`prompt-card-report-btn-${prompt.id}`}
                            onClick={() => {
                              setIsMenuOpen(false);
                              if (isGuest) {
                                openAuthModal('signin');
                                return;
                              }
                              openReportModal({
                                targetType: 'prompt',
                                targetId: prompt.id,
                                targetTitle: prompt.title,
                                targetContent: prompt.prompt,
                                reportedUserId: prompt.authorId || prompt.userId,
                                reportedUserName: authorDisplayName,
                                reportedUserEmail: prompt.authorEmail,
                                contentUrl: getContentUrl(prompt.id),
                              });
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-start font-medium"
                          >
                            <Flag className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>{t('actions.report')}</span>
                          </button>
                        </div>

                        {canManage && (
                          <div className="py-0.5">
                            {/* Option 1: Visibility Toggle (Author can toggle own prompt visibility) */}
                            {onAdminToggleStatus && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsMenuOpen(false);
                                  onAdminToggleStatus(
                                    prompt.id,
                                    prompt.status === 'approved' || !prompt.status ? 'inactive' : 'approved'
                                  );
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-start font-medium"
                              >
                                {prompt.status === 'approved' || !prompt.status ? (
                                  <>
                                    <EyeOff className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>{t('actions.hideFromLibrary')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>{t('actions.publishToLibrary')}</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Option 2: Edit Prompt (Author only) */}
                            {(onEdit || onAdminEdit) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsMenuOpen(false);
                                  if (onEdit) {
                                    onEdit(prompt);
                                  } else if (onAdminEdit) {
                                    onAdminEdit(prompt);
                                  }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-start font-medium"
                              >
                                <Edit2 className="w-4 h-4 text-orange-500 shrink-0" />
                                <span>{t('actions.edit')}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Option 3: Delete Prompt (Author only) */}
                        {canManage && (onDelete || onAdminDelete) && (
                          <div className="py-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowDeleteConfirm(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-start font-medium"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                              <span>{t('actions.delete')}</span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Badges & Tags Row: Category Badge, Status Indicators, Model / Engine Tag */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {/* Category Badge - Wrapped in TranslatableContent with smart script guardrails */}
            {category && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                <CategoryIcon name={category.icon} className="w-3.5 h-3.5 shrink-0" />
                <TranslatableContent
                  content={getLocalizedCategoryNameHelper(category)}
                  as="span"
                  id={`prompt-card-cat-${prompt.id}`}
                />
              </div>
            )}

            {/* Subcategory Badge (if defined) */}
            {prompt.subcategory && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-[#121824] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2A384C]">
                <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                <TranslatableContent
                  content={prompt.subcategory}
                  as="span"
                  id={`prompt-card-subcat-${prompt.id}`}
                />
              </div>
            )}

            {/* Inactive Micro-Pill Indicator: visible ONLY to prompt author or site admin */}
            {canManage && prompt.status === 'inactive' && (
              <span
                className="bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 text-xs px-2 py-0.5 rounded-full border border-rose-200/80 dark:border-rose-800/60 inline-flex items-center gap-1 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{t('statusInactive')}</span>
              </span>
            )}

            {/* Pending Micro-Pill Indicator: visible ONLY to prompt author or site admin */}
            {canManage && prompt.status === 'pending' && (
              <span
                className="bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800/60 inline-flex items-center gap-1 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{t('statusPending')}</span>
              </span>
            )}

            {/* Model / Engine Tag */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#121824] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2A384C]">
              <Cpu className="w-3 h-3 text-orange-600 dark:text-orange-500" />
              <span className="truncate max-w-[140px]">{prompt.targetModel}</span>
            </div>
          </div>

          {/* Prompt Media Preview (Images Gallery, Videos, and Lightbox Trigger) */}
          {((prompt.images && prompt.images.length > 0) || prompt.imageUrl || (prompt.videos && prompt.videos.length > 0) || Boolean(prompt.videoUrl)) && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <MediaGrid
                images={prompt.images && prompt.images.length > 0 ? prompt.images : (prompt.imageUrl ? [prompt.imageUrl] : [])}
                videos={prompt.videos}
                videoUrl={prompt.videoUrl}
                title={prompt.title}
                author={prompt.author}
              />
            </div>
          )}

          {/* Title - Clickable to open full prompt detail modal with dynamic auto translation */}
          <TranslatableContent
            content={prompt.title}
            as="h3"
            onClick={() => onOpenVariables(prompt)}
            className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug cursor-pointer"
            title={language === 'ar' ? 'انقر لعرض كامل تفاصيل البرومبت' : 'Click to view full prompt details'}
            id={`prompt-card-title-${prompt.id}`}
          />

          {/* Subcategory & Description */}
          {prompt.description && (
            <TranslatableContent
              content={prompt.description}
              as="p"
              className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2"
              id={`prompt-card-desc-${prompt.id}`}
            />
          )}

          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {prompt.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag && onSelectTag(tag)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-[#121824] hover:bg-orange-50 dark:hover:bg-[#1f2b3e] text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Prompt Code Content Box */}
        <div className="mt-4 space-y-2">
          <div className="relative rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] overflow-hidden">
            <div
              dir="ltr"
              className={`p-3.5 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed selection:bg-orange-600 selection:text-white text-left transition-all duration-200 ${
                isExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-24 overflow-hidden'
              }`}
            >
              {prompt.prompt}
            </div>

            {/* Fade gradient when collapsed */}
            {!isExpanded && prompt.prompt.length > 130 && (
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 dark:from-[#121824] to-transparent pointer-events-none" />
            )}
          </div>

          {/* Expand / Collapse Toggle */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 font-medium transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'عرض أقل' : 'Show less'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? `عرض الأمر كاملاً (${prompt.prompt.length} حرف)` : `Show full prompt (${prompt.prompt.length} chars)`}</span>
                </>
              )}
            </button>

            <span className="text-[11px] text-slate-500 font-mono">
              {prompt.copyCount || 0} {language === 'ar' ? 'نسخة' : 'copies'}
            </span>
          </div>
        </div>

        {/* Card Action Footer */}
        <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-[#2A384C] flex items-center justify-between gap-2">
          {hasVariables ? (
            <button
              type="button"
              onClick={() => onOpenVariables(prompt)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t('customizeVariables')}</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500">
              {t('tips')}: {prompt.tips && prompt.tips.length > 0 ? prompt.tips[0] : (language === 'ar' ? 'جاهز للاستخدام الفوري' : 'Ready to use')}
            </div>
          )}

          {/* 1-Click Instant Copy Button */}
          <button
            type="button"
            onClick={handleDirectCopy}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              justCopied
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-orange-600 hover:bg-orange-500 text-white border border-transparent shadow-xs'
            }`}
          >
            {justCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('copyPrompt')}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
};

export const PromptCard = React.memo(PromptCardComponent);

