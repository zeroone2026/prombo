import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Send,
  Headphones,
  Shield,
  ShieldAlert,
  Ban,
  Check,
  CheckCheck,
  ArrowLeft,
  ArrowRight,
  User,
  Users,
  MessageSquare,
  Sparkles,
  PhoneCall,
  Clock,
  Circle,
  AlertTriangle,
  UserX,
  UserCheck,
  Paperclip,
  FileText,
  Download,
  X,
  Loader2,
  MoreVertical,
  Copy,
  Reply,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SupportService } from '../../services/supportService';
import { AuthService } from '../../services/authService';
import { SupportMessage, SupportConversationSummary, SupportAttachment, SupportQuotedMessage } from '../../types';
import { AuditService } from '../../services/auditService';
import { copyTextToClipboard } from '../../utils/slugUtils';
import { AdminConfirmationModal, ConfirmationVariant } from './AdminConfirmationModal';
import {
  processSupportFile,
  formatBytes,
  renderMessageContent,
} from '../../utils/supportMediaUtils';

interface AdminSupportTabProps {
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminSupportTab: React.FC<AdminSupportTabProps> = ({ onShowToast }) => {
  const { t, language, isRTL } = useApp();
  const [conversations, setConversations] = useState<SupportConversationSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<SupportMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'active' | 'all'>('active');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<SupportAttachment | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<SupportQuotedMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Admin Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string | React.ReactNode;
    variant: ConfirmationVariant;
    confirmText?: string;
    details?: { label: string; value: string }[];
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'danger',
    onConfirm: () => {},
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuMessageId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Load conversation summaries and subscribe to real-time events
  const refreshData = () => {
    const list = SupportService.getConversationSummaries();
    setConversations(list);

    if (selectedUserId) {
      const msgs = SupportService.getMessagesForUser(selectedUserId);
      setActiveMessages(msgs);
      setIsUserBlocked(SupportService.isUserBlocked(selectedUserId));
      // Auto-clear unread badge upon viewing
      SupportService.markMessagesAsRead(selectedUserId, 'admin');
    }
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = SupportService.subscribe(() => {
      refreshData();
    });
    return () => {
      unsubscribe();
    };
  }, [selectedUserId]);

  // Select first conversation by default on desktop if none selected
  useEffect(() => {
    if (!selectedUserId && conversations.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
      const firstActive = conversations.find((c) => c.lastMessage) || conversations[0];
      if (firstActive) {
        setSelectedUserId(firstActive.userId);
        const msgs = SupportService.getMessagesForUser(firstActive.userId);
        setActiveMessages(msgs);
        setIsUserBlocked(SupportService.isUserBlocked(firstActive.userId));
        SupportService.markMessagesAsRead(firstActive.userId, 'admin');
      }
    }
  }, [conversations, selectedUserId]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (selectedUserId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages, selectedUserId]);

  const handleSelectConversation = (uid: string) => {
    setSelectedUserId(uid);
    setShowMobileChat(true);
    const msgs = SupportService.getMessagesForUser(uid);
    setActiveMessages(msgs);
    setIsUserBlocked(SupportService.isUserBlocked(uid));
    // Clear unread badge immediately
    SupportService.markMessagesAsRead(uid, 'admin');
    setTimeout(() => replyInputRef.current?.focus(), 150);
  };

  const handleBackToMobileList = () => {
    setShowMobileChat(false);
    setSelectedUserId(null);
  };

  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId) return;
    const trimmed = replyText.trim();
    if ((!trimmed && !pendingAttachment) || isSending || isCompressing) return;

    try {
      setIsSending(true);
      SupportService.sendMessage(
        selectedUserId,
        'admin',
        trimmed,
        pendingAttachment || undefined,
        replyingTo || undefined
      );
      setReplyText('');
      setPendingAttachment(null);
      setReplyingTo(null);
      const updated = SupportService.getMessagesForUser(selectedUserId);
      setActiveMessages(updated);
      refreshData();
      onShowToast(language === 'ar' ? 'تم إرسال الرد بنجاح' : 'Response sent successfully', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Error sending reply', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // 3-dots actions & Quoted reply handlers
  const handleCopyMessage = async (msg: SupportMessage) => {
    const textToCopy = msg.message || (msg.attachment ? msg.attachment.url : '');
    if (!textToCopy) return;
    const ok = await copyTextToClipboard(textToCopy);
    if (ok) {
      onShowToast(t('support.copySuccess') || (language === 'ar' ? 'تم نسخ نص الرسالة إلى الحافظة' : 'Message copied to clipboard'), 'success');
    } else {
      onShowToast(language === 'ar' ? 'تعذر نسخ النص' : 'Failed to copy text', 'error');
    }
  };

  const handleStartReply = (msg: SupportMessage) => {
    const senderName =
      msg.sender_type === 'admin'
        ? (t('support.admin') || (language === 'ar' ? 'الدعم الفني' : 'Support Team'))
        : (selectedConversation?.userName || 'User');

    setReplyingTo({
      id: msg.id,
      sender_type: msg.sender_type,
      sender_name: senderName,
      message: msg.message || '',
      attachment_type: msg.attachment?.type,
      attachment_name: msg.attachment?.name,
    });
    setTimeout(() => replyInputRef.current?.focus(), 120);
  };

  const handleScrollToMessage = (targetId: string) => {
    const el = document.getElementById(`support-admin-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedMessageId(targetId);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    } else {
      onShowToast(t('support.originalMessageNotFound') || (language === 'ar' ? 'تعذر العثور على الرسالة الأصلية في هذه المحادثة' : 'Original message not found in this chat'), 'info');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;

    try {
      setIsCompressing(true);
      const attachment = await processSupportFile(file);
      setPendingAttachment(attachment);
    } catch (err) {
      console.error('Failed to process attachment', err);
      onShowToast(language === 'ar' ? 'تعذر معالجة الملف المرفق' : 'Failed to process attachment', 'error');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Hard Delete Handlers with Admin Confirmation Modal
  const handleRequestDeleteConversation = () => {
    if (!selectedConversation || !selectedUserId) return;
    setConfirmModal({
      isOpen: true,
      title: t('support.deleteEntireConversation') || (language === 'ar' ? 'حذف محادثة الدعم الفني بالكامل' : 'Delete Entire Support Conversation'),
      description:
        language === 'ar'
          ? `هل أنت متأكد من رغبتك في حذف محادثة الدعم الفني بالكامل مع "${selectedConversation.userName}"؟ سيتم مسح كافة الرسائل والمرفقات نهائياً وفورياً للطرفين دون إمكانية استرجاعها.`
          : `Are you sure you want to permanently delete this entire chat conversation with "${selectedConversation.userName}"? All messages and attachments will be wiped permanently without placeholders.`,
      variant: 'danger',
      confirmText: language === 'ar' ? 'حذف المحادثة نهائياً' : 'Delete Conversation',
      details: [
        { label: language === 'ar' ? 'المستخدم' : 'User', value: selectedConversation.userName },
        { label: language === 'ar' ? 'عدد الرسائل' : 'Messages Count', value: String(activeMessages.length) },
      ],
      onConfirm: () => {
        SupportService.deleteEntireConversation(selectedUserId);
        setActiveMessages([]);
        refreshData();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onShowToast(t('support.deleteConversationSuccess') || (language === 'ar' ? 'تم حذف المحادثة بالكامل بنجاح' : 'Conversation permanently deleted'), 'info');
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setShowMobileChat(false);
          setSelectedUserId(null);
        }
      },
    });
  };

  const handleRequestDeleteMessage = (msg: SupportMessage) => {
    setConfirmModal({
      isOpen: true,
      title: t('support.deleteMessage') || (language === 'ar' ? 'حذف الرسالة نهائياً' : 'Hard Delete Message'),
      description:
        t('support.deleteMessageConfirm') ||
        (language === 'ar'
          ? 'هل أنت متأكد من رغبتك في حذف هذه الرسالة نهائياً؟ سيتم مسحها فوراً من شاشة المستخدم والمشرف دون ترك أي أثر أو نص بديل.'
          : 'Are you sure you want to permanently delete this message? It will be removed immediately from both user and admin view without placeholders.'),
      variant: 'danger',
      confirmText: language === 'ar' ? 'حذف الرسالة' : 'Delete Message',
      details: [
        {
          label: language === 'ar' ? 'المرسل' : 'Sender',
          value: msg.sender_type === 'admin' ? (t('support.admin') || 'Support') : selectedConversation?.userName || 'User',
        },
        {
          label: language === 'ar' ? 'المحتوى' : 'Content',
          value: msg.message || (msg.attachment ? msg.attachment.name : (language === 'ar' ? 'مرفق' : 'Attachment')),
        },
      ],
      onConfirm: () => {
        SupportService.deleteMessage(msg.id);
        if (selectedUserId) {
          setActiveMessages(SupportService.getMessagesForUser(selectedUserId));
        }
        refreshData();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onShowToast(t('support.deleteMessageSuccess') || (language === 'ar' ? 'تم حذف الرسالة نهائياً' : 'Message permanently deleted'), 'info');
      },
    });
  };

  const handleRequestToggleBlockUser = () => {
    if (!selectedUserId || !selectedConversation) return;
    const willBlock = !isUserBlocked;
    setConfirmModal({
      isOpen: true,
      title: willBlock
        ? (t('support.blockUser') || (language === 'ar' ? 'حظر المستخدم من الدعم الفني' : 'Block User from Support'))
        : (t('support.unblockUser') || (language === 'ar' ? 'إلغاء حظر المستخدم من الدعم الفني' : 'Lift Support Restriction')),
      description: willBlock
        ? (language === 'ar'
          ? `هل أنت متأكد من رغبتك في تقييد وحظر المستخدم "${selectedConversation.userName}" من إرسال أي رسائل إلى الدعم الفني؟`
          : `Are you sure you want to restrict "${selectedConversation.userName}" from messaging technical support?`)
        : (language === 'ar'
          ? `هل أنت متأكد من رغبتك في رفع الحظر وتمكين "${selectedConversation.userName}" من مراسلة الدعم الفني مجدداً؟`
          : `Are you sure you want to lift support restrictions for "${selectedConversation.userName}"?`),
      variant: willBlock ? 'danger' : 'warning',
      confirmText: willBlock
        ? (language === 'ar' ? 'حظر المستخدم' : 'Block User')
        : (language === 'ar' ? 'إلغاء الحظر' : 'Lift Restriction'),
      details: [
        { label: language === 'ar' ? 'المستخدم' : 'User', value: selectedConversation.userName },
        { label: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: selectedConversation.userEmail || selectedConversation.userId },
      ],
      onConfirm: () => {
        const newStatus = SupportService.toggleUserBlock(selectedUserId);
        setIsUserBlocked(newStatus);
        refreshData();
        AuditService.logAction({
          action: newStatus ? 'BAN_USER' : 'UNBAN_USER',
          targetType: 'profile',
          targetId: selectedUserId,
          targetTitle: selectedConversation.userName || selectedUserId,
          contentUrl: `#/admin/support/${selectedUserId}`,
          details: {
            reason: newStatus ? 'Blocked from live technical support messaging' : 'Unblocked from live technical support',
          },
        });
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onShowToast(
          newStatus
            ? (t('support.userBlockedSuccess') || (language === 'ar' ? 'تم حظر المستخدم بنجاح' : 'User blocked successfully'))
            : (t('support.userUnblockedSuccess') || (language === 'ar' ? 'تم إلغاء حظر المستخدم بنجاح' : 'User unblocked successfully')),
          newStatus ? 'info' : 'success'
        );
      },
    });
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // Mode filter: active has messages, all includes directory
    if (filterMode === 'active' && !c.lastMessage) return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = c.userName?.toLowerCase().includes(q);
    const emailMatch = c.userEmail?.toLowerCase().includes(q);
    const lastMsgMatch = c.lastMessage?.message.toLowerCase().includes(q);
    return Boolean(nameMatch || emailMatch || lastMsgMatch);
  });

  const selectedConversation = conversations.find((c) => c.userId === selectedUserId);

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      id="admin-support-container"
      className="bg-white dark:bg-[#182232] rounded-2xl border border-slate-200 dark:border-[#2A384C] shadow-sm overflow-hidden flex flex-col h-[750px] max-h-[85vh] w-full max-w-full"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Container Header */}
      <div className="px-3.5 sm:px-5 py-3 border-b border-slate-200 dark:border-[#2A384C] bg-slate-50/80 dark:bg-[#131B26]/80 flex items-center justify-between gap-3 shrink-0 w-full max-w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
              <span>{t('support.adminTitle')}</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-mono shrink-0">
                {conversations.filter((c) => c.unreadCount > 0).length}{' '}
                {language === 'ar' ? 'غير مقروء' : 'Unread'}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {language === 'ar'
                ? 'نظام الدعم الفني والمراسلة المباشرة مع كافة مستخدمي المنصة'
                : 'Real-time 1-on-1 user technical support system'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{language === 'ar' ? 'المراسلة المباشرة نشطة' : 'Real-Time Sync Active'}</span>
          </span>
        </div>
      </div>

      {/* WhatsApp Web Split Layout */}
      <div className="flex-1 flex overflow-hidden relative w-full max-w-full">
        {/* Left Side: Contacts / Chats List
            - Small screens (< md): ONLY shown when no user selected (showMobileChat is false)
            - Tablet/Desktop (>= md): Always shown as side-by-side list (w-80 or lg:w-96)
        */}
        <div
          id="admin-support-sidebar"
          className={`w-full md:w-80 lg:w-96 border-r rtl:border-r-0 rtl:border-l border-slate-200 dark:border-[#2A384C] flex flex-col bg-slate-50/50 dark:bg-[#131B26]/50 shrink-0 overflow-hidden ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Bar & Tabs */}
          <div className="p-3 border-b border-slate-200 dark:border-[#2A384C] space-y-2.5 bg-white dark:bg-[#182232]">
            <div className="relative">
              <Search
                className={`w-4 h-4 text-slate-400 absolute ${
                  isRTL ? 'right-3' : 'left-3'
                } top-1/2 -translate-y-1/2`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('support.searchPlaceholder')}
                className={`w-full ${
                  isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                } py-2 bg-slate-100 dark:bg-[#131B26] border border-slate-200 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500`}
              />
            </div>

            {/* Filter Tabs: Active Chats vs All Users Directory */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-[#131B26] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('active')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterMode === 'active'
                    ? 'bg-white dark:bg-[#182232] text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('support.activeChats')}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                  {conversations.filter((c) => c.lastMessage).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-[#182232] text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t('support.allUsers')}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                  {conversations.length}
                </span>
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">{t('support.noChats')}</p>
                {searchQuery && (
                  <p className="text-[11px] mt-1 text-slate-400">
                    {language === 'ar' ? 'جرّب كلمة بحث أخرى' : 'Try another search query'}
                  </p>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedUserId === conv.userId;
                return (
                  <button
                    key={conv.userId}
                    onClick={() => handleSelectConversation(conv.userId)}
                    className={`w-full p-3 flex items-start gap-3 transition-colors text-left rtl:text-right cursor-pointer relative ${
                      isSelected
                        ? 'bg-orange-50/80 dark:bg-orange-950/30 border-l-4 rtl:border-l-0 rtl:border-r-4 border-orange-500'
                        : 'hover:bg-slate-100/70 dark:hover:bg-[#182232]/70'
                    }`}
                  >
                    {/* User Avatar with initials or preset */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-sm border border-slate-200 dark:border-[#2A384C]">
                        {conv.userName.slice(0, 2).toUpperCase()}
                      </div>
                      {conv.isBlocked && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] shadow-xs">
                          <Ban className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Chat Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {conv.userName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {conv.lastMessage ? formatTimestamp(conv.lastMessage.created_at) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {conv.lastMessage ? (
                            <span>
                              <strong className="font-semibold text-slate-600 dark:text-slate-300">
                                {conv.lastMessage.sender_type === 'admin' ? `${t('support.you')}: ` : ''}
                              </strong>
                              {conv.lastMessage.message}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">{t('support.startConversation')}</span>
                          )}
                        </p>

                        {/* Unread Red Badge */}
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      {conv.isBlocked && (
                        <div className="mt-1">
                          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                            {t('support.userBlockedBadge')}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: WhatsApp Main Conversation Area
            - Desktop: always on right
            - Mobile: full-screen when chat is open
        */}
        <div
          id="admin-support-chat-pane"
          className={`flex-1 flex flex-col bg-white dark:bg-[#182232] min-w-0 w-full max-w-full overflow-x-hidden ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConversation ? (
            <>
              {/* Active Conversation Header */}
              <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 dark:border-[#2A384C] bg-slate-50/60 dark:bg-[#131B26]/60 flex items-center justify-between gap-2.5 shrink-0 w-full max-w-full overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={handleBackToMobileList}
                    className="md:hidden p-1.5 -ml-1 rtl:-ml-0 rtl:-mr-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
                    aria-label="Back to contacts list"
                    title={language === 'ar' ? 'الرجوع لقائمة المستخدمين' : 'Back to users'}
                  >
                    {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  </button>

                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-xs sm:text-sm border border-slate-200 dark:border-[#2A384C] shrink-0">
                    {selectedConversation.userName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {selectedConversation.userName}
                      </h3>
                      {isUserBlocked && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 shrink-0">
                          {t('support.userBlockedBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                      <span className="truncate max-w-[150px] sm:max-w-xs">{selectedConversation.userEmail || selectedConversation.userId}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                        {t('support.online')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Delete Entire Conversation Button */}
                  <button
                    type="button"
                    onClick={handleRequestDeleteConversation}
                    title={t('support.deleteEntireConversation') || (language === 'ar' ? 'حذف المحادثة بالكامل نهائياً' : 'Delete Entire Conversation')}
                    aria-label="Delete entire conversation"
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{language === 'ar' ? 'حذف المحادثة' : 'Delete Chat'}</span>
                  </button>

                  {/* User Block Toggle Button */}
                  <button
                    type="button"
                    onClick={handleRequestToggleBlockUser}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isUserBlocked
                        ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isUserBlocked ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('support.unblockUser')}</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('support.blockUser')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Blocked Alert Banner if User is Blocked */}
              {isUserBlocked && (
                <div className="px-3.5 sm:px-4 py-2 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/40 flex items-center justify-between text-xs text-red-700 dark:text-red-300 w-full max-w-full overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span className="truncate">{t('support.blockedNotice')}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium opacity-80 shrink-0 ml-2">
                    {language === 'ar' ? 'الرسائل معطلة' : 'Restricted'}
                  </span>
                </div>
              )}

              {/* Active Conversation Messages Area */}
              <div
                id="admin-active-messages-container"
                className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-3.5 bg-slate-50/40 dark:bg-[#101722]/50 w-full max-w-full"
              >
                {activeMessages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 px-4">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-orange-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {t('support.noMessagesYet')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      {language === 'ar'
                        ? 'يمكنك كمسؤول بدء المراسلة وإرسال رسالة مباشرة لهذا المستخدم في أي وقت'
                        : 'As an administrator, you have full freedom to initiate messages to any user at any time'}
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isAdmin = msg.sender_type === 'admin';
                    const isHighlighted = highlightedMessageId === msg.id;
                    const isMenuOpen = openMenuMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        id={`support-admin-msg-${msg.id}`}
                        className={`flex flex-col max-w-full ${isAdmin ? 'items-end' : 'items-start'} transition-all duration-300`}
                      >
                        {/* Bubble Sender Label */}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 px-1 mb-0.5 max-w-full truncate">
                          {isAdmin ? t('support.admin') : selectedConversation.userName}
                        </div>

                        {/* Message Row with Bubble and 3-dots action menu */}
                        <div
                          className={`relative group flex items-end gap-1.5 max-w-[92%] sm:max-w-[80%] ${
                            isAdmin ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {/* Chat Bubble */}
                          <div
                            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xs text-xs sm:text-sm break-words whitespace-pre-wrap overflow-hidden transition-all duration-300 ${
                              isAdmin
                                ? `bg-orange-500 dark:bg-orange-600 text-white rounded-2xl ${
                                    isRTL ? 'rounded-bl-xs' : 'rounded-br-xs'
                                  }`
                                : `bg-sky-500 dark:bg-sky-600 text-white rounded-2xl ${
                                    isRTL ? 'rounded-br-xs' : 'rounded-bl-xs'
                                  }`
                            } ${
                              isHighlighted
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
                              <div className="mb-2 max-w-full overflow-hidden">
                                {msg.attachment.type === 'image' ? (
                                  <div className="relative group rounded-xl overflow-hidden bg-black/10 max-w-full">
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name}
                                      onClick={() => setPreviewImage(msg.attachment!.url)}
                                      className="max-h-56 sm:max-h-60 w-auto max-w-full rounded-xl object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                    />
                                    <div className="flex items-center justify-between text-[10px] p-1 text-white/90 bg-black/30 backdrop-blur-xs">
                                      <span className="truncate max-w-[120px] sm:max-w-[140px] font-mono">{msg.attachment.name}</span>
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
                                    className="flex items-center gap-2.5 p-2 rounded-xl bg-black/15 hover:bg-black/25 text-white transition-colors max-w-full overflow-hidden"
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

                            {/* Message Content with Auto-Linked URLs */}
                            {msg.message && (
                              <p className="leading-relaxed break-words">
                                {renderMessageContent(msg.message)}
                              </p>
                            )}
                          </div>

                          {/* 3-dots Menu Button */}
                          <div className="relative shrink-0 mb-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuMessageId(isMenuOpen ? null : msg.id);
                              }}
                              title={language === 'ar' ? 'خيارات الرسالة' : 'Message options'}
                              aria-label="Message options"
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-opacity cursor-pointer opacity-70 sm:opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* 3-dots Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute bottom-full mb-1 z-30 w-36 py-1 bg-white dark:bg-[#151D2A] border border-slate-200 dark:border-[#2A384C] rounded-xl shadow-xl text-xs font-medium animate-in fade-in ${
                                  isAdmin ? (isRTL ? 'right-0' : 'left-0') : (isRTL ? 'left-0' : 'right-0')
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

                                {/* Delete Option (Admin Hard Delete) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMessageId(null);
                                    handleRequestDeleteMessage(msg);
                                  }}
                                  className="w-full px-3 py-1.5 text-start flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer border-t border-slate-100 dark:border-[#243142] mt-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{language === 'ar' ? 'حذف نهائي' : 'Delete'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Date and Timestamp beneath every message bubble */}
                        <div className="flex items-center gap-1.5 px-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>{formatTimestamp(msg.created_at)}</span>
                          {isAdmin && (
                            <span>
                              {msg.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-orange-400 inline" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Reply Input Bar */}
              <div className="p-2.5 sm:p-4 border-t border-slate-200 dark:border-[#2A384C] bg-white dark:bg-[#182232] shrink-0 w-full max-w-full overflow-hidden">
                {/* Quoted Message Preview Bar (Replying state) */}
                {replyingTo && (
                  <div className="mb-2 p-2 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border-s-4 border-orange-500 flex items-center justify-between gap-2 max-w-full overflow-hidden">
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
                  <div className="mb-2.5 p-2 rounded-xl bg-slate-100 dark:bg-[#131B26] border border-slate-200 dark:border-[#2A384C] flex items-center justify-between gap-2 max-w-full overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {pendingAttachment.type === 'image' ? (
                        <img
                          src={pendingAttachment.url}
                          alt={pendingAttachment.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      )}
                      <div className="min-w-0 text-xs">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px] sm:max-w-xs">
                            {pendingAttachment.name}
                          </p>
                          {pendingAttachment.mimeType === 'image/webp' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
                              WEBP
                            </span>
                          )}
                        </div>
                        {pendingAttachment.size && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            {formatBytes(pendingAttachment.size)}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      title={t('support.removeAttachment')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-[#182232] transition-colors cursor-pointer shrink-0"
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

                {/* Fast Response Quick Templates */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-1.5 text-xs max-w-full">
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {language === 'ar' ? 'رد سريع:' : 'Quick:'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyText(
                        language === 'ar'
                          ? 'أهلاً بك، تم استلام طلبك وجارٍ التحقق منه بدقة.'
                          : 'Hello, your inquiry has been received and is being processed.'
                      )
                    }
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 dark:bg-[#131B26] hover:bg-orange-100 dark:hover:bg-orange-950/40 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors whitespace-nowrap text-[10px] sm:text-[11px] shrink-0"
                  >
                    {language === 'ar' ? 'استلام الطلب' : 'Received'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyText(
                        language === 'ar'
                          ? 'تم حل المشكلة وتحديث الإعدادات بنجاح. شكراً لتواصلك معنا.'
                          : 'The issue has been resolved and settings updated. Thank you for reaching out.'
                      )
                    }
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 dark:bg-[#131B26] hover:bg-orange-100 dark:hover:bg-orange-950/40 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors whitespace-nowrap text-[10px] sm:text-[11px] shrink-0"
                  >
                    {language === 'ar' ? 'تم الحل بنجاح' : 'Resolved'}
                  </button>
                </div>

                <form onSubmit={handleSendAdminReply} className="flex items-end gap-1.5 sm:gap-2 w-full max-w-full">
                  {/* Hidden Admin File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.txt,.doc,.docx,.json,.zip"
                    onChange={handleFileChange}
                    disabled={isSending || isCompressing}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isCompressing}
                    title={t('support.attachMedia')}
                    aria-label={t('support.attachMedia')}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131B26] dark:hover:bg-[#1e293b] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <textarea
                    ref={replyInputRef}
                    id="admin-reply-input"
                    rows={1}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAdminReply();
                      }
                    }}
                    placeholder={
                      language === 'ar'
                        ? `الرد على ${selectedConversation.userName}...`
                        : `Reply to ${selectedConversation.userName}...`
                    }
                    className="flex-1 min-w-0 max-h-32 min-h-[40px] sm:min-h-[44px] px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-[#131B26] border border-slate-300 dark:border-[#2A384C] rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none transition-all"
                  />

                  <button
                    type="submit"
                    id="admin-send-reply-btn"
                    disabled={(!replyText.trim() && !pendingAttachment) || isSending || isCompressing}
                    className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    <span className="hidden sm:inline">{t('support.send')}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State on Desktop when no chat is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 dark:bg-[#101722]/50">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 shadow-sm">
                <Headphones className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t('support.adminTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                {t('support.selectChat')}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] text-slate-600 dark:text-slate-400 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>{language === 'ar' ? 'اختر أي مستخدم من الدليل لبدء مراسلته مباشرة' : 'Pick any user from the directory to start chatting'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Image Lightbox Viewer Modal */}
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

      {/* Unified Admin Confirmation Modal */}
      <AdminConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        details={confirmModal.details}
      />
    </div>
  );
};
