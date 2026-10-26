import { Language } from '../i18n/translations';

/**
 * Formats a given date/timestamp into human-readable relative time ("5m ago" / "منذ 5 دقائق")
 * Supports all 7 languages: ar, en, fr, es, zh, hi, ja
 */
export function formatTimeAgo(
  dateInput: string | number | Date | undefined | null,
  language: Language | string = 'ar'
): string {
  if (!dateInput) return '';

  const now = new Date();
  const past = new Date(dateInput);
  const diffInSec = Math.floor((now.getTime() - past.getTime()) / 1000);

  // Use Intl.RelativeTimeFormat if available for native high-accuracy localization
  try {
    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
      if (isNaN(diffInSec) || diffInSec < 10) {
        return language === 'ar' ? 'الآن' : 'just now';
      }
      if (diffInSec < 60) {
        return rtf.format(-diffInSec, 'second');
      }
      const diffInMin = Math.floor(diffInSec / 60);
      if (diffInMin < 60) {
        return rtf.format(-diffInMin, 'minute');
      }
      const diffInHours = Math.floor(diffInMin / 60);
      if (diffInHours < 24) {
        return rtf.format(-diffInHours, 'hour');
      }
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) {
        return rtf.format(-diffInDays, 'day');
      }
      const diffInMonths = Math.floor(diffInDays / 30);
      return rtf.format(-diffInMonths, 'month');
    }
  } catch (e) {
    // fallback below
  }

  if (isNaN(diffInSec) || diffInSec < 0 || diffInSec < 60) {
    return language === 'ar' ? 'الآن' : 'just now';
  }

  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) {
    return language === 'ar' ? `منذ ${diffInMin} دقيقة` : `${diffInMin}m ago`;
  }

  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) {
    return language === 'ar' ? `منذ ${diffInHours} ساعة` : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return language === 'ar' ? `منذ ${diffInDays} يوم` : `${diffInDays}d ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return language === 'ar' ? `منذ ${diffInMonths} شهر` : `${diffInMonths}mo ago`;
}
