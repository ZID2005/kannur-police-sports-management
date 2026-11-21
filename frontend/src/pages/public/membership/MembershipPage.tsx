import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  ReceiptText,
  ShieldCheck,
  UserCheck,
  Wrench,
} from 'lucide-react';
import {
  ApiError,
  facilitiesApi,
  membershipsApi,
  paymentsApi,
  type ApiFacility,
  type ApiMembership,
  type BackendGender,
  type BackendSessionWindow,
} from '@/api/client';
import { MembershipDetailsStep } from '@/components/membership/MembershipDetailsStep';
import { MembershipPlanStep } from '@/components/membership/MembershipPlanStep';
import { MembershipReviewStep } from '@/components/membership/MembershipReviewStep';
import { MembershipStepperSidebar } from '@/components/membership/MembershipStepperSidebar';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { membershipGenderOptions } from '@/data/mockData';
import type {
  MembershipDurationMonths,
  MembershipOnboardingErrors,
  MembershipOnboardingFormData,
  MembershipOnboardingStep,
  MembershipPricingSummary,
} from '@/types/membership';
import '@/styles/membership.css';

export const ACTIVATED_PASS_STORAGE_KEY = 'kcp_activated_pass';

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return 'Active';
  const dt = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function composeFullPresentAddress(
  presentAddress: string,
  cityLocality: string,
  pinCode: string,
): string {
  return [presentAddress.trim(), cityLocality.trim(), pinCode.trim()]
    .filter(Boolean)
    .join(', ');
}

const INITIAL_FORM_DATA: MembershipOnboardingFormData = {
  gender: '',
  dateOfBirth: '',
  parentName: '',
  presentAddress: '',
  cityLocality: '',
  pinCode: '',
  sameAsPresent: true,
  permanentAddress: '',
  designation: '',
  officeAddress: '',
  trackPurpose: '',
  isRegisteredSportsperson: false,
  sportDiscipline: '',
  associationDetails: '',
  selectedMonths: 1,
  sessionWindow: 'MORNING',
  declarationAccepted: false,
};

/**
 * Multi-step Synthetic Track Membership Onboarding & Instant Activation page (`/membership`).
 * Step 1: Member Onboarding Details (Gender, DOB, Residential Address, Track Use)
 * Step 2: Plan Duration & Daily Track Session + Live GST Fee Summary
 * Step 3: Review & Instant Activation -> ACTIVE pass + printable GST receipt
 */
export default function MembershipPage() {
  const navigate = useNavigate();
  const { user, updateProfile, refreshUser } = useAuth();
  const { lang, t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<MembershipOnboardingStep>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<MembershipOnboardingStep>(1);
  const [formData, setFormData] = useState<MembershipOnboardingFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<MembershipOnboardingErrors>({});
  const [trackFacility, setTrackFacility] = useState<ApiFacility | null>(null);
  const [liveMembership, setLiveMembership] = useState<ApiMembership | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const prefilledUserIdRef = useRef<string | null>(null);

  // Load Synthetic Track facility & tariff metadata
  useEffect(() => {
    let active = true;
    facilitiesApi
      .list()
      .then((res) => {
        if (!active) return;
        const synthetic = res.facilities.find((f) => f.code === 'SYNTHETIC_TRACK') ?? null;
        setTrackFacility(synthetic);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Pre-fill saved onboarding profile details whenever authenticated user loads
  useEffect(() => {
    if (!user) {
      prefilledUserIdRef.current = null;
      setLiveMembership(null);
      return;
    }

    if (prefilledUserIdRef.current !== user.id) {
      prefilledUserIdRef.current = user.id;
      const present = user.present_address ?? '';
      const locality = user.city_locality ?? '';
      const pin = user.pin_code ?? '';
      const permanent = user.permanent_address ?? '';
      const combinedPresent = composeFullPresentAddress(present, locality, pin);
      const isSame =
        !permanent ||
        permanent.trim() === present.trim() ||
        permanent.trim() === combinedPresent.trim();

      setFormData((prev) => ({
        ...prev,
        gender: (user.gender as BackendGender | null) ?? prev.gender,
        dateOfBirth: user.date_of_birth ?? prev.dateOfBirth,
        parentName: user.parent_name ?? prev.parentName,
        presentAddress: present || prev.presentAddress,
        cityLocality: locality || prev.cityLocality,
        pinCode: pin || prev.pinCode,
        sameAsPresent: isSame,
        permanentAddress: isSame ? '' : permanent,
        designation: user.designation ?? prev.designation,
        officeAddress: user.office_address ?? prev.officeAddress,
        trackPurpose: user.track_purpose ?? prev.trackPurpose,
        isRegisteredSportsperson: Boolean(user.is_registered_sportsperson),
        sportDiscipline: user.sport_discipline ?? prev.sportDiscipline,
        associationDetails: user.association_details ?? prev.associationDetails,
      }));
    }

    let active = true;
    membershipsApi
      .getMy()
      .then((res) => {
        if (!active) return;
        const current =
          res.memberships.find((m) => m.status === 'ACTIVE') ??
          res.memberships.find((m) => m.status === 'APPROVED_UNPAID') ??
          null;
        setLiveMembership(current);
        if (current) {
          setFormData((prev) => ({
            ...prev,
            sessionWindow: current.session_window,
            selectedMonths:
              current.duration_months === 1 ||
              current.duration_months === 2 ||
              current.duration_months === 3 ||
              current.duration_months === 6
                ? (current.duration_months as MembershipDurationMonths)
                : prev.selectedMonths,
            trackPurpose: prev.trackPurpose || current.track_purpose || '',
            isRegisteredSportsperson:
              prev.isRegisteredSportsperson || Boolean(current.is_registered_sportsperson),
            sportDiscipline: prev.sportDiscipline || current.sport_discipline || '',
            associationDetails: prev.associationDetails || current.association_details || '',
          }));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user]);

  const operationalStatus = trackFacility?.operational_status ?? 'ACTIVE';
  const isTrackUnavailable = operationalStatus !== 'ACTIVE';
  const monthlyCap = trackFacility?.monthly_member_cap ?? 300;
  const isGovt = user?.role === 'GOVT_PERSONNEL';

  const pricing = useMemo<MembershipPricingSummary>(() => {
    const tariff = trackFacility?.tariffs[0];
    const monthlyNet = tariff ? Number(tariff.base_price) : isGovt ? 250 : 500;
    const monthlyStandard = tariff?.standard_base_price
      ? Number(tariff.standard_base_price)
      : isGovt
        ? 500
        : monthlyNet;
    const monthlyDiscount = tariff?.concession_discount
      ? Number(tariff.concession_discount)
      : Math.max(0, monthlyStandard - monthlyNet);
    const concessionPercent = tariff?.concession_percent ?? (isGovt ? 50 : 0);
    const gstPercent = tariff ? Number(tariff.gst_percent) : 18;

    const baseFee = Math.round(monthlyStandard * formData.selectedMonths * 100) / 100;
    const concessionDiscount = Math.round(monthlyDiscount * formData.selectedMonths * 100) / 100;
    const taxableSubtotal = Math.round(monthlyNet * formData.selectedMonths * 100) / 100;
    const gstAmount = Math.round(taxableSubtotal * (gstPercent / 100) * 100) / 100;
    const totalPayable = Math.round((taxableSubtotal + gstAmount) * 100) / 100;

    return {
      monthlyNet,
      baseFee,
      concessionDiscount,
      concessionPercent,
      taxableSubtotal,
      gstPercent,
      gstAmount,
      totalPayable,
    };
  }, [trackFacility, formData.selectedMonths, isGovt]);

  const updateField = useCallback(
    <K extends keyof MembershipOnboardingFormData>(
      key: K,
      value: MembershipOnboardingFormData[K],
    ) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrorMessage(null);
      if (key in errors) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key as keyof MembershipOnboardingErrors];
          return next;
        });
      }
    },
    [errors],
  );

  const validateStep1 = useCallback((): boolean => {
    const nextErrors: MembershipOnboardingErrors = {};

    if (!formData.gender) {
      nextErrors.gender = t('Please select your gender.', 'ദയവായി ലിംഗം തിരഞ്ഞെടുക്കുക.');
    }
    if (!formData.dateOfBirth.trim()) {
      nextErrors.dateOfBirth = t('Enter your date of birth.', 'ജനനത്തീയതി നൽകുക.');
    }
    if (!formData.presentAddress.trim()) {
      nextErrors.presentAddress = t(
        'Enter your house / street address.',
        'നിങ്ങളുടെ വീട് / തെരുവ് വിലാസം നൽകുക.',
      );
    }
    if (!formData.cityLocality.trim()) {
      nextErrors.cityLocality = t('Enter your locality / city.', 'സ്ഥലം / നഗരം നൽകുക.');
    }
    if (!/^\d{6}$/.test(formData.pinCode.trim())) {
      nextErrors.pinCode = t(
        'Enter a valid 6-digit PIN code.',
        'സാധുവായ 6 അക്ക പിൻ കോഡ് നൽകുക.',
      );
    }
    if (!formData.sameAsPresent && !formData.permanentAddress.trim()) {
      nextErrors.permanentAddress = t(
        'Enter your permanent address or enable the match toggle.',
        'സ്ഥിര വിലാസം നൽകുക.',
      );
    }
    if (isGovt) {
      if (!formData.designation.trim()) {
        nextErrors.designation = t('Enter your designation / rank.', 'തസ്തിക നൽകുക.');
      }
      if (!formData.officeAddress.trim()) {
        nextErrors.officeAddress = t(
          'Enter your office / station address.',
          'ഓഫീസ് / സ്റ്റേഷൻ വിലാസം നൽകുക.',
        );
      }
    }
    if (!formData.trackPurpose.trim()) {
      nextErrors.trackPurpose = t(
        'Enter the purpose of using the Synthetic Track.',
        'സിന്തറ്റിക് ട്രാക്ക് ഉപയോഗിക്കുന്നതിന്റെ ലക്ഷ്യം നൽകുക.',
      );
    }
    if (formData.isRegisteredSportsperson && !formData.sportDiscipline.trim()) {
      nextErrors.sportDiscipline = t(
        'Enter your registered sport / discipline.',
        'നിങ്ങളുടെ കായിക ഇനം നൽകുക.',
      );
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData, isGovt, t]);

  const buildOnboardingPayload = useCallback(() => {
    const combinedPresent = composeFullPresentAddress(
      formData.presentAddress,
      formData.cityLocality,
      formData.pinCode,
    );
    const resolvedPermanent = formData.sameAsPresent
      ? combinedPresent
      : formData.permanentAddress.trim();

    return {
      gender: (formData.gender || null) as BackendGender | null,
      date_of_birth: formData.dateOfBirth.trim() || null,
      parent_name: formData.parentName.trim() || null,
      present_address: formData.presentAddress.trim() || null,
      city_locality: formData.cityLocality.trim() || null,
      pin_code: formData.pinCode.trim() || null,
      permanent_address: resolvedPermanent || null,
      designation: isGovt ? formData.designation.trim() || null : null,
      office_address: isGovt ? formData.officeAddress.trim() || null : null,
      track_purpose: formData.trackPurpose.trim() || null,
      is_registered_sportsperson: formData.isRegisteredSportsperson,
      sport_discipline: formData.isRegisteredSportsperson
        ? formData.sportDiscipline.trim() || null
        : null,
      association_details: formData.isRegisteredSportsperson
        ? formData.associationDetails.trim() || null
        : null,
    };
  }, [formData, isGovt]);

  const handleContinueFromStep1 = useCallback(async () => {
    if (!validateStep1()) return;

    // Persist profile details smoothly when authenticated so they remain saved across sessions
    if (user) {
      updateProfile(buildOnboardingPayload()).catch(() => {
        // Non-blocking save; details will also be submitted at checkout
      });
    }

    setCurrentStep(2);
    setMaxReachedStep((prev) => (prev < 2 ? 2 : prev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [validateStep1, user, updateProfile, buildOnboardingPayload]);

  const handleContinueFromStep2 = useCallback(() => {
    setCurrentStep(3);
    setMaxReachedStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectStep = useCallback(
    (step: MembershipOnboardingStep) => {
      if (step > maxReachedStep) return;
      if (currentStep === 1 && step > 1 && !validateStep1()) return;
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentStep, maxReachedStep, validateStep1],
  );

  const handleActivateMembership = useCallback(async () => {
    if (submitting || isTrackUnavailable) return;

    if (!user) {
      navigate('/login', { state: { from: '/membership' } });
      return;
    }

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    if (!formData.declarationAccepted) {
      setErrors((prev) => ({
        ...prev,
        declarationAccepted: t(
          'Please confirm the member declaration before activating.',
          'സജീവമാക്കുന്നതിന് മുമ്പ് സ്ഥിരീകരണം ടിക്ക് ചെയ്യുക.',
        ),
      }));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const onboardingPayload = buildOnboardingPayload();
      let membershipId = liveMembership?.status === 'APPROVED_UNPAID' ? liveMembership.id : null;

      if (membershipId) {
        await updateProfile(onboardingPayload);
        const updated = await membershipsApi.updatePeriod(membershipId, {
          duration_months: formData.selectedMonths,
          session_window: formData.sessionWindow,
        });
        membershipId = updated.membership.id;
      } else {
        const applied = await membershipsApi.apply({
          facility_code: 'SYNTHETIC_TRACK',
          duration_months: formData.selectedMonths,
          session_window: formData.sessionWindow,
          instant_checkout: true,
          declaration_accepted: true,
          ...onboardingPayload,
        });
        membershipId = applied.membership.id;
      }

      const settled = await paymentsApi.settle({
        reference_type: 'MEMBERSHIP',
        reference_id: membershipId,
      });

      await refreshUser().catch(() => null);

      try {
        window.sessionStorage.setItem(ACTIVATED_PASS_STORAGE_KEY, JSON.stringify(settled));
      } catch {
        // Ignore storage error
      }

      navigate('/membership/pass', { state: settled });
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Unable to activate track membership right now. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    isTrackUnavailable,
    user,
    validateStep1,
    formData,
    t,
    buildOnboardingPayload,
    liveMembership,
    updateProfile,
    refreshUser,
    navigate,
  ]);

  const savedGenderLabel = useMemo(() => {
    const found = membershipGenderOptions.find((g) => g.value === user?.gender);
    if (!found) return null;
    return lang === 'ML' ? found.labelMl : found.label;
  }, [user?.gender, lang]);

  return (
    <div className="w-full max-w-[1160px] mx-auto px-4 md:px-6 pt-4 md:pt-7 pb-16 flex flex-col gap-6 text-[#0F172A]">
      {/* Top Breadcrumb */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>{t('Back to home', 'ഹോമിലേക്ക് മടങ്ങുക')}</span>
        </Link>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 border border-slate-200/85 text-[12px] font-semibold text-[#334155]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#165DF5]" />
          {t(
            `Synthetic 400m Track • ${monthlyCap} Member Capacity`,
            `സിന്തറ്റിക് 400m ട്രാക്ക് • ${monthlyCap} അംഗ പരിധി`,
          )}
        </span>
      </div>

      {/* Operational Notice if Maintenance or Closed */}
      {isTrackUnavailable && (
        <div
          role="status"
          className={`rounded-[20px] px-5 py-4 border flex items-start gap-3 ${
            operationalStatus === 'MAINTENANCE'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {operationalStatus === 'MAINTENANCE' ? (
            <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-[13.5px]">
            <p className="font-bold">
              {operationalStatus === 'MAINTENANCE'
                ? t(
                    'Synthetic Track is currently under maintenance',
                    'സിന്തറ്റിക് ട്രാക്ക് നിലവിൽ അറ്റകുറ്റപ്പണിയിലാണ്',
                  )
                : t(
                    'Synthetic Track is currently closed',
                    'സിന്തറ്റിക് ട്രാക്ക് നിലവിൽ അടച്ചിരിക്കുകയാണ്',
                  )}
            </p>
            <p className="opacity-90 mt-0.5">
              {t(
                'New monthly track enrollments are temporarily paused by Sports Complex Administration.',
                'പുതിയ പ്രതിമാസ അംഗത്വ രജിസ്ട്രേഷനുകൾ താൽക്കാലികമായി നിർത്തിവച്ചിരിക്കുകയാണ്.',
              )}
            </p>
          </div>
        </div>
      )}

      {/* Active Membership View if user already holds an active pass */}
      {liveMembership?.status === 'ACTIVE' ? (
        <div className="flex flex-col gap-5">
          <section className="rounded-[26px] bg-white/95 border border-emerald-200/90 p-6 sm:p-8 shadow-[0_18px_44px_-18px_rgba(16,185,129,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase">
                  ACTIVE MEMBERSHIP
                </span>
                <h1 className="font-display text-[24px] font-extrabold text-[#0F172A] mt-1">
                  {liveMembership.pass_code}
                </h1>
                <p className="text-[14px] text-[#475569] mt-1">
                  {t('Valid through', 'കാലാവധി:')} {formatDateLabel(liveMembership.end_date)} •{' '}
                  {liveMembership.session_window} {t('Session', 'സെഷൻ')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/membership/pass"
                className="btn-primary !h-11 px-5 text-[14px] inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ReceiptText className="w-4 h-4" />
                <span>{t('View Membership Receipt', 'അംഗത്വ രസീത് കാണുക')}</span>
              </Link>
              <Link
                to="/account"
                className="btn-glass !h-11 px-4 text-[13.5px] inline-flex items-center gap-2 whitespace-nowrap"
              >
                <UserCheck className="w-4 h-4 text-[#165DF5]" />
                <span>{t('Manage Onboarding Profile', 'പ്രൊഫൈൽ തിരുത്തുക')}</span>
              </Link>
            </div>
          </section>

          {/* Saved Onboarding Profile Summary */}
          {user && (user.gender || user.present_address) && (
            <section className="rounded-[24px] bg-white/90 border border-slate-200/85 p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-[17px] font-bold text-[#0F172A] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#165DF5]" />
                  <span>{t('Saved Onboarding Profile', 'സേവ് ചെയ്ത അംഗത്വ വിവരങ്ങൾ')}</span>
                </h2>
                <Link
                  to="/account"
                  className="text-[13px] font-semibold text-[#165DF5] hover:underline"
                >
                  {t('Edit on Account Page →', 'അക്കൗണ്ട് പേജിൽ തിരുത്തുക →')}
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13.5px]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                    {t('Gender & DOB', 'ലിംഗവും ജനനത്തീയതിയും')}
                  </span>
                  <p className="font-semibold text-[#0F172A] mt-0.5">
                    {savedGenderLabel ?? '—'}
                    {user.date_of_birth ? ` • ${user.date_of_birth}` : ''}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                    {t('Residential Address', 'താമസ വിലാസം')}
                  </span>
                  <p className="text-[#334155] mt-0.5">
                    {[user.present_address, user.city_locality, user.pin_code]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left 4 Columns: Multi-Step Onboarding Stepper */}
          <MembershipStepperSidebar
            currentStep={currentStep}
            maxReachedStep={maxReachedStep}
            monthlyCap={monthlyCap}
            isGovt={isGovt}
            onSelectStep={handleSelectStep}
          />

          {/* Right 8 Columns: Active Step View */}
          {currentStep === 1 && (
            <MembershipDetailsStep
              user={user}
              formData={formData}
              errors={errors}
              isTrackUnavailable={isTrackUnavailable}
              onUpdateField={updateField}
              onContinue={handleContinueFromStep1}
            />
          )}

          {currentStep === 2 && (
            <MembershipPlanStep
              formData={formData}
              pricing={pricing}
              isGovt={isGovt}
              isTrackUnavailable={isTrackUnavailable}
              onSelectMonths={(months: MembershipDurationMonths) =>
                updateField('selectedMonths', months)
              }
              onSelectSession={(session: BackendSessionWindow) =>
                updateField('sessionWindow', session)
              }
              onBack={() => {
                setCurrentStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onContinue={handleContinueFromStep2}
            />
          )}

          {currentStep === 3 && (
            <MembershipReviewStep
              user={user}
              trackName={trackFacility?.name || 'Synthetic 400m Athletic Track'}
              formData={formData}
              pricing={pricing}
              isGovt={isGovt}
              isTrackUnavailable={isTrackUnavailable}
              submitting={submitting}
              errorMessage={errorMessage}
              declarationError={errors.declarationAccepted}
              onToggleDeclaration={(accepted) => updateField('declarationAccepted', accepted)}
              onJumpToStep={(step) => {
                setCurrentStep(step);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBack={() => {
                setCurrentStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onActivate={handleActivateMembership}
            />
          )}
        </div>
      )}
    </div>
  );
}
