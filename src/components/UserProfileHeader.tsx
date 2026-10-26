import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, Share2, Edit2, Flag, Check, ShieldCheck, Pin, Sparkles } from 'lucide-react';
import { CommunityUser } from '../types';
import { useApp } from '../context/AppContext';
import { getUserProfileUrl, copyTextToClipboard } from '../utils/slugUtils';

export interface UserProfileHeaderProps {
  user: CommunityUser;
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
  onReportUser?: (user: CommunityUser) => void;
  className?: string;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  isCurrentUser = false,
  onEditProfile,
  onReportUser,
  className = '',
}) => {
  const { t, isRTL } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    const url = getUserProfileUrl(user.username || user.name);
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      setIsMenuOpen(false);
    }
  };

  return (
    <div
      id={`user-profile-header-${user.id}`}
      className={`relative p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-sm flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-200 dark:border-slate-700">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span>👤</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {user.name}
            </h3>
            {user.role === 'admin' && (
              <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
            )}
            {user.isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
                <Pin className="w-2.5 h-2.5 fill-current" />
                <span>{t('pinnedBadge')}</span>
              </span>
            )}
            {user.isVIP && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{t('featured')}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
            @{user.username || user.name}
          </p>
        </div>
      </div>

      {/* 3-Dots Action Dropdown Menu */}
      <div className="relative shrink-0">
        <button
          type="button"
          id={`user-profile-menu-btn-${user.id}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="User actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full mt-1.5 ${
                  isRTL ? 'left-0' : 'right-0'
                } z-40 w-44 bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-xl shadow-xl py-1 overflow-hidden text-xs divide-y divide-slate-100 dark:divide-slate-800`}
              >
                {/* Copy Profile Link */}
                <div className="py-0.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors cursor-pointer text-start font-medium"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {t('actions.linkCopied')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{t('actions.copyLink')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Edit Profile (if current user) */}
                {isCurrentUser && onEditProfile && (
                  <div className="py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEditProfile();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-start font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{t('actions.edit')}</span>
                    </button>
                  </div>
                )}

                {/* Report User (if not current user) */}
                {!isCurrentUser && onReportUser && (
                  <div className="py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onReportUser(user);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-start font-medium"
                    >
                      <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{t('actions.report')}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
