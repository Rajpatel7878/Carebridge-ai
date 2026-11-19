import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LanguageContext } from '@/contexts/language-context';
import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@/i18n';

function readInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted browsing contexts
  }
  return 'en';
}

export interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Ignore storage access errors in restricted browsing contexts
    }
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: TRANSLATIONS[language],
      languages: SUPPORTED_LANGUAGES,
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
