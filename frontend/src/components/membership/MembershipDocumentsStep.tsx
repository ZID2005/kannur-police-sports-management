import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import {
  membershipAuxiliaryDocumentSample,
  membershipMediaAssets,
  membershipPrimaryDocumentSample,
} from '@/data/mockData';
import type { MembershipFormData } from '@/types/membership';

interface MembershipDocumentsStepProps {
  formData: MembershipFormData;
  onUpdateField: <K extends keyof MembershipFormData>(
    key: K,
    value: MembershipFormData[K],
  ) => void;
  onNotify: (message: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function MembershipDocumentsStep({
  formData,
  onUpdateField,
  onNotify,
  onBack,
  onContinue,
}: MembershipDocumentsStepProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapturePhoto = () => {
    setIsCapturing(true);
    window.setTimeout(() => {
      setIsCapturing(false);
      onUpdateField('photoCaptured', true);
      onNotify('Live biometric photograph captured and verified.');
    }, 350);
  };

  const handleRetakePhoto = () => {
    onUpdateField('photoCaptured', false);
    onNotify('Camera viewfinder reset. Click "Capture Live Photo" to capture a new frame.');
  };

  const handleUploadPrimary = () => {
    onUpdateField('primaryDocument', membershipPrimaryDocumentSample);
    onNotify(`Attached ${membershipPrimaryDocumentSample.fileName}`);
  };

  const handleRemovePrimary = () => {
    onUpdateField('primaryDocument', null);
    onNotify('Verification document removed.');
  };

  const handleToggleAuxiliary = () => {
    if (formData.auxiliaryDocument) {
      onUpdateField('auxiliaryDocument', null);
      onNotify('Auxiliary NOC document removed.');
    } else {
      onUpdateField('auxiliaryDocument', membershipAuxiliaryDocumentSample);
      onNotify(`Attached ${membershipAuxiliaryDocumentSample.fileName}`);
    }
  };

  const canProceed = formData.photoCaptured && formData.primaryDocument !== null;

  return (
    <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
      {/* Section Title & Subhead */}
      <div className="flex flex-col">
        <h1 className="font-title-portal text-[28px] md:text-title-portal font-bold text-on-surface tracking-tight">
          Photo and documents
        </h1>
        <p className="font-body-default text-[15px] md:text-body-default text-tertiary mt-2">
          Upload or capture verification documents. Fields marked{' '}
          <span className="text-error">*</span> are required.
        </p>
      </div>

      {/* CARD 1: Live Photograph */}
      <div className="w-full rounded-[28px] md:rounded-[36px] bg-white/55 backdrop-blur-[40px] p-5 md:p-8 shadow-[0_20px_40px_rgba(31,111,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-headline-card text-headline-card font-semibold text-on-surface">
              Applicant photo <span className="text-error">*</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-meta text-label-meta">
              Biometric
            </span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <MaterialIcon name="lock" className="text-[18px]" />
            <span className="font-label-meta text-label-meta font-medium">
              Encrypted upload stream
            </span>
          </div>
        </div>

        {/* Security Protocol Note */}
        <div className="rounded-2xl bg-surface-container-low/70 backdrop-blur-md p-3.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary-fixed/80 flex items-center justify-center shrink-0 text-primary">
            <MaterialIcon name="policy" className="text-[16px]" />
          </div>
          <p className="font-label-meta text-label-meta text-tertiary leading-snug">
            Per Kerala Police security guidelines, direct camera capture is required. Gallery
            uploads are disabled.
          </p>
        </div>

        {/* Camera Interface Viewport Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Live Viewfinder Screen */}
          <div className="md:col-span-8 relative aspect-[4/3] rounded-[24px] overflow-hidden bg-on-surface shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen scale-105"
              role="img"
              aria-label={membershipMediaAssets.cameraViewfinderAlt}
              style={{
                backgroundImage: `url('${membershipMediaAssets.cameraViewfinderBackdropUrl}')`,
              }}
            />

            {/* Top live telemetry overlay */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md text-on-primary">
                <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
                <span className="font-label-meta text-label-meta font-semibold">
                  Camera ready • 1080p
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md text-on-primary">
                <MaterialIcon name="face" className="text-[14px]" />
                <span className="font-label-meta text-label-meta">Face detected</span>
              </div>
            </div>

            {/* Oval facial guide with animated SVG crosshair markers */}
            <div className="relative z-10 w-44 h-56 rounded-[50%] flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_0_24px_rgba(0,83,205,0.35)]">
              <svg
                className="absolute inset-0 w-full h-full text-white/70"
                fill="none"
                viewBox="0 0 176 224"
              >
                <path
                  d="M 88 12 L 88 28 M 88 196 L 88 212 M 16 112 L 32 112 M 144 112 L 160 112"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
                <ellipse
                  cx="88"
                  cy="112"
                  opacity="0.6"
                  rx="72"
                  ry="94"
                  stroke="currentColor"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />
              </svg>
              <div className="text-center px-4">
                <span className="font-label-meta text-label-meta text-white/90 drop-shadow-md">
                  {isCapturing ? 'Capturing frame...' : 'Align face within frame'}
                </span>
              </div>
            </div>

            {/* Bottom Camera Controls Overlay */}
            <div className="absolute bottom-4 inset-x-4 flex items-center justify-center z-10">
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="h-12 px-6 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-primary text-label-primary font-semibold flex items-center gap-2 shadow-[0_8px_20px_rgba(0,83,205,0.45)] transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <MaterialIcon name="photo_camera" className="text-[20px]" />
                <span>{isCapturing ? 'Capturing...' : 'Capture Live Photo'}</span>
              </button>
            </div>
          </div>

          {/* Captured Review Thumbnail & Validation Status */}
          <div className="md:col-span-4 rounded-[24px] bg-surface-container-lowest/60 backdrop-blur-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
            <div className="flex flex-col gap-3">
              <span className="font-label-primary text-label-primary font-semibold text-on-surface">
                Captured frame
              </span>

              {/* Verified Headshot Preview */}
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,83,205,0.10)] bg-surface-container flex items-center justify-center">
                {formData.photoCaptured ? (
                  <>
                    <img
                      className="w-full h-full object-cover"
                      alt={membershipMediaAssets.capturedPortraitStep3Alt}
                      src={membershipMediaAssets.capturedPortraitStep3Url}
                    />
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm">
                      <MaterialIcon name="check" className="text-[14px]" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4 text-tertiary gap-2">
                    <MaterialIcon name="portrait" className="text-[36px] text-secondary/60" />
                    <span className="font-caption text-caption">
                      No frame captured yet. Use the viewfinder to capture your live photo.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-secondary">
                <MaterialIcon
                  name={formData.photoCaptured ? 'auto_fix_high' : 'info'}
                  className="text-[16px] text-primary"
                />
                <span className="font-label-meta text-label-meta">
                  {formData.photoCaptured
                    ? 'Lighting & clarity passed'
                    : 'Awaiting live biometric capture'}
                </span>
              </div>
            </div>

            {/* Retake Option Button */}
            <button
              type="button"
              onClick={formData.photoCaptured ? handleRetakePhoto : handleCapturePhoto}
              className="w-full mt-3 h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-meta text-label-meta font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <MaterialIcon name="refresh" className="text-[16px]" />
              <span>{formData.photoCaptured ? 'Retake photo' : 'Capture photo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARD 2: Official Verification Documents */}
      <div className="w-full rounded-[28px] md:rounded-[36px] bg-white/55 backdrop-blur-[40px] p-5 md:p-8 shadow-[0_20px_40px_rgba(31,111,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-headline-card text-headline-card font-semibold text-on-surface">
              Government Service &amp; Identity proof <span className="text-error">*</span>
            </span>
          </div>
          <p className="font-body-default text-[15px] md:text-body-default text-tertiary">
            Upload official Kerala Police PEN ID card or Department service certificate (PDF, JPG or
            PNG up to 5 MB).
          </p>
        </div>

        {/* Frosted Glass Dropzone */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleUploadPrimary}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleUploadPrimary();
            }
          }}
          className="w-full rounded-[24px] bg-surface-container-lowest/40 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)] cursor-pointer group transition-all hover:bg-surface-container-lowest/70"
        >
          <div className="w-14 h-14 rounded-2xl bg-secondary-container/50 text-primary flex items-center justify-center mb-3 transition-transform group-hover:scale-110">
            <MaterialIcon name="cloud_upload" className="text-[30px]" />
          </div>
          <span className="font-label-primary text-label-primary font-semibold text-on-surface">
            Drag and drop file here, or <span className="text-primary underline">browse files</span>
          </span>
          <span className="font-label-meta text-label-meta text-tertiary mt-1">
            Supported formats: PDF, JPEG, PNG (Maximum 5 MB)
          </span>
        </div>

        {/* Attached File Card / Chip Item */}
        {formData.primaryDocument && (
          <div className="w-full rounded-2xl bg-surface-container-lowest/80 backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_12px_rgba(0,83,205,0.06)]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <MaterialIcon name="description" className="text-[24px]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-label-primary text-label-primary font-semibold text-on-surface truncate">
                    {formData.primaryDocument.fileName}
                  </span>
                  <span className="font-label-meta text-label-meta text-tertiary shrink-0">
                    ({formData.primaryDocument.fileSize})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MaterialIcon
                    name="check_circle"
                    filled
                    className="text-[15px] text-primary"
                  />
                  <span className="font-label-meta text-label-meta text-primary font-medium">
                    {formData.primaryDocument.statusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Action Links */}
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleUploadPrimary}
                className="font-label-meta text-label-meta font-semibold text-primary hover:text-primary-container px-3 py-1.5 rounded-full hover:bg-primary-fixed/40 transition-colors"
              >
                Replace
              </button>
              <span className="text-outline-variant">|</span>
              <button
                type="button"
                onClick={handleRemovePrimary}
                className="font-label-meta text-label-meta font-semibold text-error hover:text-on-error-container px-3 py-1.5 rounded-full hover:bg-error-container/40 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Optional Auxiliary Document Chip when added */}
        {formData.auxiliaryDocument && (
          <div className="w-full rounded-2xl bg-surface-container-lowest/80 backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_12px_rgba(0,83,205,0.06)]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-secondary-container/70 flex items-center justify-center text-primary shrink-0">
                <MaterialIcon name="verified" className="text-[22px]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-label-primary text-label-primary font-semibold text-on-surface truncate">
                    {formData.auxiliaryDocument.fileName}
                  </span>
                  <span className="font-label-meta text-label-meta text-tertiary shrink-0">
                    ({formData.auxiliaryDocument.fileSize})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MaterialIcon
                    name="check_circle"
                    filled
                    className="text-[15px] text-primary"
                  />
                  <span className="font-label-meta text-label-meta text-primary font-medium">
                    {formData.auxiliaryDocument.verifiedLabel}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleAuxiliary}
              className="font-label-meta text-label-meta font-semibold text-error hover:text-on-error-container px-3 py-1.5 rounded-full hover:bg-error-container/40 transition-colors self-end sm:self-center"
            >
              Remove
            </button>
          </div>
        )}

        {/* Secondary Document Upload Note (Optional Additional Clearance) */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <MaterialIcon
              name={formData.auxiliaryDocument ? 'check_circle' : 'add_circle'}
              className="text-secondary text-[18px]"
            />
            <button
              type="button"
              onClick={handleToggleAuxiliary}
              className="font-label-primary text-label-primary text-secondary hover:text-primary font-medium transition-colors text-left"
            >
              {formData.auxiliaryDocument
                ? 'Auxiliary clearance / NOC certificate attached (click to remove)'
                : '+ Add auxiliary clearance or NOC certificate (optional)'}
            </button>
          </div>
          <span className="font-label-meta text-label-meta text-tertiary shrink-0">
            Step 3 of 4
          </span>
        </div>
      </div>

      {/* BOTTOM ACTION CONTROLS ROW */}
      <div className="w-full flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="h-14 px-8 rounded-[22px] bg-white/60 hover:bg-white/80 backdrop-blur-xl text-primary font-label-primary text-label-primary font-semibold shadow-[0_4px_16px_rgba(0,83,205,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center"
        >
          Back
        </button>

        <button
          type="button"
          disabled={!canProceed}
          onClick={onContinue}
          className={`h-14 px-10 rounded-[22px] bg-primary text-on-primary font-label-primary text-label-primary font-semibold shadow-[0_8px_24px_rgba(0,83,205,0.28),inset_0_1px_1px_rgba(255,255,255,0.25)] transition-all flex items-center justify-center ${
            canProceed
              ? 'hover:bg-primary-container hover:-translate-y-0.5 active:scale-95 cursor-pointer'
              : 'opacity-40 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
