import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { AuthCardShell } from '@/components/home/AuthCardShell';
import { PasswordInput } from '@/components/home/PasswordInput';
import { getRoleRedirectPath, useAuth } from '@/context/AuthContext';
import { authMockCredentials, authPageContent } from '@/data/mockData';
import '@/styles/home.css';

/**
 * Public Create Account screen (`/register`).
 * Converted from:
 * - `kannur_city_police_create_account_default`
 * - `kannur_city_police_create_account_error`
 * - `kannur_city_police_mobile_create_account`
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const initialErrorMode = searchParams.get('state') === 'error';

  const [username, setUsername] = useState(
    initialErrorMode ? authMockCredentials.sampleCreateUsername : ''
  );
  const [password, setPassword] = useState(
    initialErrorMode ? authMockCredentials.sampleCreatePassword : ''
  );
  const [confirmPassword, setConfirmPassword] = useState(
    initialErrorMode ? authMockCredentials.sampleMismatchConfirmPassword : ''
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

  const isFormComplete =
    username.trim().length > 0 &&
    password.length >= 8 &&
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

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < 3) {
      triggerError('Username must be at least 3 characters.');
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

    const derivedFullName =
      trimmedUsername
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || trimmedUsername;

    try {
      const createdUser = await register({
        username: trimmedUsername,
        password,
        full_name: derivedFullName,
        role: 'PUBLIC',
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
      <form id="create-section" className="mt-6 flex flex-col space-y-4" onSubmit={handleSubmit} noValidate>
        {/* Field: Username * */}
        <div className="flex flex-col">
          <input
            id="create-username"
            type="text"
            autoComplete="username"
            placeholder={authPageContent.createUsernamePlaceholder}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (hasError) setHasError(false);
            }}
            className="glass-input px-5 w-full"
          />
        </div>

        {/* Field: Password * with eye icon */}
        <PasswordInput
          id="create-password"
          autoComplete="new-password"
          placeholder={authPageContent.createPasswordPlaceholder}
          value={password}
          onChange={(val) => {
            setPassword(val);
            if (hasError) setHasError(false);
          }}
        />

        {/* Grey 13 line under the password field */}
        <div className="text-[13px] text-[#6B7280] -mt-1 pl-1">
          {authPageContent.passwordRequirementHint}
        </div>

        {/* Field: Confirm password * with eye icon */}
        <PasswordInput
          id="create-confirm-password"
          autoComplete="new-password"
          placeholder={authPageContent.confirmPasswordPlaceholder}
          value={confirmPassword}
          hasError={hasError}
          onChange={(val) => {
            setConfirmPassword(val);
            if (hasError) setHasError(false);
          }}
        />

        {/* Error message container for Create Account confirm password */}
        {hasError && (
          <div
            id="create-error-text"
            role="alert"
            className="text-[13px] text-[#E5484D] font-medium pt-0.5"
          >
            {errorMessage}
          </div>
        )}

        {/* Checkbox with Terms and Privacy Notice */}
        <label className="flex items-start space-x-3 cursor-pointer pt-2 select-none">
          <input
            id="terms-checkbox"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 w-5 h-5 rounded-[6px] border border-gray-300 text-[#1F6FFF] focus:ring-[#1F6FFF] accent-[#1F6FFF] cursor-pointer"
          />
          <span className="text-[14px] text-[#6B7280] leading-snug">
            {authPageContent.termsPrefixText}{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setNotice({
                  title: authPageContent.termsLinkLabel,
                  message: authPageContent.termsSummaryText,
                });
              }}
              className="text-[#1F6FFF] hover:underline font-normal"
            >
              {authPageContent.termsLinkLabel}
            </button>{' '}
            {authPageContent.termsConjunctionText}{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setNotice({
                  title: authPageContent.privacyLinkLabel,
                  message: authPageContent.privacySummaryText,
                });
              }}
              className="text-[#1F6FFF] hover:underline font-normal"
            >
              {authPageContent.privacyLinkLabel}
            </button>
          </span>
        </label>

        {/* Full-width solid blue button "Create account" (disabled at 30% opacity until filled & ticked) */}
        <button
          id="btn-submit-create"
          type="submit"
          disabled={!isFormComplete || isSubmitting}
          className={`btn-primary w-full mt-2 flex items-center justify-center ${
            !isFormComplete || isSubmitting ? 'disabled' : ''
          }`}
        >
          {isSubmitting ? 'Creating account...' : authPageContent.createAccountCtaLabel}
        </button>
      </form>
    </AuthCardShell>
  );
}
