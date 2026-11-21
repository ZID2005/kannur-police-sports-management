import { type ReactNode, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  label?: string;
  required?: boolean;
  labelAction?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  hasError?: boolean;
}

/**
 * Crisp bordered password field with explicit label, leading Lock icon,
 * and clean visibility toggle.
 */
export function PasswordInput({
  id,
  label,
  required = false,
  labelAction,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  hasError = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col">
      {(label || labelAction) && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {label && (
            <label
              htmlFor={id}
              className="text-[13px] font-semibold text-[#1E293B] tracking-[-0.005em]"
            >
              {label}
              {required && <span className="text-[#DC2626] ml-0.5">*</span>}
            </label>
          )}
          {labelAction}
        </div>
      )}

      <div className="relative flex items-center">
        <Lock
          className={`w-[16px] h-[16px] absolute left-3.5 pointer-events-none transition-colors ${
            hasError ? 'text-[#DC2626]' : 'text-[#94A3B8]'
          }`}
          strokeWidth={1.9}
        />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`auth-input pl-10 pr-11 w-full ${hasError ? 'input-error' : ''}`}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DF5]/40"
        >
          {visible ? (
            <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.85} />
          ) : (
            <Eye className="w-[17px] h-[17px]" strokeWidth={1.85} />
          )}
        </button>
      </div>
    </div>
  );
}
