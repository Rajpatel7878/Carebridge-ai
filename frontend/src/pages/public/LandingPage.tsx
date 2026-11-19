import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GitBranch,
  HeartPulse,
  Lock,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@/components/common';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Capture Screening & Lab Reports',
    description:
      'Organize preventive screening results and diagnostic panels in one structured timeline accessible to both patients and care teams.',
    icon: FileCheck2,
  },
  {
    step: '02',
    title: 'Prioritize Patients by Clinical Risk',
    description:
      'Surface transparent, factor-based risk tiers so clinicians immediately identify patients requiring urgent attention.',
    icon: Activity,
  },
  {
    step: '03',
    title: 'Coordinate Referrals & Appointments',
    description:
      'Route patients from primary screening clinics to the right specialist with clear urgency, notes, and scheduled slots.',
    icon: GitBranch,
  },
  {
    step: '04',
    title: 'Close Every Follow-up Loop',
    description:
      'Track repeat labs, medication checks, and outreach reminders until every care action is verified complete.',
    icon: ClipboardCheck,
  },
];

const ROLE_CARDS = [
  {
    role: 'For Patients',
    title: 'Clear Health Records & Guided Next Steps',
    description:
      'Understand screening reports in accessible language, view risk indicators without medical jargon, and stay on top of appointments and follow-ups.',
    icon: User,
    accent: 'teal' as const,
    ctaLabel: 'Open Patient Dashboard',
    to: '/patient',
    points: [
      'Structured lab & screening report summaries',
      'Personal risk overview with clear targets',
      'Upcoming visits, specialist referrals & reminders',
    ],
  },
  {
    role: 'For Doctors',
    title: 'Focused Clinical Triage & Care Management',
    description:
      'Review assigned patient panels, examine biomarker trends, act on high-risk alerts, and manage referrals and follow-up plans from a single workspace.',
    icon: Stethoscope,
    accent: 'primary' as const,
    ctaLabel: 'Open Doctor Workspace',
    to: '/doctor',
    points: [
      'Risk-stratified patient worklists & profiles',
      'Streamlined diagnostic report review queue',
      'Coordinated specialist referrals & follow-up tracking',
    ],
  },
  {
    role: 'For Administrators',
    title: 'Network-Wide Population Health Visibility',
    description:
      'Monitor district screening coverage, chronic condition prevalence, risk distribution, referral bottlenecks, and follow-up closure rates in real time.',
    icon: Users,
    accent: 'primary' as const,
    ctaLabel: 'Open Admin Console',
    to: '/admin',
    points: [
      'Population risk distribution & trend visualizations',
      'District clinic coverage & referral turnaround oversight',
      'Doctor workload, patient registry & operational analytics',
    ],
  },
];

const KEY_FEATURES = [
  {
    title: 'Structured Report Intelligence',
    description:
      'Organizes key biomarkers, reference intervals, and clinician-reviewed summaries so critical findings never go unnoticed.',
    icon: FileCheck2,
  },
  {
    title: 'Explainable Risk Stratification',
    description:
      'Categorizes cohorts across Low, Moderate, High, and Critical tiers with transparent contributing health indicators.',
    icon: HeartPulse,
  },
  {
    title: 'Closed-Loop Referral Tracking',
    description:
      'Tracks every specialist handoff from initiation to acceptance, appointment booking, and post-consult follow-up.',
    icon: GitBranch,
  },
  {
    title: 'Unified Appointment Coordination',
    description:
      'Supports both in-person clinic visits and teleconsultations with clear preparation instructions and status visibility.',
    icon: CalendarCheck2,
  },
  {
    title: 'Proactive Follow-up Monitoring',
    description:
      'Highlights due-soon and overdue care tasks so outreach teams can intervene before patients drop out of care.',
    icon: BellRing,
  },
  {
    title: 'Population Health Analytics',
    description:
      'Equips program leaders with cohort risk breakdowns, disease burden charts, and regional care-completion benchmarks.',
    icon: BarChart3,
  },
];

const IMPACT_METRICS = [
  {
    value: '4 Care Stages',
    label: 'Unified Continuum',
    detail: 'Screening, risk triage, referral, and follow-up in one workflow',
  },
  {
    value: '3 Connected Roles',
    label: 'Shared Care Context',
    detail: 'Patients, clinicians, and public health administrators aligned',
  },
  {
    value: '< 72 hr Target',
    label: 'Critical Escalation SLA',
    detail: 'Structured routing workflow for urgent risk findings',
  },
  {
    value: '100% Traceable',
    label: 'Follow-up Accountability',
    detail: 'Every abnormal screening linked to a tracked next action',
  },
];

const SECURITY_PILLARS = [
  {
    title: 'Role-Scoped Access Design',
    description:
      'Separate views and navigation boundaries ensure patients, doctors, and administrators see only role-relevant workflows.',
    icon: UserCheck,
  },
  {
    title: 'Privacy-First Architecture',
    description:
      'Designed around least-privilege data exposure, environment-isolated secrets, and encrypted transport standards.',
    icon: Lock,
  },
  {
    title: 'Clinician-in-the-Loop Safety',
    description:
      'Assistive insights are designed to support — never replace — clinical judgment, diagnosis, or prescribing decisions.',
    icon: ShieldCheck,
  },
];

export function LandingPage() {
  useDocumentTitle('Connecting Every Patient to the Care They Need');

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--cb-border)] bg-[var(--cb-surface)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24 lg:px-8">
          <div className="lg:col-span-6">
            <Badge variant="primary" dot>
              Population Health Platform &middot; Team ALPHA
            </Badge>

            <h1 className="mt-5 text-3xl leading-[1.15] font-bold tracking-tight text-[var(--cb-text)] sm:text-4xl lg:text-5xl">
              Connecting Every Patient to the Care They Need.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--cb-text-secondary)] sm:text-lg">
              CareBridge AI closes the gap between early health screening and
              timely clinical care — uniting understandable health reports,
              transparent risk prioritization, specialist referrals, and
              proactive follow-ups across communities.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1769AA] px-6 text-sm font-semibold text-white shadow-[var(--cb-shadow-sm)] transition-colors hover:bg-[#12568B] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#roles"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] px-6 text-sm font-semibold text-[var(--cb-text)] transition-colors hover:bg-[var(--cb-surface-subtle)]"
              >
                Explore Platform
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--cb-border)] pt-6 text-xs font-medium text-[var(--cb-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--cb-secondary)]" />
                Patient, Doctor &amp; Admin Portals
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--cb-secondary)]" />
                Explainable Triage Workflows
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--cb-secondary)]" />
                Fictional Safe Demo Environment
              </span>
            </div>
          </div>

          {/* Healthcare Care-Continuum Visual Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg)] p-4 shadow-[var(--cb-shadow-md)] sm:p-6">
              <div className="flex items-center justify-between border-b border-[var(--cb-border)] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                    <HeartPulse className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--cb-text)]">
                      Care Continuity Overview
                    </p>
                    <p className="text-[11px] text-[var(--cb-text-muted)]">
                      Regional Screening Network (Illustrative Preview)
                    </p>
                  </div>
                </div>
                <Badge variant="teal" dot>
                  Active Loop
                </Badge>
              </div>

              {/* Clean Clinical Signal Vector Illustration */}
              <div className="mt-4 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--cb-text-muted)]">
                    Screening-to-Follow-up Closure Trend
                  </span>
                  <span className="font-semibold text-[var(--cb-success)] cb-tabular">
                    86.4% Closed on Time
                  </span>
                </div>
                <svg
                  viewBox="0 0 420 96"
                  fill="none"
                  role="img"
                  aria-label="Illustration of upward population follow-up completion trend"
                  className="mt-2 h-24 w-full"
                >
                  <line
                    x1="0"
                    y1="24"
                    x2="420"
                    y2="24"
                    stroke="currentColor"
                    className="text-[var(--cb-border)]"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="0"
                    y1="56"
                    x2="420"
                    y2="56"
                    stroke="currentColor"
                    className="text-[var(--cb-border)]"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="0"
                    y1="86"
                    x2="420"
                    y2="86"
                    stroke="currentColor"
                    className="text-[var(--cb-border)]"
                  />
                  <path
                    d="M8 74 C60 70, 95 62, 140 54 C185 46, 225 48, 270 34 C315 20, 360 22, 412 12 L412 86 L8 86 Z"
                    fill="#14B8A6"
                    fillOpacity="0.12"
                  />
                  <path
                    d="M8 74 C60 70, 95 62, 140 54 C185 46, 225 48, 270 34 C315 20, 360 22, 412 12"
                    stroke="#1769AA"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <circle cx="140" cy="54" r="4" fill="#1769AA" />
                  <circle cx="270" cy="34" r="4" fill="#1769AA" />
                  <circle cx="412" cy="12" r="4.5" fill="#14B8A6" />
                </svg>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3.5">
                  <p className="text-[11px] font-medium text-[var(--cb-text-muted)]">
                    Enrolled Cohort
                  </p>
                  <p className="mt-1 text-lg font-bold text-[var(--cb-text)] cb-tabular">
                    4,820
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--cb-success)]">
                    18 clinics linked
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3.5">
                  <p className="text-[11px] font-medium text-[var(--cb-text-muted)]">
                    High-Risk Queue
                  </p>
                  <p className="mt-1 text-lg font-bold text-[var(--cb-text)] cb-tabular">
                    412
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--cb-warning)]">
                    Prioritized review
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3.5">
                  <p className="text-[11px] font-medium text-[var(--cb-text-muted)]">
                    Median Referral
                  </p>
                  <p className="mt-1 text-lg font-bold text-[var(--cb-text)] cb-tabular">
                    3.4 days
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--cb-primary)]">
                    Screening to consult
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 py-3 text-xs">
                <span className="font-medium text-[var(--cb-text-secondary)]">
                  Preview interactive role dashboards directly:
                </span>
                <div className="flex flex-wrap items-center gap-3 font-semibold text-[var(--cb-primary)]">
                  <Link to="/patient" className="hover:underline">
                    Patient
                  </Link>
                  <Link to="/doctor" className="hover:underline">
                    Doctor
                  </Link>
                  <Link to="/admin" className="hover:underline">
                    Admin
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-[var(--cb-primary)] uppercase">
            How It Works
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--cb-text)] sm:text-3xl">
            From early screening to verified follow-up care
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--cb-text-muted)] sm:text-base">
            Many preventive health programs stop once a lab report is generated.
            CareBridge AI structures every downstream handoff so patients reach
            timely clinical support.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-[var(--cb-text-muted)] cb-tabular">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[var(--cb-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-muted)]">
                    {item.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Three User Roles */}
      <section
        id="roles"
        className="border-y border-[var(--cb-border)] bg-[var(--cb-surface)] py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-[var(--cb-secondary-text)] uppercase">
              Three Connected Care Roles
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--cb-text)] sm:text-3xl">
              Dedicated workspaces for every participant in care
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--cb-text-muted)] sm:text-base">
              Explore each purpose-built interface tailored to patient clarity,
              clinician efficiency, and health-system oversight.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {ROLE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.role}
                  className="flex flex-col justify-between rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-bg)] p-6 transition-colors hover:border-[var(--cb-border-strong)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={card.accent}>{card.role}</Badge>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-primary)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                    </div>

                    <h3 className="mt-5 text-lg font-bold tracking-tight text-[var(--cb-text)]">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                      {card.description}
                    </p>

                    <ul className="mt-5 space-y-2.5">
                      {card.points.map((point) => (
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

                  <Link
                    to={card.to}
                    className="mt-7 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] px-4 text-sm font-semibold text-[var(--cb-text)] transition-colors hover:border-[var(--cb-primary)] hover:text-[var(--cb-primary)]"
                  >
                    {card.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-[var(--cb-primary)] uppercase">
            Platform Capabilities
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--cb-text)] sm:text-3xl">
            Built for reliable clinical coordination at scale
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--cb-text-muted)] sm:text-base">
            Every module is designed to reduce care fragmentation, simplify
            patient communication, and give healthcare teams actionable context.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cb-secondary-soft)] text-[var(--cb-secondary-text)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--cb-text)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-muted)]">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Population Health Impact */}
      <section
        id="impact"
        className="border-y border-[var(--cb-border)] bg-[#134E80] py-16 text-white lg:py-20 dark:bg-[#0F223A]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-[#99F6E4] uppercase">
              Population Health Impact
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Preventing silent drop-offs across community health networks
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
              Chronic conditions such as hypertension, diabetes, kidney disease,
              and anemia are highly manageable when early screening connects
              reliably to timely follow-up care.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-white/15 bg-white/8 p-5"
              >
                <p className="text-2xl font-bold tracking-tight text-white cb-tabular">
                  {metric.value}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[#99F6E4]">
                  {metric.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-200/90">
                  {metric.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Security */}
      <section
        id="security"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wider text-[var(--cb-primary)] uppercase">
              Privacy, Security &amp; Governance
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--cb-text)] sm:text-3xl">
              Engineered around clinical trust and responsible data stewardship
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--cb-text-muted)] sm:text-base">
              Healthcare software must earn patient and clinician confidence.
              CareBridge AI enforces clear role separation, transparent AI
              disclosures, and strict protection of sensitive information.
            </p>
            <div className="mt-6 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
              <strong className="text-[var(--cb-text)]">
                Platform Security &amp; Data Notice:
              </strong>{' '}
              Account sign-in and workspace access are protected by Argon2id
              password hashing, HttpOnly session tokens, and backend role-based
              access control. Clinical records inside dashboards remain curated
              fictional data until workflow phases connect.
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            {SECURITY_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={pillar.title}
                  className="flex flex-col gap-4 sm:flex-row sm:items-start"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--cb-text)]">
                      {pillar.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--cb-text-muted)]">
                      {pillar.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow-sm)] sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold tracking-tight text-[var(--cb-text)] sm:text-2xl">
              Ready to explore CareBridge AI?
            </h2>
            <p className="mt-2 text-sm text-[var(--cb-text-muted)]">
              Create a preview profile or step directly into the Patient,
              Doctor, or Administrator workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1769AA] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#12568B] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] px-5 text-sm font-semibold text-[var(--cb-text)] transition-colors hover:bg-[var(--cb-surface-subtle)]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
