import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { ApiGateSyncCacheEntry } from '@/api/client';
import {
  gateEntryLogs,
  gateScannerProfiles,
  gateScannerRecentQueries,
} from '@/data/mockData';
import type { GateEntryRecord, GateScanState } from '@/types/gate';

interface GateScannerLogViewProps {
  venue: string;
  entries: GateEntryRecord[];
  onSwitchToLive: () => void;
}

export function GateScannerLogView({
  venue,
  entries,
  onSwitchToLive,
}: GateScannerLogViewProps) {
  const [search, setSearch] = useState('');

  const filtered = entries.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.memberName.toLowerCase().includes(q) ||
      row.passId.toLowerCase().includes(q) ||
      row.facility.toLowerCase().includes(q) ||
      row.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/80 flex-1 flex flex-col justify-between min-h-0">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">
              Field Device Gate Log • {venue}
            </h2>
            <p className="text-[12px] text-slate-500">
              Local cached turnstile events synced with Kannur City Police Central Vault
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter pass ID or member..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-[12px] text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <Link
              to="/admin/gate-entries"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[12px] font-semibold flex items-center gap-1 transition"
            >
              <span>Full Admin Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-100/80 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l-lg">Time</th>
                <th className="py-2.5 px-3">Member / Pass ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Gate</th>
                <th className="py-2.5 px-3">Verification</th>
                <th className="py-2.5 px-3 rounded-r-lg text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono text-[12px] font-semibold text-slate-800">
                    {item.time}
                    <span className="block text-[10px] font-normal text-slate-400">
                      {item.date}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{item.memberName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{item.passId}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{item.facility}</td>
                  <td className="py-3 px-3 text-slate-600 text-[12px]">{item.verificationStage}</td>
                  <td className="py-3 px-3 text-right">
                    {item.status === 'Granted' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Granted
                      </span>
                    ) : item.status === 'Override' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                        <ShieldCheck className="w-3 h-3" /> Override
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                        <ShieldAlert className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500">
        <span>Showing {filtered.length} recent cached turnstile events on this kiosk</span>
        <button
          type="button"
          onClick={onSwitchToLive}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[12px] transition"
        >
          Return to Live Scanner
        </button>
      </div>
    </div>
  );
}

interface GateScannerManualLookupViewProps {
  onSelectLookupResult: (code: string, state: GateScanState) => void;
  cachedEntries?: ApiGateSyncCacheEntry[];
  recentLogs?: GateEntryRecord[];
}

export function GateScannerManualLookupView({
  onSelectLookupResult,
  cachedEntries = [],
  recentLogs,
}: GateScannerManualLookupViewProps) {
  const [query, setQuery] = useState(
    cachedEntries[0]?.pass_or_booking_code ?? 'KCP-PUB-2026-'
  );

  const sourceLogs = recentLogs ?? gateEntryLogs;
  const matchingEntries = sourceLogs.filter((entry) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      entry.passId.toLowerCase().includes(q) ||
      entry.memberName.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q)
    );
  });

  const matchingCache = cachedEntries.filter((entry) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      entry.pass_or_booking_code.toLowerCase().includes(q) ||
      entry.user_full_name.toLowerCase().includes(q) ||
      entry.facility_code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/80 flex-1 flex flex-col justify-between min-h-0">
      <div>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">
                Manual Pass, Booking Ref &amp; Challan Lookup
              </h2>
              <p className="text-[12px] text-slate-500">
                Verify citizen membership passes or hourly turf bookings when optical QR is damaged
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Membership ID (e.g. KCP-PUB-2024-3194), Booking Ref, or Name..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            type="button"
            onClick={() => onSelectLookupResult(query, 'valid')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition shrink-0"
          >
            Load in Stage 2 Verifier
          </button>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Quick Test Profiles (Simulated Kiosk Cache)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['valid', 'expired', 'invalid'] as const).map((stateKey) => {
              const prof = gateScannerProfiles[stateKey];
              return (
                <div
                  key={stateKey}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-[14px]">{prof.name}</div>
                      <div className="font-mono text-[12px] text-blue-700 font-semibold">
                        {prof.passIdDisplay}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {prof.venueAndPassType}
                      </div>
                    </div>
                    {stateKey === 'valid' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> Active
                      </span>
                    ) : stateKey === 'expired' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Expired
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Alert
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLookupResult(prof.lookupCode, stateKey)}
                    className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold transition"
                  >
                    Verify Profile in Scanner
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {matchingCache.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Offline Sync Cache Manifest ({matchingCache.length} Active Passes / Bookings)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchingCache.slice(0, 6).map((item) => (
                <button
                  key={item.pass_or_booking_code}
                  type="button"
                  onClick={() => onSelectLookupResult(item.pass_or_booking_code, 'valid')}
                  className="p-2.5 rounded-xl bg-blue-50/40 hover:bg-blue-50 border border-blue-200/70 text-left flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-mono font-bold text-[12px] text-slate-800">
                      {item.pass_or_booking_code}
                    </span>
                    <span className="text-[12px] text-slate-600 ml-2">
                      {item.user_full_name} ({item.facility_code})
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-600 font-semibold">Verify →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {matchingEntries.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Matching Recent Gate Records ({matchingEntries.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gateScannerRecentQueries.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onSelectLookupResult(item.code, item.scanState)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 text-left flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-mono font-bold text-[12px] text-slate-800">
                      {item.code}
                    </span>
                    <span className="text-[12px] text-slate-600 ml-2">{item.name}</span>
                  </div>
                  <span className="text-[11px] text-blue-600 font-semibold">{item.type} →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
