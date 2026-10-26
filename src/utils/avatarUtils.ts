import { PRESET_AVATARS, getPresetAvatarById } from '../data/presetAvatars';

export interface DynamicAvatarOptions {
  name?: string;
  isGuest?: boolean;
  size?: number;
  colorOverride?: {
    bg1: string;
    bg2: string;
    text?: string;
    ring?: string;
  };
}

// Vibrant bright/warm gradients for Registered Users
const REGISTERED_PALETTES = [
  { start: '#10b981', end: '#047857', ring: '#34d399', text: '#ffffff', glow: 'rgba(16,185,129,0.5)' }, // Emerald
  { start: '#6366f1', end: '#4338ca', ring: '#818cf8', text: '#ffffff', glow: 'rgba(99,102,241,0.5)' }, // Indigo
  { start: '#f59e0b', end: '#b45309', ring: '#fbbf24', text: '#ffffff', glow: 'rgba(245,158,11,0.5)' }, // Amber
  { start: '#f43f5e', end: '#be123c', ring: '#fb7185', text: '#ffffff', glow: 'rgba(244,63,94,0.5)' }, // Rose
  { start: '#8b5cf6', end: '#6d28d9', ring: '#a78bfa', text: '#ffffff', glow: 'rgba(139,92,246,0.5)' }, // Violet
  { start: '#06b6d4', end: '#0e7490', ring: '#22d3ee', text: '#ffffff', glow: 'rgba(6,182,212,0.5)' }, // Cyan
  { start: '#f97316', end: '#c2410c', ring: '#fb923c', text: '#ffffff', glow: 'rgba(249,115,22,0.5)' }, // Orange
  { start: '#14b8a6', end: '#0f766e', ring: '#2dd4bf', text: '#ffffff', glow: 'rgba(20,184,166,0.5)' }, // Teal
];

// Dark, muted backgrounds for Guests / Unregistered Visitors
const GUEST_PALETTES = [
  { start: '#1e293b', end: '#0f172a', ring: '#475569', text: '#94a3b8', glow: 'rgba(30,41,59,0.3)' }, // Slate 800
  { start: '#18181b', end: '#09090b', ring: '#3f3f46', text: '#a1a1aa', glow: 'rgba(24,24,27,0.3)' }, // Zinc 900
  { start: '#1c1917', end: '#0c0a09', ring: '#44403c', text: '#a8a29e', glow: 'rgba(28,25,23,0.3)' }, // Stone 900
  { start: '#111827', end: '#030712', ring: '#374151', text: '#9ca3af', glow: 'rgba(17,24,39,0.3)' }, // Gray 900
];

/**
 * Extracts first uppercase character or Arabic character from name string
 */
export function getInitialCharacter(name?: string): string {
  if (!name || !name.trim()) return 'P';
  const trimmed = name.trim();
  // Strip leading symbols or guest prefix if wanted, or take first valid letter
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (/[\p{L}\p{N}]/u.test(char)) {
      return char.toUpperCase();
    }
  }
  return trimmed[0].toUpperCase();
}

/**
 * Deterministic hash based on name string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates dynamic initial SVG Data URI
 */
export function getDynamicInitialSvg(options: DynamicAvatarOptions): string {
  const { name = 'User', isGuest = false, size = 128, colorOverride } = options;
  const initial = getInitialCharacter(name);
  const hash = hashString(name);

  const palette = colorOverride
    ? {
        start: colorOverride.bg1,
        end: colorOverride.bg2,
        ring: colorOverride.ring || colorOverride.bg1,
        text: colorOverride.text || '#ffffff',
        glow: 'rgba(249,115,22,0.4)',
      }
    : isGuest
    ? GUEST_PALETTES[hash % GUEST_PALETTES.length]
    : REGISTERED_PALETTES[hash % REGISTERED_PALETTES.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
  <defs>
    <linearGradient id="avatar_grad_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.start}"/>
      <stop offset="100%" stop-color="${palette.end}"/>
    </linearGradient>
    <filter id="initial_glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Background Circle -->
  <circle cx="64" cy="64" r="58" fill="url(#avatar_grad_${hash})" stroke="${palette.ring}" stroke-width="${isGuest ? '2' : '3'}"/>

  <!-- Initial Letter -->
  <text 
    x="64" 
    y="74" 
    fill="${palette.text}" 
    font-size="52" 
    font-weight="bold" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', sans-serif" 
    text-anchor="middle" 
    dominant-baseline="central"
    filter="url(#initial_glow)"
  >${initial}</text>
  ${
    isGuest
      ? `<!-- Guest Badge Indicator -->
  <circle cx="98" cy="98" r="14" fill="#0f172a" stroke="#475569" stroke-width="2"/>
  <text x="98" y="102" fill="#94a3b8" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">G</text>`
      : ''
  }
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Check if string is a preset avatar id
 */
export function isPresetAvatarId(avatarStr?: string): boolean {
  if (!avatarStr) return false;
  return avatarStr.startsWith('preset_');
}

/**
 * Resolves any user avatar string to a valid image source (Preset URI, URL, or Dynamic Initial SVG)
 */
export function resolveUserAvatar(
  user?: { name?: string; avatar?: string; isGuest?: boolean } | null,
  fallbackName?: string
): string {
  const name = user?.name || fallbackName || 'User';
  const isGuest = user?.isGuest ?? true;

  if (user?.avatar) {
    // If it's a preset avatar ID, resolve it to its rich SVG data URI
    if (isPresetAvatarId(user.avatar)) {
      const preset = getPresetAvatarById(user.avatar);
      if (preset) return preset.svgDataUri;
    }
    // If it starts with data: or http:// or https://
    if (user.avatar.startsWith('data:') || user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
      return user.avatar;
    }
  }

  // Fallback to Dynamic Initial SVG Generator
  return getDynamicInitialSvg({ name, isGuest });
}

/**
 * Compresses an uploaded image file on the client side using HTML Canvas.
 * Produces an optimized, lightweight WebP/JPEG base64 data URI (256x256 max).
 */
export function compressAvatarImage(
  file: File,
  maxDimension: number = 256,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Make it a square crop/scale
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(minDim, maxDimension);
        canvas.height = Math.min(minDim, maxDimension);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        ctx.drawImage(
          img,
          startX,
          startY,
          minDim,
          minDim,
          0,
          0,
          canvas.width,
          canvas.height
        );

        try {
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve(dataUrl);
        } catch {
          // Fallback to standard jpeg
          const fallbackDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(fallbackDataUrl);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
