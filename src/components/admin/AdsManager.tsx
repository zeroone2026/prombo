import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Power,
  Sliders,
  Code2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  ExternalLink,
  Layers,
  Clock,
  LayoutTemplate,
  Smartphone,
  Monitor,
  Timer,
  ShieldAlert,
  Globe,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  Link,
  Hash,
  ChevronDown,
  ChevronUp,
  Check,
  MousePointerClick,
} from 'lucide-react';
import { AdsEngineConfig, AdSlotId, AdSlotConfig, FeedAdSlotConfig } from '../../types';
import { AdSlotRenderer } from '../ads/AdSlotRenderer';
import { useApp } from '../../context/AppContext';
import { createDefaultHomeSlots, createDefaultCommunitySlots, StorageService } from '../../services/storage';

interface AdsManagerProps {
  adsConfig: AdsEngineConfig;
  onSaveConfig: (newConfig: AdsEngineConfig) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const GLOBAL_SLOT_IDS: AdSlotId[] = [
  'popupEntry',
  'headerBanner',
  'footerBanner',
  'sidebarLeft',
  'sidebarRight',
  'onCopyPrompt',
  'onSubmitPrompt',
];

const SLOT_ICONS: Record<AdSlotId, string> = {
  popupEntry: '🚀',
  onCopyPrompt: '⚡',
  onSubmitPrompt: '📝',
  headerBanner: '🔝',
  footerBanner: '🔻',
  sidebarLeft: '⬅️',
  sidebarRight: '➡️',
  gridNative: '📰',
};

export const AdsManager: React.FC<AdsManagerProps> = ({
  adsConfig,
  onSaveConfig,
  onShowToast,
}) => {
  const { t, language } = useApp();
  const isAr = language === 'ar';

  const [config, setConfig] = useState<AdsEngineConfig>(() => {
    const defaultHome = createDefaultHomeSlots();
    const defaultComm = createDefaultCommunitySlots();
    return {
      ...adsConfig,
      homeAdFrequency: typeof adsConfig.homeAdFrequency === 'number' ? adsConfig.homeAdFrequency : 5,
      communityAdFrequency: typeof adsConfig.communityAdFrequency === 'number' ? adsConfig.communityAdFrequency : 5,
      homeFeedEnabled: adsConfig.homeFeedEnabled ?? (adsConfig.slots.gridNative ? adsConfig.slots.gridNative.isEnabled : true),
      communityFeedEnabled: adsConfig.communityFeedEnabled ?? true,
      homeFeedCtaUrl: adsConfig.homeFeedCtaUrl || 'https://example.com',
      communityFeedCtaUrl: adsConfig.communityFeedCtaUrl || 'https://example.com',
      homeFeedSnippet: adsConfig.homeFeedSnippet || (adsConfig.slots.gridNative ? adsConfig.slots.gridNative.codeSnippet : ''),
      communityFeedSnippet: adsConfig.communityFeedSnippet || '',
      homeSlots: { ...defaultHome, ...(adsConfig.homeSlots || {}) },
      communitySlots: { ...defaultComm, ...(adsConfig.communitySlots || {}) },
    };
  });

  const [activeGlobalSlotId, setActiveGlobalSlotId] = useState<AdSlotId>('popupEntry');
  const [expandedHomeCardId, setExpandedHomeCardId] = useState<string | null>('home_feed_ad_0');
  const [expandedCommCardId, setExpandedCommCardId] = useState<string | null>('comm_feed_ad_0');

  // Preview State
  const [previewSlot, setPreviewSlot] = useState<AdSlotConfig | null>(null);

  // Live sync with click tracking events and storage updates
  useEffect(() => {
    const handleAdClickEvent = (e: any) => {
      if (e?.detail?.config) {
        setConfig(e.detail.config);
      } else {
        setConfig(StorageService.getAdsConfig());
      }
    };
    window.addEventListener('prombo_ads_click_recorded', handleAdClickEvent);
    return () => {
      window.removeEventListener('prombo_ads_click_recorded', handleAdClickEvent);
    };
  }, []);

  // Global Master Switch Handler
  const handleToggleMaster = () => {
    const updated: AdsEngineConfig = {
      ...config,
      masterEnabled: !config.masterEnabled,
    };
    setConfig(updated);
    onSaveConfig(updated);
    onShowToast(
      updated.masterEnabled
        ? (isAr ? 'تم تفعيل محرك الإعلانات بالكامل' : 'Ad Engine enabled globally')
        : (isAr ? 'تم تعطيل كافة الإعلانات في الموقع' : 'All ads disabled globally'),
      updated.masterEnabled ? 'success' : 'info'
    );
  };

  // Global Slot field updater
  const handleUpdateGlobalSlot = (fieldUpdates: Partial<AdSlotConfig>) => {
    const current = config.slots[activeGlobalSlotId];
    if (!current) return;
    const updatedSlot = { ...current, ...fieldUpdates };
    const updated: AdsEngineConfig = {
      ...config,
      slots: {
        ...config.slots,
        [activeGlobalSlotId]: updatedSlot,
      },
    };
    setConfig(updated);
    if ('isEnabled' in fieldUpdates) {
      onSaveConfig(updated);
    }
  };

  // Toggle specific global slot enabled
  const handleToggleGlobalSlotEnabled = (slotId: AdSlotId, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSlot = config.slots[slotId];
    if (!currentSlot) return;
    const updatedSlot = { ...currentSlot, isEnabled: !currentSlot.isEnabled };
    const updated: AdsEngineConfig = {
      ...config,
      slots: {
        ...config.slots,
        [slotId]: updatedSlot,
      },
    };
    setConfig(updated);
    onSaveConfig(updated);
    onShowToast(
      updatedSlot.isEnabled
        ? (isAr ? `تم تفعيل مساحة ${currentSlot.nameAr || currentSlot.name}` : `Slot ${currentSlot.name} enabled`)
        : (isAr ? `تم تعطيل مساحة ${currentSlot.nameAr || currentSlot.name}` : `Slot ${currentSlot.name} disabled`),
      updatedSlot.isEnabled ? 'success' : 'info'
    );
  };

  // Section 2: Home Feed Ads Handlers
  const handleToggleHomeFeedMaster = () => {
    const nextState = !config.homeFeedEnabled;
    const updated: AdsEngineConfig = {
      ...config,
      homeFeedEnabled: nextState,
      slots: {
        ...config.slots,
        gridNative: config.slots.gridNative ? {
          ...config.slots.gridNative,
          isEnabled: nextState,
        } : config.slots.gridNative,
      },
    };
    setConfig(updated);
    onSaveConfig(updated);
    onShowToast(
      nextState
        ? (isAr ? 'تم تفعيل إعلانات شبكة الصفحة الرئيسية' : 'Home feed ads enabled')
        : (isAr ? 'تم تعطيل إعلانات شبكة الصفحة الرئيسية' : 'Home feed ads disabled'),
      nextState ? 'success' : 'info'
    );
  };

  const handleUpdateHomeSlot = (slotId: string, updates: Partial<FeedAdSlotConfig>) => {
    const currentSlots = config.homeSlots || {};
    const currentSlot = currentSlots[slotId] || {
      id: slotId,
      enabled: true,
      ctaUrl: config.homeFeedCtaUrl || 'https://example.com',
      snippet: '',
    };
    const updatedSlot = { ...currentSlot, ...updates };
    const updated: AdsEngineConfig = {
      ...config,
      homeSlots: {
        ...currentSlots,
        [slotId]: updatedSlot,
      },
    };
    setConfig(updated);
  };

  const handleToggleHomeSlotEnabled = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSlots = config.homeSlots || {};
    const currentSlot = currentSlots[slotId] || {
      id: slotId,
      enabled: true,
      ctaUrl: config.homeFeedCtaUrl || 'https://example.com',
      snippet: '',
    };
    const nextEnabled = !currentSlot.enabled;
    handleUpdateHomeSlot(slotId, { enabled: nextEnabled });
    onShowToast(
      nextEnabled
        ? (isAr ? `تم تفعيل موضع الرئيسية ${slotId}` : `Home slot ${slotId} enabled`)
        : (isAr ? `تم تعطيل موضع الرئيسية ${slotId}` : `Home slot ${slotId} disabled`),
      nextEnabled ? 'success' : 'info'
    );
  };

  // Section 3: Community Feed Ads Handlers
  const handleToggleCommunityFeedMaster = () => {
    const nextState = !config.communityFeedEnabled;
    const updated: AdsEngineConfig = {
      ...config,
      communityFeedEnabled: nextState,
    };
    setConfig(updated);
    onSaveConfig(updated);
    onShowToast(
      nextState
        ? (isAr ? 'تم تفعيل إعلانات شبكة المجتمع' : 'Community feed ads enabled')
        : (isAr ? 'تم تعطيل إعلانات شبكة المجتمع' : 'Community feed ads disabled'),
      nextState ? 'success' : 'info'
    );
  };

  const handleUpdateCommunitySlot = (slotId: string, updates: Partial<FeedAdSlotConfig>) => {
    const currentSlots = config.communitySlots || {};
    const currentSlot = currentSlots[slotId] || {
      id: slotId,
      enabled: true,
      ctaUrl: config.communityFeedCtaUrl || 'https://example.com',
      snippet: '',
    };
    const updatedSlot = { ...currentSlot, ...updates };
    const updated: AdsEngineConfig = {
      ...config,
      communitySlots: {
        ...currentSlots,
        [slotId]: updatedSlot,
      },
    };
    setConfig(updated);
  };

  const handleToggleCommunitySlotEnabled = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSlots = config.communitySlots || {};
    const currentSlot = currentSlots[slotId] || {
      id: slotId,
      enabled: true,
      ctaUrl: config.communityFeedCtaUrl || 'https://example.com',
      snippet: '',
    };
    const nextEnabled = !currentSlot.enabled;
    handleUpdateCommunitySlot(slotId, { enabled: nextEnabled });
    onShowToast(
      nextEnabled
        ? (isAr ? `تم تفعيل موضع المجتمع ${slotId}` : `Community slot ${slotId} enabled`)
        : (isAr ? `تم تعطيل موضع المجتمع ${slotId}` : `Community slot ${slotId} disabled`),
      nextEnabled ? 'success' : 'info'
    );
  };

  // Master Save All
  const handleSaveAll = () => {
    const finalConfig: AdsEngineConfig = {
      ...config,
      slots: {
        ...config.slots,
        gridNative: config.slots.gridNative ? {
          ...config.slots.gridNative,
          isEnabled: config.homeFeedEnabled ?? config.slots.gridNative.isEnabled,
          codeSnippet: config.homeFeedSnippet || config.slots.gridNative.codeSnippet,
        } : config.slots.gridNative,
      },
    };
    onSaveConfig(finalConfig);
    onShowToast(
      isAr ? 'تم حفظ كافة إعدادات وتخصيصات الإعلانات بنجاح' : 'All ad settings saved successfully',
      'success'
    );
  };

  const activeGlobalSlot = config.slots[activeGlobalSlotId];

  // Helper stats
  const activeHomeSlotsCount = Object.values(config.homeSlots || {}).filter((s: FeedAdSlotConfig) => s.enabled).length;
  const activeCommSlotsCount = Object.values(config.communitySlots || {}).filter((s: FeedAdSlotConfig) => s.enabled).length;

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100">
      {/* 1. MASTER SWITCH BANNER */}
      <div
        className={`p-6 rounded-2xl border transition-all duration-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          config.masterEnabled
            ? 'bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-orange-500/30 dark:bg-[#182232]'
            : 'bg-slate-100 dark:bg-[#141c2b] border-slate-300 dark:border-[#2A384C]'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-colors ${
              config.masterEnabled
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Power className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'المفتاح الرئيسي لكافة إعلانات الموقع (Global Master Switch)' : 'Master Ad Engine Switch'}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  config.masterEnabled
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                }`}
              >
                {config.masterEnabled
                  ? (isAr ? 'المحرك نشط' : 'Active')
                  : (isAr ? 'المحرك معطل' : 'Disabled')}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              {isAr
                ? 'الزر الرئيسي للتحكم في ظهور أو إخفاء كافة الإعلانات والنوافذ المنبثقة والبانرات على مستوى المنصة ككل بضغطة واحدة.'
                : 'Master switch to turn ON or OFF all advertisements, popups, banners, and native ads across the platform with one click.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs md:text-sm transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4 text-orange-400" />
            <span>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMaster}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all shadow-xs cursor-pointer inline-flex items-center gap-2 ${
              config.masterEnabled
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-orange-600 hover:bg-orange-500 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>
              {config.masterEnabled
                ? (isAr ? 'تعطيل كافة الإعلانات' : 'Disable All Ads')
                : (isAr ? 'تفعيل كافة الإعلانات' : 'Enable All Ads')}
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: Global Website Ads (Popup, Header, Footer, Sidebars)
         ========================================================================= */}
      <div className="space-y-4">
        {/* Section Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isAr
                ? 'قسم التحكم بأعلانات الموقع العامة (Global Website Ads)'
                : 'Global Website Ads Management'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'التحكم في النوافذ المنبثقة الترحيبية (Entry Popup Modal)، البانرات العلوية والسفلية، والإعلانات الجانبية ناطحة السحاب.'
                : 'Configure modal popups, header & footer leaderboard banners, and desktop sidebar skyscrapers.'}
            </p>
          </div>
        </div>

        {/* Global Ads Placement Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left Column: Global Slot List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 pb-1">
              {isAr ? 'مواضع الإعلانات العامة' : 'Global Placement Slots'}
            </div>

            <div className="space-y-2">
              {GLOBAL_SLOT_IDS.map((sid) => {
                const slot = config.slots[sid];
                if (!slot) return null;
                const isSelected = activeGlobalSlotId === sid;
                const slotName = isAr ? (slot.nameAr || slot.name) : slot.name;

                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => setActiveGlobalSlotId(sid)}
                    className={`w-full text-start p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500 text-orange-950 dark:text-orange-100 shadow-xs ring-1 ring-orange-500/30'
                        : 'bg-white dark:bg-[#182232] border-slate-200 dark:border-[#2A384C] text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{SLOT_ICONS[sid]}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs truncate">{slotName}</span>
                          <span
                            title={isAr ? `النقرات: ${slot.clickCount || 0}` : `Clicks: ${slot.clickCount || 0}`}
                            className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold text-orange-600 dark:text-orange-400 px-1.5 py-0.2 rounded-full bg-orange-500/10 border border-orange-500/25 shrink-0"
                          >
                            <MousePointerClick className="w-2.5 h-2.5 text-orange-500" />
                            <span>{slot.clickCount || 0}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {slot.triggerType}
                          </span>
                          {slot.deviceTargeting && slot.deviceTargeting !== 'all' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {slot.deviceTargeting === 'desktop' ? 'Desktop' : 'Mobile'}
                            </span>
                          )}
                          {slot.cooldownMinutes && slot.cooldownMinutes > 0 ? (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              {slot.cooldownMinutes}m
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={slot.isEnabled}
                        aria-label={`${slotName} toggle`}
                        onClick={(e) => handleToggleGlobalSlotEnabled(sid, e)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          slot.isEnabled
                            ? 'bg-emerald-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            slot.isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          slot.isEnabled && config.masterEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {slot.isEnabled ? (isAr ? 'مفعل' : 'ON') : (isAr ? 'معطل' : 'OFF')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Global Slot Editor */}
          <div className="lg:col-span-8">
            {activeGlobalSlot ? (
              <div className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl p-6 space-y-6 shadow-xs">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#2A384C]">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">{SLOT_ICONS[activeGlobalSlot.id]}</span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {isAr ? (activeGlobalSlot.nameAr || activeGlobalSlot.name) : activeGlobalSlot.name}
                      </h4>
                      {/* Clean compact click counter badge */}
                      <span
                        title={isAr ? `إجمالي النقرات المسجلة: ${activeGlobalSlot.clickCount || 0}` : `Total tracked clicks: ${activeGlobalSlot.clickCount || 0}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 shrink-0 shadow-2xs"
                      >
                        <MousePointerClick className="w-3 h-3 text-orange-500" />
                        <span>{isAr ? `النقرات: ${activeGlobalSlot.clickCount || 0}` : `Clicks: ${activeGlobalSlot.clickCount || 0}`}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isAr ? (activeGlobalSlot.descriptionAr || activeGlobalSlot.description) : activeGlobalSlot.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={activeGlobalSlot.isEnabled}
                        onClick={() => handleUpdateGlobalSlot({ isEnabled: !activeGlobalSlot.isEnabled })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          activeGlobalSlot.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            activeGlobalSlot.isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold">
                        {activeGlobalSlot.isEnabled ? (isAr ? 'مفعل' : 'Enabled') : (isAr ? 'معطل' : 'Disabled')}
                      </span>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewSlot(activeGlobalSlot)}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? 'معاينة' : 'Preview'}</span>
                    </button>
                  </div>
                </div>

                {/* Global Ad Click Analytics & Reset Action Bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 dark:bg-orange-950/20 border border-orange-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'إجمالي النقرات المسجلة على هذا الإعلان العام:' : 'Total recorded clicks on this global ad:'}
                    </span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-md text-xs">
                      {activeGlobalSlot.clickCount || 0}
                    </span>
                  </div>
                  {(activeGlobalSlot.clickCount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        StorageService.resetGlobalAdClicks(activeGlobalSlot.id);
                        handleUpdateGlobalSlot({ clickCount: 0 });
                        onShowToast(isAr ? 'تم تصفير عداد نقرات هذا الإعلان' : 'Click counter reset for this ad slot', 'info');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-500 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isAr ? 'تصفير العداد' : 'Reset clicks'}</span>
                    </button>
                  )}
                </div>

                {/* Slot Properties */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Device Targeting */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-orange-500" />
                      <span>{isAr ? 'الأجهزة المستهدفة' : 'Target Devices'}</span>
                    </label>
                    <select
                      value={activeGlobalSlot.deviceTargeting || 'all'}
                      onChange={(e) => handleUpdateGlobalSlot({ deviceTargeting: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="all">{isAr ? 'كافة الأجهزة (شاشات وجوال)' : 'All Devices'}</option>
                      <option value="desktop">{isAr ? 'أجهزة الكمبيوتر فقط (Desktop Only)' : 'Desktop Only'}</option>
                      <option value="mobile">{isAr ? 'الهواتف والجوال فقط (Mobile Only)' : 'Mobile Only'}</option>
                    </select>
                  </div>

                  {/* Cooldown Minutes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>{isAr ? 'فترة التهدئة (دقائق)' : 'Cooldown (Mins)'}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={activeGlobalSlot.cooldownMinutes ?? 0}
                      onChange={(e) => handleUpdateGlobalSlot({ cooldownMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Auto-Close Seconds */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-orange-500" />
                      <span>{isAr ? 'إغلاق تلقائي (ثوانٍ)' : 'Auto-Close (Sec)'}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={activeGlobalSlot.autoCloseSeconds ?? 0}
                      onChange={(e) => handleUpdateGlobalSlot({ autoCloseSeconds: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Code Snippet Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-orange-500" />
                      <span>{isAr ? 'شفرة وكود الإعلان (HTML5 Video / Ad Network Script / iframe)' : 'Ad Code Snippet'}</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Google AdSense, Adsterra, scripts, HTML5 video & iframes supported
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    dir="ltr"
                    value={activeGlobalSlot.codeSnippet || ''}
                    onChange={(e) => handleUpdateGlobalSlot({ codeSnippet: e.target.value })}
                    placeholder="<script async src='https://...'></script> or <video src='...' controls autoplay muted></video>"
                    className="w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* =========================================================================
          EXPLICIT DARK / BLACK HORIZONTAL DIVIDER 1
         ========================================================================= */}
      <div className="border-t-2 border-slate-900 dark:border-slate-900/90 my-8 shadow-xs" />

      {/* =========================================================================
          SECTION 2: Home Page Feed Ads (10 Dedicated Slots: home_feed_ad_0 - home_feed_ad_9)
         ========================================================================= */}
      <div className="space-y-6">
        {/* Section Title & Master Feed Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr
                    ? 'قسم التحكم بالإعلانات المدمجة في شبكة البطاقات - الصفحة الرئيسية'
                    : 'Home Page Feed Ads Management'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-600/10 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  {isAr ? `${activeHomeSlotsCount}/10 نشطة` : `${activeHomeSlotsCount}/10 Active`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'إدارة 10 مواضع إعلانية مستقلة مدمجة داخل شبكة بطاقات الصفحة الرئيسية مع تحديد تكرار المباعدة والروابط والشفرات الخاصة بكل بطاقة.'
                  : 'Manage 10 independent native ad slots embedded in the Home prompt grid with individual toggles, CTA links, and custom code overrides.'}
              </p>
            </div>
          </div>

          {/* Master Home Feed Toggle */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] px-4 py-2 rounded-2xl shadow-xs">
            <span className="text-xs font-bold">
              {isAr ? 'حالة إعلانات شبكة الرئيسية:' : 'Home Feed Ads Master:'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(config.homeFeedEnabled)}
              onClick={handleToggleHomeFeedMaster}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                config.homeFeedEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.homeFeedEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                config.homeFeedEnabled
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {config.homeFeedEnabled ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
            </span>
          </div>
        </div>

        {/* Master Frequency Slider for Home Feed */}
        <div className="p-5 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Hash className="w-4 h-4 text-orange-500" />
              <span>
                {isAr
                  ? 'تكرار ومباعدة الإعلانات: عدد البطاقات بين كل إعلان والآخر (Frequency Spacing Slider)'
                  : 'Home Feed Frequency Spacing (Cards between each active ad)'}
              </span>
            </label>

            <span className="px-3 py-1 rounded-lg bg-orange-600/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold font-mono">
              {isAr
                ? `موضع إعلان بعد كل ${config.homeAdFrequency || 5} بطاقات`
                : `1 Ad every ${config.homeAdFrequency || 5} cards`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min={2}
              max={15}
              step={1}
              value={config.homeAdFrequency || 5}
              onChange={(e) => setConfig({ ...config, homeAdFrequency: parseInt(e.target.value) || 5 })}
              className="w-full accent-orange-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <input
              type="number"
              min={2}
              max={15}
              value={config.homeAdFrequency || 5}
              onChange={(e) => setConfig({ ...config, homeAdFrequency: Math.max(2, Math.min(15, parseInt(e.target.value) || 5)) })}
              className="w-20 px-3 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isAr
              ? 'يتحكم هذا المؤشر في معدل تكرار ظهور المواضع النشطة في الصفحة الرئيسية. إذا قام المستخدم بإغلاق أي إعلان، يُعاد ترتيب البطاقات بسلاسة ودون ترك فراغات.'
              : 'Controls how often active home feed ad cards appear in the prompt stream. Zero-gap layout reflow is applied on dismissal.'}
          </p>
        </div>

        {/* 10 Independent Home Ad Slot Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? 'التحكم في الـ 10 مواضع الإعلانية المستقلة (Home Slots 0 - 9)' : '10 Independent Home Ad Slots (home_feed_ad_0 - home_feed_ad_9)'}
            </span>
            <span className="text-xs text-slate-500">
              {isAr ? 'انقر على أي بطاقة لتوسيع وتعديل شفرتها ورابطها' : 'Click to expand and edit custom code & links'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 10 }).map((_, idx) => {
              const slotId = `home_feed_ad_${idx}`;
              const slot = (config.homeSlots && config.homeSlots[slotId]) || {
                id: slotId,
                enabled: true,
                ctaUrl: config.homeFeedCtaUrl || 'https://example.com',
                snippet: '',
                title: '',
                description: '',
              };
              const isExpanded = expandedHomeCardId === slotId;

              return (
                <div
                  key={slotId}
                  className={`bg-white dark:bg-[#182232] border rounded-2xl transition-all duration-200 overflow-hidden shadow-xs ${
                    slot.enabled
                      ? 'border-slate-200 dark:border-[#2A384C]'
                      : 'border-slate-200 dark:border-slate-800/60 opacity-80'
                  }`}
                >
                  {/* Card Header Bar with Toggle */}
                  <div
                    onClick={() => setExpandedHomeCardId(isExpanded ? null : slotId)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-orange-600/10 text-orange-600 dark:text-orange-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-orange-500/20">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            {isAr ? `موضع إعلان رئيسية #${idx + 1}` : `Home Feed Ad Slot #${idx + 1}`}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {slotId}
                          </span>
                          {/* Clean, compact click counter badge */}
                          <span
                            title={isAr ? `إجمالي نقرات الزوار: ${slot.clickCount || 0}` : `Total tracked clicks: ${slot.clickCount || 0}`}
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 shrink-0 shadow-2xs"
                          >
                            <MousePointerClick className="w-3 h-3 text-orange-500" />
                            <span>{isAr ? `النقرات: ${slot.clickCount || 0}` : `Clicks: ${slot.clickCount || 0}`}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                          {slot.title || (isAr ? 'يعتمد التصميم الإعلاني الذكي المدمج' : 'Uses dynamic creative variant')} • {slot.ctaUrl || 'https://example.com'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Individual Toggle Switch */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={slot.enabled}
                          onClick={(e) => handleToggleHomeSlotEnabled(slotId, e)}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            slot.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              slot.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            slot.enabled
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {slot.enabled ? (isAr ? 'مفعل' : 'ON') : (isAr ? 'معطل' : 'OFF')}
                        </span>
                      </div>

                      {/* Expand / Collapse Icon */}
                      <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Settings Panel */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 dark:border-[#2A384C] bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                      {/* Click Analytics Bar */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-500/5 dark:bg-orange-950/20 border border-orange-500/20 text-xs">
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {isAr ? 'إجمالي النقرات المسجلة على هذا الموضع:' : 'Total recorded clicks on this slot:'}
                          </span>
                          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                            {slot.clickCount || 0}
                          </span>
                        </div>
                        {(slot.clickCount || 0) > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              StorageService.resetFeedAdClicks(slotId);
                              handleUpdateHomeSlot(slotId, { clickCount: 0 });
                              onShowToast(isAr ? 'تم تصفير عداد نقرات هذا الموضع' : 'Click counter reset for this slot', 'info');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-500 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isAr ? 'تصفير العداد' : 'Reset clicks'}</span>
                          </button>
                        )}
                      </div>

                      {/* Title & CTA Url Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {isAr ? 'عنوان الإعلان المخصص (اختياري - Custom Headline)' : 'Custom Title (Optional)'}
                          </label>
                          <input
                            type="text"
                            value={slot.title || ''}
                            onChange={(e) => handleUpdateHomeSlot(slotId, { title: e.target.value })}
                            placeholder={isAr ? 'اتركه فارغاً للاعتماد على العنوان الافتراضي' : 'Default AI creative headline'}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Link className="w-3.5 h-3.5 text-orange-500" />
                            <span>{isAr ? 'رابط التوجيه المخصص (Destination CTA URL)' : 'Destination CTA URL'}</span>
                          </label>
                          <input
                            type="url"
                            dir="ltr"
                            value={slot.ctaUrl || ''}
                            onChange={(e) => handleUpdateHomeSlot(slotId, { ctaUrl: e.target.value })}
                            placeholder="https://example.com/special-deal"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Description Override */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {isAr ? 'نص الوصف الترويجي (اختياري - Promotional Description)' : 'Custom Description (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={slot.description || ''}
                          onChange={(e) => handleUpdateHomeSlot(slotId, { description: e.target.value })}
                          placeholder={isAr ? 'نص وصفي توضيحي للعرض الإعلاني' : 'Promotional body copy'}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      {/* Code Snippet Override */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-orange-500" />
                            <span>{isAr ? 'شفرة وكود هذا الموضع (HTML5 Video / Ad Network Script / iframe)' : 'Dedicated Custom HTML / Script Snippet'}</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {isAr ? 'إذا ترك فارغاً يُعرض كبطاقة ذكية أنيقة' : 'Leave empty for rich native card'}
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          dir="ltr"
                          value={slot.snippet || ''}
                          onChange={(e) => handleUpdateHomeSlot(slotId, { snippet: e.target.value })}
                          placeholder="<script async src='...'></script> or <video src='...' controls autoplay muted></video>"
                          className="w-full p-2.5 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          EXPLICIT DARK / BLACK HORIZONTAL DIVIDER 2
         ========================================================================= */}
      <div className="border-t-2 border-slate-900 dark:border-slate-900/90 my-8 shadow-xs" />

      {/* =========================================================================
          SECTION 3: Community Page Feed Ads (10 Dedicated Slots: comm_feed_ad_0 - comm_feed_ad_9)
         ========================================================================= */}
      <div className="space-y-6">
        {/* Section Title & Master Community Feed Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr
                    ? 'قسم التحكم بالإعلانات المدمجة في شبكة المنشورات - صفحة المجتمع'
                    : 'Community Page Feed Ads Management'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-600/10 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  {isAr ? `${activeCommSlotsCount}/10 نشطة` : `${activeCommSlotsCount}/10 Active`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'إدارة 10 مواضع إعلانية مستقلة مدمجة داخل مسار منشورات المجتمع مع تخصيص المباعدة والشفرات والروابط المستقلة لكل موضع.'
                  : 'Manage 10 independent native ad slots embedded in the Community post stream with dedicated toggles, URLs, and code snippets.'}
              </p>
            </div>
          </div>

          {/* Master Community Feed Toggle */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] px-4 py-2 rounded-2xl shadow-xs">
            <span className="text-xs font-bold">
              {isAr ? 'حالة إعلانات مسار المجتمع:' : 'Community Feed Ads Master:'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(config.communityFeedEnabled)}
              onClick={handleToggleCommunityFeedMaster}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                config.communityFeedEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.communityFeedEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                config.communityFeedEnabled
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {config.communityFeedEnabled ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
            </span>
          </div>
        </div>

        {/* Master Frequency Slider for Community Feed */}
        <div className="p-5 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Hash className="w-4 h-4 text-orange-500" />
              <span>
                {isAr
                  ? 'تكرار ومباعدة الإعلانات: عدد المنشورات بين كل إعلان والآخر (Frequency Spacing Slider)'
                  : 'Community Feed Frequency Spacing (Posts between each active ad)'}
              </span>
            </label>

            <span className="px-3 py-1 rounded-lg bg-orange-600/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold font-mono">
              {isAr
                ? `موضع إعلان بعد كل ${config.communityAdFrequency || 5} منشورات`
                : `1 Ad every ${config.communityAdFrequency || 5} posts`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min={2}
              max={15}
              step={1}
              value={config.communityAdFrequency || 5}
              onChange={(e) => setConfig({ ...config, communityAdFrequency: parseInt(e.target.value) || 5 })}
              className="w-full accent-orange-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <input
              type="number"
              min={2}
              max={15}
              value={config.communityAdFrequency || 5}
              onChange={(e) => setConfig({ ...config, communityAdFrequency: Math.max(2, Math.min(15, parseInt(e.target.value) || 5)) })}
              className="w-20 px-3 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isAr
              ? 'يتحكم هذا المؤشر في معدل تكرار ظهور المواضع النشطة في مسار المجتمع. يتجاوب كل إعلان بالكامل مع النقر ويوفر زر إغلاق يعيد ترتيب المنشورات فورياً دون ترك فراغات.'
              : 'Controls how often active community ad cards appear in the post stream. Fully responsive with instant zero-gap reflow on dismissal.'}
          </p>
        </div>

        {/* 10 Independent Community Ad Slot Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? 'التحكم في الـ 10 مواضع الإعلانية المستقلة (Community Slots 0 - 9)' : '10 Independent Community Ad Slots (comm_feed_ad_0 - comm_feed_ad_9)'}
            </span>
            <span className="text-xs text-slate-500">
              {isAr ? 'انقر على أي بطاقة لتوسيع وتعديل شفرتها ورابطها' : 'Click to expand and edit custom code & links'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 10 }).map((_, idx) => {
              const slotId = `comm_feed_ad_${idx}`;
              const slot = (config.communitySlots && config.communitySlots[slotId]) || {
                id: slotId,
                enabled: true,
                ctaUrl: config.communityFeedCtaUrl || 'https://example.com',
                snippet: '',
                title: '',
                description: '',
              };
              const isExpanded = expandedCommCardId === slotId;

              return (
                <div
                  key={slotId}
                  className={`bg-white dark:bg-[#182232] border rounded-2xl transition-all duration-200 overflow-hidden shadow-xs ${
                    slot.enabled
                      ? 'border-slate-200 dark:border-[#2A384C]'
                      : 'border-slate-200 dark:border-slate-800/60 opacity-80'
                  }`}
                >
                  {/* Card Header Bar with Toggle */}
                  <div
                    onClick={() => setExpandedCommCardId(isExpanded ? null : slotId)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-orange-600/10 text-orange-600 dark:text-orange-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-orange-500/20">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            {isAr ? `موضع إعلان مجتمع #${idx + 1}` : `Community Feed Ad Slot #${idx + 1}`}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {slotId}
                          </span>
                          {/* Clean, compact click counter badge */}
                          <span
                            title={isAr ? `إجمالي نقرات الزوار: ${slot.clickCount || 0}` : `Total tracked clicks: ${slot.clickCount || 0}`}
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 shrink-0 shadow-2xs"
                          >
                            <MousePointerClick className="w-3 h-3 text-orange-500" />
                            <span>{isAr ? `النقرات: ${slot.clickCount || 0}` : `Clicks: ${slot.clickCount || 0}`}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                          {slot.title || (isAr ? 'يعتمد التصميم الإعلاني الذكي المدمج' : 'Uses dynamic creative variant')} • {slot.ctaUrl || 'https://example.com'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Individual Toggle Switch */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={slot.enabled}
                          onClick={(e) => handleToggleCommunitySlotEnabled(slotId, e)}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            slot.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              slot.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            slot.enabled
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {slot.enabled ? (isAr ? 'مفعل' : 'ON') : (isAr ? 'معطل' : 'OFF')}
                        </span>
                      </div>

                      {/* Expand / Collapse Icon */}
                      <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Settings Panel */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 dark:border-[#2A384C] bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                      {/* Click Analytics Bar */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-500/5 dark:bg-orange-950/20 border border-orange-500/20 text-xs">
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {isAr ? 'إجمالي النقرات المسجلة على هذا الموضع:' : 'Total recorded clicks on this slot:'}
                          </span>
                          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                            {slot.clickCount || 0}
                          </span>
                        </div>
                        {(slot.clickCount || 0) > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              StorageService.resetFeedAdClicks(slotId);
                              handleUpdateCommunitySlot(slotId, { clickCount: 0 });
                              onShowToast(isAr ? 'تم تصفير عداد نقرات هذا الموضع' : 'Click counter reset for this slot', 'info');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-500 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isAr ? 'تصفير العداد' : 'Reset clicks'}</span>
                          </button>
                        )}
                      </div>

                      {/* Title & CTA Url Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {isAr ? 'عنوان الإعلان المخصص (اختياري - Custom Headline)' : 'Custom Title (Optional)'}
                          </label>
                          <input
                            type="text"
                            value={slot.title || ''}
                            onChange={(e) => handleUpdateCommunitySlot(slotId, { title: e.target.value })}
                            placeholder={isAr ? 'اتركه فارغاً للاعتماد على العنوان الافتراضي' : 'Default AI creative headline'}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Link className="w-3.5 h-3.5 text-orange-500" />
                            <span>{isAr ? 'رابط التوجيه المخصص (Destination CTA URL)' : 'Destination CTA URL'}</span>
                          </label>
                          <input
                            type="url"
                            dir="ltr"
                            value={slot.ctaUrl || ''}
                            onChange={(e) => handleUpdateCommunitySlot(slotId, { ctaUrl: e.target.value })}
                            placeholder="https://example.com/special-deal"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Description Override */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {isAr ? 'نص الوصف الترويجي (اختياري - Promotional Description)' : 'Custom Description (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={slot.description || ''}
                          onChange={(e) => handleUpdateCommunitySlot(slotId, { description: e.target.value })}
                          placeholder={isAr ? 'نص وصفي توضيحي للعرض الإعلاني' : 'Promotional body copy'}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      {/* Code Snippet Override */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-orange-500" />
                            <span>{isAr ? 'شفرة وكود هذا الموضع (HTML5 Video / Ad Network Script / iframe)' : 'Dedicated Custom HTML / Script Snippet'}</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {isAr ? 'إذا ترك فارغاً يُعرض كبطاقة ذكية أنيقة' : 'Leave empty for rich native card'}
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          dir="ltr"
                          value={slot.snippet || ''}
                          onChange={(e) => handleUpdateCommunitySlot(slotId, { snippet: e.target.value })}
                          placeholder="<script async src='...'></script> or <video src='...' controls autoplay muted></video>"
                          className="w-full p-2.5 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM GLOBAL ACTION BAR
         ========================================================================= */}
      <div className="pt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSaveAll}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md hover:shadow-orange-600/25 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isAr ? 'حفظ كافة إعدادات الإعلانات' : 'Save All Ad Settings'}</span>
        </button>
      </div>

      {/* =========================================================================
          PREVIEW MODAL (Test Ad Render in Dialog)
         ========================================================================= */}
      {previewSlot && (
        <div
          onClick={() => setPreviewSlot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white dark:bg-[#182232] border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {isAr ? `معاينة: ${previewSlot.nameAr || previewSlot.name}` : `Preview: ${previewSlot.name}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSlot(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-950/80 rounded-xl overflow-hidden min-h-[160px] flex items-center justify-center">
              <AdSlotRenderer
                slot={previewSlot}
                masterEnabled={true}
                slotType={previewSlot.triggerType === 'modal' ? 'banner' : (previewSlot.triggerType as any)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdSettings = AdsManager;
export default AdsManager;
