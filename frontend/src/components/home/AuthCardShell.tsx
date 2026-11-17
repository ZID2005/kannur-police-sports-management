import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { AuthPageContent, AuthTabMode } from '@/types/home';

interface AuthCardShellProps {
  mode: AuthTabMode;
  content: AuthPageContent;
  shaking: boolean;
  noticeTitle?: string | null;
  noticeMessage?: string | null;
  onCloseNotice?: () => void;
  children: ReactNode;
}

/**
 * Centred Apple Liquid Glass auth card shell (480px max width on desktop,
 * responsive padding for mobile) shared by `/login` and `/register`.
 * Bottom footer bars from raw exports are intentionally omitted.
 */
export function AuthCardShell({
  mode,
  content,
  shaking,
  noticeTitle,
  noticeMessage,
  onCloseNotice,
  children,
}: AuthCardShellProps) {
  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4 md:p-8 w-full">
      <div className="ambient-glow-tr" aria-hidden="true" />
      <div className="ambient-glow-bl" aria-hidden="true" />

      <div
        id="auth-card"
        className={`liquid-glass-card relative z-10 w-full max-w-[480px] p-6 md:p-10 flex flex-col ${
          shaking ? 'shake-active' : ''
        }`}
      >
        {/* Title & Subtitle */}
        <h1 className="text-[32px] md:text-[40px] font-bold text-[#111418] tracking-tight leading-none">
          {content.title}
        </h1>
        <p className="text-[15px] text-[#6B7280] mt-3 leading-normal">{content.subtitle}</p>

        {/* Glass Segmented Control (48px high) */}
        <div className="segmented-control mt-8 w-full flex items-center" role="tablist">
          <div
            className="segmented-capsule"
            style={{
              transform: mode === 'signin' ? 'translateX(0%)' : 'translateX(100%)',
            }}
          />
          <Link
            to="/login"
            role="tab"
            aria-selected={mode === 'signin'}
            className={
              mode === 'signin'
                ? 'relative z-10 w-1/2 h-full text-[15px] font-semibold text-[#1F6FFF] transition-colors flex items-center justify-center'
                : 'relative z-10 w-1/2 h-full text-[15px] font-medium text-[#6B7280] hover:text-[#111418] transition-colors flex items-center justify-center'
            }
          >
            {content.signInTabLabel}
          </Link>
          <Link
            to="/register"
            role="tab"
            aria-selected={mode === 'create'}
            className={
              mode === 'create'
                ? 'relative z-10 w-1/2 h-full text-[15px] font-semibold text-[#1F6FFF] transition-colors flex items-center justify-center'
                : 'relative z-10 w-1/2 h-full text-[15px] font-medium text-[#6B7280] hover:text-[#111418] transition-colors flex items-center justify-center'
            }
          >
            {content.createAccountTabLabel}
          </Link>
        </div>

        {/* Form Body */}
        {children}

        {/* Optional Portal Notice / Policy Drawer */}
        {noticeMessage && (
          <div
            role="status"
            className="mt-4 rounded-2xl bg-white/75 border border-white/90 px-4 py-3 text-[13px] text-[#111418] flex items-start justify-between gap-3 shadow-sm"
          >
            <div>
              {noticeTitle && (
                <p className="font-semibold text-[#1F6FFF] mb-0.5">{noticeTitle}</p>
              )}
              <p className="text-[#6B7280] leading-relaxed">{noticeMessage}</p>
            </div>
            {onCloseNotice && (
              <button
                type="button"
                aria-label="Dismiss notice"
                onClick={onCloseNotice}
                className="text-[#6B7280] hover:text-[#111418] p-1 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
