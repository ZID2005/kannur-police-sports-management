import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

interface BrandMarkProps {
  /** `solid` = filled blue tile (home), `tint` = tinted tile (auth pages) */
  variant?: 'solid' | 'tint';
  subtitle?: string;
  to?: string;
}

/** Kannur City Police shield lockup used in the public headers. */
export function BrandMark({ variant = 'solid', subtitle = 'Sports facilities', to = '/' }: BrandMarkProps) {
  return (
    <Link to={to} className="flex items-center gap-3">
      {variant === 'solid' ? (
        <div className="w-10 h-10 rounded-2xl bg-[#1F6FFF] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <Shield className="w-5 h-5" strokeWidth={2} />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-[14px] bg-[#1F6FFF]/10 border border-[#1F6FFF]/20 flex items-center justify-center shadow-sm text-[#1F6FFF]">
          <Shield className="w-5 h-5" strokeWidth={2} />
        </div>
      )}
      <div className="flex flex-col leading-tight">
        <span className="text-[17px] font-semibold text-[#111418] tracking-tight">Kannur City Police</span>
        <span className="text-[13px] text-[#6B7280] mt-0.5">{subtitle}</span>
      </div>
    </Link>
  );
}
