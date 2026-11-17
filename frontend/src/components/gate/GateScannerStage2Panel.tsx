import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CircleDot,
  Clock,
  Fingerprint,
  Info,
  Shield,
  XCircle,
} from 'lucide-react';
import { gateScannerTelemetry } from '@/data/mockData';
import type { GateScannerMemberProfile } from '@/types/gate';

interface GateScannerStage2PanelProps {
  profile: GateScannerMemberProfile;
}

export function GateScannerStage2Panel({ profile }: GateScannerStage2PanelProps) {
  const isValid = profile.scanState === 'valid';
  const isExpired = profile.scanState === 'expired';

  const stage1BadgeClass = isValid
    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
    : isExpired
      ? 'bg-amber-50 border-amber-300 text-amber-800'
      : 'bg-rose-50 border-rose-300 text-rose-800';

  const portraitBorderClass = isValid
    ? 'border-emerald-400'
    : isExpired
      ? 'border-amber-400'
      : 'border-rose-400';

  const portraitBadgeClass = isValid
    ? 'bg-emerald-500'
    : isExpired
      ? 'bg-amber-500'
      : 'bg-rose-600';

  const validityTextClass = isValid
    ? 'text-emerald-700'
    : isExpired
      ? 'text-amber-700'
      : 'text-rose-700';

  const stage2ContainerClass = isValid
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : isExpired
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-rose-500/10 border-rose-500/30';

  const stage2IconWrapClass = isValid
    ? 'bg-emerald-600'
    : isExpired
      ? 'bg-amber-600'
      : 'bg-rose-600';

  const stage2TitleClass = isValid
    ? 'text-emerald-950'
    : isExpired
      ? 'text-amber-950'
      : 'text-rose-950';

  const stage2SubtitleClass = isValid
    ? 'text-emerald-700'
    : isExpired
      ? 'text-amber-700'
      : 'text-rose-700';

  const stage2DividerClass = isValid
    ? 'border-emerald-500/20 text-emerald-800'
    : isExpired
      ? 'border-amber-500/20 text-amber-800'
      : 'border-rose-500/20 text-rose-800';

  const stage2InfoIconClass = isValid
    ? 'text-emerald-600'
    : isExpired
      ? 'text-amber-600'
      : 'text-rose-600';

  const cycleTextClass = isValid
    ? 'text-emerald-600'
    : isExpired
      ? 'text-amber-600'
      : 'text-rose-600';

  return (
    <section className="glass-card rounded-2xl p-5 flex flex-col justify-between h-full border border-white/80">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                Stage 2: Verification Result &amp; Biometric Check
              </h2>
              <p className="text-[12px] text-slate-500">
                Dual-factor clearance matrix under Kerala Police Rule § 6.25
              </p>
            </div>
          </div>
          {/* Stage 1 Status Box Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-bold ${stage1BadgeClass}`}
          >
            {isValid ? (
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
            ) : isExpired ? (
              <Clock className="w-4 h-4 text-amber-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{profile.stage1StatusText}</span>
          </div>
        </div>

        {/* Verified Member Profile Summary Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs mb-3.5">
          <div className="flex items-start gap-4">
            {/* Verified Portrait Photograph */}
            <div className="relative shrink-0">
              <img
                src={profile.photoUrl}
                alt={`Verified Member ${profile.name}`}
                className={`w-20 h-20 rounded-xl object-cover border-2 ${portraitBorderClass} shadow-sm`}
              />
              <div
                className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full ${portraitBadgeClass} text-white flex items-center justify-center shadow-xs`}
              >
                {isValid ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : isExpired ? (
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </div>
            </div>

            {/* Member Information Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[18px] font-bold text-slate-900 truncate">{profile.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  {profile.categoryBadge}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 mt-2 text-[12px]">
                <div>
                  <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-medium">
                    Pass ID:
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {profile.passIdDisplay}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-medium">
                    Venue &amp; Pass Type:
                  </span>
                  <span className="font-semibold text-slate-800">{profile.venueAndPassType}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-medium">
                    Permitted Slot Window:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.permittedSlotWindow}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-medium">
                    Validity Period:
                  </span>
                  <span className={`font-semibold ${validityTextClass}`}>
                    {profile.validityPeriod}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 2 Biometric Verification Status Box */}
        <div className={`rounded-xl p-4 border-2 ${stage2ContainerClass}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg ${stage2IconWrapClass} text-white flex items-center justify-center shadow-xs`}
              >
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <div className={`text-[14px] font-bold ${stage2TitleClass}`}>
                  {profile.stage2Title}
                </div>
                <div className={`text-[11px] ${stage2SubtitleClass} font-medium`}>
                  {profile.stage2Subtitle}
                </div>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 ${stage2IconWrapClass} text-white text-[11px] font-bold rounded-md tracking-wider uppercase`}
            >
              {profile.turnstileBadgeText}
            </span>
          </div>

          {/* Statutory Rule Note */}
          <div
            className={`mt-2.5 pt-2 border-t flex items-start gap-1.5 text-[11.5px] font-medium leading-relaxed ${stage2DividerClass}`}
          >
            <Info className={`w-4 h-4 ${stage2InfoIconClass} shrink-0 mt-0.5`} />
            <span>
              <strong>Note:</strong> {gateScannerTelemetry.statutoryRuleNote}
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry & Cryptographic Verification Footnote */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          Biometric SHA-256:{' '}
          <span className="font-mono text-slate-600">{profile.biometricHash}</span>
        </span>
        <span className={`${cycleTextClass} font-medium flex items-center gap-1`}>
          <CircleDot className="w-3 h-3" /> {profile.cycleStatusText}
        </span>
      </div>
    </section>
  );
}
