import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, ExternalLink } from 'lucide-react';
import { AdSlotConfig } from '../../types';
import { AdSlotRenderer } from './AdSlotRenderer';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storage';

export interface AdBannerProps {
  slot: AdSlotConfig | undefined;
  masterEnabled: boolean;
  className?: string;
  slotType?: 'banner' | 'skyscraper' | 'inline';
  badgePosition?: 'top-left' | 'top-right';
  persistSessionDismiss?: boolean;
  onDismiss?: () => void;
}

interface ParsedBannerContent {
  isScriptOrIframe: boolean;
  mediaType: 'image' | 'video';
  videoUrl?: string;
  imageUrl?: string;
  badgeText?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * Parses ad code snippet to extract structured image/video, headline, description and CTA
 * for the standard IAB Leaderboard horizontal layout.
 */
function parseLeaderboardSnippet(snippet: string | undefined, slotId?: string): ParsedBannerContent {
  const cleanSnippet = snippet?.trim() || '';

  // Check for native video presence first to prevent script-gate hijacking
  const hasNativeVideo = /<video\b|<source\b|\.(?:mp4|webm|ogg|mov)(?:["'\s?]|$)/i.test(cleanSnippet);

  // Detect raw ad network scripts or iframe embed tags
  // ONLY classify as script/iframe if NOT containing native video tags/sources
  if (cleanSnippet && !hasNativeVideo && /<script|<iframe|<ins\s+class=/i.test(cleanSnippet)) {
    return { mediaType: 'image', isScriptOrIframe: true };
  }

  let mediaType: 'image' | 'video' = 'image';
  let videoUrl: string | undefined;
  let imageUrl: string | undefined;
  let ctaUrl: string | undefined;
  let ctaText: string | undefined;
  let badgeText: string | undefined;
  let headline: string | undefined;
  let description: string | undefined;

  if (cleanSnippet) {
    // 1. Detect HTML5 <video> tag or video URL (.mp4 / .webm / .ogg / .mov or video src)
    // Handles self-closing <video .../>, unclosed <video ...>, standard <video>...</video>, and <source> children
    const videoTagMatch = cleanSnippet.match(/<video\b([^>]*)>([\s\S]*?)<\/video>|<video\b([^>]*)\/?>/i);
    if (videoTagMatch) {
      const videoAttributes = (videoTagMatch[1] || videoTagMatch[3] || '');
      const videoInner = videoTagMatch[2] || '';

      // Check direct src in <video> tag
      const directSrc = videoAttributes.match(/\bsrc=["']([^"']+)["']/i);
      if (directSrc && directSrc[1]) {
        videoUrl = directSrc[1];
      } else {
        // Check inner <source> tag
        const sourceMatch = videoInner.match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i);
        if (sourceMatch && sourceMatch[1]) {
          videoUrl = sourceMatch[1];
        }
      }

      // Check optional poster explicitly in <video> tag only
      const posterMatch = videoAttributes.match(/\bposter=["']([^"']+)["']/i);
      if (posterMatch && posterMatch[1]) {
        imageUrl = posterMatch[1];
      }
    }

    // 2. If no video from <video> tag, check any standalone <source> tag
    if (!videoUrl) {
      const standaloneSourceMatch = cleanSnippet.match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i);
      if (standaloneSourceMatch && standaloneSourceMatch[1]) {
        videoUrl = standaloneSourceMatch[1];
      }
    }

    // 3. If still no videoUrl, check for direct video file URLs (.mp4 / .webm / .ogg / .mov) in src or href
    if (!videoUrl) {
      const directExtMatch = cleanSnippet.match(/(?:src|href)=["']([^"']+\.(?:mp4|webm|ogg|mov)(?:\?[^"']*)?)["']/i);
      if (directExtMatch && directExtMatch[1]) {
        videoUrl = directExtMatch[1];
      }
    }

    // 4. Also check for raw unquoted or quoted video links if snippet itself is a direct video URL
    if (!videoUrl && /^https?:\/\/[^\s<>]+\.(?:mp4|webm|ogg|mov)(?:\?[^\s<>]*)?$/i.test(cleanSnippet)) {
      videoUrl = cleanSnippet;
    }

    if (videoUrl) {
      mediaType = 'video';
    }

    // 5. Extract image URL from <img> tag or background-image ONLY IF NOT VIDEO (or if video has no poster and we do NOT want random img as poster)
    if (!videoUrl) {
      const imgMatch = cleanSnippet.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        imageUrl = imgMatch[1];
      } else {
        const bgMatch = cleanSnippet.match(/background(?:-image)?:\s*url\(['"]?([^'"\)]+)['"]?\)/i);
        if (bgMatch && bgMatch[1]) {
          imageUrl = bgMatch[1];
        }
      }
    }

    // 7. Extract CTA target URL and label
    const linkMatch = cleanSnippet.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (linkMatch) {
      ctaUrl = linkMatch[1];
      const rawCta = linkMatch[2]?.replace(/<[^>]+>/g, '').replace(/&rarr;|&nbsp;|→/g, '').trim();
      if (rawCta) ctaText = rawCta;
    } else {
      const rawHref = cleanSnippet.match(/href=["']([^"']+)["']/i);
      if (rawHref) ctaUrl = rawHref[1];
    }

    // 8. Extract badge/subhead text (e.g., "AD", "PROMPT ENGINE PRO")
    const badgeMatch = cleanSnippet.match(/font-size:\s*(?:9|10)px[^>]*>(.*?)<\/div>|<span[^>]*>(AD|إعلان)<\/span>/i);
    if (badgeMatch) {
      const rawBadge = (badgeMatch[1] || badgeMatch[2])?.replace(/<[^>]+>/g, '').trim();
      if (rawBadge && rawBadge.length <= 25) {
        badgeText = rawBadge;
      }
    }

    // 9. Extract headline
    const headlineMatch = cleanSnippet.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>|(?:font-size:\s*(?:13|14|15|16)px|font-weight:\s*(?:700|800|bold))[^>]*>(.*?)<\/(?:div|span|h[1-6])>/i);
    if (headlineMatch) {
      headline = (headlineMatch[1] || headlineMatch[2])?.replace(/<[^>]+>/g, '').trim();
    }

    // 10. Extract description
    const descMatch = cleanSnippet.match(/<p[^>]*>(.*?)<\/p>|(?:font-size:\s*(?:11|12)px|color:\s*#(?:cbd5e1|94a3b8|e2e8f0|888))[^>]*>(.*?)<\/(?:div|span|p)>/i);
    if (descMatch) {
      const rawDesc = (descMatch[1] || descMatch[2])?.replace(/<[^>]+>/g, '').trim();
      if (rawDesc && rawDesc !== headline && rawDesc !== badgeText) {
        description = rawDesc;
      }
    }
  }

  // 6. Visual fallback: ONLY assign static placeholder image if NOT a video!
  // If videoUrl is active, leave imageUrl as undefined unless snippet explicitly supplied a poster.
  if (!imageUrl && !videoUrl) {
    if (slotId === 'headerBanner') {
      imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80';
    } else {
      imageUrl = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=160&auto=format&fit=crop&q=80';
    }
  }

  // Clean fallbacks if parsing is incomplete
  if (!headline) {
    headline = slotId === 'headerBanner'
      ? 'Ultra-Fast Cursor & Claude 3.7 Templates'
      : 'Next-Gen Full-Stack AI Workflows';
  }
  if (!badgeText) {
    badgeText = slotId === 'headerBanner' ? 'PROMPT ENGINE PRO' : 'SPONSORED';
  }
  if (!description) {
    description = slotId === 'headerBanner'
      ? 'Supercharge your daily productivity with verified AI prompts.'
      : 'Build full-stack AI apps 10x faster with AI-powered developer IDEs.';
  }
  if (!ctaText) {
    ctaText = slotId === 'headerBanner' ? 'Get Pro' : 'Learn More';
  }
  if (!ctaUrl) {
    ctaUrl = 'https://example.com';
  }

  return {
    isScriptOrIframe: false,
    mediaType,
    videoUrl,
    imageUrl,
    badgeText,
    headline,
    description,
    ctaText,
    ctaUrl,
  };
}

export const AdBanner: React.FC<AdBannerProps> = ({
  slot,
  masterEnabled,
  className = '',
  slotType = 'banner',
  persistSessionDismiss = true,
  onDismiss,
}) => {
  const { language, t } = useApp();

  // 1. Session Dismissed State (with Admin bypass for testing visibility)
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (!slot || !persistSessionDismiss) return false;
    try {
      // Testing & Admin preview bypass: logged-in admin always sees ad placements
      if (StorageService.isLoggedIn()) return false;

      const sessionDismissed = sessionStorage.getItem(`prombo_ad_dismissed_${slot.id}`) === 'true';
      if (sessionDismissed) return true;

      if (slot.cooldownMinutes && slot.cooldownMinutes > 0) {
        const lastTime = Number(localStorage.getItem(`prombo_ad_cooldown_${slot.id}`) || '0');
        if (lastTime && Date.now() - lastTime < slot.cooldownMinutes * 60 * 1000) {
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

  const handleDismiss = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsDismissed(true);

      if (persistSessionDismiss && slot) {
        try {
          sessionStorage.setItem(`prombo_ad_dismissed_${slot.id}`, 'true');
          if (slot.cooldownMinutes && slot.cooldownMinutes > 0) {
            localStorage.setItem(`prombo_ad_cooldown_${slot.id}`, String(Date.now()));
          }
        } catch {}
      }

      if (onDismiss) {
        onDismiss();
      }
    },
    [slot, persistSessionDismiss, onDismiss]
  );

  // Sync state on slot change
  useEffect(() => {
    if (slot && persistSessionDismiss) {
      try {
        if (StorageService.isLoggedIn()) {
          setIsDismissed(false);
          return;
        }
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

  // Un-dismiss immediately if ads configuration changes in admin
  useEffect(() => {
    const handleConfigChange = () => {
      if (StorageService.isLoggedIn()) {
        setIsDismissed(false);
      }
    };
    window.addEventListener('prombo_ads_config_changed', handleConfigChange);
    return () => window.removeEventListener('prombo_ads_config_changed', handleConfigChange);
  }, []);

  // Handle Countdown Ticker
  useEffect(() => {
    if (!slot || isDismissed || autoCloseSecs <= 0) return;

    setRemainingAutoClose(autoCloseSecs);
    const interval = setInterval(() => {
      setRemainingAutoClose((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [slot?.id, isDismissed, autoCloseSecs]);

  // Handle Auto-close Timeout
  useEffect(() => {
    if (!slot || isDismissed || autoCloseSecs <= 0) return;

    const timeout = setTimeout(() => {
      handleDismiss();
    }, autoCloseSecs * 1000);

    return () => clearTimeout(timeout);
  }, [slot?.id, isDismissed, autoCloseSecs, handleDismiss]);

  // Parse snippet content into structured horizontal IAB Leaderboard data
  const parsed = useMemo(() => {
    return parseLeaderboardSnippet(slot?.codeSnippet, slot?.id);
  }, [slot?.codeSnippet, slot?.id]);

  // Video Ref & Autoplay Play Enforcement
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (parsed.mediaType === 'video' && parsed.videoUrl && videoRef.current) {
      const videoEl = videoRef.current;
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.setAttribute('loop', '');

      let onFirstInteraction: (() => void) | null = null;

      const playVideo = () => {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((_err) => {
            // Autoplay fallback: retry upon first user interaction if blocked
            onFirstInteraction = () => {
              videoEl.play().catch(() => {});
              if (onFirstInteraction) {
                window.removeEventListener('click', onFirstInteraction);
                window.removeEventListener('touchstart', onFirstInteraction);
                onFirstInteraction = null;
              }
            };
            window.addEventListener('click', onFirstInteraction, { once: true });
            window.addEventListener('touchstart', onFirstInteraction, { once: true });
          });
        }
      };

      const handleReady = () => playVideo();

      if (videoEl.readyState >= 2) {
        playVideo();
      } else {
        videoEl.addEventListener('loadeddata', handleReady, { once: true });
        videoEl.addEventListener('canplay', handleReady, { once: true });
      }

      return () => {
        if (onFirstInteraction) {
          window.removeEventListener('click', onFirstInteraction);
          window.removeEventListener('touchstart', onFirstInteraction);
        }
        videoEl.removeEventListener('loadeddata', handleReady);
        videoEl.removeEventListener('canplay', handleReady);
      };
    }
  }, [parsed.mediaType, parsed.videoUrl]);

  // Robust boolean condition & guard checking
  const isMaster = Boolean(masterEnabled === true || String(masterEnabled) === 'true');
  const isSlotEnabled = slot ? Boolean(slot.isEnabled === undefined || slot.isEnabled === true || String(slot.isEnabled) === 'true') : false;
  const hasContent = Boolean(slot?.codeSnippet?.trim() || slot?.id === 'headerBanner' || slot?.id === 'footerBanner');
  const adminBypass = StorageService.isLoggedIn();
  const shouldRender = isMaster && isSlotEnabled && hasContent && (!isDismissed || adminBypass);

  if (!shouldRender || !slot) {
    return null;
  }

  // Device Targeting Classes
  const deviceTargetingClass =
    slot.deviceTargeting === 'desktop'
      ? 'hidden md:flex'
      : slot.deviceTargeting === 'mobile'
      ? 'flex md:hidden'
      : 'flex';

  const handleBannerClick = () => {
    if (slot?.id) {
      StorageService.recordGlobalAdClick(slot.id);
    }
    if (parsed.ctaUrl) {
      window.open(parsed.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, height: 0 }}
        transition={{ duration: 0.2 }}
        className={`w-full max-w-[728px] lg:max-w-[970px] mx-auto ${deviceTargetingClass} ${className}`}
        data-ad-container={slot.id}
      >
        {parsed.isScriptOrIframe ? (
          /* Render raw script or responsive network iframe within IAB Leaderboard constraint */
          <div className="relative group w-full h-[86px] sm:h-[90px] max-h-[90px] sm:max-h-[100px] bg-slate-900/95 dark:bg-[#131b28]/95 border border-slate-200/80 dark:border-[#243347] rounded-xl shadow-xs overflow-hidden flex items-center justify-between p-1.5 sm:p-2">
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <AdSlotRenderer
                slot={slot}
                masterEnabled={masterEnabled}
                slotType={slotType}
                className="w-full h-full flex items-center justify-center overflow-hidden"
              />
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('ads.close')}
              className="absolute top-1.5 end-1.5 p-1 rounded-md bg-black/40 hover:bg-red-600 text-white/80 hover:text-white transition-colors cursor-pointer z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Production-grade IAB Leaderboard: Horizontal Row Layout (max-height: 90px to 100px) */
          <div
            onClick={handleBannerClick}
            className="relative group w-full h-[84px] sm:h-[90px] max-h-[90px] sm:max-h-[100px] bg-slate-900 dark:bg-[#131b28] border border-slate-800 dark:border-[#243347] rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-row items-center justify-between px-2 sm:px-3 py-1.5 gap-2 overflow-hidden select-none"
            style={{ maxHeight: '100px' }}
          >
            {/* 1. Start: Media (Responsive Video w-12 h-12 sm:w-14 sm:h-14 or Image w-9 h-9 sm:w-12 sm:h-12) */}
            <div className="flex items-center shrink-0 h-full">
              <div className={`relative ${parsed.mediaType === 'video' ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-9 h-9 sm:w-12 sm:h-12'} shrink-0 rounded-md overflow-hidden border border-slate-700/80 bg-slate-800 shadow-2xs`}>
                {parsed.mediaType === 'video' && parsed.videoUrl ? (
                  <video
                    ref={videoRef}
                    src={parsed.videoUrl}
                    poster={parsed.imageUrl || undefined}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={handleVideoClick}
                    className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 object-cover rounded-md cursor-pointer"
                    style={{ objectFit: 'cover', borderRadius: '6px', width: '100%', height: '100%' }}
                  />
                ) : (
                  <img
                    src={parsed.imageUrl}
                    alt={parsed.headline || 'Prombo Sponsor'}
                    className="w-9 h-9 sm:w-12 sm:h-12 shrink-0 object-cover rounded-md"
                    style={{ objectFit: 'cover', borderRadius: '6px' }}
                    loading="lazy"
                  />
                )}
              </div>
            </div>

            {/* 2. Middle Section: Set container to flex-1 min-w-0 px-2 overflow-hidden text-right */}
            <div
              className="flex-1 min-w-0 px-2 overflow-hidden text-right flex flex-col justify-center my-auto"
              style={{ flex: '1 1 0%', minWidth: 0, paddingLeft: '8px', paddingRight: '8px', overflow: 'hidden', textAlign: 'right' }}
            >
              {/* Headline: text-xs font-bold text-white truncate block w-full */}
              <span
                className="text-xs font-bold text-white truncate block w-full leading-tight"
                style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}
              >
                {parsed.headline}
              </span>

              {/* Description: text-[10px] text-slate-300 line-clamp-1 block w-full */}
              {parsed.description && (
                <span
                  className="text-[10px] text-slate-300 line-clamp-1 block w-full leading-tight mt-0.5"
                  style={{ fontSize: '10px', color: '#cbd5e1', display: 'block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {parsed.description}
                </span>
              )}
            </div>

            {/* 3. Opposite Side: Micro Compact CTA Button (shrink-0 text-[10px] font-bold px-2 py-1 bg-orange-600 rounded whitespace-nowrap h-auto w-auto min-w-0 max-w-[110px]) + Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={parsed.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (slot?.id) {
                    StorageService.recordGlobalAdClick(slot.id);
                  }
                }}
                className="shrink-0 text-[10px] font-bold px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded whitespace-nowrap h-auto w-auto min-w-0 max-w-[110px] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                style={{
                  flexShrink: 0,
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  backgroundColor: '#ea580c',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  height: 'auto',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '110px',
                  display: 'inline-flex',
                }}
              >
                <span className="truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {parsed.ctaText}
                </span>
                <span className="text-[9px] shrink-0" style={{ fontSize: '9px', flexShrink: 0 }}>&rarr;</span>
              </a>

              {/* Close ("X") Dismiss Button */}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label={t('ads.close') || 'Close'}
                title={t('ads.dismissSession') || 'Close'}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AdBanner;
