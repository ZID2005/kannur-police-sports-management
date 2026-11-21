import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ReceiptText, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { AuthPageContent, AuthTabMode } from '@/types/home';

interface AuthCardShellProps {
  mode: AuthTabMode;
  content: AuthPageContent;
  shaking: boolean;
  noticeTitle?: string | null;
  noticeMessage?: string | null;
  onCloseNotice?: () => void;
  children: ReactNode;
}

const showcaseByMode: Record<
  AuthTabMode,
  {
    imageUrl: string;
    badge: string;
    headlineLine1: string;
    headlineLine2: string;
    caption: string;
    formTitle: string;
    formSubtitle: string;
  }
> = {
  signin: {
    imageUrl: '/images/facilities/synthetic-track.jpg',
    badge: 'Kannur City Police • Sports Complex',
    headlineLine1: 'Your portal to Kannur’s',
    headlineLine2: 'premier athletic arenas.',
    caption:
      'Manage hourly court bookings, monthly synthetic track memberships, and official GST fee receipts from one portal.',
    formTitle: 'Sign in to your account',
    formSubtitle: 'Enter your name (or username) and password to access bookings and receipts.',
  },
  create: {
    imageUrl: '/images/facilities/football-ground.jpg',
    badge: 'Citizen & Govt / Police Registration',
    headlineLine1: 'Start booking courts',
    headlineLine2: 'right away.',
    caption:
      'Create an active portal account in seconds — check real-time court slots and receive instant booking confirmation receipts.',
    formTitle: 'Create your account',
    formSubtitle: 'Enter your full name, password, and account category to start immediately.',
  },
};

const portalHighlights = [
  {
    icon: CalendarClock,
    label: 'Real-time hourly court scheduling',
    labelMl: 'തത്സമയ മണിക്കൂർ കോർട്ട് ഷെഡ്യൂളിംഗ്',
  },
  {
    icon: ReceiptText,
    label: 'Instant confirmation & GST fee receipts',
    labelMl: 'ഉടൻ സ്ഥിരീകരണവും GST ഫീസ് രസീതും',
  },
  {
    icon: ShieldCheck,
    label: 'Active immediately — Public & Govt/Police tariffs',
    labelMl: 'ഉടൻ സജീവമാകുന്ന അക്കൗണ്ടും സുതാര്യ നിരക്കുകളും',
  },
] as const;

export function AuthCardShell({
  mode,
  content,
  shaking,
  noticeTitle,
  noticeMessage,
  onCloseNotice,
  children,
}: AuthCardShellProps) {
  const { lang, t } = useLanguage();
  const baseCopy = showcaseByMode[mode];
  const copy =
    lang === 'ML'
      ? mode === 'signin'
        ? {
            ...baseCopy,
            badge: 'കണ്ണൂർ സിറ്റി പോലീസ് • കായിക സമുച്ചയം',
            headlineLine1: 'കണ്ണൂരിലെ മികച്ച കായിക',
            headlineLine2: 'വേദികളിലേക്കുള്ള പോർട്ടൽ.',
            caption:
              'മണിക്കൂർ കോർട്ട് ബുക്കിംഗുകളും പ്രതിമാസ സിന്തറ്റിക് ട്രാക്ക് അംഗത്വവും ഔദ്യോഗിക GST ഫീസ് രസീതുകളും ഒരൊറ്റ പോർട്ടലിൽ നിയന്ത്രിക്കൂ.',
            formTitle: 'അക്കൗണ്ടിൽ സൈൻ ഇൻ ചെയ്യുക',
            formSubtitle: 'ബുക്കിംഗുകളും രസീതുകളും കാണാൻ പോർട്ടൽ വിവരങ്ങൾ നൽകുക.',
          }
        : {
            ...baseCopy,
            badge: 'പൗര-സർക്കാർ രജിസ്ട്രേഷൻ',
            headlineLine1: 'ഉടൻ തന്നെ കോർട്ട്',
            headlineLine2: 'ബുക്കിംഗ് തുടങ്ങൂ.',
            caption:
              'നിമിഷങ്ങൾക്കുള്ളിൽ സജീവ അക്കൗണ്ട് തുടങ്ങൂ — തത്സമയ സ്ലോട്ടുകൾ ബുക്ക് ചെയ്ത് ഉടൻ ഫീസ് രസീത് നേടൂ.',
            formTitle: 'പുതിയ അക്കൗണ്ട് തുടങ്ങുക',
            formSubtitle: 'ആരംഭിക്കാൻ നിങ്ങളുടെ പേരും പാസ്‌വേഡും വിഭാഗവും നൽകുക.',
          }
      : baseCopy;

  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 md:py-10 w-full">
      <div className="ambient-glow-tr" aria-hidden="true" />
      <div className="ambient-glow-bl" aria-hidden="true" />

      <div
        id="auth-card"
        className={`auth-shell-frame relative z-10 w-full max-w-[980px] p-2.5 sm:p-3 grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-0 ${
          shaking ? 'shake-active' : ''
        }`}
      >
        {/* Left Showcase Panel (Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 relative rounded-[20px] overflow-hidden min-h-[560px] flex-col justify-between p-7 bg-[#0B172A] text-white select-none">
          <img
            src={copy.imageUrl}
            alt="Kannur City Police Sports Facility"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-75 transition-transform duration-700"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(11, 23, 42, 0.72) 0%, rgba(11, 23, 42, 0.38) 45%, rgba(11, 23, 42, 0.92) 100%)',
            }}
          />

          {/* Top Portal Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-[11.5px] font-semibold tracking-[0.02em] text-white/95">
              <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
              {copy.badge}
            </span>
          </div>

          {/* Bottom Editorial Copy + Highlights */}
          <div className="relative z-10 flex flex-col gap-5">
            <div>
              <h2 className="font-display text-[28px] font-bold tracking-[-0.03em] leading-[1.15] text-white">
                <span className="text-reveal-mask block">
                  <span className="animate-text-reveal" style={{ animationDelay: '70ms' }}>
                    {copy.headlineLine1}
                  </span>
                </span>
                <span className="text-reveal-mask block">
                  <span className="animate-text-reveal" style={{ animationDelay: '150ms' }}>
                    {copy.headlineLine2}
                  </span>
                </span>
              </h2>
              <p className="text-[13.5px] text-slate-200/85 leading-relaxed mt-3">
                {copy.caption}
              </p>
            </div>

            <div className="pt-4 border-t border-white/15 flex flex-col gap-2.5">
              {portalHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 text-[12.5px] font-medium text-slate-100/90"
                  >
                    <span className="w-6 h-6 rounded-lg bg-white/12 border border-white/15 flex items-center justify-center text-[#93C5FD] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span>{lang === 'ML' ? item.labelMl : item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Form Workspace */}
        <div className="lg:col-span-7 flex flex-col justify-between px-4 py-5 sm:px-8 sm:py-7 md:px-11 md:py-9">
          <div>
            {/* Top Utility Row */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>{t('Back to home', 'ഹോമിലേക്ക് മടങ്ങുക')}</span>
              </Link>
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#64748B]">
                {mode === 'signin'
                  ? t('Member Access', 'അംഗ പ്രവേശനം')
                  : t('Instant Signup', 'ഉടൻ രജിസ്ട്രേഷൻ')}
              </span>
            </div>

            {/* Mode-Specific Headline & Subtitle */}
            <div className="mb-6">
              <h1 className="font-display text-[26px] sm:text-[30px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.15]">
                <span className="text-reveal-mask">
                  <span className="animate-text-reveal" style={{ animationDelay: '50ms' }}>
                    {copy.formTitle}
                  </span>
                </span>
              </h1>
              <p className="text-[14px] text-[#64748B] mt-1.5 leading-relaxed">
                {copy.formSubtitle}
              </p>
            </div>

            {/* Modern Neutral Segmented Switcher */}
            <div className="auth-segmented w-full flex items-center" role="tablist">
              <div
                className="auth-segmented-thumb"
                style={{
                  transform: mode === 'signin' ? 'translateX(0%)' : 'translateX(100%)',
                }}
              />
              <Link
                to="/login"
                role="tab"
                aria-selected={mode === 'signin'}
                className={
                  mode === 'signin'
                    ? 'relative z-10 w-1/2 h-full text-[13.5px] font-semibold text-[#0F172A] transition-colors flex items-center justify-center'
                    : 'relative z-10 w-1/2 h-full text-[13.5px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center justify-center'
                }
              >
                {t(content.signInTabLabel, 'സൈൻ ഇൻ')}
              </Link>
              <Link
                to="/register"
                role="tab"
                aria-selected={mode === 'create'}
                className={
                  mode === 'create'
                    ? 'relative z-10 w-1/2 h-full text-[13.5px] font-semibold text-[#0F172A] transition-colors flex items-center justify-center'
                    : 'relative z-10 w-1/2 h-full text-[13.5px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center justify-center'
                }
              >
                {t(content.createAccountTabLabel, 'അക്കൗണ്ട് തുടങ്ങുക')}
              </Link>
            </div>

            {/* Form Body */}
            {children}

            {/* Optional Portal Notice / Policy Drawer */}
            {noticeMessage && (
              <div
                role="status"
                className="mt-5 rounded-[14px] bg-slate-50 border border-slate-200/90 px-4 py-3 text-[13px] text-[#0F172A] flex items-start justify-between gap-3"
              >
                <div>
                  {noticeTitle && (
                    <p className="font-semibold text-[#0F172A] mb-0.5">{noticeTitle}</p>
                  )}
                  <p className="text-[#475569] leading-relaxed">{noticeMessage}</p>
                </div>
                {onCloseNotice && (
                  <button
                    type="button"
                    aria-label="Dismiss notice"
                    onClick={onCloseNotice}
                    className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-200/60 transition shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Mode Switch Footer */}
          <div className="mt-7 pt-5 border-t border-slate-200/80 flex items-center justify-between text-[13px] text-[#64748B]">
            <span>
              {mode === 'signin'
                ? t('New to the sports portal?', 'പോർട്ടലിൽ പുതിയതാണോ?')
                : t('Already have an account?', 'ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?')}
            </span>
            <Link
              to={mode === 'signin' ? '/register' : '/login'}
              className="font-semibold text-[#165DF5] hover:text-[#0F50DC] transition-colors"
            >
              {mode === 'signin'
                ? t('Create an account →', 'അക്കൗണ്ട് തുടങ്ങുക →')
                : t('Sign in instead →', 'സൈൻ ഇൻ ചെയ്യുക →')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
