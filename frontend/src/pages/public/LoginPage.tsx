import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { AuthCardShell } from '@/components/home/AuthCardShell';
import { PasswordInput } from '@/components/home/PasswordInput';
import { getRoleRedirectPath, useAuth } from '@/context/AuthContext';
import { authMockCredentials, authPageContent } from '@/data/mockData';
import '@/styles/home.css';

/**
 * Public Sign In screen (`/login`).
 * Converted from:
 * - `kannur_city_police_sign_in_error` (desktop; default = error hidden, shown on failed check)
 * - `kannur_city_police_mobile_sign_in` (mobile responsive layout)
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const initialErrorMode = searchParams.get('state') === 'error';

  const [username, setUsername] = useState(
    initialErrorMode ? authMockCredentials.invalidDemoUsername : ''
  );
  const [password, setPassword] = useState(
    initialErrorMode ? authMockCredentials.invalidDemoPassword : ''
  );
  const [hasError, setHasError] = useState(initialErrorMode);
  const [errorMessage, setErrorMessage] = useState(authPageContent.signInErrorMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!shaking) return;
    const timer = window.setTimeout(() => setShaking(false), 320);
    return () => window.clearTimeout(timer);
  }, [shaking]);

  const triggerError = (message: string) => {
    setErrorMessage(message);
    setHasError(true);
    setShaking(false);
    window.requestAnimationFrame(() => setShaking(true));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      triggerError(authPageContent.signInErrorMessage);
      return;
    }

    setIsSubmitting(true);
    setHasError(false);

    try {
      const signedInUser = await login({
        username: trimmedUsername,
        password,
      });
      navigate(getRoleRedirectPath(signedInUser.role), { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : authPageContent.signInErrorMessage;
      triggerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardShell
      mode="signin"
      content={authPageContent}
      shaking={shaking}
      noticeTitle={notice?.title}
      noticeMessage={notice?.message}
      onCloseNotice={() => setNotice(null)}
    >
      <form id="signin-section" className="mt-6 flex flex-col space-y-4" onSubmit={handleSubmit} noValidate>
        {/* Field: Username */}
        <div className="flex flex-col">
          <input
            id="signin-username"
            type="text"
            autoComplete="username"
            placeholder={authPageContent.usernamePlaceholder}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (hasError) setHasError(false);
            }}
            className="glass-input px-5 w-full"
          />
        </div>

        {/* Field: Password with eye icon */}
        <PasswordInput
          id="signin-password"
          autoComplete="current-password"
          placeholder={authPageContent.passwordPlaceholder}
          value={password}
          hasError={hasError}
          onChange={(val) => {
            setPassword(val);
            if (hasError) setHasError(false);
          }}
        />

        {/* Error message container for Sign in */}
        {hasError && (
          <div
            id="signin-error-text"
            role="alert"
            className="text-[13px] text-[#E5484D] font-medium pt-0.5"
          >
            {errorMessage}
          </div>
        )}

        {/* Blue text link: Forgot password? aligned right */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() =>
              setNotice({
                title: authPageContent.forgotPasswordLabel,
                message: authPageContent.forgotPasswordNotice,
              })
            }
            className="text-[14px] font-medium text-[#1F6FFF] hover:underline focus:outline-none focus:ring-1 focus:ring-[#1F6FFF] rounded"
          >
            {authPageContent.forgotPasswordLabel}
          </button>
        </div>

        {/* Full-width solid blue button "Sign in" */}
        <button
          id="btn-submit-signin"
          type="submit"
          disabled={isSubmitting}
          className={`btn-primary w-full mt-2 flex items-center justify-center ${isSubmitting ? 'opacity-70 cursor-wait' : ''
            }`}
        >
          {isSubmitting ? 'Signing in...' : authPageContent.signInCtaLabel}
        </button>
      </form>
    </AuthCardShell>
  );
}
