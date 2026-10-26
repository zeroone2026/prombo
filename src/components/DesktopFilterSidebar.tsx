import React, { useState } from 'react';
import {
  Bookmark,
  Layers,
  RotateCcw,
  Check,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { Category, Prompt } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { useApp } from '../context/AppContext';
import { getLocalizedCategoryName } from '../utils/categoryUtils';

interface DesktopFilterSidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
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

export const DesktopFilterSidebar: React.FC<DesktopFilterSidebarProps> = ({
  isOpen,
  onToggleOpen,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Count prompts per category
  const categoryCounts = categories.reduce((acc: Record<string, number>, cat) => {
    acc[cat.id] = prompts.filter((p) => p.categoryId === cat.id).length;
    return acc;
  }, {});

  const getLocalizedCat = (cat: Category): string => {
    return getLocalizedCategoryName(cat, t, language);
  };

  const isAllActive = selectedCategoryId === '' && !onlyFavorites;

  // Filtered categories for inner search
  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const name = getLocalizedCat(cat).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q);
  });

  // Collapsed State: Show floating pinned button on the side to easily re-open
  if (!isOpen) {
    return (
      <div className="hidden md:block sticky top-20 shrink-0 z-20">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] text-slate-800 dark:text-slate-200 shadow-md hover:bg-orange-50 dark:hover:bg-[#1f2b3e] hover:text-orange-600 dark:hover:text-orange-400 transition-all cursor-pointer group"
          title={t('openFilter')}
        >
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{t('filterByCategory')}</span>
          {(selectedCategoryId || onlyFavorites) && (
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  return (
    <aside className="hidden md:block transition-all duration-300 shrink-0 w-64 lg:w-72">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-sm flex flex-col p-4 space-y-4">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2A384C]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Filter className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('categoriesDrawerTitle')}
            </h2>
          </div>

          <button
            type="button"
            onClick={onToggleOpen}
            title={t('collapseSidebar')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2b3e] transition-colors cursor-pointer"
            aria-label={t('closeFilter')}
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Search Categories */}
        {categories.length > 4 && (
          <div className="relative">
            <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRTL ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث في الأقسام...' : 'Search categories...'}
              className={`w-full ${isRTL ? 'pr-8 pl-6' : 'pl-8 pr-6'} py-1.5 bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Primary Selection: 1. All Prompts | 2. Favorites (Second Choice) */}
        <div className="space-y-1.5">
          {/* 1. All Prompts */}
          <button
            type="button"
            onClick={() => {
              onSelectCategory('');
              if (onlyFavorites) onToggleOnlyFavorites();
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isAllActive
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2b3e]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isAllActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span>{t('allCategories')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${isAllActive ? 'bg-black/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {prompts.length}
              </span>
              {isAllActive && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* 2. Favorites (Second Choice inside Filter) */}
          <button
            type="button"
            onClick={() => {
              if (!onlyFavorites) onToggleOnlyFavorites();
              onSelectCategory('');
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              onlyFavorites
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2b3e]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${onlyFavorites ? 'bg-black/15 text-slate-950' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                <Bookmark className="w-3.5 h-3.5 fill-current" />
              </div>
              <span>{t('favoritesOnly')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${onlyFavorites ? 'bg-black/20 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {favoritesCount}
              </span>
              {onlyFavorites && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>
        </div>

        {/* Categories List */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#2A384C] space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
            {language === 'ar' ? 'أقسام الذكاء الاصطناعي' : 'Categories'}
          </div>

          {filteredCategories.map((cat) => {
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
                }}
                className={`w-full text-start p-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-xs font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-[#1f2b3e] text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 group-hover:bg-orange-100'
                    }`}
                  >
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{catName}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
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

        {/* Sorting Section inside Filter */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#2A384C] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
            <ArrowUpDown className="w-3 h-3" />
            <span>{t('sortBy')}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 px-1">
            <button
              type="button"
              onClick={() => onChangeSortBy('popular')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer ${
                sortBy === 'popular'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                  : 'bg-slate-50 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('sortPopular')}
            </button>
            <button
              type="button"
              onClick={() => onChangeSortBy('newest')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                  : 'bg-slate-50 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('sortNewest')}
            </button>
            <button
              type="button"
              onClick={() => onChangeSortBy('title')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer ${
                sortBy === 'title'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                  : 'bg-slate-50 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('sortTitle')}
            </button>
          </div>
        </div>

        {/* Reset Filter Action */}
        {(selectedCategoryId || onlyFavorites) && (
          <div className="pt-2 border-t border-slate-100 dark:border-[#2A384C]">
            <button
              type="button"
              onClick={onResetFilters}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('resetFilters')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
