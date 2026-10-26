import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  Headphones,
  Check,
  CheckCheck,
  Paperclip,
  FileText,
  Download,
  Loader2,
  Sparkles,
  MoreVertical,
  Copy,
  Reply,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthService } from '../../services/authService';
import { SupportService } from '../../services/supportService';
import { SupportMessage, SupportAttachment, SupportQuotedMessage } from '../../types';
import { copyTextToClipboard } from '../../utils/slugUtils';
import {
  processSupportFile,
  formatBytes,
  renderMessageContent,
} from '../../utils/supportMediaUtils';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose }) => {
  const { t, language, isRTL } = useApp();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<SupportAttachment | null>(null);
  const [showReadReceipts, setShowReadReceipts] = useState<boolean>(() =>
    SupportService.isUserReadReceiptsEnabled()
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<SupportQuotedMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuMessageId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Identify current user or generate seamless guest identity
  const currentUser = AuthService.getCurrentUser();
  const userId = currentUser ? currentUser.id : 'user-guest-support';
  const userName = currentUser ? currentUser.name : (language === 'ar' ? 'زائر' : 'Visitor');

  // Load and subscribe to real-time support messages
  useEffect(() => {
    if (!isOpen) return;

    const loadData = () => {
      const userMsgs = SupportService.getMessagesForUser(userId);
      setMessages(userMsgs);
      setIsBlocked(SupportService.isUserBlocked(userId));
      setShowReadReceipts(SupportService.isUserReadReceiptsEnabled());
      // Mark admin messages as read upon opening
      SupportService.markMessagesAsRead(userId, 'user');
    };

    loadData();
    const unsubscribe = SupportService.subscribe(loadData);

    return () => {
      unsubscribe();
    };
  }, [isOpen, userId]);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on modal open
  useEffect(() => {
    if (isOpen && !isBlocked) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isBlocked]);

  // Clean up timers on unmount to prevent memory leaks (PERF-04)
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if ((!trimmed && !pendingAttachment) || isSending || isCompressing || isBlocked) return;

    try {
      setIsSending(true);
      SupportService.sendMessage(
        userId,
        'user',
        trimmed,
        pendingAttachment || undefined,
        replyingTo || undefined
      );
      setInputText('');
      setPendingAttachment(null);
      setReplyingTo(null);
      const updated = SupportService.getMessagesForUser(userId);
      setMessages(updated);
    } catch (err: any) {
      if (err?.message === 'USER_BLOCKED') {
        setIsBlocked(true);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = async (msg: SupportMessage) => {
    const textToCopy = msg.message || (msg.attachment ? msg.attachment.url : '');
    if (!textToCopy) return;
    const ok = await copyTextToClipboard(textToCopy);
    if (ok) {
      setToastMessage(t('support.copySuccess') || (language === 'ar' ? 'تم نسخ نص الرسالة إلى الحافظة' : 'Message copied to clipboard'));
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleStartReply = (msg: SupportMessage) => {
    const isSenderUser = msg.sender_type === 'user';
    const senderName = isSenderUser
      ? (t('support.you') || (language === 'ar' ? 'أنت' : 'You'))
      : (t('support.admin') || (language === 'ar' ? 'الدعم الفني' : 'Support Team'));

    setReplyingTo({
      id: msg.id,
      sender_type: msg.sender_type,
      sender_name: senderName,
      message: msg.message || '',
      attachment_type: msg.attachment?.type,
      attachment_name: msg.attachment?.name,
    });
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const handleScrollToMessage = (targetId: string) => {
    const el = document.getElementById(`support-user-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedMessageId(targetId);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    } else {
      setToastMessage(t('support.originalMessageNotFound') || (language === 'ar' ? 'تعذر العثور على الرسالة الأصلية في المحادثة' : 'Original message not found'));
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isBlocked) return;

    try {
      setIsCompressing(true);
      const attachment = await processSupportFile(file);
      setPendingAttachment(attachment);
    } catch (err) {
      console.error('Failed to process attachment', err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatMessageDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return language === 'ar' ? 'اليوم' : 'Today';
      }
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="support-modal-backdrop"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        >
          <motion.div
            id="support-chat-modal"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg h-[88vh] sm:h-[620px] max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl border overflow-hidden mx-auto
              bg-[#FDFBF7] dark:bg-[#1C2128] border-slate-200/80 dark:border-[#2D333B]`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#2D333B] bg-white/70 dark:bg-[#161B22]/70 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1C2128]" />
                </div>
                <div className="min-w-0">
                  {/* Header title in clear Dark Orange as requested */}
                  <h3 className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-500 truncate">
                    {t('support.title')}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t('support.teamMember')}</span>
                  </div>
                </div>
              </div>

              <button
                id="support-modal-close-btn"
                onClick={onClose}
                aria-label={t('ads.close') || 'Close'}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2D333B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Silent Block: No red error banners or warnings displayed to user */}

            {/* Chat Messages Container */}
            <div
              id="support-messages-scroll-area"
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5"
            >
              {/* Welcoming Greeting Bubble */}
              <div className="text-center my-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-[#242C35] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-[#2D333B]/60">
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  <span>{t('support.subtitle')}</span>
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-4">
                  <Headphones className="w-10 h-10 mb-2 opacity-40 text-orange-500" />
                  <p className="text-sm font-medium">{t('support.noMessagesYet')}</p>
                  <p className="text-xs mt-1 text-slate-400">{t('support.typeMessage')}</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.sender_type === 'user';
                  const showDate =
                    index === 0 ||
                    formatMessageDate(messages[index - 1].created_at) !==
                      formatMessageDate(msg.created_at);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="text-center my-3">
                          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-[#242C35] text-slate-600 dark:text-slate-400">
                            {formatMessageDate(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        key={msg.id}
                        id={`support-user-msg-${msg.id}`}
                        className={`flex flex-col ${
                          isUser ? 'items-end' : 'items-start'
                        } transition-all duration-300`}
                      >
                        {/* Sender Label hint */}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 px-1 mb-0.5">
                          {isUser ? userName : t('support.admin')}
                        </div>

                        {/* Message Row with Bubble and 3-dots action menu */}
                        <div
                          className={`relative group flex items-end gap-1.5 max-w-[88%] sm:max-w-[78%] ${
                            isUser ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {/* Chat Bubble */}
                          <div
                            className={`px-4 py-2.5 shadow-xs text-sm break-words whitespace-pre-wrap overflow-hidden transition-all duration-300 ${
                              isUser
                                ? `bg-sky-500 dark:bg-sky-600 text-white rounded-2xl ${
                                    isRTL ? 'rounded-bl-xs' : 'rounded-br-xs'
                                  }`
                                : `bg-orange-500 dark:bg-orange-600 text-white rounded-2xl ${
                                    isRTL ? 'rounded-br-xs' : 'rounded-bl-xs'
                                  }`
                            } ${
                              highlightedMessageId === msg.id
                                ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-slate-900 bg-orange-600/90 scale-[1.02] shadow-[0_0_25px_rgba(249,115,22,0.65)]'
                                : ''
                            }`}
                          >
                            {/* Quoted Message Card */}
                            {msg.reply_to && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleScrollToMessage(msg.reply_to!.id);
                                }}
                                className="mb-2 p-2 rounded-xl bg-black/20 hover:bg-black/30 border-s-4 border-white text-xs cursor-pointer transition-colors max-w-full overflow-hidden select-none"
                                title={language === 'ar' ? 'انقر للانتقال إلى الرسالة الأصلية' : 'Click to view original message'}
                              >
                                <div className="font-semibold text-[11px] text-white/95 truncate">
                                  {msg.reply_to.sender_name}
                                </div>
                                <div className="text-[11px] text-white/80 truncate">
                                  {msg.reply_to.message ||
                                    (msg.reply_to.attachment_type === 'image'
                                      ? (language === 'ar' ? '📷 صورة' : '📷 Image')
                                      : msg.reply_to.attachment_name ? `📎 ${msg.reply_to.attachment_name}` : '')}
                                </div>
                              </div>
                            )}

                            {/* Rich Media: Attachment Display */}
                            {msg.attachment && (
                              <div className="mb-2">
                                {msg.attachment.type === 'image' ? (
                                  <div className="relative group rounded-xl overflow-hidden bg-black/10">
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name}
                                      onClick={() => setPreviewImage(msg.attachment!.url)}
                                      className="max-h-60 w-auto rounded-xl object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                    />
                                    <div className="flex items-center justify-between text-[10px] p-1 text-white/90 bg-black/30 backdrop-blur-xs">
                                      <span className="truncate max-w-[140px] font-mono">{msg.attachment.name}</span>
                                      {msg.attachment.size && (
                                        <span className="shrink-0">{formatBytes(msg.attachment.size)}</span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <a
                                    href={msg.attachment.url}
                                    download={msg.attachment.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 p-2 rounded-xl bg-black/15 hover:bg-black/25 text-white transition-colors"
                                  >
                                    <FileText className="w-5 h-5 shrink-0" />
                                    <div className="min-w-0 flex-1 text-xs">
                                      <p className="font-semibold truncate">{msg.attachment.name}</p>
                                      {msg.attachment.size && (
                                        <p className="text-[10px] opacity-80 font-mono">
                                          {formatBytes(msg.attachment.size)}
                                        </p>
                                      )}
                                    </div>
                                    <Download className="w-4 h-4 shrink-0 opacity-80" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Message Text with Clickable Links */}
                            {msg.message && (
                              <p className="leading-relaxed">
                                {renderMessageContent(msg.message)}
                              </p>
                            )}
                          </div>

                          {/* 3-dots Menu Button (strictly Copy & Reply, NO Delete option for Users) */}
                          <div className="relative shrink-0 mb-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuMessageId(openMenuMessageId === msg.id ? null : msg.id);
                              }}
                              title={language === 'ar' ? 'خيارات الرسالة' : 'Message options'}
                              aria-label="Message options"
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-opacity cursor-pointer opacity-70 sm:opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* 3-dots Dropdown Menu */}
                            {openMenuMessageId === msg.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute bottom-full mb-1 z-30 w-32 py-1 bg-white dark:bg-[#151D2A] border border-slate-200 dark:border-[#2A384C] rounded-xl shadow-xl text-xs font-medium animate-in fade-in ${
                                  isUser ? (isRTL ? 'right-0' : 'left-0') : (isRTL ? 'left-0' : 'right-0')
                                }`}
                              >
                                {/* Copy Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMessageId(null);
                                    handleCopyMessage(msg);
                                  }}
                                  className="w-full px-3 py-1.5 text-start flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{language === 'ar' ? 'نسخ النص' : 'Copy'}</span>
                                </button>

                                {/* Reply Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMessageId(null);
                                    handleStartReply(msg);
                                  }}
                                  className="w-full px-3 py-1.5 text-start flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                                >
                                  <Reply className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{language === 'ar' ? 'رد' : 'Reply'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Date and Timestamp beneath every message bubble as requested */}
                        <div className="flex items-center gap-1.5 px-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>{formatMessageTime(msg.created_at)}</span>
                          {/* Specification 4: Users see double checks ONLY if Admin toggle is enabled */}
                          {isUser && showReadReceipts && (
                            <span>
                              {msg.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 inline" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-[#2D333B] bg-white/80 dark:bg-[#161B22]/80 backdrop-blur-md shrink-0">
              {/* Quoted Message Preview Bar (Replying state) */}
              {replyingTo && (
                <div className="mb-2.5 p-2 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border-s-4 border-orange-500 flex items-center justify-between gap-2 max-w-full overflow-hidden">
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-orange-700 dark:text-orange-400 text-[11px]">
                      <Reply className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('support.replyingTo') || (language === 'ar' ? 'الرد على' : 'Replying to')} {replyingTo.sender_name}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-xs truncate mt-0.5">
                      {replyingTo.message ||
                        (replyingTo.attachment_type === 'image'
                          ? (language === 'ar' ? '📷 صورة' : '📷 Image')
                          : replyingTo.attachment_name ? `📎 ${replyingTo.attachment_name}` : '')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    title={t('support.cancelReply') || (language === 'ar' ? 'إلغاء الرد' : 'Cancel reply')}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-200/50 dark:hover:bg-[#1E293B] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pre-upload Media Preview */}
              {pendingAttachment && (
                <div className="mb-2.5 p-2 rounded-xl bg-slate-100 dark:bg-[#242C35] border border-slate-200 dark:border-[#2D333B] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {pendingAttachment.type === 'image' ? (
                      <img
                        src={pendingAttachment.url}
                        alt={pendingAttachment.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 text-xs">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {pendingAttachment.name}
                        </p>
                        {pendingAttachment.mimeType === 'image/webp' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            WEBP
                          </span>
                        )}
                      </div>
                      {pendingAttachment.size && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatBytes(pendingAttachment.size)}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    title={t('support.removeAttachment')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-[#1C2128] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Compression loading indicator */}
              {isCompressing && (
                <div className="mb-2 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-medium animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('support.compressing')}</span>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.doc,.docx,.json,.zip"
                  onChange={handleFileChange}
                  disabled={isBlocked || isSending || isCompressing}
                  className="hidden"
                />

                {/* Attachment Trigger Button (Silently hidden if blocked) */}
                {!isBlocked && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isCompressing}
                    title={t('support.attachMedia')}
                    aria-label={t('support.attachMedia')}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#242C35] dark:hover:bg-[#2D333B] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                )}

                {/* Input textarea: Silently disabled when user is blocked with empty placeholder */}
                <textarea
                  ref={inputRef}
                  id="support-message-input"
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isBlocked || isSending || isCompressing}
                  placeholder={
                    isBlocked
                      ? ''
                      : t('support.typeMessage')
                  }
                  className={`flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-[#242C35] border border-slate-300 dark:border-[#2D333B] rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-all ${
                    isBlocked ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#1a2027]' : ''
                  }`}
                />

                {/* Send Button: Silently hidden if user is blocked */}
                {!isBlocked && (
                  <button
                    type="submit"
                    id="support-message-send-btn"
                    disabled={(!inputText.trim() && !pendingAttachment) || isSending || isCompressing}
                    aria-label={t('support.send')}
                    className="w-10 h-10 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </form>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>{language === 'ar' ? 'محادثة خاصة ومباشرة مع الإدارة' : '1-on-1 direct support channel'}</span>
                <span>{inputText.length > 0 && `${inputText.length} ch`}</span>
              </div>
            </div>

            {/* Toast Feedback Notification */}
            {toastMessage && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 text-white text-xs font-medium shadow-xl backdrop-blur-xs border border-slate-700 pointer-events-none max-w-[90%] text-center">
                {toastMessage}
              </div>
            )}
          </motion.div>

          {/* Image Lightbox Viewer Modal */}
          {previewImage && (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
              onClick={() => setPreviewImage(null)}
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/75 cursor-pointer transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Attachment preview"
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
