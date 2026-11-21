import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, User } from 'lucide-react';
import { ApiError } from '@/api/client';
import { AuthCardShell } from '@/components/home/AuthCardShell';
import { PasswordInput } from '@/components/home/PasswordInput';
import { getRoleRedirectPath, useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authMockCredentials, authPageContent } from '@/data/mockData';
import '@/styles/home.css';

/**
 * Public Sign In screen (`/login`).
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { t } = useLanguage();
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
      <form
        id="signin-section"
        className="mt-6 flex flex-col gap-4"
        onSubmit={handleSubmit}
        noValidate
      >
          {/* Field: Name or Username */}
        <div className="flex flex-col">
          <label
            htmlFor="signin-username"
            className="text-[13px] font-semibold text-[#1E293B] tracking-[-0.005em] mb-1.5"
          >
            {t('Name or Username', 'പേര് അല്ലെങ്കിൽ ഉപയോക്തൃനാമം')}
          </label>
          <div className="relative flex items-center">
            <User
              className={`w-[16px] h-[16px] absolute left-3.5 pointer-events-none transition-colors ${
                hasError ? 'text-[#DC2626]' : 'text-[#94A3B8]'
              }`}
              strokeWidth={1.9}
            />
            <input
              id="signin-username"
              type="text"
              autoComplete="username"
              placeholder={t('Enter your full name or username', 'നിങ്ങളുടെ പേരോ ഉപയോക്തൃനാമമോ നൽകുക')}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (hasError) setHasError(false);
              }}
              className={`auth-input pl-10 pr-4 w-full ${hasError ? 'input-error' : ''}`}
            />
          </div>
        </div>

        {/* Field: Password + inline Forgot password action */}
        <PasswordInput
          id="signin-password"
          label={t('Password', 'പാസ്‌വേഡ്')}
          labelAction={
            <button
              type="button"
              onClick={() =>
                setNotice({
                  title: t(authPageContent.forgotPasswordLabel, 'പാസ്‌വേഡ് മറന്നോ?'),
                  message: authPageContent.forgotPasswordNotice,
                })
              }
              className="text-[12.5px] font-semibold text-[#165DF5] hover:text-[#0F50DC] hover:underline focus:outline-none rounded"
            >
              {t(authPageContent.forgotPasswordLabel, 'പാസ്‌വേഡ് മറന്നോ?')}
            </button>
          }
          autoComplete="current-password"
          placeholder={t('Enter your password', 'പാസ്‌വേഡ് നൽകുക')}
          value={password}
          hasError={hasError}
          onChange={(val) => {
            setPassword(val);
            if (hasError) setHasError(false);
          }}
        />

        {/* Inline Error Alert */}
        {hasError && (
          <div
            id="signin-error-text"
            role="alert"
            className="flex items-start gap-2 rounded-[12px] bg-red-50 border border-red-200/80 px-3.5 py-2.5 text-[13px] text-[#B91C1C] font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sharp Modern Primary Submit Button */}
        <button
          id="btn-submit-signin"
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2 group"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Signing in...', 'സൈൻ ഇൻ ചെയ്യുന്നു...')}</span>
            </>
          ) : (
            <>
              <span>{t(authPageContent.signInCtaLabel, 'സൈൻ ഇൻ ചെയ്യുക')}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthCardShell>
  );
}
