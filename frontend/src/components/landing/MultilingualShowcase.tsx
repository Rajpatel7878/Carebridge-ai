import { CheckCircle2, Globe2, Languages } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { useLanguage } from '@/hooks/useLanguage';

export function MultilingualShowcase() {
  const { language, t } = useLanguage();

  return (
    <section
      id="multilingual"
      aria-labelledby="multilingual-heading"
      className="border-y border-[var(--cb-border)] bg-[var(--cb-surface)] py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="lg:col-span-6">
          <SectionHeading
            id="multilingual-heading"
            eyebrow={t.multilingual.eyebrow}
            heading={t.multilingual.heading}
            description={t.multilingual.description}
          />

          <div className="mt-7 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg)] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--cb-text)] uppercase">
              <Languages
                className="h-4 w-4 text-[var(--cb-primary)]"
                aria-hidden="true"
              />
              {t.multilingual.selectLanguageHeading}
            </div>

            <div className="mt-3.5">
              <LanguageSwitcher variant="full" />
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs font-medium text-[var(--cb-secondary-text)]">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
                aria-hidden="true"
              />
              <span>{t.multilingual.activeStatus}</span>
            </div>

            <p className="mt-2.5 text-xs leading-relaxed text-[var(--cb-text-muted)]">
              {t.multilingual.roadmapNote}
            </p>
          </div>
        </div>

        {/* Live Localized Patient Communication Preview */}
        <div className="lg:col-span-6">
          <div
            lang={language}
            className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg)] p-5 shadow-[var(--cb-shadow-md)] sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--cb-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cb-secondary-soft)] text-[var(--cb-secondary-text)]">
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--cb-text)]">
                    {t.multilingual.previewHeader}
                  </p>
                  <p className="text-xs text-[var(--cb-text-muted)]">
                    {language === 'hi' ? 'हिन्दी (Hindi)' : 'English'}
                  </p>
                </div>
              </div>
              <Badge variant="neutral">{t.multilingual.previewBadge}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {t.multilingual.previewItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--cb-text-muted)]">
                      {item.label}
                    </span>
                    <span className="rounded-full bg-[var(--cb-primary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--cb-primary)]">
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
