import React, { useEffect, useState } from 'react';
import { Pin, Sparkles } from 'lucide-react';
import { CommunityUser } from '../types';
import { AuthService } from '../services/authService';
import { useApp } from '../context/AppContext';

export interface TranslatableAuthorNameProps {
  name: string;
  className?: string;
  showToggle?: boolean;
  user?: CommunityUser | null;
  userId?: string;
  isVIP?: boolean;
  isPinned?: boolean;
  showBadges?: boolean;
}

/**
 * TranslatableAuthorName
 * Renders user display names strictly in their raw, native database format
 * and displays active profile-level badges ("مميز" / "مثبت من الإدارة") consistently.
 */
export const TranslatableAuthorName: React.FC<TranslatableAuthorNameProps> = ({
  name,
  className = '',
  user: propUser,
  userId,
  isVIP: propIsVIP,
  isPinned: propIsPinned,
  showBadges = true,
}) => {
  const { t } = useApp();
  const [profile, setProfile] = useState<CommunityUser | null>(propUser || null);

  useEffect(() => {
    if (propUser) {
      setProfile(propUser);
      return;
    }
    // Find profile in cached storage
    try {
      const profiles = AuthService.getAllProfiles();
      const found = profiles.find(
        (p) =>
          (userId && p.id === userId) ||
          (p.name && name && p.name.trim().toLowerCase() === name.trim().toLowerCase()) ||
          (p.username && name && p.username.trim().toLowerCase() === name.trim().toLowerCase())
      );
      if (found) {
        setProfile(found);
      }
    } catch {
      // ignore
    }
  }, [propUser, userId, name]);

  // Listen to profile updates in real-time
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      if (
        (profile && detail.userId === profile.id) ||
        (userId && detail.userId === userId)
      ) {
        setProfile((prev) => (prev ? { ...prev, ...detail.updates } : null));
      }
    };
    window.addEventListener('prombo_user_profile_update', handleUpdate);
    return () => window.removeEventListener('prombo_user_profile_update', handleUpdate);
  }, [profile, userId]);

  const isVIP = propIsVIP !== undefined ? propIsVIP : Boolean(profile?.isVIP);
  const isPinned = propIsPinned !== undefined ? propIsPinned : Boolean(profile?.isPinned);

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={className}>{name}</span>
      {showBadges && isPinned && (
        <span
          title={t('pinnedBadge')}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0"
        >
          <Pin className="w-2.5 h-2.5 fill-current" />
          <span>{t('pinnedBadge')}</span>
        </span>
      )}
      {showBadges && isVIP && (
        <span
          title={t('featured')}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0"
        >
          <Sparkles className="w-2.5 h-2.5 fill-current" />
          <span>{t('featured')}</span>
        </span>
      )}
    </span>
  );
};

