import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Check, ChevronRight, CreditCard, Globe, Home, LogIn, LogOut, Menu, User, X } from 'lucide-react';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { BrandMark } from '@/components/ui/BrandMark';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useAuth } from '@/context/AuthContext';
import { publicNav } from '@/data/mockData';

interface PublicLayoutProps {
  /**
   * `app`  – signed-in citizen header (brand, nav pills, language, notifications, account menu)
   * `auth` – minimal header used on Sign in / Create account (brand + segmented language toggle)
   */
  variant?: 'app' | 'auth';
}

const mobileIcons = { Home, Bookings: CalendarDays, Membership: CreditCard } as const;

/**
 * Shared shell for all Public User routes.
 * Extracted from: kannur_city_police_home_* , kannur_city_police_mobile_home_menu_open,
 * kannur_city_police_sign_in_error / create_account_* (auth variant).
 * Bottom footer bars from the raw exports are intentionally removed.
 */
export function PublicLayout({ variant = 'app' }: PublicLayoutProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (variant === 'auth') {
    return (
      <div className="min-h-screen relative flex flex-col selection:bg-blue-100 selection:text-blue-900">
        <AmbientBackground />
        <header className="liquid-glass-bar relative z-20 w-full h-[72px] px-5 sm:px-8 md:px-12 flex items-center justify-between">
          <BrandMark variant="tint" />
          <LanguageToggle variant="segmented" />
        </header>
        <main className="relative z-10 flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <AmbientBackground />

      <header className="sticky top-0 z-50 w-full h-14 md:h-[72px] liquid-glass border-b border-white/60 px-5 md:px-8 flex items-center justify-between">
        <BrandMark />

        {/* Center nav pills (desktop) */}
        <nav className="hidden md:flex liquid-glass rounded-full p-1.5 items-center gap-1 shadow-sm">
          {publicNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? 'px-5 py-2 rounded-full bg-[#1F6FFF]/10 text-[#1F6FFF] text-[15px] font-semibold transition'
                  : 'px-5 py-2 rounded-full text-[#6B7280] hover:text-[#111418] text-[15px] font-medium transition'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="w-11 h-11 rounded-full liquid-glass flex items-center justify-center text-[#111418] hover:bg-white/80 transition relative shadow-sm"
          >
            <Bell className="w-5 h-5" strokeWidth={1.8} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#1F6FFF]" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Account"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((o) => !o)}
              className={
                accountOpen
                  ? 'w-11 h-11 rounded-full bg-[#1F6FFF] flex items-center justify-center text-white transition shadow-sm shadow-blue-500/25'
                  : 'w-11 h-11 rounded-full liquid-glass flex items-center justify-center text-[#1F6FFF] hover:bg-white/80 transition shadow-sm'
              }
            >
              <User className="w-5 h-5" strokeWidth={1.8} />
            </button>
            {accountOpen && (
              <div
                className="absolute right-0 top-[calc(100%+12px)] w-[260px] rounded-[24px] p-4 z-50 text-left"
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: 'rgba(15, 23, 42, 0.12) 0px 12px 36px',
                }}
              >
                <div className="pb-3 px-1">
                  <p className="text-[17px] font-semibold text-[#111418] leading-tight">
                    {user ? user.full_name : 'Guest Visitor'}
                  </p>
                  <p className="text-[13px] text-[#6B7280] mt-0.5">
                    {user ? `@${user.username} • Signed in` : 'Not signed in'}
                  </p>
                </div>
                <div className="h-px bg-black/[0.06] my-1" />
                <div className="py-1 flex flex-col gap-0.5">
                  {['Terms and conditions', 'Privacy notice'].map((label) => (
                    <a
                      key={label}
                      href="#"
                      className="flex items-center justify-between px-2 py-2 rounded-xl text-[14px] font-medium text-[#111418] hover:bg-black/[0.04] transition"
                    >
                      <span>{label}</span>
                      <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    </a>
                  ))}
                </div>
                <div className="h-px bg-black/[0.06] my-1" />
                <div className="pt-1">
                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-[14px] font-medium text-[#E5484D] hover:bg-red-500/[0.06] transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-[14px] font-medium text-[#1F6FFF] hover:bg-blue-500/[0.06] transition"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign in</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="md:hidden w-9 h-9 rounded-full bg-white/80 border border-white flex items-center justify-center text-[#191C20]"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile sliding glass sheet (kannur_city_police_mobile_home_menu_open) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[5px]" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative z-10 w-full rounded-b-[34px] px-6 pt-5 pb-7 flex flex-col gap-1.5"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 20px 50px rgba(15,23,42,0.15)',
            }}
          >
            <div className="flex items-center justify-end pb-2">
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
                          <span>{item.label}</span>
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
              <div className="my-1.5 border-t border-black/[0.07]" />
              {['Terms and conditions', 'Privacy notice'].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="h-12 px-3.5 rounded-2xl text-[#191C20] hover:bg-black/[0.03] flex items-center justify-between font-medium text-[15px] transition"
                >
                  <span>{label}</span>
                  <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                </a>
              ))}
              <div className="h-12 px-3.5 rounded-2xl flex items-center justify-between font-medium text-[15px]">
                <div className="flex items-center gap-3 text-[#191C20]">
                  <Globe className="w-5 h-5" strokeWidth={1.8} />
                  <span>Portal Language</span>
                </div>
                <LanguageToggle variant="segmented" className="!h-8" />
              </div>
              <div className="my-1.5 border-t border-black/[0.07]" />
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-12 px-3.5 rounded-2xl text-[#E5484D] hover:bg-red-50/60 flex items-center gap-3 font-medium text-[15px] transition text-left"
                >
                  <LogOut className="w-5 h-5" strokeWidth={1.8} />
                  <span>Log out</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="h-12 px-3.5 rounded-2xl text-[#0053CD] hover:bg-blue-50/60 flex items-center gap-3 font-medium text-[15px] transition"
                >
                  <LogIn className="w-5 h-5" strokeWidth={1.8} />
                  <span>Sign in</span>
                </Link>
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
