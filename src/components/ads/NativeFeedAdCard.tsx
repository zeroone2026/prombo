import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, ExternalLink, Sparkles } from 'lucide-react';
import { AdSlotConfig, FeedAdSlotConfig } from '../../types';
import { AdSlotRenderer } from './AdSlotRenderer';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storage';

export interface NativeFeedAdCardProps {
  adSlotId: string;
  slotIndex: number;
  slotConfig?: FeedAdSlotConfig | AdSlotConfig;
  masterEnabled: boolean;
  onDismiss: (adSlotId: string) => void;
  onAdClick?: (adSlotId: string) => void;
  feedType?: 'home' | 'community';
  className?: string;
}

interface CreativeVariant {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  badgeEn: string;
  badgeAr: string;
  ctaEn: string;
  ctaAr: string;
  imageUrl: string;
  targetUrl: string;
}

const NATIVE_CREATIVES: CreativeVariant[] = [
  {
    titleEn: 'Supercharge Your AI Workflows with Prombo',
    titleAr: 'ضاعف إنتاجيتك وسرعة عملك مع أدوات الذكاء الاصطناعي',
    descEn: 'Deploy top-tier prompt templates, automate engineering tasks, and build faster with Claude 3.7 & GPT-4o.',
    descAr: 'استخدم قوالب برومبت احترافية، أتمت مهامك البرمجية، وابنِ منتجاتك بسرعة أكبر مع أحدث النماذج الذكية.',
    badgeEn: 'Sponsored Partner',
    badgeAr: 'شريك مموّل',
    ctaEn: 'Explore Free Tools',
    ctaAr: 'استكشف الأدوات مجاناً',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Next-Gen GPU Cloud Compute for Developers',
    titleAr: 'حوسبة سحابية فائقة السرعة لوحدات معالجة الرسوميات (GPU)',
    descEn: 'Instant access to H100 and A100 GPUs with zero setup delay. Optimized for training, fine-tuning, and inference.',
    descAr: 'وصول فوري لوحدات H100 و A100 بدون فترات انتظار. مثالية للتدريب والتشغيل الفوري للنماذج المعقدة.',
    badgeEn: 'Cloud Sponsor',
    badgeAr: 'شريك سحابي',
    ctaEn: 'Get $100 Credits',
    ctaAr: 'احصل على رصيد 100$',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Ultra-Fast Vector DB for Semantic Search',
    titleAr: 'قاعدة بيانات متجهات فائقة السرعة للبحث الدلالي',
    descEn: 'Store billions of vector embeddings with sub-millisecond retrieval latency for your RAG pipelines.',
    descAr: 'خزّن مليارات المتجهات بزمن استجابة أقل من ميلي ثانية لتطبيقات البحث الذكي واسترجاع المعلومات (RAG).',
    badgeEn: 'Featured Partner',
    badgeAr: 'شريك مميز',
    ctaEn: 'Start Free Tier',
    ctaAr: 'ابدأ الباقة المجانية',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Automated AI Code Review & Security Auditing',
    titleAr: 'فحص أمان برمجي ذكي وتلقائي للكود قبل النشر',
    descEn: 'Detect security vulnerabilities, memory leaks, and performance bugs in real-time right inside your git workflow.',
    descAr: 'اكتشف الثغرات الأمنية ومشاكل الأداء في الوقت الفعلي مباشرة داخل مسار عمل Git الخاص بفريقك.',
    badgeEn: 'Security Sponsor',
    badgeAr: 'رعاية الأمان البرمجي',
    ctaEn: 'Run Free Scan',
    ctaAr: 'افحص مشروعك مجاناً',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Photorealistic 4K Neural Image Generation',
    titleAr: 'توليد صور وفيديوهات فائقة الواقعية بدقة 4K',
    descEn: 'State-of-the-art diffusion models for marketing, concept art, and high-conversion commercial graphics.',
    descAr: 'أحدث نماذج التوليد البصري لإنشاء تصاميم إعلانية ومفاهيم فنية بدقة غير مسبوقة تزيد من التفاعل.',
    badgeEn: 'Creative Sponsor',
    badgeAr: 'شريك إبداعي',
    ctaEn: 'Generate Now',
    ctaAr: 'جرّب التوليد الآن',
    imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Vibe Coding & Full-Stack App Scaffolding',
    titleAr: 'بناء تطبيقات ويب كاملة من الأفكار في دقائق',
    descEn: 'Turn product requirements into responsive React, Next.js, and TypeScript production applications in seconds.',
    descAr: 'حوّل متطلبات منتجك البرمجي إلى تطبيق متكامل ومبني بأحدث تقنيات React و Next.js و TypeScript فوراً.',
    badgeEn: 'Developer Tools',
    badgeAr: 'أدوات المطورين',
    ctaEn: 'Build Your App',
    ctaAr: 'ابنِ تطبيقك الآن',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Real-Time Multilingual AI Voice & Dubbing',
    titleAr: 'أصوات ذكاء اصطناعي واقعية متعددة اللغات والدبلجة',
    descEn: 'Generate human-like synthetic voices with emotion, natural breathing, and pitch control across 40+ languages.',
    descAr: 'توليد أصوات بشرية طبيعية بنبرات عاطفية وتحكم دقيق في الإلقاء بأكثر من 40 لغة عالمية.',
    badgeEn: 'Audio Partner',
    badgeAr: 'شريك صوتي',
    ctaEn: 'Listen to Demos',
    ctaAr: 'استمع للعينات',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Enterprise AI Gateway & Smart LLM Routing',
    titleAr: 'بوابة نماذج ذكاء اصطناعي موحدة وخفض تكاليف الاستهلاك',
    descEn: 'Route prompts dynamically to the fastest and cheapest models with unified API keys and 99.99% uptime.',
    descAr: 'وجّه طلبات الذكاء الاصطناعي ديناميكياً للنموذج الأسرع والأوفر تكلفة مع مفتاح برمجي واحد وموثوقية عالية.',
    badgeEn: 'Enterprise Partner',
    badgeAr: 'شريك الشركات',
    ctaEn: 'Optimize Costs',
    ctaAr: 'خفّض تكاليفك 70%',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Prompt Engineering Masterclass & Template Hub',
    titleAr: 'الدليل الاحترافي الشامل لهندسة وتصميم الأوامر الذكية',
    descEn: 'Master few-shot reasoning, structured outputs, and chain-of-thought prompting with certified real-world projects.',
    descAr: 'احترف التفكير التسلسلي، والمخرجات المنظمة، وصياغة الأوامر المعقدة مع تطبيقات عملية معتمدة.',
    badgeEn: 'Learning Sponsor',
    badgeAr: 'شريك تعليمي',
    ctaEn: 'Access Guide',
    ctaAr: 'تصفح الدليل مجاناً',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
  {
    titleEn: 'Deploy Autonomous Agents in Under 60 Seconds',
    titleAr: 'انشر وكلاء ذكاء اصطناعي ذاتيين خلال 60 ثانية فقط',
    descEn: 'Connect memory, external web search, browser automation, and SQL tools to autonomous agent swarms effortlessly.',
    descAr: 'اربط الذاكرة طويلة المدى، وتصفح الويب، وقواعد البيانات بوكلاء أذكياء يقومون بالمهام نيابة عنك.',
    badgeEn: 'Featured Tech',
    badgeAr: 'تقنية مميزة',
    ctaEn: 'Deploy Agent',
    ctaAr: 'انشر أول وكيل الآن',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=80',
    targetUrl: 'https://example.com',
  },
];

export const NativeFeedAdCard: React.FC<NativeFeedAdCardProps> = ({
  adSlotId,
  slotIndex,
  slotConfig,
  masterEnabled,
  onDismiss,
  onAdClick,
  feedType = 'home',
  className = '',
}) => {
  const { language, t } = useApp();
  const isAr = language === 'ar';

  // Intersection Observer for performance-oriented lazy loading of heavy media & embeds
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInViewport, setIsInViewport] = useState<boolean>(false);

  useEffect(() => {
    // If IntersectionObserver is unavailable or server-side, immediately render
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInViewport(true);
          // Once loaded into view, keep it active to avoid re-initializing if user scrolls slightly
          observer.disconnect();
        }
      },
      {
        rootMargin: '250px 0px', // Pre-buffer slightly before scrolling into view
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Pick one of the 10 creative variants based on slotIndex
  const creative = useMemo(() => {
    const idx = Math.abs(slotIndex) % NATIVE_CREATIVES.length;
    return NATIVE_CREATIVES[idx];
  }, [slotIndex]);

  // Extract snippet from slotConfig (handles FeedAdSlotConfig or AdSlotConfig)
  const codeSnippet = useMemo(() => {
    if (!slotConfig) return '';
    if ('snippet' in slotConfig && slotConfig.snippet) {
      return slotConfig.snippet.trim();
    }
    if ('codeSnippet' in slotConfig && slotConfig.codeSnippet) {
      return slotConfig.codeSnippet.trim();
    }
    return '';
  }, [slotConfig]);

  // Determine target CTA URL: prioritize dedicated ctaUrl, then custom href in snippet, then fallback
  const ctaUrl = useMemo(() => {
    if (slotConfig && 'ctaUrl' in slotConfig && slotConfig.ctaUrl?.trim()) {
      return slotConfig.ctaUrl.trim();
    }
    if (codeSnippet) {
      const match = codeSnippet.match(/href=["'](https?:\/\/[^"'\s>]+)["']/i);
      if (match && match[1]) {
        return match[1];
      }
    }
    return creative.targetUrl;
  }, [slotConfig, codeSnippet, creative.targetUrl]);

  // Custom Title & Description overrides if configured
  const displayTitle = useMemo(() => {
    if (slotConfig && 'title' in slotConfig && slotConfig.title?.trim()) {
      return slotConfig.title.trim();
    }
    return isAr ? creative.titleAr : creative.titleEn;
  }, [slotConfig, isAr, creative]);

  const displayDescription = useMemo(() => {
    if (slotConfig && 'description' in slotConfig && slotConfig.description?.trim()) {
      return slotConfig.description.trim();
    }
    return isAr ? creative.descAr : creative.descEn;
  }, [slotConfig, isAr, creative]);

  // Check if snippet contains custom scripts/iframes/ins/video tags
  const hasExternalEmbed = useMemo(() => {
    if (!codeSnippet) return false;
    return /<script|<iframe|<ins\s+class=|<video/i.test(codeSnippet);
  }, [codeSnippet]);

  // Full-surface click handler with click analytics
  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;

    // Check if clicked element was an anchor or button that handles its own action
    const target = e.target as HTMLElement | null;
    const clickedInteractive = target?.closest('button, a[href]');
    if (clickedInteractive) {
      return;
    }

    if (ctaUrl) {
      // 1. Record click analytics in persistent storage
      StorageService.recordFeedAdClick(adSlotId);
      if (onAdClick) {
        onAdClick(adSlotId);
      }
      // 2. Open CTA destination in new tab safely
      window.open(ctaUrl, '_blank', 'noopener,noreferrer');
    }
  }, [ctaUrl, adSlotId, onAdClick]);

  // Explicit close button dismissal with strict stopPropagation
  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDismiss(adSlotId);
  }, [onDismiss, adSlotId]);

  // Slot enabled state
  const isSlotEnabled = useMemo(() => {
    if (!slotConfig) return true;
    if ('enabled' in slotConfig) return Boolean(slotConfig.enabled);
    if ('isEnabled' in slotConfig) return Boolean(slotConfig.isEnabled);
    return true;
  }, [slotConfig]);

  if (!masterEnabled || !isSlotEnabled) {
    return null;
  }

  const isHome = feedType === 'home';

  // Synthesized slot for AdSlotRenderer if embedding raw snippet
  const embedSlotConfig: AdSlotConfig | undefined = useMemo(() => {
    if (!codeSnippet) return undefined;
    return {
      id: adSlotId as any,
      name: displayTitle,
      nameAr: displayTitle,
      description: displayDescription,
      descriptionAr: displayDescription,
      isEnabled: true,
      codeSnippet,
      triggerType: 'inline',
    };
  }, [adSlotId, displayTitle, displayDescription, codeSnippet]);

  return (
    <motion.div
      ref={containerRef}
      layout
      id={`feed-ad-card-${adSlotId}`}
      data-ad-slot-id={adSlotId}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between bg-white dark:bg-[#182232] border border-orange-500/25 dark:border-orange-500/25 hover:border-orange-500/60 dark:hover:border-orange-500/60 rounded-2xl sm:rounded-3xl p-5 md:p-6 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden select-none ${
        isHome ? 'col-span-1 w-full h-full min-h-[340px]' : 'w-full space-y-4'
      } ${className}`}
    >
      {/* Top Header / Sponsor Badge & Isolated Close (X) Button */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-[#2A384C]/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span className="truncate">{isAr ? creative.badgeAr : creative.badgeEn}</span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">
            Prombo Network
          </span>
        </div>

        {/* Small Close ("X") Button with strict event isolation */}
        <button
          type="button"
          onClick={handleCloseClick}
          aria-label={t('ads.close') || (isAr ? 'إغلاق الإعلان' : 'Close ad')}
          title={t('ads.close') || (isAr ? 'إغلاق الإعلان' : 'Close ad')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-red-600 dark:hover:bg-red-600 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Embedded Raw Script/Iframe/Video Path with Lazy Loading */}
      {hasExternalEmbed && embedSlotConfig ? (
        <div className="flex-1 w-full min-h-[160px] overflow-hidden flex flex-col justify-center">
          {isInViewport ? (
            <AdSlotRenderer
              slot={embedSlotConfig}
              masterEnabled={masterEnabled}
              slotType="inline"
              className="w-full h-auto"
            />
          ) : (
            /* Lightweight skeleton preview preventing layout shift and zero network execution until viewed */
            <div className="w-full h-[180px] rounded-xl bg-slate-900/40 border border-dashed border-slate-700/50 flex flex-col items-center justify-center gap-2 text-slate-500 animate-pulse">
              <Sparkles className="w-5 h-5 text-orange-500/60" />
              <span className="text-[11px] font-medium text-slate-400">
                {isAr ? 'جاري تجهيز الشريك المموّل...' : 'Loading partner ad...'}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Native Card Content with Responsive Image, Copywriting, and CTA */
        <div className="flex-1 flex flex-col justify-between space-y-3 min-h-0">
          {/* Media Thumbnail with lazy loading */}
          <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-900/80 shrink-0 border border-slate-200/50 dark:border-slate-800/80">
            {isInViewport ? (
              <img
                src={creative.imageUrl}
                alt={displayTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full bg-slate-800/60 animate-pulse" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Copywriting */}
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-orange-500 transition-colors">
              {displayTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
              {displayDescription}
            </p>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-2 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 font-medium">
              {isAr ? 'إعلان مخصص' : 'Sponsored'}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (ctaUrl) {
                  StorageService.recordFeedAdClick(adSlotId);
                  if (onAdClick) {
                    onAdClick(adSlotId);
                  }
                  window.open(ctaUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs hover:shadow-orange-600/30 transition-all cursor-pointer group/cta"
            >
              <span>{isAr ? creative.ctaAr : creative.ctaEn}</span>
              <ExternalLink className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
