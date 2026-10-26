import { UserNotification } from '../types';
import { safeStorage } from '../utils/securityUtils';
import { SoundNotificationService } from './soundNotificationService';
import { BrowserNotificationService } from './browserNotificationService';

const STORAGE_KEY = 'prombo_user_notifications_v1';
const NOTIFICATION_EVENT = 'prombo_user_notification_added';

export class UserNotificationService {
  /**
   * Get all notifications stored locally with 30-day auto-expiry cleanup
   */
  public static getAllNotifications(): UserNotification[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: UserNotification[] = JSON.parse(raw);
      // Auto-Expiry Cleanup (30 Days): Filter out items older than 30 days
      const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const valid = parsed.filter((n) => {
        const time = new Date(n.createdAt).getTime();
        return !isNaN(time) && time >= cutoffTime;
      });
      // If any expired were pruned, update storage
      if (valid.length !== parsed.length) {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
      return valid;
    } catch {
      return [];
    }
  }

  /**
   * Save notifications to storage
   */
  private static saveNotifications(list: UserNotification[]): void {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save notifications', e);
    }
  }

  /**
   * Get notifications for a specific user or all if guest/unspecified
   */
  public static getUserNotifications(userId?: string, userEmail?: string): UserNotification[] {
    const all = this.getAllNotifications();
    if (!userId && !userEmail) {
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const cleanEmail = userEmail?.trim().toLowerCase();
    return all
      .filter((n) => {
        if (!n.userId && !n.userEmail) return true; // System/global notification
        if (userId && n.userId && n.userId === userId) return true;
        if (cleanEmail && n.userEmail && n.userEmail.toLowerCase() === cleanEmail) return true;
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get unread notifications count for a user
   */
  public static getUnreadCount(userId?: string, userEmail?: string): number {
    return this.getUserNotifications(userId, userEmail).filter((n) => !n.isRead).length;
  }

  /**
   * Add and dispatch a notification to a specific user
   */
  public static notifyUser(params: {
    userId: string;
    userEmail?: string;
    type: UserNotification['type'];
    title: string;
    message: string;
    reason?: string;
    entityType?: 'post' | 'prompt' | 'system';
    entityId?: string;
    titleKey?: string;
    messageKey?: string;
    messageParams?: Record<string, string | number>;
    reasonKey?: string;
  }): UserNotification {
    const notifications = this.getAllNotifications();

    const newNotification: UserNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: params.userId,
      userEmail: params.userEmail,
      type: params.type,
      title: params.title,
      message: params.message,
      reason: params.reason,
      entityType: params.entityType,
      entityId: params.entityId,
      createdAt: new Date().toISOString(),
      isRead: false,
      titleKey: params.titleKey,
      messageKey: params.messageKey,
      messageParams: params.messageParams,
      reasonKey: params.reasonKey,
    };

    notifications.unshift(newNotification);
    // Keep max 200 notifications to prevent unbounded growth
    if (notifications.length > 200) {
      notifications.length = 200;
    }
    this.saveNotifications(notifications);

    // Dispatch custom DOM event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(NOTIFICATION_EVENT, { detail: newNotification })
      );

      // Also dispatch a toast broadcast for active session
      window.dispatchEvent(
        new CustomEvent('prombo_show_toast', {
          detail: {
            message: `${newNotification.title}: ${newNotification.message}`,
            type: params.type === 'moderation_approved' ? 'success' : 'error',
          },
        })
      );
    }

    // Play chime sound
    try {
      if (params.type === 'moderation_approved') {
        SoundNotificationService.playSound('sound_prompt_published', true);
      } else {
        SoundNotificationService.playSound('sound_support_message', true);
      }
    } catch {}

    // Dispatch browser notification if allowed
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(params.title, {
          body: params.reason ? `${params.message} (${params.reason})` : params.message,
          icon: '/favicon.ico',
        });
      }
    } catch {}

    return newNotification;
  }

  /**
   * Mark a notification as read
   */
  public static markAsRead(notificationId: string): void {
    const list = this.getAllNotifications();
    const item = list.find((n) => n.id === notificationId);
    if (item) {
      item.isRead = true;
      this.saveNotifications(list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prombo_notifications_updated'));
      }
    }
  }

  /**
   * Mark all notifications as read for a user (or all if unspecified)
   */
  public static markAllAsRead(userId?: string, userEmail?: string): void {
    const list = this.getAllNotifications();
    const cleanEmail = userEmail?.trim().toLowerCase();
    let updated = false;
    list.forEach((n) => {
      if (!n.isRead) {
        if (!userId && !cleanEmail) {
          n.isRead = true;
          updated = true;
        } else if (
          (!n.userId && !n.userEmail) ||
          (userId && n.userId && n.userId === userId) ||
          (cleanEmail && n.userEmail && n.userEmail.toLowerCase() === cleanEmail)
        ) {
          n.isRead = true;
          updated = true;
        }
      }
    });
    if (updated) {
      this.saveNotifications(list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prombo_notifications_updated'));
      }
    }
  }

  /**
   * Delete a notification
   */
  public static deleteNotification(notificationId: string): void {
    const list = this.getAllNotifications().filter((n) => n.id !== notificationId);
    this.saveNotifications(list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_notifications_updated'));
    }
  }

  /**
   * Clear all notifications for a specific user (or all if unspecified)
   */
  public static clearAllNotifications(userId?: string, userEmail?: string): void {
    const list = this.getAllNotifications();
    const cleanEmail = userEmail?.trim().toLowerCase();
    const remaining = list.filter((n) => {
      if (!userId && !cleanEmail) return false;
      if (userId && n.userId && n.userId === userId) return false;
      if (cleanEmail && n.userEmail && n.userEmail.toLowerCase() === cleanEmail) return false;
      return true;
    });
    this.saveNotifications(remaining);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_notifications_updated'));
    }
  }

  /**
   * Subscribe to new notifications
   */
  public static subscribe(callback: (notification: UserNotification) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: any) => {
      if (e.detail) callback(e.detail);
    };
    window.addEventListener(NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handler);
  }
}
