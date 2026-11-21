import { useLanguage } from '@/context/LanguageContext';

interface LanguageToggleProps {
  /** `glass` = public header pill, `segmented` = auth header, `admin` = admin header chip */
  variant?: 'glass' | 'segmented' | 'admin';
  className?: string;
}

/** EN | മലയാളം switch synced across the entire portal via LanguageContext. */
export function LanguageToggle({ variant = 'glass', className = '' }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Language switch"
        className={`h-10 px-1.5 py-1 bg-white/75 backdrop-blur-md border border-slate-200/85 rounded-full flex items-center space-x-1 shadow-sm ${className}`}
      >
        {(['EN', 'ML'] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
            className={
              lang === l
                ? 'px-3.5 py-1 text-[13px] font-semibold rounded-full bg-[#165DF5]/12 text-[#165DF5] border border-[#165DF5]/20 transition-all'
                : 'px-3.5 py-1 text-[13px] font-medium rounded-full text-[#64748B] hover:text-[#0F172A] transition-all'
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
        role="group"
        aria-label="Language switch"
        className={`hidden sm:flex items-center px-2.5 py-1 rounded-lg bg-surface-container-low font-label-meta text-label-meta text-on-surface-variant gap-1.5 ${className}`}
      >
        <button
          type="button"
          aria-pressed={lang === 'EN'}
          onClick={() => setLang('EN')}
          className={lang === 'EN' ? 'text-primary font-semibold' : 'hover:text-on-surface'}
        >
          EN
        </button>
        <span className="text-outline-variant">|</span>
        <button
          type="button"
          aria-pressed={lang === 'ML'}
          onClick={() => setLang('ML')}
          className={lang === 'ML' ? 'text-primary font-semibold' : 'hover:text-on-surface'}
        >
          മലയാളം
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Language switch"
      className={`liquid-glass rounded-full px-3 py-1.5 text-[13px] font-medium text-[#111418] flex items-center gap-1.5 shadow-sm ${className}`}
    >
      <button
        type="button"
        aria-pressed={lang === 'EN'}
        onClick={() => setLang('EN')}
        className={`transition-colors ${
          lang === 'EN' ? 'font-semibold text-[#165DF5]' : 'text-[#64748B] hover:text-[#0F172A]'
        }`}
      >
        EN
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        aria-pressed={lang === 'ML'}
        onClick={() => setLang('ML')}
        className={`transition-colors ${
          lang === 'ML' ? 'font-semibold text-[#165DF5]' : 'text-[#64748B] hover:text-[#0F172A]'
        }`}
      >
        മലയാളം
      </button>
    </div>
  );
}
