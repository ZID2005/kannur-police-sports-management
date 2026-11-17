import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  RotateCcw,
  Unlock,
  X,
} from 'lucide-react';
import {
  ApiError,
  adminApi,
  gateApi,
  type ApiGateSyncCacheManifest,
  type ApiGateVerifyResponse,
  type BackendFacilityCode,
  type BackendVerificationType,
} from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useGateScanner } from '@/layouts/GateScannerLayout';
import { GateScannerStage1Panel } from '@/components/gate/GateScannerStage1Panel';
import { GateScannerStage2Panel } from '@/components/gate/GateScannerStage2Panel';
import {
  GateScannerLogView,
  GateScannerManualLookupView,
} from '@/components/gate/GateScannerTabViews';
import {
  currentGateOfficer,
  gateScannerProfiles,
  gateScannerQuickGates,
  gateScannerTelemetry,
} from '@/data/mockData';
import type { GateEntryRecord, GateScannerMemberProfile, GateScanState } from '@/types/gate';
import { mapApiGateLogToRecord } from '@/utils/adminMappers';
import '@/styles/gate.css';

const OFFLINE_MANIFEST_KEY = 'kcp_gate_offline_manifest';
const OFFLINE_QUEUE_KEY = 'kcp_gate_offline_queue';

interface QueuedOfflineScan {
  facility_code: BackendFacilityCode;
  gate_name: string;
  user_id?: string;
  pass_or_booking_code: string;
  verification_type: BackendVerificationType;
  stage1_qr_passed: boolean;
  stage2_biometric_passed: boolean;
  access_granted: boolean;
  failure_or_override_reason?: string | null;
  scanned_at: string;
}

function gateLabelToFacilityCode(label: string): BackendFacilityCode {
  const lower = label.toLowerCase();
  if (lower.includes('football')) return 'FOOTBALL_GROUND';
  if (lower.includes('turf')) return 'POLICE_TURF';
  if (lower.includes('badminton')) return 'BADMINTON_COURT';
  return 'SYNTHETIC_TRACK';
}

function readOfflineManifest(): ApiGateSyncCacheManifest | null {
  try {
    const raw = window.localStorage.getItem(OFFLINE_MANIFEST_KEY);
    return raw ? (JSON.parse(raw) as ApiGateSyncCacheManifest) : null;
  } catch {
    return null;
  }
}

function readOfflineQueue(): QueuedOfflineScan[] {
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedOfflineScan[]) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: QueuedOfflineScan[]): void {
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota errors
  }
}

function mapVerifyResponseToProfile(
  res: ApiGateVerifyResponse,
  facilityCode: BackendFacilityCode
): GateScannerMemberProfile {
  const isTrack = facilityCode === 'SYNTHETIC_TRACK';
  const granted = res.access_granted;
  const base = granted
    ? gateScannerProfiles.valid
    : res.failure_or_override_reason?.toLowerCase().includes('window') ||
      res.failure_or_override_reason?.toLowerCase().includes('past')
      ? gateScannerProfiles.expired
      : gateScannerProfiles.invalid;

  const holder = res.holder;
  return {
    ...base,
    scanState: granted ? 'valid' : base.scanState === 'expired' ? 'expired' : 'invalid',
    lookupCode: holder?.pass_or_booking_code ?? res.gate_log.pass_or_booking_code,
    passIdDisplay: holder?.pass_or_booking_code ?? res.gate_log.pass_or_booking_code,
    name: holder?.full_name ?? 'Unrecognized Pass Holder',
    categoryBadge:
      holder?.role === 'GOVT_PERSONNEL'
        ? 'Govt Personnel'
        : holder?.role === 'PUBLIC'
          ? 'General Public'
          : 'Registry Check',
    photoUrl: holder?.profile_photo_url || base.photoUrl,
    venueAndPassType: isTrack
      ? 'Synthetic Track • Monthly Pass'
      : `${facilityCode} • Hourly Slot`,
    permittedSlotWindow:
      holder?.start_time && holder?.end_time
        ? `${holder.start_time} – ${holder.end_time}`
        : holder?.session_window
          ? `${holder.session_window} WINDOW`
          : 'Standard Hours',
    validityPeriod: holder?.booking_date
      ? `${holder.booking_date} (${holder.court_partition ?? 'FULL'})`
      : holder?.status ?? res.verification_type,
    stage1StatusText: res.stage1_qr_passed ? 'STAGE 1 QR PASSED' : 'STAGE 1 QR FAILED',
    stage1DetectedLabel: res.stage1_qr_passed
      ? `Verified: ${res.gate_log.pass_or_booking_code}`
      : 'QR Verification Failed',
    stage2Title: isTrack
      ? res.stage2_biometric_passed
        ? 'Stage 2: Biometric Match Confirmed'
        : 'Stage 2: Biometric Verification Required'
      : '1-Stage QR-Only Venue Clearance',
    stage2Subtitle:
      res.failure_or_override_reason ||
      (granted
        ? isTrack
          ? 'Dual-factor QR + Biometric verification succeeded.'
          : '1-stage QR verification succeeded (biometric exempt on hourly courts).'
        : 'Verification failed.'),
    turnstileBadgeText: granted ? 'ACCESS GRANTED' : 'ACCESS DENIED',
    biometricHash: res.gate_log.id.slice(0, 16),
    cycleStatusText: granted ? 'Turnstile Unlocked' : 'Gate Locked',
  };
}

export default function GateScannerPage() {
  const { user } = useAuth();
  const { tab, setTab, venue, setGateLogCount, isOnline, setCacheSynced } = useGateScanner();
  const [selectedQuickGate, setSelectedQuickGate] = useState<string>(gateScannerQuickGates[0]);
  const [scanState, setScanState] = useState<GateScanState>('valid');
  const [lookupInput, setLookupInput] = useState<string>('');
  const [liveProfile, setLiveProfile] = useState<GateScannerMemberProfile | null>(null);
  const [kioskLogs, setKioskLogs] = useState<GateEntryRecord[]>([]);
  const [manifest, setManifest] = useState<ApiGateSyncCacheManifest | null>(() =>
    readOfflineManifest()
  );
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(
    () => readOfflineQueue().length
  );
  const [kioskToast, setKioskToast] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const activeFacilityCode = gateLabelToFacilityCode(selectedQuickGate || venue);
  const isSyntheticTrack = activeFacilityCode === 'SYNTHETIC_TRACK';
  const activeProfile = liveProfile ?? gateScannerProfiles[scanState];

  const syncManifestAndLogs = useCallback(async () => {
    try {
      const [cacheRes, logsRes] = await Promise.all([
        gateApi.syncCache(),
        adminApi.listGateLogs({ limit: 30 }).catch(() => null),
      ]);

      setManifest(cacheRes);
      setCacheSynced(true);
      try {
        window.localStorage.setItem(OFFLINE_MANIFEST_KEY, JSON.stringify(cacheRes));
      } catch {
        // Ignore storage quota errors
      }

      if (logsRes) {
        const mapped = logsRes.gate_logs.map(mapApiGateLogToRecord);
        setKioskLogs(mapped);
        setGateLogCount(logsRes.pagination.total_records);
      }
    } catch {
      const cached = readOfflineManifest();
      if (cached) {
        setManifest(cached);
        setCacheSynced(true);
      }
    }
  }, [setCacheSynced, setGateLogCount]);

  const flushOfflineQueue = useCallback(async () => {
    const queue = readOfflineQueue();
    if (queue.length === 0) return;

    try {
      const res = await gateApi.batchSync({ logs: queue });
      writeOfflineQueue([]);
      setPendingQueueCount(0);
      setKioskToast(
        `Reconnected: Synced ${res.synced_count} offline gate scan log(s) to PostgreSQL.`
      );
      await syncManifestAndLogs();
    } catch {
      // Keep queue intact until connectivity stabilizes
    }
  }, [syncManifestAndLogs]);

  useEffect(() => {
    syncManifestAndLogs();
  }, [syncManifestAndLogs]);

  useEffect(() => {
    if (isOnline) {
      flushOfflineQueue();
    }
  }, [isOnline, flushOfflineQueue]);

  useEffect(() => {
    const matchedQuickGate = gateScannerQuickGates.find(
      (g) => gateLabelToFacilityCode(g) === gateLabelToFacilityCode(venue)
    );
    if (matchedQuickGate) {
      setSelectedQuickGate(matchedQuickGate);
    }
  }, [venue]);

  const handleSelectScanState = (nextState: GateScanState) => {
    setLiveProfile(null);
    setScanState(nextState);
    setLookupInput(gateScannerProfiles[nextState].lookupCode);
  };

  const evaluateOfflineVerification = (
    codeOrToken: string,
    biometricPassed: boolean
  ): GateScannerMemberProfile => {
    const currentManifest = manifest ?? readOfflineManifest();
    const q = codeOrToken.trim();
    const matched = currentManifest?.entries.find(
      (e) =>
        e.pass_or_booking_code.toLowerCase() === q.toLowerCase() ||
        e.qr_token_hash === q
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    let stage1Ok = false;
    let reason: string | null = null;

    if (!matched) {
      reason = 'Offline cache: Unrecognized pass or booking code.';
    } else if (matched.facility_code !== activeFacilityCode) {
      reason = `Facility mismatch: credential is for ${matched.facility_code}, not ${activeFacilityCode}.`;
    } else if (todayStr < matched.valid_from || todayStr > matched.valid_until) {
      reason = `Pass outside valid window (${matched.valid_from} to ${matched.valid_until}).`;
    } else {
      stage1Ok = true;
    }

    const stage2Ok = isSyntheticTrack ? stage1Ok && biometricPassed : false;
    const accessGranted = isSyntheticTrack ? stage1Ok && stage2Ok : stage1Ok;

    if (stage1Ok && isSyntheticTrack && !stage2Ok) {
      reason = 'Offline cache: Biometric Stage 2 verification required for Synthetic Track.';
    }

    const queuedItem: QueuedOfflineScan = {
      facility_code: activeFacilityCode,
      gate_name: selectedQuickGate,
      user_id: matched?.user_id,
      pass_or_booking_code: matched?.pass_or_booking_code ?? q,
      verification_type: isSyntheticTrack ? 'QR_AND_BIOMETRIC' : 'QR_ONLY',
      stage1_qr_passed: stage1Ok,
      stage2_biometric_passed: stage2Ok,
      access_granted: accessGranted,
      failure_or_override_reason: reason,
      scanned_at: new Date().toISOString(),
    };

    const nextQueue = [...readOfflineQueue(), queuedItem];
    writeOfflineQueue(nextQueue);
    setPendingQueueCount(nextQueue.length);

    const localRecord: GateEntryRecord = {
      id: `OFFLINE-${Date.now()}`,
      time: new Date().toTimeString().slice(0, 8),
      date: new Date().toLocaleDateString('en-IN'),
      initials: (matched?.user_full_name || q).slice(0, 2).toUpperCase(),
      avatarClass: accessGranted
        ? 'bg-primary/10 text-primary'
        : 'bg-error-container text-on-error-container',
      memberName: matched?.user_full_name ?? 'Unrecognized Holder',
      memberSub: `Offline Queue • ${queuedItem.pass_or_booking_code}`,
      passId: queuedItem.pass_or_booking_code,
      category: matched?.user_role === 'GOVT_PERSONNEL' ? 'Govt / Dept' : 'General Public',
      categoryClass: 'bg-surface-container-high text-secondary',
      facility: selectedQuickGate,
      facilityFilterKey: activeFacilityCode,
      facilityIcon: 'directions_run',
      facilityIconClass: 'text-primary',
      verificationStage: isSyntheticTrack ? 'Offline QR + Biometric' : 'Offline QR-Only',
      verificationIcon: accessGranted ? 'check_circle' : 'error',
      verificationBadgeClass: accessGranted
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-error-container text-on-error-container',
      remarks: reason ?? 'Queued offline from signed manifest.',
      status: accessGranted ? 'Granted' : 'Rejected',
      filterType: accessGranted ? 'verified' : 'failed',
    };
    setKioskLogs((prev) => [localRecord, ...prev]);

    setKioskToast(
      accessGranted
        ? `Offline Cache Granted: ${queuedItem.pass_or_booking_code} queued for batch-sync (${nextQueue.length} pending).`
        : `Offline Cache Rejected: ${reason}`
    );

    return {
      ...gateScannerProfiles[accessGranted ? 'valid' : 'invalid'],
      scanState: accessGranted ? 'valid' : 'invalid',
      lookupCode: queuedItem.pass_or_booking_code,
      passIdDisplay: queuedItem.pass_or_booking_code,
      name: matched?.user_full_name ?? 'Offline Lookup',
      categoryBadge: matched?.user_role ?? 'Offline Mode',
      venueAndPassType: `${activeFacilityCode} • Offline Manifest`,
      permittedSlotWindow: matched ? `${matched.start_time} – ${matched.end_time}` : 'N/A',
      validityPeriod: matched ? `${matched.valid_from} to ${matched.valid_until}` : 'Unverified',
      stage1StatusText: stage1Ok ? 'OFFLINE QR MATCHED' : 'OFFLINE QR FAILED',
      stage1DetectedLabel: stage1Ok ? `Cached: ${queuedItem.pass_or_booking_code}` : 'Not Found',
      stage2Title: isSyntheticTrack
        ? stage2Ok
          ? 'Stage 2: Biometric Confirmed (Offline)'
          : 'Stage 2: Biometric Required'
        : '1-Stage QR-Only Clearance (Offline)',
      stage2Subtitle: reason || 'Verified via signed localStorage manifest.',
      turnstileBadgeText: accessGranted ? 'GRANTED (QUEUED)' : 'DENIED (QUEUED)',
      biometricHash: matched?.qr_token_hash?.slice(0, 16) ?? 'OFFLINE-MODE',
      cycleStatusText: accessGranted ? 'Queued for Sync' : 'Gate Locked',
    };
  };

  const executeGateVerification = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed || verifying) {
      setKioskToast('Enter or scan a valid Pass Code, Booking Code, or QR Token.');
      return;
    }

    const biometricPassed = isSyntheticTrack ? scanState !== 'invalid' : false;
    const looksLikeQrHash = /^[a-f0-9]{64}$/i.test(trimmed);

    if (!isOnline) {
      const offlineProfile = evaluateOfflineVerification(trimmed, biometricPassed);
      setLiveProfile(offlineProfile);
      return;
    }

    setVerifying(true);
    try {
      const res = await gateApi.verify({
        facility_code: activeFacilityCode,
        gate_name: selectedQuickGate,
        ...(looksLikeQrHash
          ? { qr_token: trimmed }
          : { pass_or_booking_code: trimmed }),
        stage1_qr_passed: true,
        ...(isSyntheticTrack
          ? { stage2_biometric_passed: biometricPassed }
          : { stage2_biometric_passed: false }),
      });

      const mappedProfile = mapVerifyResponseToProfile(res, activeFacilityCode);
      setLiveProfile(mappedProfile);
      setScanState(mappedProfile.scanState);

      const newLogRecord = mapApiGateLogToRecord(res.gate_log);
      setKioskLogs((prev) => [newLogRecord, ...prev]);

      setKioskToast(
        res.access_granted
          ? `Turnstile unlocked (${res.verification_type}) for ${mappedProfile.name} (${mappedProfile.passIdDisplay}).`
          : `Access denied: ${res.failure_or_override_reason}`
      );
    } catch (error) {
      if (error instanceof TypeError) {
        const offlineProfile = evaluateOfflineVerification(trimmed, biometricPassed);
        setLiveProfile(offlineProfile);
      } else {
        setKioskToast(
          error instanceof ApiError ? error.message : 'Gate verification request failed.'
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckId = (code: string) => {
    executeGateVerification(code);
  };

  const handleManualOverride = async () => {
    const targetCode = lookupInput.trim() || activeProfile.lookupCode;
    const officerLabel = user?.full_name ?? currentGateOfficer.name;
    const reason = `Field kiosk manual override (§ 6.28) authorized by ${officerLabel} at ${selectedQuickGate}`;

    if (!isOnline) {
      const offlineItem: QueuedOfflineScan = {
        facility_code: activeFacilityCode,
        gate_name: selectedQuickGate,
        pass_or_booking_code: targetCode,
        verification_type: 'MANUAL_OVERRIDE',
        stage1_qr_passed: true,
        stage2_biometric_passed: false,
        access_granted: true,
        failure_or_override_reason: reason,
        scanned_at: new Date().toISOString(),
      };
      const nextQueue = [...readOfflineQueue(), offlineItem];
      writeOfflineQueue(nextQueue);
      setPendingQueueCount(nextQueue.length);
      setKioskToast(
        `Offline Manual Override queued for ${targetCode} (${nextQueue.length} pending batch sync).`
      );
      return;
    }

    try {
      const res = await gateApi.manualOverride({
        facility_code: activeFacilityCode,
        gate_name: selectedQuickGate,
        pass_or_booking_code: targetCode,
        override_reason: reason,
        stage1_qr_passed: true,
        stage2_biometric_passed: false,
      });
      const newRecord = mapApiGateLogToRecord(res.gate_log);
      setKioskLogs((prev) => [newRecord, ...prev]);
      setKioskToast(
        `Manual Override (§ 6.28) recorded for ${targetCode} on ${activeFacilityCode}.`
      );
    } catch (error) {
      setKioskToast(
        error instanceof ApiError ? error.message : 'Manual override failed.'
      );
    }
  };

  const handleClearReadyNext = () => {
    setLiveProfile(null);
    setScanState('valid');
    setLookupInput('');
    setKioskToast('Optical scanner reset — ready for next gate cycle.');
  };

  const handleConfirmAndLog = () => {
    const targetCode = lookupInput.trim() || activeProfile.lookupCode;
    executeGateVerification(targetCode);
  };

  return (
    <div className="gate-scanner-workspace h-full w-full flex flex-col justify-between p-6 max-w-[1560px] mx-auto overflow-y-auto">
      {/* Top Venue Quick Select Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[13px]">
          <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Gates:
          </span>
          {gateScannerQuickGates.map((gate) => {
            const active = selectedQuickGate === gate;
            return (
              <button
                key={gate}
                type="button"
                onClick={() => setSelectedQuickGate(gate)}
                className={
                  active
                    ? 'px-3.5 py-1.5 rounded-lg bg-white border border-blue-200/90 text-blue-700 font-bold shadow-xs flex items-center gap-1.5 whitespace-nowrap'
                    : 'px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent hover:border-slate-200 transition font-medium whitespace-nowrap'
                }
              >
                {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                {gate}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-[12px] text-slate-500 font-medium flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
            {isSyntheticTrack ? '2-Stage: QR + Biometric' : '1-Stage: QR Only'}
          </span>
          {pendingQueueCount > 0 && (
            <button
              type="button"
              onClick={flushOfflineQueue}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-semibold hover:bg-amber-200 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync Offline Queue ({pendingQueueCount})</span>
            </button>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Cache:{' '}
            <span className="font-mono font-semibold text-slate-700">
              {manifest ? `${manifest.total_entries} passes` : gateScannerTelemetry.turnstileLatency}
            </span>
          </span>
        </div>
      </div>

      {/* Kiosk Toast Feedback Banner */}
      {kioskToast && (
        <div
          role="status"
          className="mb-4 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-medium flex items-center justify-between gap-3 shadow-md shrink-0"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{kioskToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setKioskToast(null)}
            className="text-slate-400 hover:text-white"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Conditional View based on GateScannerLayout tab */}
      {tab === 'live' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0 items-stretch">
            <GateScannerStage1Panel
              scanState={scanState}
              detectedLabel={activeProfile.stage1DetectedLabel}
              lookupInput={lookupInput}
              onLookupInputChange={setLookupInput}
              onCheckId={handleCheckId}
              onSelectScanState={handleSelectScanState}
            />

            <GateScannerStage2Panel profile={activeProfile} />
          </div>

          <div className="glass-card rounded-2xl p-4 mt-5 flex flex-wrap items-center justify-between gap-3 border border-white/90 shrink-0 shadow-sm">
            <button
              type="button"
              onClick={handleManualOverride}
              className="px-5 py-3 rounded-xl border-2 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[14px] transition flex items-center gap-2 active:scale-95 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Manual Override (Sensor Failure § 6.28)</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearReadyNext}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-[14px] transition flex items-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Clear / Ready Next</span>
              </button>

              <button
                type="button"
                disabled={verifying}
                onClick={handleConfirmAndLog}
                className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-[15px] transition flex items-center gap-2.5 shadow-md shadow-blue-500/25 active:scale-95"
              >
                <Unlock className="w-4 h-4 stroke-[2.5]" />
                <span>{verifying ? 'Verifying...' : 'Confirm & Log Entry'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'log' && (
        <GateScannerLogView
          venue={selectedQuickGate}
          entries={kioskLogs}
          onSwitchToLive={() => setTab('live')}
        />
      )}

      {tab === 'lookup' && (
        <GateScannerManualLookupView
          cachedEntries={manifest?.entries ?? []}
          recentLogs={kioskLogs}
          onSelectLookupResult={(code, stateKey) => {
            setLookupInput(code);
            setScanState(stateKey);
            setTab('live');
            executeGateVerification(code);
          }}
        />
      )}
    </div>
  );
}
