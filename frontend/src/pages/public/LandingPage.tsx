import { useState, type MouseEvent } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BellRing,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Compass,
  EyeOff,
  FileSearch,
  FileStack,
  FileText,
  GitBranch,
  HeartHandshake,
  HeartPulse,
  KeyRound,
  Languages,
  LayoutDashboard,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/common';
import {
  HeroEcosystemVisual,
  MultilingualShowcase,
  SectionHeading,
} from '@/components/landing';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLanguage } from '@/hooks/useLanguage';
import type { FeatureAvailability, RoleExperienceCopy } from '@/i18n';
import { getDashboardPathForRole } from '@/types/auth';
import { cn } from '@/utils/cn';
import { scrollToSectionId } from '@/utils/scroll';

const PROBLEM_ICONS: readonly LucideIcon[] = [
  CalendarClock,
  Clock,
  FileStack,
  EyeOff,
  AlertCircle,
];

const WORKFLOW_ICONS: readonly LucideIcon[] = [
  FileText,
  FileSearch,
  Activity,
  Stethoscope,
  GitBranch,
  ClipboardCheck,
];

const FEATURE_ICONS: Record<string, LucideIcon> = {
  'report-understanding': FileSearch,
  'risk-prioritization': HeartPulse,
  'smart-referral': GitBranch,
  'appointment-management': CalendarCheck2,
  'followup-reminders': BellRing,
  'patient-dashboard': LayoutDashboard,
  'doctor-dashboard': Stethoscope,
  'population-analytics': BarChart3,
  'multilingual-experience': Languages,
  'secure-access': ShieldCheck,
};

const AVAILABILITY_BADGE: Record<FeatureAvailability, BadgeVariant> = {
  live: 'success',
  preview: 'teal',
  planned: 'primary',
};

const ROLE_CONFIG: Record<
  RoleExperienceCopy['id'],
  {
    to: string;
    icon: LucideIcon;
    badge: BadgeVariant;
    accentBorder: string;
  }
> = {
  patient: {
    to: '/patient',
    icon: User,
    badge: 'teal',
    accentBorder: 'border-t-[#14B8A6]',
  },
  doctor: {
    to: '/doctor',
    icon: Stethoscope,
    badge: 'primary',
    accentBorder: 'border-t-[#1769AA] dark:border-t-[#3B9AE1]',
  },
  admin: {
    to: '/admin',
    icon: Users,
    badge: 'primary',
    accentBorder: 'border-t-[#0F4C81] dark:border-t-[#5EEAD4]',
  },
};

const SECURITY_ICONS: readonly LucideIcon[] = [
  UserCheck,
  KeyRound,
  ShieldCheck,
  Lock,
  FileText,
];

const ABOUT_ICONS: readonly LucideIcon[] = [
  Users,
  Award,
  Compass,
  HeartHandshake,
];

type FeatureFilter = 'all' | FeatureAvailability;

export function LandingPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [featureFilter, setFeatureFilter] = useState<FeatureFilter>('all');

  useDocumentTitle(t.meta.homeTitle);

  const dashboardPath = user ? getDashboardPathForRole(user.role) : '/login';
  const primaryHeroPath = isAuthenticated ? dashboardPath : '/register';
  const explorePlatformPath = isAuthenticated ? dashboardPath : '/login';

  const filteredFeatures =
    featureFilter === 'all'
      ? t.features.items
      : t.features.items.filter((item) => item.availability === featureFilter);

  const handleAnchorScroll = (
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    event.preventDefault();
    if (scrollToSectionId(sectionId)) {
      window.history.replaceState(null, '', `/#${sectionId}`);
    }
  };

  const filterOptions: {
    id: FeatureFilter;
    label: string;
    count: number;
  }[] = [
    {
      id: 'all',
      label: t.features.filters.all,
      count: t.features.items.length,
    },
    {
      id: 'live',
      label: t.features.filters.live,
      count: t.features.items.filter((f) => f.availability === 'live').length,
    },
    {
      id: 'preview',
      label: t.features.filters.preview,
      count: t.features.items.filter((f) => f.availability === 'preview')
        .length,
    },
    {
      id: 'planned',
      label: t.features.filters.planned,
      count: t.features.items.filter((f) => f.availability === 'planned')
        .length,
    },
  ];

  return (
    <div>
      {/* 1. HERO SECTION */}
      <section
        id="home"
        aria-labelledby="hero-heading"
        className="cb-hero-surface relative overflow-hidden border-b border-[var(--cb-border)]"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-24">
          <div className="lg:col-span-6">
            <Badge variant="primary" dot>
              {t.hero.eyebrow}
            </Badge>

            <h1
              id="hero-heading"
              className="mt-5 text-3xl leading-[1.12] font-bold tracking-tight text-[var(--cb-text)] sm:text-4xl lg:text-[3.125rem]"
            >
              {t.hero.heading}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--cb-text-secondary)] sm:text-lg">
              {t.hero.description}
            </p>

            <p className="mt-3 max-w-xl text-sm font-medium text-[var(--cb-primary)]">
              {t.brand.supportingTagline}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                to={primaryHeroPath}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1769AA] px-6 text-sm font-semibold text-white shadow-[var(--cb-shadow-sm)] transition-colors hover:bg-[#12568B] active:bg-[#0E4470] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
              >
                {isAuthenticated ? t.hero.authenticatedCta : t.hero.primaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#how-it-works"
                onClick={(event) => handleAnchorScroll(event, 'how-it-works')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] px-6 text-sm font-semibold text-[var(--cb-text)] shadow-[var(--cb-shadow-xs)] transition-colors hover:border-[var(--cb-primary)] hover:bg-[var(--cb-surface-subtle)]"
              >
                {t.hero.secondaryCta}
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-[var(--cb-border)] pt-6 text-xs font-medium text-[var(--cb-text-muted)]">
              {t.hero.trustPoints.map((point) => (
                <li key={point} className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <HeroEcosystemVisual />
          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section
        id="problem"
        aria-labelledby="problem-heading"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <SectionHeading
          id="problem-heading"
          eyebrow={t.problem.eyebrow}
          heading={t.problem.heading}
          description={t.problem.description}
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.problem.items.map((item, index) => {
            const Icon = PROBLEM_ICONS[index] ?? AlertCircle;
            return (
              <article
                key={item.title}
                className="cb-card-interactive flex flex-col rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-xs)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-[var(--cb-text-muted)] cb-tabular">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-[var(--cb-text)] sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                  {item.description}
                </p>
              </article>
            );
          })}

          {/* Continuity bridge summary card completing the 6-cell grid */}
          <div className="flex flex-col justify-between rounded-2xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/70 p-6">
            <div>
              <Badge variant="primary">{t.brand.product}</Badge>
              <p className="mt-4 text-sm leading-relaxed font-medium text-[var(--cb-text)]">
                {t.problem.continuityNote}
              </p>
            </div>
            <a
              href="#solution"
              onClick={(event) => handleAnchorScroll(event, 'solution')}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--cb-primary)] hover:underline"
            >
              {t.solution.heading}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* 3. SOLUTION SECTION */}
      <section
        id="solution"
        aria-labelledby="solution-heading"
        className="border-y border-[var(--cb-border)] bg-[var(--cb-surface)] py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            id="solution-heading"
            eyebrow={t.solution.eyebrow}
            heading={t.solution.heading}
            description={t.solution.description}
          />

          <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.solution.steps.map((step, index) => {
              const Icon = WORKFLOW_ICONS[index] ?? FileText;
              return (
                <li
                  key={step.step}
                  className="cb-card-interactive relative flex flex-col justify-between rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg)] p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full border border-[var(--cb-secondary-border)] bg-[var(--cb-secondary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--cb-secondary-text)] cb-tabular">
                        {step.step}
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-primary)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-[var(--cb-text)] sm:text-lg">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                      {step.description}
                    </p>
                  </div>
                  <p className="mt-4 border-t border-[var(--cb-border)] pt-3 text-xs font-medium text-[var(--cb-text-muted)]">
                    {step.actor}
                  </p>
                </li>
              );
            })}
          </ol>

          {/* Explicit Clinical Judgment Disclosure */}
          <div className="mt-8 flex items-start gap-3.5 rounded-2xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/65 p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-surface)] text-[var(--cb-primary)] shadow-[var(--cb-shadow-xs)]">
              <Stethoscope className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--cb-text)]">
                {t.solution.clinicalNoticeTitle}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm">
                {t.solution.clinicalNoticeBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS — SIX-STEP VISUAL JOURNEY */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <SectionHeading
          id="how-it-works-heading"
          eyebrow={t.howItWorks.eyebrow}
          heading={t.howItWorks.heading}
          description={t.howItWorks.description}
          align="center"
        />

        <div className="relative mt-12">
          {/* Desktop horizontal connecting track */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-11 right-10 left-10 hidden h-0.5 bg-gradient-to-r from-[#1769AA]/35 via-[#14B8A6]/50 to-[#1769AA]/35 lg:block"
          />

          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {t.howItWorks.steps.map((step, index) => {
              const Icon = WORKFLOW_ICONS[index] ?? FileText;
              const isLast = index === t.howItWorks.steps.length - 1;
              return (
                <li
                  key={step.step}
                  className="relative flex gap-4 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-5 shadow-[var(--cb-shadow-xs)] lg:flex-col lg:items-center lg:gap-0 lg:text-center"
                >
                  {/* Vertical mobile connector */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute top-16 bottom-[-1rem] left-10 w-px bg-[var(--cb-border-strong)] sm:hidden"
                    />
                  )}

                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1769AA] px-1 text-[10px] font-bold text-white cb-tabular dark:bg-[#2B82C9]">
                      {step.step}
                    </span>
                  </div>

                  <div className="lg:mt-4">
                    <p className="text-[11px] font-semibold tracking-wider text-[var(--cb-secondary-text)] uppercase">
                      {step.actor}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-[var(--cb-text)] sm:text-base">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* 5. KEY FEATURES (10 CARDS WITH HONEST CAPABILITY BADGES) */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="border-y border-[var(--cb-border)] bg-[var(--cb-surface)] py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading
              id="features-heading"
              eyebrow={t.features.eyebrow}
              heading={t.features.heading}
              description={t.features.description}
            />

            <div
              role="group"
              aria-label="Filter platform capabilities by status"
              className="flex flex-wrap items-center gap-1.5"
            >
              {filterOptions.map((option) => {
                const isSelected = featureFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setFeatureFilter(option.id)}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors cb-tabular',
                      isSelected
                        ? 'border-[#1769AA] bg-[#1769AA] text-white dark:border-[#2B82C9] dark:bg-[#2B82C9]'
                        : 'border-[var(--cb-border)] bg-[var(--cb-bg)] text-[var(--cb-text-secondary)] hover:border-[var(--cb-border-strong)] hover:text-[var(--cb-text)]',
                    )}
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px]',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--cb-surface)] text-[var(--cb-text-muted)]',
                      )}
                    >
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-xs text-[var(--cb-text-muted)]">
            {t.features.transparencyNote}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filteredFeatures.map((feature) => {
              const Icon = FEATURE_ICONS[feature.id] ?? ShieldCheck;
              return (
                <article
                  key={feature.id}
                  className="cb-card-interactive flex flex-col justify-between rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg)] p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-primary)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold leading-snug text-[var(--cb-text)] sm:text-[15px]">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-[13px]">
                      {feature.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--cb-border)]">
                    <Badge variant={AVAILABILITY_BADGE[feature.availability]}>
                      {feature.availabilityLabel}
                    </Badge>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. THREE USER EXPERIENCES */}
      <section
        id="experiences"
        aria-labelledby="experiences-heading"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <SectionHeading
          id="experiences-heading"
          eyebrow={t.experiences.eyebrow}
          heading={t.experiences.heading}
          description={t.experiences.description}
        />

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {t.experiences.roles.map((role) => {
            const config = ROLE_CONFIG[role.id];
            const Icon = config.icon;
            return (
              <article
                key={role.id}
                className={cn(
                  'cb-card-interactive flex flex-col justify-between rounded-2xl border border-t-4 border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-xs)] sm:p-7',
                  config.accentBorder,
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={config.badge}>{role.eyebrow}</Badge>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cb-surface-subtle)] text-[var(--cb-primary)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl leading-snug font-bold tracking-tight text-[var(--cb-text)]">
                    {role.heading}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                    {role.description}
                  </p>

                  <ul className="mt-6 space-y-2.5 border-t border-[var(--cb-border)] pt-5">
                    {role.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-sm text-[var(--cb-text-secondary)]"
                      >
                        <CheckCircle2
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7">
                  <Link
                    to={config.to}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--cb-border-strong)] bg-[var(--cb-bg)] px-4 text-sm font-semibold text-[var(--cb-text)] transition-colors hover:border-[#1769AA] hover:bg-[#1769AA] hover:text-white dark:hover:border-[#2B82C9] dark:hover:bg-[#2B82C9]"
                  >
                    {role.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <p className="mt-2.5 text-center text-[11px] text-[var(--cb-text-muted)]">
                    {role.accessNote}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-[var(--cb-text-muted)]">
          {t.experiences.authGuardNote}
        </p>
      </section>

      {/* 7. POPULATION HEALTH IMPACT */}
      <section
        id="impact"
        aria-labelledby="impact-heading"
        className="bg-gradient-to-br from-[#0F3D68] via-[#134E80] to-[#0E5A6D] py-16 text-white sm:py-20 lg:py-24 dark:from-[#0B192C] dark:via-[#0F243E] dark:to-[#0C2F3D]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            id="impact-heading"
            eyebrow={t.impact.eyebrow}
            heading={t.impact.heading}
            description={t.impact.description}
            tone="inverse"
          />

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.impact.items.map((item) => (
              <article
                key={item.title}
                className="flex flex-col justify-between rounded-2xl border border-white/14 bg-white/[0.07] p-6 backdrop-blur-xs transition-colors hover:border-white/25 hover:bg-white/[0.1]"
              >
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200/90">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/12 pt-3.5 text-xs">
                  <span className="rounded-md bg-white/10 px-2 py-1 text-slate-200">
                    {item.fromState}
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-[#5EEAD4]"
                    aria-hidden="true"
                  />
                  <span className="rounded-md bg-[#14B8A6]/20 px-2 py-1 font-semibold text-[#99F6E4]">
                    {item.toState}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Clearly Labeled Illustrative Architecture Summary */}
          <div className="mt-10 rounded-2xl border border-white/16 bg-slate-950/25 p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {t.impact.illustrativeBanner.title}
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  {t.impact.illustrativeBanner.caption}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-[#5EEAD4]/40 bg-[#14B8A6]/18 px-3 py-1 text-xs font-semibold text-[#99F6E4]">
                {t.impact.illustrativeBanner.badge}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {t.impact.illustrativeBanner.pillars.map((pillar) => (
                <div
                  key={pillar.label}
                  className="rounded-xl border border-white/10 bg-white/[0.05] p-4"
                >
                  <p className="text-xl font-bold tracking-tight text-white cb-tabular sm:text-2xl">
                    {pillar.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200/90">
                    {pillar.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. MULTILINGUAL EXPERIENCE (LIVE ENGLISH + HINDI) */}
      <MultilingualShowcase />

      {/* 9. PRIVACY AND SECURITY SECTION */}
      <section
        id="security"
        aria-labelledby="security-heading"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="security-heading"
              eyebrow={t.security.eyebrow}
              heading={t.security.heading}
              description={t.security.description}
            />

            <p className="mt-4 text-xs leading-relaxed text-[var(--cb-text-muted)]">
              {t.security.scopeNote}
            </p>

            {/* Verbatim Medical Disclaimer Card */}
            <div
              role="note"
              aria-label={t.security.disclaimerLabel}
              className="mt-6 rounded-2xl border border-[var(--cb-warning-border)] bg-[var(--cb-warning-soft)] p-5"
            >
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-[var(--cb-warning)] uppercase">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.security.disclaimerLabel}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--cb-text)]">
                {t.security.disclaimer}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:col-span-7">
            {t.security.items.map((item, index) => {
              const Icon = SECURITY_ICONS[index] ?? ShieldCheck;
              return (
                <article
                  key={item.title}
                  className="flex flex-col gap-4 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-5 shadow-[var(--cb-shadow-xs)] sm:flex-row sm:items-start"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-[var(--cb-text)]">
                        {item.title}
                      </h3>
                      <Badge
                        variant={item.isLive ? 'success' : 'neutral'}
                        dot={item.isLive}
                      >
                        {item.statusLabel}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. ABOUT CAREBRIDGE AI */}
      <section
        id="about"
        aria-labelledby="about-heading"
        className="border-y border-[var(--cb-border)] bg-[var(--cb-surface)] py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <SectionHeading
                id="about-heading"
                eyebrow={t.about.eyebrow}
                heading={t.about.heading}
                description={t.about.description}
              />
              <p className="mt-4 text-sm leading-relaxed text-[var(--cb-text-muted)]">
                {t.about.secondaryDescription}
              </p>

              <blockquote className="mt-6 rounded-xl border-l-4 border-[var(--cb-primary)] bg-[var(--cb-bg)] px-4 py-3.5">
                <p className="text-sm font-semibold text-[var(--cb-text)]">
                  &ldquo;{t.brand.mainTagline}&rdquo;
                </p>
                <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
                  {t.brand.supportingTagline}
                </p>
              </blockquote>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
              {t.about.highlights.map((highlight, index) => {
                const Icon = ABOUT_ICONS[index] ?? Users;
                return (
                  <article
                    key={highlight.label}
                    className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg)] p-6"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cb-secondary-soft)] text-[var(--cb-secondary-text)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="mt-4 text-xs font-semibold tracking-wider text-[var(--cb-text-muted)] uppercase">
                      {highlight.label}
                    </p>
                    <h3 className="mt-1 text-lg font-bold tracking-tight text-[var(--cb-text)]">
                      {highlight.value}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm">
                      {highlight.detail}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 11. CONTACT & VERIFIED PLATFORM ACCESS */}
      <section
        id="contact"
        aria-labelledby="contact-heading"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <SectionHeading
          id="contact-heading"
          eyebrow={t.contact.eyebrow}
          heading={t.contact.heading}
          description={t.contact.description}
        />

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {t.contact.cards.map((card) => (
            <article
              key={card.title}
              className="cb-card-interactive flex flex-col justify-between rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-xs)]"
            >
              <div>
                <h3 className="text-base font-bold text-[var(--cb-text)]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                  {card.description}
                </p>
              </div>
              <Link
                to={card.to}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--cb-primary)] hover:underline"
              >
                {card.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[var(--cb-text-muted)]">
          {t.contact.noFakeContactNote}
        </p>

        {/* 12. CLOSING CALL TO ACTION */}
        <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-r from-[#134E80] via-[#1769AA] to-[#0E7490] p-8 text-white shadow-[var(--cb-shadow-lg)] sm:p-12 dark:from-[#102642] dark:via-[#153B63] dark:to-[#0E4D5C]">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-[#99F6E4] uppercase">
                {t.cta.eyebrow}
              </p>
              <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {t.cta.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/95 sm:text-base">
                {t.cta.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#134E80] shadow-[var(--cb-shadow-sm)] transition-colors hover:bg-slate-100"
                >
                  {t.cta.primaryButton}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              <Link
                to={explorePlatformPath}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition-colors',
                  isAuthenticated
                    ? 'bg-white text-[#134E80] hover:bg-slate-100'
                    : 'border border-white/35 bg-white/10 text-white hover:bg-white/18',
                )}
              >
                {isAuthenticated
                  ? t.cta.secondaryAuthButton
                  : t.cta.secondaryButton}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
