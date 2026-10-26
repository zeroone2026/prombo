import React, { useState, useEffect } from 'react';
import {
  Palette,
  LayoutGrid,
  Square,
  Columns2,
  Columns3,
  Columns4,
  Check,
  Save,
  Sparkles,
  Sliders,
  Eye,
  Monitor,
  Smartphone,
  Layers,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { PlatformSettings, AppearanceSettings } from '../../types';
import { StorageService } from '../../services/storage';
import { useApp } from '../../context/AppContext';

interface AdminAppearanceTabProps {
  onRefreshData?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminAppearanceTab: React.FC<AdminAppearanceTabProps> = ({
  onRefreshData,
  onShowToast,
}) => {
  const { language, isRTL } = useApp();
  const [settings, setSettings] = useState<PlatformSettings>(() => StorageService.getPlatformSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Appearance state with robust fallbacks
  const currentAppearance: AppearanceSettings = settings.appearance || {
    homeGridColumns: 3,
    cardSpacing: 'normal',
    showCategoryBadge: true,
  };

  const [selectedColumns, setSelectedColumns] = useState<1 | 2 | 3 | 4>(
    (currentAppearance.homeGridColumns as 1 | 2 | 3 | 4) || 3
  );
  const [cardSpacing, setCardSpacing] = useState<'compact' | 'normal' | 'spacious'>(
    currentAppearance.cardSpacing || 'normal'
  );
  const [showCategoryBadge, setShowCategoryBadge] = useState<boolean>(
    currentAppearance.showCategoryBadge !== false
  );

  useEffect(() => {
    const latest = StorageService.getPlatformSettings();
    setSettings(latest);
    if (latest.appearance) {
      const cols = latest.appearance.homeGridColumns;
      if ([1, 2, 3, 4].includes(cols)) {
        setSelectedColumns(cols as 1 | 2 | 3 | 4);
      }
      setCardSpacing(latest.appearance.cardSpacing || 'normal');
      setShowCategoryBadge(latest.appearance.showCategoryBadge !== false);
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      const updatedAppearance: AppearanceSettings = {
        homeGridColumns: selectedColumns,
        cardSpacing,
        showCategoryBadge,
      };

      const updated = StorageService.updatePlatformSettings({
        appearance: updatedAppearance,
      });

      // Synchronize localStorage home grid preference (clearing personal override if admin explicitly syncs platform default)
      if (typeof window !== 'undefined') {
        localStorage.setItem('prombo_home_grid_columns', selectedColumns.toString());
        window.dispatchEvent(
          new CustomEvent('prombo_grid_columns_change', {
            detail: { columns: selectedColumns },
          })
        );
        window.dispatchEvent(
          new CustomEvent('prombo_appearance_settings_change', {
            detail: updatedAppearance,
          })
        );
      }

      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);

      if (onShowToast) {
        onShowToast(
          language === 'ar'
            ? 'تم حفظ وتطبيق إعدادات مظهر الموقع بنجاح'
            : 'Site appearance settings saved and applied successfully',
          'success'
        );
      }
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (e) {
      console.error('Failed to save appearance settings', e);
      if (onShowToast) {
        onShowToast(language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetUserOverrides = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prombo_user_grid_preference');
      localStorage.setItem('prombo_home_grid_columns', selectedColumns.toString());
      window.dispatchEvent(
        new CustomEvent('prombo_grid_columns_change', {
          detail: { columns: selectedColumns },
        })
      );
      if (onShowToast) {
        onShowToast(
          language === 'ar'
            ? 'تمت إعادة ضبط تفضيلات المتصفح إلى الافتراضي العام للموقع'
            : 'Browser layout preference reset to global site default',
          'info'
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200/60 dark:border-orange-500/20">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{language === 'ar' ? 'مظهر الموقع وتخطيط العرض' : 'Site Appearance & Layout'}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30">
                {language === 'ar' ? 'لوحة التحكم' : 'Control Panel'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {language === 'ar'
                ? 'تخصيص تخطيط شبكة بطاقات الأوامر في الصفحة الرئيسية (من 1 إلى 4 أعمدة) وتحديد التوزيع الافتراضي العام للمنصة.'
                : 'Customize home page prompt grid layout (1 to 4 columns) and configure platform-wide default view.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50 ${
            savedSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20'
          }`}
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>{language === 'ar' ? 'تم الحفظ بنجاح!' : 'Saved Successfully!'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{language === 'ar' ? 'حفظ وتطبيق التغييرات' : 'Save & Apply Changes'}</span>
            </>
          )}
        </button>
      </div>

      {/* Priority Fallback Logic Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5 text-blue-900 dark:text-blue-200">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">
              {language === 'ar'
                ? 'نظام أولوية التخصيص (Priority Fallback Logic):'
                : 'Priority Fallback Hierarchy:'}
            </span>
            <span className="text-blue-800 dark:text-blue-300 leading-relaxed block">
              {language === 'ar'
                ? 'اختيار الإدارة هنا يحدد التوزيع الافتراضي العام للمنصة. إذا قام أي مستخدم بتغيير تفضيله من قائمة الحساب (Auth Drawer)، يُحفظ خياره محلياً في جهازه ويطغى على الافتراضي العام لشاشته فقط.'
                : 'Admin selection defines the platform default for all users. If an individual user personalizes their layout in account/device settings, it overrides the admin default strictly for their view.'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetUserOverrides}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800/60 transition-colors shrink-0 cursor-pointer text-xs"
          title={language === 'ar' ? 'تطبيق الافتراضي فوراً وتجاوز الكاش' : 'Sync browser to platform default'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'إعادة ضبط متصفحي للافتراضي' : 'Reset My View to Default'}</span>
        </button>
      </div>

      {/* Grid Layout Switcher Section (1 to 4 Columns) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-orange-500" />
              <span>
                {language === 'ar'
                  ? 'تخطيط شبكة الصفحة الرئيسية على الشاشات الكبيرة (1 إلى 4 أعمدة)'
                  : 'Home Page Grid Columns on Large Screens (1 to 4 Columns)'}
              </span>
            </h3>
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/30">
              {selectedColumns === 1
                ? (language === 'ar' ? 'عمود واحد نشط' : '1 Column Active')
                : selectedColumns === 2
                ? (language === 'ar' ? 'عمودين نشطة' : '2 Columns Active')
                : selectedColumns === 3
                ? (language === 'ar' ? '3 أعمدة نشطة' : '3 Columns Active')
                : (language === 'ar' ? '4 أعمدة نشطة' : '4 Columns Active')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {language === 'ar'
              ? 'اختر عدد الأعمدة الافتراضي لبطاقات الأوامر في شاشات الحواسيب والمكتبيات الكبيرة (على الهواتف المحمولة يتم التكيف تلقائياً لعمود واحد لضمان القراءة).'
              : 'Choose the default number of columns for desktop displays (mobile devices automatically adapt to a single column for readability).'}
          </p>
        </div>

        {/* 4 Distinct Visual Choice Cards (1, 2, 3, 4 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Option 1: 1 Column Grid */}
          <div
            onClick={() => setSelectedColumns(1)}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedColumns === 1
                ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md shadow-orange-500/5 ring-2 ring-orange-500/20'
                : 'border-slate-200 dark:border-[#2A384C] hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#121824]/60'
            }`}
          >
            {selectedColumns === 1 && (
              <span className="absolute top-3 end-3 p-1 rounded-full bg-orange-500 text-white shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  <Square className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'عمود واحد (طولي)' : '1 Column (Single Feed)'}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">grid-cols-1</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {language === 'ar'
                  ? 'عرض طولي كامل متسلسل ممتاز لقراءة الأوامر التفصيلية والمشاريع المتشعبة بتسلسل زمني واضح.'
                  : 'Full-width feed offering maximum space for in-depth prompt payloads and detailed instructions.'}
              </p>
            </div>

            {/* Visual Mockup 1 Column */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C]">
              <div className="h-16 rounded-lg bg-orange-500/15 border border-orange-500/30 flex flex-col p-2 justify-between">
                <div className="h-2 w-1/2 bg-orange-500/40 rounded-sm" />
                <div className="h-4 w-full bg-orange-500/20 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Option 2: 2 Columns Grid */}
          <div
            onClick={() => setSelectedColumns(2)}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedColumns === 2
                ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md shadow-orange-500/5 ring-2 ring-orange-500/20'
                : 'border-slate-200 dark:border-[#2A384C] hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#121824]/60'
            }`}
          >
            {selectedColumns === 2 && (
              <span className="absolute top-3 end-3 p-1 rounded-full bg-orange-500 text-white shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Columns2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'عمودين (ثنائي متوازن)' : '2 Columns (Dual Layout)'}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">grid-cols-1 md:grid-cols-2</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {language === 'ar'
                  ? 'تخطيط ثنائي مريح يجمع بين راحة القراءة واستعراض معارض الصور والوسائط بحجم كبير.'
                  : 'Balanced dual-column format offering great card clarity and generous room for media.'}
              </p>
            </div>

            {/* Visual Mockup 2 Columns */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C]">
              <div className="grid grid-cols-2 gap-2">
                <div className="h-16 rounded-lg bg-amber-500/15 border border-amber-500/30 flex flex-col p-1.5 justify-between">
                  <div className="h-2 w-3/4 bg-amber-500/40 rounded-sm" />
                  <div className="h-4 bg-amber-500/20 rounded-sm" />
                </div>
                <div className="h-16 rounded-lg bg-amber-500/15 border border-amber-500/30 flex flex-col p-1.5 justify-between">
                  <div className="h-2 w-3/4 bg-amber-500/40 rounded-sm" />
                  <div className="h-4 bg-amber-500/20 rounded-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Option 3: 3 Columns Grid */}
          <div
            onClick={() => setSelectedColumns(3)}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedColumns === 3
                ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md shadow-orange-500/5 ring-2 ring-orange-500/20'
                : 'border-slate-200 dark:border-[#2A384C] hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#121824]/60'
            }`}
          >
            {selectedColumns === 3 && (
              <span className="absolute top-3 end-3 p-1 rounded-full bg-orange-500 text-white shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  <Columns3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? '3 أعمدة (رحبة وعصرية)' : '3 Columns (Balanced)'}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">grid-cols-1 md:grid-cols-2 lg:grid-cols-3</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {language === 'ar'
                  ? 'التوزيع الافتراضي الشائع والموصى به للشاشات العريضة لتصفح ممتع وتجربة مستخدم عصرية.'
                  : 'Popular modern desktop grid striking the sweet spot between density and visual clarity.'}
              </p>
            </div>

            {/* Visual Mockup 3 Columns */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C]">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-16 rounded-lg bg-orange-500/15 border border-orange-500/30 flex flex-col p-1 justify-between">
                  <div className="h-2 w-3/4 bg-orange-500/40 rounded-sm" />
                  <div className="h-4 bg-orange-500/20 rounded-sm" />
                </div>
                <div className="h-16 rounded-lg bg-orange-500/15 border border-orange-500/30 flex flex-col p-1 justify-between">
                  <div className="h-2 w-3/4 bg-orange-500/40 rounded-sm" />
                  <div className="h-4 bg-orange-500/20 rounded-sm" />
                </div>
                <div className="h-16 rounded-lg bg-orange-500/15 border border-orange-500/30 flex flex-col p-1 justify-between">
                  <div className="h-2 w-3/4 bg-orange-500/40 rounded-sm" />
                  <div className="h-4 bg-orange-500/20 rounded-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Option 4: 4 Columns Grid */}
          <div
            onClick={() => setSelectedColumns(4)}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedColumns === 4
                ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md shadow-orange-500/5 ring-2 ring-orange-500/20'
                : 'border-slate-200 dark:border-[#2A384C] hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#121824]/60'
            }`}
          >
            {selectedColumns === 4 && (
              <span className="absolute top-3 end-3 p-1 rounded-full bg-orange-500 text-white shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  <Columns4 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? '4 أعمدة (مكثفة ومضغوطة)' : '4 Columns (Dense)'}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {language === 'ar'
                  ? 'عرض مكثف عالي الإنتاجية يستعرض أكبر عدد ممكن من البطاقات في نفس الوقت على الشاشات الكبيرة.'
                  : 'Dense layout maximizing visible cards simultaneously, tailored for power users.'}
              </p>
            </div>

            {/* Visual Mockup 4 Columns */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C]">
              <div className="grid grid-cols-4 gap-1">
                <div className="h-16 rounded-lg bg-blue-500/15 border border-blue-500/30 flex flex-col p-1 justify-between">
                  <div className="h-1.5 w-3/4 bg-blue-500/40 rounded-sm" />
                  <div className="h-3 bg-blue-500/20 rounded-sm" />
                </div>
                <div className="h-16 rounded-lg bg-blue-500/15 border border-blue-500/30 flex flex-col p-1 justify-between">
                  <div className="h-1.5 w-3/4 bg-blue-500/40 rounded-sm" />
                  <div className="h-3 bg-blue-500/20 rounded-sm" />
                </div>
                <div className="h-16 rounded-lg bg-blue-500/15 border border-blue-500/30 flex flex-col p-1 justify-between">
                  <div className="h-1.5 w-3/4 bg-blue-500/40 rounded-sm" />
                  <div className="h-3 bg-blue-500/20 rounded-sm" />
                </div>
                <div className="h-16 rounded-lg bg-blue-500/15 border border-blue-500/30 flex flex-col p-1 justify-between">
                  <div className="h-1.5 w-3/4 bg-blue-500/40 rounded-sm" />
                  <div className="h-3 bg-blue-500/20 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extensible Future Design Switches Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs space-y-5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-500" />
            <span>{language === 'ar' ? 'إعدادات متقدمة للبطاقات والتباعد' : 'Advanced Card & Spacing Settings'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'خيارات مظهر قابلة للتوسع لإدارة التباعد بين العناصر وإبراز شارات التصنيف.'
              : 'Extensible appearance controls to fine-tune spacing and category badges across the application.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Card Spacing Choice */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {language === 'ar' ? 'التباعد بين البطاقات (Card Gap)' : 'Card Grid Spacing'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'normal', 'spacious'] as const).map((spacing) => (
                <button
                  key={spacing}
                  type="button"
                  onClick={() => setCardSpacing(spacing)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    cardSpacing === spacing
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-white dark:bg-[#182232] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2A384C] hover:border-orange-300'
                  }`}
                >
                  {spacing === 'compact'
                    ? (language === 'ar' ? 'متقارب' : 'Compact')
                    : spacing === 'normal'
                    ? (language === 'ar' ? 'عادي' : 'Normal')
                    : (language === 'ar' ? 'متباعد' : 'Spacious')}
                </button>
              ))}
            </div>
          </div>

          {/* Show Category Badge Toggle */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'ar' ? 'شارة التصنيف في البطاقة' : 'Card Category Badge'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'إظهار شارة التصنيف البصرية في أعلى كل بطاقة'
                  : 'Show visual category pill at the top of each prompt card'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowCategoryBadge(!showCategoryBadge)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showCategoryBadge ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showCategoryBadge ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
