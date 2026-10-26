import { AdSlotConfig } from '../types';

/**
 * Checks if a modal or triggered ad is eligible to display based on
 * enabled state, snippet presence, device targeting, session dismissal, and cooldown interval.
 */
export function canDisplayModalAd(slot: AdSlotConfig | undefined): boolean {
  if (!slot || !slot.isEnabled || !slot.codeSnippet?.trim()) {
    return false;
  }

  // Device targeting check
  if (typeof window !== 'undefined') {
    if (slot.deviceTargeting === 'desktop' && window.innerWidth < 768) return false;
    if (slot.deviceTargeting === 'mobile' && window.innerWidth >= 768) return false;
  }

  // Session dismiss check
  try {
    if (sessionStorage.getItem(`prombo_ad_dismissed_${slot.id}`) === 'true') {
      return false;
    }
  } catch {
    // Ignore storage exceptions
  }

  // Cooldown check
  if (slot.cooldownMinutes && slot.cooldownMinutes > 0) {
    try {
      const lastShown = Number(localStorage.getItem(`prombo_ad_cooldown_${slot.id}`) || '0');
      if (lastShown && Date.now() - lastShown < slot.cooldownMinutes * 60 * 1000) {
        return false;
      }
    } catch {
      // Ignore storage exceptions
    }
  }

  return true;
}
