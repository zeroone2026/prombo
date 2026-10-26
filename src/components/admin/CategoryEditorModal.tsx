import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save } from 'lucide-react';
import { Category } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { useApp } from '../../context/AppContext';

interface CategoryEditorModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (category: Partial<Category>) => void;
}

const AVAILABLE_ICONS = [
  'Code2',
  'Image',
  'Video',
  'PenTool',
  'TrendingUp',
  'Smartphone',
  'Zap',
  'Cpu',
  'Layers',
  'Terminal',
  'Database',
  'Bookmark',
];

const PRESET_COLOR_THEMES = [
  { name: 'Amber Orange', color: '#ea580c', badgeBg: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400', badgeBorder: 'border-orange-200 dark:border-orange-500/30' },
  { name: 'Warm Amber', color: '#f59e0b', badgeBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400', badgeBorder: 'border-amber-200 dark:border-amber-500/30' },
  { name: 'Cyber Emerald', color: '#10b981', badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', badgeBorder: 'border-emerald-200 dark:border-emerald-500/30' },
  { name: 'Deep Teal', color: '#14b8a6', badgeBg: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400', badgeBorder: 'border-teal-200 dark:border-teal-500/30' },
  { name: 'Slate Gray', color: '#64748b', badgeBg: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300', badgeBorder: 'border-slate-300 dark:border-slate-500/30' },
  { name: 'Sunburst Gold', color: '#eab308', badgeBg: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', badgeBorder: 'border-yellow-200 dark:border-yellow-500/30' },
];

export const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({
  isOpen,
  category,
  onClose,
  onSave,
}) => {
  const { t, language } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Code2');
  const [selectedTheme, setSelectedTheme] = useState(PRESET_COLOR_THEMES[0]);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setIcon(category.icon || 'Code2');
      const matched = PRESET_COLOR_THEMES.find((t) => t.color === category.color) || {
        name: 'Custom',
        color: category.color || '#ea580c',
        badgeBg: category.badgeBg || 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
        badgeBorder: category.badgeBorder || 'border-orange-200 dark:border-orange-500/30',
      };
      setSelectedTheme(matched);
    } else {
      setName('');
      setDescription('');
      setIcon('Code2');
      setSelectedTheme(PRESET_COLOR_THEMES[0]);
    }
  }, [category, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: category?.id,
      name: name.trim(),
      description: description.trim(),
      icon,
      color: selectedTheme.color,
      badgeBg: selectedTheme.badgeBg,
      badgeBorder: selectedTheme.badgeBorder,
      order: category?.order || 1,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2A384C] bg-slate-50 dark:bg-[#141c2b]">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {category ? (language === 'ar' ? 'تعديل التصنيف' : 'Edit Category') : (language === 'ar' ? 'إضافة تصنيف جديد' : 'Add New Category')}
            </h2>
            <button
              onClick={onClose}
              aria-label={t('modalClose')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {language === 'ar' ? 'اسم التصنيف *' : 'Category Name *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vibe Coding & Web Dev"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'ar' ? 'ملخص موجز للأوامر في هذا التصنيف...' : 'Brief summary of prompts in this category...'}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {language === 'ar' ? 'أيقونة التصنيف' : 'Category Icon'}
              </label>
              <div className="grid grid-cols-6 gap-2 pt-1">
                {AVAILABLE_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                      icon === iconName
                        ? 'bg-orange-600 border-orange-500 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-[#121824] border-slate-200 dark:border-[#2A384C] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <CategoryIcon name={iconName} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Theme Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {language === 'ar' ? 'سمة اللون' : 'Color Accent'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                      selectedTheme.name === theme.name
                        ? `${theme.badgeBg} ${theme.badgeBorder} ring-2 ring-orange-500`
                        : 'bg-slate-50 dark:bg-[#121824] border-slate-200 dark:border-[#2A384C] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.color }} />
                    <span className="truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2A384C]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {t('adminCancel')}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{t('adminSave')}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
