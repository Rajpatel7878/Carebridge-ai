import { createContext } from 'react';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  type LanguageOption,
  type PublicTranslations,
  type SupportedLanguage,
} from '@/i18n';

export interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (next: SupportedLanguage) => void;
  t: PublicTranslations;
  languages: readonly LanguageOption[];
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => undefined,
  t: TRANSLATIONS.en,
  languages: SUPPORTED_LANGUAGES,
});
