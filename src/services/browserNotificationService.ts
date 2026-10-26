import { safeStorage } from '../utils/securityUtils';

export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

const BROWSER_NOTIF_PREF_KEY = 'prombo_browser_push_enabled_v1';

export interface PushNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  url?: string;
  onClick?: () => void;
}

class BrowserNotificationManager {
  private supported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.supported = 'Notification' in window;
    }
  }

  /**
   * Check if the browser supports Notification API
   */
  public isSupported(): boolean {
    return this.supported;
  }

  /**
   * Returns current native browser notification permission
   */
  public getPermission(): BrowserNotificationPermission {
    if (!this.supported || typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as BrowserNotificationPermission;
  }

  /**
   * Check if user enabled push notifications in app settings
   */
  public isPushEnabled(): boolean {
    const raw = safeStorage.getItem(BROWSER_NOTIF_PREF_KEY);
    // If not explicitly disabled and permission is granted, return true
    if (raw === null) {
      return this.getPermission() === 'granted';
    }
    return raw === 'true';
  }

  public isEnabled(): boolean {
    return this.isPushEnabled();
  }

  /**
   * Set user push notification preference toggle
   */
  public setPushEnabled(enabled: boolean): void {
    safeStorage.setItem(BROWSER_NOTIF_PREF_KEY, enabled ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prombo_browser_push_pref_change', { detail: { enabled } })
      );
    }
  }

  public toggleEnabled(): boolean {
    const next = !this.isPushEnabled();
    this.setPushEnabled(next);
    return next;
  }

  private firstInteractionBound: boolean = false;

  /**
   * Automatically invokes Notification.requestPermission() on the user's very first interaction
   * on the site (Click, Scroll, Navigation, Touch, or Copying a prompt) without requiring them
   * to toggle a switch first.
   */
  public initFirstInteractionPermissionRequest(): void {
    if (typeof window === 'undefined' || !this.supported || this.firstInteractionBound) return;
    if (this.getPermission() !== 'default') return;

    this.firstInteractionBound = true;

    const requestOnInteraction = async () => {
      // Detach listeners immediately
      window.removeEventListener('click', requestOnInteraction, true);
      window.removeEventListener('scroll', requestOnInteraction, true);
      window.removeEventListener('keydown', requestOnInteraction, true);
      window.removeEventListener('touchstart', requestOnInteraction, true);
      window.removeEventListener('prombo_copy_prompt', requestOnInteraction);

      if (this.getPermission() === 'default') {
        try {
          await this.requestPermission();
        } catch (err) {
          console.warn('Auto-request notification permission on interaction failed:', err);
        }
      }
    };

    window.addEventListener('click', requestOnInteraction, { capture: true, once: true });
    window.addEventListener('scroll', requestOnInteraction, { capture: true, once: true });
    window.addEventListener('keydown', requestOnInteraction, { capture: true, once: true });
    window.addEventListener('touchstart', requestOnInteraction, { capture: true, once: true });
    window.addEventListener('prombo_copy_prompt', requestOnInteraction, { once: true });
  }

  /**
   * Prompt user with browser permission dialog
   */
  public async requestPermission(): Promise<BrowserNotificationPermission> {
    if (!this.supported || typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        this.setPushEnabled(true);
      } else if (result === 'denied') {
        this.setPushEnabled(false);
      }
      window.dispatchEvent(
        new CustomEvent('prombo_browser_push_permission_change', { detail: { permission: result } })
      );
      return result as BrowserNotificationPermission;
    } catch (err) {
      console.warn('Notification permission request failed', err);
      return this.getPermission();
    }
  }

  /**
   * Dispatches a real native desktop/mobile browser banner notification
   */
  public sendNotification(payload: PushNotificationPayload): Notification | null {
    if (!this.supported || this.getPermission() !== 'granted' || !this.isPushEnabled()) {
      return null;
    }

    try {
      // Default icon using app favicon or SVG
      const icon = payload.icon || '/favicon.ico';
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon,
        tag: payload.tag || 'prombo-notification',
      });

      notification.onclick = () => {
        try {
          if (typeof window !== 'undefined') {
            window.focus();
          }
          if (payload.onClick) {
            payload.onClick();
          }
        } catch {}
        notification.close();
      };

      // Auto close after 7 seconds for clean UX
      setTimeout(() => {
        try {
          notification.close();
        } catch {}
      }, 7000);

      return notification;
    } catch (err) {
      console.warn('Native browser push notification display failed:', err);
      return null;
    }
  }

  /**
   * Convenience banner triggers for the 4 notification events
   */
  public notifyPromptPublished(prompt: { title: string; author?: string; id?: string }) {
    this.sendNotification({
      title: 'Prombo • أمر جديد منشور! ⚡',
      body: `"${prompt.title}" أصبح متاحاً الآن في المكتبة العامة!`,
      tag: `prompt-${prompt.id || Date.now()}`,
    });
  }

  public notifyNewPost(post: { userName: string; content: string; promptTitle?: string; id?: string }) {
    const snippet = post.content.length > 85 ? `${post.content.substring(0, 85)}...` : post.content;
    const context = post.promptTitle ? `على أمر: ${post.promptTitle}` : 'في منتدى المجتمع';
    this.sendNotification({
      title: `Prombo • منشور جديد من ${post.userName} 💬`,
      body: `${context}\n${snippet}`,
      tag: `post-${post.id || Date.now()}`,
    });
  }

  public notifyPostReply(reply: { actorName: string; content: string; postTitle?: string; id?: string }) {
    const snippet = reply.content.length > 85 ? `${reply.content.substring(0, 85)}...` : reply.content;
    this.sendNotification({
      title: `Prombo • رد جديد من ${reply.actorName} 📩`,
      body: snippet,
      tag: `reply-${reply.id || Date.now()}`,
    });
  }

  public notifyUserMention(mention: { actorName: string; content: string; id?: string }) {
    const snippet = mention.content.length > 85 ? `${mention.content.substring(0, 85)}...` : mention.content;
    this.sendNotification({
      title: `Prombo • تمت الإشارة إليك بواسطة @${mention.actorName} 🏷️`,
      body: snippet,
      tag: `mention-${mention.id || Date.now()}`,
    });
  }

  public notifySupportMessage(msg: { senderName: string; message: string; id?: string }) {
    const snippet = msg.message.length > 85 ? `${msg.message.substring(0, 85)}...` : msg.message;
    this.sendNotification({
      title: `Prombo • رسالة دعم فني جديدة من ${msg.senderName} 🎧`,
      body: snippet,
      tag: `support-${msg.id || Date.now()}`,
    });
  }
}

export const BrowserNotificationService = new BrowserNotificationManager();
