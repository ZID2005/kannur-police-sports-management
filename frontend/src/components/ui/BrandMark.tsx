import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface BrandMarkProps {
  /** `solid` = filled blue tile (home), `tint` = tinted tile (auth pages) */
  variant?: 'solid' | 'tint';
  subtitle?: string;
  to?: string;
}

/** Kannur City Police shield lockup used in the public headers. */
export function BrandMark({ variant = 'solid', subtitle, to = '/' }: BrandMarkProps) {
  const { t } = useLanguage();
  const resolvedSubtitle = subtitle ?? t('Sports facilities', 'കായിക സൗകര്യങ്ങൾ');

  return (
    <Link to={to} className="group flex items-center gap-3 select-none">
      {variant === 'solid' ? (
        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#1F6FFF] to-[#0053CD] flex items-center justify-center text-white shadow-[0_6px_18px_rgba(31,111,255,0.28)] transition-transform duration-300 group-hover:scale-[1.04]">
          <Shield className="w-[19px] h-[19px]" strokeWidth={2.1} />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-[14px] bg-[#1F6FFF]/10 border border-[#1F6FFF]/20 flex items-center justify-center shadow-sm text-[#1F6FFF] transition-transform duration-300 group-hover:scale-[1.04]">
          <Shield className="w-[19px] h-[19px]" strokeWidth={2.1} />
        </div>
      )}
      <div className="flex flex-col leading-none">
        <span className="font-display text-[16px] font-bold text-[#111418] tracking-[-0.02em]">
          {t('Kannur City Police', 'കണ്ണൂർ സിറ്റി പോലീസ്')}
        </span>
        <span className="text-[12px] font-medium text-[#6B7280] mt-1 tracking-[0.005em]">
          {resolvedSubtitle}
        </span>
      </div>
    </Link>
  );
}
