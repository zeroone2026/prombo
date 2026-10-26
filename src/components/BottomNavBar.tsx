import React from 'react';
import { Home, MessageSquare, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface BottomNavBarProps {
  currentView: 'home' | 'community' | 'admin';
  onNavigate: (view: 'home' | 'community') => void;
  communityCount?: number;
  communityEnabled?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentView,
  onNavigate,
  communityCount = 0,
  communityEnabled = true,
}) => {
  const { t, language } = useApp();

  // If community feature is disabled, completely hide the bottom navigation bar
  if (!communityEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3 sm:pb-4 pointer-events-auto">
        <nav
          aria-label="Bottom Navigation"
          className="flex items-center justify-around bg-white/95 dark:bg-[#121824]/95 backdrop-blur-xl border border-slate-200/90 dark:border-[#2A384C] rounded-2xl p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/40 transition-all duration-300"
        >
          {/* Home Button (الرئيسية) */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              currentView === 'home'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Home className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${currentView === 'home' ? 'stroke-[2.5]' : ''}`} />
            <span>{t('navHome')}</span>
          </button>

          {/* Community Button (المجتمع) */}
          <button
            type="button"
            onClick={() => onNavigate('community')}
            className={`flex-1 relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              currentView === 'community'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <div className="relative">
              <MessageSquare
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                  currentView === 'community' ? 'fill-current stroke-[2]' : 'fill-orange-500/15 dark:fill-orange-500/20'
                }`}
              />
              {!communityEnabled && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 ring-2 ring-white dark:ring-[#121824]" />
              )}
              {communityEnabled && communityCount > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-600 text-white border-2 border-white dark:border-[#121824]">
                  {communityCount > 99 ? '99+' : communityCount}
                </span>
              )}
            </div>
            <span>{t('navCommunity')}</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
