import {
  SupportMessage,
  SupportConversationSummary,
  SupportSenderType,
  SupportAttachment,
  SupportQuotedMessage,
} from '../types';
import { safeStorage } from '../utils/securityUtils';
import { AuthService } from './authService';
import { SoundNotificationService } from './soundNotificationService';

const SUPPORT_MESSAGES_KEY = 'prombo_support_messages_v1';
const SUPPORT_BLOCKED_USERS_KEY = 'prombo_support_blocked_users_v1';
const SUPPORT_READ_RECEIPTS_ENABLED_KEY = 'prombo_support_user_read_receipts_enabled_v1';

// Seed demo messages to provide an active, realistic WhatsApp-like experience right away
const SEED_SUPPORT_MESSAGES: SupportMessage[] = [
  {
    id: 'supp-msg-1',
    user_id: 'user-ahmed-1',
    sender_type: 'user',
    message: 'السلام عليكم، هل يمكن زيادة حد رفع الصور للأوامر إلى 5 ميجابايت بدلاً من 2؟',
    is_read: true,
    is_blocked: false,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'supp-msg-2',
    user_id: 'user-ahmed-1',
    sender_type: 'admin',
    message: 'أهلاً بك أحمد! تم استلام طلبك، يمكنك الآن ضبط الحد الأقصى من لوحة الإعدادات أو عبر قسم الصور المتقدم.',
    is_read: true,
    is_blocked: false,
    created_at: new Date(Date.now() - 3600000 * 22).toISOString(),
  },
  {
    id: 'supp-msg-3',
    user_id: 'user-ahmed-1',
    sender_type: 'user',
    message: 'ممتاز جداً! شكراً جزيلاً لسرعة الاستجابة والدعم.',
    is_read: false, // Unread for Admin
    is_blocked: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'supp-msg-4',
    user_id: 'user-sara-2',
    sender_type: 'user',
    message: 'مرحباً، أواجه صعوبة بسيطة في تصدير نسخة احتياطية من مكتبة البرومبتات، هل تتوفر صيغة CSV؟',
    is_read: true,
    is_blocked: false,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'supp-msg-5',
    user_id: 'user-sara-2',
    sender_type: 'admin',
    message: 'مرحباً سارة، حالياً ندعم تنسيق JSON عالي الدقة وسنضيف خيار تصدير واستيراد CSV في التحديث القادم بإذن الله.',
    is_read: false, // Unread for Sara
    is_blocked: false,
    created_at: new Date(Date.now() - 3600000 * 15).toISOString(),
  },
  {
    id: 'supp-msg-6',
    user_id: 'user-tariq-3',
    sender_type: 'user',
    message: 'السلام عليكم، المنصة ممتازة جداً ومفيدة في هندسة الأوامر. بارك الله في جهودكم.',
    is_read: true,
    is_blocked: false,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('prombo_support_realtime_v1');
  }
} catch (e) {
  console.warn('BroadcastChannel not available', e);
}

export const SupportService = {
  /**
   * Broadcast change event locally and across tabs
   */
  notifyChange(): void {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('prombo_support_messages_change'));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'MESSAGES_UPDATED', timestamp: Date.now() });
      }
    } catch (e) {
      console.warn('Error broadcasting support message event', e);
    }
  },

  /**
   * Get all messages from storage (or seed)
   */
  getAllMessages(): SupportMessage[] {
    try {
      const raw = safeStorage.getItem(SUPPORT_MESSAGES_KEY);
      if (!raw) {
        safeStorage.setItem(SUPPORT_MESSAGES_KEY, JSON.stringify(SEED_SUPPORT_MESSAGES));
        return SEED_SUPPORT_MESSAGES;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load support messages', e);
      return SEED_SUPPORT_MESSAGES;
    }
  },

  /**
   * Get all messages for a specific user ID
   */
  getMessagesForUser(userId: string): SupportMessage[] {
    if (!userId) return [];
    const all = this.getAllMessages();
    return all
      .filter((m) => m.user_id === userId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  /**
   * Send a support message (either from User or Admin)
   */
  sendMessage(
    userId: string,
    senderType: SupportSenderType,
    messageText: string,
    attachment?: SupportAttachment,
    replyTo?: SupportQuotedMessage
  ): SupportMessage {
    const trimmed = (messageText || '').trim();
    if (!trimmed && !attachment) {
      throw new Error('Message content or attachment is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    const isBlocked = this.isUserBlocked(userId);
    if (isBlocked && senderType === 'user') {
      throw new Error('USER_BLOCKED');
    }

    const newMessage: SupportMessage = {
      id: `supp-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      sender_type: senderType,
      message: trimmed,
      attachment,
      reply_to: replyTo,
      is_read: false,
      is_blocked: isBlocked,
      created_at: new Date().toISOString(),
    };

    const all = this.getAllMessages();
    all.push(newMessage);
    safeStorage.setItem(SUPPORT_MESSAGES_KEY, JSON.stringify(all));

    // Play subtle audio cue if sound notifications enabled
    try {
      SoundNotificationService.playSound('sound_post_reply', true);
    } catch {
      // safe ignore audio errors
    }

    this.notifyChange();
    return newMessage;
  },

  /**
   * Hard delete a single support message (Admin action)
   * Completely removes message from database/storage without placeholder text.
   */
  deleteMessage(messageId: string): boolean {
    if (!messageId) return false;
    const all = this.getAllMessages();
    const filtered = all.filter((m) => m.id !== messageId);
    if (filtered.length !== all.length) {
      safeStorage.setItem(SUPPORT_MESSAGES_KEY, JSON.stringify(filtered));
      this.notifyChange();
      return true;
    }
    return false;
  },

  /**
   * Hard delete an entire conversation for a specific user (Admin action)
   * Completely wipes all messages associated with the user.
   */
  deleteEntireConversation(userId: string): boolean {
    if (!userId) return false;
    const all = this.getAllMessages();
    const filtered = all.filter((m) => m.user_id !== userId);
    safeStorage.setItem(SUPPORT_MESSAGES_KEY, JSON.stringify(filtered));
    this.notifyChange();
    return true;
  },

  /**
   * Mark all messages in a conversation as read
   */
  markMessagesAsRead(userId: string, readerType: SupportSenderType): void {
    if (!userId) return;
    const all = this.getAllMessages();
    let hasChanges = false;

    const updated = all.map((m) => {
      if (m.user_id === userId && !m.is_read) {
        // If reader is user, mark admin messages as read
        if (readerType === 'user' && m.sender_type === 'admin') {
          hasChanges = true;
          return { ...m, is_read: true };
        }
        // If reader is admin, mark user messages as read
        if (readerType === 'admin' && m.sender_type === 'user') {
          hasChanges = true;
          return { ...m, is_read: true };
        }
      }
      return m;
    });

    if (hasChanges) {
      safeStorage.setItem(SUPPORT_MESSAGES_KEY, JSON.stringify(updated));
      this.notifyChange();
    }
  },

  /**
   * Get unread count for a regular user (unread responses from Admin)
   */
  getUnreadCountForUser(userId: string): number {
    if (!userId) return 0;
    const all = this.getAllMessages();
    return all.filter((m) => m.user_id === userId && m.sender_type === 'admin' && !m.is_read).length;
  },

  /**
   * Get total unread count for Admin across all users
   */
  getTotalUnreadCountForAdmin(): number {
    const all = this.getAllMessages();
    return all.filter((m) => m.sender_type === 'user' && !m.is_read).length;
  },

  /**
   * Get unread count sent by a specific user to Admin
   */
  getUnreadCountForAdminByUser(userId: string): number {
    if (!userId) return 0;
    const all = this.getAllMessages();
    return all.filter((m) => m.user_id === userId && m.sender_type === 'user' && !m.is_read).length;
  },

  /**
   * Check if a user is blocked from support messaging
   */
  isUserBlocked(userId: string): boolean {
    if (!userId) return false;
    try {
      const raw = safeStorage.getItem(SUPPORT_BLOCKED_USERS_KEY);
      if (!raw) return false;
      const map: Record<string, boolean> = JSON.parse(raw);
      return Boolean(map[userId]);
    } catch {
      return false;
    }
  },

  /**
   * Toggle block/unblock status for a user
   */
  setUserBlocked(userId: string, isBlocked: boolean): void {
    if (!userId) return;
    try {
      const raw = safeStorage.getItem(SUPPORT_BLOCKED_USERS_KEY);
      const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
      map[userId] = isBlocked;
      safeStorage.setItem(SUPPORT_BLOCKED_USERS_KEY, JSON.stringify(map));

      // Also update is_blocked in subsequent messages
      this.notifyChange();
    } catch (e) {
      console.error('Failed to update user block state', e);
    }
  },

  /**
   * Toggle user block and return the new block status
   */
  toggleUserBlock(userId: string): boolean {
    if (!userId) return false;
    const current = this.isUserBlocked(userId);
    const newStatus = !current;
    this.setUserBlocked(userId, newStatus);
    return newStatus;
  },

  /**
   * Check if user read receipts (double blue checks) are enabled by Admin
   * Admins ALWAYS see read status; users only see them if this is true.
   */
  isUserReadReceiptsEnabled(): boolean {
    return safeStorage.getItem(SUPPORT_READ_RECEIPTS_ENABLED_KEY) !== 'false';
  },

  /**
   * Toggle or set user read receipts setting (Admin control)
   */
  setUserReadReceiptsEnabled(enabled: boolean): void {
    safeStorage.setItem(SUPPORT_READ_RECEIPTS_ENABLED_KEY, enabled ? 'true' : 'false');
    this.notifyChange();
  },

  /**
   * Get conversation summaries for WhatsApp-style admin directory
   */
  getConversationSummaries(): SupportConversationSummary[] {
    const allMessages = this.getAllMessages();
    const profiles = AuthService.getAllProfiles();

    // Group messages by user_id
    const messagesByUser: Record<string, SupportMessage[]> = {};
    for (const msg of allMessages) {
      if (!messagesByUser[msg.user_id]) {
        messagesByUser[msg.user_id] = [];
      }
      messagesByUser[msg.user_id].push(msg);
    }

    // Combine users who have messages + all registered users
    const allUserIds = new Set<string>([
      ...Object.keys(messagesByUser),
      ...profiles.map((p) => p.id),
    ]);

    const summaries: SupportConversationSummary[] = [];

    allUserIds.forEach((uid) => {
      const userProfile = profiles.find((p) => p.id === uid);
      const userMsgs = messagesByUser[uid] || [];
      userMsgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const lastMessage = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : undefined;

      const unreadCount = userMsgs.filter((m) => m.sender_type === 'user' && !m.is_read).length;
      const isBlocked = this.isUserBlocked(uid);

      summaries.push({
        userId: uid,
        userName: userProfile ? userProfile.name : `User (${uid.slice(0, 8)})`,
        userEmail: userProfile?.email,
        userAvatar: userProfile?.avatar,
        isBlocked,
        unreadCount,
        lastMessage,
        updatedAt: lastMessage ? lastMessage.created_at : userProfile?.createdAt || new Date(0).toISOString(),
      });
    });

    // Sort: active conversations with recent messages first, then unread first, then by date
    return summaries.sort((a, b) => {
      // Prioritize unread messages
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

      // Then prioritize chats with messages
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  },

  /**
   * Subscribe to real-time events (local and cross-tab)
   */
  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleLocal = () => callback();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SUPPORT_MESSAGES_KEY || e.key === SUPPORT_BLOCKED_USERS_KEY) {
        callback();
      }
    };
    const handleBroadcast = (e: MessageEvent) => {
      if (e.data?.type === 'MESSAGES_UPDATED') {
        callback();
      }
    };

    window.addEventListener('prombo_support_messages_change', handleLocal);
    window.addEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }

    return () => {
      window.removeEventListener('prombo_support_messages_change', handleLocal);
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
    };
  },
};
