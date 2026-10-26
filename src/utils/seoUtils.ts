import { Language } from '../i18n/translations';

export interface LocaleMetaInfo {
  title: string;
  description: string;
  ogLocale: string;
}

export const LOCALE_METADATA: Record<Language, LocaleMetaInfo> = {
  en: {
    title: 'Prombo - AI Prompt Library',
    description: 'Discover, customize, and share curated AI prompts for Vibe Coding, AI Images, Videos, and Copywriting. Free, multi-language, and clutter-free.',
    ogLocale: 'en_US',
  },
  zh: {
    title: 'Prombo - AI 提示词库',
    description: '精选优质 AI 提示词库，覆盖 Vibe Coding、AI 绘图、商业视频与创意文案。免费、多语言支持且无干扰。',
    ogLocale: 'zh_CN',
  },
  ar: {
    title: 'Prombo | برومبو - مكتبة الأوامر والبرومبت',
    description: 'اكتشف وخصص وشارك أفضل برومبتات الذكاء الاصطناعي للبرمجة (Vibe Coding)، وتوليد الصور، والفيديو وكتابة المحتوى. منصة مجانية ومتعددة اللغات.',
    ogLocale: 'ar_AR',
  },
  fr: {
    title: 'Prombo - Bibliothèque de Prompts IA',
    description: "Découvrez, personnalisez et partagez des prompts IA pour le Vibe Coding, la génération d'images, de vidéos et de rédaction. Gratuit et multilingue.",
    ogLocale: 'fr_FR',
  },
  es: {
    title: 'Prombo - Biblioteca de Prompts de IA',
    description: 'Descubre, personaliza y comparte prompts de IA para Vibe Coding, imágenes, videos y redacción creativa. Gratis, multilingüe y sin distracciones.',
    ogLocale: 'es_ES',
  },
  hi: {
    title: 'Prombo - एआई प्रॉम्प्ट लाइब्रेरी',
    description: 'वाइब कोडिंग, एआई इमेज, वीडियो और कॉपीराइटिंग के लिए बेहतरीन एआई प्रॉम्प्ट्स खोजें और साझा करें। निःशुल्क और बहुभाषी।',
    ogLocale: 'hi_IN',
  },
  ja: {
    title: 'Prombo - AI プロンプト ライブラリ',
    description: 'Vibe Coding、画像生成、動画制作、コピーライティング向けの厳選されたAIプロンプトを発見・カスタマイズ・共有。無料・多言語対応。',
    ogLocale: 'ja_JP',
  },
};

export interface DocumentMetadataOptions {
  language: Language;
  promptTitle?: string;
  promptDescription?: string;
  pageTitle?: string;
  url?: string;
}

/**
 * Returns localized default title for a given language
 */
export function getDefaultPageTitle(language: Language): string {
  return LOCALE_METADATA[language]?.title || LOCALE_METADATA.en.title;
}

/**
 * Returns localized default description for a given language
 */
export function getDefaultPageDescription(language: Language): string {
  return LOCALE_METADATA[language]?.description || LOCALE_METADATA.en.description;
}

/**
 * Helper to dynamically set or update head metadata:
 * - document.title
 * - meta[name="description"]
 * - meta[property="og:title"]
 * - meta[property="og:description"]
 * - meta[property="og:locale"]
 * - meta[property="og:site_name"]
 * - meta[property="og:url"]
 * - meta[name="twitter:title"]
 * - meta[name="twitter:description"]
 * - html[lang] & html[dir]
 * - Schema.org JSON-LD
 */
export function updateDocumentMetadata({
  language,
  promptTitle,
  promptDescription,
  pageTitle,
  url,
}: DocumentMetadataOptions): void {
  if (typeof document === 'undefined') return;

  const defaultMeta = LOCALE_METADATA[language] || LOCALE_METADATA.en;

  let finalTitle = defaultMeta.title;
  let finalDescription = defaultMeta.description;

  if (promptTitle && promptTitle.trim()) {
    const brandSuffix = language === 'ar' ? 'برومبو' : 'Prombo';
    finalTitle = `${promptTitle.trim()} - ${brandSuffix}`;
    if (promptDescription && promptDescription.trim()) {
      const cleanDesc = promptDescription.trim();
      finalDescription = cleanDesc.length > 160 ? `${cleanDesc.slice(0, 157)}...` : cleanDesc;
    }
  } else if (pageTitle && pageTitle.trim()) {
    const brandSuffix = language === 'ar' ? 'برومبو' : 'Prombo';
    finalTitle = `${pageTitle.trim()} - ${brandSuffix}`;
  }

  // 1. Update document.title
  document.title = finalTitle;

  // 2. Set or create meta element helper
  const setMeta = (attributeName: 'name' | 'property', attrValue: string, content: string) => {
    let el = document.querySelector(`meta[${attributeName}="${attrValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attributeName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 3. Update standard description
  setMeta('name', 'description', finalDescription);

  // 4. Update OpenGraph tags
  setMeta('property', 'og:title', finalTitle);
  setMeta('property', 'og:description', finalDescription);
  setMeta('property', 'og:site_name', language === 'ar' ? 'برومبو' : 'Prombo');
  setMeta('property', 'og:locale', defaultMeta.ogLocale);

  if (url) {
    setMeta('property', 'og:url', url);
  }

  // 5. Update Twitter / X Card tags
  setMeta('name', 'twitter:title', finalTitle);
  setMeta('name', 'twitter:description', finalDescription);

  // 6. Update HTML lang & dir
  document.documentElement.setAttribute('lang', language);
  document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');

  // 7. Update JSON-LD structured data
  try {
    const scriptLd = document.querySelector('script[type="application/ld+json"]');
    if (scriptLd && scriptLd.textContent) {
      const parsed = JSON.parse(scriptLd.textContent);
      parsed.name = language === 'ar' ? 'برومبو | Prombo' : 'Prombo';
      parsed.description = finalDescription;
      scriptLd.textContent = JSON.stringify(parsed, null, 2);
    }
  } catch (e) {
    // Non-fatal
  }
}
