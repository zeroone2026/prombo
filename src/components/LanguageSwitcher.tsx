import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Language, SUPPORTED_LANGUAGES } from '../i18n/translations';

interface LanguageSwitcherProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  size = 'md',
}) => {
  const { language, setLanguage, isRTL } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const isSm = size === 'sm';

  return (
    <div ref={containerRef} className={`relative inline-block text-start ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id="language-switcher-button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Language"
        className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-all duration-200 cursor-pointer select-none border border-slate-300 dark:border-[#2A384C] bg-white dark:bg-[#182232] text-slate-700 dark:text-slate-200 hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-[#1e2a3c] shadow-2xs ${
          isSm ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        }`}
      >
        <Globe className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-orange-500 shrink-0`} />
        <span className="shrink-0">{currentLang.flag}</span>
        <span className="font-semibold">{currentLang.nativeLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
            aria-labelledby="language-switcher-button"
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-50 mt-1.5 min-w-[210px] py-1.5 bg-white dark:bg-[#151D2A] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xl backdrop-blur-md ${
              isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
            }`}
          >
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
              <span>{isRTL ? 'اختر اللغة' : 'Select Language'}</span>
              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                {isRTL ? `${SUPPORTED_LANGUAGES.length} لغات` : `${SUPPORTED_LANGUAGES.length} Languages`}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto py-0.5 space-y-0.5">
              {SUPPORTED_LANGUAGES.map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <button
                    key={langItem.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLanguage(langItem.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-start ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base leading-none shrink-0">{langItem.flag}</span>
                      <div className="flex flex-col text-start leading-tight">
                        <span className="text-xs">{langItem.nativeLabel}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">
                          {langItem.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ms-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                          langItem.dir === 'rtl'
                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {langItem.dir.toUpperCase()}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
