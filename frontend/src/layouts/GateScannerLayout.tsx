import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronDown, HardDriveDownload, LogOut, MapPin, Scan, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { currentGateOfficer } from '@/data/mockData';

export type GateScannerTab = 'live' | 'log' | 'lookup';

export interface GateScannerOutletContext {
  tab: GateScannerTab;
  setTab: (tab: GateScannerTab) => void;
  venue: string;
  setGateLogCount: (count: number) => void;
  isOnline: boolean;
  cacheSynced: boolean;
  setCacheSynced: (synced: boolean) => void;
}

const VENUES = ['Synthetic Track - Gate 2', 'Football Ground - Gate 1', 'Police Turf - Gate 3', 'Badminton Court - Gate 4'];

/** Access the scanner tab / venue state from a child route. */
export function useGateScanner() {
  return useOutletContext<GateScannerOutletContext>();
}

/**
 * Full-height kiosk shell for the Gate Verification Interface (/gate/scanner).
 * Extracted from: kannur_city_police_gate_scanner_field_device_page.
 */
export function GateScannerLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<GateScannerTab>('live');
  const [venueIdx, setVenueIdx] = useState(0);
  const [venueOpen, setVenueOpen] = useState(false);
  const [gateLogCount, setGateLogCount] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [cacheSynced, setCacheSynced] = useState<boolean>(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const officerName = user?.full_name ?? currentGateOfficer.name;
  const officerInitials = officerName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || currentGateOfficer.initials;
  const officerSub = user ? `@${user.username} • ${user.role}` : currentGateOfficer.deskId;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pill = (active: boolean) =>
    active
      ? 'px-3.5 py-1 rounded-full bg-blue-600 text-white font-semibold shadow-sm flex items-center gap-1.5'
      : 'px-3.5 py-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-white/60 transition';

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#F4F7FB] text-slate-900">
      <header className="glass-nav h-16 px-6 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[15px] tracking-tight text-slate-900">Kannur City Police</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-[14px] text-blue-700 bg-blue-50/90 border border-blue-200/80 px-2 py-0.5 rounded-md">
                Gate Entry Scanner
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Entrance Kiosk Telemetry • Turnstile Subsystem v4.2</div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setVenueOpen((o) => !o)}
              className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer transition text-[13px] font-semibold text-slate-800"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>{VENUES[venueIdx]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>
            {venueOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] w-64 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl p-1.5 z-50">
                {VENUES.map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setVenueIdx(i);
                      setVenueOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-medium ${
                      i === venueIdx ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/80 text-[12px] font-medium ml-2">
            <button type="button" className={pill(tab === 'live')} onClick={() => setTab('live')}>
              {tab === 'live' && <Scan className="w-3.5 h-3.5" />}
              <span>Live Scanner</span>
            </button>
            <button type="button" className={pill(tab === 'log')} onClick={() => setTab('log')}>
              Gate Log ({gateLogCount})
            </button>
            <button type="button" className={pill(tab === 'lookup')} onClick={() => setTab('lookup')}>
              Manual Lookup
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium shadow-sm ${
              isOnline
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className={`font-semibold ${isOnline ? 'text-emerald-900' : 'text-amber-900'}`}>
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
            <span className={isOnline ? 'text-emerald-300' : 'text-amber-300'}>•</span>
            <span>{cacheSynced ? 'Local Cache Synced' : 'Cache Ready'}</span>
          </div>
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/90 text-[11px] font-medium text-slate-600">
            <HardDriveDownload className="w-3 h-3 text-slate-500" />
            <span>Offline Ready</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
              {officerInitials}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[13px] font-semibold text-slate-900">{officerName}</div>
              <div className="text-[11px] text-slate-500 font-medium">{officerSub}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet
          context={
            {
              tab,
              setTab,
              venue: VENUES[venueIdx],
              setGateLogCount,
              isOnline,
              cacheSynced,
              setCacheSynced,
            } satisfies GateScannerOutletContext
          }
        />
      </main>
    </div>
  );
}
