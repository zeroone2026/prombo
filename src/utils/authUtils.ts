import { CommunityUser, AdminUser } from '../types';

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

// Configured admin emails resolved dynamically from environment or persistent admin state
const DEFAULT_AUTHORIZED_ADMIN_EMAILS = [
  'zero.oneone.gamer@gmail.com',
  'admin@prombo.ai',
];

export function getConfiguredAdminEmails(): string[] {
  const envVal = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_ADMIN_EMAILS || import.meta.env?.VITE_ADMIN_EMAIL || '')) || '';
  const fromEnv = envVal
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  const list = [...DEFAULT_AUTHORIZED_ADMIN_EMAILS, ...fromEnv];
  return Array.from(new Set(list));
}

export const ADMIN_EMAILS: readonly string[] = getConfiguredAdminEmails();

/**
 * Checks if a given email is a configured admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const configured = getConfiguredAdminEmails();
  return configured.includes(clean);
}

/**
 * Checks if a user object has admin privileges
 */
export function isAdminUser(
  user: Partial<CommunityUser | AdminUser> | null | undefined
): boolean {
  if (!user) return false;
  if ('isGuest' in user && user.isGuest) return false;
  if (user.email && isAdminEmail(user.email)) return true;
  return false;
}

