import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, Edit2, Trash2, Flag } from 'lucide-react';
import { CommunityPost, CommunityUser } from '../../types';
import { useApp } from '../../context/AppContext';

export interface ReplyItemProps {
  reply: CommunityPost;
  currentUser?: CommunityUser | null;
  onEdit?: (reply: CommunityPost) => void;
  onDelete?: (replyId: string) => void;
  onReport?: (reply: CommunityPost) => void;
  className?: string;
}

export const ReplyItem: React.FC<ReplyItemProps> = ({
  reply,
  currentUser,
  onEdit,
  onDelete,
  onReport,
  className = '',
}) => {
  const { t, isRTL } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const canManage =
    currentUser &&
    (currentUser.id === reply.userId || currentUser.role === 'admin');

  return (
    <div
      id={`reply-item-${reply.id}`}
      className={`relative p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#192233] border border-slate-100 dark:border-[#223044] space-y-1.5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] overflow-hidden">
            {reply.userAvatar ? (
              <img src={reply.userAvatar} alt={reply.userName} className="w-full h-full object-cover" />
            ) : (
              <span>👤</span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {reply.userName}
          </span>
        </div>

        {/* 3-Dots Action Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            id={`reply-menu-btn-${reply.id}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Reply actions"
          >
            <MoreVertical className="w-3 h-3" />
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
                  transition={{ duration: 0.12 }}
                  className={`absolute top-full mt-1 z-40 min-w-[130px] rounded-xl bg-white dark:bg-[#1c2638] border border-slate-200 dark:border-[#2e3e57] shadow-xl py-1 text-xs font-medium divide-y divide-slate-100 dark:divide-slate-800 ${
                    isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                  }`}
                >
                  {canManage && (
                    <div className="py-0.5">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onEdit(reply);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#253348] text-start transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-orange-500 shrink-0" />
                          <span>{t('actions.edit')}</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDelete(reply.id);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{t('actions.delete')}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {onReport && (
                    <div className="py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onReport(reply);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                      >
                        <Flag className="w-3 h-3 text-rose-500 shrink-0" />
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

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
        {reply.content}
      </p>
    </div>
  );
};
