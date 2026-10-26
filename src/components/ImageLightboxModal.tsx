import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import {
  X,
  Download,
  User,
  Image as ImageIcon,
  Video,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Film,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface LightboxMediaItem {
  type: 'image' | 'video';
  url: string;
  title?: string;
  author?: string;
}

export interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl?: string | null;
  media?: (LightboxMediaItem | string)[];
  initialIndex?: number;
  title?: string;
  author?: string;
  categoryName?: string;
  onClose: () => void;
}

/**
 * Unified Media Lightbox & Custom Pop-up Video Player
 * - Displays both images and videos in a single fluid sequence.
 * - Fluid Left/Right swipe and drag gestures for touch and pointer devices.
 * - "Drag down to dismiss" (swipe downwards) on the media lightbox to close.
 * - Responsive centered pop-up video player (max-w-4xl) replacing native fullscreen.
 * - Center click/tap anywhere on video frame toggles play/pause.
 * - Multiple close triggers: top-corner X, backdrop click, drag down, and Escape key.
 * - Cleaned layout with maximized media display area (no redundant status labels).
 */
export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  media,
  initialIndex = 0,
  title = 'Media',
  author,
  categoryName,
  onClose,
}) => {
  const { language, isRTL } = useApp();

  // Normalize media items array
  const mediaItems: LightboxMediaItem[] = React.useMemo(() => {
    if (media && media.length > 0) {
      return media.map((item) => {
        if (typeof item === 'string') {
          const isVideo =
            item.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ||
            item.includes('youtube.com') ||
            item.includes('youtu.be') ||
            item.includes('vimeo.com');
          return {
            type: isVideo ? 'video' : 'image',
            url: item,
            title,
            author,
          };
        }
        return item;
      });
    }
    if (imageUrl) {
      return [
        {
          type: 'image',
          url: imageUrl,
          title,
          author,
        },
      ];
    }
    return [];
  }, [media, imageUrl, title, author]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIconRipple, setShowPlayIconRipple] = useState(false);
  const [dragYOffset, setDragYOffset] = useState(0);
  const [dragXOffset, setDragXOffset] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-Focus Modal on Mount and release focus from previously clicked thumbnail
  useEffect(() => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      containerRef.current?.focus();
      const timer = setTimeout(() => {
        containerRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Sync initial index when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.min(Math.max(0, initialIndex), Math.max(0, mediaItems.length - 1));
      setCurrentIndex(validIndex);
      setIsPlaying(false);
      setShowPlayIconRipple(false);
      setDragYOffset(0);
      setDragXOffset(0);
    }
  }, [isOpen, initialIndex, mediaItems.length]);

  // Current active media item
  const currentItem: LightboxMediaItem | undefined = mediaItems[currentIndex];

  // Pause video on index change
  useEffect(() => {
    setIsPlaying(false);
    setShowPlayIconRipple(false);
    setDragXOffset(0);
  }, [currentIndex]);

  // Close on Escape key & Arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (isRTL) goToNext();
        else goToPrev();
      } else if (e.key === 'ArrowRight') {
        if (isRTL) goToPrev();
        else goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, mediaItems.length, isRTL]);

  if (!isOpen || !currentItem) return null;

  const totalItems = mediaItems.length;

  const goToPrev = () => {
    if (totalItems <= 1) return;
    setDragXOffset(0);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
  };

  const goToNext = () => {
    if (totalItems <= 1) return;
    setDragXOffset(0);
    setCurrentIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
  };

  const triggerPlayRipple = () => {
    setShowPlayIconRipple(true);
    setTimeout(() => {
      setShowPlayIconRipple(false);
    }, 650);
  };

  // Video URL detection for embeds
  const isEmbedVideo =
    currentItem.type === 'video' &&
    (currentItem.url.includes('youtube.com') ||
      currentItem.url.includes('youtu.be') ||
      currentItem.url.includes('vimeo.com'));

  const getEmbedUrl = (url: string): string => {
    try {
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const v = urlObj.searchParams.get('v');
        return v ? `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&controls=1&enablejsapi=1&rel=0` : url;
      }
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=1&enablejsapi=1&rel=0` : url;
      }
      if (url.includes('youtube.com/embed/')) {
        const base = url.split('?')[0];
        return `${base}?autoplay=1&controls=1&enablejsapi=1&rel=0`;
      }
      if (url.includes('vimeo.com/')) {
        const id = url.split('vimeo.com/')[1]?.split('?')[0];
        return id ? `https://player.vimeo.com/video/${id}?autoplay=1&controls=1` : url;
      }
    } catch {}
    return url;
  };

  const handleDownload = () => {
    if (!currentItem.url || isEmbedVideo) return;
    const link = document.createElement('a');
    link.href = currentItem.url;
    link.download = `prombo-${(currentItem.title || title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${
      currentItem.type === 'video' ? 'mp4' : 'webp'
    }`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Vertical Drag Handler for Modal Dismissal
  const handleModalVerticalDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 0) {
      setDragYOffset(info.offset.y);
    }
  };

  const handleModalVerticalDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Drag down to dismiss if pulled past 85px or with flick velocity > 320px/s
    if (info.offset.y > 85 || info.velocity.y > 320) {
      onClose();
    } else {
      setDragYOffset(0);
    }
  };

  // Horizontal Swipe Handler for Media Navigation
  const handleMediaHorizontalDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragXOffset(info.offset.x);
  };

  const handleMediaHorizontalDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragXOffset(0);
    if (totalItems <= 1) return;

    const horizontalDistance = info.offset.x;
    const horizontalSpeed = info.velocity.x;

    // Immediately trigger slide transition on > 40px drag or > 200px/s flick
    if (horizontalDistance < -40 || horizontalSpeed < -200) {
      // Dragged left
      if (isRTL) goToPrev();
      else goToNext();
    } else if (horizontalDistance > 40 || horizontalSpeed > 200) {
      // Dragged right
      if (isRTL) goToNext();
      else goToPrev();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentItem && (
        <div
          ref={containerRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md select-none outline-none focus:outline-none"
        >
        {/* Backdrop click to close */}
        <div
          className="absolute inset-0 cursor-zoom-out"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          aria-label="Close backdrop"
        />

        {/* Modal Container: Max-w-4xl, centered, rounded-2xl, strictly vertical drag down to dismiss */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.65 }}
          onDrag={handleModalVerticalDrag}
          onDragEnd={handleModalVerticalDragEnd}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{
            opacity: Math.max(0.3, 1 - dragYOffset / 400),
            scale: Math.max(0.85, 1 - dragYOffset / 1000),
            y: dragYOffset,
          }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-4xl bg-[#121824] border border-[#2A384C] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] touch-pan-y"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar: Clean, maximized workspace */}
          <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-[#2A384C] bg-[#0E1420] shrink-0">
            {/* Title & Author Meta */}
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
                {currentItem.type === 'video' ? (
                  <Video className="w-4 h-4 text-purple-400" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-md">
                    {currentItem.title || title}
                  </h3>
                  {totalItems > 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                      {currentIndex + 1} / {totalItems}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {(currentItem.author || author) && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-orange-400" />
                      <span className="truncate max-w-[120px] sm:max-w-none">
                        {currentItem.author || author}
                      </span>
                    </span>
                  )}
                  {categoryName && (
                    <span className="hidden sm:inline-block text-slate-500">• {categoryName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Download & Close (X) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isEmbedVideo && (
                <button
                  type="button"
                  onClick={handleDownload}
                  title={language === 'ar' ? 'تحميل' : 'Download'}
                  className="p-2 rounded-xl bg-[#1a2332] hover:bg-orange-600 hover:text-white text-slate-300 transition-colors cursor-pointer border border-[#2A384C]"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                title={language === 'ar' ? 'إغلاق (اسحب للأسفل أو اضغط هنا)' : 'Close (swipe down or click)'}
                className="p-2 rounded-xl bg-[#1a2332] hover:bg-rose-600 hover:text-white text-slate-300 transition-colors cursor-pointer border border-[#2A384C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Media Display Area: Maximized, Centered, Fluid */}
          <div className="relative flex-1 flex items-center justify-center bg-[#070b12] p-2 sm:p-4 overflow-hidden min-h-[320px] sm:min-h-[440px] max-h-[78vh]">
            {/* Carousel Previous Button */}
            {totalItems > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  isRTL ? goToNext() : goToPrev();
                }}
                aria-label="Previous media"
                className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-orange-600 text-white backdrop-blur-md border border-white/15 transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Carousel Next Button */}
            {totalItems > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  isRTL ? goToPrev() : goToNext();
                }}
                aria-label="Next media"
                className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-orange-600 text-white backdrop-blur-md border border-white/15 transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Media Gesture Container: Fluid horizontal swipe without requiring downward drag (disabled during video playback so native controls work unhindered) */}
            <motion.div
              key={`media-slide-${currentIndex}`}
              drag={totalItems > 1 && currentItem.type !== 'video' ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDrag={handleMediaHorizontalDrag}
              onDragEnd={handleMediaHorizontalDragEnd}
              onPointerDown={() => {
                containerRef.current?.focus();
              }}
              onTouchStart={() => {
                containerRef.current?.focus();
              }}
              animate={{ x: dragXOffset }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`relative w-full h-full flex items-center justify-center ${
                currentItem.type === 'video' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
              } touch-pan-y select-none`}
              style={{ touchAction: 'pan-y' }}
            >
              {currentItem.type === 'video' ? (
                isEmbedVideo ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-full aspect-video max-h-[74vh] rounded-xl overflow-hidden bg-black shadow-2xl pointer-events-auto"
                  >
                    <iframe
                      src={getEmbedUrl(currentItem.url)}
                      title="Video preview"
                      className="w-full h-full border-0 pointer-events-auto"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="relative w-full h-full max-h-[74vh] flex items-center justify-center pointer-events-auto"
                  >
                    <video
                      ref={videoRef}
                      src={currentItem.url}
                      playsInline
                      preload="auto"
                      controls
                      autoPlay
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="relative z-10 max-h-[74vh] max-w-full rounded-xl object-contain shadow-2xl pointer-events-auto"
                    />
                  </div>
                )
              ) : (
                <motion.img
                  key={currentItem.url}
                  src={currentItem.url}
                  alt={currentItem.title || title}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl pointer-events-none select-none"
                  referrerPolicy="no-referrer"
                />
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

export const MediaLightboxModal = ImageLightboxModal;
