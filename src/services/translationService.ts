import { Language } from '../i18n/translations';

const STORAGE_CACHE_KEY = 'prombo_translation_cache_v3';

// In-memory translation cache to guarantee zero redundant network calls
const translationCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string>>();

/**
 * Detects whether the machine translation result is an API error string
 */
export function isTranslationError(text: string | null | undefined): boolean {
  if (!text) return true;
  const upper = text.trim().toUpperCase();
  return (
    upper.includes('PLEASE SELECT TWO DISTINCT LANGUAGES') ||
    upper.includes('INVALID TARGET LANGUAGE') ||
    upper.includes('MYMEMORY WARNING') ||
    upper.includes('NO QUERY SPECIFIED') ||
    upper.includes('LIMIT EXCEEDED') ||
    upper.includes('QUOTA EXCEEDED') ||
    upper.includes('IS AN INVALID TARGET LANGUAGE') ||
    upper.includes('FAILED TO TRANSLATE')
  );
}

/**
 * Detects the dominant natural language / script of the provided text.
 * Unicode character range mapping:
 * - Arabic script (\u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF): 'ar'
 * - Devanagari script (\u0900-\u097F): 'hi'
 * - Japanese Kana (Hiragana/Katakana \u3040-\u30FF): 'ja'
 * - CJK Ideographs (\u4e00-\u9fff, \u3400-\u4dbf): 'zh' (or 'ja' if Kana is present)
 * - Latin script ([a-zA-Z\u00C0-\u024F]): 'en' (or 'fr' / 'es' if specific diacritics/words match)
 * - Unknown / symbols only / empty: 'unknown'
 */
export function detectScriptLanguage(text: string, currentUILang?: Language): Language | 'unknown' {
  if (!text) return 'unknown';
  const trimmed = text.trim();
  if (!trimmed) return 'unknown';

  // Strip URLs, common code symbols, numbers, punctuation, spaces, emojis
  const clean = trimmed
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[0-9\s.,!?:;'"(){}\[\]/\\@#$%^&*_\-+=<>~`|]/g, '');

  if (!clean) return 'unknown';

  // Count script occurrences
  const arabicMatches = clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  const devanagariMatches = clean.match(/[\u0900-\u097F]/g);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;

  const kanaMatches = clean.match(/[\u3040-\u309F\u30A0-\u30FF]/g);
  const kanaCount = kanaMatches ? kanaMatches.length : 0;

  const cjkMatches = clean.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  const latinMatches = clean.match(/[a-zA-Z\u00C0-\u024F]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  const totalLetters = arabicCount + devanagariCount + kanaCount + cjkCount + latinCount;
  if (totalLetters === 0) return 'unknown';

  // 1. Arabic dominance
  if (
    arabicCount > 0 &&
    arabicCount >= devanagariCount &&
    arabicCount >= (kanaCount + cjkCount) &&
    arabicCount >= latinCount
  ) {
    return 'ar';
  }

  // 2. Devanagari dominance (Hindi)
  if (
    devanagariCount > 0 &&
    devanagariCount >= arabicCount &&
    devanagariCount >= (kanaCount + cjkCount) &&
    devanagariCount >= latinCount
  ) {
    return 'hi';
  }

  // 3. Japanese (Kana is a definitive indicator of Japanese text, even when Kanji is present)
  if (kanaCount > 0) {
    return 'ja';
  }

  // 4. CJK Hanzi (Chinese, when no Japanese Kana present)
  if (cjkCount > 0 && cjkCount >= latinCount && cjkCount >= arabicCount) {
    return 'zh';
  }

  // 5. Latin scripts (English, French, Spanish)
  if (latinCount > 0) {
    // Check for distinctive Spanish markers
    if (/[ñ¿¡]/i.test(trimmed)) {
      return 'es';
    }
    // Check for distinctive French ligatures / markers
    if (/[œæç]/i.test(trimmed)) {
      return 'fr';
    }
    // If the active UI is French and text has accented vowels
    if (currentUILang === 'fr' && /[éèêëàâôûù]/i.test(trimmed)) {
      return 'fr';
    }
    // If the active UI is Spanish and text has accented vowels
    if (currentUILang === 'es' && /[áéíóúü]/i.test(trimmed)) {
      return 'es';
    }
    // Check common high-frequency functional words for French & Spanish
    if (currentUILang === 'fr' || currentUILang === 'es') {
      const words = trimmed.toLowerCase().split(/\s+/);
      if (currentUILang === 'fr') {
        const frenchWords = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'dans', 'pour', 'avec', 'sur', 'ce', 'cette', 'merci', 'bonjour']);
        if (words.some((w) => frenchWords.has(w))) {
          return 'fr';
        }
      }
      if (currentUILang === 'es') {
        const spanishWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'es', 'son', 'en', 'por', 'para', 'con', 'gracias', 'hola', 'este', 'esta']);
        if (words.some((w) => spanishWords.has(w))) {
          return 'es';
        }
      }
    }
    return 'en';
  }

  return 'unknown';
}

// Initialize cache from localStorage if available, filtering out any legacy error strings
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string' && !isTranslationError(v)) {
            translationCache.set(k, v);
          }
        });
      }
    }
  } catch {
    // Ignore storage parse errors
  }
}

function persistCache() {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, string> = {};
    let count = 0;
    // Keep max 500 recent items in localStorage to stay compact
    translationCache.forEach((val, key) => {
      if (count < 500 && !isTranslationError(val)) {
        obj[key] = val;
        count++;
      }
    });
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Quota exceeded or private mode
  }
}

/**
 * Maps app Language codes to standard BCP-47 / MT language identifiers
 */
const LANGUAGE_API_MAP: Record<Language, string> = {
  ar: 'ar',
  en: 'en',
  fr: 'fr',
  es: 'es',
  zh: 'zh-CN',
  hi: 'hi',
  ja: 'ja',
};

/**
 * Decodes HTML entities commonly returned by machine translation engines
 */
function decodeHTMLEntities(text: string): string {
  if (!text) return '';
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return doc.body.textContent || text;
    } catch {}
  }
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage?: string;
  isFallback?: boolean;
}

/**
 * Translates text on-demand to the requested target language with smart guardrails:
 * 1. Early Return Guardrail: If source language matches targetLang, return original text immediately.
 * 2. Fast in-memory + localStorage persistent cache (with error string sanitization)
 * 3. In-flight promise deduplication
 * 4. Browser native on-device AI Translator API (Chrome 131+ built-in AI) if available
 * 5. Client-side MT fallback with explicit source/target language pair
 * 6. Graceful fallback to original content on any API error or warning.
 */
export async function translateText(
  text: string,
  targetLang: Language
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Early Guardrail: Detect source language.
  const detected = detectScriptLanguage(trimmed, targetLang);
  if (detected === targetLang || detected === 'unknown') {
    return trimmed;
  }

  const targetCode = LANGUAGE_API_MAP[targetLang] || targetLang;
  const cacheKey = `${targetCode}:::${trimmed}`;

  // 1. Check in-memory / local cache
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey)!;
    if (!isTranslationError(cached)) {
      return cached;
    }
    translationCache.delete(cacheKey);
  }

  // Deduplicate identical in-flight requests
  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey)!;
  }

  const promise = (async () => {
    // 2. Try Chrome Built-in AI Translation API if available in browser
    try {
      const navWindow = typeof window !== 'undefined' ? (window as any) : null;
      if (navWindow?.translation?.createTranslator) {
        const canTranslate = await navWindow.translation.canTranslate?.({
          targetLanguage: targetCode,
        });
        if (canTranslate === 'readily' || canTranslate === 'after-download') {
          const translator = await navWindow.translation.createTranslator({
            targetLanguage: targetCode,
          });
          const result = await translator.translate(trimmed);
          if (result && typeof result === 'string' && !isTranslationError(result)) {
            translationCache.set(cacheKey, result);
            persistCache();
            return result;
          }
        }
      }
    } catch {
      // Graceful fallback to client-side API
    }

    // 3. Client-side fetch via MyMemory free MT API
    try {
      const sourceCode = LANGUAGE_API_MAP[detected] || detected;
      
      // If sourceCode and targetCode are the same, do not make network call
      if (sourceCode === targetCode) {
        return trimmed;
      }

      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        trimmed
      )}&langpair=${encodeURIComponent(sourceCode)}|${encodeURIComponent(targetCode)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.responseData?.translatedText) {
          let cleanText = decodeHTMLEntities(data.responseData.translatedText);
          cleanText = cleanText.replace(/&amp;#39;/g, "'").trim();
          
          // Validate that the returned text is not an API error message
          if (cleanText && cleanText.length > 0 && !isTranslationError(cleanText)) {
            translationCache.set(cacheKey, cleanText);
            persistCache();
            return cleanText;
          }
        }
      }
    } catch (err) {
      console.warn('Translation request failed, returning original text:', err);
    }

    // Graceful fallback: return original text if translation service is unavailable or returned an error
    return trimmed;
  })().finally(() => {
    pendingPromises.delete(cacheKey);
  });

  pendingPromises.set(cacheKey, promise);
  return promise;
}
