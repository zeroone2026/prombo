import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ThemeToggleButtonProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  size = 'md',
}) => {
  const { theme, toggleTheme, t } = useApp();
  const isDark = theme === 'dark';

  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10';
  const iconClasses = size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? t('themeLight') : t('themeDark')}
      aria-label={isDark ? t('themeLight') : t('themeDark')}
      className={`relative rounded-full flex items-center justify-center bg-white dark:bg-[#182232] text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-[#2A384C] hover:bg-orange-50/60 dark:hover:bg-[#1f2b3e] hover:border-orange-400/60 dark:hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 shadow-2xs transition-all duration-200 cursor-pointer active:scale-95 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${sizeClasses} ${className}`}
    >
      {isDark ? (
        <Sun className={`${iconClasses} text-amber-400 transition-transform duration-300 hover:rotate-45`} />
      ) : (
        <Moon className={`${iconClasses} text-slate-700 dark:text-slate-300 transition-transform duration-300 hover:-rotate-12`} />
      )}
    </button>
  );
};
