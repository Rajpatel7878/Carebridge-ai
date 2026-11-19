import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@/components/common';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLanguage } from '@/hooks/useLanguage';

export function TermsOfServicePage() {
  const { t } = useLanguage();
  useDocumentTitle(t.meta.termsTitle);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:text-[var(--cb-primary)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t.legal.backToHome}
      </Link>

      <div className="mt-6">
        <Badge variant="teal" dot>
          {t.legal.placeholderBadge}
        </Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--cb-text)] sm:text-3xl">
          {t.legal.terms.heading}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--cb-text-secondary)] sm:text-base">
          {t.legal.terms.subtitle}
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {t.legal.terms.sections.map((section) => (
          <Card key={section.heading}>
            <h2 className="text-base font-semibold text-[var(--cb-text)] sm:text-lg">
              {section.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
              {section.body}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
        <FileText
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
          aria-hidden="true"
        />
        <p>
          <Link
            to="/privacy"
            className="font-semibold text-[var(--cb-primary)] hover:underline"
          >
            {t.footer.links.privacyPolicy}
          </Link>{' '}
          &middot; {t.footer.contactAttribution}
        </p>
      </div>
    </section>
  );
}
