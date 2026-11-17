import { useState } from 'react';
import type { Language } from '@/types';

interface LanguageToggleProps {
  /** `glass` = public header pill, `segmented` = auth header, `admin` = admin header chip */
  variant?: 'glass' | 'segmented' | 'admin';
  className?: string;
}

/** EN | മലയാളം switch used in every header. */
export function LanguageToggle({ variant = 'glass', className = '' }: LanguageToggleProps) {
  const [lang, setLang] = useState<Language>('EN');

  if (variant === 'segmented') {
    return (
      <div
        className={`h-10 px-1.5 py-1 bg-white/60 backdrop-blur-md border border-white/80 rounded-full flex items-center space-x-1 shadow-sm ${className}`}
      >
        {(['EN', 'ML'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={
              lang === l
                ? 'px-3.5 py-1 text-[13px] font-semibold rounded-full bg-[#1F6FFF]/[0.12] text-[#1F6FFF] border border-[#1F6FFF]/20 transition-all'
                : 'px-3.5 py-1 text-[13px] font-medium rounded-full text-[#6B7280] hover:text-[#111418] transition-all'
            }
          >
            {l === 'EN' ? 'EN' : 'മലയാളം'}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'admin') {
    return (
      <div
        className={`hidden sm:flex items-center px-2.5 py-1 rounded-lg bg-surface-container-low font-label-meta text-label-meta text-on-surface-variant gap-1.5 ${className}`}
      >
        <button type="button" onClick={() => setLang('EN')} className={lang === 'EN' ? 'text-primary font-semibold' : 'hover:text-on-surface'}>
          EN
        </button>
        <span className="text-outline-variant">|</span>
        <button type="button" onClick={() => setLang('ML')} className={lang === 'ML' ? 'text-primary font-semibold' : 'hover:text-on-surface'}>
          മലയാളം
        </button>
      </div>
    );
  }

  return (
    <div
      className={`liquid-glass rounded-full px-3 py-1.5 text-[13px] font-medium text-[#111418] flex items-center gap-1.5 shadow-sm ${className}`}
    >
      <button type="button" onClick={() => setLang('EN')} className={lang === 'EN' ? 'font-semibold text-[#1F6FFF]' : 'text-[#6B7280]'}>
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button type="button" onClick={() => setLang('ML')} className={lang === 'ML' ? 'font-semibold text-[#1F6FFF]' : 'text-[#6B7280]'}>
        മലയാളം
      </button>
    </div>
  );
}
