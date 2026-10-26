import React from 'react';

interface CommentBubbleIconProps {
  className?: string;
  size?: number | string;
  color?: string;
}

/**
 * Custom Comment Bubble Icon matching the exact double-bubble outline
 * with 3 horizontal text stripes in the front bubble.
 */
export const CommentBubbleIcon: React.FC<CommentBubbleIconProps> = ({
  className = 'w-5 h-5',
  size,
  color,
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      style={color ? { color } : undefined}
    >
      {/* Back Speech Bubble Outline */}
      <path
        d="M23 10V6.5C23 4.567 21.433 3 19.5 3H5.5C3.567 3 2 4.567 2 6.5V17.5C2 19.433 3.567 21 5.5 21H6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Front Speech Bubble Outline with Bottom-Left Speech Tail */}
      <path
        d="M6.5 8.5C6.5 6.567 8.067 5 10 5H26.5C28.433 5 30 6.567 30 8.5V19.5C30 21.433 28.433 23 26.5 23H17.2L9.8 28.8C9.2 29.3 8.3 28.85 8.3 28.05V23H10C8.067 23 6.5 21.433 6.5 19.5V8.5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3 Horizontal Rounded Stripes inside Front Bubble */}
      <line
        x1="12"
        y1="10.5"
        x2="24.5"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="14"
        x2="24.5"
        y2="14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17.5"
        x2="24.5"
        y2="17.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
};
