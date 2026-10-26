import React, { useEffect, useRef } from 'react';
import { AdSlotConfig } from '../../types';
import { sanitizeAdSnippet } from '../../utils/securityUtils';

interface AdErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  slotId?: string;
}

interface AdErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AdErrorBoundary extends (React.Component as { new(props: any): any }) {
  state: AdErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AdErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn(`[AdErrorBoundary] Isolated failure in ad slot "${(this as any).props?.slotId || 'unknown'}":`, error?.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (this as any).props?.fallback || null;
    }
    return (this as any).props?.children;
  }
}

interface AdSlotRendererProps {
  slot: AdSlotConfig | undefined;
  masterEnabled: boolean;
  className?: string;
  slotType?: 'banner' | 'skyscraper' | 'inline';
}

const AdSlotRendererInner: React.FC<AdSlotRendererProps> = ({
  slot,
  masterEnabled,
  className = '',
  slotType = 'banner',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAvailable = Boolean(masterEnabled && slot && slot.isEnabled && slot.codeSnippet?.trim());
  const snippet = slot?.codeSnippet || '';

  // Execute embedded scripts and manage HTML5 video playback
  useEffect(() => {
    if (!isAvailable || !snippet.trim()) return;

    const container = containerRef.current;
    if (!container) return;

    // Clear previous elements
    container.innerHTML = '';

    // Sanitize snippet to eliminate dangerous inline javascript event handlers
    const sanitizedSnippet = sanitizeAdSnippet(snippet);

    // Create a temporary container to parse the HTML and script tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitizedSnippet;

    // Separate script tags from normal HTML nodes
    const scripts = tempDiv.querySelectorAll('script');
    const scriptElements: HTMLScriptElement[] = [];

    // Clone non-script content into the container safely
    try {
      Array.from(tempDiv.childNodes).forEach((child) => {
        if (child.nodeName.toLowerCase() !== 'script') {
          const cloned = child.cloneNode(true) as HTMLElement;
          if (cloned.style) {
            cloned.style.maxWidth = '100%';
            cloned.style.boxSizing = 'border-box';
          }
          container.appendChild(cloned);
        }
      });
    } catch (err) {
      console.warn(`[AdSlotRenderer] Failed to render HTML nodes for ${slot?.id}:`, err);
    }

    // Enforce HTML5 video DOM properties, autoplay, and event listeners
    const injectedVideos = container.querySelectorAll('video');
    const videoCleanupFns: Array<() => void> = [];

    // SEC-03: Strictly sandbox all injected iframes to isolate them from application storage & cookies
    const injectedIframes = container.querySelectorAll('iframe');
    injectedIframes.forEach((iframe) => {
      iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms allow-presentation');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
    });

    // Enforce safe link rel attributes on all anchors
    const injectedAnchors = container.querySelectorAll('a');
    injectedAnchors.forEach((a) => {
      a.setAttribute('rel', 'noopener noreferrer');
      if (!a.getAttribute('target')) {
        a.setAttribute('target', '_blank');
      }
    });

    injectedVideos.forEach((videoEl) => {
      // Programmatically set properties directly on the DOM node
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.playsInline = true;
      videoEl.autoplay = true;
      videoEl.loop = true;

      // Also set HTML attributes for cross-browser compliance
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.setAttribute('loop', '');

      // Prevent assigning false or fallback images: retain poster ONLY if strictly defined on the tag
      const existingPoster = videoEl.getAttribute('poster');
      if (!existingPoster || !existingPoster.trim()) {
        videoEl.removeAttribute('poster');
      }

      let onUserInteraction: (() => void) | null = null;

      // Safe autoplay handler with user-interaction fallback
      const playVideo = () => {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((_err) => {
            onUserInteraction = () => {
              videoEl.play().catch(() => {});
              if (onUserInteraction) {
                window.removeEventListener('click', onUserInteraction);
                window.removeEventListener('touchstart', onUserInteraction);
                onUserInteraction = null;
              }
            };
            window.addEventListener('click', onUserInteraction, { once: true });
            window.addEventListener('touchstart', onUserInteraction, { once: true });
          });
        }
      };

      const handleReady = () => playVideo();

      // Listen for canplay or loadeddata (or check readyState >= 2) before playing
      if (videoEl.readyState >= 2) {
        playVideo();
      } else {
        videoEl.addEventListener('loadeddata', handleReady, { once: true });
        videoEl.addEventListener('canplay', handleReady, { once: true });
      }

      videoCleanupFns.push(() => {
        if (onUserInteraction) {
          window.removeEventListener('click', onUserInteraction);
          window.removeEventListener('touchstart', onUserInteraction);
        }
        videoEl.removeEventListener('loadeddata', handleReady);
        videoEl.removeEventListener('canplay', handleReady);
      });
    });

    // Execute scripts cleanly with isolation & security guards (Google AdSense, Adsterra, custom scripts)
    scripts.forEach((oldScript) => {
      try {
        const src = oldScript.getAttribute('src');
        const inlineCode = oldScript.innerHTML || '';

        // Block unsecure non-https sources or inline scripts attempting to access cookies/auth tokens/storage
        if (src && !src.startsWith('https://') && !src.startsWith('//') && !src.startsWith('/')) {
          return;
        }

        // Isolate and reject scripts accessing local storage, session storage, document cookies, eval, or frame parents
        const forbiddenPatterns = [
          /\bdocument\.cookie\b/i,
          /\blocalStorage\b/i,
          /\bsessionStorage\b/i,
          /\bindexedDB\b/i,
          /\beval\s*\(/i,
          /\bFunction\s*\(/i,
          /\bwindow\.parent\b/i,
          /\bwindow\.top\b/i,
          /\btop\.location\b/i,
          /\bwindow\.opener\b/i,
          /\bdocument\.domain\b/i,
        ];

        const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(inlineCode));
        if (isForbidden) {
          console.warn(`[AdSlotRenderer] Blocked suspicious script pattern in ad slot ${slot?.id}`);
          return;
        }

        const newScript = document.createElement('script');
        // Copy all safe attributes
        Array.from(oldScript.attributes).forEach((attr) => {
          if (!attr.name.toLowerCase().startsWith('on')) {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        // Copy inline script text if any
        if (inlineCode) {
          newScript.innerHTML = inlineCode;
        }
        container.appendChild(newScript);
        scriptElements.push(newScript);
      } catch (err) {
        console.warn(`[AdSlotRenderer] Error executing script in slot ${slot?.id}:`, err);
      }
    });

    return () => {
      // Cleanup video listeners
      videoCleanupFns.forEach((fn) => fn());
      // Cleanup dynamically injected script tags on unmount or snippet update
      scriptElements.forEach((s) => s.remove());
    };
  }, [snippet, isAvailable, slot?.id]);

  // If master switch is OFF or slot is not enabled or no slot config, render nothing
  if (!isAvailable || !slot) {
    return null;
  }

  const handleAdClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;

    // If the click directly targeted an anchor tag, allow native browser navigation
    const target = e.target as HTMLElement | null;
    const clickedAnchor = target?.closest('a[href]') as HTMLAnchorElement | null;
    if (clickedAnchor) {
      return;
    }

    const container = containerRef.current;
    const innerAnchor = container?.querySelector('a[href]') as HTMLAnchorElement | null;
    let targetUrl = innerAnchor?.getAttribute('href') || null;

    if (!targetUrl && snippet) {
      const match = snippet.match(/href=["'](https?:\/\/[^"'\s>]+)["']/i);
      if (match) targetUrl = match[1];
    }

    if (targetUrl) {
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

  // CLS prevention: reserve minimum baseline slot height depending on unit type
  const clsMinHeight =
    slotType === 'skyscraper'
      ? 'min-h-[300px] sm:min-h-[600px]'
      : slotType === 'inline'
      ? 'min-h-[220px] sm:min-h-[250px]'
      : 'min-h-[84px] sm:min-h-[90px]';

  return (
    <div
      ref={containerRef}
      onClick={handleAdClick}
      className={`prombo-ad-slot prombo-ad-${slot.id} w-full h-auto ${clsMinHeight} flex flex-col justify-center items-stretch overflow-hidden transition-all [&>*]:max-w-full [&_*]:box-border [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_video]:max-w-full [&_ins]:max-w-full [&_ins]:w-full [&_a]:max-w-full ${className}`}
      style={{ width: '100%', height: 'auto', overflow: 'hidden' }}
      data-ad-slot={slot.id}
      data-ad-type={slotType}
    />
  );

};

export const AdSlotRenderer: React.FC<AdSlotRendererProps> = (props) => {
  return (
    <AdErrorBoundary slotId={props.slot?.id}>
      <AdSlotRendererInner {...props} />
    </AdErrorBoundary>
  );
};

