import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Megaphone, Clock, Smartphone, Monitor } from 'lucide-react';
import { AdSlotConfig } from '../../types';
import { AdSlotRenderer } from './AdSlotRenderer';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storage';

interface DismissableAdWrapperProps {
  slot: AdSlotConfig | undefined;
  masterEnabled: boolean;
  className?: string;
  slotType?: 'banner' | 'skyscraper' | 'inline';
  badgePosition?: 'top-left' | 'top-right';
  persistSessionDismiss?: boolean;
  onDismiss?: () => void;
}

export const DismissableAdWrapper: React.FC<DismissableAdWrapperProps> = ({
  slot,
  masterEnabled,
  className = '',
  slotType = 'banner',
  badgePosition = 'top-right',
  persistSessionDismiss = true,
  onDismiss,
}) => {
  const { language, t } = useApp();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState<boolean>(() => slotType === 'skyscraper');

  // Measure container width to auto-collapse header text in narrow slots (< 200px)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const checkWidth = (width: number) => {
      setIsNarrow(width > 0 && width < 200);
    };

    checkWidth(el.offsetWidth);

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          checkWidth(entry.contentRect.width);
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [slotType]);
  
  // 1. Session Dismissed State
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (!slot || !persistSessionDismiss) return false;
    try {
      // Check session dismissal
      const sessionDismissed = sessionStorage.getItem(`prombo_ad_dismissed_${slot.id}`) === 'true';
      if (sessionDismissed) return true;

      // Check cooldown if configured
      if (slot.cooldownMinutes && slot.cooldownMinutes > 0) {
        const lastDismissedTime = Number(localStorage.getItem(`prombo_ad_cooldown_${slot.id}`) || '0');
        if (lastDismissedTime && Date.now() - lastDismissedTime < slot.cooldownMinutes * 60 * 1000) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  // 2. Auto-close Countdown State
  const autoCloseSecs = slot?.autoCloseSeconds || 0;
  const [remainingAutoClose, setRemainingAutoClose] = useState<number>(autoCloseSecs);

  const handleDismiss = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDismissed(true);

    if (persistSessionDismiss && slot) {
      try {
        sessionStorage.setItem(`prombo_ad_dismissed_${slot.id}`, 'true');
        if (slot.cooldownMinutes && slot.cooldownMinutes > 0) {
          localStorage.setItem(`prombo_ad_cooldown_${slot.id}`, String(Date.now()));
        }
      } catch {
        // Ignore storage exceptions
      }
    }

    if (onDismiss) {
      onDismiss();
    }
  }, [slot, persistSessionDismiss, onDismiss]);

  const handleAdBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;

    const target = e.target as HTMLElement | null;
    const clickedAnchor = target?.closest('a[href]') as HTMLAnchorElement | null;
    if (clickedAnchor) {
      if (slot?.id) {
        StorageService.recordGlobalAdClick(slot.id);
      }
      return;
    }

    let targetUrl: string | null = null;
    if (slot?.codeSnippet) {
      const match = slot.codeSnippet.match(/href=["'](https?:\/\/[^"'\s>]+)["']/i);
      if (match) targetUrl = match[1];
    }

    if (targetUrl) {
      if (slot?.id) {
        StorageService.recordGlobalAdClick(slot.id);
      }
      e.preventDefault();
      const tempLink = document.createElement('a');
      tempLink.href = targetUrl;
      tempLink.target = '_blank';
      tempLink.rel = 'noopener noreferrer';
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
    }
  };

  // Sync state on slot change
  useEffect(() => {
    if (slot && persistSessionDismiss) {
      try {
        const sessionDismissed = sessionStorage.getItem(`prombo_ad_dismissed_${slot.id}`) === 'true';
        if (sessionDismissed) {
          setIsDismissed(true);
          return;
        }
        if (slot.cooldownMinutes && slot.cooldownMinutes > 0) {
          const lastTime = Number(localStorage.getItem(`prombo_ad_cooldown_${slot.id}`) || '0');
          if (lastTime && Date.now() - lastTime < slot.cooldownMinutes * 60 * 1000) {
            setIsDismissed(true);
            return;
          }
        }
        setIsDismissed(false);
      } catch {
        setIsDismissed(false);
      }
    }
  }, [slot?.id, persistSessionDismiss, slot?.cooldownMinutes]);

  // Handle Countdown Display Ticker
  useEffect(() => {
    if (!slot || isDismissed || autoCloseSecs <= 0) return;

    setRemainingAutoClose(autoCloseSecs);
    const interval = setInterval(() => {
      setRemainingAutoClose((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [slot?.id, isDismissed, autoCloseSecs]);

  // Handle Auto-close Timeout (decoupled from React state updates)
  useEffect(() => {
    if (!slot || isDismissed || autoCloseSecs <= 0) return;

    const timeout = setTimeout(() => {
      handleDismiss();
    }, autoCloseSecs * 1000);

    return () => clearTimeout(timeout);
  }, [slot?.id, isDismissed, autoCloseSecs, handleDismiss]);

  const shouldRender = masterEnabled && slot && slot.isEnabled && slot.codeSnippet?.trim() && !isDismissed;

  // Device Targeting Classes
  const deviceTargetingClass =
    slot.deviceTargeting === 'desktop'
      ? 'hidden md:block'
      : slot.deviceTargeting === 'mobile'
      ? 'block md:hidden'
      : '';

  return (
    <AnimatePresence>
      {shouldRender && slot && (
        <motion.div
          ref={wrapperRef}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, height: 0 }}
          transition={{ duration: 0.2 }}
          className={`relative group bg-white/85 dark:bg-[#182232]/85 border border-slate-200/90 dark:border-[#2A384C]/90 rounded-2xl shadow-xs backdrop-blur-xs transition-all w-full max-w-full flex flex-col ${deviceTargetingClass} ${className}`}
          data-ad-container={slot.id}
        >
        {/* Top Control Bar with Close (X) Button and Ad Tag */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100/95 dark:bg-[#121824]/95 border-b border-slate-200/80 dark:border-[#2A384C]/80 text-[10px] select-none w-full shrink-0 rounded-t-2xl"
        >
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
            {!isNarrow && <span className="truncate">{t('ads.sponsored')}</span>}

            {/* Device indicator badge if specific */}
            {!isNarrow && slot.deviceTargeting === 'desktop' && (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 shrink-0">
                <Monitor className="w-2.5 h-2.5" /> Desktop
              </span>
            )}
            {!isNarrow && slot.deviceTargeting === 'mobile' && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 shrink-0">
                <Smartphone className="w-2.5 h-2.5" /> Mobile
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Auto-Close Countdown Indicator */}
            {autoCloseSecs > 0 && remainingAutoClose > 0 && (
              <span className="text-[10px] font-mono font-medium text-orange-600 dark:text-orange-400 flex items-center gap-0.5 shrink-0">
                <Clock className="w-2.5 h-2.5 animate-spin" />
                <span>{!isNarrow ? t('ads.skipIn', { seconds: remainingAutoClose }) : `${remainingAutoClose}s`}</span>
              </span>
            )}

            {/* High-visibility User Close ("X") Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(e);
              }}
              aria-label={t('ads.closeAd') || t('ads.close')}
              title={t('ads.dismissSession') || t('ads.close')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-slate-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 transition-colors cursor-pointer shrink-0"
            >
              {!isNarrow && (
                <span className="text-[10px] font-semibold">
                  {t('ads.close')}
                </span>
              )}
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ad Body - Scoped overflow-hidden to keep inner ad content neatly contained */}
        <div 
          onClick={handleAdBodyClick}
          className="p-2 w-full flex-1 min-h-0 flex flex-col justify-center items-stretch overflow-hidden rounded-b-2xl"
          style={{ overflow: 'hidden' }}
        >
          <AdSlotRenderer
            slot={slot}
            masterEnabled={masterEnabled}
            slotType={slotType}
            className="w-full flex-1 min-h-0 flex flex-col justify-center items-stretch overflow-hidden"
          />
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
