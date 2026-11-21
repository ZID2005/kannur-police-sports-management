import { Link } from 'react-router-dom';
import { ArrowRight, ReceiptText, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface GuestAccessCardProps {
  animationDelayMs?: number;
}

export function GuestAccessCard({ animationDelayMs = 320 }: GuestAccessCardProps) {
  const { t } = useLanguage();

  return (
    <div
      style={{ animationDelay: `${animationDelayMs}ms` }}
      className="animate-fade-rise col-span-2 md:col-span-1 md:col-start-3 md:row-start-2 relative overflow-hidden rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex flex-col justify-between border border-white/90 shadow-[0_18px_42px_-16px_rgba(31,111,255,0.16)]"
    >
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(235,244,255,0.84) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      />
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#1F6FFF]/12 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1F6FFF]/10 text-[#0053CD] text-[11px] font-bold uppercase tracking-[0.04em]">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('Citizen & Govt / Police', 'പൗര-സർക്കാർ പ്രവേശനം')}
          </span>
          <span className="w-8 h-8 rounded-full bg-white/85 border border-white flex items-center justify-center text-[#1F6FFF] shadow-sm">
            <ReceiptText className="w-4 h-4" />
          </span>
        </div>

        <h3 className="font-display text-[19px] md:text-[21px] font-bold text-[#111418] tracking-[-0.02em] leading-snug mt-3">
          {t('Instant booking & official receipts', 'ഉടൻ ബുക്കിംഗും ഔദ്യോഗിക രസീതും')}
        </h3>
        <p className="text-[13px] text-[#4B5563] leading-relaxed mt-1.5">
          {t(
            'Sign in or register to reserve live hourly slots, manage bookings, and print GST fee receipts right away.',
            'തത്സമയ സ്ലോട്ടുകൾ ബുക്ക് ചെയ്യാനും ബുക്കിംഗുകൾ നിയന്ത്രിക്കാനും GST രസീതുകൾ പ്രിന്റ് ചെയ്യാനും സൈൻ ഇൻ ചെയ്യുക.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-4 md:mt-0">
        <Link
          to="/login"
          className="h-11 rounded-[15px] bg-[#1F6FFF] hover:bg-[#155EE6] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-[0_8px_18px_rgba(31,111,255,0.28)] transition-all duration-200 hover:-translate-y-[1px]"
        >
          <span>{t('Sign in', 'സൈൻ ഇൻ')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to="/register"
          className="h-11 rounded-[15px] bg-white/85 hover:bg-white border border-white text-[#111418] text-[13px] font-semibold inline-flex items-center justify-center shadow-sm transition-all duration-200 hover:-translate-y-[1px]"
        >
          {t('Create account', 'അക്കൗണ്ട് തുടങ്ങുക')}
        </Link>
      </div>
    </div>
  );
}
