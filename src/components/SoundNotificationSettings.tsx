import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Bell,
  MessageSquare,
  CornerDownLeft,
  AtSign,
  Play,
  Globe,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  Headphones,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SoundNotificationService,
  SoundPreferences,
  SoundNotificationType,
} from '../services/soundNotificationService';
import { BrowserNotificationService } from '../services/browserNotificationService';
import { useApp } from '../context/AppContext';

interface SoundNotificationSettingsProps {
  compact?: boolean;
  defaultExpanded?: boolean;
}

export const SoundNotificationSettings: React.FC<SoundNotificationSettingsProps> = ({
  compact = false,
  defaultExpanded = false,
}) => {
  const { t, language, isRTL } = useApp();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [preferences, setPreferences] = useState<SoundPreferences>(() =>
    SoundNotificationService.getPreferences()
  );
  const [activeTestingType, setActiveTestingType] = useState<SoundNotificationType | null>(null);

  // Native Browser Notification state
  const isPushSupported = BrowserNotificationService.isSupported();
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() =>
    BrowserNotificationService.getPermission()
  );
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() =>
    BrowserNotificationService.isEnabled()
  );
  const [testSentMessage, setTestSentMessage] = useState<boolean>(false);

  // Synchronize preferences if changed from another tab or drawer
  useEffect(() => {
    const handlePrefChange = (e: any) => {
      if (e.detail) {
        setPreferences(e.detail);
      } else {
        setPreferences(SoundNotificationService.getPreferences());
      }
    };
    window.addEventListener('prombo_sound_preferences_change', handlePrefChange);
    return () => window.removeEventListener('prombo_sound_preferences_change', handlePrefChange);
  }, []);

  // Synchronize permission changes
  useEffect(() => {
    const handlePermChange = () => {
      setPushPermission(BrowserNotificationService.getPermission());
      setIsPushEnabled(BrowserNotificationService.isEnabled());
    };
    window.addEventListener('prombo_browser_push_permission_change', handlePermChange);
    return () => window.removeEventListener('prombo_browser_push_permission_change', handlePermChange);
  }, []);

  const handleToggle = async (key: keyof SoundPreferences, soundType: SoundNotificationType) => {
    // Explicit user interaction: call Notification.requestPermission() directly if permission is not yet decided
    if (isPushSupported && pushPermission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPushPermission(result);
        if (result === 'granted') {
          BrowserNotificationService.setPushEnabled(true);
          setIsPushEnabled(true);
        }
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    }

    const updated = SoundNotificationService.togglePreference(key);
    setPreferences((prev) => ({ ...prev, [key]: updated }));

    // Play a preview tone if enabled
    if (updated) {
      SoundNotificationService.playSound(soundType, true);
    }
  };

  const handleTestSound = (e: React.MouseEvent, type: SoundNotificationType) => {
    e.stopPropagation();
    setActiveTestingType(type);
    SoundNotificationService.playSound(type, true);
    setTimeout(() => {
      setActiveTestingType(null);
    }, 600);
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
          BrowserNotificationService.setPushEnabled(true);
          setIsPushEnabled(true);
          BrowserNotificationService.sendNotification({
            title: 'Prombo',
            body: language === 'ar' ? 'تم تفعيل إشعارات المتصفح بنجاح! 🔔' : 'Browser notifications enabled successfully! 🔔',
          });
        }
      } catch (err) {
        console.warn('Direct notification request error:', err);
      }
    }
  };

  const handlePrimaryPushToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If permission not yet requested (default), request permission on first toggle
    if (pushPermission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
          BrowserNotificationService.setPushEnabled(true);
          setIsPushEnabled(true);
          BrowserNotificationService.sendNotification({
            title: 'Prombo',
            body: language === 'ar' ? 'تم تفعيل إشعارات المتصفح بنجاح! 🔔' : 'Browser notifications enabled successfully! 🔔',
          });
        } else {
          BrowserNotificationService.setPushEnabled(false);
          setIsPushEnabled(false);
        }
      } catch (err) {
        console.warn('Notification request error:', err);
      }
      return;
    }

    // If already granted, toggle on/off
    const next = BrowserNotificationService.toggleEnabled();
    setIsPushEnabled(next);
  };

  const handleSendTestPush = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pushPermission !== 'granted') {
      handleRequestPushPermission();
      return;
    }
    BrowserNotificationService.sendNotification({
      title: language === 'ar' ? 'أمر ذكاء اصطناعي جديد في Prombo' : 'New AI Prompt Published in Prombo',
      body: language === 'ar' ? 'تم نشر برومبت تفاعلي جديد في مكتبة الأوامر!' : 'A new interactive prompt was published to the library!',
      tag: 'test-push-notification',
    });
    setTestSentMessage(true);
    setTimeout(() => setTestSentMessage(false), 3000);
  };

  const soundItems: {
    key: keyof SoundPreferences;
    type: SoundNotificationType;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }[] = [
    {
      key: 'newPost',
      type: 'sound_new_post',
      icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />,
      title: t('soundNewPostTitle'),
      desc: t('soundNewPostDesc'),
    },
    {
      key: 'postReply',
      type: 'sound_post_reply',
      icon: <CornerDownLeft className="w-3.5 h-3.5 text-sky-500" />,
      title: t('soundPostReplyTitle'),
      desc: t('soundPostReplyDesc'),
    },
    {
      key: 'supportMessages',
      type: 'sound_support_message',
      icon: <Headphones className="w-3.5 h-3.5 text-orange-500" />,
      title: language === 'ar' ? 'رسائل الدعم الفني المباشر' : 'Live Technical Support Alerts',
      desc: language === 'ar' ? 'تنبيه فوري عند استلام رد من فريق الدعم الفني' : 'Instant alerts when receiving support responses',
    },
    {
      key: 'promptPublished',
      type: 'sound_prompt_published',
      icon: <Bell className="w-3.5 h-3.5 text-amber-500" />,
      title: t('soundPromptPublishedTitle'),
      desc: t('soundPromptPublishedDesc'),
    },
    {
      key: 'userMention',
      type: 'sound_user_mention',
      icon: <AtSign className="w-3.5 h-3.5 text-purple-500" />,
      title: t('soundUserMentionTitle'),
      desc: t('soundUserMentionDesc'),
    },
  ];

  const isPrimaryActive = pushPermission === 'granted' && isPushEnabled;

  return (
    <div
      id="sound-notification-settings-section"
      className="rounded-2xl bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-[#223044] overflow-hidden shadow-xs transition-colors"
    >
      {/* COMPACT PRIMARY HEADER WITH BROWSER PERMISSION TOGGLE & CHEVRON ACCORDION TRIGGER */}
      <div
        id="notification-primary-header"
        className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 select-none hover:bg-slate-50/70 dark:hover:bg-[#182335]/70 transition-colors"
      >
        {/* Left Icon & Title */}
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Bell className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {t('browserPushTitle')}
              </span>

              {/* Status Badge */}
              {pushPermission === 'granted' && isPushEnabled && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{t('browserPushGranted')}</span>
                </span>
              )}
              {pushPermission === 'denied' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>{t('browserPushDenied')}</span>
                </span>
              )}
              {pushPermission === 'default' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{t('browserPushDefault')}</span>
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {isPrimaryActive
                ? (language === 'ar' ? 'إشعارات المتصفح والنغمات مفعلة' : 'Push & sound notifications enabled')
                : (language === 'ar' ? 'اضغط لتفعيل إشعارات المتصفح' : 'Enable browser push alerts')}
            </p>
          </div>
        </div>

        {/* Right Controls: Primary Toggle Switch + Chevron Accordion Trigger */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Primary Toggle Switch */}
          <div
            id="browser-notification-permission-toggle"
            role="switch"
            aria-checked={isPrimaryActive}
            aria-label={t('browserPushTitle')}
            title={language === 'ar' ? 'تبديل إذن إشعارات المتصفح' : 'Toggle browser notification permission'}
            onClick={handlePrimaryPushToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              isPrimaryActive
                ? 'bg-orange-600'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isPrimaryActive
                  ? isRTL
                    ? '-translate-x-4'
                    : 'translate-x-4'
                  : 'translate-x-0'
              }`}
            />
          </div>

          {/* Chevron Accordion Trigger */}
          <button
            type="button"
            id="notification-accordion-toggle-btn"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? (language === 'ar' ? 'طي الإعدادات' : 'Collapse settings') : (language === 'ar' ? 'توسيع تفضيلات الإشعارات' : 'Expand notification preferences')}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1C283B] transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE ACCORDION PANEL */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="notification-accordion-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-slate-100 dark:border-[#1E2B3E] bg-slate-50/50 dark:bg-[#101724]"
          >
            <div className="p-3 sm:p-4 space-y-2.5">
              {/* Accordion Subtitle */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <Volume2 className="w-3.5 h-3.5 text-orange-500" />
                  <span>{language === 'ar' ? 'تفضيلات ونغمات التنبيه المخصصة' : 'Individual Notification Preferences'}</span>
                </div>
                {pushPermission === 'granted' && (
                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                  >
                    <Send className="w-2.5 h-2.5" />
                    <span>{t('browserPushTest')}</span>
                  </button>
                )}
              </div>

              {/* Individual Preference Toggles */}
              <div className="space-y-1.5">
                {soundItems.map((item) => {
                  const isEnabled = preferences[item.key] ?? true;
                  const isTesting = activeTestingType === item.type;

                  return (
                    <div
                      key={item.key}
                      id={`sound-toggle-${item.key}`}
                      onClick={() => handleToggle(item.key, item.type)}
                      className={`group flex items-center justify-between gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                        isEnabled
                          ? 'bg-white dark:bg-[#182335] border-slate-200/80 dark:border-[#26374F] shadow-xs'
                          : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-[#162030]'
                      }`}
                    >
                      {/* Left Info & Icon */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isEnabled
                              ? 'bg-slate-100 dark:bg-[#1B273A]'
                              : 'bg-slate-100/60 dark:bg-slate-800/40 opacity-50'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-xs font-semibold leading-tight block truncate transition-colors ${
                              isEnabled
                                ? 'text-slate-900 dark:text-slate-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      {/* Right Controls: Preview Button + Switch */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          id={`sound-preview-btn-${item.key}`}
                          title={language === 'ar' ? 'تجربة النغمة' : 'Test sound'}
                          aria-label={language === 'ar' ? `تجربة ${item.title}` : `Test ${item.title}`}
                          onClick={(e) => handleTestSound(e, item.type)}
                          className={`p-1 rounded-md border transition-all cursor-pointer ${
                            isTesting
                              ? 'bg-orange-500 text-white border-orange-500 scale-105'
                              : 'bg-slate-50 dark:bg-[#1C2739] text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 border-slate-200 dark:border-[#2D3F59]'
                          }`}
                        >
                          <Play className={`w-2.5 h-2.5 ${isTesting ? 'animate-pulse' : ''}`} />
                        </button>

                        <div
                          role="switch"
                          aria-checked={isEnabled}
                          aria-label={item.title}
                          className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            isEnabled ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              isEnabled
                                ? isRTL
                                  ? '-translate-x-3'
                                  : 'translate-x-3'
                                : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feedback messages or permission alert */}
              {testSentMessage && (
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10.5px] text-emerald-700 dark:text-emerald-300 text-center font-semibold animate-in fade-in">
                  {t('browserPushTestSent')}
                </div>
              )}

              {pushPermission === 'denied' && (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[10.5px] text-rose-700 dark:text-rose-300 leading-relaxed">
                  {t('browserPushBlockedHelp')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


