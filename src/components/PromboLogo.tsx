import React from 'react';
import { useApp } from '../context/AppContext';
import { getBrandName } from '../i18n/translations';

export const PROMBO_BRAND_COLOR = '#FF5500';

interface PromboMarkProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

/**
 * Prombo standalone brand vector mark:
 * - Elongated smooth-curved capital 'P' loop icon in vibrant electric orange (#FF5500).
 * - Clean, sharp prompt command chevron '>' nested directly inside the center loop of the 'P'.
 * - Completely borderless, frameless, and isolated without any background grid or container box.
 */
export const PromboMark: React.FC<PromboMarkProps> = ({
  className = '',
  size = 'md',
  color = PROMBO_BRAND_COLOR,
}) => {
  const markSizes = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6 sm:w-7 sm:h-7',
    md: 'w-7 h-7 sm:w-8 sm:h-8',
    lg: 'w-9 h-9 sm:w-10 sm:h-10',
    xl: 'w-12 h-12',
  };

  return (
    <svg
      className={`${markSizes[size]} shrink-0 ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer Stylized P Loop in Electric Orange */}
      <path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 51 10
           C 69.5 10 84 24.5 84 44
           C 84 63.5 70 78 52 78
           C 44.5 78 39.5 74 37 67
           C 36.5 73.5 34.5 81 31 85.5
           C 27.5 89.8 21.5 90.2 18 86
           C 16 83.5 16 76 16 66
           L 16 44
           C 16 25 31.5 10 51 10 Z
           M 51 22
           C 38 22 28.5 31.5 28.5 44
           C 28.5 56.5 38 66 51 66
           C 63.5 66 72 56.5 72 44
           C 72 31.5 63.5 22 51 22 Z"
      />
      {/* Prompt Command Chevron (>) nested directly inside the center loop */}
      <path
        fill={color}
        d="M 63 44.5 L 44 63.5 L 36 55.5 L 47 44.5 L 36 33.5 L 44 25.5 Z"
      />
    </svg>
  );
};

export interface PromboLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

/**
 * Prombo Logo component pairing the electric orange vector mark directly to the left
 * of the 'prombo' brand wordmark with crisp alignment (flex items-center gap-2).
 */
export const PromboLogo: React.FC<PromboLogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
  color = PROMBO_BRAND_COLOR,
}) => {
  const { language } = useApp();
  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl md:text-2xl',
    lg: 'text-xl sm:text-2xl md:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  };

  const brandText = getBrandName(language);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Prombo Electric Orange Vector Mark */}
      <PromboMark size={size} color={color} />

      {/* Prombo Brand Wordmark in exact matching #FF5500 */}
      {showText && (
        <span
          className={`font-black tracking-tight leading-none ${textSizes[size]} font-sans select-none`}
          style={{ letterSpacing: '-0.035em', color: color }}
        >
          {brandText}
        </span>
      )}
    </div>
  );
};
