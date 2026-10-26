import React, { useEffect, useRef } from 'react';
import { AtSign, User } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';

export interface MentionUser {
  name: string;
  avatar?: string;
  isAuthor?: boolean;
}

interface MentionDropdownProps {
  isOpen: boolean;
  query: string;
  postAuthor: { name: string; avatar?: string };
  threadUsers: Array<{ name: string; avatar?: string }>;
  onSelect: (userName: string) => void;
  onClose: () => void;
  language?: 'ar' | 'en';
  position?: 'top' | 'bottom';
  highlightedIndex?: number;
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  isOpen,
  query,
  postAuthor,
  threadUsers,
  onSelect,
  onClose,
  language = 'ar',
  position = 'bottom',
  highlightedIndex = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Post Author ALWAYS at top
  const authorName = postAuthor?.name?.trim() || (language === 'ar' ? 'صاحب المنشور' : 'Author');
  const authorItem: MentionUser = {
    name: authorName,
    avatar: postAuthor?.avatar,
    isAuthor: true,
  };

  // 2. Unique users who previously commented on this thread
  const uniqueUsers: MentionUser[] = [];
  const seen = new Set<string>();
  seen.add(authorName.toLowerCase());

  (threadUsers || []).forEach((u) => {
    const trimmed = u.name?.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      uniqueUsers.push({
        name: trimmed,
        avatar: u.avatar,
        isAuthor: false,
      });
    }
  });

  const allSuggestions = [authorItem, ...uniqueUsers];

  // Filter based on query after @
  const cleanQuery = query.trim().toLowerCase();
  const filtered = cleanQuery
    ? allSuggestions.filter((item) => item.name.toLowerCase().includes(cleanQuery))
    : allSuggestions;

  return (
    <div
      ref={containerRef}
      className={`absolute z-50 start-0 min-w-[240px] max-w-[290px] bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-xl p-1.5 overflow-hidden transition-all ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
    >
      {/* Sleek dropdown mini-header */}
      <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-[#2A384C]/60 mb-1">
        <span className="flex items-center gap-1">
          <AtSign className="w-3 h-3 text-sky-500" />
          <span>{language === 'ar' ? 'الإشارة إلى شخص' : 'Mention User'}</span>
        </span>
        <span className="text-[9px] lowercase font-normal text-slate-400">
          {language === 'ar' ? 'انقر للاختيار' : 'click or enter'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="px-3 py-2.5 text-center text-xs text-slate-400 dark:text-slate-500">
          {language === 'ar' ? 'لا يوجد مستخدم مطابق' : 'No matching users'}
        </div>
      ) : (
        <div className="max-h-[190px] overflow-y-auto space-y-0.5 custom-scrollbar">
          {filtered.map((user, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={`${user.name}-${idx}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur on input
                  onSelect(user.name);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl text-start transition-colors cursor-pointer text-xs ${
                  isHighlighted
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                    : 'hover:bg-slate-100 dark:hover:bg-[#1e2a3c] text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <UserAvatar
                    avatar={user.avatar}
                    name={user.name}
                    size="xs"
                    showGlow={false}
                  />
                  <span className="font-semibold truncate flex-1">{user.name}</span>
                </div>

                {user.isAuthor && (
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    {language === 'ar' ? 'صاحب المنشور' : 'Author'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Formats text by highlighting any `@Username` mention with distinct light-blue styling:
 * `text-sky-400 font-medium` (or dark mode equivalent `text-sky-400` / `text-blue-500 font-medium`)
 */
export const renderContentWithMentions = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split on @mentions (support Arabic characters, English words, underscores, dashes, numbers)
  const parts = text.split(/(@[a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF-]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          className="inline-block px-1.5 py-0.2 mx-0.5 rounded-md font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 shadow-2xs transition-colors select-text"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};
