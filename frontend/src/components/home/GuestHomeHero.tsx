import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Clock,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const ROTATING_VENUES = [
  { en: 'Synthetic Track', ml: 'സിന്തറ്റിക് ട്രാക്ക്' },
  { en: 'Parade Ground', ml: 'പരേഡ് ഗ്രൗണ്ട്' },
  { en: 'Police Turf', ml: 'പോലീസ് ടർഫ്' },
  { en: 'Badminton Court', ml: 'ബാഡ്മിന്റൺ കോർട്ട്' },
] as const;

interface GuestHomeHeroProps {
  venueCount: number;
}

/**
 * Structured, animated editorial hero for unauthenticated visitors on `/`.
 */
export function GuestHomeHero({ venueCount }: GuestHomeHeroProps) {
  const { lang, t } = useLanguage();
  const [venueIdx, setVenueIdx] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVenueIdx((prev) => (prev + 1) % ROTATING_VENUES.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  const currentVenue =
    lang === 'ML' ? ROTATING_VENUES[venueIdx].ml : ROTATING_VENUES[venueIdx].en;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center pt-3 pb-6 md:pt-7 md:pb-10">
      {/* Left 7 Columns: Animated Editorial Headline + CTAs */}
      <div className="lg:col-span-7 flex flex-col items-start">
        {/* Status Eyebrow Pill */}
        <div
          style={{ animationDelay: '40ms' }}
          className="animate-fade-rise inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-white/95 shadow-[0_6px_20px_-6px_rgba(31,111,255,0.16)] mb-5"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F6FFF] opacity-70" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1F6FFF]" />
          </span>
          <span className="text-[12px] md:text-[12.5px] font-semibold text-[#1E3A5F] tracking-[0.01em]">
            {t(
              'Official Citizen & Govt/Police Sports Portal',
              'ഔദ്യോഗിക പൗര-സർക്കാർ കായിക പോർട്ടൽ',
            )}
          </span>
        </div>

        {/* Masked Kinetic Headline */}
        <h1 className="font-display text-[34px] sm:text-[44px] md:text-[52px] font-extrabold text-[#111418] tracking-[-0.03em] leading-[1.12]">
          <span className="block">
            <span className="text-reveal-mask">
              <span className="animate-text-reveal" style={{ animationDelay: '90ms' }}>
                {t("Reserve Kannur's", 'കണ്ണൂരിലെ മികച്ച')}
              </span>
            </span>
          </span>
          <span className="block mt-0.5">
            <span className="text-reveal-mask">
              <span className="animate-text-reveal" style={{ animationDelay: '170ms' }}>
                {t('Premier ', 'പോലീസ് ')}{' '}
              </span>
            </span>
            <span className="text-reveal-mask">
              <span
                key={`${lang}-${currentVenue}`}
                className="animate-word-cycle text-gradient-kinetic inline-block"
              >
                {currentVenue}
              </span>
            </span>
          </span>
        </h1>

        {/* Concise Supporting Copy */}
        <p
          style={{ animationDelay: '260ms' }}
          className="animate-fade-rise text-[15px] md:text-[16.5px] text-[#4B5563] leading-[1.65] max-w-[540px] mt-4 md:mt-5"
        >
          {t(
            'Sign up and start booking immediately — reserve live hourly courts, activate monthly synthetic track memberships, and receive official GST fee receipts across Kannur City Police athletic venues.',
            'ഉടൻ രജിസ്റ്റർ ചെയ്ത് ബുക്കിംഗ് ആരംഭിക്കൂ — തത്സമയ കോർട്ട് സ്ലോട്ടുകൾ, പ്രതിമാസ സിന്തറ്റിക് ട്രാക്ക് അംഗത്വം, ഔദ്യോഗിക GST ഫീസ് രസീതുകൾ എന്നിവ ഒരൊറ്റ പോർട്ടലിൽ.',
          )}
        </p>

        {/* Primary & Secondary Action Row */}
        <div
          style={{ animationDelay: '340ms' }}
          className="animate-fade-rise flex flex-wrap items-center gap-3 mt-6 md:mt-7"
        >
          <Link
            to="/login"
            className="btn-primary h-[50px] md:h-[52px] px-6 md:px-7 !rounded-full text-[15px] inline-flex items-center gap-2 group"
          >
            <span>{t('Sign in to book', 'ബുക്ക് ചെയ്യാൻ സൈൻ ഇൻ ചെയ്യുക')}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <Link
            to="/register"
            className="h-[50px] md:h-[52px] px-6 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/95 text-[#111418] text-[15px] font-semibold inline-flex items-center justify-center shadow-[0_8px_22px_-8px_rgba(15,23,42,0.1)] transition-all duration-200 hover:-translate-y-[1px]"
          >
            {t('Create account', 'അക്കൗണ്ട് തുടങ്ങുക')}
          </Link>

          <a
            href="#venues"
            className="h-[50px] px-3.5 text-[14px] font-semibold text-[#4B5563] hover:text-[#1F6FFF] inline-flex items-center gap-1 transition-colors"
          >
            <span>{t('Explore venues', 'വേദികൾ കാണുക')}</span>
            <ChevronDown className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Right 5 Columns: Structured Portal Snapshot Glass Card */}
      <div style={{ animationDelay: '220ms' }} className="lg:col-span-5 animate-fade-rise">
        <div
          className="rounded-[28px] md:rounded-[32px] p-5 md:p-6 border border-white/90 shadow-[0_22px_50px_-18px_rgba(31,111,255,0.14)] relative overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(36px)',
            WebkitBackdropFilter: 'blur(36px)',
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"
            aria-hidden="true"
          />

          {/* Header strip inside card */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-black/[0.05]">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#1F6FFF]/10 text-[#1F6FFF] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <p className="font-display text-[14.5px] font-bold text-[#111418] leading-tight">
                  {t('Portal Highlights', 'പോർട്ടൽ സവിശേഷതകൾ')}
                </p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">
                  {t(
                    `${venueCount} Official Athletic Venues`,
                    `${venueCount} ഔദ്യോഗിക കായിക വേദികൾ`,
                  )}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[11.5px] font-semibold whitespace-nowrap">
              <Clock className="w-3.5 h-3.5" />
              {t('5 AM – 10 PM', 'രാവിലെ 5 – രാത്രി 10')}
            </span>
          </div>

          {/* 3 Structured Highlights */}
          <div className="py-4 flex flex-col gap-3.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white border border-black/[0.04] shadow-sm flex items-center justify-center text-[#1F6FFF] shrink-0">
                <CalendarClock className="w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111418] leading-snug">
                  {t('Live Hourly Slot Booking', 'തത്സമയ മണിക്കൂർ സ്ലോട്ട് ബുക്കിംഗ്')}
                </p>
                <p className="text-[12.5px] text-[#6B7280] leading-relaxed mt-0.5">
                  {t(
                    'Real-time schedules synced directly with Sports Complex Administration.',
                    'കായിക സമുച്ചയ ഭരണസമിതിയുമായി നേരിട്ട് ബന്ധിപ്പിച്ച തത്സമയ സ്ലോട്ടുകൾ.',
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white border border-black/[0.04] shadow-sm flex items-center justify-center text-[#1F6FFF] shrink-0">
                <ShieldCheck className="w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111418] leading-snug">
                  {t('Immediate Member Access', 'ഉടൻ അംഗത്വ പ്രവേശനം')}
                </p>
                <p className="text-[12.5px] text-[#6B7280] leading-relaxed mt-0.5">
                  {t(
                    'Active immediately after signup with transparent Public & Govt/Police tariffs.',
                    'രജിസ്ട്രേഷനുശേഷം ഉടൻ സജീവമാകുന്ന അക്കൗണ്ടും സുതാര്യമായ നിരക്കുകളും.',
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white border border-black/[0.04] shadow-sm flex items-center justify-center text-[#1F6FFF] shrink-0">
                <ReceiptText className="w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111418] leading-snug">
                  {t('Official Booking & GST Receipts', 'ഔദ്യോഗിക ബുക്കിംഗ് & GST രസീതുകൾ')}
                </p>
                <p className="text-[12.5px] text-[#6B7280] leading-relaxed mt-0.5">
                  {t(
                    'Receive structured printable fee receipts with full concession and tax breakdown.',
                    'ഇളവുകളും നികുതിയും വ്യക്തമാക്കുന്ന പ്രിന്റ് ചെയ്യാവുന്ന ഫീസ് രസീതുകൾ.',
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Footer location bar */}
          <div className="pt-3.5 border-t border-black/[0.05] flex items-center justify-between text-[12px] text-[#6B7280]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#374151]">
              <MapPin className="w-3.5 h-3.5 text-[#1F6FFF]" />
              {t('Police Parade Ground, Kannur', 'പോലീസ് പരേഡ് ഗ്രൗണ്ട്, കണ്ണൂർ')}
            </span>
            <span className="font-semibold text-[#0053CD]">{t('Open Daily', 'ദിവസവും തുറന്നിരിക്കും')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
