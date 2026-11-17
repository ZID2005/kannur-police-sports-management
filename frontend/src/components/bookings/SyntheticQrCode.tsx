import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface SyntheticQrCodeProps {
  seed: string;
  variant?: 'ticket' | 'pass';
}

/**
 * Deterministic inline SVG QR code component (zero external runtime dependencies).
 * Preserves the exact Stitch vector visuals for both Ticket (256x256 with corner targeting overlays)
 * and Membership Pass (104x104 with central shield emblem).
 */
export function SyntheticQrCode({ seed, variant = 'ticket' }: SyntheticQrCodeProps) {
  // Deterministic hash from seed for subtle matrix bit variations if seed changes
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  if (variant === 'pass') {
    return (
      <div
        className="relative p-2 rounded-xl bg-surface-container-lowest shadow-inner flex items-center justify-center shrink-0"
        title={`QR Seed: ${seed}`}
      >
        <svg
          className="text-on-surface"
          fill="currentColor"
          height="104"
          viewBox="0 0 100 100"
          width="104"
          aria-label="Dynamic Gate QR Code"
        >
          <path d="M0 0h36v36H0V0zm6 6v24h24V6H6zm6 6h12v12H12V12zM64 0h36v36H64V0zm6 6v24h24V6H70zm6 6h12v12H76V12zM0 64h36v36H0V64zm6 6v24h24V70H6zm6 6h12v12H12V76zm52-12h8v8h-8v-8zm16 0h8v8h-8v-8zm8 8h8v8h-8v-8zm-24 8h8v8h-8v-8zm16 8h16v8H84v-8zm-8 8h8v8h-8v-8zm16 8h8v8h-8v-8zm-40-16h8v8h-8v-8zm0 16h8v8h-8v-8zM44 8h8v8h-8V8zm0 16h8v8h-8v-8zm0 16h8v8h-8v-8zm8 8h8v8h-8v-8zm-8 8h8v8h-8v-8zm16-24h8v8h-8v-8z" />
          {hash % 2 === 1 && <rect x="44" y="88" width="8" height="8" />}
        </svg>
        <div className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
          <MaterialIcon name="shield" className="text-[13px] text-on-primary" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 bg-surface-container-lowest rounded-2xl shadow-md relative inline-block my-2"
      title={`QR Seed: ${seed}`}
    >
      {/* Corner Targeting Overlays */}
      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-primary rounded-tl-sm pointer-events-none" />
      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-primary rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-primary rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-primary rounded-br-sm pointer-events-none" />
      {/* High Res Synthetic QR Visual (Custom Vector) */}
      <svg
        className="w-48 h-48 md:w-56 md:h-56 text-on-surface"
        fill="currentColor"
        viewBox="0 0 256 256"
        aria-label="Optical Fast-Pass Entry QR Code"
      >
        {/* Top-Left Target */}
        <rect
          fill="none"
          height="64"
          rx="8"
          stroke="currentColor"
          strokeWidth="12"
          width="64"
          x="20"
          y="20"
        />
        <rect fill="currentColor" height="32" rx="4" width="32" x="36" y="36" />
        {/* Top-Right Target */}
        <rect
          fill="none"
          height="64"
          rx="8"
          stroke="currentColor"
          strokeWidth="12"
          width="64"
          x="172"
          y="20"
        />
        <rect fill="currentColor" height="32" rx="4" width="32" x="188" y="36" />
        {/* Bottom-Left Target */}
        <rect
          fill="none"
          height="64"
          rx="8"
          stroke="currentColor"
          strokeWidth="12"
          width="64"
          x="20"
          y="172"
        />
        <rect fill="currentColor" height="32" rx="4" width="32" x="36" y="188" />
        {/* QR Data Matrix Dots & Alignment Modules */}
        <rect height="24" rx="2" width="12" x="100" y="24" />
        <rect height="12" rx="2" width="36" x="120" y="24" />
        <rect height="36" rx="2" width="12" x="144" y="44" />
        <rect height="12" rx="2" width="32" x="100" y="60" />
        <rect height="20" rx="2" width="12" x="120" y="80" />
        <rect height="12" rx="2" width="20" x="24" y="100" />
        <rect height="24" rx="2" width="16" x="52" y="100" />
        <rect height="12" rx="2" width="28" x="76" y="108" />
        <rect height="32" rx="4" width="32" x="112" y="108" />
        <rect height="16" rx="2" width="20" x="152" y="100" />
        <rect height="12" rx="2" width="52" x="180" y="100" />
        <rect height="24" rx="2" width="24" x="208" y="120" />
        <rect height="12" rx="2" width="40" x="24" y="132" />
        <rect height="28" rx="2" width="16" x="72" y="132" />
        <rect height="12" rx="2" width="32" x="160" y="128" />
        <rect height="28" rx="2" width="20" x="148" y="148" />
        <rect height="16" rx="2" width="36" x="100" y="152" />
        <rect height="12" rx="2" width="24" x="180" y="152" />
        <rect height="32" rx="2" width="16" x="216" y="152" />
        <rect height="28" rx="2" width="16" x="100" y="180" />
        <rect height="12" rx="2" width="32" x="124" y="180" />
        <rect height="36" rx="4" width="36" x="168" y="172" />
        <rect height="32" rx="2" width="24" x="124" y="200" />
        <rect height="16" rx="2" width="32" x="160" y="216" />
        <rect height="20" rx="2" width="32" x="200" y="212" />
        {hash % 3 === 0 && <rect height="12" rx="2" width="12" x="100" y="216" />}
      </svg>
    </div>
  );
}

interface TurnstileBarcodeProps {
  caption: string;
}

export function TurnstileBarcode({ caption }: TurnstileBarcodeProps) {
  return (
    <div className="flex flex-col items-center sm:items-end justify-center gap-1 shrink-0">
      <svg
        className="text-tertiary"
        fill="currentColor"
        height="28"
        viewBox="0 0 110 28"
        width="110"
        aria-label="Turnstile Barcode"
      >
        <rect height="28" width="3" x="0" y="0" />
        <rect height="28" width="1.5" x="5" y="0" />
        <rect height="28" width="4" x="9" y="0" />
        <rect height="28" width="2" x="15" y="0" />
        <rect height="28" width="5" x="20" y="0" />
        <rect height="28" width="2" x="28" y="0" />
        <rect height="28" width="4" x="33" y="0" />
        <rect height="28" width="1.5" x="40" y="0" />
        <rect height="28" width="6" x="44" y="0" />
        <rect height="28" width="2" x="53" y="0" />
        <rect height="28" width="3" x="58" y="0" />
        <rect height="28" width="4.5" x="64" y="0" />
        <rect height="28" width="1.5" x="71" y="0" />
        <rect height="28" width="3" x="75" y="0" />
        <rect height="28" width="5" x="81" y="0" />
        <rect height="28" width="2" x="89" y="0" />
        <rect height="28" width="3.5" x="94" y="0" />
        <rect height="28" width="2" x="100" y="0" />
        <rect height="28" width="4" x="105" y="0" />
      </svg>
      <span className="font-caption text-caption tracking-widest text-outline uppercase font-mono">
        {caption}
      </span>
    </div>
  );
}
