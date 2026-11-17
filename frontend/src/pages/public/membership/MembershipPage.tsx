import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ApiError,
  facilitiesApi,
  membershipsApi,
  paymentsApi,
  type ApiFacility,
  type ApiMembership,
  type ApiSettlePaymentResponse,
  type BackendSessionWindow,
} from '@/api/client';
import { MembershipCategoryStep } from '@/components/membership/MembershipCategoryStep';
import { MembershipDetailsStep } from '@/components/membership/MembershipDetailsStep';
import { MembershipDocumentsStep } from '@/components/membership/MembershipDocumentsStep';
import { MembershipPaymentGatewayStep } from '@/components/membership/MembershipPaymentGatewayStep';
import { MembershipPeriodSelectionStep } from '@/components/membership/MembershipPeriodSelectionStep';
import { MembershipReviewStep } from '@/components/membership/MembershipReviewStep';
import { MembershipStepperSidebar } from '@/components/membership/MembershipStepperSidebar';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useAuth } from '@/context/AuthContext';
import { membershipDefaultFormData } from '@/data/mockData';
import type {
  MembershipApplicantCategoryId,
  MembershipFormData,
  MembershipValidationErrors,
  MembershipWizardStep,
} from '@/types/membership';
import '@/styles/membership.css';

const WIZARD_STAGE_LABELS: { step: MembershipWizardStep; label: string }[] = [
  { step: 1, label: '1. Category' },
  { step: 2, label: '2. Details' },
  { step: 3, label: '3. Documents' },
  { step: 4, label: '4. Review' },
  { step: 5, label: '5. Period' },
  { step: 6, label: '6. Payment' },
];

export const ACTIVATED_PASS_STORAGE_KEY = 'kcp_activated_pass';

export default function MembershipPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<MembershipWizardStep>(1);
  const [formData, setFormData] = useState<MembershipFormData>(membershipDefaultFormData);
  const [errors, setErrors] = useState<MembershipValidationErrors>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trackFacility, setTrackFacility] = useState<ApiFacility | null>(null);
  const [liveMembership, setLiveMembership] = useState<ApiMembership | null>(null);
  const [sessionWindow, setSessionWindow] = useState<BackendSessionWindow>('MORNING');
  const [settledResponse, setSettledResponse] = useState<ApiSettlePaymentResponse | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  }, []);

  useEffect(() => {
    let active = true;
    facilitiesApi
      .list()
      .then((res) => {
        if (!active) return;
        const synthetic = res.facilities.find((f) => f.code === 'SYNTHETIC_TRACK') ?? null;
        setTrackFacility(synthetic);
      })
      .catch(() => {
        // Fallback to static cap if offline
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setLiveMembership(null);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullName: user.full_name || prev.fullName,
      category:
        prev.category ?? (user.role === 'GOVT_PERSONNEL' ? 'government' : 'public'),
    }));

    let active = true;
    membershipsApi
      .getMy()
      .then((res) => {
        if (!active) return;
        const openOrActive =
          res.memberships.find((m) => m.status === 'ACTIVE') ??
          res.memberships.find((m) => m.status === 'APPROVED_UNPAID') ??
          res.memberships.find((m) => m.status === 'PENDING_APPROVAL') ??
          res.memberships[0] ??
          null;
        setLiveMembership(openOrActive);
        if (openOrActive) {
          setSessionWindow(openOrActive.session_window);
          if (
            openOrActive.status === 'APPROVED_UNPAID' ||
            openOrActive.status === 'PENDING_APPROVAL'
          ) {
            setCurrentStep(5);
          }
        }
      })
      .catch(() => {
        // Ignore if not authenticated
      });

    return () => {
      active = false;
    };
  }, [user]);

  const updateField = <K extends keyof MembershipFormData>(
    key: K,
    value: MembershipFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof MembershipValidationErrors];
        return next;
      });
    }
  };

  const handleSelectCategory = (category: MembershipApplicantCategoryId) => {
    setFormData((prev) => ({
      ...prev,
      category: prev.category === category ? null : category,
    }));
  };

  const validateStep2 = (): boolean => {
    const nextErrors: MembershipValidationErrors = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Enter your full name';
    }
    if (!formData.dob.trim()) {
      nextErrors.dob = 'Enter your date of birth';
    }
    if (!formData.presentAddress.trim()) {
      nextErrors.presentAddress = 'Enter your present address';
    }
    if (!formData.sameAsPresent && !formData.permanentAddress.trim()) {
      nextErrors.permanentAddress = 'Enter your permanent address';
    }
    if (formData.category === 'government') {
      if (!formData.designation.trim()) {
        nextErrors.designation = 'Enter your designation';
      }
      if (!formData.officeAddress.trim()) {
        nextErrors.officeAddress = 'Enter your office address';
      }
    }
    if (!formData.purpose.trim()) {
      nextErrors.purpose = 'Enter the purpose of using the Synthetic Track';
    }
    if (formData.isSportsperson && !formData.sportField.trim()) {
      nextErrors.sportField = 'Enter your registered sport';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleStep2Continue = () => {
    if (validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast('Please complete all required fields highlighted in red.');
    }
  };

  const handleClearStep2ForTest = () => {
    setFormData((prev) => ({
      ...prev,
      fullName: '',
      dob: '',
      parentName: '',
      presentAddress: '',
      permanentAddress: '',
      designation: '',
      officeAddress: '',
      purpose: '',
      sportField: '',
      associationDetails: '',
    }));
    setErrors({
      fullName: 'Enter your full name',
    });
  };

  const handleRestoreSampleData = () => {
    setFormData((prev) => ({
      ...membershipDefaultFormData,
      category: prev.category ?? 'government',
      isSportsperson: prev.isSportsperson,
    }));
    setErrors({});
  };

  const goToStep = (step: MembershipWizardStep) => {
    if (step >= 2 && !formData.category) {
      setFormData((prev) => ({ ...prev, category: 'government' }));
    }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitApplication = async (): Promise<boolean> => {
    if (!user) {
      showToast('Please sign in first to submit a Synthetic Track membership application.');
      navigate('/login', { state: { from: '/membership' } });
      return false;
    }

    try {
      const response = await membershipsApi.apply({
        facility_code: 'SYNTHETIC_TRACK',
        duration_months: formData.selectedMonths,
        session_window: sessionWindow,
        govt_service_proof_url:
          user.role === 'GOVT_PERSONNEL' || formData.category === 'government'
            ? 'https://intranet.kannurpolice.kerala.gov.in/documents/service-proof.pdf'
            : null,
      });

      setLiveMembership(response.membership);
      showToast(
        `Application ${response.membership.pass_code} submitted for officer approval (300-member cap verified).`
      );
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'DUPLICATE_OPEN_MEMBERSHIP') {
        const myRes = await membershipsApi.getMy().catch(() => ({ memberships: [] }));
        const existing = myRes.memberships[0] ?? null;
        if (existing) {
          setLiveMembership(existing);
          showToast(error.message);
          setCurrentStep(5);
          return true;
        }
      }
      const message =
        error instanceof ApiError
          ? error.message
          : 'Failed to submit membership application.';
      showToast(message);
      return false;
    }
  };

  const handleSettleMembershipPayment = async (): Promise<boolean> => {
    if (!user) {
      showToast('Please sign in to settle membership payment.');
      navigate('/login');
      return false;
    }

    let targetMembership = liveMembership;
    if (!targetMembership) {
      const latest = await membershipsApi.getMy().catch(() => ({ memberships: [] }));
      targetMembership =
        latest.memberships.find((m) => m.status === 'APPROVED_UNPAID') ??
        latest.memberships[0] ??
        null;
      setLiveMembership(targetMembership);
    }

    if (!targetMembership) {
      showToast('Please submit your membership application first.');
      return false;
    }

    if (targetMembership.status === 'ACTIVE') {
      navigate('/membership/pass');
      return true;
    }

    if (targetMembership.status !== 'APPROVED_UNPAID') {
      showToast(
        `Payment remains locked until STAFF_ADMIN approval (current status: ${targetMembership.status}).`
      );
      return false;
    }

    try {
      const settled = await paymentsApi.settle({
        reference_type: 'MEMBERSHIP',
        reference_id: targetMembership.id,
      });
      setSettledResponse(settled);
      setLiveMembership(settled.membership ?? targetMembership);
      try {
        window.sessionStorage.setItem(ACTIVATED_PASS_STORAGE_KEY, JSON.stringify(settled));
      } catch {
        // Ignore storage quota issues
      }
      return true;
    } catch (error) {
      showToast(
        error instanceof ApiError
          ? error.message
          : 'Payment settlement failed. Please verify approval status.'
      );
      return false;
    }
  };

  const monthlyCap = trackFacility?.monthly_member_cap ?? 300;
  const liveMonthlyBasePrice = trackFacility?.tariffs[0]
    ? Number(trackFacility.tariffs[0].base_price)
    : undefined;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 lg:px-8 pt-6 md:pt-8 pb-16 flex flex-col">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl px-5 py-3.5 shadow-[0_12px_32px_rgba(0,83,205,0.18)] border border-white flex items-center gap-3 text-on-surface"
        >
          <MaterialIcon name="info" className="text-primary text-[20px] shrink-0" />
          <span className="font-label-meta text-label-meta font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Contextual Sub-Nav + Quick Stage Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
        <Link
          to="/"
          className={`${
            currentStep <= 4 ? 'hidden lg:inline-flex' : 'inline-flex'
          } items-center gap-1.5 font-label-primary text-label-primary text-secondary hover:text-primary transition-colors group`}
        >
          <MaterialIcon
            name="chevron_left"
            className="text-[20px] leading-none transition-transform group-hover:-translate-x-0.5"
          />
          <span>Back to home</span>
        </Link>

        {/* Stage Switcher Bar for seamless step inspection */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-surface-container-lowest/65 backdrop-blur-xl shadow-[0_2px_10px_rgba(0,83,205,0.06)] overflow-x-auto no-scrollbar max-w-full ml-auto">
          {WIZARD_STAGE_LABELS.map((item) => {
            const isActive = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => goToStep(item.step)}
                className={`px-3 py-1 rounded-full font-caption text-caption transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-tertiary hover:text-on-surface font-medium'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Steps 1 to 4: Shared 12-Column Layout with Stepper Sidebar */}
      {currentStep <= 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <MembershipStepperSidebar
            currentStep={currentStep as 1 | 2 | 3 | 4}
            selectedCategory={formData.category}
            onSelectStep={goToStep}
          />

          {currentStep === 1 && (
            <MembershipCategoryStep
              selectedCategory={formData.category}
              onSelectCategory={handleSelectCategory}
              onContinue={() => {
                if (formData.category) {
                  goToStep(2);
                }
              }}
            />
          )}

          {currentStep === 2 && (
            <MembershipDetailsStep
              formData={formData}
              errors={errors}
              onUpdateField={updateField}
              onClearFieldsForTest={handleClearStep2ForTest}
              onRestoreSampleData={handleRestoreSampleData}
              onBack={() => goToStep(1)}
              onContinue={handleStep2Continue}
            />
          )}

          {currentStep === 3 && (
            <MembershipDocumentsStep
              formData={formData}
              onUpdateField={updateField}
              onNotify={showToast}
              onBack={() => goToStep(2)}
              onContinue={() => goToStep(4)}
            />
          )}

          {currentStep === 4 && (
            <MembershipReviewStep
              formData={formData}
              onUpdateField={updateField}
              onJumpToStep={goToStep}
              onNotify={showToast}
              onBack={() => goToStep(3)}
              onSubmitApplication={handleSubmitApplication}
            />
          )}
        </div>
      )}

      {/* Step 5: Application Status & Membership Period Selection */}
      {currentStep === 5 && (
        <MembershipPeriodSelectionStep
          formData={formData}
          onSelectMonths={(months) => updateField('selectedMonths', months)}
          onBack={() => goToStep(4)}
          onProceedToPayment={() => goToStep(6)}
          liveMembership={liveMembership}
          monthlyMemberCap={monthlyCap}
          liveMonthlyBasePrice={liveMonthlyBasePrice}
          sessionWindow={sessionWindow}
          onChangeSessionWindow={setSessionWindow}
          onViewActivePass={() => navigate('/membership/pass')}
        />
      )}

      {/* Step 6: Treasury Payment Gateway */}
      {currentStep === 6 && (
        <MembershipPaymentGatewayStep
          formData={formData}
          onCancel={() => goToStep(5)}
          onPaymentSuccess={() =>
            navigate('/membership/pass', { state: settledResponse })
          }
          liveMembership={liveMembership}
          onSettlePayment={handleSettleMembershipPayment}
        />
      )}
    </div>
  );
}
