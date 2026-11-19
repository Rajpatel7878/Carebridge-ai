import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitBranch,
  Network,
  Stethoscope,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { useLanguage } from '@/hooks/useLanguage';
import type { EcosystemNodeCopy } from '@/i18n';
import { cn } from '@/utils/cn';

const NODE_ICONS: Record<EcosystemNodeCopy['id'], LucideIcon> = {
  patient: User,
  report: FileText,
  risk: Activity,
  doctor: Stethoscope,
  referral: GitBranch,
  followup: CalendarCheck2,
};

export function HeroEcosystemVisual() {
  const { t } = useLanguage();
  const nodes = t.hero.visual.nodes;
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex =
    activeIndex >= 0 && activeIndex < nodes.length ? activeIndex : 0;
  const activeNode = nodes[safeIndex]!;
  const ActiveIcon = NODE_ICONS[activeNode.id];

  const handleStep = (delta: number) => {
    setActiveIndex((prev) => (prev + delta + nodes.length) % nodes.length);
  };

  return (
    <div className="relative">
      {/* Subtle architectural backdrop accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-br from-[#1769AA]/10 via-transparent to-[#14B8A6]/12 blur-xl dark:from-[#3B9AE1]/14 dark:to-[#2DD4BF]/12"
      />

      <div className="relative rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 shadow-[var(--cb-shadow-lg)] sm:p-6">
        {/* Header bar */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--cb-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
              <Network className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--cb-text)]">
                {t.hero.visual.title}
              </p>
              <p className="text-xs text-[var(--cb-text-muted)]">
                {t.hero.visual.subtitle}
              </p>
            </div>
          </div>
          <Badge variant="teal" dot>
            {t.hero.visual.demoBadge}
          </Badge>
        </div>

        {/* Connected SVG care-bridge progress arc */}
        <div className="mt-4 rounded-xl border border-[var(--cb-border-subtle)] bg-[var(--cb-bg)] px-3 pt-3 pb-3.5 sm:px-4">
          <svg
            viewBox="0 0 520 44"
            fill="none"
            role="img"
            aria-label="CareBridge AI six-stage workflow linking Patient, Medical Report, Risk Prioritization, Doctor, Referral, and Follow-up"
            className="mb-2.5 h-8 w-full"
          >
            <line
              x1="44"
              y1="22"
              x2="476"
              y2="22"
              stroke="currentColor"
              className="text-[var(--cb-border-strong)]"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <line
              x1="44"
              y1="22"
              x2={44 + (432 * safeIndex) / (nodes.length - 1)}
              y2="22"
              stroke="#14B8A6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {nodes.map((node, index) => {
              const cx = 44 + (432 * index) / (nodes.length - 1);
              const isReached = index <= safeIndex;
              const isCurrent = index === safeIndex;
              return (
                <g key={node.id}>
                  {isCurrent && (
                    <circle
                      cx={cx}
                      cy="22"
                      r="11"
                      fill="#14B8A6"
                      fillOpacity="0.2"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy="22"
                    r={isCurrent ? 6.5 : 5}
                    fill={isReached ? '#1769AA' : 'var(--cb-surface)'}
                    stroke={isReached ? '#14B8A6' : 'var(--cb-border-strong)'}
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>

          {/* 6 Interactive Ecosystem Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {nodes.map((node, index) => {
              const Icon = NODE_ICONS[node.id];
              const isSelected = index === safeIndex;
              return (
                <button
                  key={node.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'group flex flex-col items-start rounded-xl border p-3 text-left transition-all',
                    isSelected
                      ? 'border-[var(--cb-primary)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow-sm)] ring-1 ring-[var(--cb-primary-border)]'
                      : 'border-[var(--cb-border)] bg-[var(--cb-surface)]/80 hover:border-[var(--cb-border-strong)] hover:bg-[var(--cb-surface)]',
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                        isSelected
                          ? 'bg-[#1769AA] text-white dark:bg-[#2B82C9]'
                          : 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)] group-hover:bg-[var(--cb-secondary-soft)] group-hover:text-[var(--cb-secondary-text)]',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-bold cb-tabular',
                        isSelected
                          ? 'text-[var(--cb-primary)]'
                          : 'text-[var(--cb-text-muted)]',
                      )}
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <span className="mt-2.5 text-xs font-semibold text-[var(--cb-text)] sm:text-[13px]">
                    {node.label}
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-[11px] text-[var(--cb-text-muted)]">
                    {node.roleTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Panel */}
        <div
          aria-live="polite"
          className="mt-3.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/65 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-secondary-soft)] text-[var(--cb-secondary-text)]">
                <ActiveIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[var(--cb-text-muted)] uppercase">
                  {t.hero.visual.selectPrompt} &middot; 0{safeIndex + 1}/0
                  {nodes.length}
                </p>
                <p className="text-sm font-bold text-[var(--cb-text)]">
                  {activeNode.label}{' '}
                  <span className="font-normal text-[var(--cb-text-muted)]">
                    &middot; {activeNode.roleTag}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                aria-label="Previous care stage"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-hover)] hover:text-[var(--cb-text)]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                aria-label="Next care stage"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-hover)] hover:text-[var(--cb-text)]"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm">
            {activeNode.summary}
          </p>

          <div className="mt-3 flex items-start gap-2 border-t border-[var(--cb-border)] pt-2.5 text-xs text-[var(--cb-primary)]">
            <ArrowRight
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold">
                {t.hero.visual.handoffLabel}:
              </strong>{' '}
              <span className="text-[var(--cb-text-secondary)]">
                {activeNode.handoff}
              </span>
            </span>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--cb-text-muted)]">
          {t.hero.visual.footnote}
        </p>
      </div>
    </div>
  );
}
