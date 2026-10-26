import React, { useRef } from 'react';

export interface VideoPlayerProps {
  url: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
  onEnded?: () => void;
}

/**
 * Parses and identifies video URLs (YouTube, Vimeo, direct HTML5 video file)
 */
export function parseVideoUrl(url: string) {
  if (!url) return { type: 'unknown', embedUrl: '', rawUrl: '', thumbnailUrl: null };

  const clean = url.trim();

  // YouTube detection
  if (clean.includes('youtube.com/watch')) {
    try {
      const v = new URL(clean).searchParams.get('v');
      if (v) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube-nocookie.com/embed/${v}?controls=1&enablejsapi=1&rel=0`,
          thumbnailUrl: `https://img.youtube.com/vi/${v}/hqdefault.jpg`,
          rawUrl: clean,
        };
      }
    } catch {}
  }
  if (clean.includes('youtu.be/')) {
    try {
      const id = clean.split('youtu.be/')[1]?.split('?')[0];
      if (id) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?controls=1&enablejsapi=1&rel=0`,
          thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          rawUrl: clean,
        };
      }
    } catch {}
  }
  if (clean.includes('youtube.com/embed/')) {
    const base = clean.split('?')[0];
    const id = base.split('/embed/')[1];
    return {
      type: 'youtube',
      embedUrl: `${base}?controls=1&enablejsapi=1&rel=0`,
      thumbnailUrl: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null,
      rawUrl: clean,
    };
  }

  // Vimeo detection
  if (clean.includes('vimeo.com/')) {
    try {
      const id = clean.split('vimeo.com/')[1]?.split('?')[0];
      if (id) {
        return {
          type: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${id}?controls=1`,
          thumbnailUrl: null,
          rawUrl: clean,
        };
      }
    } catch {}
  }

  // Direct HTML5 video file (mp4, webm, ogg, blob, Supabase storage, etc.)
  return {
    type: 'html5',
    embedUrl: clean,
    thumbnailUrl: null,
    rawUrl: clean,
  };
}

/**
 * Universal Native Video Player component
 * - Fully unblocked native controls for YouTube (controls=1), Vimeo (controls=1), and HTML5 video
 * - Zero transparent overlays or pointer-events-none blockers
 * - Robust event isolation calling e.stopPropagation() on pointer/click events to prevent parent card triggering
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title = 'Video player',
  poster,
  autoPlay = false,
  className = '',
  aspectRatio = 'video',
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const parsed = parseVideoUrl(url);

  // Stop propagation so interacting with native video controls never triggers parent card/modal navigation
  const handleEventIsolation = (e: React.SyntheticEvent | React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  const aspectClass = aspectRatio === 'video' ? 'aspect-video' : aspectRatio === 'square' ? 'aspect-square' : '';

  if (parsed.type === 'youtube' || parsed.type === 'vimeo') {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-xl bg-black ${aspectClass} ${className} pointer-events-auto`}
        onClick={handleEventIsolation}
        onMouseDown={handleEventIsolation}
        onPointerDown={handleEventIsolation}
        onTouchStart={handleEventIsolation}
      >
        <iframe
          src={parsed.embedUrl + (autoPlay ? '&autoplay=1' : '')}
          title={title}
          className="w-full h-full border-0 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // Direct HTML5 Video
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-black ${aspectClass} ${className} pointer-events-auto`}
      onClick={handleEventIsolation}
      onMouseDown={handleEventIsolation}
      onPointerDown={handleEventIsolation}
      onTouchStart={handleEventIsolation}
    >
      <video
        ref={videoRef}
        src={parsed.rawUrl}
        poster={poster}
        controls
        playsInline
        preload={autoPlay ? 'auto' : 'none'}
        autoPlay={autoPlay}
        onEnded={onEnded}
        onClick={handleEventIsolation}
        onPointerDown={handleEventIsolation}
        className="w-full h-full object-contain pointer-events-auto"
      />
    </div>
  );
};
