import React from 'react';
import { useApp } from '../context/AppContext';

export const Hero: React.FC = () => {
  const { t } = useApp();

  return (
    <div className="pt-4 sm:pt-6 pb-2 px-4 text-center max-w-3xl mx-auto space-y-1">
      {/* Clean Minimal Title */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
        {t('brandName')}
      </h1>

      {/* Clean Subtitle */}
      <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
        {t('brandTagline')}
      </p>
    </div>
  );
};


