import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useAuth } from '@/context/AuthContext';
import { adminNav, currentStaff } from '@/data/mockData';

/**
 * Shared shell for all Staff & Officer Admin routes (/admin/*).
 * Extracted from the header common to: administrative_dashboard, membership_review_approval_detail_view,
 * facilities_slot_management, payment_management_financial_reports, gate_entries_manual_override_logs,
 * system_audit_log. Bottom footer bars from the raw exports are intentionally removed.
 */
export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  useEffect(() => window.scrollTo(0, 0), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface font-body-default text-on-surface antialiased">
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 w-full px-margin-desktop flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-lg min-w-0">
            <NavLink to="/admin/dashboard" className="flex items-center gap-space-sm shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_12px_rgba(0,83,205,0.24)]">
                <MaterialIcon name="local_police" className="text-[24px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-card text-headline-card text-on-surface tracking-tight leading-tight">Kannur City Police</span>
                <span className="font-label-meta text-label-meta text-primary font-medium tracking-wide">Sports Administration Portal</span>
              </div>
            </NavLink>
            <div className="h-8 w-px bg-surface-container-high hidden xl:block" />
            <nav className="hidden lg:flex items-center gap-space-xs p-1 bg-surface-container-low/60 rounded-xl overflow-x-auto no-scrollbar">
              {adminNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'px-3.5 py-2 whitespace-nowrap transition-all bg-primary-container text-on-primary-container font-label-primary text-label-primary rounded-xl shadow-[0_4px_12px_rgba(22,107,251,0.2)]'
                      : 'px-3.5 py-2 whitespace-nowrap rounded-lg font-label-primary text-label-primary text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-space-md">
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="font-caption text-caption text-secondary font-medium">Turnstiles Connected • Gate 2 Active</span>
            </div>
            <LanguageToggle variant="admin" />
            <button
              type="button"
              aria-label="Notifications"
              className="relative p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <MaterialIcon name="notifications" className="text-[22px]" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
            </button>
            <div className="h-8 w-px bg-surface-container-high hidden md:block" />
            <div className="flex items-center gap-space-sm pl-1">
              <div className="hidden md:flex flex-col text-right">
                <span className="font-label-primary text-label-primary text-on-surface font-semibold leading-tight">
                  {user?.full_name ?? currentStaff.name}
                </span>
                <span className="font-caption text-caption text-secondary flex items-center justify-end gap-1">
                  <MaterialIcon name="verified_user" className="text-[13px] text-primary" />
                  {user ? `@${user.username} • STAFF_ADMIN` : currentStaff.designation}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <MaterialIcon name="person" className="text-on-primary text-[18px]" />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
              >
                <MaterialIcon name="logout" className="text-[20px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact nav for < lg screens */}
        <nav className="lg:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? 'px-3 py-1.5 whitespace-nowrap rounded-lg bg-primary-container text-on-primary-container font-label-meta text-label-meta'
                  : 'px-3 py-1.5 whitespace-nowrap rounded-lg text-on-surface-variant hover:bg-surface-container font-label-meta text-label-meta'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="relative w-full pt-[124px] lg:pt-20 bg-surface min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
