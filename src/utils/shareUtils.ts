import { copyTextToClipboard } from './slugUtils';
import { getDefaultPageTitle, updateDocumentMetadata } from './seoUtils';

export type SharePlatformId =
  | 'whatsapp'
  | 'telegram'
  | 'twitter'
  | 'facebook'
  | 'threads'
  | 'linkedin'
  | 'snapchat'
  | 'instagram'
  | 'native'
  | 'copy';

export interface ShareDataPayload {
  title?: string;
  text?: string;
  url?: string;
  language?: string;
}

/**
 * Dispatches a global toast notification event that App.tsx listens to.
 */
export function triggerAppToast(
  message: string,
  type: 'success' | 'info' | 'error' = 'success',
  duration: number = 3500
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('prombo_toast', {
        detail: { message, type, duration },
      })
    );
  }
}

/**
 * Returns a high-converting viral message adapted to user language
 */
export function getViralShareMessage(language: string = 'ar', customTitle?: string): string {
  if (customTitle) {
    if (language === 'ar') {
      return `شاهد هذا البرومبت الرائع على برومبو: "${customTitle}" 🚀\nاكتشف أكبر مكتبة برومبتات ذكاء اصطناعي لتوليد الأكواد والتصاميم والفيديوهات:`;
    }
    return `Check out this amazing prompt on Prombo: "${customTitle}" 🚀\nDiscover the curated AI prompt repository for Vibe Coding, Images & Videos:`;
  }

  switch (language) {
    case 'ar':
      return 'اكتشف برومبو Prombo - منصة برومبتات الذكاء الاصطناعي الأقوى لتوليد الأكواد (Vibe Coding)، الصور، الفيديوهات وكتابة المحتوى! 🚀🔥';
    case 'fr':
      return 'Découvrez Prombo - La bibliothèque ultime de prompts IA pour le Vibe Coding, la génération d’images et de vidéos ! 🚀🔥';
    case 'es':
      return '¡Descubre Prombo: la biblioteca de prompts de IA para Vibe Coding, generación de imágenes y videos! 🚀🔥';
    case 'zh':
      return '探索 Prombo - 精选 AI 提示词库，轻松搞定 Vibe Coding、图像创作与爆款视频！🚀🔥';
    case 'hi':
      return 'Prombo देखें - कोडिंग, एआई इमेज और वीडियो के लिए सर्वश्रेष्ठ AI प्रॉम्प्ट लाइब्रेरी! 🚀🔥';
    case 'ja':
      return 'Prombo を発見 - Vibe Coding、AI 画像、動画向けの厳選 AI プロンプト ライブラリ！🚀🔥';
    default:
      return 'Discover Prombo - The ultimate curated AI prompt library for Vibe Coding, AI Images, Videos & Copywriting! 🚀🔥';
  }
}

/**
 * Returns canonical or current clean shareable URL
 */
export function getShareableUrl(customUrl?: string): string {
  if (customUrl && customUrl.startsWith('http')) {
    return customUrl;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin + (customUrl ? customUrl : window.location.pathname);
  }
  return 'https://prombo.app';
}

/**
 * Checks if navigator.share is available and functional in current client
 */
export function isNativeShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Executes a share action for a given platform.
 * Returns true if action succeeded.
 */
export async function executeShare(
  platform: SharePlatformId,
  data: ShareDataPayload = {}
): Promise<{ success: boolean; message?: string }> {
  const lang = (data.language || 'en') as any;
  const url = getShareableUrl(data.url);
  const text = data.text || getViralShareMessage(lang, data.title);
  const defaultTitle = getDefaultPageTitle(lang);
  const title = data.title
    ? `${data.title} - ${lang === 'ar' ? 'برومبو' : 'Prombo'}`
    : defaultTitle;

  // Dynamically synchronize live document head OpenGraph metadata
  updateDocumentMetadata({
    language: lang,
    promptTitle: data.title,
    url,
  });

  const isRtl = lang === 'ar';

  switch (platform) {
    case 'whatsapp': {
      const fullText = `${text}\n${url}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    }

    case 'telegram': {
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(tgUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    }

    case 'twitter': {
      const twUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(twUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    }

    case 'facebook': {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
      window.open(fbUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    }

    case 'threads': {
      const threadsText = `${text}\n${url}`;
      const thUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(threadsText)}`;
      window.open(thUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    }

    case 'linkedin': {
      const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      window.open(liUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    }

    case 'snapchat': {
      // If mobile with native share, attempt native share first
      if (isNativeShareSupported() && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
        try {
          await navigator.share({ title, text, url });
          return { success: true };
        } catch (err: any) {
          if (err?.name === 'AbortError') return { success: false };
        }
      }
      // Snapchat web share kit
      const snapUrl = `https://www.snapchat.com/share?link=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(snapUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    }

    case 'instagram': {
      // Instagram Stories / Direct is mobile-first: use native share if possible
      if (isNativeShareSupported()) {
        try {
          await navigator.share({ title, text, url });
          return { success: true };
        } catch (err: any) {
          if (err?.name === 'AbortError') return { success: false };
        }
      }

      // Smart fallback: copy link with clear guidance toast
      await copyTextToClipboard(url);
      const msg = isRtl
        ? 'تم نسخ الرابط! يمكنك الآن مشاركته في قصتك أو في رسائلك على إنستغرام 📸'
        : 'Link copied! You can now share it in your Instagram story, bio, or DMs 📸';
      triggerAppToast(msg, 'success', 4000);
      return { success: true, message: msg };
    }

    case 'native': {
      if (isNativeShareSupported()) {
        try {
          await navigator.share({ title, text, url });
          return { success: true };
        } catch (err: any) {
          if (err?.name === 'AbortError') return { success: false };
        }
      }

      // Fallback to copy link
      await copyTextToClipboard(url);
      const msg = isRtl ? 'تم نسخ الرابط بنجاح إلى الحافظة!' : 'Link copied to clipboard!';
      triggerAppToast(msg, 'success', 3000);
      return { success: true, message: msg };
    }

    case 'copy': {
      const ok = await copyTextToClipboard(url);
      if (ok) {
        const msg = isRtl ? 'تم نسخ الرابط بنجاح إلى الحافظة!' : 'Link copied to clipboard!';
        triggerAppToast(msg, 'success', 3000);
        return { success: true, message: msg };
      }
      return { success: false };
    }

    default:
      return { success: false };
  }
}
