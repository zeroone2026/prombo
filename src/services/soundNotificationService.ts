import { safeStorage } from '../utils/securityUtils';
import { AuthService } from './authService';
import { getSupabaseClient } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { BrowserNotificationService } from './browserNotificationService';

export type SoundNotificationType =
  | 'sound_prompt_published'
  | 'sound_new_post'
  | 'sound_post_reply'
  | 'sound_user_mention'
  | 'sound_support_message';

export interface SoundPreferences {
  promptPublished: boolean; // 🔔 إشعار نشر برومبت جديد / Updates
  newPost: boolean;          // 💬 إشعار منشور جديد في المجتمع / Community
  postReply: boolean;        // 📩 إشعار رد على منشوراتي / Replies
  userMention: boolean;      // 🏷️ إشعار الإشارة باسمك (@) / Mentions
  supportMessages: boolean;  // 🎧 إشعارات الدعم الفني المباشر / Support
}

export interface SoundNotificationPayload {
  type: SoundNotificationType;
  actorId?: string;
  actorName?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  targetAuthorName?: string;
  mentionedUsernames?: string[];
  content?: string;
  promptId?: string;
  promptTitle?: string;
  postId?: string;
  timestamp?: string;
}

const STORAGE_KEY_SOUND_PREFERENCES = 'prombo_sound_preferences_v1';
const BROADCAST_CHANNEL_NAME = 'prombo_audio_notifications_v1';
const SUPABASE_CHANNEL_NAME = 'prombo_realtime_notifications';

const DEFAULT_PREFERENCES: SoundPreferences = {
  promptPublished: true,
  newPost: true,
  postReply: true,
  userMention: true,
  supportMessages: true,
};

/**
 * Web Audio API Synthesizer
 * Generates delicate, premium harmonic chimes and tones without relying on external MP3 assets.
 */
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    if (this.isUnlocked) return;
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else if (ctx && ctx.state === 'running') {
      this.isUnlocked = true;
    }
  }

  /**
   * 1. New Public Prompt: Warm, crystalline ascending chime (C5 - E5 - G5 - C6 arpeggio)
   */
  public playPromptPublished() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });
  }

  /**
   * 2. New Community Post / Main Prompt Activity: Modern subtle bubble pop
   */
  public playNewPost() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * 3. Direct Reply to User's Post: Warm, polite two-tone notification (E5 -> A5)
   */
  public playPostReply() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();

    const now = ctx.currentTime;
    const notes = [659.25, 880.00]; // E5, A5
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  /**
   * 4. Direct @Mention Notification: Shimmering tri-tone alert (G5 -> B5 -> E6 with harmonic)
   */
  public playUserMention() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();

    const now = ctx.currentTime;
    const notes = [784.00, 987.77, 1318.51]; // G5, B5, E6
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      oscHarmonic.start(startTime);
      osc.stop(startTime + 0.38);
      oscHarmonic.stop(startTime + 0.38);
    });
  }

  /**
   * 5. Support Message: Crisp dual-frequency ascending chime (D5 -> A5)
   */
  public playSupportMessage() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();

    const now = ctx.currentTime;
    const notes = [587.33, 880.00]; // D5, A5
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }
}

/**
 * Checks if a specific username is referenced with @ in content or mentioned list
 */
export function isUserMentionedInContent(userName: string | undefined, content: string | undefined, list?: string[]): boolean {
  if (!userName || !content) return false;
  const target = userName.trim().toLowerCase();

  // 1. Direct match in passed mentioned usernames array
  if (list && list.some((m) => m.trim().toLowerCase() === target)) {
    return true;
  }

  // 2. Direct regex search for @name (supports spaces or handles)
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`@${escaped}(?=[\\s,.:;!?)]|$)`, 'i');
  if (pattern.test(content)) {
    return true;
  }

  // 3. Match first name if multi-word (e.g. "Ahmed" from "Ahmed Al-Najjar")
  const firstWord = target.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 3) {
    const escapedFirst = firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const firstWordPattern = new RegExp(`@${escapedFirst}(?=[\\s,.:;!?)]|$)`, 'i');
    if (firstWordPattern.test(content)) {
      return true;
    }
  }

  return false;
}

/**
 * SoundNotificationService Singleton
 */
class SoundNotificationManager {
  private synthesizer = new SoundSynthesizer();
  private broadcastChannel: BroadcastChannel | null = null;
  private supabaseRealtimeChannel: RealtimeChannel | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * Initializes autoplay bypass listeners and cross-tab/cross-client realtime channels
   */
  public init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // 1. Autoplay unlock: listen once on first click / tap / keydown
    const unlockHandler = () => {
      this.synthesizer.unlock();
      window.removeEventListener('click', unlockHandler, true);
      window.removeEventListener('touchstart', unlockHandler, true);
      window.removeEventListener('keydown', unlockHandler, true);
    };
    window.addEventListener('click', unlockHandler, { capture: true, passive: true, once: true });
    window.addEventListener('touchstart', unlockHandler, { capture: true, passive: true, once: true });
    window.addEventListener('keydown', unlockHandler, { capture: true, passive: true, once: true });

    // 2. BroadcastChannel for instant multi-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (e) => {
          if (e.data && e.data.type) {
            this.handleIncomingNotification(e.data as SoundNotificationPayload, true);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported in this environment', err);
      }
    }

    // 3. Local window custom event listener
    window.addEventListener('prombo_notification_event', ((e: CustomEvent<SoundNotificationPayload>) => {
      if (e.detail) {
        this.handleIncomingNotification(e.detail, false);
      }
    }) as EventListener);

    // 4. Supabase Realtime Channel
    this.setupSupabaseRealtime();
  }

  private setupSupabaseRealtime() {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      this.supabaseRealtimeChannel = supabase.channel(SUPABASE_CHANNEL_NAME);
      this.supabaseRealtimeChannel
        .on('broadcast', { event: 'notification' }, ({ payload }) => {
          if (payload && payload.type) {
            this.handleIncomingNotification(payload as SoundNotificationPayload, true);
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Supabase realtime notification channel subscription failed:', err);
    }
  }

  /**
   * Retrieve stored sound preferences from safeStorage with defaults
   */
  public getPreferences(): SoundPreferences {
    const raw = safeStorage.getItem(STORAGE_KEY_SOUND_PREFERENCES);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    try {
      const parsed = JSON.parse(raw);
      return {
        promptPublished: typeof parsed.promptPublished === 'boolean' ? parsed.promptPublished : true,
        newPost: typeof parsed.newPost === 'boolean' ? parsed.newPost : true,
        postReply: typeof parsed.postReply === 'boolean' ? parsed.postReply : true,
        userMention: typeof parsed.userMention === 'boolean' ? parsed.userMention : true,
        supportMessages: typeof parsed.supportMessages === 'boolean' ? parsed.supportMessages : true,
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Update preferences and persist in safeStorage
   */
  public updatePreferences(updates: Partial<SoundPreferences>): SoundPreferences {
    const current = this.getPreferences();
    const updated: SoundPreferences = {
      ...current,
      ...updates,
    };
    safeStorage.setItem(STORAGE_KEY_SOUND_PREFERENCES, JSON.stringify(updated));

    // Dispatch event to notify components (e.g. AuthDrawer)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_sound_preferences_change', { detail: updated }));
    }
    return updated;
  }

  /**
   * Toggle a specific preference
   */
  public togglePreference(key: keyof SoundPreferences): boolean {
    const current = this.getPreferences();
    const newValue = !current[key];
    this.updatePreferences({ [key]: newValue });
    return newValue;
  }

  /**
   * Play tone by type with preference check, or forcePreview for drawer testing
   */
  public playSound(type: SoundNotificationType, forcePreview: boolean = false) {
    const prefs = this.getPreferences();

    if (!forcePreview) {
      if (type === 'sound_prompt_published' && !prefs.promptPublished) return;
      if (type === 'sound_new_post' && !prefs.newPost) return;
      if (type === 'sound_post_reply' && !prefs.postReply) return;
      if (type === 'sound_user_mention' && !prefs.userMention) return;
      if (type === 'sound_support_message' && !prefs.supportMessages) return;
    }

    switch (type) {
      case 'sound_prompt_published':
        this.synthesizer.playPromptPublished();
        break;
      case 'sound_new_post':
        this.synthesizer.playNewPost();
        break;
      case 'sound_post_reply':
        this.synthesizer.playPostReply();
        break;
      case 'sound_user_mention':
        this.synthesizer.playUserMention();
        break;
      case 'sound_support_message':
        this.synthesizer.playSupportMessage();
        break;
    }

    // When any of the 4 sound triggers fire, issue a native system browser notification via new Notification(title, options) if permission is granted
    if (!forcePreview && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        switch (type) {
          case 'sound_prompt_published':
            BrowserNotificationService.notifyPromptPublished({
              title: 'أمر ذكاء اصطناعي جديد في Prombo ⚡',
            });
            break;
          case 'sound_new_post':
            BrowserNotificationService.notifyNewPost({
              userName: 'عضو في المجتمع',
              content: 'تم نشر مشاركة جديدة في منتدى المجتمع 💬',
            });
            break;
          case 'sound_post_reply':
            BrowserNotificationService.notifyPostReply({
              actorName: 'مستخدم',
              content: 'قام أحد الأعضاء بالرد على منشورك 📩',
            });
            break;
          case 'sound_user_mention':
            BrowserNotificationService.notifyUserMention({
              actorName: 'مستخدم',
              content: 'تمت الإشارة إلى اسمك في مناقشة جديدة 🏷️',
            });
            break;
        }
      } catch (err) {
        console.warn('Native notification trigger failed:', err);
      }
    }
  }

  /**
   * Dispatch a notification event across local listeners, BroadcastChannel, and Supabase Realtime
   */
  public dispatchNotification(payload: SoundNotificationPayload) {
    const fullPayload: SoundNotificationPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // 1. Process locally for active tab
    this.handleIncomingNotification(fullPayload, false);

    // 2. Broadcast across tabs via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullPayload);
      } catch (err) {
        console.warn('Failed to broadcast notification via BroadcastChannel', err);
      }
    }

    // 3. Broadcast to Supabase Realtime channel if available
    if (this.supabaseRealtimeChannel) {
      try {
        this.supabaseRealtimeChannel.send({
          type: 'broadcast',
          event: 'notification',
          payload: fullPayload,
        }).catch(() => {});
      } catch {
        // Safe ignore if socket is reconnecting
      }
    }
  }

  /**
   * Evaluate incoming notification against currentUser and sound preferences
   */
  private handleIncomingNotification(payload: SoundNotificationPayload, isRemote: boolean) {
    const currentUser = AuthService.getCurrentUser();
    const prefs = this.getPreferences();

    switch (payload.type) {
      case 'sound_prompt_published':
        // Triggers for all active users when an admin approves and publishes a new prompt
        if (prefs.promptPublished) {
          this.playSound('sound_prompt_published');
        }
        try {
          BrowserNotificationService.notifyPromptPublished({
            title: payload.promptTitle || 'أمر ذكاء اصطناعي جديد',
            author: payload.actorName || 'Prombo',
            id: payload.promptId,
          });
        } catch {}
        break;

      case 'sound_new_post':
        // Triggers when a user creates a new post in the Community feed or opens a new prompt thread on Main page
        if (prefs.newPost) {
          // If the action was performed by the user themselves locally, play sound to confirm or avoid duplicate
          this.playSound('sound_new_post');
        }
        // Notify others
        if (isRemote || (payload.actorId && currentUser && payload.actorId !== currentUser.id)) {
          try {
            BrowserNotificationService.notifyNewPost({
              userName: payload.actorName || 'عضو في المجتمع',
              content: payload.content || '',
              promptTitle: payload.promptTitle,
              id: payload.postId,
            });
          } catch {}
        }
        break;

      case 'sound_post_reply':
        // Triggers ONLY for the specific author/owner of a post or prompt when someone comments on their item
        if (currentUser) {
          const isActor = payload.actorId && payload.actorId === currentUser.id;
          if (isActor) break; // Don't notify self for own comment

          const isAuthorById = payload.targetUserId && payload.targetUserId === currentUser.id;
          const isAuthorByEmail =
            payload.targetUserEmail &&
            currentUser.email &&
            payload.targetUserEmail.toLowerCase() === currentUser.email.toLowerCase();
          const isAuthorByName =
            payload.targetAuthorName &&
            currentUser.name &&
            payload.targetAuthorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();

          if (isAuthorById || isAuthorByEmail || isAuthorByName) {
            if (prefs.postReply) {
              this.playSound('sound_post_reply');
            }
            try {
              BrowserNotificationService.notifyPostReply({
                actorName: payload.actorName || 'مستخدم',
                content: payload.content || '',
                id: payload.postId,
              });
            } catch {}
          }
        }
        break;

      case 'sound_user_mention':
        // Triggers ONLY for the specific user who was mentioned using @Username inside any comment
        if (currentUser) {
          const isActor = payload.actorId && payload.actorId === currentUser.id;
          if (isActor) break; // Don't notify self for mentioning self

          const isMentioned = isUserMentionedInContent(currentUser.name, payload.content, payload.mentionedUsernames);
          if (isMentioned) {
            if (prefs.userMention) {
              this.playSound('sound_user_mention');
            }
            try {
              BrowserNotificationService.notifyUserMention({
                actorName: payload.actorName || 'مستخدم',
                content: payload.content || '',
                id: payload.postId,
              });
            } catch {}
          }
        }
        break;
    }
  }

  // --- Convenience Notification Trigger Helpers ---

  /**
   * Triggered when an admin approves and publishes a prompt to the Main Feed
   */
  public notifyPromptPublished(prompt: { id: string; title: string; author?: string; authorId?: string }) {
    this.dispatchNotification({
      type: 'sound_prompt_published',
      promptId: prompt.id,
      promptTitle: prompt.title,
      actorName: 'Admin',
    });
  }

  /**
   * Triggered when a new top-level community post or main prompt activity is created
   */
  public notifyNewPost(post: { id: string; userId: string; userName: string; content: string; promptId?: string; promptTitle?: string }) {
    this.dispatchNotification({
      type: 'sound_new_post',
      postId: post.id,
      actorId: post.userId,
      actorName: post.userName,
      content: post.content,
      promptId: post.promptId,
      promptTitle: post.promptTitle,
    });
  }

  /**
   * Triggered when a comment or reply is posted
   * Handles both direct reply to post/prompt author AND direct @Mentions
   */
  public notifyCommentOrReply(params: {
    commentId: string;
    actorId: string;
    actorName: string;
    content: string;
    targetUserId?: string;
    targetUserEmail?: string;
    targetAuthorName?: string;
    promptId?: string;
    promptTitle?: string;
    postId?: string;
    isTopLevelPost?: boolean;
  }) {
    const {
      commentId,
      actorId,
      actorName,
      content,
      targetUserId,
      targetUserEmail,
      targetAuthorName,
      promptId,
      promptTitle,
      postId,
      isTopLevelPost,
    } = params;

    // 1. Check for @Mention triggers
    if (content.includes('@')) {
      this.dispatchNotification({
        type: 'sound_user_mention',
        postId: postId || commentId,
        actorId,
        actorName,
        content,
        promptId,
        promptTitle,
      });
    }

    // 2. Direct Reply Trigger (if this is a reply to an existing post or comment on a prompt)
    if (!isTopLevelPost && (targetUserId || targetUserEmail || targetAuthorName)) {
      this.dispatchNotification({
        type: 'sound_post_reply',
        postId: postId || commentId,
        actorId,
        actorName,
        targetUserId,
        targetUserEmail,
        targetAuthorName,
        content,
        promptId,
        promptTitle,
      });
    } else if (isTopLevelPost) {
      // Top-level community post
      this.notifyNewPost({
        id: commentId,
        userId: actorId,
        userName: actorName,
        content,
        promptId,
        promptTitle,
      });
    }
  }
}

export const SoundNotificationService = new SoundNotificationManager();
