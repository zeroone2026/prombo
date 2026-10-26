import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, Edit2, Trash2, Flag } from 'lucide-react';
import { CommunityPost, CommunityUser } from '../../types';
import { useApp } from '../../context/AppContext';

export interface CommentItemProps {
  comment: CommunityPost;
  currentUser?: CommunityUser | null;
  onEdit?: (comment: CommunityPost) => void;
  onDelete?: (commentId: string) => void;
  onReport?: (comment: CommunityPost) => void;
  className?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
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
    (currentUser.id === comment.userId || currentUser.role === 'admin');

  return (
    <div
      id={`comment-item-${comment.id}`}
      className={`relative p-3 rounded-xl bg-slate-50 dark:bg-[#1a2436] border border-slate-100 dark:border-[#253348] space-y-2 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs overflow-hidden">
            {comment.userAvatar ? (
              <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" />
            ) : (
              <span>👤</span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {comment.userName}
          </span>
        </div>

        {/* 3-Dots Action Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            id={`comment-menu-btn-${comment.id}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Comment actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
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
                            onEdit(comment);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#253348] text-start transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{t('actions.edit')}</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDelete(comment.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
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
                          onReport(comment);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start transition-colors cursor-pointer"
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

      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
        {comment.content}
      </p>
    </div>
  );
};
