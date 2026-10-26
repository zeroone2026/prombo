import React, { useState } from 'react';
import { Play, Maximize2, Video as VideoIcon } from 'lucide-react';
import { ImageLightboxModal, LightboxMediaItem } from '../ImageLightboxModal';

interface MediaGridProps {
  images?: string[];
  videos?: string[];
  videoUrl?: string;
  onImageClick?: (url: string) => void;
  onMediaClick?: (index: number) => void;
  className?: string;
  title?: string;
  author?: string;
}

/**
 * Facebook-Style Media Grid (Max 4 preview slots)
 * - If total media items > 4, displays the first 3 items normally, and covers
 *   the 4th slot with a semi-transparent overlay showing remaining count (e.g., "+3").
 * - Clicking any item or overlay opens the unified Lightbox & Pop-up Video Player
 *   at that exact media index (no forced native fullscreen).
 */
export const MediaGrid: React.FC<MediaGridProps> = ({
  images = [],
  videos = [],
  videoUrl,
  onImageClick,
  onMediaClick,
  className = '',
  title,
  author,
}) => {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  // Unify images and videos into a single ordered gallery
  const allMedia: LightboxMediaItem[] = React.useMemo(() => {
    const items: LightboxMediaItem[] = [];

    // Add images
    if (images && images.length > 0) {
      images.forEach((url) => {
        if (url) items.push({ type: 'image', url, title, author });
      });
    }

    // Add uploaded videos
    if (videos && videos.length > 0) {
      videos.forEach((url) => {
        if (url) items.push({ type: 'video', url, title, author });
      });
    }

    // Add external video URL
    if (videoUrl && !items.some((item) => item.url === videoUrl)) {
      items.push({ type: 'video', url: videoUrl, title, author });
    }

    return items;
  }, [images, videos, videoUrl, title, author]);

  if (!allMedia || allMedia.length === 0) return null;

  const totalCount = allMedia.length;
  const visibleItems = allMedia.slice(0, 4);
  const remainingCount = totalCount > 4 ? totalCount - 3 : 0;

  const handleItemClick = (index: number) => {
    setActiveLightboxIndex(index);
    if (onMediaClick) {
      onMediaClick(index);
    }
  };

  // Detect YouTube thumbnail helper
  const getYouTubeThumbnail = (url: string): string | null => {
    try {
      if (url.includes('youtube.com/watch')) {
        const v = new URL(url).searchParams.get('v');
        if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`;
      }
      if (url.includes('youtu.be/')) {
        const v = url.split('youtu.be/')[1]?.split('?')[0];
        if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`;
      }
    } catch {}
    return null;
  };

  const renderMediaThumbnail = (item: LightboxMediaItem, index: number, isOverlaySlot: boolean = false) => {
    const isVideo = item.type === 'video';
    const ytThumb = isVideo ? getYouTubeThumbnail(item.url) : null;

    return (
      <div
        key={`${item.url}-${index}`}
        onClick={() => handleItemClick(index)}
        className="relative w-full h-full bg-slate-950 overflow-hidden cursor-pointer group"
      >
        {isVideo ? (
          ytThumb ? (
            <img
              src={ytThumb}
              alt={item.title || 'Video preview'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <video
              src={item.url}
              preload="none"
              muted
              playsInline
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
            />
          )
        ) : (
          <img
            src={item.url}
            alt={item.title || `Media ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}

        {/* Video Overlay Play Indicator */}
        {isVideo && !isOverlaySlot && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/15 transition-colors">
            <div className="p-3 sm:p-4 rounded-full bg-black/65 backdrop-blur-md text-white border border-white/20 shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 fill-orange-400 ps-0.5" />
            </div>
            <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur-xs text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <VideoIcon className="w-2.5 h-2.5" />
              <span>فيديو</span>
            </span>
          </div>
        )}

        {/* Image Subtle Hover View Badge */}
        {!isVideo && !isOverlaySlot && (
          <div className="absolute bottom-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md text-white border border-white/10">
              <Maximize2 className="w-3 h-3 text-orange-400" />
            </span>
          </div>
        )}

        {/* 4th Slot Remaining Counter Overlay (e.g., +3, +5) */}
        {isOverlaySlot && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center text-white transition-colors group-hover:bg-black/55">
            <span className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-wider drop-shadow-md">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`pt-2 max-w-full overflow-hidden ${className}`}>
        {/* Single Item */}
        {totalCount === 1 && (
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2A384C] shadow-xs">
            {renderMediaThumbnail(visibleItems[0], 0)}
          </div>
        )}

        {/* 2 Items */}
        {totalCount === 2 && (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2A384C] shadow-xs">
            {renderMediaThumbnail(visibleItems[0], 0)}
            {renderMediaThumbnail(visibleItems[1], 1)}
          </div>
        )}

        {/* 3 Items: 1 Large Left, 2 Stacked Right */}
        {totalCount === 3 && (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2A384C] shadow-xs">
            <div className="h-full">
              {renderMediaThumbnail(visibleItems[0], 0)}
            </div>
            <div className="grid grid-rows-2 gap-1.5 sm:gap-2 h-full">
              {renderMediaThumbnail(visibleItems[1], 1)}
              {renderMediaThumbnail(visibleItems[2], 2)}
            </div>
          </div>
        )}

        {/* 4 or More Items: Facebook 2x2 Grid */}
        {totalCount >= 4 && (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2A384C] shadow-xs">
            {renderMediaThumbnail(visibleItems[0], 0)}
            {renderMediaThumbnail(visibleItems[1], 1)}
            {renderMediaThumbnail(visibleItems[2], 2)}
            {renderMediaThumbnail(visibleItems[3], 3, totalCount > 4)}
          </div>
        )}
      </div>

      {/* Unified Lightbox Modal for Full Browsing */}
      {activeLightboxIndex !== null && (
        <ImageLightboxModal
          isOpen={activeLightboxIndex !== null}
          media={allMedia}
          initialIndex={activeLightboxIndex}
          title={title}
          author={author}
          onClose={() => setActiveLightboxIndex(null)}
        />
      )}
    </>
  );
};
