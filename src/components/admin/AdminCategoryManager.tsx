import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  Search,
  Check,
  AlertCircle,
  Hash,
  ArrowUpDown
} from 'lucide-react';
import { Category, Prompt } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { useApp } from '../../context/AppContext';

interface AdminCategoryManagerProps {
  categories: Category[];
  prompts: Prompt[];
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
}

export const AdminCategoryManager: React.FC<AdminCategoryManagerProps> = ({
  categories,
  prompts,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const { t, language, isRTL } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Count prompts per category
  const categoryCounts = categories.reduce((acc: Record<string, number>, cat) => {
    acc[cat.id] = prompts.filter((p) => p.categoryId === cat.id).length;
    return acc;
  }, {});

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#182232] p-4 rounded-2xl border border-slate-200 dark:border-[#2A384C] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'ar' ? 'إدارة تصنيفات المكتبة' : 'Categories Management'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'ar'
                ? `إجمالي التصنيفات: ${categories.length} | تتزامن تلقائياً مع نموذج إضافة البرومبت وقائمة الفلترة`
                : `Total: ${categories.length} categories | Automatically syncs with submission form and filter menus`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث في التصنيفات...' : 'Search categories...'}
              className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500`}
            />
          </div>

          <button
            onClick={onAddCategory}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('adminAddCategory')}</span>
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-[#182232] rounded-2xl border border-slate-200 dark:border-[#2A384C]">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'لا توجد تصنيفات مطابقة للبحث' : 'No categories found'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' ? 'جرب البحث بكلمة أخرى أو أنشئ تصنيفاً جديداً.' : 'Try a different keyword or create a new category.'}
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            return (
              <div
                key={cat.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] flex flex-col justify-between space-y-4 shadow-xs transition-all hover:border-orange-500/40"
              >
                <div className="space-y-3">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/60 dark:border-orange-500/30">
                        <CategoryIcon name={cat.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          #{cat.slug || cat.id}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#121824] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2A384C] font-semibold">
                      {count} {language === 'ar' ? 'أمر' : 'prompts'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {cat.description || (language === 'ar' ? 'بدون وصف إضافي' : 'No description provided')}
                  </p>

                  {/* Theme Accent Chip */}
                  <div className="flex items-center gap-2 pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cat.badgeBg} ${cat.badgeBorder}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#2A384C]/60">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {cat.id}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditCategory(cat)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#121824] dark:hover:bg-[#1f2b3e] text-slate-700 dark:text-slate-300 hover:text-orange-600 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('adminEditCategory')}</span>
                    </button>
                    <button
                      onClick={() => onDeleteCategory(cat)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                      title={language === 'ar' ? 'حذف التصنيف' : 'Delete category'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
