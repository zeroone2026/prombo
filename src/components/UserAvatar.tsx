import React, { useState } from 'react';
import { resolveUserAvatar, isPresetAvatarId, getDynamicInitialSvg } from '../utils/avatarUtils';
import { getPresetAvatarById } from '../data/presetAvatars';

export interface UserAvatarProps {
  user?: {
    name?: string;
    avatar?: string;
    isGuest?: boolean;
  } | null;
  name?: string;
  avatar?: string;
  isGuest?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showGlow?: boolean;
  alt?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-24 h-24 text-2xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  name: explicitName,
  avatar: explicitAvatar,
  isGuest: explicitIsGuest,
  size = 'md',
  className = '',
  showGlow = true,
  alt,
  onClick,
}) => {
  const userName = explicitName || user?.name || 'User';
  const rawAvatar = explicitAvatar ?? user?.avatar;
  const isGuest = explicitIsGuest ?? user?.isGuest ?? false;

  const [hasError, setHasError] = useState(false);

  // Check if preset avatar
  const isPreset = isPresetAvatarId(rawAvatar);
  const presetData = isPreset ? getPresetAvatarById(rawAvatar!) : undefined;

  // Resolve source URL
  let resolvedSrc: string;
  if (hasError) {
    resolvedSrc = getDynamicInitialSvg({ name: userName, isGuest });
  } else {
    resolvedSrc = resolveUserAvatar({ name: userName, avatar: rawAvatar, isGuest });
  }

  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

  // Styling logic: if it's a preset avatar or has glowing ring
  const glowStyle =
    showGlow && presetData
      ? {
          boxShadow: `0 0 12px ${presetData.glowColor}`,
          borderColor: presetData.ringColor,
        }
      : isGuest
      ? {
          boxShadow: '0 0 4px rgba(15, 23, 42, 0.4)',
        }
      : {};

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full aspect-square flex-shrink-0 select-none overflow-hidden transition-all duration-200 ${sizeClasses} ${className}`}
      style={glowStyle}
      onClick={onClick}
    >
      <img
        src={resolvedSrc}
        alt={alt || userName}
        className="w-full h-full object-cover rounded-full aspect-square"
        onError={() => setHasError(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
