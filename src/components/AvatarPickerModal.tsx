import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Sparkles,
  User,
  Check,
  Search,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PRESET_AVATARS, PresetAvatar } from '../data/presetAvatars';
import {
  compressAvatarImage,
  getDynamicInitialSvg,
  isPresetAvatarId,
  resolveUserAvatar,
} from '../utils/avatarUtils';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string;
  userName?: string;
  isGuest?: boolean;
  onSelectAvatar: (avatarString: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  userName = 'User',
  isGuest = false,
  onSelectAvatar,
}) => {
  const { t, language, isRTL } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'initials'>('presets');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [customUploadPreview, setCustomUploadPreview] = useState<string | null>(
    currentAvatar && !isPresetAvatarId(currentAvatar) && currentAvatar.startsWith('data:')
      ? currentAvatar
      : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter 30 presets based on search query
  const filteredPresets = PRESET_AVATARS.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.nameAr.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      p.subtitleAr.toLowerCase().includes(q) ||
      p.number.toString() === q
    );
  });

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

    setIsUploading(true);
    try {
      const optimizedDataUri = await compressAvatarImage(file, 256, 0.85);
      setCustomUploadPreview(optimizedDataUri);
      setSelectedAvatar(optimizedDataUri);
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err?.message || (language === 'ar' ? 'تعذر تحميل الصورة' : 'Failed to process image'));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = () => {
    if (selectedAvatar) {
      onSelectAvatar(selectedAvatar);
    } else {
      // Default to dynamic initial SVG
      const initialSvg = getDynamicInitialSvg({ name: userName, isGuest });
      onSelectAvatar(initialSvg);
    }
    onClose();
  };

  const dynamicInitialPreview = getDynamicInitialSvg({ name: userName, isGuest });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.avatarPickerTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.avatarPickerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{language === 'ar' ? '30 شخصية مميزة' : '30 Preset Avatars'}</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{language === 'ar' ? 'رفع صورة خاصة' : 'Custom Upload'}</span>
          </button>

          <button
            onClick={() => setActiveTab('initials')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'initials'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{language === 'ar' ? 'الحرف التفاعلي' : 'Dynamic Initial'}</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: 30 PRESET AVATARS GRID */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'ابحث في الشخصيات (روبوت، تنين، ساحر، إلخ...)'
                      : 'Search avatars (Robot, Dragon, Wizard, etc...)'
                  }
                  className="w-full ps-10 pe-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 30 Avatars Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto p-1">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedAvatar === preset.id || selectedAvatar === preset.svgDataUri;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatar(preset.id)}
                      className={`group relative p-3 rounded-2xl flex flex-col items-center text-center transition-all duration-200 border cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800/90 border-orange-500 ring-2 ring-orange-500 shadow-md scale-102'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:scale-101'
                      }`}
                    >
                      {/* Avatar Image with glowing neon ring */}
                      <div
                        className="relative w-16 h-16 rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-105"
                        style={{
                          boxShadow: `0 0 14px ${preset.glowColor}`,
                          borderColor: preset.ringColor,
                        }}
                      >
                        <img
                          src={preset.svgDataUri}
                          alt={preset.name}
                          className="w-full h-full object-cover rounded-full"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-orange-600/25 flex items-center justify-center rounded-full">
                            <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Number & Name */}
                      <div className="mt-2.5 w-full">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            #{preset.number}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {language === 'ar' ? preset.nameAr : preset.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {language === 'ar' ? preset.subtitleAr : preset.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM IMAGE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-400 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {language === 'ar' ? 'اسحب صورتك وأفلتها هنا' : 'Drag & drop your photo here'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {language === 'ar'
                    ? 'أو اضغط لاختيار صورة من جهازك (PNG، JPG، WebP حتى 5 ميغابايت). سيتم ضغطها وتجهيزها تلقائياً.'
                    : 'Or click to browse from your device (PNG, JPG, WebP up to 5MB). Auto-compressed for speed.'}
                </p>
              </div>

              {uploadError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{uploadError}</p>
              )}

              {/* Upload Preview if present */}
              {customUploadPreview && (
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={customUploadPreview}
                      alt="Uploaded Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 shadow-md"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {language === 'ar' ? 'معاينة صورتك الخاصة' : 'Custom Photo Preview'}
                      </h4>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'جاهزة للحفظ' : 'Ready to save'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomUploadPreview(null);
                      setSelectedAvatar('');
                    }}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title={language === 'ar' ? 'إزالة الصورة' : 'Remove image'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DYNAMIC INITIALS GENERATOR */}
          {activeTab === 'initials' && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg border-2 border-slate-300 dark:border-slate-700">
                    <img
                      src={dynamicInitialPreview}
                      alt={userName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'رمز الحرف الأول التفاعلي' : 'Dynamic Initial Avatar'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    {language === 'ar'
                      ? 'يتم إنشاء رمز SVG ديناميكي بناءً على الحرف الأول من اسمك. يحصل المستخدم المسجل على ألوان دافئة ومشرقة، بينما يحصل الزائر على ألوان هادئة وداكنة لتمييز التفاعل فورياً.'
                      : 'Generates a dynamic SVG based on the first letter of your name. Registered users get vibrant warm tones, while guests get distinct muted dark tones.'}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                  {isGuest
                    ? language === 'ar'
                      ? '👤 نمط الزائر (خلفية داكنة)'
                      : '👤 Guest Mode (Muted Dark)'
                    : language === 'ar'
                    ? '✨ نمط المسجل (خلفية حيوية)'
                    : '✨ Registered Mode (Vibrant)'}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(dynamicInitialPreview);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {language === 'ar' ? 'تطبيق رمز الحرف الأول' : 'Use Dynamic Initial Avatar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'المعاينة الحالية:' : 'Current selection:'}
            </span>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
              <img
                src={resolveUserAvatar({ name: userName, avatar: selectedAvatar, isGuest })}
                alt="Selected"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{t.saveChanges}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
