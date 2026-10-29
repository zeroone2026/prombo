import { CommunityPost, SiteSettings, CommunityUser } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { safeStorage } from '../utils/securityUtils';
import { DEFAULT_AVATAR_URL, isAdminUser } from '../utils/authUtils';
import { AnalyticsService } from './analyticsService';
import { SoundNotificationService } from './soundNotificationService';
import { UserNotificationService } from './userNotificationService';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { AuthService } from './authService';

const POSTS_STORAGE_KEY = 'prombo_community_posts_v1';
const LIKES_STORAGE_KEY = 'prombo_community_likes_v1';
const SETTINGS_STORAGE_KEY = 'prombo_community_settings_v1';

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  communityEnabled: true,
  allowGuestViewing: true,
  requireAuthForComments: true,
};

// Initial Seed Posts for rich community experience
const SEED_POSTS: CommunityPost[] = [
  {
    id: 'post-seed-1',
    userId: 'user-ahmed-1',
    userName: 'أحمد النجار (Vibe Architect)',
    userEmail: 'ahmed@prombo.ai',
    userAvatar: DEFAULT_AVATAR_URL,
    promptId: 'prompt-1',
    promptTitle: 'Full-Stack Next.js 15 & Supabase SaaS Blueprint',
    promptCategory: 'vibe-coding',
    promptModel: 'Claude 3.7 Sonnet / Cursor',
    content: 'جربت هذا البرومبت مع Cursor و Claude 3.7 Sonnet وكانت النتيجة خيالية! بنى الـ Architecture كاملة مع RLS Policies و Zustand بدون أي خطأ في الـ Types. أنصح بإضافة المتغيرات المخصصة.',
    parentId: null,
    likesCount: 19,
    repliesCount: 2,
    isPinned: true,
    isLikedByMe: false,
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    replies: [
      {
        id: 'reply-seed-1',
        userId: 'user-sara-2',
        userName: 'سارة المهندس',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        content: 'فعلاً مذهل! هل قمت بتجربته مع Windsurf أيضاً أم Cursor فقط؟',
        parentId: 'post-seed-1',
        likesCount: 5,
        repliesCount: 0,
        status: 'active',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'reply-seed-2',
        userId: 'user-ahmed-1',
        userName: 'أحمد النجار (Vibe Architect)',
        userAvatar: DEFAULT_AVATAR_URL,
        content: 'يعمل بكفاءة متطابقة في Windsurf Cascade و Cursor Composer.',
        parentId: 'post-seed-1',
        likesCount: 3,
        repliesCount: 0,
        status: 'active',
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'post-seed-2',
    userId: 'user-tariq-3',
    userName: 'طارق الدوسري',
    userEmail: 'tariq@example.com',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    promptId: 'prompt-4',
    promptTitle: 'High-Converting SaaS Landing Page Copy Engine',
    promptCategory: 'copywriting',
    promptModel: 'GPT-4.5 / Claude 3.5 Sonnet',
    content: 'ما هو أفضل نموذج جربتموه لكتابة إعلانات تيك توك و سناب شات باستخدام هذا الأمر؟',
    parentId: null,
    likesCount: 8,
    repliesCount: 1,
    isPinned: false,
    isLikedByMe: false,
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    replies: [
      {
        id: 'reply-seed-3',
        userId: 'user-mona-4',
        userName: 'منى الكواري',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        content: 'Claude 3.5 Sonnet يعطي نتائج أكثر عاطفية وجاذبية للجمهور الخليجي والعربي.',
        parentId: 'post-seed-2',
        likesCount: 4,
        repliesCount: 0,
        status: 'active',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ],
  },
];

export const CommunityService = {
  /**
   * Get Site Settings (Community Switch)
   */
  getSiteSettings(): SiteSettings {
    try {
      const stored = safeStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading community settings', e);
    }
    return DEFAULT_SITE_SETTINGS;
  },

  /**
   * Save Site Settings
   */
  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = this.getSiteSettings();
    const updated: SiteSettings = { ...current, ...settings };
    safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    // Sync to Supabase `site_settings`
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('site_settings')
          .upsert([{ key: 'community_config', value: updated, updated_at: new Date().toISOString() }]);
      } catch (err) {
        console.warn('Failed to sync site settings to Supabase', err);
      }
    }

    window.dispatchEvent(new CustomEvent('prombo_community_settings_change', { detail: updated }));
    return updated;
  },

  /**
   * Get stored likes map for current user
   */
  getUserLikes(): Record<string, boolean> {
    try {
      const stored = safeStorage.getItem(LIKES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {};
  },

  /**
   * Save user likes map
   */
  saveUserLikes(likes: Record<string, boolean>): void {
    safeStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
  },

  /**
   * Get all local posts (with nested replies hierarchy)
   */
  getLocalPosts(): CommunityPost[] {
    try {
      const stored = safeStorage.getItem(POSTS_STORAGE_KEY);
      if (stored) {
        const posts: CommunityPost[] = JSON.parse(stored);
        if (posts.length > 0) return posts;
      }
    } catch {}
    safeStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(SEED_POSTS));
    return SEED_POSTS;
  },

  /**
   * Save local posts
   */
  saveLocalPosts(posts: CommunityPost[]): void {
    safeStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: posts }));
    }
  },

  /**
   * Fetch all Community Posts (Hierarchical with replies) - delegates to StorageService for unified cache & realtime
   */
  async getPosts(options?: { promptId?: string }): Promise<CommunityPost[]> {
    return StorageService.fetchCommunityPosts(options);
  },

  /**
   * Alias for fetchCommunityPosts
   */
  async fetchCommunityPosts(options?: { promptId?: string }): Promise<CommunityPost[]> {
    return StorageService.fetchCommunityPosts(options);
  },

  /**
   * Subscribe to live postgres_changes for community posts
   */
  subscribeToCommunityPosts(callback: (posts: CommunityPost[]) => void): () => void {
    return StorageService.subscribeToCommunityPosts(callback);
  },

  /**
   * Fetch a single post by ID (with nested replies, checking Supabase & local cache)
   */
  async getPostById(postId: string): Promise<CommunityPost | null> {
    const cleanId = (postId || '').trim();
    if (!cleanId) return null;

    const supabase = getSupabaseClient();
    const userLikes = this.getUserLikes();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();

        if (!error && data) {
          // Fetch replies
          const { data: repliesData } = await supabase
            .from('community_posts')
            .select('*')
            .eq('parent_id', cleanId)
            .order('created_at', { ascending: true });

          const replies: CommunityPost[] = (repliesData || []).map((r: any) => ({
            id: r.id,
            userId: r.user_id || 'anonymous',
            userName: r.user_name || 'Member',
            userEmail: r.user_email || undefined,
            userAvatar: r.user_avatar || undefined,
            promptId: r.prompt_id || undefined,
            content: r.content,
            parentId: r.parent_id || null,
            likesCount: Number(r.likes_count) || 0,
            repliesCount: Number(r.replies_count) || 0,
            isPinned: Boolean(r.is_pinned),
            isLikedByMe: !!userLikes[r.id],
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            replies: [],
          }));

          const post: CommunityPost = {
            id: data.id,
            userId: data.user_id || 'anonymous',
            userName: data.user_name || 'Member',
            userEmail: data.user_email || undefined,
            userAvatar: data.user_avatar || undefined,
            promptId: data.prompt_id || undefined,
            content: data.content,
            parentId: data.parent_id || null,
            likesCount: Number(data.likes_count) || 0,
            repliesCount: Number(data.replies_count) || 0,
            isPinned: Boolean(data.is_pinned),
            isLikedByMe: !!userLikes[data.id],
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            replies,
          };
          return post;
        }
      } catch (err) {
        console.warn('Supabase getPostById error:', err);
      }
    }

    // Local fallback
    const all = this.getLocalPosts();
    const local = all.find((p) => p.id === cleanId);
    if (local) {
      return {
        ...local,
        isLikedByMe: !!userLikes[local.id],
        replies: (local.replies || []).map((r) => ({
          ...r,
          isLikedByMe: !!userLikes[r.id],
        })),
      };
    }

    return null;
  },

  /**
   * Create a new post or reply
   */
  async createPost(params: {
    user: CommunityUser;
    content: string;
    promptId?: string;
    promptTitle?: string;
    promptCategory?: string;
    promptModel?: string;
    parentId?: string | null;
    images?: string[];
    videos?: string[];
    videoUrl?: string;
    mediaType?: 'none' | 'image' | 'video' | 'mixed';
  }): Promise<CommunityPost> {
    // Centralized Action Guardrail: Strict verified user session enforcement
    const activeSession = AuthService.getCurrentUser();
    if (!activeSession || activeSession.isGuest || !activeSession.id) {
      throw new Error('Authentication required: Registration is required to publish community posts or replies.');
    }
    if (activeSession.isBanned) {
      throw new Error('Account restricted: Full restriction is applied to this account.');
    }
    if (activeSession.isCommunityBanned) {
      throw new Error('Account restricted: Community ban is applied to this account.');
    }

    const now = new Date().toISOString();
    const newPostId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prior moderation check:
    // 1. Admins are automatically approved and published as 'active'.
    // 2. If prior moderation is disabled, posts publish directly as 'active'.
    // 3. For members: text discussions publish as 'active' so discussions flow smoothly;
    //    if prior moderation is enabled AND media is attached, hold for moderation ('pending').
    const isAdmin = activeSession.role === 'admin' || isAdminUser(activeSession);
    const contentSettings = StorageService.getContentMediaSettings();
    const hasMedia = Boolean(
      (params.images && params.images.length > 0) ||
      (params.videos && params.videos.length > 0) ||
      params.videoUrl
    );

    const initialStatus: 'active' | 'pending' = (isAdmin || !contentSettings.priorModerationEnabled || !hasMedia)
      ? 'active'
      : 'pending';

    const newPost: CommunityPost = {
      id: newPostId,
      userId: activeSession.id,
      userName: activeSession.name || 'Member',
      userEmail: activeSession.email,
      userAvatar: activeSession.avatar,
      promptId: params.promptId,
      promptTitle: params.promptTitle,
      promptCategory: params.promptCategory,
      promptModel: params.promptModel,
      content: params.content.trim(),
      parentId: params.parentId || null,
      likesCount: 0,
      repliesCount: 0,
      isPinned: false,
      isLikedByMe: false,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      replies: [],
      images: params.images,
      videos: params.videos,
      videoUrl: params.videoUrl,
      mediaType: params.mediaType || (params.videos?.length || params.videoUrl ? 'video' : (params.images?.length ? 'image' : 'none')),
    };

    // 1. Update Local Posts Cache
    const localPosts = this.getLocalPosts();
    if (params.parentId) {
      // Add as nested reply
      const parentIndex = localPosts.findIndex((p) => p.id === params.parentId);
      if (parentIndex !== -1) {
        if (!localPosts[parentIndex].replies) localPosts[parentIndex].replies = [];
        localPosts[parentIndex].replies!.push(newPost);
        localPosts[parentIndex].repliesCount = (localPosts[parentIndex].repliesCount || 0) + 1;
      }
    } else {
      // Add top-level post
      localPosts.unshift(newPost);
    }
    this.saveLocalPosts(localPosts);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: localPosts }));
      window.dispatchEvent(new CustomEvent('prombo_post_created', { detail: newPost }));
    }

    // 2. Track Analytics Event
    AnalyticsService.trackEvent('comment_created', params.promptId || newPostId, {
      postId: newPostId,
      isReply: !!params.parentId,
    });

    // 3. Audio Sound Notifications Realtime Dispatch
    try {
      if (params.parentId) {
        // Direct reply to an existing post
        const parentPost = localPosts.find((p) => p.id === params.parentId);
        SoundNotificationService.notifyCommentOrReply({
          commentId: newPostId,
          actorId: params.user.id,
          actorName: params.user.name,
          content: params.content,
          targetUserId: parentPost?.userId,
          targetUserEmail: parentPost?.userEmail,
          targetAuthorName: parentPost?.userName,
          postId: params.parentId,
          promptId: params.promptId,
          promptTitle: params.promptTitle,
          isTopLevelPost: false,
        });
      } else if (params.promptId) {
        // Comment on a specific prompt
        const targetPrompt = StorageService.getPromptById(params.promptId);
        // Direct reply sound to the prompt author
        if (targetPrompt) {
          SoundNotificationService.notifyCommentOrReply({
            commentId: newPostId,
            actorId: params.user.id,
            actorName: params.user.name,
            content: params.content,
            targetUserId: targetPrompt.authorId || (targetPrompt as any).userId,
            targetUserEmail: targetPrompt.authorEmail,
            targetAuthorName: targetPrompt.author,
            promptId: targetPrompt.id,
            promptTitle: targetPrompt.title,
            isTopLevelPost: false,
          });
        }
        // Also trigger sound for new prompt thread / activity
        SoundNotificationService.notifyNewPost({
          id: newPostId,
          userId: params.user.id,
          userName: params.user.name,
          content: params.content,
          promptId: params.promptId,
          promptTitle: params.promptTitle,
        });
      } else {
        // Top-level community discussion post
        SoundNotificationService.notifyCommentOrReply({
          commentId: newPostId,
          actorId: params.user.id,
          actorName: params.user.name,
          content: params.content,
          isTopLevelPost: true,
        });
      }
    } catch (soundErr) {
      console.warn('Audio notification trigger failed:', soundErr);
    }

    // 4. Sync to Supabase `community_posts`
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('community_posts').insert([
          {
            id: newPostId,
            user_id: activeSession.id,
            user_name: activeSession.name || 'Member',
            user_email: activeSession.email || null,
            user_avatar: activeSession.avatar || null,
            prompt_id: params.promptId || null,
            prompt_title: params.promptTitle || null,
            prompt_category: params.promptCategory || null,
            prompt_model: params.promptModel || null,
            content: params.content.trim(),
            parent_id: params.parentId || null,
            images: params.images || [],
            videos: params.videos || [],
            video_url: params.videoUrl || null,
            media_type: newPost.mediaType || 'none',
            status: initialStatus,
          },
        ]);
      } catch (err) {
        console.warn('Supabase post insert failed', err);
      }
    }

    // 5. Centrally log action to Audit Log System
    try {
      let action: any = 'CREATE_POST';
      let targetType: any = 'post';
      let targetTitle = params.content.trim().slice(0, 65);
      let contentUrl = `https://prombo.app/#post-${newPostId}`;

      if (params.parentId) {
        if (params.promptId) {
          action = 'ADD_NESTED_REPLY';
          targetType = 'reply';
          targetTitle = `رد فرعي: ${params.content.trim().slice(0, 60)}`;
          contentUrl = `https://prombo.app/#prompt-${params.promptId}-reply-${newPostId}`;
        } else {
          action = 'ADD_REPLY';
          targetType = 'reply';
          targetTitle = `رد على منشور: ${params.content.trim().slice(0, 60)}`;
          contentUrl = `https://prombo.app/#reply-${newPostId}`;
        }
      } else if (params.promptId) {
        // New folder comments/posts logged as a single unified action
        action = 'CREATE_COMMENT_POST';
        targetType = 'comment';
        targetTitle = `${params.promptTitle || 'مجلد البرومبت'}: ${params.content.trim().slice(0, 60)}`;
        contentUrl = `https://prombo.app/#prompt-${params.promptId}-comment-${newPostId}`;
      }

      AuditService.logAction({
        action,
        userId: params.user.id,
        userName: params.user.name,
        userEmail: params.user.email,
        userAvatar: params.user.avatar,
        targetId: newPostId,
        targetType,
        targetTitle,
        contentUrl,
        details: {
          promptId: params.promptId,
          promptTitle: params.promptTitle,
          parentId: params.parentId,
        },
      }).catch((e) => console.warn('AuditLog notice [createPost]:', e));
    } catch (auditErr) {
      console.warn('AuditLog exception [createPost]:', auditErr);
    }

    return newPost;
  },

  /**
   * Toggle Like on a Post or Reply
   */
  async toggleLike(postId: string, userId: string): Promise<{ isLiked: boolean; newLikesCount: number }> {
    // Centralized Action Guardrail: Strict guest restriction
    const activeUser = AuthService.getCurrentUser();
    if (!activeUser || activeUser.isGuest || !activeUser.id) {
      throw new Error('Authentication required: Registration is required to like posts or comments.');
    }
    if (activeUser.isBanned) {
      throw new Error('Account restricted: Banned users cannot interact or like content.');
    }

    const userLikes = this.getUserLikes();
    const currentlyLiked = !!userLikes[postId];
    const newLikedState = !currentlyLiked;

    userLikes[postId] = newLikedState;
    if (!newLikedState) delete userLikes[postId];
    this.saveUserLikes(userLikes);

    let calculatedCount = 0;

    // Update Local Cache
    const localPosts = this.getLocalPosts();
    let found = false;

    // Check top-level
    for (const p of localPosts) {
      if (p.id === postId) {
        p.likesCount = Math.max(0, p.likesCount + (newLikedState ? 1 : -1));
        p.isLikedByMe = newLikedState;
        calculatedCount = p.likesCount;
        found = true;
        break;
      }
      // Check replies
      if (p.replies) {
        for (const rep of p.replies) {
          if (rep.id === postId) {
            rep.likesCount = Math.max(0, rep.likesCount + (newLikedState ? 1 : -1));
            rep.isLikedByMe = newLikedState;
            calculatedCount = rep.likesCount;
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    this.saveLocalPosts(localPosts);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: localPosts }));
      window.dispatchEvent(
        new CustomEvent('prombo_post_liked', {
          detail: { postId, isLiked: newLikedState, newLikesCount: calculatedCount },
        })
      );
    }

    // Track like event
    AnalyticsService.trackEvent('like_toggle', postId, { isLiked: newLikedState });

    // Sync to Supabase `post_likes`
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        if (newLikedState) {
          await supabase.from('post_likes').upsert([{ post_id: postId, user_id: userId }]);
        } else {
          await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId });
        }
      } catch (err) {
        console.warn('Supabase toggleLike sync failed', err);
      }
    }

    return { isLiked: newLikedState, newLikesCount: calculatedCount };
  },

  /**
   * Edit post or reply content (Author only in public, or Admin in admin dashboard)
   */
  async editPost(
    postId: string,
    newContent: string,
    requestingUserId?: string,
    isAdmin: boolean = false,
    mediaUpdates?: {
      images?: string[];
      videos?: string[];
      videoUrl?: string;
      mediaType?: 'none' | 'image' | 'video' | 'mixed';
    }
  ): Promise<CommunityPost | null> {
    // Centralized Action Guardrail: Strict guest restriction
    const activeUser = AuthService.getCurrentUser();
    if (!activeUser || activeUser.isGuest || !activeUser.id) {
      throw new Error('Authentication required: Registration is required to edit posts or comments.');
    }
    if (activeUser.isBanned || activeUser.isCommunityBanned) {
      throw new Error('Account restricted: Banned users cannot edit content.');
    }

    const trimmed = newContent.trim();
    if (!trimmed) return null;

    const now = new Date().toISOString();
    const localPosts = this.getLocalPosts();
    let updatedPost: CommunityPost | null = null;

    // Check top level
    for (const post of localPosts) {
      if (post.id === postId) {
        if (requestingUserId && !isAdmin && post.userId !== requestingUserId) {
          console.warn(`CommunityService.editPost: unauthorized edit attempt on post ${postId} by user ${requestingUserId}`);
          return null;
        }
        post.content = trimmed;
        post.updatedAt = now;
        post.isEdited = true;
        if (mediaUpdates) {
          if (mediaUpdates.images !== undefined) post.images = mediaUpdates.images;
          if (mediaUpdates.videos !== undefined) post.videos = mediaUpdates.videos;
          if (mediaUpdates.videoUrl !== undefined) post.videoUrl = mediaUpdates.videoUrl;
          if (mediaUpdates.mediaType !== undefined) {
            post.mediaType = mediaUpdates.mediaType;
          } else {
            post.mediaType = post.videos?.length || post.videoUrl ? 'video' : (post.images?.length ? 'image' : 'none');
          }
        }
        updatedPost = post;
        break;
      }
      // Check replies
      if (post.replies) {
        for (const reply of post.replies) {
          if (reply.id === postId) {
            if (requestingUserId && !isAdmin && reply.userId !== requestingUserId) {
              console.warn(`CommunityService.editPost: unauthorized edit attempt on reply ${postId} by user ${requestingUserId}`);
              return null;
            }
            reply.content = trimmed;
            reply.updatedAt = now;
            reply.isEdited = true;
            if (mediaUpdates) {
              if (mediaUpdates.images !== undefined) reply.images = mediaUpdates.images;
              if (mediaUpdates.videos !== undefined) reply.videos = mediaUpdates.videos;
              if (mediaUpdates.videoUrl !== undefined) reply.videoUrl = mediaUpdates.videoUrl;
              if (mediaUpdates.mediaType !== undefined) {
                reply.mediaType = mediaUpdates.mediaType;
              } else {
                reply.mediaType = reply.videos?.length || reply.videoUrl ? 'video' : (reply.images?.length ? 'image' : 'none');
              }
            }
            updatedPost = reply;
            break;
          }
        }
      }
      if (updatedPost) break;
    }

    if (updatedPost) {
      this.saveLocalPosts(localPosts);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: localPosts }));
        window.dispatchEvent(new CustomEvent('prombo_post_updated', { detail: updatedPost }));
      }

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const updatePayload: any = {
            content: trimmed,
            updated_at: now,
          };
          if (mediaUpdates) {
            if (mediaUpdates.images !== undefined) updatePayload.images = mediaUpdates.images;
            if (mediaUpdates.videos !== undefined) updatePayload.videos = mediaUpdates.videos;
            if (mediaUpdates.videoUrl !== undefined) updatePayload.video_url = mediaUpdates.videoUrl;
            if (mediaUpdates.mediaType !== undefined) updatePayload.media_type = mediaUpdates.mediaType;
          }
          await supabase
            .from('community_posts')
            .update(updatePayload)
            .eq('id', postId);
        } catch (err) {
          console.warn('Supabase editPost failed', err);
        }
      }

      // Centrally audit post/comment editing
      AuditService.logAction({
        action: 'UPDATE_POST',
        userId: requestingUserId || updatedPost.userId,
        userName: updatedPost.userName,
        userEmail: updatedPost.userEmail,
        userAvatar: updatedPost.userAvatar,
        targetId: updatedPost.id,
        targetType: updatedPost.parentId ? 'reply' : (updatedPost.promptId ? 'comment' : 'post'),
        targetTitle: updatedPost.content.slice(0, 60) + (updatedPost.content.length > 60 ? '...' : ''),
        contentUrl: updatedPost.promptId
          ? `https://prombo.app/#prompt-${updatedPost.promptId}-comment-${updatedPost.id}`
          : `https://prombo.app/#post-${updatedPost.id}`,
        details: { wasEdited: true },
      }).catch((e) => console.warn('AuditLog notice [editPost]:', e));
    }

    return updatedPost;
  },

  /**
   * Delete post or reply (Author only in public, or Admin in admin dashboard)
   */
  async deletePost(postId: string, requestingUserId?: string, isAdmin: boolean = false): Promise<boolean> {
    // Centralized Action Guardrail: Strict guest restriction
    const activeUser = AuthService.getCurrentUser();
    if (!activeUser || activeUser.isGuest || !activeUser.id) {
      throw new Error('Authentication required: Registration is required to delete posts or comments.');
    }

    const localPosts = this.getLocalPosts();

    // Find target for audit details before deletion
    let deletedTarget: CommunityPost | undefined;
    for (const p of localPosts) {
      if (p.id === postId) {
        deletedTarget = p;
        break;
      }
      if (p.replies) {
        const r = p.replies.find((rep) => rep.id === postId);
        if (r) {
          deletedTarget = r;
          break;
        }
      }
    }

    // Verify ownership if requestingUserId is provided and not admin
    if (requestingUserId && !isAdmin) {
      let found = false;
      let isOwner = false;
      for (const p of localPosts) {
        if (p.id === postId) {
          found = true;
          isOwner = (p.userId === requestingUserId);
          break;
        }
        if (p.replies) {
          const r = p.replies.find((rep) => rep.id === postId);
          if (r) {
            found = true;
            isOwner = (r.userId === requestingUserId);
            break;
          }
        }
      }
      if (!found || !isOwner) {
        console.warn(`CommunityService.deletePost: unauthorized delete attempt on post ${postId} by user ${requestingUserId}`);
        return false;
      }
    }

    // Filter top level
    const updatedTop = localPosts.filter((p) => p.id !== postId);
    // Filter nested replies
    updatedTop.forEach((p) => {
      if (p.replies) {
        const originalLen = p.replies.length;
        p.replies = p.replies.filter((r) => r.id !== postId);
        if (p.replies.length !== originalLen) {
          p.repliesCount = p.replies.length;
        }
      }
    });
    this.saveLocalPosts(updatedTop);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: updatedTop }));
      window.dispatchEvent(new CustomEvent('prombo_post_deleted', { detail: { postId } }));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('community_posts').delete().eq('id', postId);
      } catch {}
    }

    // Centrally audit post/comment deletion
    AuditService.logAction({
      action: 'DELETE_POST',
      userId: requestingUserId || deletedTarget?.userId,
      userName: deletedTarget?.userName || 'مستخدم',
      userEmail: deletedTarget?.userEmail,
      userAvatar: deletedTarget?.userAvatar,
      targetId: postId,
      targetType: deletedTarget?.parentId ? 'reply' : (deletedTarget?.promptId ? 'comment' : 'post'),
      targetTitle: (deletedTarget?.content || 'منشور محذوف').slice(0, 60),
      contentUrl: `https://prombo.app/#post-${postId}`,
      details: { deletedBy: requestingUserId, isAdmin },
    }).catch((e) => console.warn('AuditLog notice [deletePost]:', e));

    return true;
  },

  /**
   * Toggle post or reply visibility status (active vs inactive)
   */
  async updatePostStatus(
    postId: string,
    newStatus: 'active' | 'inactive',
    requestingUserId?: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    const localPosts = this.getLocalPosts();
    let found = false;
    const now = new Date().toISOString();

    for (const p of localPosts) {
      if (p.id === postId) {
        if (requestingUserId && !isAdmin && p.userId !== requestingUserId) {
          console.warn(`CommunityService.updatePostStatus: unauthorized attempt on post ${postId} by user ${requestingUserId}`);
          return false;
        }
        p.status = newStatus;
        p.updatedAt = now;
        found = true;
        break;
      }
      if (p.replies) {
        const r = p.replies.find((rep) => rep.id === postId);
        if (r) {
          if (requestingUserId && !isAdmin && r.userId !== requestingUserId) {
            console.warn(`CommunityService.updatePostStatus: unauthorized attempt on reply ${postId} by user ${requestingUserId}`);
            return false;
          }
          r.status = newStatus;
          r.updatedAt = now;
          found = true;
          break;
        }
      }
    }

    if (found) {
      this.saveLocalPosts(localPosts);
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('community_posts').update({ status: newStatus, updated_at: now }).eq('id', postId);
        } catch (err) {
          console.warn('Supabase updatePostStatus failed', err);
        }
      }
      return true;
    }
    return false;
  },

  /**
   * Get all posts including inactive/hidden posts and their full hierarchy for Admin Content Management
   */
  getAllPostsForAdmin(): CommunityPost[] {
    return this.getLocalPosts();
  },

  /**
   * Get all pending posts for moderation queue
   */
  getPendingPosts(): CommunityPost[] {
    return this.getLocalPosts().filter((p) => p.status === 'pending');
  },

  /**
   * Approve and publish a pending post
   */
  async approvePost(postId: string, requestingAdminId?: string): Promise<boolean> {
    const localPosts = this.getLocalPosts();
    const post = localPosts.find((p) => p.id === postId);
    if (!post) return false;

    post.status = 'active';
    post.moderatedAt = new Date().toISOString();
    post.moderatedBy = requestingAdminId || 'admin';
    this.saveLocalPosts(localPosts);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: localPosts }));
      window.dispatchEvent(new CustomEvent('prombo_post_updated', { detail: post }));
    }

    // Notify post author
    if (post.userId) {
      try {
        UserNotificationService.notifyUser({
          userId: post.userId,
          userEmail: post.userEmail,
          type: 'moderation_approved',
          title: 'تمت الموافقة على مشاركتك',
          titleKey: 'notifPostApprovedTitle',
          message: `تم اعتماد ونشر مشاركتك في المجتمع بنجاح!`,
          messageKey: 'notifPostApprovedMsg',
          entityType: 'post',
          entityId: post.id,
        });
      } catch (err) {
        console.warn('Notification error on approvePost', err);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('community_posts')
          .update({
            status: 'active',
            rejection_reason: null,
            moderated_at: new Date().toISOString(),
            moderated_by: requestingAdminId || 'admin',
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);
      } catch {}
    }

    AuditService.logAction({
      action: 'UPDATE_SETTINGS',
      userId: requestingAdminId || 'admin',
      userName: 'إدارة المنصة',
      targetId: postId,
      targetType: 'post',
      targetTitle: post.content.slice(0, 50),
      details: { action: 'APPROVE_POST' },
    }).catch(() => {});

    return true;
  },

  /**
   * Reject a pending post with reason and notification
   */
  async rejectPost(postId: string, reason: string, requestingAdminId?: string): Promise<boolean> {
    const localPosts = this.getLocalPosts();
    const post = localPosts.find((p) => p.id === postId);
    if (!post) return false;

    post.status = 'rejected';
    post.rejectionReason = reason;
    post.moderatedAt = new Date().toISOString();
    post.moderatedBy = requestingAdminId || 'admin';
    this.saveLocalPosts(localPosts);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: localPosts }));
      window.dispatchEvent(new CustomEvent('prombo_post_deleted', { detail: { postId } }));
    }

    // Notify post author
    if (post.userId) {
      try {
        UserNotificationService.notifyUser({
          userId: post.userId,
          userEmail: post.userEmail,
          type: 'moderation_rejected',
          title: 'تم رفض نشر مشاركتك',
          titleKey: 'notifPostRejectedTitle',
          message: `نأسف، لم تتم الموافقة على نشر مشاركتك.`,
          messageKey: 'notifPostRejectedMsg',
          reason: reason,
          entityType: 'post',
          entityId: post.id,
        });
      } catch (err) {
        console.warn('Notification error on rejectPost', err);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('community_posts')
          .update({
            status: 'rejected',
            rejection_reason: reason,
            moderated_at: new Date().toISOString(),
            moderated_by: requestingAdminId || 'admin',
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);
      } catch {}
    }

    AuditService.logAction({
      action: 'UPDATE_SETTINGS',
      userId: requestingAdminId || 'admin',
      userName: 'إدارة المنصة',
      targetId: postId,
      targetType: 'post',
      targetTitle: post.content.slice(0, 50),
      details: { action: 'REJECT_POST', reason },
    }).catch(() => {});

    return true;
  },

  /**
   * Toggle post visibility (soft-hide or unhide)
   */
  async togglePostVisibility(postId: string, hide: boolean): Promise<boolean> {
    const localPosts = this.getLocalPosts();
    const post = localPosts.find((p) => p.id === postId);
    if (!post) return false;

    post.status = hide ? 'hidden' : 'active';
    post.updatedAt = new Date().toISOString();
    this.saveLocalPosts(localPosts);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('community_posts').update({ status: post.status, updated_at: post.updatedAt }).eq('id', postId);
      } catch {}
    }
    return true;
  },

  /**
   * Hard-delete a post and remove it permanently
   */
  async deletePostHard(postId: string): Promise<boolean> {
    return this.deletePost(postId, undefined, true);
  },

  /**
   * Pin/Unpin Post
   */
  async togglePinPost(postId: string, isPinned: boolean): Promise<boolean> {
    const localPosts = this.getLocalPosts();
    const post = localPosts.find((p) => p.id === postId);
    if (post) {
      post.isPinned = isPinned;
      this.saveLocalPosts(localPosts);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('community_posts').update({ is_pinned: isPinned }).eq('id', postId);
      } catch {}
    }
    return true;
  },

  /**
   * Pin/Unpin Reply to a Post (Author-pinned comment)
   */
  async togglePinReply(postId: string, replyId: string, isPinned: boolean): Promise<boolean> {
    const localPosts = this.getLocalPosts();
    const parentPost = localPosts.find((p) => p.id === postId);
    if (parentPost && parentPost.replies) {
      parentPost.replies.forEach((r) => {
        if (r.id === replyId) {
          r.isPinned = isPinned;
        } else if (isPinned) {
          // If pinning this reply, unpin other replies for this post so only 1 is pinned
          r.isPinned = false;
        }
      });
      this.saveLocalPosts(localPosts);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        if (isPinned) {
          await supabase.from('community_posts').update({ is_pinned: false }).eq('parent_id', postId);
        }
        await supabase.from('community_posts').update({ is_pinned: isPinned }).eq('id', replyId);
      } catch (err) {
        console.warn('Supabase togglePinReply error:', err);
      }
    }

    // Centrally audit reply pin / unpin
    try {
      const targetReply = parentPost?.replies?.find((r) => r.id === replyId);
      AuditService.logAction({
        action: isPinned ? 'PIN_REPLY' : 'UNPIN_REPLY',
        targetId: replyId,
        targetType: 'reply',
        targetTitle: isPinned
          ? `تثبيت الرد: ${(targetReply?.content || 'رد تقني').slice(0, 50)}`
          : `إلغاء تثبيت الرد: ${(targetReply?.content || 'رد').slice(0, 50)}`,
        contentUrl: `https://prombo.app/#reply-${replyId}`,
        details: { parentPostId: postId, isPinned },
      }).catch((e) => console.warn('AuditLog notice [togglePinReply]:', e));
    } catch (e) {
      console.warn('AuditLog exception [togglePinReply]:', e);
    }

    return true;
  },

  /**
   * Get Comments Count for a Specific Prompt
   */
  getCommentsCountForPrompt(promptId: string): number {
    const localPosts = this.getLocalPosts();
    return localPosts.filter((p) => p.promptId === promptId && p.status === 'active').length;
  },

  /**
   * Get Total Community Counts for Admin
   */
  getCommunityCounts(): { totalPosts: number; totalReplies: number; totalLikes: number } {
    const localPosts = this.getLocalPosts().filter((p) => p.status === 'active');
    let totalReplies = 0;
    let totalLikes = 0;

    localPosts.forEach((p) => {
      totalLikes += p.likesCount || 0;
      if (p.replies) {
        totalReplies += p.replies.length;
        p.replies.forEach((r) => {
          totalLikes += r.likesCount || 0;
        });
      }
    });

    return {
      totalPosts: localPosts.length,
      totalReplies,
      totalLikes,
    };
  },

  /**
   * Update Author Name & Avatar across all posts & replies for an updated user profile
   */
  async updateUserAuthorDetails(userId: string, newName: string, newAvatar: string): Promise<void> {
    const localPosts = this.getLocalPosts();
    let modified = false;

    const updated = localPosts.map((post) => {
      let postChanged = false;
      let p = { ...post };

      if (p.userId === userId) {
        p.userName = newName;
        p.userAvatar = newAvatar;
        postChanged = true;
        modified = true;
      }

      if (p.replies && p.replies.length > 0) {
        const newReplies = p.replies.map((reply) => {
          if (reply.userId === userId) {
            postChanged = true;
            modified = true;
            return {
              ...reply,
              userName: newName,
              userAvatar: newAvatar,
            };
          }
          return reply;
        });
        if (postChanged) {
          p.replies = newReplies;
        }
      }

      return postChanged ? p : post;
    });

    if (modified) {
      this.saveLocalPosts(updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prombo_post_created'));
        window.dispatchEvent(new CustomEvent('prombo_community_posts_change', { detail: updated }));
      }
    }

    // Sync in Supabase community_posts if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('community_posts')
          .update({
            user_name: newName,
            user_avatar: newAvatar,
          })
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Supabase post author update warning:', err);
      }
    }
  },
};
