import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { AdSlotConfig } from '../../types';
import { AdSlotRenderer } from './AdSlotRenderer';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storage';

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: AdSlotConfig | undefined;
  masterEnabled: boolean;
  title?: string;
}

interface ParsedModalAd {
  isScriptOrIframe: boolean;
  mediaType: 'image' | 'video';
  videoUrl?: string;
  videoPoster?: string;
  imageUrl?: string;
  badgeText?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
}

function parseModalAdSnippet(snippet: string | undefined): ParsedModalAd {
  if (!snippet || !snippet.trim()) {
    return { mediaType: 'image', isScriptOrIframe: false };
  }

  // Check for native video presence first to prevent script-gate hijacking
  const hasNativeVideo = /<video\b|<source\b|\.(?:mp4|webm|ogg|mov)(?:["'\s?]|$)/i.test(snippet);

  // Detect raw ad network scripts or iframe embed tags
  // ONLY classify as script/iframe if NOT containing native video tags/sources
  if (!hasNativeVideo && /<script|<iframe|<ins\s+class=/i.test(snippet)) {
    return { mediaType: 'image', isScriptOrIframe: true };
  }

  let mediaType: 'image' | 'video' = 'image';
  let videoUrl: string | undefined;
  let videoPoster: string | undefined;
  let imageUrl: string | undefined;
  let ctaUrl: string | undefined;
  let ctaText: string | undefined;
  let badgeText: string | undefined;
  let headline: string | undefined;
  let description: string | undefined;

  // 1. Detect HTML5 <video> tag or video URL (.mp4 / .webm / .ogg / .mov or video src)
  // Handles self-closing <video .../>, unclosed <video ...>, standard <video>...</video>, and <source> children
  const videoTagMatch = snippet.match(/<video\b([^>]*)>([\s\S]*?)<\/video>|<video\b([^>]*)\/?>/i);
  if (videoTagMatch) {
    const videoAttributes = videoTagMatch[1] || videoTagMatch[3] || '';
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

    // Check optional poster ONLY strictly if defined in the <video poster="..."> tag
    const posterMatch = videoAttributes.match(/\bposter=["']([^"']+)["']/i);
    if (posterMatch && posterMatch[1]?.trim()) {
      videoPoster = posterMatch[1].trim();
    }
  }

  // 2. If no video from <video> tag, check any standalone <source> tag
  if (!videoUrl) {
    const standaloneSourceMatch = snippet.match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i);
    if (standaloneSourceMatch && standaloneSourceMatch[1]) {
      videoUrl = standaloneSourceMatch[1];
    }
  }

  // 3. If still no videoUrl, check for direct video file URLs (.mp4 / .webm / .ogg / .mov) in src or href
  if (!videoUrl) {
    const directExtMatch = snippet.match(/(?:src|href)=["']([^"']+\.(?:mp4|webm|ogg|mov)(?:\?[^"']*)?)["']/i);
    if (directExtMatch && directExtMatch[1]) {
      videoUrl = directExtMatch[1];
    }
  }

  // 4. Also check for raw video links if snippet itself is a direct video URL
  if (!videoUrl && /^https?:\/\/[^\s<>]+\.(?:mp4|webm|ogg|mov)(?:\?[^\s<>]*)?$/i.test(snippet.trim())) {
    videoUrl = snippet.trim();
  }

  if (videoUrl) {
    mediaType = 'video';
  }

  // 5. Extract image URL ONLY if NOT a video
  if (!videoUrl) {
    const imgMatch = snippet.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    } else {
      const bgMatch = snippet.match(/background(?:-image)?:\s*url\(['"]?([^'"\)]+)['"]?\)/i);
      if (bgMatch && bgMatch[1]) {
        imageUrl = bgMatch[1];
      }
    }
  }

  // 6. Visual fallback: ONLY assign static placeholder image if NOT a video!
  // If videoUrl is active, leave imageUrl as undefined to never mask the video
  if (!imageUrl && !videoUrl) {
    imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
  }

  // 7. Extract CTA target URL and label
  const linkMatch = snippet.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (linkMatch) {
    ctaUrl = linkMatch[1];
    const rawCta = linkMatch[2]?.replace(/<[^>]+>/g, '').replace(/&rarr;|&nbsp;|→/g, '').trim();
    if (rawCta) ctaText = rawCta;
  } else {
    const rawHref = snippet.match(/href=["']([^"']+)["']/i);
    if (rawHref) ctaUrl = rawHref[1];
  }

  // 8. Extract badge/subhead text
  const badgeMatch = snippet.match(/font-size:\s*(?:10|11)px[^>]*>(.*?)<\/div>|<span[^>]*>(AD|إعلان)<\/span>/i);
  if (badgeMatch) {
    const rawBadge = (badgeMatch[1] || badgeMatch[2])?.replace(/<[^>]+>/g, '').trim();
    if (rawBadge && rawBadge.length <= 35) {
      badgeText = rawBadge;
    }
  }

  // 9. Extract headline
  const headlineMatch = snippet.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>|(?:font-size:\s*(?:18|19|20|22|24)px|font-weight:\s*(?:700|800|bold))[^>]*>(.*?)<\/(?:div|span|h[1-6])>/i);
  if (headlineMatch) {
    headline = (headlineMatch[1] || headlineMatch[2])?.replace(/<[^>]+>/g, '').trim();
  }

  // 10. Extract description
  const descMatch = snippet.match(/<p[^>]*>(.*?)<\/p>|(?:font-size:\s*(?:12|13|14)px|color:\s*#(?:cbd5e1|94a3b8|e2e8f0|888))[^>]*>(.*?)<\/(?:div|span|p)>/i);
  if (descMatch) {
    const rawDesc = (descMatch[1] || descMatch[2])?.replace(/<[^>]+>/g, '').trim();
    if (rawDesc && rawDesc !== headline && rawDesc !== badgeText) {
      description = rawDesc;
    }
  }

  // Fallbacks
  if (!headline) {
    headline = '🚀 Explore Premium AI Tools & Cloud Compute';
  }
  if (!description) {
    description = 'Accelerate your Vibe Coding workflow with 99.9% GPU uptime.';
  }
  if (!badgeText) {
    badgeText = 'Prombo Sponsored Partner';
  }
  if (!ctaText) {
    ctaText = 'Claim Special Deal';
  }
  if (!ctaUrl) {
    ctaUrl = 'https://example.com';
  }

  return {
    isScriptOrIframe: false,
    mediaType,
    videoUrl,
    videoPoster,
    imageUrl,
    badgeText,
    headline,
    description,
    ctaText,
    ctaUrl,
  };
}

export const AdModal: React.FC<AdModalProps> = ({
  isOpen,
  onClose,
  slot,
  masterEnabled,
  title,
}) => {
  const { language, t } = useApp();
  
  const autoCloseSecs = slot?.autoCloseSeconds || 0;
  const [countdown, setCountdown] = useState<number>(autoCloseSecs);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const isSuppressedOnAdmin = useMemo(() => {
    if (slot?.id !== 'popupEntry') return false;
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    const hash = window.location.hash;
    return path.includes('/admin') || hash.includes('admin');
  }, [slot?.id]);

  const canShow = Boolean(
    isOpen &&
    !isSuppressedOnAdmin &&
    masterEnabled &&
    slot &&
    slot.isEnabled &&
    slot.codeSnippet?.trim()
  );

  const handleClose = useCallback(() => {
    // Record cooldown timestamp if configured
    if (slot?.cooldownMinutes && slot.cooldownMinutes > 0) {
      try {
        localStorage.setItem(`prombo_ad_cooldown_${slot.id}`, String(Date.now()));
      } catch {}
    }
    onClose();
  }, [slot, onClose]);

  // Sync countdown when modal opens or slot changes
  useEffect(() => {
    if (canShow && autoCloseSecs > 0) {
      setCountdown(autoCloseSecs);
    }
  }, [canShow, autoCloseSecs]);

  // Countdown timer display ticker (pure state update, no side-effects)
  useEffect(() => {
    if (!canShow || autoCloseSecs <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [canShow, autoCloseSecs]);

  // Decoupled auto-close timeout running in its own macrotask
  useEffect(() => {
    if (!canShow || autoCloseSecs <= 0) return;

    const timeout = setTimeout(() => {
      handleClose();
    }, autoCloseSecs * 1000);

    return () => clearTimeout(timeout);
  }, [canShow, autoCloseSecs, handleClose]);

  const parsed = useMemo(() => {
    return parseModalAdSnippet(slot?.codeSnippet);
  }, [slot?.codeSnippet]);

  // Video Ref & Autoplay Play Enforcement
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (canShow && parsed.mediaType === 'video' && parsed.videoUrl && videoRef.current) {
      const videoEl = videoRef.current;
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.playsInline = true;
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.setAttribute('loop', '');

      let onFirstInteraction: (() => void) | null = null;

      const playVideo = () => {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((_err) => {
              // Autoplay fallback: retry upon first user interaction if blocked
              onFirstInteraction = () => {
                videoEl.play().then(() => setIsPlaying(true)).catch(() => {});
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
  }, [canShow, parsed.mediaType, parsed.videoUrl]);

  // Toggle video play / pause with strict stopPropagation
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  // Toggle video sound with strict stopPropagation
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  // Full-surface clickability to navigate to destination ctaUrl
  const handleContainerClick = useCallback((e?: React.MouseEvent) => {
    if (e && e.defaultPrevented) return;
    if (slot?.id) {
      StorageService.recordGlobalAdClick(slot.id);
    }
    if (parsed.ctaUrl) {
      window.open(parsed.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  }, [slot?.id, parsed.ctaUrl]);

  return (
    <AnimatePresence>
      {canShow && slot && (
        <div
          onClick={handleContainerClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto cursor-pointer"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={handleContainerClick}
            className="relative w-[90%] sm:w-full max-w-[420px] max-h-[85vh] mx-auto bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-y-auto flex flex-col my-auto text-white cursor-pointer"
            style={{ width: '90%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' }}
          >
            {/* Top Bar with prominent X button and Skip Badge */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-600/20 text-orange-400 border border-orange-500/30">
                  {title || parsed.badgeText || t('ads.sponsored')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Auto-close Skip countdown badge with strict stopPropagation closing modal */}
                {autoCloseSecs > 0 && countdown > 0 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-0.5 rounded-md border border-orange-500/20 font-mono select-none cursor-pointer transition-colors"
                    title={t('ads.closeAd') || t('ads.close')}
                  >
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{t('ads.skipIn', { seconds: countdown })}</span>
                  </span>
                )}

                {/* High-visibility Close ("X") Button with strict event isolation */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-200 hover:text-white bg-slate-800 hover:bg-red-600 transition-colors cursor-pointer text-xs font-semibold shadow-xs"
                  aria-label={t('ads.closeAd') || t('ads.close')}
                  title={t('ads.closeAd') || t('ads.close')}
                >
                  <span className="text-[10px]">{t('ads.close')}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Ad Content Container */}
            {parsed.isScriptOrIframe ? (
              <div
                className="p-0 w-full flex-1 overflow-y-auto min-h-0 flex flex-col justify-center items-stretch bg-slate-900/90"
                style={{ padding: 0, width: '100%', overflowY: 'auto' }}
              >
                <AdSlotRenderer
                  slot={slot}
                  masterEnabled={masterEnabled}
                  className="w-full h-auto flex flex-col justify-center items-stretch [&>*]:max-w-full"
                  slotType="banner"
                />
              </div>
            ) : (
              /* Full-Surface Clickable Popup Container */
              <div
                onClick={handleContainerClick}
                className="relative flex-1 overflow-hidden flex flex-col bg-slate-900 cursor-pointer select-none group"
              >
                {/* Media Hero (Video or Image) Wrapper */}
                <div
                  className="relative w-full h-72 sm:h-80 shrink-0 overflow-hidden bg-slate-950"
                  style={{ position: 'relative' }}
                >
                  {parsed.mediaType === 'video' && parsed.videoUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        src={parsed.videoUrl}
                        poster={parsed.videoPoster || undefined}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover cursor-pointer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />

                      {/* Video Controls overlay with strict stopPropagation */}
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className="p-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-xs border border-white/10 transition-colors cursor-pointer"
                          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                        >
                          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleTogglePlay}
                          className="p-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-xs border border-white/10 transition-colors cursor-pointer"
                          aria-label={isPlaying ? 'Pause video' : 'Play video'}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <img
                      src={parsed.imageUrl}
                      alt={parsed.headline}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  )}

                  {/* Absolute dark gradient overlay directly behind all headline text, descriptions, and CTA buttons */}
                  <div
                    className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 sm:p-5 z-10 flex flex-col justify-end text-start pointer-events-auto"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '16px',
                      background: 'linear-gradient(to top, rgb(2, 6, 23) 0%, rgba(2, 6, 23, 0.85) 60%, transparent 100%)',
                    }}
                  >
                    {/* Headline with absolute visual priority & legibility */}
                    <span
                      className="text-base sm:text-lg font-bold text-white block mb-1 drop-shadow-md leading-tight"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#ffffff',
                        display: 'block',
                        marginBottom: '4px',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {parsed.headline}
                    </span>

                    {/* Description sitting cleanly on top of media frames */}
                    {parsed.description && (
                      <span
                        className="text-xs sm:text-sm text-slate-200 block mb-3 drop-shadow-sm leading-relaxed line-clamp-2"
                        style={{
                          fontSize: '12px',
                          color: '#e2e8f0',
                          display: 'block',
                          marginBottom: '12px',
                          textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                        }}
                      >
                        {parsed.description}
                      </span>
                    )}

                    {/* CTA Button positioned directly inside the dark gradient overlay */}
                    <div className="w-full">
                      <a
                        href={parsed.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContainerClick();
                        }}
                        className="w-full text-xs sm:text-sm font-bold py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-lg inline-flex items-center justify-center gap-1.5 shadow-md hover:shadow-orange-600/30 transition-all cursor-pointer text-center group/btn"
                        style={{
                          width: '100%',
                          fontSize: '13px',
                          fontWeight: 700,
                          paddingTop: '10px',
                          paddingBottom: '10px',
                          backgroundColor: '#ea580c',
                          borderRadius: '8px',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span>{parsed.ctaText}</span>
                        <span className="text-sm transition-transform group-hover/btn:translate-x-1">&rarr;</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Close Bar */}
            <div className="px-3.5 py-2.5 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[10px] text-slate-500 truncate max-w-[180px] sm:max-w-xs">
                {t('ads.supportFree')}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('ads.continueToPrombo')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export { AdModal as SponsoredAdModal };
