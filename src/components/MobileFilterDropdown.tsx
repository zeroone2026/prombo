import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Filter,
  Bookmark,
  Layers,
  RotateCcw,
  Check,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { Category, Prompt } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { useApp } from '../context/AppContext';
import { getLocalizedCategoryName } from '../utils/categoryUtils';

interface MobileFilterDropdownProps {
  categories: Category[];
  prompts: Prompt[];
  selectedCategoryId: string;
  onlyFavorites: boolean;
  favoritesCount: number;
  sortBy: 'popular' | 'newest' | 'title';
  onChangeSortBy: (sort: 'popular' | 'newest' | 'title') => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleOnlyFavorites: () => void;
  onResetFilters: () => void;
}

export const MobileFilterDropdown: React.FC<MobileFilterDropdownProps> = ({
  categories,
  prompts,
  selectedCategoryId,
  onlyFavorites,
  favoritesCount,
  sortBy,
  onChangeSortBy,
  onSelectCategory,
  onToggleOnlyFavorites,
  onResetFilters,
}) => {
  const { t, language, isRTL } = useApp();
  // Always closed by default as requested
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Count prompts per category
  const categoryCounts = categories.reduce((acc: Record<string, number>, cat) => {
    acc[cat.id] = prompts.filter((p) => p.categoryId === cat.id).length;
    return acc;
  }, {});

  const getLocalizedCat = (cat: Category): string => {
    return getLocalizedCategoryName(cat, t, language);
  };

  const isAllActive = selectedCategoryId === '' && !onlyFavorites;
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div ref={containerRef} className="relative md:hidden inline-block text-start">
      {/* Mobile Filter Button - Floating at top side under fixed bar */}
      <button
        type="button"
        id="mobile-filter-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer border ${
          selectedCategoryId || onlyFavorites || isOpen
            ? 'bg-orange-500/15 dark:bg-orange-500/25 text-orange-600 dark:text-orange-400 border-orange-500/40 ring-1 ring-orange-500/20'
            : 'bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#2A384C] hover:bg-slate-50 dark:hover:bg-[#1f2b3e]'
        }`}
        aria-expanded={isOpen}
        aria-label={t('filterByCategory')}
      >
        <div className="p-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <Filter className="w-3.5 h-3.5" />
        </div>
        <span>{t('filterByCategory')}</span>

        {/* Selected Category / Favorites Badge */}
        {selectedCategoryId && activeCategory && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-600 text-white max-w-[90px] truncate">
            {getLocalizedCat(activeCategory)}
          </span>
        )}
        {onlyFavorites && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950">
            {favoritesCount}
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu directly underneath the button */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full mt-2 start-0 ${
              isRTL ? 'origin-top-right' : 'origin-top-left'
            } z-50 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xl overflow-hidden flex flex-col`}
            style={{ maxHeight: '72vh' }}
          >
            {/* Header & Reset Button */}
            <div className="p-3 border-b border-slate-100 dark:border-[#2A384C] bg-slate-50/80 dark:bg-[#141c2b]/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {t('categoriesDrawerTitle')}
              </span>
              {(selectedCategoryId || onlyFavorites) && (
                <button
                  type="button"
                  onClick={() => {
                    onResetFilters();
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('resetFilters')}</span>
                </button>
              )}
            </div>

            {/* Quick Actions (1. All Prompts | 2. Favorites as Second Choice) */}
            <div className="p-2 space-y-1 border-b border-slate-100 dark:border-[#2A384C]/50 bg-slate-50/40 dark:bg-[#121824]/40">
              {/* 1. All Prompts */}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('');
                  if (onlyFavorites) onToggleOnlyFavorites();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isAllActive
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2b3e]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('allCategories')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isAllActive ? 'bg-black/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {prompts.length}
                  </span>
                  {isAllActive && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>

              {/* 2. Favorites (Second Choice) */}
              <button
                type="button"
                onClick={() => {
                  if (!onlyFavorites) onToggleOnlyFavorites();
                  onSelectCategory('');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  onlyFavorites
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2b3e]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 fill-current text-amber-600 dark:text-amber-400" />
                  <span>{t('favoritesOnly')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${onlyFavorites ? 'bg-black/20 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {favoritesCount}
                  </span>
                  {onlyFavorites && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            </div>

            {/* Categories List */}
            <div className="overflow-y-auto p-2 space-y-1 flex-1 custom-scrollbar">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
                {language === 'ar' ? 'أقسام الذكاء الاصطناعي' : 'Categories'}
              </div>

              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id && !onlyFavorites;
                const count = categoryCounts[cat.id] || 0;
                const catName = getLocalizedCat(cat);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      if (onlyFavorites) onToggleOnlyFavorites();
                      setIsOpen(false);
                    }}
                    className={`w-full text-start p-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-xs font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-[#1f2b3e] text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{catName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-black/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sorting Section */}
            <div className="p-2 border-t border-slate-100 dark:border-[#2A384C] bg-slate-50/50 dark:bg-[#141c2b]/50 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                <ArrowUpDown className="w-3 h-3" />
                <span>{t('sortBy')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onChangeSortBy('popular')}
                  className={`py-1 rounded-lg text-[10px] font-medium transition-colors text-center cursor-pointer ${
                    sortBy === 'popular'
                      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                      : 'bg-white dark:bg-[#182232] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('sortPopular')}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSortBy('newest')}
                  className={`py-1 rounded-lg text-[10px] font-medium transition-colors text-center cursor-pointer ${
                    sortBy === 'newest'
                      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                      : 'bg-white dark:bg-[#182232] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('sortNewest')}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSortBy('title')}
                  className={`py-1 rounded-lg text-[10px] font-medium transition-colors text-center cursor-pointer ${
                    sortBy === 'title'
                      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                      : 'bg-white dark:bg-[#182232] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('sortTitle')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
