import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import {
  membershipCategories,
  membershipFacilitySummary,
  membershipMediaAssets,
  membershipPrimaryDocumentSample,
} from '@/data/mockData';
import type { MembershipFormData, MembershipWizardStep } from '@/types/membership';

interface MembershipReviewStepProps {
  formData: MembershipFormData;
  onUpdateField: <K extends keyof MembershipFormData>(
    key: K,
    value: MembershipFormData[K],
  ) => void;
  onJumpToStep: (step: MembershipWizardStep) => void;
  onNotify: (message: string) => void;
  onBack: () => void;
  onSubmitApplication: () => Promise<boolean> | void;
}

export function MembershipReviewStep({
  formData,
  onUpdateField,
  onJumpToStep,
  onNotify,
  onBack,
  onSubmitApplication,
}: MembershipReviewStepProps) {
  const [submittingState, setSubmittingState] = useState<'idle' | 'submitting' | 'submitted'>(
    'idle',
  );

  const categoryMeta =
    membershipCategories.find((c) => c.id === formData.category) ?? membershipCategories[1];
  const isGovernment = formData.category !== 'public';
  const attachedDoc = formData.primaryDocument ?? membershipPrimaryDocumentSample;

  const handleSubmit = async () => {
    if (!formData.declarationAccepted || submittingState !== 'idle') return;
    setSubmittingState('submitting');
    try {
      const result = await onSubmitApplication();
      if (result === false) {
        setSubmittingState('idle');
        return;
      }
      setSubmittingState('submitted');
    } catch {
      setSubmittingState('idle');
    }
  };

  return (
    <section className="lg:col-span-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col mb-2">
        <h1 className="font-title-portal text-[28px] md:text-title-portal font-bold text-on-surface tracking-tight">
          Review and submit
        </h1>
        <p className="font-body-default text-[15px] md:text-body-default text-tertiary mt-1.5">
          Please verify all details carefully before submitting your application.
        </p>
      </div>

      {/* Card 1: Personal & Category details */}
      <article className="rounded-[28px] md:rounded-[36px] bg-surface-container-lowest/60 backdrop-blur-[40px] p-5 md:p-8 shadow-[0_20px_40px_rgba(0,83,205,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] transition-all hover:shadow-[0_24px_48px_rgba(0,83,205,0.11)]">
        <div className="flex items-center justify-between pb-6 mb-6 bg-surface-container-low/40 px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <MaterialIcon name="badge" className="text-primary text-[22px]" />
            <h2 className="font-headline-card text-[18px] md:text-headline-card font-semibold text-on-surface">
              Personal &amp; Category details
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(2)}
            className="font-label-primary text-label-primary font-semibold text-primary hover:text-primary-container transition-colors flex items-center gap-1 group"
          >
            <span>Edit</span>
            <MaterialIcon
              name="edit"
              className="text-[16px] transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-8 items-start">
          {/* Captured Photo */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-[0_8px_20px_rgba(0,83,205,0.12)] bg-surface-container">
              <img
                className="w-full h-full object-cover"
                alt={membershipMediaAssets.reviewPortraitStep4Alt}
                src={membershipMediaAssets.reviewPortraitStep4Url}
              />
            </div>
            <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-lowest/90 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-caption text-caption text-on-surface font-semibold">
                Live verified
              </span>
            </div>
          </div>

          {/* Key-value Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6 w-full">
            <div className="flex flex-col">
              <span className="font-label-meta text-label-meta text-tertiary">Category</span>
              <span className="font-body-medium text-body-medium text-on-surface mt-0.5 font-semibold">
                {categoryMeta.reviewLabel}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-meta text-label-meta text-tertiary">Full name</span>
              <span className="font-body-medium text-body-medium text-on-surface mt-0.5 font-semibold">
                {formData.fullName}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-meta text-label-meta text-tertiary">Date of birth</span>
              <span className="font-body-default text-body-default text-on-surface mt-0.5">
                {formData.dob} ({membershipFacilitySummary.ageNote})
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-meta text-label-meta text-tertiary">Gender</span>
              <span className="font-body-default text-body-default text-on-surface mt-0.5">
                {formData.gender}
              </span>
            </div>
            <div className="flex flex-col md:col-span-2">
              <span className="font-label-meta text-label-meta text-tertiary">
                Father&apos;s name
              </span>
              <span className="font-body-default text-body-default text-on-surface mt-0.5">
                {formData.parentName || 'Not provided'}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* Card 2: Address & Service Information */}
      <article className="rounded-[28px] md:rounded-[36px] bg-surface-container-lowest/60 backdrop-blur-[40px] p-5 md:p-8 shadow-[0_20px_40px_rgba(0,83,205,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] transition-all hover:shadow-[0_24px_48px_rgba(0,83,205,0.11)]">
        <div className="flex items-center justify-between pb-6 mb-6 bg-surface-container-low/40 px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <MaterialIcon name="domain" className="text-primary text-[22px]" />
            <h2 className="font-headline-card text-[18px] md:text-headline-card font-semibold text-on-surface">
              Address &amp; Service Information
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(2)}
            className="font-label-primary text-label-primary font-semibold text-primary hover:text-primary-container transition-colors flex items-center gap-1 group"
          >
            <span>Edit</span>
            <MaterialIcon
              name="edit"
              className="text-[16px] transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
          <div className="flex flex-col">
            <span className="font-label-meta text-label-meta text-tertiary">Present address</span>
            <span className="font-body-default text-body-default text-on-surface mt-0.5 leading-relaxed">
              {formData.presentAddress}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-meta text-label-meta text-tertiary">Permanent address</span>
            <span className="font-body-default text-body-default text-on-surface mt-0.5 leading-relaxed">
              {formData.sameAsPresent ? 'Same as present address' : formData.permanentAddress}
            </span>
          </div>
          {isGovernment && (
            <>
              <div className="flex flex-col">
                <span className="font-label-meta text-label-meta text-tertiary">Designation</span>
                <span className="font-body-medium text-body-medium text-on-surface mt-0.5 font-semibold">
                  {formData.designation}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-meta text-label-meta text-tertiary">
                  Office address
                </span>
                <span className="font-body-default text-body-default text-on-surface mt-0.5 leading-relaxed">
                  {formData.officeAddress}
                </span>
              </div>
            </>
          )}
        </div>
      </article>

      {/* Card 3: Facility Usage & Verified Documents */}
      <article className="rounded-[28px] md:rounded-[36px] bg-surface-container-lowest/60 backdrop-blur-[40px] p-5 md:p-8 shadow-[0_20px_40px_rgba(0,83,205,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] transition-all hover:shadow-[0_24px_48px_rgba(0,83,205,0.11)]">
        <div className="flex items-center justify-between pb-6 mb-6 bg-surface-container-low/40 px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <MaterialIcon name="sports" className="text-primary text-[22px]" />
            <h2 className="font-headline-card text-[18px] md:text-headline-card font-semibold text-on-surface">
              Facility Usage &amp; Verified Documents
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(3)}
            className="font-label-primary text-label-primary font-semibold text-primary hover:text-primary-container transition-colors flex items-center gap-1 group"
          >
            <span>Edit</span>
            <MaterialIcon
              name="edit"
              className="text-[16px] transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8 mb-6">
          <div className="flex flex-col">
            <span className="font-label-meta text-label-meta text-tertiary">Facility</span>
            <div className="inline-flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="font-body-medium text-body-medium text-on-surface font-semibold">
                {membershipFacilitySummary.facilityName} (Monthly)
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-label-meta text-label-meta text-tertiary">Purpose</span>
            <span className="font-body-default text-body-default text-on-surface mt-0.5">
              {formData.purpose}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-meta text-label-meta text-tertiary">
              Registered sportsperson
            </span>
            <span className="font-body-default text-body-default text-on-surface mt-0.5">
              {formData.isSportsperson
                ? `Yes — ${formData.sportField}${
                    formData.associationDetails ? ` (${formData.associationDetails})` : ''
                  }`
                : 'No'}
            </span>
          </div>
        </div>

        {/* Document Preview Tray */}
        <div className="flex flex-col">
          <span className="font-label-meta text-label-meta text-tertiary mb-2">
            Attached document
          </span>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low/70 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <MaterialIcon name="description" className="text-[26px]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-primary text-label-primary font-semibold text-on-surface truncate">
                  {attachedDoc.fileName}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-caption text-caption text-tertiary">
                    {attachedDoc.fileSize}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <span className="inline-flex items-center gap-1 font-caption text-caption font-medium text-emerald-600">
                    <MaterialIcon name="check_circle" className="text-[13px]" />
                    {attachedDoc.verifiedLabel}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onNotify(`Previewing verified document: ${attachedDoc.fileName}`)
              }
              className="px-4 py-2 rounded-xl bg-surface-container-lowest/80 text-primary font-label-meta text-label-meta font-semibold shadow-[0_2px_6px_rgba(0,83,205,0.06)] hover:bg-surface-container-lowest transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <MaterialIcon name="visibility" className="text-[16px]" />
              <span>View</span>
            </button>
          </div>
        </div>
      </article>

      {/* Card 4: Declaration & Consent */}
      <article className="rounded-[28px] md:rounded-[36px] bg-surface-container-lowest/60 backdrop-blur-[40px] p-5 md:p-8 shadow-[0_20px_40px_rgba(0,83,205,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
        <div className="flex items-start gap-4">
          <div className="pt-0.5 flex-shrink-0">
            <input
              id="declaration"
              type="checkbox"
              checked={formData.declarationAccepted}
              onChange={(e) => onUpdateField('declarationAccepted', e.target.checked)}
              className="w-[22px] h-[22px] rounded-lg accent-primary cursor-pointer transition-transform active:scale-95"
            />
          </div>
          <label className="flex flex-col cursor-pointer select-none" htmlFor="declaration">
            <span className="font-label-primary text-label-primary text-on-surface font-medium leading-relaxed">
              I hereby declare that all information provided is true and accurate. I have read and
              agree to the Kannur City Police sports facility rules, code of conduct, and terms of
              membership.
            </span>
            <span className="font-caption text-caption text-tertiary mt-2">
              By submitting, your dossier will be routed to the District Police Office Sports
              Council for final approval.
            </span>
          </label>
        </div>
      </article>

      {/* Bottom Action Row */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="h-14 px-8 rounded-[22px] bg-surface-container-lowest/60 backdrop-blur-xl text-primary font-body-medium text-body-medium font-semibold shadow-[0_4px_16px_rgba(0,83,205,0.06)] hover:bg-surface-container-lowest/90 hover:-translate-y-0.5 active:scale-[0.985] transition-all flex items-center justify-center"
        >
          Back
        </button>

        <button
          type="button"
          disabled={!formData.declarationAccepted || submittingState !== 'idle'}
          onClick={handleSubmit}
          className={`h-14 px-10 rounded-[22px] text-on-primary font-body-medium text-body-medium font-semibold shadow-[0_8px_24px_rgba(0,83,205,0.28),inset_0_1px_1px_rgba(255,255,255,0.25)] transition-all flex items-center justify-center flex-1 sm:flex-none ${
            submittingState === 'submitted'
              ? 'bg-emerald-600'
              : 'bg-primary hover:shadow-[0_12px_28px_rgba(0,83,205,0.35)] hover:-translate-y-0.5 active:scale-[0.985]'
          } ${!formData.declarationAccepted ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {submittingState === 'submitting' ? (
            <>
              <MaterialIcon name="progress_activity" className="text-[20px] animate-spin mr-2" />
              <span>Submitting dossier...</span>
            </>
          ) : submittingState === 'submitted' ? (
            <>
              <MaterialIcon name="check_circle" className="text-[20px] mr-2" />
              <span>Application submitted</span>
            </>
          ) : (
            <span>Submit application</span>
          )}
        </button>
      </div>
    </section>
  );
}
