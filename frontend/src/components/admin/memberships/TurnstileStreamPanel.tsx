import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type {
  AdminTurnstileEvent,
  AdminTurnstileGateFilter,
  AdminTurnstileGateOption,
} from '@/types/adminMemberships';

export interface TurnstileStreamPanelProps {
  gateOptions: AdminTurnstileGateOption[];
  events: AdminTurnstileEvent[];
  onActionNotice?: (message: string) => void;
}

export function TurnstileStreamPanel({
  gateOptions,
  events,
  onActionNotice,
}: TurnstileStreamPanelProps) {
  const navigate = useNavigate();
  const [selectedGate, setSelectedGate] = useState<AdminTurnstileGateFilter>('ALL');
  const [turnstilesLocked, setTurnstilesLocked] = useState(false);
  const [flaggedEventIds, setFlaggedEventIds] = useState<string[]>([]);

  const filteredEvents =
    selectedGate === 'ALL'
      ? events
      : events.filter((evt) => evt.gateCategory === selectedGate);

  const handleFlagSecurityAlert = (evt: AdminTurnstileEvent) => {
    if (!flaggedEventIds.includes(evt.id)) {
      setFlaggedEventIds((prev) => [...prev, evt.id]);
    }
    onActionNotice?.(
      `Security alert logged for ${evt.personName} (${evt.locationMeta}). Gate duty post notified.`
    );
  };

  const handleToggleEmergencyLock = () => {
    const nextLocked = !turnstilesLocked;
    setTurnstilesLocked(nextLocked);
    onActionNotice?.(
      nextLocked
        ? 'Emergency Safe-Lock activated on Pavilion Gate 2 & Turf turnstiles.'
        : 'Turnstile Emergency Safe-Lock released. Normal biometric lane operation resumed.'
    );
  };

  return (
    <section className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-md">
      {/* Turnstile Header */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  turnstilesLocked ? 'bg-error' : 'bg-primary'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  turnstilesLocked ? 'bg-error' : 'bg-primary'
                }`}
              />
            </span>
            <h2 className="font-headline-card text-headline-card text-on-surface font-semibold tracking-tight">
              Turnstile Stream
            </h2>
          </div>
          <span className="font-caption text-caption text-secondary font-medium">
            {turnstilesLocked ? 'Safe-Lock Active' : 'Pavilion Gate 2'}
          </span>
        </div>
        <p className="font-caption text-caption text-on-surface-variant">
          Live biometric telemetry from entrance lanes &amp; fields.
        </p>
      </div>

      {/* Filter Pill Bar */}
      <div className="flex items-center p-1 rounded-xl bg-surface-container-low text-on-surface-variant font-label-meta text-label-meta">
        {gateOptions.map((opt) => {
          const active = selectedGate === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedGate(opt.id)}
              className={
                active
                  ? 'flex-1 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-semibold shadow-xs transition-all'
                  : 'flex-1 py-1.5 rounded-lg hover:text-on-surface transition-colors'
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Real-Time Activity Feed */}
      <div className="flex flex-col gap-space-sm">
        {filteredEvents.map((evt, idx) => {
          const isFlagged = flaggedEventIds.includes(evt.id);
          if (!evt.granted) {
            return (
              <div
                key={evt.id}
                className="p-3 rounded-2xl bg-error-container/40 flex items-start gap-3 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-error flex items-center justify-center text-on-error shrink-0 mt-0.5">
                  <MaterialIcon name={evt.icon} className="text-[18px]" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-label-primary text-label-primary font-bold text-error truncate">
                      {evt.personName}
                    </span>
                    <span className="font-caption text-caption text-error font-semibold shrink-0">
                      {evt.timeLabel}
                    </span>
                  </div>
                  <span className="font-caption text-caption text-on-surface-variant">
                    {evt.locationMeta}
                  </span>
                  <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-error text-on-error font-caption text-caption font-bold">
                      {evt.statusBadge}
                    </span>
                    {evt.alertActionLabel && (
                      <button
                        type="button"
                        onClick={() => handleFlagSecurityAlert(evt)}
                        className="text-caption font-caption text-error font-bold hover:underline"
                      >
                        {isFlagged ? 'Alert Dispatched' : evt.alertActionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={evt.id}
              className="p-3 rounded-2xl bg-surface-container-low flex items-start gap-3 transition-all hover:bg-surface-container"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 mt-0.5">
                <MaterialIcon name={evt.icon} className="text-[18px]" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-label-primary text-label-primary font-bold text-on-surface truncate">
                    {evt.personName}
                  </span>
                  <span
                    className={`font-caption text-caption shrink-0 ${
                      idx === 0 ? 'text-primary font-semibold' : 'text-outline'
                    }`}
                  >
                    {evt.timeLabel}
                  </span>
                </div>
                <span className="font-caption text-caption text-secondary">
                  {evt.locationMeta}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-caption text-caption font-semibold">
                    {evt.statusBadge}
                  </span>
                  <span className="font-caption text-caption text-outline">
                    {evt.methodLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Turnstile Action Controls */}
      <div className="pt-2 flex flex-col gap-2 border-t border-surface-container">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('/gate/scanner')}
            className="px-3 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-meta text-label-meta font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MaterialIcon name="qr_code_scanner" className="text-[18px] text-primary" />
            <span>Manual Scan</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/gate-entries')}
            className="px-3 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-meta text-label-meta font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MaterialIcon name="door_sensor" className="text-[18px] text-secondary" />
            <span>Gate Override Logs</span>
          </button>
        </div>
        <button
          type="button"
          onClick={handleToggleEmergencyLock}
          className={`w-full px-3 py-2 rounded-xl font-caption text-caption font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            turnstilesLocked
              ? 'bg-error text-on-error'
              : 'bg-surface-container-low hover:bg-error-container text-outline hover:text-on-error-container'
          }`}
        >
          <MaterialIcon name="emergency_home" className="text-[16px]" />
          <span>
            {turnstilesLocked
              ? 'Release Turnstile Safe-Lock'
              : 'Emergency Safe-Lock Turnstiles'}
          </span>
        </button>
      </div>
    </section>
  );
}
