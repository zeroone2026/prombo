import React, { useState, useEffect, useMemo } from 'react';
import { Languages, RotateCcw, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translateText, detectScriptLanguage, isTranslationError } from '../services/translationService';

interface TranslatableContentProps {
  content: string;
  renderFormatted?: (text: string) => React.ReactNode;
  as?: 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  className?: string;
  containerClassName?: string;
  buttonClassName?: string;
  id?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export const TranslatableContent: React.FC<TranslatableContentProps> = ({
  content,
  renderFormatted,
  as: Component = 'div',
  className = '',
  containerClassName = '',
  buttonClassName = '',
  id,
  onClick,
  title,
}) => {
  const { language, t } = useApp();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const trimmed = (content || '').trim();

  // Detect the script/language of the source text
  const detectedLanguage = useMemo(() => {
    return detectScriptLanguage(trimmed, language);
  }, [trimmed, language]);

  // Guardrail: Does the source text already match the active UI language or is it untranslatable symbols?
  const isSameLanguage = Boolean(
    !trimmed ||
    detectedLanguage === language ||
    detectedLanguage === 'unknown'
  );

  // Automatically translate upon language switch or content change ONLY if languages differ
  useEffect(() => {
    let isMounted = true;

    // Early Guardrail: If content language already matches the active user UI language, skip translation entirely
    if (isSameLanguage || !trimmed) {
      setTranslatedText(null);
      setIsLoading(false);
      setIsShowingOriginal(false);
      return;
    }

    // Default to displaying translated text once available
    setIsShowingOriginal(false);
    setIsLoading(true);

    translateText(trimmed, language)
      .then((translated) => {
        if (!isMounted) return;
        if (
          translated &&
          !isTranslationError(translated) &&
          translated.trim().toLowerCase() !== trimmed.toLowerCase()
        ) {
          setTranslatedText(translated);
        } else {
          setTranslatedText(null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Auto translation failed:', err);
        if (isMounted) {
          setTranslatedText(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [trimmed, language, isSameLanguage]);

  // Valid translation exists only when different language, non-error, and distinct from source
  const hasValidTranslation = Boolean(
    !isSameLanguage &&
    translatedText &&
    !isTranslationError(translatedText) &&
    translatedText.trim().toLowerCase() !== trimmed.toLowerCase()
  );

  // By default, display the translated text. If showing original or invalid, display initial source text.
  const displayText = !isShowingOriginal && hasValidTranslation && translatedText ? translatedText : content;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShowingOriginal((prev) => !prev);
  };

  return (
    <div className={`space-y-1.5 ${containerClassName}`} id={id}>
      {/* Content Text Body */}
      <Component className={className} onClick={onClick} title={title}>
        {renderFormatted ? renderFormatted(displayText) : displayText}
      </Component>

      {/* Render the toggle button ONLY when detectedLanguage !== currentUILanguage */}
      {!isSameLanguage && (hasValidTranslation || isLoading) && (
        <div
          className="flex items-center pt-0.5 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors cursor-pointer rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500/40 disabled:opacity-60 ${
              !isShowingOriginal
                ? 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                : 'text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
            } ${buttonClassName}`}
            title={!isShowingOriginal ? t('seeOriginalButton') : t('translateButton')}
            aria-label={!isShowingOriginal ? t('seeOriginalButton') : t('translateButton')}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-orange-500 shrink-0" />
                <span>{t('translating')}</span>
              </>
            ) : !isShowingOriginal ? (
              <>
                <RotateCcw className="w-3 h-3 text-orange-500 shrink-0" />
                <span>{t('seeOriginalButton')}</span>
              </>
            ) : (
              <>
                <Languages className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{t('translateButton')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

