import { Activity, ArrowLeft, ShieldCheck, Users } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { Logo, ThemeToggle } from '@/components/common';

const HIGHLIGHTS = [
  {
    icon: Activity,
    title: 'Early Screening to Follow-up',
    text: 'Keep lab findings, referrals, and follow-up milestones connected on one timeline.',
  },
  {
    icon: Users,
    title: 'Role-Tailored Workspaces',
    text: 'Purpose-built views for patients, clinicians, and population health administrators.',
  },
  {
    icon: ShieldCheck,
    title: 'Responsible Clinical Design',
    text: 'Clear care guidance, role boundaries, and privacy-first data governance.',
  },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--cb-bg)] lg:grid-cols-12">
      {/* Left clinical brand panel (desktop) */}
      <aside className="relative hidden flex-col justify-between bg-[#134E80] p-10 text-white lg:col-span-5 lg:flex xl:p-12 dark:bg-[#0E243D] dark:border-r dark:border-[var(--cb-border)]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="h-9 w-9"
            >
              <rect
                width="40"
                height="40"
                rx="10"
                fill="#FFFFFF"
                fillOpacity="0.14"
              />
              <path
                d="M8.5 25.5C11.8 18 15.6 15.5 20 15.5C24.4 15.5 28.2 18 31.5 25.5"
                stroke="#2DD4BF"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d="M20 9.5V21.5M14 15.5H26"
                stroke="#FFFFFF"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle cx="8.5" cy="25.5" r="2.2" fill="#FFFFFF" />
              <circle cx="31.5" cy="25.5" r="2.2" fill="#FFFFFF" />
            </svg>
            <span className="text-lg font-bold tracking-tight">
              CareBridge <span className="text-[#5EEAD4]">AI</span>
            </span>
          </Link>

          <div className="mt-14 max-w-md">
            <p className="text-xs font-semibold tracking-wider text-[#99F6E4] uppercase">
              Population Health Management
            </p>
            <h2 className="mt-3 text-3xl leading-tight font-bold tracking-tight">
              Connecting Every Patient to the Care They Need.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-200">
              Unifying preventive screenings, clinical report review, specialist
              referrals, and timely follow-ups across communities.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12 text-[#5EEAD4]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-200/90">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-300">
          Team ALPHA &middot; Future Health Challenge &middot; Secure Role-Based
          Access
        </p>
      </aside>

      {/* Right form workspace */}
      <div className="flex min-h-screen flex-col lg:col-span-7">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="lg:hidden" aria-label="CareBridge AI Home">
              <Logo size="sm" />
            </Link>
            <Link
              to="/"
              className="hidden items-center gap-1.5 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:text-[var(--cb-text)] lg:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </div>
          <ThemeToggle showLabel />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
