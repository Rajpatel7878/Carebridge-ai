import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { useLanguage } from '@/hooks/useLanguage';

export function PublicFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-[var(--cb-border)] bg-[var(--cb-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand & Attribution */}
          <div className="lg:col-span-4">
            <Link to="/" aria-label="CareBridge AI Home">
              <Logo showTagline tagline={t.meta.logoTagline} />
            </Link>
            <p className="mt-3.5 text-sm font-semibold text-[var(--cb-text)]">
              {t.brand.mainTagline}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--cb-text-muted)]">
              {t.footer.description}
            </p>
            <p className="mt-4 text-xs font-medium text-[var(--cb-text-secondary)]">
              {t.footer.contactAttribution}
            </p>
          </div>

          {/* Platform Links */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
              {t.footer.columns.platform}
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--cb-text-muted)]">
              <li>
                <Link
                  to="/#home"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link
                  to="/#how-it-works"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.nav.howItWorks}
                </Link>
              </li>
              <li>
                <Link
                  to="/#features"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.nav.features}
                </Link>
              </li>
              <li>
                <Link
                  to="/#impact"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.nav.impact}
                </Link>
              </li>
              <li>
                <Link
                  to="/#about"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.nav.about}
                </Link>
              </li>
              <li>
                <Link
                  to="/#contact"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.nav.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Patient Links */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
              {t.footer.columns.patients}
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--cb-text-muted)]">
              <li>
                <Link
                  to="/patient"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.patientOverview}
                </Link>
              </li>
              <li>
                <Link
                  to="/patient/reports"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.patientReports}
                </Link>
              </li>
              <li>
                <Link
                  to="/patient/referrals"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.patientReferrals}
                </Link>
              </li>
              <li>
                <Link
                  to="/patient/appointments"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.patientAppointments}
                </Link>
              </li>
              <li>
                <Link
                  to="/patient/follow-ups"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.patientFollowUps}
                </Link>
              </li>
            </ul>
          </div>

          {/* Doctor Links */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
              {t.footer.columns.doctors}
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--cb-text-muted)]">
              <li>
                <Link
                  to="/doctor"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.doctorOverview}
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor/patients"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.doctorPatients}
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor/risk-review"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.doctorRiskReview}
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor/referrals"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.doctorReferrals}
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor/follow-ups"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.doctorFollowUps}
                </Link>
              </li>
            </ul>
          </div>

          {/* Administrator Links */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
              {t.footer.columns.admins}
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--cb-text-muted)]">
              <li>
                <Link
                  to="/admin"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.adminOverview}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/population-health"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.adminPopulation}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/risk-distribution"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.adminRisk}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/doctors"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.adminDoctors}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/analytics"
                  className="transition-colors hover:text-[var(--cb-text)]"
                >
                  {t.footer.links.adminAnalytics}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="mt-10 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-bg)] px-4 py-3.5 text-xs leading-relaxed text-[var(--cb-text-muted)]">
          <strong className="font-semibold text-[var(--cb-text-secondary)]">
            {t.security.disclaimerLabel}:
          </strong>{' '}
          {t.security.disclaimer}
        </div>

        {/* Legal & Attribution Bar */}
        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-[var(--cb-border)] pt-6 text-xs text-[var(--cb-text-muted)] md:flex-row md:items-center">
          <p>{t.footer.copyright}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-medium">
            <Link
              to="/privacy"
              className="transition-colors hover:text-[var(--cb-text)]"
            >
              {t.footer.links.privacyPolicy}
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-[var(--cb-text)]"
            >
              {t.footer.links.termsOfService}
            </Link>
            <Link
              to="/login"
              className="transition-colors hover:text-[var(--cb-text)]"
            >
              {t.nav.login}
            </Link>
            <Link
              to="/register"
              className="transition-colors hover:text-[var(--cb-text)]"
            >
              {t.nav.getStarted}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
