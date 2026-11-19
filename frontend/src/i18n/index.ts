import { enTranslations } from '@/i18n/translations/en';
import { hiTranslations } from '@/i18n/translations/hi';
import type {
  LanguageOption,
  PublicTranslations,
  SupportedLanguage,
} from '@/i18n/types';

export const LANGUAGE_STORAGE_KEY = 'carebridge-language';

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    shortLabel: 'EN',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    shortLabel: 'हिं',
  },
] as const;

export const TRANSLATIONS: Record<SupportedLanguage, PublicTranslations> = {
  en: enTranslations,
  hi: hiTranslations,
};

export function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return value === 'en' || value === 'hi';
}

export type {
  EcosystemNodeCopy,
  FeatureAvailability,
  FeatureCardCopy,
  ImpactCardCopy,
  LanguageOption,
  LegalSectionCopy,
  ProblemCardCopy,
  PublicTranslations,
  RoleExperienceCopy,
  SecurityItemCopy,
  SupportedLanguage,
  WorkflowStepCopy,
} from '@/i18n/types';
