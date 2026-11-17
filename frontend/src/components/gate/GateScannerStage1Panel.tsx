import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Focus,
  QrCode,
  Search,
  Sparkles,
} from 'lucide-react';
import { gateScannerRecentQueries, gateScannerTelemetry } from '@/data/mockData';
import type { GateScanState } from '@/types/gate';

interface GateScannerStage1PanelProps {
  scanState: GateScanState;
  detectedLabel: string;
  lookupInput: string;
  onLookupInputChange: (value: string) => void;
  onCheckId: (code: string) => void;
  onSelectScanState: (state: GateScanState) => void;
}

export function GateScannerStage1Panel({
  scanState,
  detectedLabel,
  lookupInput,
  onLookupInputChange,
  onCheckId,
  onSelectScanState,
}: GateScannerStage1PanelProps) {
  const [showRecentQueries, setShowRecentQueries] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;
    onCheckId(lookupInput.trim());
  };

  const detectedBadgeColor =
    scanState === 'valid'
      ? 'text-emerald-400'
      : scanState === 'expired'
        ? 'text-amber-400'
        : 'text-rose-400';

  return (
    <section className="glass-card rounded-2xl p-5 flex flex-col justify-between h-full border border-white/80">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                Stage 1: Optical QR Code Scanner
              </h2>
              <p className="text-[12px] text-slate-500">
                Scan Public Membership Pass or Hourly Slot QR Ticket
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            {gateScannerTelemetry.cameraBadge}
          </div>
        </div>

        {/* Camera Viewfinder Frame */}
        <div className="relative glass-panel-dark rounded-xl h-[260px] 2xl:h-[300px] flex flex-col items-center justify-center overflow-hidden text-center p-4">
          {/* Grid Background Overlay */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Laser scan line */}
          <div className="scan-reticle flex items-center justify-center">
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />
            <div className="scan-laser" />

            {/* Optical QR icon graphic inside */}
            <div className="w-20 h-20 bg-blue-500/10 rounded-xl border border-blue-400/30 flex items-center justify-center text-blue-300">
              <QrCode className="w-12 h-12 stroke-[1.5]" />
            </div>
          </div>

          {/* Overlay Scanning Guides */}
          <div className="absolute top-3 left-4 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Focus className="w-3.5 h-3.5 text-blue-400" />
            {gateScannerTelemetry.autoFocusLabel}
          </div>
          <div
            className={`absolute top-3 right-4 text-[11px] ${detectedBadgeColor} font-mono font-medium flex items-center gap-1`}
          >
            {scanState === 'valid' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : scanState === 'expired' ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {detectedLabel}
          </div>

          <div className="absolute bottom-3 inset-x-0 text-center">
            <span className="inline-block bg-slate-900/80 backdrop-blur-md px-4 py-1 rounded-full text-slate-300 text-[12px] font-medium border border-white/10">
              {gateScannerTelemetry.reticleHint}
            </span>
          </div>
        </div>

        {/* Simulated Scan Result Switcher (Valid / Expired / Invalid) */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Simulate Optical Scan:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectScanState('valid')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                scanState === 'valid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Valid Pass
            </button>
            <button
              type="button"
              onClick={() => onSelectScanState('expired')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                scanState === 'expired'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Expired Pass
            </button>
            <button
              type="button"
              onClick={() => onSelectScanState('invalid')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                scanState === 'invalid'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Biometric Alert
            </button>
          </div>
        </div>
      </div>

      {/* Manual Lookup Form at bottom of Left Panel */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
          Manual Pass / Booking ID Lookup
        </label>
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => onLookupInputChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              placeholder="e.g. KCP-PUB-2024-XXXX"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-semibold transition flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            Check ID
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
          <span>{gateScannerTelemetry.lookupHelperText}</span>
          <button
            type="button"
            onClick={() => setShowRecentQueries((prev) => !prev)}
            className="text-blue-600 font-semibold cursor-pointer hover:underline"
          >
            {gateScannerTelemetry.recentQueriesLabel}
          </button>
        </div>

        {showRecentQueries && (
          <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-1.5">
            {gateScannerRecentQueries.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  onLookupInputChange(item.code);
                  onSelectScanState(item.scanState);
                  setShowRecentQueries(false);
                }}
                className="text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50/60 border border-slate-200/70 transition flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-bold text-slate-800 truncate">
                    {item.code}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {item.name} • {item.type}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
