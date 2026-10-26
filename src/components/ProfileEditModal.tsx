import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Sparkles,
  Upload,
  Type,
  Check,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Shield,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBrandName } from '../i18n/translations';
import { CommunityUser } from '../types';
import { PRESET_AVATARS } from '../data/presetAvatars';
import { UserAvatar } from './UserAvatar';
import {
  compressAvatarImage,
  getDynamicInitialSvg,
  isPresetAvatarId,
} from '../utils/avatarUtils';
import { uploadAvatarToSupabase } from '../services/supabaseClient';
import { AuthService } from '../services/authService';
import { CommunityService } from '../services/communityService';
import { StorageService } from '../services/storage';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CommunityUser;
  onProfileUpdated?: (updatedUser: CommunityUser) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
}) => {
  const { language, isRTL, t } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user.name || '');
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'initials'>('presets');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user.avatar || 'preset_1_robot');
  const [avatarType, setAvatarType] = useState<'preset' | 'custom_upload' | 'initial_letter'>(
    isPresetAvatarId(user.avatar)
      ? 'preset'
      : user.avatar && user.avatar.startsWith('data:image/svg')
      ? 'initial_letter'
      : 'custom_upload'
  );

  // Search & Presets
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customUploadPreview, setCustomUploadPreview] = useState<string | null>(
    user.avatar && !isPresetAvatarId(user.avatar) && !user.avatar.startsWith('data:image/svg')
      ? user.avatar
      : null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Dynamic Initials Seed
  const [initialSeed, setInitialSeed] = useState<number>(1);

  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync when user prop changes
  useEffect(() => {
    if (isOpen) {
      setFullName(user.name || '');
      setSelectedAvatar(user.avatar || 'preset_1_robot');
      const isPreset = isPresetAvatarId(user.avatar);
      const isInitial = user.avatar && user.avatar.includes('font-family="system-ui');

      if (isPreset) {
        setAvatarType('preset');
        setActiveTab('presets');
      } else if (isInitial) {
        setAvatarType('initial_letter');
        setActiveTab('initials');
      } else {
        setAvatarType('custom_upload');
        setActiveTab(user.avatar ? 'upload' : 'presets');
      }
      setStatusMessage(null);
      setUploadError(null);
    }
  }, [isOpen, user]);

  // Filter 30 presets based on search query
  const filteredPresets = PRESET_AVATARS.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.nameAr.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      p.subtitleAr.toLowerCase().includes(q) ||
      p.number.toString() === q
    );
  });

  // Handle image upload with compression
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(language === 'ar' ? 'حجم الصورة يتجاوز 5 ميغابايت' : 'Image exceeds 5MB limit');
      return;
    }

    try {
      const optimizedDataUri = await compressAvatarImage(file, 256, 0.85);
      setUploadedFile(file);
      setCustomUploadPreview(optimizedDataUri);
      setSelectedAvatar(optimizedDataUri);
      setAvatarType('custom_upload');
    } catch (err: any) {
      setUploadError(err?.message || (language === 'ar' ? 'تعذر معالجة الصورة' : 'Failed to process image'));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Generate dynamic initial SVG for preview
  const generateInitialSvg = (seed: number = initialSeed) => {
    const vibrantPalettes = [
      { bg1: '#F97316', bg2: '#EA580C', text: '#FFFFFF', ring: '#FDBA74' }, // Orange
      { bg1: '#6366F1', bg2: '#4F46E5', text: '#FFFFFF', ring: '#A5B4FC' }, // Indigo
      { bg1: '#10B981', bg2: '#059669', text: '#FFFFFF', ring: '#6EE7B7' }, // Emerald
      { bg1: '#EC4899', bg2: '#DB2777', text: '#FFFFFF', ring: '#F472B6' }, // Pink
      { bg1: '#06B6D4', bg2: '#0891B2', text: '#FFFFFF', ring: '#67E8F9' }, // Cyan
      { bg1: '#8B5CF6', bg2: '#7C3AED', text: '#FFFFFF', ring: '#C4B5FD' }, // Violet
    ];
    const palette = vibrantPalettes[seed % vibrantPalettes.length];
    return getDynamicInitialSvg({
      name: fullName.trim() || user.name || 'User',
      isGuest: false,
      colorOverride: palette,
    });
  };

  const handleCycleInitialColor = () => {
    const nextSeed = initialSeed + 1;
    setInitialSeed(nextSeed);
    const svg = generateInitialSvg(nextSeed);
    setSelectedAvatar(svg);
    setAvatarType('initial_letter');
  };

  // Save changes handler
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    if (!cleanName) {
      setStatusMessage({
        type: 'error',
        text: language === 'ar' ? 'يرجى إدخال اسم صحيح' : 'Please enter a valid name',
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      let finalAvatarUrl = selectedAvatar;
      let finalAvatarType = avatarType;

      // 1. Custom Image Upload to Supabase avatars bucket
      if (avatarType === 'custom_upload') {
        if (uploadedFile) {
          const uploadRes = await uploadAvatarToSupabase(user.id, uploadedFile);
          if (uploadRes.publicUrl) {
            finalAvatarUrl = uploadRes.publicUrl;
          } else if (customUploadPreview) {
            // Fallback to high-quality compressed data URI if bucket upload is unavailable
            finalAvatarUrl = customUploadPreview;
          }
        } else if (customUploadPreview) {
          finalAvatarUrl = customUploadPreview;
        }
      } else if (avatarType === 'initial_letter') {
        finalAvatarUrl = generateInitialSvg(initialSeed);
      }

      // 2. Execute Supabase upsert on public.profiles and update AuthService
      const updateResult = await AuthService.updateProfile({
        fullName: cleanName,
        avatarUrl: finalAvatarUrl,
        avatarType: finalAvatarType,
      });

      if (!updateResult.success && updateResult.error) {
        throw new Error(updateResult.error);
      }

      // 3. Update all existing posts & replies authored by this user
      await CommunityService.updateUserAuthorDetails(user.id, cleanName, finalAvatarUrl);

      // 4. Update all existing prompts authored by this user across storage & Supabase
      await StorageService.updateUserAuthorDetails(user.id, cleanName, finalAvatarUrl);

      const updatedUser = updateResult.user || {
        ...user,
        name: cleanName,
        avatar: finalAvatarUrl,
      };

      setStatusMessage({
        type: 'success',
        text: language === 'ar' ? 'تم حفظ التعديلات وتحديث الحساب بنجاح!' : 'Profile changes saved successfully!',
      });

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Profile save error:', err);
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: err?.message || (language === 'ar' ? 'تعذر حفظ التعديلات' : 'Failed to save profile changes'),
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="profile-edit-modal-backdrop"
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
        <motion.div
          id="profile-edit-modal-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-white dark:bg-[#101725] rounded-3xl border border-slate-200 dark:border-[#223047] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-[#1E2B3E] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t.myProfile || (language === 'ar' ? 'تعديل الحساب الشخصي' : 'Edit Profile')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar'
                    ? `تحديث الاسم الكامل وتخصيص صورتك الرمزية في مجتمع ${getBrandName(language)}`
                    : `Update full name and customize your avatar in ${getBrandName(language)} community`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t.cancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveChanges} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
            {/* Status Feedback */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* LIVE PREVIEW CARD */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-[#131B2A] dark:to-[#172235] border border-slate-200/80 dark:border-[#223047] flex items-center gap-4 shadow-xs">
              <div className="relative shrink-0">
                <UserAvatar
                  avatar={
                    avatarType === 'initial_letter'
                      ? generateInitialSvg(initialSeed)
                      : selectedAvatar
                  }
                  name={fullName || user.name || 'Prombo'}
                  size="xl"
                  showGlow={true}
                  isGuest={false}
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                  ✓
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {fullName.trim() || (language === 'ar' ? 'الاسم الكامل' : 'Full Name')}
                  </h4>
                  {user.role === 'admin' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
                      Member
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {user.email || 'user@prombo.ai'}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 px-2 py-0.5 rounded-md">
                    {avatarType === 'preset' && (language === 'ar' ? 'شخصية رمزية جاهزة' : 'Preset Avatar')}
                    {avatarType === 'custom_upload' && (language === 'ar' ? 'صورة مخصصة مرفوعة' : 'Custom Image')}
                    {avatarType === 'initial_letter' && (language === 'ar' ? 'الحرف الأول الديناميكي' : 'Dynamic Initial')}
                  </span>
                </div>
              </div>
            </div>

            {/* 1. FULL NAME INPUT */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-profile-fullname"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {language === 'ar' ? 'الاسم الكامل (Full Name)' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-400" />
                <input
                  id="edit-profile-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل اسمك الكامل أو لقبك...' : 'Enter your full name or handle...'}
                  className="w-full px-3.5 py-2.5 ps-10 rtl:ps-3.5 rtl:pe-10 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>

            {/* 2. AVATAR OPTIONS SELECTION TABS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'خيارات الصورة الشخصية (Avatar)' : 'Avatar Selection Options'}
                </label>
              </div>

              {/* 3 Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-[#162030] rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'presets'
                      ? 'bg-white dark:bg-[#202C3F] text-orange-600 dark:text-orange-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? '30 شخصية جاهزة' : '30 Presets'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-white dark:bg-[#202C3F] text-orange-600 dark:text-orange-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'رفع صورة' : 'Upload Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('initials')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'initials'
                      ? 'bg-white dark:bg-[#202C3F] text-orange-600 dark:text-orange-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'الحرف الأول' : 'Initial Letter'}</span>
                </button>
              </div>

              {/* TAB 1: 30 PRESETS GRID */}
              {activeTab === 'presets' && (
                <div className="space-y-3 pt-1">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={language === 'ar' ? 'ابحث في 30 شخصية (روبوت، ساحر، تنين، ...)' : 'Search 30 presets (robot, wizard, dragon...)'}
                      className="w-full px-3 py-2 ps-9 rtl:ps-3 rtl:pe-9 bg-slate-50 dark:bg-[#141C2B] border border-slate-200 dark:border-[#26374F] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Presets Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1 custom-scrollbar">
                    {filteredPresets.map((preset) => {
                      const isSelected = selectedAvatar === preset.id && avatarType === 'preset';

                      return (
                        <div
                          key={preset.id}
                          id={`preset-item-${preset.id}`}
                          onClick={() => {
                            setSelectedAvatar(preset.id);
                            setAvatarType('preset');
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 relative select-none ${
                            isSelected
                              ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/25'
                              : 'bg-slate-50/70 dark:bg-[#131B2A] border-slate-200/80 dark:border-[#223047] hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border"
                            style={{
                              boxShadow: `0 0 10px ${preset.glowColor}`,
                              borderColor: preset.ringColor,
                            }}
                          >
                            <img
                              src={preset.svgDataUri}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-400">
                                #{preset.number}
                              </span>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {language === 'ar' ? preset.nameAr : preset.name}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {language === 'ar' ? preset.subtitleAr : preset.subtitle}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 rtl:right-auto rtl:left-1.5 w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOM IMAGE UPLOAD */}
              {activeTab === 'upload' && (
                <div className="space-y-3 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {customUploadPreview ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-[#223047] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-14 h-14 rounded-full overflow-hidden border-2 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)] shrink-0 cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <img
                            src={customUploadPreview}
                            alt="Custom avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {uploadedFile ? uploadedFile.name : (language === 'ar' ? 'صورتك المخصصة الحالية' : 'Current Custom Picture')}
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                            <Check className="w-3 h-3" />
                            <span>{language === 'ar' ? 'جاهزة للحفظ والرفع إلى Supabase avatars' : 'Ready to save & upload to Supabase avatars'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                        >
                          {language === 'ar' ? 'تغيير' : 'Change'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomUploadPreview(null);
                            setUploadedFile(null);
                            setSelectedAvatar('preset_1_robot');
                            setAvatarType('preset');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-[#131B2A]/50 space-y-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {language === 'ar' ? 'اسحب صورتك هنا أو انقر للتصفح' : 'Drag & drop image here or click to browse'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          PNG, JPG, WebP (بحد أقصى 5MB)
                        </p>
                      </div>
                      <p className="text-[10px] text-orange-600 dark:text-orange-400">
                        {language === 'ar'
                          ? 'سيتم رفع الصورة إلى Supabase avatars bucket وحفظها في ملفك'
                          : 'Image will be uploaded to Supabase avatars bucket and saved in profile'}
                      </p>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{uploadError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: DYNAMIC INITIAL LETTER */}
              {activeTab === 'initials' && (
                <div className="space-y-4 pt-1">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131B2A] border border-slate-200 dark:border-[#223047] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-14 h-14 rounded-full overflow-hidden border-2 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.35)] shrink-0"
                      >
                        <img
                          src={generateInitialSvg(initialSeed)}
                          alt="Dynamic Initial"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {language === 'ar' ? 'رمز الحرف الأول الديناميكي' : 'Dynamic Initial Letter'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {language === 'ar'
                            ? 'يتم توليده تلقائياً بألوان زاهية ونابضة بالحياة للأعضاء المسجلين'
                            : 'Generated dynamically with vibrant multi-gradient colors for registered users'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCycleInitialColor}
                      className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تغيير التدرج' : 'Cycle Color'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-[#1E2B3E] bg-slate-50/50 dark:bg-[#131B2A]/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.saveChanges}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
