import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Globe,
  Home,
  LogIn,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  UserCircle2,
  UserPlus,
  X,
} from 'lucide-react';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { BrandMark } from '@/components/ui/BrandMark';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { publicNav } from '@/data/mockData';

interface PublicLayoutProps {
  /**
   * `app`  – public portal header (brand, floating nav pills, language, auth / account controls)
   * `auth` – minimal header used on Sign in / Create account (brand + segmented language toggle)
   */
  variant?: 'app' | 'auth';
}

const mobileIcons = {
  Home,
  Bookings: CalendarDays,
  'My Bookings': ReceiptText,
  Membership: CreditCard,
} as const;

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Shared shell for all Member Portal routes.
 */
export function PublicLayout({ variant = 'app' }: PublicLayoutProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navLabel = (label: string) => {
    if (label === 'Home') return t('Home', 'ഹോം');
    if (label === 'Bookings') return t('Bookings', 'ബുക്കിംഗുകൾ');
    if (label === 'My Bookings') return t('My Bookings', 'എന്റെ ബുക്കിംഗുകൾ');
    if (label === 'Membership') return t('Membership', 'അംഗത്വം');
    return label;
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    setAccountOpen(false);
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 14);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (variant === 'auth') {
    return (
      <div className="min-h-screen relative flex flex-col selection:bg-blue-100 selection:text-blue-900">
        <div className="print:hidden">
          <AmbientBackground />
        </div>
        <header className="print:hidden relative z-20 w-full">
          <div className="w-full max-w-[1200px] mx-auto h-[76px] px-4 md:px-6 flex items-center justify-between">
            <BrandMark variant="tint" />
            <LanguageToggle variant="segmented" />
          </div>
        </header>
        <main className="relative z-10 flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
    );
  }

  const userCategoryLabel =
    user?.role === 'GOVT_PERSONNEL'
      ? t('Govt / Police', 'സർക്കാർ / പോലീസ്')
      : t('General Public', 'പൊതുജനം');

  return (
    <div className="min-h-screen relative flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <div className="print:hidden">
        <AmbientBackground />
      </div>

      {/* Sticky Floating / Container-Aligned Header (hidden when printing receipts) */}
      <header className="print:hidden sticky top-0 z-50 w-full px-3 sm:px-4 md:px-6 pt-3 md:pt-4 transition-all duration-300">
        <div
          className={`w-full max-w-[1200px] mx-auto h-[62px] md:h-[68px] rounded-[22px] md:rounded-full flex items-center justify-between transition-all duration-300 ${
            scrolled
              ? 'px-4 md:px-5 bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_14px_38px_-12px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.9)_inset]'
              : 'px-1 md:px-0 bg-transparent border border-transparent shadow-none'
          }`}
        >
          {/* Left: Brand Lockup */}
          <div className="flex items-center shrink-0">
            <BrandMark />
          </div>

          {/* Center: Floating Glass Navigation Capsule (desktop) */}
          <nav
            aria-label="Primary navigation"
            className={`hidden md:flex items-center gap-1 rounded-full p-1 transition-all duration-300 ${
              scrolled
                ? 'bg-[#111418]/[0.035] border border-black/[0.04]'
                : 'bg-white/70 backdrop-blur-2xl border border-white/90 shadow-[0_8px_24px_-8px_rgba(31,111,255,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]'
            }`}
          >
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive
                    ? 'px-4 lg:px-5 py-2 rounded-full bg-white text-[#1F6FFF] text-[13.5px] lg:text-[14px] font-semibold shadow-[0_2px_10px_rgba(31,111,255,0.14)] transition-all duration-200 whitespace-nowrap'
                    : 'px-4 lg:px-5 py-2 rounded-full text-[#4B5563] hover:text-[#111418] hover:bg-white/60 text-[13.5px] lg:text-[14px] font-medium transition-all duration-200 whitespace-nowrap'
                }
              >
                {navLabel(item.label)}
              </NavLink>
            ))}
          </nav>

          {/* Right: Auth-Aware Controls (desktop) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <LanguageToggle className="h-10 !px-3.5 !py-0 bg-white/70 border-white/90" />

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  aria-label="Account"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((o) => !o)}
                  className={`h-10 pl-1.5 pr-3 rounded-full flex items-center gap-2 transition-all duration-200 shadow-sm ${
                    accountOpen
                      ? 'bg-[#1F6FFF] text-white shadow-blue-500/25'
                      : 'bg-white/80 backdrop-blur-xl border border-white/95 text-[#111418] hover:bg-white'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center ${
                      accountOpen
                        ? 'bg-white/20 text-white'
                        : 'bg-[#1F6FFF]/12 text-[#1F6FFF]'
                    }`}
                  >
                    {getInitials(user.full_name)}
                  </span>
                  <span className="text-[13.5px] font-semibold max-w-[110px] truncate">
                    {user.full_name.split(' ')[0]}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      accountOpen ? 'rotate-180 text-white/80' : 'text-[#6B7280]'
                    }`}
                  />
                </button>

                {accountOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+12px)] w-[276px] rounded-[24px] p-4 z-50 text-left"
                    style={{
                      background: 'rgba(255, 255, 255, 0.96)',
                      backdropFilter: 'blur(40px)',
                      WebkitBackdropFilter: 'blur(40px)',
                      border: '1px solid rgba(255, 255, 255, 0.95)',
                      boxShadow: '0 18px 44px rgba(15, 23, 42, 0.14)',
                    }}
                  >
                    <div className="pb-3 px-1">
                      <p className="font-display text-[16px] font-bold text-[#111418] leading-tight truncate">
                        {user.full_name}
                      </p>
                      <p className="text-[12.5px] font-mono text-[#6B7280] mt-0.5 truncate">
                        @{user.username}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            user.role === 'GOVT_PERSONNEL'
                              ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                              : 'bg-slate-100 border-slate-200 text-[#334155]'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {userCategoryLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t('Active', 'സജീവം')}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-black/[0.06] my-1" />

                    <div className="py-1 flex flex-col gap-0.5">
                      <Link
                        to="/my-bookings"
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13.5px] font-medium text-[#111418] hover:bg-black/[0.04] transition"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ReceiptText className="w-4 h-4 text-[#1F6FFF]" />
                          {t('My Bookings & Receipts', 'എന്റെ ബുക്കിംഗുകളും രസീതുകളും')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                      </Link>
                      <Link
                        to="/account"
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13.5px] font-medium text-[#111418] hover:bg-black/[0.04] transition"
                      >
                        <span className="inline-flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-[#1F6FFF]" />
                          {t('Account & Profile', 'അക്കൗണ്ടും പ്രൊഫൈലും')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                      </Link>
                    </div>

                    <div className="h-px bg-black/[0.06] my-1" />

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13.5px] font-semibold text-[#E5484D] hover:bg-red-500/[0.06] transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('Log out', 'ലോഗ് ഔട്ട്')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="h-10 px-4 rounded-full bg-white/75 backdrop-blur-xl border border-white/95 hover:bg-white text-[#111418] text-[14px] font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all duration-200 hover:-translate-y-[1px]"
                >
                  <span>{t('Sign in', 'സൈൻ ഇൻ')}</span>
                </Link>
                <Link
                  to="/register"
                  className="h-10 px-5 rounded-full bg-[#1F6FFF] hover:bg-[#155EE6] text-white text-[14px] font-semibold inline-flex items-center gap-1.5 shadow-[0_8px_20px_rgba(31,111,255,0.28)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(31,111,255,0.36)]"
                >
                  <span>{t('Get started', 'ആരംഭിക്കുക')}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile right controls */}
          <div className="md:hidden flex items-center gap-2">
            {!user && (
              <Link
                to="/login"
                className="h-9 px-3.5 rounded-full bg-[#1F6FFF] text-white text-[13px] font-semibold inline-flex items-center shadow-sm shadow-blue-500/25"
              >
                {t('Sign in', 'സൈൻ ഇൻ')}
              </Link>
            )}
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 rounded-full bg-white/85 border border-white flex items-center justify-center text-[#191C20] shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sliding glass sheet */}
      {mobileOpen && (
        <div className="print:hidden md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-[5px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative z-10 w-full rounded-b-[34px] px-6 pt-5 pb-7 flex flex-col gap-1.5"
            style={{
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 20px 50px rgba(15,23,42,0.15)',
            }}
          >
            <div className="flex items-center justify-between pb-2">
              <BrandMark />
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
                className="w-10 h-10 rounded-full bg-white/90 border border-white hover:bg-white active:scale-95 flex items-center justify-center text-[#191C20] transition shadow-sm"
              >
                <X className="w-5 h-5" strokeWidth={1.6} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {publicNav.map((item) => {
                const Icon = mobileIcons[item.label as keyof typeof mobileIcons] ?? Home;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive
                        ? 'h-12 px-3.5 rounded-2xl bg-[#0053CD]/10 text-[#0053CD] flex items-center justify-between font-semibold text-[15px] transition'
                        : 'h-12 px-3.5 rounded-2xl text-[#191C20] hover:bg-black/[0.03] active:bg-black/[0.06] flex items-center justify-between font-medium text-[15px] transition'
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" strokeWidth={1.8} />
                          <span>{navLabel(item.label)}</span>
                        </div>
                        {isActive && (
                          <div className="w-7 h-7 rounded-full bg-[#0053CD]/15 flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}

              {user && (
                <NavLink
                  to="/account"
                  className={({ isActive }) =>
                    isActive
                      ? 'h-12 px-3.5 rounded-2xl bg-[#0053CD]/10 text-[#0053CD] flex items-center justify-between font-semibold text-[15px] transition'
                      : 'h-12 px-3.5 rounded-2xl text-[#191C20] hover:bg-black/[0.03] flex items-center justify-between font-medium text-[15px] transition'
                  }
                >
                  <div className="flex items-center gap-3">
                    <UserCircle2 className="w-5 h-5" strokeWidth={1.8} />
                    <span>{t('Account & Profile', 'അക്കൗണ്ടും പ്രൊഫൈലും')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                </NavLink>
              )}

              <div className="my-1.5 border-t border-black/[0.07]" />

              <div className="h-12 px-3.5 rounded-2xl flex items-center justify-between font-medium text-[15px]">
                <div className="flex items-center gap-3 text-[#191C20]">
                  <Globe className="w-5 h-5" strokeWidth={1.8} />
                  <span>{t('Portal Language', 'പോർട്ടൽ ഭാഷ')}</span>
                </div>
                <LanguageToggle variant="segmented" className="!h-8" />
              </div>

              <div className="my-1.5 border-t border-black/[0.07]" />

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-12 px-3.5 rounded-2xl text-[#E5484D] hover:bg-red-50/60 flex items-center gap-3 font-semibold text-[15px] transition text-left"
                >
                  <LogOut className="w-5 h-5" strokeWidth={1.8} />
                  <span>{t('Log out', 'ലോഗ് ഔട്ട്')}</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Link
                    to="/login"
                    className="h-11 rounded-2xl bg-[#1F6FFF]/10 text-[#0053CD] hover:bg-[#1F6FFF]/15 flex items-center justify-center gap-2 font-semibold text-[14px] transition"
                  >
                    <LogIn className="w-4 h-4" strokeWidth={2} />
                    <span>{t('Sign in', 'സൈൻ ഇൻ')}</span>
                  </Link>
                  <Link
                    to="/register"
                    className="h-11 rounded-2xl bg-[#1F6FFF] text-white hover:bg-[#155EE6] flex items-center justify-center gap-2 font-semibold text-[14px] shadow-sm shadow-blue-500/25 transition"
                  >
                    <UserPlus className="w-4 h-4" strokeWidth={2} />
                    <span>{t('Register', 'രജിസ്റ്റർ')}</span>
                  </Link>
                </div>
              )}
            </nav>
          </aside>
        </div>
      )}

      <main className="relative z-10 flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
