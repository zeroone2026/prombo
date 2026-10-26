import React, { useState } from 'react';
import {
  MessageCircle,
  Send,
  Facebook,
  AtSign,
  Linkedin,
  Ghost,
  Instagram,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  SharePlatformId,
  executeShare,
  isNativeShareSupported,
} from '../utils/shareUtils';

export interface ShareButtonsProps {
  variant?: 'compact' | 'full' | 'banner' | 'footer';
  customTitle?: string;
  customUrl?: string;
  className?: string;
  platforms?: SharePlatformId[];
  showHeading?: boolean;
}

/**
 * Official new X (formerly Twitter) vector logo
 */
export const XLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface PlatformMeta {
  id: SharePlatformId;
  name: string;
  nameAr: string;
  icon: React.ComponentType<{ className?: string }>;
  bgClass: string;
  textClass: string;
  borderClass?: string;
}

/**
 * Ordered platforms: WhatsApp, X, Facebook, LinkedIn, Telegram, Threads, Instagram, Snapchat
 */
const ALL_PLATFORMS: PlatformMeta[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    nameAr: 'واتساب',
    icon: MessageCircle,
    bgClass: 'bg-[#25D366] hover:bg-[#20bd5a]',
    textClass: 'text-white',
  },
  {
    id: 'twitter',
    name: 'X',
    nameAr: 'إكس',
    icon: XLogoIcon,
    bgClass: 'bg-black hover:bg-neutral-800 dark:bg-black dark:hover:bg-neutral-900',
    textClass: 'text-white',
    borderClass: 'border border-neutral-700/60',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    nameAr: 'فيسبوك',
    icon: Facebook,
    bgClass: 'bg-[#1877F2] hover:bg-[#1567d3]',
    textClass: 'text-white',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    nameAr: 'لينكد إن',
    icon: Linkedin,
    bgClass: 'bg-[#0A66C2] hover:bg-[#084e96]',
    textClass: 'text-white',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    nameAr: 'تيليجرام',
    icon: Send,
    bgClass: 'bg-[#229ED9] hover:bg-[#1a85b9]',
    textClass: 'text-white',
  },
  {
    id: 'threads',
    name: 'Threads',
    nameAr: 'ثريدز',
    icon: AtSign,
    bgClass: 'bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700',
    textClass: 'text-white',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    nameAr: 'إنستغرام',
    icon: Instagram,
    bgClass: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90',
    textClass: 'text-white',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    nameAr: 'سناب شات',
    icon: Ghost,
    bgClass: 'bg-[#FFFC00] hover:bg-[#ece800]',
    textClass: 'text-neutral-950',
  },
];

/**
 * Localized heading for "Share Prombo with your community and friends"
 */
export function getShareHeading(language: string = 'ar'): string {
  switch (language) {
    case 'ar':
      return 'شارك برومبو مع مجتمعك وأصدقائك';
    case 'fr':
      return 'Partagez Prombo avec votre communauté et vos amis';
    case 'es':
      return 'Comparte Prombo con tu comunidad y amigos';
    case 'zh':
      return '与您的社区和朋友分享 Prombo';
    case 'hi':
      return 'Prombo को अपने समुदाय और दोस्तों के साथ साझा करें';
    case 'ja':
      return 'Prombo をコミュニティや友人と共有する';
    default:
      return 'Share Prombo with your community and friends';
  }
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  variant = 'footer',
  customTitle,
  customUrl,
  className = '',
  platforms,
  showHeading = true,
}) => {
  const { language } = useApp();
  const isRtl = language === 'ar';
  const [copied, setCopied] = useState(false);
  const [busyPlatform, setBusyPlatform] = useState<SharePlatformId | null>(null);

  const displayPlatforms = platforms
    ? ALL_PLATFORMS.filter((p) => platforms.includes(p.id))
    : ALL_PLATFORMS;

  const handleShare = async (id: SharePlatformId) => {
    setBusyPlatform(id);
    try {
      const res = await executeShare(id, {
        title: customTitle,
        url: customUrl,
        language,
      });

      if (id === 'copy' && res.success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } finally {
      setBusyPlatform(null);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* VARIANT 1: COMPACT (Sidebar Header: All 8 platforms + Copy, scrollable)    */
  /* -------------------------------------------------------------------------- */
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5 max-w-full ${className}`}>
        {displayPlatforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleShare(platform.id)}
              disabled={busyPlatform === platform.id}
              title={isRtl ? `مشاركة عبر ${platform.nameAr}` : `Share to ${platform.name}`}
              className={`w-6 h-6 sm:w-6.5 sm:h-6.5 max-w-[26px] max-h-[26px] rounded-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 shadow-2xs ${platform.bgClass} ${platform.textClass} ${platform.borderClass || ''}`}
            >
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          );
        })}

        {/* Compact Copy Link Button */}
        <button
          type="button"
          onClick={() => handleShare('copy')}
          title={isRtl ? 'نسخ الرابط' : 'Copy link'}
          className={`w-6 h-6 sm:w-6.5 sm:h-6.5 max-w-[26px] max-h-[26px] rounded-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 shadow-2xs border ${
            copied
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
          }`}
        >
          {copied ? (
            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
          ) : (
            <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          )}
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VARIANT 2: FULL (Responsive branded buttons with text)                    */
  /* -------------------------------------------------------------------------- */
  if (variant === 'full') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {displayPlatforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleShare(platform.id)}
              disabled={busyPlatform === platform.id}
              className={`h-9 px-3 rounded-xl font-medium text-xs inline-flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap ${platform.bgClass} ${platform.textClass} ${platform.borderClass || ''}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{isRtl ? platform.nameAr : platform.name}</span>
            </button>
          );
        })}

        {isNativeShareSupported() && (
          <button
            type="button"
            onClick={() => handleShare('native')}
            className="h-9 px-3 rounded-xl font-medium text-xs inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>{isRtl ? 'مشاركة' : 'Share'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleShare('copy')}
          className={`h-9 px-3.5 rounded-xl font-medium text-xs inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap border ${
            copied
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{isRtl ? 'تم النسخ!' : 'Copied!'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{isRtl ? 'نسخ الرابط' : 'Copy Link'}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VARIANT 3: FOOTER (Clean, integrated fine-line header + 28px-32px icons)  */
  /* -------------------------------------------------------------------------- */
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-2.5 ${className}`}>
      {/* Clean, fine-line header text directly above resized icon row */}
      {showHeading && (
        <p className="text-xs sm:text-[13px] font-normal text-slate-500 dark:text-slate-400 tracking-wide select-none">
          {language === 'ar' ? 'شارك برومبو مع مجتمعك وأصدقائك' : getShareHeading(language)}
        </p>
      )}

      {/* Resized social share icon buttons (max 28px-32px with subtle rounded padding) */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
        {displayPlatforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <button
              key={platform.id}
              type="button"
              id={`footer-share-${platform.id}`}
              onClick={() => handleShare(platform.id)}
              disabled={busyPlatform === platform.id}
              title={isRtl ? `مشاركة عبر ${platform.nameAr}` : `Share to ${platform.name}`}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 max-w-[30px] max-h-[30px] rounded-lg p-1.5 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-2xs ${platform.bgClass} ${platform.textClass} ${platform.borderClass || ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}

        {/* Small compact Copy Link Button (max 28px - 32px) */}
        <button
          type="button"
          id="footer-share-copy"
          onClick={() => handleShare('copy')}
          title={isRtl ? 'نسخ الرابط' : 'Copy link'}
          className={`w-7 h-7 sm:w-7.5 sm:h-7.5 max-w-[30px] max-h-[30px] rounded-lg p-1.5 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-2xs border ${
            copied
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700/80'
          }`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
