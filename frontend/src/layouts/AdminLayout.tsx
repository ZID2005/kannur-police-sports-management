import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { BrandMark } from '@/components/ui/BrandMark';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { adminNav, currentStaff } from '@/data/mockData';
import '@/styles/adminOps.css';

const MOBILE_ADMIN_ICONS = {
  '/admin/dashboard': LayoutDashboard,
  '/admin/facilities': Building2,
  '/admin/bookings': CalendarDays,
  '/admin/members': Users,
  '/admin/payments': Wallet,
  '/admin/audit-log': History,
} as const;

function getInitials(name?: string | null): string {
  if (!name) return 'KP';
  const cleaned = name.replace(/\(.*?\)/g, '').replace(/^(inspector|insp\.|si|cpo)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'KP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getCompactOfficerName(name?: string | null): string {
  if (!name) return currentStaff.name;
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  if (/^inspector\s+/i.test(cleaned)) {
    const rest = cleaned.replace(/^inspector\s+/i, '').trim().split(/\s+/)[0] ?? '';
    return rest ? `Insp. ${rest}` : 'Inspector';
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return cleaned;
  return `${parts[0]} ${parts[1]}`;
}

/**
 * Shared floating Liquid Glass shell for all Staff & Officer Admin routes (/admin/*),
 * visually aligned with the Main UI header (PublicLayout) with smooth scroll morphing
 * and a gliding active navigation indicator.
 */
export function AdminLayout() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pillRect, setPillRect] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang, t } = useLanguage();

  const navLabel = useCallback(
    (label: string) => {
      if (label === 'Dashboard') return t('Dashboard', 'ഡാഷ്‌ബോർഡ്');
      if (label === 'Facilities & Slots') return t('Facilities & Slots', 'സൗകര്യങ്ങൾ');
      if (label === 'Bookings') return t('Bookings', 'ബുക്കിംഗുകൾ');
      if (label === 'Members') return t('Members', 'അംഗങ്ങൾ');
      if (label === 'Payments') return t('Payments', 'പേയ്‌മെന്റുകൾ');
      if (label === 'Audit Log') return t('Audit Log', 'ഓഡിറ്റ് ലോഗ്');
      return label;
    },
    [t]
  );

  const activeNavPath =
    adminNav.find(
      (item) =>
        location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    )?.to ?? '';

  const updateActivePill = useCallback(() => {
    const navEl = navRef.current;
    const activeEl = activeNavPath ? itemRefs.current[activeNavPath] : null;
    if (!navEl || !activeEl) {
      setPillRect((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    setPillRect({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
      ready: true,
    });
  }, [activeNavPath]);

  useLayoutEffect(() => {
    updateActivePill();
  }, [updateActivePill, lang, scrolled]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const observer = new ResizeObserver(() => updateActivePill());
    observer.observe(navEl);
    window.addEventListener('resize', updateActivePill);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) updateActivePill();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('resize', updateActivePill);
    };
  }, [updateActivePill]);

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
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setAccountOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const fullName = user?.full_name ?? currentStaff.name;
  const compactName = getCompactOfficerName(fullName);
  const initials = getInitials(fullName);
  const roleLabel =
    user?.role === 'STAFF_ADMIN'
      ? t('Sports Admin', 'സ്പോർട്സ് അഡ്മിൻ')
      : t('Department Staff', 'ഡിപ്പാർട്ട്മെന്റ് സ്റ്റാഫ്');

  return (
    <div className="min-h-screen relative flex flex-col bg-[#F6F8FC] font-sans text-[#0F172A] antialiased selection:bg-blue-100 selection:text-blue-900">
      <div className="print:hidden">
        <AmbientBackground />
      </div>

      {/* Sticky Floating Container-Aligned Header (matches Main UI PublicLayout) */}
      <header className="print:hidden sticky top-0 z-50 w-full px-3 sm:px-4 md:px-6 pt-3 md:pt-4 transition-all duration-300">
        <div
          className={`w-full max-w-[1440px] mx-auto h-[62px] md:h-[68px] rounded-[22px] md:rounded-full flex items-center justify-between gap-3 transition-all duration-300 ${
            scrolled
              ? 'px-4 md:px-5 bg-white/82 backdrop-blur-2xl border border-white/95 shadow-[0_14px_38px_-12px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.92)_inset]'
              : 'px-1 md:px-1 bg-transparent border border-transparent shadow-none'
          }`}
        >
          {/* Left: Brand Lockup (identical shield + lockup to Main UI) */}
          <div className="flex items-center shrink-0">
            <BrandMark
              to="/admin/dashboard"
              subtitle={t('Sports Administration', 'കായിക അഡ്മിനിസ്ട്രേഷൻ')}
            />
          </div>

          {/* Center: Floating Glass Navigation Capsule with Gliding Active Pill */}
          <nav
            ref={navRef}
            aria-label="Admin navigation"
            className={`relative hidden lg:flex items-center gap-0.5 rounded-full p-1 transition-all duration-300 ${
              scrolled
                ? 'bg-[#111418]/[0.04] border border-black/[0.045]'
                : 'bg-white/75 backdrop-blur-2xl border border-white/95 shadow-[0_8px_24px_-8px_rgba(31,111,255,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]'
            }`}
          >
            {/* Animated gliding white active indicator */}
            <span
              aria-hidden="true"
              className="admin-nav-pill-glide pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white border border-blue-100/70 shadow-[0_2px_10px_rgba(31,111,255,0.16)]"
              style={{
                width: `${pillRect.width}px`,
                transform: `translate3d(${pillRect.left}px, 0, 0)`,
                opacity: pillRect.ready ? 1 : 0,
              }}
            />

            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                ref={(el) => {
                  itemRefs.current[item.to] = el;
                }}
                className={({ isActive }) =>
                  `relative z-10 px-3.5 xl:px-4 py-2 rounded-full text-[13px] xl:text-[13.5px] tracking-[-0.01em] whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'text-[#1F6FFF] font-semibold'
                      : 'text-[#4B5563] hover:text-[#111418] hover:bg-white/50 font-medium'
                  }`
                }
              >
                {navLabel(item.label)}
              </NavLink>
            ))}
          </nav>

          {/* Right: Language Glass Pill + Compact Officer Profile Dropdown (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <LanguageToggle className="h-10 !px-3.5 !py-0 bg-white/75 border-white/95" />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Officer account menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((o) => !o)}
                className={`h-10 pl-1.5 pr-3 rounded-full flex items-center gap-2 transition-all duration-200 shadow-sm ${
                  accountOpen
                    ? 'bg-[#1F6FFF] text-white shadow-blue-500/25'
                    : 'bg-white/82 backdrop-blur-xl border border-white/95 text-[#111418] hover:bg-white hover:-translate-y-[0.5px]'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full text-[11.5px] font-bold flex items-center justify-center transition-colors ${
                    accountOpen
                      ? 'bg-white/20 text-white'
                      : 'bg-[#1F6FFF]/12 text-[#1F6FFF]'
                  }`}
                >
                  {initials}
                </span>
                <span className="text-[13.5px] font-semibold max-w-[118px] truncate">
                  {compactName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    accountOpen ? 'rotate-180 text-white/85' : 'text-[#6B7280]'
                  }`}
                />
              </button>

              {accountOpen && (
                <div
                  className="admin-dropdown-enter absolute right-0 top-[calc(100%+12px)] w-[290px] rounded-[24px] p-4 z-50 text-left"
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 20px 48px rgba(15, 23, 42, 0.14)',
                  }}
                >
                  <div className="pb-3 px-1">
                    <p className="font-display text-[15.5px] font-bold text-[#111418] leading-snug">
                      {fullName}
                    </p>
                    <p className="text-[12px] font-mono text-[#6B7280] mt-0.5 truncate">
                      {user ? `@${user.username}` : currentStaff.designation}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 border border-blue-200/80 text-[#0F50DC]">
                        <ShieldCheck className="w-3 h-3" />
                        {roleLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t('On Duty', 'സജീവം')}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-black/[0.06] my-1" />

                  <div className="py-1 flex flex-col gap-0.5">
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13.5px] font-medium text-[#111418] hover:bg-black/[0.04] transition-colors"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <LayoutDashboard className="w-4 h-4 text-[#1F6FFF]" />
                        {t('Command Dashboard', 'കമാൻഡ് ഡാഷ്‌ബോർഡ്')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    </Link>

                    <Link
                      to="/admin/audit-log"
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13.5px] font-medium text-[#111418] hover:bg-black/[0.04] transition-colors"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <History className="w-4 h-4 text-[#1F6FFF]" />
                        {t('Audit & Activity Log', 'ഓഡിറ്റ് ലോഗ്')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    </Link>

                    <Link
                      to="/"
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[13.5px] font-medium text-[#111418] hover:bg-black/[0.04] transition-colors"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <ExternalLink className="w-4 h-4 text-[#1F6FFF]" />
                        {t('Public Member Portal', 'പൊതു പോർട്ടൽ')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    </Link>
                  </div>

                  <div className="h-px bg-black/[0.06] my-1" />

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13.5px] font-semibold text-[#E5484D] hover:bg-red-500/[0.07] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('Sign out', 'ലോഗ് ഔട്ട്')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile / Tablet Right Controls */}
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/85 border border-white text-[12.5px] font-semibold text-[#111418] shadow-sm">
              <span className="w-5 h-5 rounded-full bg-[#1F6FFF]/12 text-[#1F6FFF] text-[10px] font-bold flex items-center justify-center">
                {initials}
              </span>
              <span className="max-w-[100px] truncate">{compactName}</span>
            </span>

            <button
              type="button"
              aria-label="Open admin menu"
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 rounded-full bg-white/85 border border-white flex items-center justify-center text-[#191C20] shadow-sm hover:bg-white active:scale-95 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Sliding Glass Sheet (matches Main UI PublicLayout) */}
      {mobileOpen && (
        <div className="print:hidden lg:hidden fixed inset-0 z-[60]">
          <div
            className="admin-backdrop-enter absolute inset-0 bg-slate-900/25 backdrop-blur-[5px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="admin-sheet-enter relative z-10 w-full rounded-b-[34px] px-5 sm:px-6 pt-5 pb-7 flex flex-col gap-1.5"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.16)',
            }}
          >
            <div className="flex items-center justify-between pb-3">
              <BrandMark
                to="/admin/dashboard"
                subtitle={t('Sports Administration', 'കായിക അഡ്മിനിസ്ട്രേഷൻ')}
              />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="w-10 h-10 rounded-full bg-white/90 border border-slate-200/80 hover:bg-white active:scale-95 flex items-center justify-center text-[#191C20] transition shadow-sm"
              >
                <X className="w-5 h-5" strokeWidth={1.6} />
              </button>
            </div>

            <nav aria-label="Admin mobile navigation" className="flex flex-col gap-1">
              {adminNav.map((item) => {
                const Icon =
                  MOBILE_ADMIN_ICONS[item.to as keyof typeof MOBILE_ADMIN_ICONS] ??
                  LayoutDashboard;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      isActive
                        ? 'h-12 px-3.5 rounded-2xl bg-[#1F6FFF]/10 text-[#1F6FFF] flex items-center justify-between font-semibold text-[15px] transition'
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
                          <div className="w-7 h-7 rounded-full bg-[#1F6FFF]/15 flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}

              <div className="my-1.5 border-t border-black/[0.07]" />

              <div className="h-12 px-3.5 rounded-2xl flex items-center justify-between font-medium text-[15px]">
                <div className="flex items-center gap-3 text-[#191C20]">
                  <Globe className="w-5 h-5" strokeWidth={1.8} />
                  <span>{t('Portal Language', 'പോർട്ടൽ ഭാഷ')}</span>
                </div>
                <LanguageToggle variant="segmented" className="!h-8" />
              </div>

              <Link
                to="/"
                className="h-11 px-3.5 rounded-2xl text-[#4B5563] hover:bg-black/[0.03] flex items-center justify-between font-medium text-[14.5px] transition"
              >
                <span className="inline-flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-[#1F6FFF]" />
                  <span>{t('Public Member Portal', 'പൊതു പോർട്ടൽ')}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
              </Link>

              <div className="my-1.5 border-t border-black/[0.07]" />

              <div className="px-3.5 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[14px] font-bold text-[#111418] truncate">
                    {fullName}
                  </p>
                  <p className="text-[12px] font-mono text-[#6B7280] truncate">
                    {user ? `@${user.username}` : currentStaff.designation} · {roleLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-10 px-3.5 rounded-xl bg-red-50 text-[#E5484D] hover:bg-red-100/70 inline-flex items-center gap-1.5 font-semibold text-[13.5px] shrink-0 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('Sign out', 'ലോഗ് ഔട്ട്')}</span>
                </button>
              </div>
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
