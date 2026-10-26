/**
 * Security Utilities for Prombo Platform
 * Handles Web Crypto SHA-256 password hashing, URL protocol sanitization, and safe storage access.
 */

/**
 * Computes a SHA-256 hash of a string using the native Web Crypto API.
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback simple deterministic hash in non-crypto environments
    let hash = 0;
    for (let i = 0; i < plainText.length; i++) {
      const char = plainText.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_${Math.abs(hash)}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies if an input password matches the stored hash or plaintext (legacy fallback).
 */
export async function verifyPassword(
  inputPassword: string,
  storedHashOrPlain: string
): Promise<boolean> {
  if (!inputPassword || !storedHashOrPlain) return false;

  // Direct match (legacy plain text or exact match)
  if (inputPassword === storedHashOrPlain) {
    return true;
  }

  // Check SHA-256 hash match
  try {
    const computedHash = await hashPassword(inputPassword);
    return computedHash === storedHashOrPlain;
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes URLs to prevent javascript: or data: XSS attacks.
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Allow safe protocols only
  if (/^(https?:\/\/|\/|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  
  // Reject unsafe protocols (javascript:, data:, vbscript:)
  return '';
}

/**
 * Sanitizes ad snippet code to prevent unsafe event handlers, base URI hijacking, and malicious inline scripts.
 */
export function sanitizeAdSnippet(htmlSnippet: string | undefined | null): string {
  if (!htmlSnippet) return '';
  let clean = htmlSnippet
    // Remove dangerous tags that can hijack page routing or state
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    // Remove javascript:, vbscript:, and unsafe data: URIs in attributes
    .replace(/(href|src|action)\s*=\s*(['"]?)\s*(?:javascript|vbscript|data\s*:\s*text\/html):/gi, '$1=$2about:blank')
    // Remove all inline event handlers (e.g. onerror=, onclick=, onload=, onmouseover=) with quotes, backticks, or unquoted
    .replace(/\bon\w+\s*=\s*(['"`]).*?\1/gi, '')
    .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '');

  return clean;
}

/**
 * Safe LocalStorage accessor to prevent crashes in private browsing or iframe environments
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to read ${key}:`, e);
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to write ${key}:`, e);
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to remove ${key}:`, e);
      return false;
    }
  },
};
