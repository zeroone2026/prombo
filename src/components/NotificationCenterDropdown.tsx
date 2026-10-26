import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  AtSign,
  Sparkles,
  X,
  Trash2,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserNotification } from '../types';
import { UserNotificationService } from '../services/userNotificationService';
import { useApp } from '../context/AppContext';
import { AuthService } from '../services/authService';
import { SoundNotificationSettings } from './SoundNotificationSettings';

interface NotificationCenterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPrompt?: (promptId: string) => void;
  onNavigateToPost?: (postId: string) => void;
}

function formatRelativeTime(dateString: string, language: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) {
      if (language === 'ar') return 'الآن';
      if (language === 'fr') return "À l'instant";
      if (language === 'es') return 'Ahora';
      if (language === 'zh') return '刚刚';
      if (language === 'hi') return 'अभी';
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      if (language === 'ar') return `منذ ${diffInMinutes} د`;
      if (language === 'fr') return `Il y a ${diffInMinutes} min`;
      if (language === 'es') return `Hace ${diffInMinutes} m`;
      if (language === 'zh') return `${diffInMinutes}分钟前`;
      if (language === 'hi') return `${diffInMinutes} मि पहले`;
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      if (language === 'ar') return `منذ ${diffInHours} س`;
      if (language === 'fr') return `Il y a ${diffInHours} h`;
      if (language === 'es') return `Hace ${diffInHours} h`;
      if (language === 'zh') return `${diffInHours}小时前`;
      if (language === 'hi') return `${diffInHours} घंटे पहले`;
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      if (language === 'ar') return `منذ ${diffInDays} ي`;
      if (language === 'fr') return `Il y a ${diffInDays} j`;
      if (language === 'es') return `Hace ${diffInDays} d`;
      if (language === 'zh') return `${diffInDays}天前`;
      if (language === 'hi') return `${diffInDays} दिन पहले`;
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  isOpen,
  onClose,
  onNavigateToPrompt,
  onNavigateToPost,
}) => {
  const { t, language, isRTL } = useApp();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());
  const [notifications, setNotifications] = useState<UserNotification[]>(() =>
    UserNotificationService.getUserNotifications(currentUser?.id, currentUser?.email)
  );
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setShowSettings(false);
      setShowConfirmClear(false);
    }
  }, [isOpen]);

  const reloadNotifications = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    setNotifications(UserNotificationService.getUserNotifications(user?.id, user?.email));
  };

  useEffect(() => {
    reloadNotifications();

    const handleAdded = () => reloadNotifications();
    const handleUpdated = () => reloadNotifications();
    const handleAuth = (e: any) => {
      const user = e.detail || AuthService.getCurrentUser();
      setCurrentUser(user);
      setNotifications(UserNotificationService.getUserNotifications(user?.id, user?.email));
    };

    window.addEventListener('prombo_user_notification_added', handleAdded);
    window.addEventListener('prombo_notifications_updated', handleUpdated);
    window.addEventListener('prombo_auth_change', handleAuth);

    return () => {
      window.removeEventListener('prombo_user_notification_added', handleAdded);
      window.removeEventListener('prombo_notifications_updated', handleUpdated);
      window.removeEventListener('prombo_auth_change', handleAuth);
    };
  }, [currentUser?.id, currentUser?.email]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Allow the notification bell button to handle its own toggle behavior without premature close
      if (target && target.closest('#navbar-notification-bell-btn')) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    UserNotificationService.markAllAsRead(currentUser?.id, currentUser?.email);
    reloadNotifications();
  };

  const handleNotificationClick = (item: UserNotification) => {
    if (!item.isRead) {
      UserNotificationService.markAsRead(item.id);
      reloadNotifications();
    }

    if (item.entityType === 'prompt' && item.entityId) {
      onClose();
      if (onNavigateToPrompt) {
        onNavigateToPrompt(item.entityId);
      } else {
        window.location.hash = `#prompt-${item.entityId}`;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    } else if (item.entityType === 'post' && item.entityId) {
      onClose();
      if (onNavigateToPost) {
        onNavigateToPost(item.entityId);
      } else {
        window.location.hash = `#post-${item.entityId}`;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    UserNotificationService.deleteNotification(id);
    reloadNotifications();
  };

  // Icon mapping according to type
  const renderNotificationIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'moderation_approved':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'moderation_rejected':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case 'media_alert':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'reply':
        return (
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case 'mention':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <AtSign className="w-4 h-4" />
          </div>
        );
      case 'system':
      case 'general':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
    }
  };

  // Dynamic Localized texts from i18n
  const tTitle = t('notifTitle');
  const tMarkAll = t('notifMarkAllRead');
  const tEmptyTitle = t('notifEmptyTitle');
  const tEmptyDesc = t('notifEmptyDesc');
  const tReasonLabel = t('notifReasonLabel');
  const tClearAll = t('notifClearAll');
  const tClearConfirm = t('notifClearConfirm');
  const tDeleteSingle = t('notifDeleteSingle');
  const tViewPrompt = t('notifViewPrompt');
  const tViewPost = t('notifViewPost');
  const tSettings = t('notifSettings');

  // Dynamic notification content localization resolver
  const resolveNotificationContent = (item: UserNotification) => {
    let title = item.title;
    let message = item.message;
    let reason = item.reason;

    // 1. Explicit keys if provided
    if (item.titleKey) {
      title = t(item.titleKey);
    }
    if (item.messageKey) {
      message = t(item.messageKey, item.messageParams);
    }
    if (item.reasonKey) {
      reason = t(item.reasonKey);
    }

    // 2. Dynamic pattern matching for past or incoming notifications without explicit keys
    if (!item.titleKey || !item.messageKey) {
      const isPrompt =
        item.entityType === 'prompt' ||
        item.title.includes('البرومبت') ||
        item.title.toLowerCase().includes('prompt') ||
        item.message.includes('البرومبت') ||
        item.message.toLowerCase().includes('prompt');

      const isPost =
        item.entityType === 'post' ||
        item.title.includes('مشاركتك') ||
        item.title.toLowerCase().includes('post') ||
        item.message.includes('مشاركتك') ||
        item.message.toLowerCase().includes('post');

      if (item.type === 'moderation_approved') {
        if (isPrompt) {
          title = t('notifPromptApprovedTitle');
          const match = item.message.match(/["“«](.*?)["”»]/);
          const promptTitle = item.messageParams?.title || (match ? match[1] : '');
          message = promptTitle
            ? t('notifPromptApprovedMsg', { title: promptTitle })
            : t('notifPromptApprovedMsg', { title: '' });
        } else if (isPost) {
          title = t('notifPostApprovedTitle');
          message = t('notifPostApprovedMsg');
        }
      } else if (item.type === 'moderation_rejected') {
        if (isPrompt) {
          title = t('notifPromptRejectedTitle');
          const match = item.message.match(/["“«](.*?)["”»]/);
          const promptTitle = item.messageParams?.title || (match ? match[1] : '');
          message = promptTitle
            ? t('notifPromptRejectedMsg', { title: promptTitle })
            : t('notifPromptRejectedMsg', { title: '' });
        } else if (isPost) {
          title = t('notifPostRejectedTitle');
          message = t('notifPostRejectedMsg');
        }
      } else if (item.type === 'media_alert') {
        title = t('notifMediaAlertTitle');
        message = t('notifMediaAlertMsg');
      }
    }

    // 3. Reason localization for standard rejection reasons
    if (reason && !item.reasonKey) {
      const rLower = reason.trim().toLowerCase();
      if (
        rLower.includes('إرشادات') ||
        rLower.includes('قواعد') ||
        rLower.includes('guidelines') ||
        rLower.includes('guideline') ||
        rLower.includes('règles') ||
        rLower.includes('normas') ||
        rLower.includes('لا تطابق الشروط') ||
        rLower.includes('شروط')
      ) {
        reason = t('notifReasonGuidelines');
      } else if (
        rLower.includes('جودة') ||
        rLower.includes('غير واضحة') ||
        rLower.includes('quality') ||
        rLower.includes('resolution') ||
        rLower.includes('qualité') ||
        rLower.includes('calidad')
      ) {
        reason = t('notifReasonLowQuality');
      } else if (
        rLower.includes('تكرار') ||
        rLower.includes('مكرر') ||
        rLower.includes('duplicate') ||
        rLower.includes('dupliqué') ||
        rLower.includes('duplicado')
      ) {
        reason = t('notifReasonDuplicate');
      }
    }

    return { title, message, reason };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`absolute top-full mt-2 z-50 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] ${
            isRTL ? 'left-0 sm:left-0 sm:right-auto' : 'right-0'
          } bg-white dark:bg-[#151D2A] border border-slate-200/90 dark:border-[#2A384C] rounded-2xl shadow-xl overflow-hidden`}
          role="dialog"
          aria-label={tTitle}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-[#222E40] flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-[#182232]/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {tTitle}
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-orange-500 text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && !showSettings && (
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
                  title={tMarkAll}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px] font-semibold">{tMarkAll}</span>
                </button>
              )}

              {/* Clear All Notifications Button (Subtle grey trash icon adjacent to Settings gear) */}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmClear((prev) => !prev)}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    showConfirmClear
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      : 'text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                  title={tClearAll}
                  aria-label={tClearAll}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => {
                  setShowSettings((prev) => !prev);
                  setShowConfirmClear(false);
                }}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  showSettings
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
                title={tSettings}
                aria-label="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          {showConfirmClear && (
            <div className="p-3 bg-rose-50/95 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-2.5 text-xs animate-in fade-in duration-150">
              <span className="font-semibold text-rose-800 dark:text-rose-200 text-xs">
                {tClearConfirm}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    UserNotificationService.clearAllNotifications(currentUser?.id, currentUser?.email);
                    setShowConfirmClear(false);
                    reloadNotifications();
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
                >
                  {tClearAll}
                </button>
              </div>
            </div>
          )}

          {/* Body: Either Settings or Notifications List */}
          {showSettings ? (
            <div className="p-3 max-h-[420px] overflow-y-auto">
              <SoundNotificationSettings compact defaultExpanded />
            </div>
          ) : (
            <>
              {/* Notifications List */}
              <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-[#222E40]/70">
                {notifications.length === 0 ? (
                  <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1A2536] flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                      <BellOff className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                      {tEmptyTitle}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                      {tEmptyDesc}
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const isUnread = !item.isRead;
                    const hasLink = !!(item.entityType && item.entityId);
                    const { title: resolvedTitle, message: resolvedMessage, reason: resolvedReason } = resolveNotificationContent(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`group relative p-3.5 transition-colors cursor-pointer flex gap-3 ${
                          isUnread
                            ? 'bg-orange-50/40 dark:bg-orange-500/5 hover:bg-orange-50/70 dark:hover:bg-orange-500/10'
                            : 'bg-white dark:bg-[#151D2A] hover:bg-slate-50 dark:hover:bg-[#1A2536]'
                        }`}
                      >
                        {/* Visual Unread Bar Indicator */}
                        {isUnread && (
                          <span
                            className={`absolute top-0 bottom-0 ${
                              isRTL ? 'right-0' : 'left-0'
                            } w-1 bg-orange-500 rounded-full my-2`}
                            aria-hidden="true"
                          />
                        )}

                        {/* Icon */}
                        {renderNotificationIcon(item.type)}

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-start justify-between gap-1.5 mb-0.5">
                            <h4
                              className={`text-xs sm:text-sm leading-snug line-clamp-1 ${
                                isUnread
                                  ? 'font-bold text-slate-900 dark:text-slate-100'
                                  : 'font-semibold text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {resolvedTitle}
                            </h4>

                            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 mt-0.5">
                              {formatRelativeTime(item.createdAt, language)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {resolvedMessage}
                          </p>

                          {/* Reason highlight if present */}
                          {resolvedReason && (
                            <div className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md inline-block">
                              <span className="font-semibold">{tReasonLabel} </span>
                              {resolvedReason}
                            </div>
                          )}

                          {/* Navigation hint if entity attached */}
                          {hasLink && (
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                              <span>{item.entityType === 'prompt' ? tViewPrompt : tViewPost}</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Actions on hover (Delete) */}
                        <div className="flex items-start shrink-0">
                          <button
                            onClick={(e) => handleDeleteNotification(e, item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-opacity rounded"
                            title={tDeleteSingle}
                            aria-label={tDeleteSingle}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Settings Footer Bar */}
              <div className="px-3.5 py-2.5 border-t border-slate-100 dark:border-[#222E40] bg-slate-50/70 dark:bg-[#182232]/80 flex items-center justify-between">
                <button
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{tSettings}</span>
                </button>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('notifCount', { count: notifications.length })}
                </span>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
