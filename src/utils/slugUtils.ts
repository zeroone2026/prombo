/**
 * Utility functions for user slug generation, formatting, and shareable routes.
 */

/**
 * Generate a clean alphanumeric + underscore slug from a user's name or email.
 */
export function generateUserSlug(
  name?: string,
  email?: string,
  existingSlugs: string[] = []
): string {
  let base = '';

  // 1. If email is provided, prefix before @ is primary seed
  if (email && email.includes('@')) {
    const emailPrefix = email
      .split('@')[0]
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_');
    if (emailPrefix.replace(/_/g, '').length >= 2) {
      base = emailPrefix;
    }
  }

  // 2. If name contains latin letters, extract clean latin slug
  if (!base && name) {
    const latinized = name
      .toLowerCase()
      .trim()
      .replace(/[\s\-.]+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    if (latinized.length >= 2) {
      base = latinized;
    }
  }

  // 3. If still empty (e.g. Arabic only name or special characters), generate clean username
  if (!base) {
    base = 'user_' + Math.floor(1000 + Math.random() * 9000);
  }

  // Sanitize underscores
  base = base.replace(/^_+|_+$/g, '').replace(/_{2,}/g, '_');
  if (!base || base.length < 2) {
    base = 'user_' + Math.floor(1000 + Math.random() * 9000);
  }

  // Enforce uniqueness against existing profiles
  const cleanExisting = existingSlugs.map((s) => s.replace(/^@+/, '').toLowerCase());
  let candidate = base;
  let counter = 1;
  while (cleanExisting.includes(candidate.toLowerCase())) {
    candidate = `${base}_${counter}`;
    counter++;
  }

  return candidate;
}

/**
 * Ensures slug has the '@' prefix for display and URL parameters (e.g. "@username").
 */
export function formatUserSlug(slugOrUsername?: string): string {
  if (!slugOrUsername) return '@user';
  const clean = slugOrUsername.trim().replace(/^@+/, '');
  return `@${clean}`;
}

/**
 * Returns canonical profile route: https://prombo.app/user/@username
 */
export function getUserProfileUrl(slugOrUsername?: string): string {
  const formatted = formatUserSlug(slugOrUsername);
  return `https://prombo.app/user/${formatted}`;
}

/**
 * Returns canonical prompt content route: https://prombo.app/prompt/ID
 */
export function getContentUrl(contentId: string): string {
  const cleanId = (contentId || '').trim();
  const base = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://prombo.app';
  return `${base}/prompt/${cleanId}`;
}

/**
 * Returns canonical community post route: https://prombo.app/post/ID
 */
export function getPostUrl(postId: string): string {
  const cleanId = (postId || '').trim();
  const base = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://prombo.app';
  return `${base}/post/${cleanId}`;
}

/**
 * Robust clipboard copy utility with fallback
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, attempting fallback', err);
    }
  }

  // Fallback using textarea execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('All copy attempts failed', err);
    return false;
  }
}
