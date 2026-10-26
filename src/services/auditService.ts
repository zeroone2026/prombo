import { AuditLogEntry, AuditLogAction, AuditLogFilterOptions, AuditLogTargetType, CommunityUser } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { safeStorage } from '../utils/securityUtils';
import { generateUserSlug, formatUserSlug, getUserProfileUrl, getContentUrl } from '../utils/slugUtils';

const AUDIT_LOGS_STORAGE_KEY = 'prombo_audit_logs_v1';
const CURRENT_USER_KEY = 'prombo_community_user_v1';

function getActiveUserFromStorage(): CommunityUser | null {
  try {
    const raw = safeStorage.getItem(CURRENT_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// Initial realistic seed audit logs for immediate admin monitoring
const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-seed-1',
    action: 'CREATE_PROMPT',
    userId: 'admin-prombo-1',
    userName: 'Prombo Admin',
    userEmail: 'admin@prombo.ai',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    userSlug: '@zero_oneone',
    userProfileUrl: 'https://prombo.app/user/@zero_oneone',
    targetId: 'prompt-nextjs-fullstack',
    targetType: 'prompt',
    targetTitle: 'مساعد تطوير برمجيات Full-Stack مع Next.js 15 و Tailwind CSS',
    contentUrl: 'https://prombo.app/prompt/prompt-nextjs-fullstack',
    details: { model: 'Claude 3.5 Sonnet', category: 'vibe-coding', status: 'approved' },
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 minutes ago
  },
  {
    id: 'audit-seed-2',
    action: 'CREATE_COMMENT_POST',
    userId: 'user-ahmed-1',
    userName: 'أحمد النجار',
    userEmail: 'ahmed@prombo.ai',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    userSlug: '@ahmed_alnajjar',
    userProfileUrl: 'https://prombo.app/user/@ahmed_alnajjar',
    targetId: 'post-comment-449',
    targetType: 'comment',
    targetTitle: 'مساعد تطوير برمجيات: برومبت ممتاز واستفدت منه في توليد مكونات React النظيفة',
    contentUrl: 'https://prombo.app/#prompt-nextjs-fullstack-comment-post-comment-449',
    details: { promptId: 'prompt-nextjs-fullstack', promptTitle: 'مساعد تطوير برمجيات Full-Stack' },
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 minutes ago
  },
  {
    id: 'audit-seed-3',
    action: 'PIN_REPLY',
    userId: 'user-sara-2',
    userName: 'سارة المهندس',
    userEmail: 'sara@example.com',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    userSlug: '@sara_almohandis',
    userProfileUrl: 'https://prombo.app/user/@sara_almohandis',
    targetId: 'reply-tech-solution-98',
    targetType: 'reply',
    targetTitle: 'تثبيت حل تقني للمشكلة في مناقشة أفضل ممارسات هندسة الأوامر',
    contentUrl: 'https://prombo.app/#reply-reply-tech-solution-98',
    details: { postId: 'post-discussion-88', isPinned: true },
    createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(), // 1 hour 25 mins ago
  },
  {
    id: 'audit-seed-4',
    action: 'UPDATE_PROFILE',
    userId: 'user-karim-3',
    userName: 'كريم فهمي',
    userEmail: 'karim@dev.io',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    userSlug: '@karim_fahmy',
    userProfileUrl: 'https://prombo.app/user/@karim_fahmy',
    targetId: 'user-karim-3',
    targetType: 'profile',
    targetTitle: 'تحديث بيانات الملف الشخصي والصورة الشخصية الرمزية',
    contentUrl: 'https://prombo.app/user/@karim_fahmy',
    details: { previousName: 'كريم', updatedField: 'full_name & avatar' },
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: 'audit-seed-5',
    action: 'UPDATE_PROMPT',
    userId: 'admin-prombo-1',
    userName: 'Prombo Admin',
    userEmail: 'admin@prombo.ai',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    userSlug: '@zero_oneone',
    userProfileUrl: 'https://prombo.app/user/@zero_oneone',
    targetId: 'prompt-gpt4-system-architect',
    targetType: 'prompt',
    targetTitle: 'مساعد بنية النظم السحابية Microservices: تحديث الوسوم والمتغيرات',
    contentUrl: 'https://prombo.app/prompt/prompt-gpt4-system-architect',
    details: { updatedFields: ['tags', 'variables', 'targetModel'] },
    createdAt: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
  },
  {
    id: 'audit-seed-6',
    action: 'ADD_REPLY',
    userId: 'user-layla-4',
    userName: 'ليلى العوضي',
    userEmail: 'layla@prompts.net',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    userSlug: '@layla_alawadi',
    userProfileUrl: 'https://prombo.app/user/@layla_alawadi',
    targetId: 'reply-clarification-104',
    targetType: 'reply',
    targetTitle: 'إضافة رد تفصيلي في مجتمع النقاش العام',
    contentUrl: 'https://prombo.app/#reply-reply-clarification-104',
    details: { parentPostId: 'post-discussion-88' },
    createdAt: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
  },
  {
    id: 'audit-seed-7',
    action: 'DELETE_POST',
    userId: 'admin-prombo-1',
    userName: 'Prombo Admin',
    userEmail: 'admin@prombo.ai',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    userSlug: '@zero_oneone',
    userProfileUrl: 'https://prombo.app/user/@zero_oneone',
    targetId: 'post-spam-violation-99',
    targetType: 'post',
    targetTitle: 'حذف منشور مخالف لسياسات النشر والمحتوى الإعلاني',
    contentUrl: 'https://prombo.app/#post-spam-violation-99',
    details: { reason: 'Violation of platform community standards' },
    createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
  },
];

/**
 * Maps database row (snake_case) to application AuditLogEntry (camelCase)
 */
function mapRowToEntry(row: any): AuditLogEntry {
  return {
    id: row.id,
    action: row.action as AuditLogAction,
    userId: row.user_id || undefined,
    userName: row.user_name || 'مستخدم غير معروف',
    userEmail: row.user_email || undefined,
    userAvatar: row.user_avatar || undefined,
    userSlug: row.user_slug || formatUserSlug(generateUserSlug(row.user_name, row.user_email)),
    userProfileUrl:
      row.user_profile_url ||
      getUserProfileUrl(row.user_slug || formatUserSlug(generateUserSlug(row.user_name, row.user_email))),
    targetId: row.target_id || undefined,
    targetType: (row.target_type || 'post') as AuditLogTargetType,
    targetTitle: row.target_title || 'محتوى غير معنون',
    contentUrl: row.content_url || (row.target_id ? getContentUrl(row.target_id) : 'https://prombo.app'),
    details: row.details || {},
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Maps application AuditLogEntry (camelCase) to database row (snake_case)
 */
function mapEntryToRow(entry: AuditLogEntry): Record<string, any> {
  return {
    id: entry.id,
    action: entry.action,
    user_id: entry.userId || null,
    user_name: entry.userName,
    user_email: entry.userEmail || null,
    user_avatar: entry.userAvatar || null,
    user_slug: entry.userSlug,
    user_profile_url: entry.userProfileUrl,
    target_id: entry.targetId || null,
    target_type: entry.targetType,
    target_title: entry.targetTitle,
    content_url: entry.contentUrl,
    details: entry.details || {},
    created_at: entry.createdAt,
  };
}

export const AuditService = {
  /**
   * Read audit logs from local cache (with fallback to seeds)
   */
  getLocalAuditLogs(): AuditLogEntry[] {
    try {
      const raw = safeStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed parsing local audit logs:', e);
    }

    // Default initialization
    safeStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(SEED_AUDIT_LOGS));
    return SEED_AUDIT_LOGS;
  },

  /**
   * Save audit logs to local cache (capping at 500 records)
   */
  saveLocalAuditLogs(logs: AuditLogEntry[]): void {
    try {
      const trimmed = logs.slice(0, 500);
      safeStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed saving local audit logs:', e);
    }
  },

  /**
   * Centrally log any state-changing platform action.
   * Dispatches to Supabase `audit_logs` table, updates local storage,
   * and emits a custom DOM event for instant live UI refresh.
   */
  async logAction(params: {
    action: AuditLogAction;
    userId?: string;
    userName?: string;
    userEmail?: string;
    userAvatar?: string;
    userSlug?: string;
    targetId?: string;
    targetType: AuditLogTargetType;
    targetTitle: string;
    contentUrl?: string;
    details?: Record<string, any>;
  }): Promise<AuditLogEntry> {
    const activeUser = getActiveUserFromStorage();

    // 1. Resolve performing user identity
    const finalUserId = params.userId || activeUser?.id;
    const finalUserName = params.userName || activeUser?.name || 'مستخدم المنصة';
    const finalUserEmail = params.userEmail || activeUser?.email || '';
    const finalUserAvatar = params.userAvatar || activeUser?.avatar;

    // 2. Resolve clean user slug and canonical profile route
    const rawSlug =
      params.userSlug ||
      (activeUser?.username ? activeUser.username : generateUserSlug(finalUserName, finalUserEmail));
    const userSlug = formatUserSlug(rawSlug);
    const userProfileUrl = getUserProfileUrl(userSlug);

    // 3. Resolve content URL
    const now = new Date().toISOString();
    const uniqueId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    let contentUrl = params.contentUrl;
    if (!contentUrl) {
      if (params.targetType === 'prompt' && params.targetId) {
        contentUrl = `https://prombo.app/prompt/${params.targetId}`;
      } else if (params.targetType === 'profile') {
        contentUrl = userProfileUrl;
      } else if (params.targetId) {
        contentUrl = `https://prombo.app/#${params.targetId}`;
      } else {
        contentUrl = 'https://prombo.app';
      }
    }

    const newEntry: AuditLogEntry = {
      id: uniqueId,
      action: params.action,
      userId: finalUserId,
      userName: finalUserName,
      userEmail: finalUserEmail,
      userAvatar: finalUserAvatar,
      userSlug,
      userProfileUrl,
      targetId: params.targetId,
      targetType: params.targetType,
      targetTitle: params.targetTitle,
      contentUrl,
      details: params.details,
      createdAt: now,
    };

    // 4. Update local storage cache
    const currentLogs = this.getLocalAuditLogs();
    const updatedLogs = [newEntry, ...currentLogs];
    this.saveLocalAuditLogs(updatedLogs);

    // 5. Asynchronously persist to Supabase `audit_logs` table
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const rowPayload = mapEntryToRow(newEntry);
        const { error: sbError } = await supabase.from('audit_logs').insert([rowPayload]);
        if (sbError) {
          console.warn('Supabase audit_logs insert notice (will use local fallback):', sbError.message);
        }
      } catch (err: any) {
        console.warn('Supabase audit_logs sync exception:', err?.message || err);
      }
    }

    // 6. Broadcast window event for live Admin Panel UI reactivity
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('prombo_audit_log_added', {
            detail: newEntry,
          })
        );
      } catch (e) {
        console.warn('Window event dispatch notice:', e);
      }
    }

    return newEntry;
  },

  /**
   * Fetch all audit logs with optional filtering and pagination.
   * Merges Supabase remote table with local storage records.
   */
  async getAuditLogs(filters?: AuditLogFilterOptions): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const local = this.getLocalAuditLogs();
    let mergedLogs: AuditLogEntry[] = [...local];

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (!error && Array.isArray(data) && data.length > 0) {
          const remoteEntries = data.map(mapRowToEntry);
          // Merge by ID deduplication
          const map = new Map<string, AuditLogEntry>();
          for (const item of remoteEntries) {
            map.set(item.id, item);
          }
          for (const item of local) {
            if (!map.has(item.id)) {
              map.set(item.id, item);
            }
          }
          mergedLogs = Array.from(map.values());
        }
      } catch (e) {
        console.warn('Supabase fetch audit_logs exception, using local store:', e);
      }
    }

    // Sort newest first
    mergedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply filters
    let filtered = mergedLogs;

    // Filter by specific action
    if (filters?.action && filters.action !== 'all') {
      filtered = filtered.filter((log) => log.action === filters.action);
    }

    // Filter by action category
    if (filters?.actionCategory && filters.actionCategory !== 'all') {
      filtered = filtered.filter((log) => {
        if (filters.actionCategory === 'create') {
          return (
            log.action === 'CREATE_PROMPT' ||
            log.action === 'CREATE_POST' ||
            log.action === 'CREATE_COMMENT_POST' ||
            log.action === 'ADD_REPLY' ||
            log.action === 'ADD_NESTED_REPLY'
          );
        }
        if (filters.actionCategory === 'update') {
          return log.action === 'UPDATE_PROMPT' || log.action === 'UPDATE_POST' || log.action === 'UPDATE_PROFILE';
        }
        if (filters.actionCategory === 'delete') {
          return log.action === 'DELETE_PROMPT' || log.action === 'DELETE_POST';
        }
        if (filters.actionCategory === 'pin') {
          return log.action === 'PIN_REPLY' || log.action === 'UNPIN_REPLY';
        }
        if (filters.actionCategory === 'profile') {
          return log.action === 'UPDATE_PROFILE';
        }
        return true;
      });
    }

    // Filter by user email
    if (filters?.email && filters.email.trim()) {
      const emailQuery = filters.email.toLowerCase().trim();
      filtered = filtered.filter((log) => (log.userEmail || '').toLowerCase().includes(emailQuery));
    }

    // Filter by general keyword
    if (filters?.keyword && filters.keyword.trim()) {
      const q = filters.keyword.toLowerCase().trim();
      filtered = filtered.filter(
        (log) =>
          log.userName.toLowerCase().includes(q) ||
          (log.userEmail || '').toLowerCase().includes(q) ||
          log.userSlug.toLowerCase().includes(q) ||
          log.targetTitle.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          (log.contentUrl || '').toLowerCase().includes(q)
      );
    }

    const total = filtered.length;

    // Pagination
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters?.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      logs: paginated,
      total,
    };
  },

  /**
   * Subscribe to real-time additions via Supabase Realtime + Window Event
   */
  subscribeToAuditLogs(onNewEntry: (entry: AuditLogEntry) => void): () => void {
    const handleWindowEvent = (event: Event) => {
      const customEvt = event as CustomEvent<AuditLogEntry>;
      if (customEvt.detail) {
        onNewEntry(customEvt.detail);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('prombo_audit_log_added', handleWindowEvent);
    }

    let supabaseChannel: any = null;
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        supabaseChannel = supabase
          .channel('audit_logs_realtime_feed')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'audit_logs',
            },
            (payload: any) => {
              if (payload?.new) {
                const mapped = mapRowToEntry(payload.new);
                onNewEntry(mapped);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase Realtime subscription notice for audit_logs:', err);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('prombo_audit_log_added', handleWindowEvent);
      }
      if (supabase && supabaseChannel) {
        try {
          supabase.removeChannel(supabaseChannel);
        } catch {}
      }
    };
  },
};
