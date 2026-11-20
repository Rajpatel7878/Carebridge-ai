import { expect, it } from 'vitest';
import { ANALYSIS_COPY } from '@/i18n/analysis';
import { LOGIN_COPY } from '@/i18n/login';
import { AUDIT_COPY } from '@/i18n/audit';
import { enTranslations } from '@/i18n/translations/en';
import { hiTranslations } from '@/i18n/translations/hi';

function compareKeys(english: unknown, hindi: unknown, path = ''): string[] {
  if (Array.isArray(english)) {
    if (!Array.isArray(hindi) || english.length !== hindi.length) return [path];
    return english.flatMap((value, index) =>
      compareKeys(value, hindi[index], `${path}[${index}]`),
    );
  }
  if (english && typeof english === 'object') {
    if (!hindi || typeof hindi !== 'object' || Array.isArray(hindi))
      return [path];
    return Object.entries(english).flatMap(([key, value]) =>
      compareKeys(
        value,
        (hindi as Record<string, unknown>)[key],
        `${path}.${key}`,
      ),
    );
  }
  if (
    typeof english === 'string' &&
    (typeof hindi !== 'string' || hindi.trim().length === 0)
  )
    return [path];
  return [];
}

it('has nonempty Hindi entries for every public translation key', () => {
  expect(compareKeys(enTranslations, hiTranslations)).toEqual([]);
});

it('has Hindi entries for every audit page copy key', () => {
  expect(compareKeys(AUDIT_COPY.en, AUDIT_COPY.hi)).toEqual([]);
});

it('has Hindi entries for every report analysis interface key', () => {
  expect(compareKeys(ANALYSIS_COPY.en, ANALYSIS_COPY.hi)).toEqual([]);
});

it('has Hindi entries for every login key', () => {
  expect(compareKeys(LOGIN_COPY.en, LOGIN_COPY.hi)).toEqual([]);
});
