import { Category } from '../types';
import { translations, Language, TranslationDictionary } from '../i18n/translations';

/**
 * Predefined static category mapping for standard Prombo taxonomies.
 */
export const CATEGORY_I18N_KEYS: Record<string, keyof TranslationDictionary> = {
  'vibe-coding': 'catVibeCoding',
  'ai-images': 'catAiImages',
  'commercial-video': 'catCommercialVideo',
  'copywriting': 'catCopywriting',
  'marketing-growth': 'catMarketingGrowth',
  'mobile-apps': 'catMobileApps',
};

export const CATEGORY_DESC_I18N_KEYS: Record<string, keyof TranslationDictionary> = {
  'vibe-coding': 'catVibeCodingDesc',
  'ai-images': 'catAiImagesDesc',
  'commercial-video': 'catCommercialVideoDesc',
  'copywriting': 'catCopywritingDesc',
  'marketing-growth': 'catMarketingGrowthDesc',
  'mobile-apps': 'catMobileAppsDesc',
};

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  all: 'الكل',
  'vibe-coding': 'البرمجة السريعة وتطوير الويب',
  'ai-images': 'توليد الصور بالذكاء الاصطناعي',
  'commercial-video': 'الفيديو الإعلاني والموشن',
  'copywriting': 'الكتابة الإعلانية والمحتوى',
  'marketing-growth': 'التسويق والنمو',
  'mobile-apps': 'تطبيقات الهاتف وتجربة المستخدم',
  coding: 'البرمجة',
  writing: 'الكتابة والمقالات',
  business: 'الأعمال والمالية',
  marketing: 'التسويق والإعلانات',
  education: 'التعليم والعلوم',
  productivity: 'الإنتاجية وتنظيم الوقت',
  creative: 'الإبداع والتصميم',
  prompts_engineering: 'هندسة الأوامر',
};

/**
 * Returns localized category name for display across all supported UI languages.
 * Handles both object Category signature: getLocalizedCategoryName(category, t, language)
 * and legacy id signature: getLocalizedCategoryName(categoryId, categoriesList, language)
 */
export function getLocalizedCategoryName(
  categoryOrId: Category | string | undefined | null,
  tOrCategories?: any,
  languageOrFallback?: any
): string {
  if (!categoryOrId) return '';

  // 1. If passed an object Category
  if (typeof categoryOrId === 'object') {
    const cat = categoryOrId;
    const t = typeof tOrCategories === 'function' ? tOrCategories : null;
    const lang: Language = typeof languageOrFallback === 'string'
      ? (languageOrFallback as Language)
      : (typeof tOrCategories === 'string' ? (tOrCategories as Language) : 'en');

    // Check if category has an i18n dictionary key
    const i18nKey = CATEGORY_I18N_KEYS[cat.id];
    if (i18nKey) {
      if (t) {
        const val = t(i18nKey);
        if (val && val !== i18nKey) return val;
      }
      if (translations[lang]?.[i18nKey]) {
        return translations[lang][i18nKey];
      }
    }

    // Direct language override
    if (lang === 'ar' && cat.nameAr) {
      return cat.nameAr;
    }

    return cat.name || cat.id;
  }

  // 2. If passed a string category ID
  const categoryId = categoryOrId;
  const lang: Language = typeof languageOrFallback === 'string'
    ? (languageOrFallback as Language)
    : (typeof tOrCategories === 'string' ? (tOrCategories as Language) : 'en');

  if (categoryId === 'all' || categoryId === '') {
    if (typeof tOrCategories === 'function') {
      return tOrCategories('allCategories');
    }
    return lang === 'ar' ? 'جميع التصنيفات' : 'All Categories';
  }

  // If a list of categories was provided as second arg
  if (Array.isArray(tOrCategories)) {
    const found = tOrCategories.find((c) => c && c.id === categoryId);
    if (found) {
      return getLocalizedCategoryName(found, null, lang);
    }
  }

  // Check static i18n key
  const i18nKey = CATEGORY_I18N_KEYS[categoryId];
  if (i18nKey) {
    if (typeof tOrCategories === 'function') {
      const val = tOrCategories(i18nKey);
      if (val && val !== i18nKey) return val;
    }
    if (translations[lang]?.[i18nKey]) {
      return translations[lang][i18nKey];
    }
  }

  // Arabic fallback dictionary
  if (lang === 'ar' && CATEGORY_TRANSLATIONS[categoryId]) {
    return CATEGORY_TRANSLATIONS[categoryId];
  }

  // Fallback: format id
  return categoryId
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns localized category description for display
 */
export function getLocalizedCategoryDesc(
  categoryOrId: Category | string | undefined | null,
  tOrCategories?: any,
  languageOrFallback?: any
): string {
  if (!categoryOrId) return '';

  if (typeof categoryOrId === 'object') {
    const cat = categoryOrId;
    const t = typeof tOrCategories === 'function' ? tOrCategories : null;
    const lang: Language = typeof languageOrFallback === 'string'
      ? (languageOrFallback as Language)
      : (typeof tOrCategories === 'string' ? (tOrCategories as Language) : 'en');

    const i18nDescKey = CATEGORY_DESC_I18N_KEYS[cat.id];
    if (i18nDescKey) {
      if (t) {
        const val = t(i18nDescKey);
        if (val && val !== i18nDescKey) return val;
      }
      if (translations[lang]?.[i18nDescKey]) {
        return translations[lang][i18nDescKey];
      }
    }

    if (lang === 'ar' && cat.descriptionAr) {
      return cat.descriptionAr;
    }

    return cat.description || '';
  }

  return '';
}
