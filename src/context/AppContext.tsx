import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, TranslationDictionary, translations, getBrandName } from '../i18n/translations';
import { updateDocumentMetadata } from '../utils/seoUtils';

type Theme = 'dark' | 'light';

export type TranslationFunction = ((key: keyof TranslationDictionary | string, params?: Record<string, any>) => string) & TranslationDictionary;

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: TranslationFunction;
  isRTL: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LANGUAGE_KEY = 'prombo_language';
const THEME_KEY = 'prombo_theme';

const VALID_LANGUAGES: Language[] = ['en', 'fr', 'es', 'zh', 'ar', 'hi', 'ja'];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auto-detect language with localStorage persistence
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const savedLang = (localStorage.getItem(LANGUAGE_KEY) || localStorage.getItem('language')) as Language | null;
      if (savedLang && VALID_LANGUAGES.includes(savedLang)) {
        return savedLang;
      }
      // Detect browser language
      if (typeof navigator !== 'undefined' && navigator.language) {
        const primaryCode = navigator.language.toLowerCase().split('-')[0] as Language;
        if (VALID_LANGUAGES.includes(primaryCode)) {
          return primaryCode;
        }
      }
    } catch (e) {
      console.warn('Could not read saved language', e);
    }
    return 'en';
  });

  // Auto-detect theme
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      // Detect OS prefers-color-scheme
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (e) {
      console.warn('Could not read saved theme', e);
    }
    return 'dark';
  });

  // Apply Language, HTML Dir, and dynamic OpenGraph/Meta tags
  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
      localStorage.setItem('language', language);
      updateDocumentMetadata({ language });
    } catch (e) {
      console.warn('Failed to update language attributes and SEO meta', e);
    }
  }, [language]);

  // Apply Theme class
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.style.backgroundColor = '#121824';
        document.body.style.color = '#F1F5F9';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.body.style.backgroundColor = '#FDFBF7';
        document.body.style.color = '#1E293B';
      }
    } catch (e) {
      console.warn('Failed to update theme classes', e);
    }
  }, [theme]);

  // Apply Language & Direction
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('lang', language);
      document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    } catch (e) {
      console.warn('Failed to update language direction attribute', e);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
      localStorage.setItem('language', lang);
    } catch (e) {
      console.warn('Could not save language to localStorage', e);
    }
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    const next = language === 'en' ? 'ar' : 'en';
    setLanguage(next);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const interpolate = (template: string, params?: Record<string, any>): string => {
    if (!params) return template;
    let result = template;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result
        .replace(new RegExp(`\\{\\{\\s*${paramKey}\\s*\\}\\}`, 'g'), String(paramValue))
        .replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
        .replace(new RegExp(`:${paramKey}\\b`, 'g'), String(paramValue));
    }
    return result;
  };

  const tBase = (key: keyof TranslationDictionary | string, params?: Record<string, any>): string => {
    const k = String(key);
    const curDict = translations[language] as any;
    const enDict = translations['en'] as any;

    if (curDict && curDict[k] !== undefined && curDict[k] !== '') {
      return interpolate(curDict[k], params);
    }
    if (enDict && enDict[k] !== undefined && enDict[k] !== '') {
      return interpolate(enDict[k], params);
    }

    if (k.includes('.')) {
      const parts = k.split('.');
      let curVal = curDict;
      for (const part of parts) {
        curVal = curVal?.[part];
      }
      if (typeof curVal === 'string' && curVal !== '') {
        return interpolate(curVal, params);
      }

      let enVal = enDict;
      for (const part of parts) {
        enVal = enVal?.[part];
      }
      if (typeof enVal === 'string' && enVal !== '') {
        return interpolate(enVal, params);
      }
    }

    return interpolate(k, params);
  };

  const t = new Proxy(tBase, {
    get(target, prop: string) {
      if (prop in target) {
        return (target as any)[prop];
      }
      const curDict = translations[language] as any;
      const enDict = translations['en'] as any;

      if (curDict && curDict[prop] !== undefined) {
        return curDict[prop];
      }
      if (enDict && enDict[prop] !== undefined) {
        return enDict[prop];
      }

      if (prop.includes('.')) {
        const parts = prop.split('.');
        let curVal = curDict;
        for (const part of parts) {
          curVal = curVal?.[part];
        }
        if (curVal !== undefined) return curVal;

        let enVal = enDict;
        for (const part of parts) {
          enVal = enVal?.[part];
        }
        if (enVal !== undefined) return enVal;
      }

      return prop;
    }
  }) as TranslationFunction;

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        theme,
        setTheme,
        toggleTheme,
        t,
        isRTL: language === 'ar',
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { t, language, isRTL } = useApp();
  return { t, language, isRTL };
};
