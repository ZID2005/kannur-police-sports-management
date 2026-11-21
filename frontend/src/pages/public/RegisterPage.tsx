import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ApiError } from '@/api/client';
import { AuthCardShell } from '@/components/home/AuthCardShell';
import { PasswordInput } from '@/components/home/PasswordInput';
import { getRoleRedirectPath, useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authMockCredentials, authPageContent } from '@/data/mockData';
import '@/styles/home.css';

function previewUsernameFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 56);
  if (!slug) return '';
  return slug.length >= 3 ? slug : `${slug}.member`;
}

/**
 * Member Create Account screen (`/register`).
 * Full name (auto-derives sign-in username) + password + account category (General Public vs Govt/Police).
 * Zero government ID, mobile number, or SMS OTP inputs.
 * Account activates immediately upon signup with no manual approval delay.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const { t } = useLanguage();
  const initialErrorMode = searchParams.get('state') === 'error';

  const [fullName, setFullName] = useState(initialErrorMode ? 'Anil Kumar' : '');
  const [accountCategory, setAccountCategory] = useState<'PUBLIC' | 'GOVT_PERSONNEL'>('PUBLIC');
  const [password, setPassword] = useState(
    initialErrorMode ? authMockCredentials.sampleCreatePassword : '',
  );
  const [confirmPassword, setConfirmPassword] = useState(
    initialErrorMode ? authMockCredentials.sampleMismatchConfirmPassword : '',
  );
  const [acceptedTerms, setAcceptedTerms] = useState(initialErrorMode);
  const [hasError, setHasError] = useState(initialErrorMode);
  const [errorMessage, setErrorMessage] = useState(authPageContent.passwordMismatchErrorMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!shaking) return;
    const timer = window.setTimeout(() => setShaking(false), 320);
    return () => window.clearTimeout(timer);
  }, [shaking]);

  const derivedUsernamePreview = useMemo(() => previewUsernameFromName(fullName), [fullName]);
  const hasMinLength = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const isFormComplete =
    fullName.trim().length >= 2 &&
    hasMinLength &&
    confirmPassword.length > 0 &&
    acceptedTerms;

  const triggerError = (message: string) => {
    setErrorMessage(message);
    setHasError(true);
    setShaking(false);
    window.requestAnimationFrame(() => setShaking(true));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormComplete || isSubmitting) return;

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      triggerError(
        t('Full name must be at least 2 characters.', 'പൂർണ്ണനാമം കുറഞ്ഞത് 2 അക്ഷരങ്ങൾ ഉണ്ടായിരിക്കണം.'),
      );
      return;
    }

    if (password.length < 8) {
      triggerError(authPageContent.passwordLengthErrorMessage);
      return;
    }

    if (password !== confirmPassword) {
      triggerError(authPageContent.passwordMismatchErrorMessage);
      return;
    }

    setIsSubmitting(true);
    setHasError(false);

    try {
      const createdUser = await register({
        full_name: trimmedName,
        password,
        role: accountCategory,
      });
      navigate(getRoleRedirectPath(createdUser.role), { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to create account. Please verify your details and try again.';
      triggerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardShell
      mode="create"
      content={authPageContent}
      shaking={shaking}
      noticeTitle={notice?.title}
      noticeMessage={notice?.message}
      onCloseNotice={() => setNotice(null)}
    >
      <form
        id="create-section"
        className="mt-6 flex flex-col gap-4"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Account Category Selector (Public vs Govt / Police) */}
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-[#1E293B] tracking-[-0.005em] mb-1.5">
            {t('Account Category', 'അക്കൗണ്ട് വിഭാഗം')}
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setAccountCategory('PUBLIC')}
              className={`px-3.5 py-2.5 rounded-[13px] border text-left transition-all flex items-center gap-2.5 ${
                accountCategory === 'PUBLIC'
                  ? 'bg-[#165DF5]/8 border-[#165DF5] ring-2 ring-[#165DF5]/15'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  accountCategory === 'PUBLIC'
                    ? 'bg-[#165DF5] text-white'
                    : 'bg-slate-100 text-[#64748B]'
                }`}
              >
                <Users className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#0F172A] leading-tight">
                  {t('General Public', 'പൊതുജനം')}
                </p>
                <p className="text-[11px] text-[#64748B] truncate">
                  {t('Standard sports tariff', 'സാധാരണ നിരക്ക്')}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAccountCategory('GOVT_PERSONNEL')}
              className={`px-3.5 py-2.5 rounded-[13px] border text-left transition-all flex items-center gap-2.5 ${
                accountCategory === 'GOVT_PERSONNEL'
                  ? 'bg-[#165DF5]/8 border-[#165DF5] ring-2 ring-[#165DF5]/15'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  accountCategory === 'GOVT_PERSONNEL'
                    ? 'bg-[#165DF5] text-white'
                    : 'bg-slate-100 text-[#64748B]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#0F172A] leading-tight">
                  {t('Govt / Police', 'സർക്കാർ / പോലീസ്')}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium truncate">
                  {t('Subsidized concession', 'ഇളവ് നിരക്ക്')}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Field: Full Name (auto-derives sign-in username) */}
        <div className="flex flex-col">
          <label
            htmlFor="create-fullname"
            className="text-[13px] font-semibold text-[#1E293B] tracking-[-0.005em] mb-1.5"
          >
            {t('Full Name', 'പൂർണ്ണനാമം')} <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative flex items-center">
            <BadgeCheck
              className="w-[16px] h-[16px] absolute left-3.5 text-[#94A3B8] pointer-events-none"
              strokeWidth={1.9}
            />
            <input
              id="create-fullname"
              type="text"
              autoComplete="name"
              placeholder={t('e.g. Anil Kumar', 'ഉദാ. അനിൽ കുമാർ')}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (hasError) setHasError(false);
              }}
              className="auth-input pl-10 pr-4 w-full"
            />
          </div>
          {derivedUsernamePreview ? (
            <p className="text-[12px] text-[#64748B] mt-1.5">
              {t('Sign-in name:', 'സൈൻ ഇൻ പേര്:')}{' '}
              <span className="font-mono font-semibold text-[#334155]">
                {derivedUsernamePreview}
              </span>{' '}
              <span className="text-[#94A3B8]">
                ({t('you can also sign in using your full name', 'പൂർണ്ണനാമം ഉപയോഗിച്ചും സൈൻ ഇൻ ചെയ്യാം')})
              </span>
            </p>
          ) : (
            <p className="text-[12px] text-[#64748B] mt-1.5">
              {t(
                'Your sign-in name is created automatically from your full name.',
                'നിങ്ങളുടെ പേരിൽ നിന്ന് സൈൻ ഇൻ ഐഡി സ്വയം തയ്യാറാകും.',
              )}
            </p>
          )}
        </div>

        {/* Field: Password */}
        <div>
          <PasswordInput
            id="create-password"
            label={t('Password', 'പാസ്‌വേഡ്')}
            required
            autoComplete="new-password"
            placeholder={t('Create a strong password', 'ശക്തമായ പാസ്‌വേഡ് നൽകുക')}
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (hasError) setHasError(false);
            }}
          />

          {/* Compact live password criteria row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                hasMinLength ? 'text-emerald-600' : 'text-[#64748B]'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                  hasMinLength
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : 'bg-slate-200/80 text-slate-400'
                }`}
              >
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
              {t('At least 8 characters', 'കുറഞ്ഞത് 8 അക്ഷരങ്ങൾ')}
            </span>
            {confirmPassword.length > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                  passwordsMatch ? 'text-emerald-600' : 'text-[#DC2626]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                    passwordsMatch
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-red-500/15 text-[#DC2626]'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </span>
                {passwordsMatch
                  ? t('Passwords match', 'പാസ്‌വേഡുകൾ പൊരുത്തപ്പെടുന്നു')
                  : t('Passwords do not match', 'പാസ്‌വേഡുകൾ പൊരുത്തപ്പെടുന്നില്ല')}
              </span>
            )}
          </div>
        </div>

        {/* Field: Confirm Password */}
        <PasswordInput
          id="create-confirm-password"
          label={t('Confirm password', 'പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക')}
          required
          autoComplete="new-password"
          placeholder={t('Re-enter your password', 'പാസ്‌വേഡ് വീണ്ടും നൽകുക')}
          value={confirmPassword}
          hasError={hasError}
          onChange={(val) => {
            setConfirmPassword(val);
            if (hasError) setHasError(false);
          }}
        />

        {/* Inline Error Alert */}
        {hasError && (
          <div
            id="create-error-text"
            role="alert"
            className="flex items-start gap-2 rounded-[12px] bg-red-50 border border-red-200/80 px-3.5 py-2.5 text-[13px] text-[#B91C1C] font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Terms & Privacy Notice Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer pt-1 select-none group">
          <span className="relative flex items-center justify-center mt-0.5 shrink-0">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="peer sr-only"
            />
            <span className="w-[18px] h-[18px] rounded-[6px] border border-[#CBD5E1] bg-white peer-checked:bg-[#165DF5] peer-checked:border-[#165DF5] peer-focus-visible:ring-2 peer-focus-visible:ring-[#165DF5]/40 group-hover:border-[#94A3B8] transition-all flex items-center justify-center shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <Check
                className={`w-3 h-3 text-white transition-transform duration-150 ${
                  acceptedTerms ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
                strokeWidth={3}
              />
            </span>
          </span>
          <span className="text-[13px] text-[#475569] leading-relaxed">
            {t(authPageContent.termsPrefixText, 'ഞാൻ')}{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setNotice({
                  title: t(authPageContent.termsLinkLabel, 'നിബന്ധനകളും വ്യവസ്ഥകളും'),
                  message: authPageContent.termsSummaryText,
                });
              }}
              className="text-[#165DF5] hover:text-[#0F50DC] hover:underline font-semibold"
            >
              {t(authPageContent.termsLinkLabel, 'നിബന്ധനകളും വ്യവസ്ഥകളും')}
            </button>{' '}
            {t(authPageContent.termsConjunctionText, 'അതുപോലെ')}{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setNotice({
                  title: t(authPageContent.privacyLinkLabel, 'സ്വകാര്യതാ അറിയിപ്പ്'),
                  message: authPageContent.privacySummaryText,
                });
              }}
              className="text-[#165DF5] hover:text-[#0F50DC] hover:underline font-semibold"
            >
              {t(authPageContent.privacyLinkLabel, 'സ്വകാര്യതാ അറിയിപ്പും')}
            </button>{' '}
            {t('', 'അംഗീകരിക്കുന്നു')}
          </span>
        </label>

        {/* Primary Submit Button */}
        <button
          id="btn-submit-create"
          type="submit"
          disabled={!isFormComplete || isSubmitting}
          className={`btn-primary w-full mt-1 inline-flex items-center justify-center gap-2 group ${
            !isFormComplete || isSubmitting ? 'disabled' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Creating account...', 'അക്കൗണ്ട് തുടങ്ങുന്നു...')}</span>
            </>
          ) : (
            <>
              <span>{t('Create active account', 'സജീവ അക്കൗണ്ട് തുടങ്ങുക')}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthCardShell>
  );
}
