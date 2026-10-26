import React, { useState, useEffect } from 'react';
import {
  Search,
  Check,
  EyeOff,
  Edit3,
  Trash2,
  Clock,
  Ban,
  User,
  Mail,
  Inbox,
  SlidersHorizontal,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  HardDrive,
  Layers,
  Eye,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { Prompt, Category, PromptStatus, PlatformSettings } from '../../types';
import { StorageService } from '../../services/storage';
import { CategoryIcon } from '../CategoryIcon';
import { useApp } from '../../context/AppContext';
import { ImageLightboxModal } from '../ImageLightboxModal';
import { PromptInspectionModal } from './PromptInspectionModal';

interface AdminModerationTabProps {
  prompts: Prompt[];
  categories: Category[];
  onRefreshData: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onEditPrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string, title: string) => void;
  onUpdateStatus: (id: string, status: PromptStatus, title: string) => void;
}

export const AdminModerationTab: React.FC<AdminModerationTabProps> = ({
  prompts,
  categories,
  onRefreshData,
  onShowToast,
  onEditPrompt,
  onDeletePrompt,
  onUpdateStatus,
}) => {
  const { t, language, isRTL } = useApp();
  const [searchTable, setSearchTable] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [moderationStatusFilter, setModerationStatusFilter] = useState<'all' | PromptStatus>('all');

  // Lightbox Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');

  // Prompt Inspection / Preview Modal State
  const [inspectingPrompt, setInspectingPrompt] = useState<Prompt | null>(null);

  // Global Settings State
  const [settings, setSettings] = useState<PlatformSettings>(() => StorageService.getPlatformSettings());

  useEffect(() => {
    setSettings(StorageService.getPlatformSettings());
  }, [prompts]);

  const currentImageConfig = settings.imageUpload || {
    masterEnabled: true,
    allowedCategoryIds: categories.map((c) => c.id),
    maxFileSizeMB: 2,
  };

  // Toggle Public Submissions
  const handleToggleSubmissions = () => {
    const updated = StorageService.updatePlatformSettings({
      allowPublicSubmissions: !settings.allowPublicSubmissions,
    });
    setSettings(updated);
    onRefreshData();
    onShowToast(
      updated.allowPublicSubmissions
        ? (language === 'ar' ? 'تم تفعيل إرسال الأوامر للجمهور بنجاح' : 'Public prompt submissions enabled')
        : (language === 'ar' ? 'تم إيقاف إرسال الأوامر للجمهور' : 'Public prompt submissions paused'),
      'info'
    );
  };

  // Toggle Moderation / Auto-Publish Requirement
  const handleToggleApprovalRequirement = () => {
    const updated = StorageService.updatePlatformSettings({
      requireAdminApproval: !settings.requireAdminApproval,
    });
    setSettings(updated);
    onRefreshData();
    onShowToast(
      updated.requireAdminApproval
        ? (language === 'ar' ? 'تم تفعيل نظام مراجعة المشرف قبل النشر' : 'Admin review required for new submissions')
        : (language === 'ar' ? 'تم تفعيل النشر التلقائي الفوري للأوامر الجديدة' : 'Auto-Publish enabled (prompts go live immediately)'),
      'info'
    );
  };

  // Toggle Master Image Upload
  const handleToggleMasterImageUpload = () => {
    const nextMasterState = !currentImageConfig.masterEnabled;
    const updated = StorageService.updatePlatformSettings({
      imageUpload: {
        ...currentImageConfig,
        masterEnabled: nextMasterState,
      },
    });
    setSettings(updated);
    onRefreshData();
    onShowToast(
      nextMasterState
        ? (language === 'ar' ? 'تم تفعيل نظام رفع الصور في المنصة' : 'Image upload system enabled globally')
        : (language === 'ar' ? 'تم إيقاف نظام رفع الصور عاماً' : 'Image upload system disabled globally'),
      'info'
    );
  };

  // Toggle Category-level Image Upload
  const handleToggleCategoryForImage = (catId: string) => {
    const currentAllowed = currentImageConfig.allowedCategoryIds || [];
    const isAllowed = currentAllowed.includes(catId);
    const nextAllowed = isAllowed
      ? currentAllowed.filter((id) => id !== catId)
      : [...currentAllowed, catId];

    const updated = StorageService.updatePlatformSettings({
      imageUpload: {
        ...currentImageConfig,
        allowedCategoryIds: nextAllowed,
      },
    });
    setSettings(updated);
    onRefreshData();
    onShowToast(
      language === 'ar' ? 'تم تحديث أذونات رفع الصور للتصنيف' : 'Category image upload permission updated',
      'info'
    );
  };

  // Update Max File Size (MB)
  const handleUpdateMaxFileSize = (mb: number) => {
    const clamped = Math.max(1, Math.min(10, mb));
    const updated = StorageService.updatePlatformSettings({
      imageUpload: {
        ...currentImageConfig,
        maxFileSizeMB: clamped,
      },
    });
    setSettings(updated);
    onRefreshData();
    onShowToast(
      language === 'ar'
        ? `تم تعيين الحد الأقصى لحجم الصورة إلى ${clamped} ميجابايت`
        : `Max image size set to ${clamped} MB`,
      'info'
    );
  };

  // Filtered submissions list
  const moderatedPrompts = prompts.filter((p) => {
    if (moderationStatusFilter !== 'all') {
      const pStatus = p.status || 'approved';
      if (pStatus !== moderationStatusFilter) return false;
    }
    if (categoryFilter && p.categoryId !== categoryFilter) return false;
    if (searchTable.trim()) {
      const q = searchTable.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthor = p.author?.toLowerCase().includes(q);
      const matchEmail = p.authorEmail?.toLowerCase().includes(q);
      const matchContent = p.prompt.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchEmail && !matchContent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Global Platform Controls Section */}
      <div className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-200 dark:border-[#2A384C]">
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
              {t('globalSettingsTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('globalSettingsSubtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Toggle 1: Public Prompt Submissions */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] hover:border-orange-500/30 transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100">
                    {t('togglePublicSubmissionsTitle')}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      settings.allowPublicSubmissions
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                    }`}
                  >
                    {settings.allowPublicSubmissions ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('publicSubmissionsEnabledBadge')}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>{t('publicSubmissionsDisabledBadge')}</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('togglePublicSubmissionsDesc')}
                </p>
              </div>

              {/* Interactive Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={settings.allowPublicSubmissions}
                onClick={handleToggleSubmissions}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  settings.allowPublicSubmissions ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.allowPublicSubmissions
                      ? isRTL
                        ? '-translate-x-5'
                        : 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-[#2A384C]/60">
              {settings.allowPublicSubmissions
                ? (language === 'ar' ? 'زر "إضافة برومبت" معروض ونشط لجميع الزوار.' : '"Add Prompt" button is active and visible to all visitors.')
                : (language === 'ar' ? 'زر "إضافة برومبت" معطل ومحمي من الإرسال العام.' : '"Add Prompt" button is disabled/hidden for public users.')}
            </div>
          </div>

          {/* Toggle 2: Moderation Mode (Auto-Publish vs Admin Approval) */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] hover:border-orange-500/30 transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100">
                    {t('toggleModerationRequirementTitle')}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      settings.requireAdminApproval
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    }`}
                  >
                    {settings.requireAdminApproval ? (
                      <>
                        <ShieldCheck className="w-3 h-3" />
                        <span>{t('adminApprovalBadge')}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>{t('autoPublishBadge')}</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('toggleModerationRequirementDesc')}
                </p>
              </div>

              {/* Interactive Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={!settings.requireAdminApproval}
                onClick={handleToggleApprovalRequirement}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  !settings.requireAdminApproval ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    !settings.requireAdminApproval
                      ? isRTL
                        ? '-translate-x-5'
                        : 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-[#2A384C]/60">
              {settings.requireAdminApproval
                ? (language === 'ar' ? 'الطلبات الجديدة تدخل حالة "قيد المراجعة" حتى يوافق المشرف.' : 'Submissions are held in "Pending" until approved by an admin.')
                : (language === 'ar' ? 'الطلبات الجديدة تُنشر فوراً وتصبح حية في المكتبة العامة.' : 'Submissions are instantly approved and live on public library.')}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Advanced Image Upload Controls Panel */}
      <div className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-[#2A384C]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'إعدادات رفع الصور المتقدمة (Supabase Storage)' : 'Image Upload Controls (Supabase Storage)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' ? 'التحكم العام، الأذونات حسب التصنيف، وحدود ضغط WebP' : 'Master toggle, category-level permissions, and WebP compression limits'}
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {currentImageConfig.masterEnabled
                ? (language === 'ar' ? 'النظام مفعّل' : 'System Enabled')
                : (language === 'ar' ? 'النظام معطل' : 'System Disabled')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={currentImageConfig.masterEnabled}
              onClick={handleToggleMasterImageUpload}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                currentImageConfig.masterEnabled ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  currentImageConfig.masterEnabled
                    ? isRTL
                      ? '-translate-x-5'
                      : 'translate-x-5'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Max File Size Setting */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C]">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'الحد الأقصى لحجم الصورة' : 'Max Upload File Size'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              {language === 'ar' ? 'يتم ضغط جميع الصور تلقائياً إلى WebP قبل الرفع' : 'All images are auto-compressed to WebP on client before upload'}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={currentImageConfig.maxFileSizeMB || 2}
                onChange={(e) => handleUpdateMaxFileSize(parseInt(e.target.value, 10))}
                className="w-full accent-orange-600 cursor-pointer"
              />
              <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 whitespace-nowrap">
                {currentImageConfig.maxFileSizeMB || 2} MB
              </span>
            </div>
          </div>

          {/* Category-Level Toggles */}
          <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C]">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'أذونات رفع الصور حسب التصنيف' : 'Category-Level Image Upload Permissions'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              {language === 'ar' ? 'اختر التصنيفات المسموح للمستخدمين بإرفاق صور مخرجات معها' : 'Select categories where users are permitted to attach output images'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isAllowed = (currentImageConfig.allowedCategoryIds || []).includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategoryForImage(cat.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isAllowed
                        ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30'
                        : 'bg-white dark:bg-[#182232] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2A384C] opacity-60'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className={`w-2 h-2 rounded-full ${isAllowed ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Submissions Moderation Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
              <input
                type="text"
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                placeholder={language === 'ar' ? 'بحث في الطلبات أو الكاتب...' : 'Search submissions or author...'}
                className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500`}
              />
            </div>

            {/* Filter by Status */}
            <select
              value={moderationStatusFilter}
              onChange={(e) => setModerationStatusFilter(e.target.value as 'all' | PromptStatus)}
              className="bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 shrink-0 cursor-pointer"
            >
              <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="pending">{t('moderationPending')}</option>
              <option value="approved">{t('moderationApproved')}</option>
              <option value="inactive">{t('moderationInactive')}</option>
            </select>

            {/* Filter by Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 shrink-0 cursor-pointer"
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            <span>
              {language === 'ar'
                ? `المعروض: ${moderatedPrompts.length} طلب`
                : `Showing: ${moderatedPrompts.length} submissions`}
            </span>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-[#141c2b] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2A384C]">
                <tr>
                  <th className="p-3.5 font-semibold">{language === 'ar' ? 'اسم البرومبت والصورة' : 'Prompt & Image'}</th>
                  <th className="p-3.5 font-semibold">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="p-3.5 font-semibold">{language === 'ar' ? 'المرسِل / الكاتب' : 'Author & Email'}</th>
                  <th className="p-3.5 font-semibold">{language === 'ar' ? 'تاريخ الإرسال' : 'Date Submitted'}</th>
                  <th className="p-3.5 font-semibold text-center">{language === 'ar' ? 'الحالة الحالية' : 'Current Status'}</th>
                  <th className="p-3.5 font-semibold text-right">{language === 'ar' ? 'إجراءات الإشراف' : 'Moderation Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2A384C]/50">
                {moderatedPrompts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p>{language === 'ar' ? 'لا توجد طلبات إشراف تطابق الفلتر الحالي' : 'No submissions found matching criteria'}</p>
                    </td>
                  </tr>
                ) : (
                  moderatedPrompts.map((p) => {
                    const cat = categories.find((c) => c.id === p.categoryId);
                    const status = p.status || 'approved';
                    const submittedDate = p.submittedAt || p.createdAt;
                    const formattedDate = new Date(submittedDate).toLocaleDateString(
                      language === 'ar' ? 'ar-EG' : 'en-US',
                      { year: 'numeric', month: 'short', day: 'numeric' }
                    );

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1f2b3e]/60 transition-colors">
                        {/* Prompt Title, Preview & Image Thumbnail */}
                        <td className="p-3.5 max-w-xs">
                          <div className="flex items-start gap-2.5">
                            {p.imageUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewImageUrl(p.imageUrl || null);
                                  setPreviewImageTitle(p.title);
                                }}
                                title={language === 'ar' ? 'معاينة الصورة بالحجم الكامل' : 'View full image'}
                                className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-[#2A384C] group cursor-pointer"
                              >
                                <img
                                  src={p.imageThumbnailUrl || p.imageUrl}
                                  alt={p.title}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{p.title}</div>
                              <div className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{p.prompt}</div>
                              {p.tags && p.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {p.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-[10px] text-slate-500 dark:text-slate-400">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] font-medium">
                            <CategoryIcon name={cat?.icon || 'Bookmark'} className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                            {cat?.name || p.categoryId}
                          </span>
                        </td>

                        {/* Author Name & Email */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.author || (language === 'ar' ? 'مجهول' : 'Anonymous')}</span>
                          </div>
                          {p.authorEmail ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{p.authorEmail}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              {language === 'ar' ? 'بدون بريد' : 'No email provided'}
                            </div>
                          )}
                        </td>

                        {/* Date Submitted */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {formattedDate}
                        </td>

                        {/* Current Status Badge */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                              <Check className="w-3.5 h-3.5" />
                              {t('moderationApproved')}
                            </span>
                          ) : status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              {t('moderationPending')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              <Ban className="w-3.5 h-3.5" />
                              {t('moderationInactive')}
                            </span>
                          )}
                        </td>

                        {/* Moderation Controls */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Dedicated Prompt Inspection / Read Prompt Button */}
                            <button
                              type="button"
                              onClick={() => setInspectingPrompt(p)}
                              title={language === 'ar' ? 'قراءة البرومبت كاملاً' : 'Read Full Prompt'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-500/30 transition-colors cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                              <span>{language === 'ar' ? 'قراءة البرومبت' : 'Read Prompt'}</span>
                            </button>

                            {/* Approve & Publish */}
                            {status !== 'approved' && (
                              <button
                                onClick={() => onUpdateStatus(p.id, 'approved', p.title)}
                                title={t('actionApprove')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{t('actionApprove')}</span>
                              </button>
                            )}

                            {/* Deactivate / Unpublish */}
                            {status === 'approved' && (
                              <button
                                onClick={() => onUpdateStatus(p.id, 'inactive', p.title)}
                                title={t('actionDeactivate')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-[#121824] hover:bg-slate-300 dark:hover:bg-[#1f2b3e] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-[#2A384C] transition-colors cursor-pointer"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>{t('actionDeactivate')}</span>
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => onEditPrompt(p)}
                              title="Edit"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#121824] dark:hover:bg-[#1f2b3e] text-slate-600 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => onDeletePrompt(p.id, p.title)}
                              title={t('actionDelete')}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        title={previewImageTitle}
        onClose={() => setPreviewImageUrl(null)}
      />

      {/* Prompt Full Text & Comprehensive Media Inspection Modal */}
      <PromptInspectionModal
        isOpen={Boolean(inspectingPrompt)}
        prompt={inspectingPrompt}
        category={categories.find((c) => c.id === inspectingPrompt?.categoryId)}
        onClose={() => setInspectingPrompt(null)}
        onUpdateStatus={(id, status, title, rejectionReason) => {
          if (status === 'rejected' && rejectionReason) {
            StorageService.updatePromptStatus(id, 'rejected', undefined, true, rejectionReason);
            onRefreshData();
            onShowToast(language === 'ar' ? `تم رفض البرومبت: ${title}` : `Prompt rejected: ${title}`, 'info');
          } else {
            onUpdateStatus(id, status, title);
          }
        }}
      />
    </div>
  );
};
