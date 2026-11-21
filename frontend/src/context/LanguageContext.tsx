import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Language } from '@/types';

const STORAGE_KEY = 'kcp_portal_language';

interface LanguageContextValue {
  lang: Language;
  isMalayalam: boolean;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  /** Concise bilingual helper: returns `ml` when Malayalam is active, otherwise `en`. */
  t: (en: string, ml: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'ML' || saved === 'EN') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'EN';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'EN' ? 'ML' : 'EN');
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang === 'ML' ? 'ml' : 'en';
  }, [lang]);

  const t = useCallback(
    (en: string, ml: string) => (lang === 'ML' ? ml : en),
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      isMalayalam: lang === 'ML',
      setLang,
      toggleLang,
      t,
    }),
    [lang, setLang, toggleLang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }
  return ctx;
}
