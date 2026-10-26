import { CommunityUser } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { safeStorage, hashPassword, verifyPassword } from '../utils/securityUtils';
import { isAdminEmail } from '../utils/authUtils';
import { getDynamicInitialSvg } from '../utils/avatarUtils';
import { generateUserSlug } from '../utils/slugUtils';
import { AuditService } from './auditService';

const CURRENT_USER_KEY = 'prombo_community_user_v1';
const PROFILES_KEY = 'prombo_user_profiles_v1';
const CREDENTIALS_KEY = 'prombo_user_credentials_v1';

// Seed initial demo community profiles with preset avatars or dynamic initials
const INITIAL_PROFILES: CommunityUser[] = [
  {
    id: 'user-admin-primary',
    name: 'Zero One',
    username: 'zero_oneone',
    email: 'zero.oneone.gamer@gmail.com',
    avatar: 'preset_26_lightning',
    role: 'admin',
    isGuest: false,
    isBanned: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
  },
  {
    id: 'user-admin-zero',
    name: 'Admin Owner',
    username: 'admin_zero',
    email: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAIL) || 'admin@prombo.ai',
    avatar: 'preset_26_lightning',
    role: 'admin',
    isGuest: false,
    isBanned: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
  {
    id: 'user-ahmed-1',
    name: 'أحمد النجار (Vibe Architect)',
    username: 'ahmed_vibe',
    email: 'ahmed@prombo.ai',
    avatar: 'preset_1_robot',
    role: 'moderator',
    isGuest: false,
    isBanned: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
  },
  {
    id: 'user-sara-2',
    name: 'سارة المهندس',
    username: 'sara_dev',
    email: 'sara.dev@prombo.ai',
    avatar: 'preset_4_dna',
    role: 'user',
    isGuest: false,
    isBanned: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
  {
    id: 'user-tariq-3',
    name: 'طارق الدوسري',
    username: 'tariq_d',
    email: 'tariq@example.com',
    avatar: 'preset_2_wizard',
    role: 'user',
    isGuest: false,
    isBanned: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
];

export function getRandomAvatar(seed?: string, isGuest: boolean = false): string {
  return getDynamicInitialSvg({ name: seed || 'User', isGuest });
}

/**
 * Hard purge of all client authentication keys, Supabase tokens, and session state
 */
export function purgeLocalAuthKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('sb-') ||
          key.includes('supabase.auth') ||
          key.startsWith('prombo_current_user') ||
          key.startsWith('prombo_admin_user') ||
          key.startsWith('prombo_admin_session') ||
          key.startsWith('prombo_user_credentials') ||
          key === 'prombo_community_user_v1')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => safeStorage.removeItem(k));
  } catch (err) {
    console.warn('Error purging local auth storage:', err);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(id: string | undefined | null): boolean {
  return !!id && UUID_REGEX.test(id);
}

export const AuthService = {
  /**
   * Get all registered profiles
   */
  getAllProfiles(): CommunityUser[] {
    try {
      const stored = safeStorage.getItem(PROFILES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let hasMissingSlug = false;
          let hasRolePromotion = false;
          const existingSlugs: string[] = [];
          const updated = parsed.map((p: CommunityUser) => {
            if (!p.username) {
              p.username = generateUserSlug(p.name, p.email, existingSlugs);
              hasMissingSlug = true;
            }
            // Only assign initial admin role if p.role is completely missing/unassigned
            if (p.email && isAdminEmail(p.email) && !p.role) {
              p.role = 'admin';
              hasRolePromotion = true;
            }
            existingSlugs.push(p.username);
            return p;
          });
          if (hasMissingSlug || hasRolePromotion) {
            safeStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
          }
          return updated;
        }
      }
    } catch (e) {
      console.warn('Error reading profiles', e);
    }
    safeStorage.setItem(PROFILES_KEY, JSON.stringify(INITIAL_PROFILES));
    return INITIAL_PROFILES;
  },

  /**
   * Fetch all profiles from Supabase and synchronize with local storage directory
   */
  async fetchProfilesFromSupabase(): Promise<CommunityUser[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getAllProfiles();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch profiles from Supabase:', error.message || error);
        return this.getAllProfiles();
      }

      if (Array.isArray(data) && data.length > 0) {
        const localProfiles = this.getAllProfiles();
        const mergedProfiles = [...localProfiles];

        data.forEach((row: any) => {
          const rowId = row.id;
          const rowEmail = (row.email || '').toLowerCase();
          const existingIdx = mergedProfiles.findIndex(
            (p) => (rowId && p.id === rowId) || (rowEmail && p.email && p.email.toLowerCase() === rowEmail)
          );

          const mappedUser: Partial<CommunityUser> = {
            id: rowId,
            name: row.name || row.full_name || 'Member',
            username: row.username || (row.name ? generateUserSlug(row.name, row.email, []) : undefined),
            email: rowEmail || undefined,
            avatar: row.avatar_url || undefined,
            role: row.role || 'user',
            isBanned: Boolean(row.is_banned),
            isCommunityBanned: Boolean(row.is_community_banned),
            isVIP: Boolean(row.is_vip),
            isPinned: Boolean(row.is_pinned),
            createdAt: row.created_at || new Date().toISOString(),
          };

          if (existingIdx !== -1) {
            mergedProfiles[existingIdx] = {
              ...mergedProfiles[existingIdx],
              ...mappedUser,
              username: mergedProfiles[existingIdx].username || mappedUser.username,
              avatar: mergedProfiles[existingIdx].avatar || mappedUser.avatar,
            };
          } else {
            mergedProfiles.push(mappedUser as CommunityUser);
          }
        });

        this.saveProfiles(mergedProfiles);
        return mergedProfiles;
      }
    } catch (e) {
      console.warn('Exception during fetchProfilesFromSupabase:', e);
    }

    return this.getAllProfiles();
  },

  /**
   * Save Profiles list
   */
  saveProfiles(profiles: CommunityUser[]): void {
    safeStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    window.dispatchEvent(new CustomEvent('prombo_profiles_change', { detail: profiles }));
  },

  /**
   * Register or update profile in directory
   */
  upsertProfile(user: CommunityUser): void {
    const profiles = this.getAllProfiles();
    if (!user.username) {
      const existingSlugs = profiles.map((p) => p.username || '');
      user.username = generateUserSlug(user.name, user.email, existingSlugs);
    }
    const idx = profiles.findIndex((p) => p.id === user.id || (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()));
    if (idx !== -1) {
      profiles[idx] = { ...profiles[idx], ...user, username: user.username || profiles[idx].username };
    } else {
      profiles.unshift(user);
    }
    this.saveProfiles(profiles);
  },

  /**
   * Toggle User Ban Status (Full Restriction)
   */
  async toggleBanUser(userId: string, isBanned: boolean): Promise<boolean> {
    const profiles = this.getAllProfiles();
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      target.isBanned = isBanned;
      target.bannedAt = isBanned ? new Date().toISOString() : undefined;
      this.saveProfiles(profiles);

      // If current user is the banned one, update their local auth
      const current = this.getCurrentUser();
      if (current && current.id === userId) {
        current.isBanned = isBanned;
        current.bannedAt = target.bannedAt;
        this.setCurrentUser(current);
      }

      // Sync to Supabase
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          let query = supabase.from('profiles').update({
            is_banned: isBanned,
            updated_at: new Date().toISOString(),
          });
          if (isUuid(userId)) {
            query = query.eq('id', userId);
          } else if (target.email) {
            query = query.eq('email', target.email.toLowerCase());
          } else {
            query = null as any;
          }

          if (query) {
            const { error: sbErr } = await query;
            if (sbErr) {
              console.warn('Supabase toggleBanUser warning:', sbErr.message || sbErr);
            }
          }
        } catch (err: any) {
          console.warn('Supabase toggleBanUser exception:', err);
        }
      }

      try {
        AuditService.logAction({
          action: isBanned ? 'BAN_USER' : 'UNBAN_USER',
          userName: target.name,
          userEmail: target.email,
          userAvatar: target.avatar,
          userSlug: target.username || '',
          targetId: target.id,
          targetType: 'profile',
          targetTitle: target.name,
          contentUrl: `/user/${target.username || target.id}`,
          details: { banType: 'full', isBanned },
        });
      } catch {}

      return true;
    }
    return false;
  },

  /**
   * Toggle Community-only Ban Status
   */
  async toggleCommunityBanUser(userId: string, isCommunityBanned: boolean): Promise<boolean> {
    const profiles = this.getAllProfiles();
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      target.isCommunityBanned = isCommunityBanned;
      target.communityBannedAt = isCommunityBanned ? new Date().toISOString() : undefined;
      this.saveProfiles(profiles);

      // If current user is the banned one, update their local auth
      const current = this.getCurrentUser();
      if (current && current.id === userId) {
        current.isCommunityBanned = isCommunityBanned;
        current.communityBannedAt = target.communityBannedAt;
        this.setCurrentUser(current);
      }

      // Sync to Supabase
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          let query = supabase.from('profiles').update({
            is_community_banned: isCommunityBanned,
            updated_at: new Date().toISOString(),
          });
          if (isUuid(userId)) {
            query = query.eq('id', userId);
          } else if (target.email) {
            query = query.eq('email', target.email.toLowerCase());
          } else {
            query = null as any;
          }

          if (query) {
            const { error: sbErr } = await query;
            if (sbErr) {
              console.warn('Supabase toggleCommunityBanUser warning:', sbErr.message || sbErr);
            }
          }
        } catch (err: any) {
          console.warn('Supabase toggleCommunityBanUser exception:', err);
        }
      }

      try {
        AuditService.logAction({
          action: isCommunityBanned ? 'BAN_USER' : 'UNBAN_USER',
          userName: target.name,
          userEmail: target.email,
          userAvatar: target.avatar,
          userSlug: target.username || '',
          targetId: target.id,
          targetType: 'profile',
          targetTitle: target.name,
          contentUrl: `/user/${target.username || target.id}`,
          details: { banType: 'community', isCommunityBanned },
        });
      } catch {}

      return true;
    }
    return false;
  },

  /**
   * Update User Role
   */
  async updateUserRole(userId: string, role: 'user' | 'admin' | 'moderator'): Promise<boolean> {
    const profiles = this.getAllProfiles();
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      target.role = role;
      this.saveProfiles(profiles);

      const current = this.getCurrentUser();
      if (current && current.id === userId) {
        current.role = role;
        this.setCurrentUser(current);
      }

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          let query = supabase.from('profiles').update({
            role,
            updated_at: new Date().toISOString(),
          });
          if (isUuid(userId)) {
            query = query.eq('id', userId);
          } else if (target.email) {
            query = query.eq('email', target.email.toLowerCase());
          } else {
            query = null as any;
          }

          if (query) {
            const { error: sbErr } = await query;
            if (sbErr) {
              console.warn('Supabase updateUserRole warning:', sbErr.message || sbErr);
            }
          }
        } catch (err: any) {
          console.warn('Supabase updateUserRole exception:', err);
        }
      }
      return true;
    }
    return false;
  },

  /**
   * Update User Profile Badges (VIP / Featured Creator and Admin Pinned / Verified Profile)
   */
  async updateUserProfileBadges(
    userId: string,
    updates: { isVIP?: boolean; isPinned?: boolean }
  ): Promise<boolean> {
    const profiles = this.getAllProfiles();
    const target = profiles.find((p) => p.id === userId);
    if (!target) return false;

    if (updates.isVIP !== undefined) target.isVIP = updates.isVIP;
    if (updates.isPinned !== undefined) target.isPinned = updates.isPinned;

    this.saveProfiles(profiles);

    // If current logged-in user is updated, sync currentUser state
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      if (updates.isVIP !== undefined) current.isVIP = updates.isVIP;
      if (updates.isPinned !== undefined) current.isPinned = updates.isPinned;
      this.setCurrentUser(current);
    }

    // Broadcast update event so all components/listeners immediately refresh UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prombo_user_profile_update', {
          detail: { userId, updates: { isVIP: target.isVIP, isPinned: target.isPinned } },
        })
      );
    }

    // Sync with Supabase profiles table
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.isVIP !== undefined) {
          payload.is_vip = updates.isVIP;
        }
        if (updates.isPinned !== undefined) {
          payload.is_pinned = updates.isPinned;
        }

        let query = supabase.from('profiles').update(payload);
        if (isUuid(userId)) {
          query = query.eq('id', userId);
        } else if (target.email) {
          query = query.eq('email', target.email.toLowerCase());
        } else {
          query = null as any;
        }

        if (query) {
          const { error: sbErr } = await query;
          if (sbErr) {
            console.warn('Supabase updateUserProfileBadges warning:', sbErr.message || sbErr);
          }
        }
      } catch (err) {
        console.warn('Supabase updateUserProfileBadges warning:', err);
      }
    }

    // Log action to audit log
    try {
      await AuditService.logAction({
        action: 'UPDATE_PROFILE',
        targetType: 'profile',
        targetId: userId,
        targetTitle: target.name,
        userEmail: target.email,
        details: { updates },
      });
    } catch {}

    return true;
  },

  /**
   * Get current logged-in community user
   */
  getCurrentUser(): CommunityUser | null {
    try {
      const stored = safeStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const user: CommunityUser = JSON.parse(stored);
        // Deprecate and immediately purge any legacy guest sessions
        if (user.isGuest) {
          safeStorage.removeItem(CURRENT_USER_KEY);
          return null;
        }
        // Sync ban status, badging, and ensure username slug exists
        const profiles = this.getAllProfiles();
        const found = profiles.find((p) => p.id === user.id || (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()));
        if (found) {
          user.isBanned = found.isBanned;
          user.bannedAt = found.bannedAt;
          user.isCommunityBanned = found.isCommunityBanned;
          user.communityBannedAt = found.communityBannedAt;
          user.role = found.role;
          user.isVIP = found.isVIP;
          user.isPinned = found.isPinned;
          if (found.username) user.username = found.username;
        }
        if (!user.username) {
          const existingSlugs = profiles.map((p) => p.username || '');
          user.username = generateUserSlug(user.name, user.email, existingSlugs);
          this.setCurrentUser(user);
        }
        return user;
      }
    } catch (e) {
      console.warn('Error reading stored user', e);
    }
    return null;
  },

  /**
   * Set user in storage & notify listeners
   */
  setCurrentUser(user: CommunityUser | null): void {
    if (user) {
      safeStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      this.upsertProfile(user);
    } else {
      safeStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('prombo_auth_change', { detail: user }));
  },

  /**
   * Guest sign in is permanently disabled across the platform.
   * Access requires strict real account verification.
   */
  signInAsGuest(_customName?: string, _customAvatar?: string): CommunityUser {
    throw new Error('تسجيل الدخول كضيف معطّل نهائياً لحماية أمان المجتمع.');
  },

  /**
   * Update current user avatar
   */
  async updateAvatar(avatar: string): Promise<boolean> {
    const current = this.getCurrentUser();
    if (!current) return false;

    current.avatar = avatar;
    this.setCurrentUser(current);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.updateUser({
          data: { avatar_url: avatar },
        });
        await supabase.from('profiles').update({ avatar_url: avatar }).eq('id', current.id);
      } catch {}
    }
    return true;
  },

  /**
   * Update current user profile (Full Name, Avatar, Avatar Type) and upsert into Supabase public.profiles
   */
  async updateProfile(params: {
    fullName: string;
    avatarUrl: string;
    avatarType?: 'custom_upload' | 'preset' | 'initial_letter';
  }): Promise<{ success: boolean; user?: CommunityUser; error?: string }> {
    const current = this.getCurrentUser();
    if (!current) {
      return { success: false, error: 'No active user session found' };
    }

    const cleanName = params.fullName.trim() || current.name;
    const finalAvatar = params.avatarUrl || current.avatar;
    const finalAvatarType =
      params.avatarType || (finalAvatar.startsWith('preset_') ? 'preset' : 'custom_upload');

    const updatedUser: CommunityUser = {
      ...current,
      name: cleanName,
      avatar: finalAvatar,
    };

    // Update local storage and dispatch prombo_auth_change
    this.setCurrentUser(updatedUser);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_user_profile_update', { detail: updatedUser }));
    }

    // Sync to Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // 1. Update Auth user metadata
        try {
          await supabase.auth.updateUser({
            data: {
              name: cleanName,
              full_name: cleanName,
              avatar_url: finalAvatar,
              avatar_type: finalAvatarType,
            },
          });
        } catch {}

        // 2. Execute Supabase upsert on public.profiles (id, full_name, avatar_url, avatar_type, updated_at)
        const { error: upsertErr } = await supabase.from('profiles').upsert(
          {
            id: current.id,
            full_name: cleanName,
            name: cleanName,
            avatar_url: finalAvatar,
            avatar_type: finalAvatarType,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (upsertErr) {
          console.warn('Supabase profiles upsert notice:', upsertErr);
        }
      } catch (err: any) {
        console.warn('Failed to upsert profile in Supabase:', err);
      }
    }

    // Centrally log user profile update to Audit Log System
    try {
      AuditService.logAction({
        action: 'UPDATE_PROFILE',
        userId: current.id,
        userName: cleanName,
        userEmail: current.email,
        userAvatar: finalAvatar,
        targetId: current.id,
        targetType: 'profile',
        targetTitle: `تحديث الملف الشخصي (${cleanName})`,
        contentUrl: `https://prombo.app/user/@${current.username || generateUserSlug(cleanName, current.email)}`,
        details: {
          previousName: current.name,
          newName: cleanName,
          avatarType: finalAvatarType,
        },
      }).catch((e) => console.warn('AuditLog notice [UPDATE_PROFILE]:', e));
    } catch (e) {
      console.warn('AuditLog exception [UPDATE_PROFILE]:', e);
    }

    return { success: true, user: updatedUser };
  },

  /**
   * Deprecated: Stored credentials map for verified accounts (email -> passwordHash)
   * Kept as legacy fallback getter, but new credentials are exclusively handled by Supabase Auth.
   */
  getUserCredentials(): Record<string, string> {
    try {
      const data = safeStorage.getItem(CREDENTIALS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveUserCredential(_email: string, _passwordHash: string): void {
    // Deprecated: Supabase Auth manages secure token session directly.
    // Client-side password hash storage in localStorage is intentionally disabled for security.
  },

  /**
   * Sign In via Supabase Auth or Verified Stored Credentials
   * STRICT SECURITY: Disables any unverified dummy account creation bypasses.
   */
  async signInWithEmail(email: string, password?: string): Promise<{ success: boolean; user?: CommunityUser; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'يرجى إدخال بريد إلكتروني صحيح' };
    }
    if (!password) {
      return { success: false, error: 'يرجى إدخال كلمة المرور' };
    }

    const supabase = getSupabaseClient();
    const allProfiles = this.getAllProfiles();
    const existing = allProfiles.find((p) => p.email && p.email.toLowerCase() === cleanEmail);

    if (existing && existing.isBanned) {
      return { success: false, error: 'هذا الحساب محظور حالياً.' };
    }

    // 1. Supabase credentials check if configured (authoritative)
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          let errorMsg = 'بيانات الدخول غير صحيحة. يرجى التحقق من بريدك الإلكتروني وكلمة المرور.';
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            errorMsg = 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.';
          } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
            errorMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
          }
          return { success: false, error: errorMsg };
        }

        if (data?.user) {
          const role = isAdminEmail(cleanEmail) ? 'admin' : (existing?.role || 'user');
          const existingSlugs = allProfiles.map((p) => p.username || '');
          const username = data.user.user_metadata?.username || existing?.username || generateUserSlug(data.user.user_metadata?.name || existing?.name || cleanEmail.split('@')[0], cleanEmail, existingSlugs);
          const user: CommunityUser = {
            id: data.user.id,
            name: data.user.user_metadata?.name || existing?.name || cleanEmail.split('@')[0],
            username,
            email: data.user.email,
            avatar: data.user.user_metadata?.avatar_url || existing?.avatar || getRandomAvatar(data.user.id),
            role: role as any,
            isGuest: false,
            isBanned: false,
            createdAt: data.user.created_at,
          };
          this.upsertProfile(user);
          this.setCurrentUser(user);
          return { success: true, user };
        }
      } catch (err: any) {
        console.warn('Supabase auth check notice:', err);
        return { success: false, error: err?.message || 'فشل الاتصال بخدمة التحقق من الحساب.' };
      }
    }

    // 2. Offline / Development Mode Check
    // When Supabase is not configured, only allow sign-in if the account exists in registered profiles AND verified credentials match
    const creds = this.getUserCredentials();
    const storedHash = creds[cleanEmail];

    let passwordMatches = false;
    if (storedHash) {
      passwordMatches = await verifyPassword(password, storedHash);
    }

    if (existing && passwordMatches) {
      this.setCurrentUser(existing);
      return { success: true, user: existing };
    }

    // STRICT REJECTION: NEVER auto-create dummy accounts or bypass verification
    return {
      success: false,
      error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من بياناتك أو إنشاء حساب جديد وتأكيد البريد.',
    };
  },

  /**
   * Strict Email Sign Up via Supabase SDK expecting 6-digit OTP code ({{ .Token }}).
   * Intentionally omits emailRedirectTo / ConfirmationURL so Supabase generates and delivers the 6-digit OTP code.
   * Strictly avoids generating mock user objects.
   */
  async signUpWithEmail(
    email: string,
    password: string,
    name?: string,
    avatar?: string
  ): Promise<{
    success: boolean;
    requiresVerification: boolean;
    user?: CommunityUser;
    message?: string;
    error?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, requiresVerification: false, error: 'يرجى إدخال بريد إلكتروني صالح.' };
    }
    if (!password || password.length < 6) {
      return { success: false, requiresVerification: false, error: 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        requiresVerification: false,
        error: 'خدمة Supabase غير مهيأة أو غير متصلة حالياً.',
      };
    }

    const cleanName = name?.trim() || cleanEmail.split('@')[0];
    const userAvatar = avatar || getRandomAvatar(cleanName, false);
    const allProfiles = this.getAllProfiles();
    const existingSlugs = allProfiles.map((p) => p.username || '');
    const userSlug = generateUserSlug(cleanName, cleanEmail, existingSlugs);

    try {
      // Direct sign-up without redirect URLs to strictly enforce 6-digit OTP delivery ({{ .Token }})
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            full_name: cleanName,
            username: userSlug,
            avatar_url: userAvatar,
          },
        },
      });

      if (error) {
        let errMsg = error.message;
        if (errMsg.toLowerCase().includes('already registered')) {
          errMsg = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.';
        } else if (errMsg.toLowerCase().includes('rate limit')) {
          errMsg = 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار دقيقة قبل المحاولة مرة أخرى.';
        }
        return { success: false, requiresVerification: false, error: errMsg };
      }

      if (!data.user) {
        return { success: false, requiresVerification: false, error: 'فشلت عملية إنشاء الحساب.' };
      }

      // If project has email confirmation enabled, session is null until 6-digit OTP code is validated
      if (!data.session) {
        return {
          success: true,
          requiresVerification: true,
          message: 'تم إرسال رمز التحقق (OTP) المكون من 6 أرقام إلى بريدك الإلكتروني بنجاح. يرجى إدخال الرمز لتأكيد الحساب.',
        };
      }

      // If email confirmation is already validated on server
      const role = isAdminEmail(cleanEmail) ? 'admin' : 'user';
      const user: CommunityUser = {
        id: data.user.id,
        name: cleanName,
        username: userSlug,
        email: cleanEmail,
        avatar: userAvatar,
        role: role as any,
        isGuest: false,
        isBanned: false,
        createdAt: data.user.created_at || new Date().toISOString(),
      };

      this.upsertProfile(user);
      this.setCurrentUser(user);
      return { success: true, requiresVerification: false, user };
    } catch (err: any) {
      return {
        success: false,
        requiresVerification: false,
        error: err?.message || 'حدث خطأ أثناء إنشاء الحساب.',
      };
    }
  },

  /**
   * Request Email Verification OTP (Delegates to strict signUpWithEmail)
   */
  async requestEmailVerificationOtp(
    email: string,
    name: string,
    password?: string,
    avatar?: string
  ): Promise<{ success: boolean; requiresVerification?: boolean; user?: CommunityUser; message?: string; error?: string }> {
    return this.signUpWithEmail(email, password || '', name, avatar);
  },

  /**
   * Verify Email OTP Token & Complete Account Registration
   * STRICT SECURITY: Handled strictly using supabase.auth.verifyOtp({ email, token, type: 'signup' }).
   * Strictly validates 6-digit OTP token ({{ .Token }}).
   * Ensures the session is set and the user is signed in upon successful OTP validation.
   * Does NOT listen for or rely on URL redirect parameters (ConfirmationURL or hash fragments).
   */
  async verifyEmailOtp(
    email: string,
    token: string,
    name?: string
  ): Promise<{ success: boolean; user?: CommunityUser; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail) {
      return { success: false, error: 'البريد الإلكتروني مفقود.' };
    }
    if (!cleanToken || cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      return { success: false, error: 'يرجى إدخال رمز التحقق المكون من 6 أرقام.' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'خدمة Supabase غير متصلة.' };
    }

    try {
      // 1. Strictly verify OTP with Supabase SDK using type: 'signup'
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      if (error || !data?.user) {
        let errMsg = error?.message || 'رمز التحقق غير صالح أو منتهي الصلاحية.';
        if (errMsg.toLowerCase().includes('invalid') || errMsg.toLowerCase().includes('expired')) {
          errMsg = 'رمز التحقق غير صالح أو منتهي الصلاحية. يرجى التأكد من الرمز والمحاولة مجدداً.';
        }
        return { success: false, error: errMsg };
      }

      // 2. Ensure session is set and confirmed
      if (data.session) {
        try {
          await supabase.auth.setSession(data.session);
        } catch {}
      }

      // 3. Establish session state & profile upon successful OTP validation
      const authUser = data.user;
      const allProfiles = this.getAllProfiles();
      const existing = allProfiles.find(
        (p) => p.id === authUser.id || (p.email && p.email.toLowerCase() === cleanEmail)
      );
      const cleanName =
        name?.trim() ||
        authUser.user_metadata?.name ||
        authUser.user_metadata?.full_name ||
        existing?.name ||
        cleanEmail.split('@')[0];
      const existingSlugs = allProfiles.map((p) => p.username || '');
      const userSlug =
        authUser.user_metadata?.username ||
        existing?.username ||
        generateUserSlug(cleanName, cleanEmail, existingSlugs);
      const avatar =
        authUser.user_metadata?.avatar_url ||
        existing?.avatar ||
        getRandomAvatar(cleanName, false);

      const verifiedUser: CommunityUser = {
        id: authUser.id,
        name: cleanName,
        username: userSlug,
        email: cleanEmail,
        avatar,
        role: isAdminEmail(cleanEmail) ? 'admin' : (existing?.role || 'user'),
        isGuest: false,
        isBanned: existing ? Boolean(existing.isBanned) : false,
        createdAt: authUser.created_at || new Date().toISOString(),
      };

      this.upsertProfile(verifiedUser);
      this.setCurrentUser(verifiedUser);

      return { success: true, user: verifiedUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء التحقق من رمز OTP.' };
    }
  },

  /**
   * Resend verification OTP via Supabase Auth
   */
  async resendVerificationOtp(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'خدمة Supabase غير متصلة.' };
    }
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: 'تمت إعادة إرسال رمز التحقق بنجاح.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر إعادة إرسال الرمز.' };
    }
  },

  /**
   * Direct Sign Up wrapper (calls strict signUpWithEmail)
   */
  async signUp(
    name: string,
    email: string,
    password?: string,
    avatar?: string
  ): Promise<{ success: boolean; user?: CommunityUser; error?: string; requiresVerification?: boolean; message?: string }> {
    return this.signUpWithEmail(email, password || '', name, avatar);
  },

  /**
   * Reset Password - Dispatches recovery email / OTP via Supabase Auth
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Email is required' };
    }
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return {
          success: true,
          message: 'Password reset code has been sent to your email.',
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to send reset email' };
      }
    }
    return { success: true, message: 'Password reset code simulated in offline mode.' };
  },

  isRecoveryInProgress: false,

  /**
   * Verify Recovery OTP Token (Step 1 of 2 in Password Reset)
   * Establishes recovery session without prematurely marking user as logged in.
   */
  async verifyRecoveryOtp(
    email: string,
    token: string
  ): Promise<{ success: boolean; session?: any; user?: any; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }
    if (!cleanToken || cleanToken.length < 6) {
      return { success: false, error: 'Valid 6-digit OTP code is required' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database service is currently unavailable' };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      if (error) {
        this.isRecoveryInProgress = false;
        return { success: false, error: error.message || 'Invalid or expired OTP code' };
      }

      this.isRecoveryInProgress = true;

      // Explicitly notify UI listeners that recovery OTP has been successfully verified
      if (typeof window !== 'undefined') {
        const isAdminRecovery =
          window.location.pathname.startsWith('/admin') ||
          window.location.hash.startsWith('#admin') ||
          sessionStorage.getItem('prombo_admin_recovery_active') === 'true';

        window.dispatchEvent(
          new CustomEvent('prombo_password_recovery', {
            detail: {
              session: data?.session,
              user: data?.user,
              email: cleanEmail,
              source: isAdminRecovery ? 'admin' : 'user',
            },
          })
        );
      }

      // Keep recovery flag active while user enters new password in Step 2.
      // Do NOT syncSupabaseUser / setCurrentUser here so auth state changes don't disrupt the form.
      return {
        success: true,
        session: data?.session,
        user: data?.user,
      };
    } catch (err: any) {
      this.isRecoveryInProgress = false;
      return { success: false, error: err?.message || 'Failed to verify recovery code' };
    }
  },

  /**
   * Verify Recovery OTP and Update User Password
   * 1. Verifies recovery OTP via supabase.auth.verifyOtp({ email, token, type: 'recovery' })
   * 2. Updates user password via supabase.auth.updateUser({ password: newPassword })
   */
  async verifyRecoveryOtpAndSetPassword(
    email: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; user?: CommunityUser; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }
    if (!cleanToken || cleanToken.length < 6) {
      return { success: false, error: 'Valid 6-digit OTP code is required' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database service is currently unavailable' };
    }

    try {
      // 1. Verify OTP code for password recovery
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      // 2. Update user password using the verified session
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        this.isRecoveryInProgress = false;
        return { success: false, error: updateError.message };
      }

      this.isRecoveryInProgress = false;
      const activeUser = updateData.user || verifyData.user;
      let communityUser: CommunityUser | null = null;
      if (activeUser) {
        communityUser = this.syncSupabaseUser(activeUser);
      }

      return {
        success: true,
        user: communityUser || this.getCurrentUser() || undefined,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Password reset failed' };
    }
  },

  /**
   * Update password for an actively authenticated session (e.g., via magic link callback)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; user?: CommunityUser; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      this.isRecoveryInProgress = false;
      return { success: true, user: this.getCurrentUser() || undefined };
    }
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        this.isRecoveryInProgress = false;
        return { success: false, error: error.message };
      }
      this.isRecoveryInProgress = false;
      let communityUser: CommunityUser | null = null;
      if (data.user) {
        communityUser = this.syncSupabaseUser(data.user);
      }
      return {
        success: true,
        user: communityUser || this.getCurrentUser() || undefined,
      };
    } catch (err: any) {
      this.isRecoveryInProgress = false;
      return { success: false, error: err?.message || 'Failed to update password' };
    }
  },

  /**
   * STRICT REAL OAUTH PROVIDER HANDLERS:
   * Trigger genuine Supabase SDK method: supabase.auth.signInWithOAuth({ provider }).
   * If provider is not configured or throws error, cleanly catches and displays
   * user-friendly error message ("المزود غير متاح حالياً") instead of creating a dummy account.
   */
  async signInWithOAuth(
    provider: 'google' | 'github' | 'apple'
  ): Promise<{ success: boolean; user?: CommunityUser; error?: string }> {
    const supabase = getSupabaseClient();
    const providerName = provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'Apple';

    if (!supabase) {
      return {
        success: false,
        error: `تسجيل الدخول عبر ${providerName} غير متاح حالياً. يرجى استخدام البريد الإلكتروني.`,
      };
    }

    try {
      // 1. Snapshot pre-existing session state to prevent false-positive fallbacks
      const { data: initialSessionData } = await supabase.auth.getSession();
      const initialAccessToken = initialSessionData?.session?.access_token;
      const initialUserId = initialSessionData?.session?.user?.id;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.warn(`Supabase ${provider} signInWithOAuth notice:`, error.message);
        return {
          success: false,
          error: `تسجيل الدخول عبر ${providerName} غير متاح حالياً أو لم يتم تفعيله في الخادم. يرجى استخدام البريد الإلكتروني أو التواصل مع الإدارة.`,
        };
      }

      if (!data?.url) {
        return {
          success: false,
          error: `تسجيل الدخول عبر ${providerName} غير متاح حالياً. يرجى استخدام البريد الإلكتروني.`,
        };
      }

      // 2. Pre-flight verification: probe endpoint before opening any popup
      // If the provider is disabled in Supabase, the endpoint immediately returns HTTP 400
      let isProviderDisabled = false;
      let preflightErrorMessage = '';

      try {
        const preflightRes = await fetch(data.url, {
          method: 'GET',
          headers: { 'Accept': 'application/json, text/plain, */*' },
        });

        if (preflightRes.status === 400 || preflightRes.status === 404) {
          isProviderDisabled = true;
          try {
            const errData = await preflightRes.json();
            if (errData?.msg?.toLowerCase().includes('unsupported provider') || errData?.code === 400) {
              preflightErrorMessage = `تسجيل الدخول عبر ${providerName} معطل في الخادم حالياً. يرجى استخدام البريد الإلكتروني أو التواصل مع الإدارة.`;
            }
          } catch {}
        }
      } catch (err: any) {
        // Redirection to external provider consent screen (e.g. accounts.google.com) may throw a CORS error
        // in fetch(), which confirms that the provider is enabled and accepted by Supabase!
      }

      if (isProviderDisabled) {
        return {
          success: false,
          error:
            preflightErrorMessage ||
            `تسجيل الدخول عبر ${providerName} معطل في الخادم حالياً. يرجى استخدام البريد الإلكتروني أو التواصل مع الإدارة.`,
        };
      }

      // Open OAuth provider in secure popup window
      const popup = window.open(
        data.url,
        'prombo_oauth_popup',
        'width=600,height=700,status=no,toolbar=no,menubar=no'
      );

      if (!popup) {
        // Blocked popup handling
        return {
          success: false,
          error: `تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة لمتابعة تسجيل الدخول عبر ${providerName}.`,
        };
      }

      return new Promise((resolve) => {
        let resolved = false;

        const cleanup = () => {
          if (authListener) {
            authListener.subscription.unsubscribe();
          }
          if (checkTimer) {
            clearInterval(checkTimer);
          }
          if (popup && !popup.closed) {
            try {
              popup.close();
            } catch {}
          }
        };

        // Listen for Supabase session update
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user && !resolved) {
              const userProvider = session.user.app_metadata?.provider;
              const isMatchingProvider =
                userProvider === provider ||
                session.user.app_metadata?.providers?.includes(provider);
              const isNewToken = !initialAccessToken || session.access_token !== initialAccessToken;

              // Strictly reject pre-existing sessions or mismatched providers
              if (!isMatchingProvider || !isNewToken) {
                return;
              }

              resolved = true;
              cleanup();

              const authUser = session.user;
              const cleanEmail = (authUser.email || '').toLowerCase();
              const allProfiles = AuthService.getAllProfiles();
              const existing = allProfiles.find(
                (p) => p.email && p.email.toLowerCase() === cleanEmail
              );
              const name =
                authUser.user_metadata?.full_name ||
                authUser.user_metadata?.name ||
                existing?.name ||
                cleanEmail.split('@')[0] ||
                `${provider} User`;
              const avatar =
                authUser.user_metadata?.avatar_url ||
                existing?.avatar ||
                getRandomAvatar(name, false);
              const existingSlugs = allProfiles.map((p) => p.username || '');
              const username =
                authUser.user_metadata?.username ||
                existing?.username ||
                generateUserSlug(name, cleanEmail, existingSlugs);
              const role = isAdminEmail(cleanEmail) ? 'admin' : (existing?.role || 'user');

              const communityUser: CommunityUser = {
                id: authUser.id,
                name,
                username,
                email: cleanEmail,
                avatar,
                role: role as any,
                isGuest: false,
                isBanned: existing ? Boolean(existing.isBanned) : false,
                createdAt: authUser.created_at || new Date().toISOString(),
              };

              AuthService.upsertProfile(communityUser);
              AuthService.setCurrentUser(communityUser);
              resolve({ success: true, user: communityUser });
            }
          }
        );

        // Periodically check if popup was closed (responsive 500ms polling)
        const checkTimer = setInterval(() => {
          if (popup && popup.closed && !resolved) {
            clearInterval(checkTimer);
            supabase.auth.getSession().then(({ data: sessData }) => {
              const currentSession = sessData?.session;
              const authUser = currentSession?.user;

              // STRICT VALIDATION: Must be a genuine session generated by this OAuth flow
              const userProvider = authUser?.app_metadata?.provider;
              const isMatchingProvider =
                userProvider === provider ||
                authUser?.app_metadata?.providers?.includes(provider);
              const isNewToken =
                Boolean(currentSession?.access_token) &&
                currentSession?.access_token !== initialAccessToken;
              const isNewUser = Boolean(authUser?.id) && authUser?.id !== initialUserId;

              // Valid OAuth session must match provider AND have a new token or new user
              const isValidOAuthSession = Boolean(authUser && isMatchingProvider && (isNewToken || isNewUser));

              if (isValidOAuthSession && !resolved) {
                resolved = true;
                cleanup();

                const cleanEmail = (authUser!.email || '').toLowerCase();
                const allProfiles = AuthService.getAllProfiles();
                const existing = allProfiles.find(
                  (p) => p.email && p.email.toLowerCase() === cleanEmail
                );
                const name =
                  authUser!.user_metadata?.full_name ||
                  authUser!.user_metadata?.name ||
                  existing?.name ||
                  cleanEmail.split('@')[0] ||
                  `${provider} User`;
                const avatar =
                  authUser!.user_metadata?.avatar_url ||
                  existing?.avatar ||
                  getRandomAvatar(name, false);
                const existingSlugs = allProfiles.map((p) => p.username || '');
                const username =
                  authUser!.user_metadata?.username ||
                  existing?.username ||
                  generateUserSlug(name, cleanEmail, existingSlugs);

                const communityUser: CommunityUser = {
                  id: authUser!.id,
                  name,
                  username,
                  email: cleanEmail,
                  avatar,
                  role: (isAdminEmail(cleanEmail) ? 'admin' : (existing?.role || 'user')) as any,
                  isGuest: false,
                  isBanned: existing ? Boolean(existing.isBanned) : false,
                  createdAt: authUser!.created_at || new Date().toISOString(),
                };
                AuthService.upsertProfile(communityUser);
                AuthService.setCurrentUser(communityUser);
                resolve({ success: true, user: communityUser });
              } else if (!resolved) {
                resolved = true;
                cleanup();
                resolve({
                  success: false,
                  error: `تسجيل الدخول عبر ${providerName} غير متاح حالياً أو لم يتم تفعيله في الخادم. يرجى استخدام البريد الإلكتروني أو التواصل مع الإدارة.`,
                });
              }
            }).catch((sessErr: any) => {
              if (!resolved) {
                resolved = true;
                cleanup();
                resolve({
                  success: false,
                  error: sessErr?.message || `فشل في استرداد جلسة المصادقة عبر ${providerName}.`,
                });
              }
            });
          }
        }, 500);

        // Sensible timeout limit (reduced from 60s to 20s)
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              success: false,
              error: `تسجيل الدخول عبر ${providerName} غير متاح حالياً أو استغرق وقتاً طويلاً. يرجى استخدام البريد الإلكتروني.`,
            });
          }
        }, 20000);
      });
    } catch (err: any) {
      console.warn(`Supabase ${provider} signInWithOAuth exception:`, err);
      return {
        success: false,
        error: `تسجيل الدخول عبر ${providerName} غير متاح حالياً. يرجى استخدام البريد الإلكتروني أو التواصل مع الإدارة.`,
      };
    }
  },

  /**
   * Passwordless / OTP: Send 1-click magic link or verification code via Supabase
   */
  async sendOtpOrMagicLink(
    email: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'خدمة Supabase غير متصلة.' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: false,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: 'تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر إرسال الرمز.' };
    }
  },

  /**
   * Passwordless / OTP: Verify 6-digit code via Supabase
   */
  async verifyOtp(
    email: string,
    token: string
  ): Promise<{ success: boolean; user?: CommunityUser; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    if (!cleanEmail) {
      return { success: false, error: 'Email is required' };
    }
    if (!cleanToken) {
      return { success: false, error: 'Verification code is required' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'خدمة Supabase غير متصلة.' };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });

      if (error || !data?.user) {
        return { success: false, error: error?.message || 'رمز التحقق غير صالح أو منتهي الصلاحية.' };
      }

      const authUser = data.user;
      const allProfiles = this.getAllProfiles();
      const existing = allProfiles.find(
        (p) => p.email && p.email.toLowerCase() === cleanEmail
      );
      const name =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        existing?.name ||
        cleanEmail.split('@')[0];
      const avatar =
        authUser.user_metadata?.avatar_url ||
        existing?.avatar ||
        getRandomAvatar(name, false);
      const existingSlugs = allProfiles.map((p) => p.username || '');
      const username =
        authUser.user_metadata?.username ||
        existing?.username ||
        generateUserSlug(name, cleanEmail, existingSlugs);

      const communityUser: CommunityUser = {
        id: authUser.id,
        name,
        username,
        email: cleanEmail,
        avatar,
        role: (isAdminEmail(cleanEmail) ? 'admin' : (existing?.role || 'user')) as any,
        isGuest: false,
        isBanned: existing ? Boolean(existing.isBanned) : false,
        createdAt: authUser.created_at || new Date().toISOString(),
      };

      this.upsertProfile(communityUser);
      this.setCurrentUser(communityUser);
      return { success: true, user: communityUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء التحقق من الرمز.' };
    }
  },

  /**
   * Hard Sign Out:
   * 1. Invalidates session globally on Supabase server via { scope: 'global' }
   * 2. Purges all local storage auth keys (sb-*, prombo_*_user, credentials)
   * 3. Clears currentUser and admin session state
   * 4. Dispatches auth & admin logout events
   */
  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Supabase global signOut error:', err);
      }
    }

    // Hard purge local auth storage
    purgeLocalAuthKeys();
    this.setCurrentUser(null);
    safeStorage.removeItem('prombo_admin_session_v1');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_auth_change', { detail: null }));
      window.dispatchEvent(new CustomEvent('prombo_admin_logout'));
    }
  },

  /**
   * Transfer Site Ownership ("نقل الملكية")
   * 1. Re-authenticates current owner credentials against Supabase / local admin
   * 2. Validates new owner password and confirmation
   * 3. Updates Supabase Auth (email, password), public.profiles, and system_config
   * 4. Updates local admin configuration
   * 5. Forces global sign-out (scope: 'global') and purges local credentials
   */
  async transferOwnership(params: {
    currentOwnerEmail: string;
    currentOwnerPassword: string;
    newOwnerEmail: string;
    newOwnerPassword: string;
    confirmNewOwnerPassword: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> {
    const currentEmail = params.currentOwnerEmail.trim().toLowerCase();
    const newEmail = params.newOwnerEmail.trim().toLowerCase();
    const currentPassword = params.currentOwnerPassword;
    const newPassword = params.newOwnerPassword;
    const confirmPassword = params.confirmNewOwnerPassword;

    // Basic Validations
    if (!currentEmail || !currentEmail.includes('@')) {
      return { success: false, error: 'يرجى إدخال بريد المالك الحالي بشكل صحيح' };
    }
    if (!currentPassword) {
      return { success: false, error: 'يرجى إدخال كلمة مرور المالك الحالي' };
    }
    if (!newEmail || !newEmail.includes('@')) {
      return { success: false, error: 'يرجى إدخال بريد المالك الجديد بشكل صحيح' };
    }
    if (currentEmail === newEmail) {
      return { success: false, error: 'بريد المالك الجديد يجب أن يكون مختلفاً عن بريد المالك الحالي' };
    }
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 8 خانات' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور' };
    }

    // Step A: Re-authenticate Current Owner
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword,
        });

        if (authError || !authData?.user) {
          return {
            success: false,
            error: 'بيانات اعتماد المالك الحالي غير صحيحة. تعذر تأكيد الهوية.',
          };
        }

        // Verify that the authenticated user has admin privileges
        const userEmail = (authData.user.email || '').toLowerCase();
        if (!isAdminEmail(userEmail) && authData.user.user_metadata?.role !== 'admin') {
          return {
            success: false,
            error: 'الحساب الحالي ليس لديه صلاحيات المالك لنقل الملكية.',
          };
        }

        // Step C: Update Supabase Auth user credentials (email & password)
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          email: newEmail,
          password: newPassword,
          data: {
            name: 'مالك الموقع',
            full_name: 'مالك الموقع',
            role: 'admin',
          },
        });

        if (updateError) {
          return {
            success: false,
            error: `فشل تحديث بيانات المالك في Supabase: ${updateError.message}`,
          };
        }

        // Sync public.profiles
        try {
          const userId = updateData.user?.id || authData.user.id;
          await supabase.from('profiles').upsert({
            id: userId,
            email: newEmail,
            name: 'مالك الموقع',
            full_name: 'مالك الموقع',
            role: 'admin',
            is_banned: false,
            updated_at: new Date().toISOString(),
          });
        } catch (profErr) {
          console.warn('Profiles upsert during ownership transfer:', profErr);
        }

        // Sync system_config
        try {
          await supabase.from('system_config').upsert({
            id: 'site_owner',
            data: {
              ownerEmail: newEmail,
              previousOwnerEmail: currentEmail,
              transferredAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          });
        } catch (sysErr) {
          console.warn('System config upsert during ownership transfer:', sysErr);
        }
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'حدث خطأ غير متوقع أثناء معالجة نقل الملكية.',
        };
      }
    } else {
      // Local fallback verification if Supabase client is not connected
      try {
        const storedAdmin = safeStorage.getItem('prombo_admin_user_v1');
        const admin = storedAdmin ? JSON.parse(storedAdmin) : null;
        if (admin) {
          const isPasswordValid = await verifyPassword(currentPassword, admin.passwordHash);
          if (currentEmail !== admin.email?.toLowerCase() || !isPasswordValid) {
            return {
              success: false,
              error: 'بيانات اعتماد المالك الحالي غير صحيحة. تعذر تأكيد الهوية.',
            };
          }
        }
      } catch {
        return {
          success: false,
          error: 'تعذر التحقق من بيانات المالك المحلي.',
        };
      }
    }

    // Update local admin configuration
    const newPasswordHash = await hashPassword(newPassword);
    const updatedAdmin = {
      email: newEmail,
      role: 'admin',
      lastLogin: new Date().toISOString(),
      passwordHash: newPasswordHash,
    };
    safeStorage.setItem('prombo_admin_user_v1', JSON.stringify(updatedAdmin));

    // Step D: Force Global Invalidation & Session Cleanup
    await this.signOut();

    return {
      success: true,
      message: 'تم نقل ملكية الموقع بالكامل بنجاح. تم تسجيل خروج كافة الجلسات وإلغاء صلاحية الرموز السابقة.',
    };
  },

  /**
   * Sync active Supabase user into local community state
   */
  syncSupabaseUser(authUser: any): CommunityUser {
    const cleanEmail = (authUser.email || '').toLowerCase();
    const allProfiles = this.getAllProfiles();
    const existing = allProfiles.find(
      (p) => p.id === authUser.id || (p.email && p.email.toLowerCase() === cleanEmail)
    );
    const name =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      existing?.name ||
      cleanEmail.split('@')[0] ||
      'User';
    const existingSlugs = allProfiles.map((p) => p.username || '');
    const username =
      authUser.user_metadata?.username ||
      existing?.username ||
      generateUserSlug(name, cleanEmail, existingSlugs);
    const avatar =
      authUser.user_metadata?.avatar_url ||
      existing?.avatar ||
      getRandomAvatar(name, false);
    const role = (existing?.role) || (isAdminEmail(cleanEmail) ? 'admin' : 'user');

    const communityUser: CommunityUser = {
      id: authUser.id,
      name,
      username,
      email: cleanEmail,
      avatar,
      role: role as any,
      isGuest: false,
      isBanned: existing ? Boolean(existing.isBanned) : false,
      isCommunityBanned: existing ? Boolean(existing.isCommunityBanned) : false,
      isVIP: existing ? Boolean(existing.isVIP) : false,
      isPinned: existing ? Boolean(existing.isPinned) : false,
      createdAt: authUser.created_at || new Date().toISOString(),
    };

    this.upsertProfile(communityUser);
    this.setCurrentUser(communityUser);

    // Query remote profile asynchronously to ensure fresh remote permissions
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
      )
        .then(({ data }) => {
          if (data) {
            const freshUser: CommunityUser = {
              ...communityUser,
              role: data.role || communityUser.role,
              isBanned: Boolean(data.is_banned),
              isCommunityBanned: Boolean(data.is_community_banned),
              isVIP: Boolean(data.is_vip),
              isPinned: Boolean(data.is_pinned),
            };
            this.upsertProfile(freshUser);
            this.setCurrentUser(freshUser);
          }
        })
        .catch(() => {});
    }

    if (role === 'admin' && cleanEmail) {
      try {
        safeStorage.setItem(
          'prombo_admin_user_v1',
          JSON.stringify({
            email: cleanEmail,
            role: 'admin',
            lastLogin: new Date().toISOString(),
          })
        );
      } catch {}
    }

    return communityUser;
  },
};

// Auto-sync active Supabase session & fetch remote profiles on client boot
if (typeof window !== 'undefined') {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      AuthService.fetchProfilesFromSupabase().catch(() => {});

      supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          AuthService.syncSupabaseUser(data.session.user);
        }
      }).catch(() => {});

      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // Password recovery session initiated. Dispatch event for UI, but DO NOT
          // prematurely set current user until new password is saved.
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('prombo_password_recovery', {
                detail: {
                  session,
                  user: session?.user,
                  email: session?.user?.email,
                },
              })
            );
          }
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) {
          // If a password recovery flow is in progress, do not treat temporary session as completed login
          if (AuthService.isRecoveryInProgress) {
            // When verifyOtp({ type: 'recovery' }) resolves, Supabase emits SIGNED_IN.
            // Dispatch prombo_password_recovery so the UI knows an OTP was successfully verified for recovery.
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('prombo_password_recovery', {
                  detail: {
                    session,
                    user: session.user,
                    email: session.user.email,
                  },
                })
              );
            }
          } else {
            AuthService.syncSupabaseUser(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          AuthService.isRecoveryInProgress = false;
          AuthService.setCurrentUser(null);
        }
      });
    }
  } catch {}
}
