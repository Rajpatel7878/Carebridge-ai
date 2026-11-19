import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartPalette } from '@/hooks/useTheme';
import type { RiskDistributionItem, RiskLevel } from '@/types/domain';
import { formatNumber } from '@/utils/format';

export interface RiskDistributionChartProps {
  data: RiskDistributionItem[];
  showDescriptions?: boolean;
}

export function RiskDistributionChart({
  data,
  showDescriptions = false,
}: RiskDistributionChartProps) {
  const palette = useChartPalette();

  const colorByLevel: Record<RiskLevel, string> = {
    low: palette.success,
    moderate: palette.warning,
    high: '#EA580C',
    critical: palette.critical,
  };

  const total = data.reduce((sum, item) => sum + item.patients, 0);

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
      <div className="relative mx-auto h-56 w-full max-w-[240px] min-w-0 md:col-span-5">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 220, height: 220 }}
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="patients"
              nameKey="tier"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2.5}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.level} fill={colorByLevel[entry.level]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderRadius: '10px',
                color: palette.tooltipText,
                fontSize: '12px',
              }}
              itemStyle={{ color: palette.tooltipText }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-[var(--cb-text)] cb-tabular">
            {formatNumber(total)}
          </span>
          <span className="text-[11px] font-medium text-[var(--cb-text-muted)]">
            Total Enrolled
          </span>
        </div>
      </div>

      <div className="space-y-3 md:col-span-7">
        {data.map((item) => (
          <div
            key={item.level}
            className="rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/55 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorByLevel[item.level] }}
                />
                <span className="text-sm font-semibold text-[var(--cb-text)]">
                  {item.tier}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs cb-tabular">
                <span className="font-semibold text-[var(--cb-text)]">
                  {formatNumber(item.patients)}
                </span>
                <span className="text-[var(--cb-text-muted)]">
                  ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
            {showDescriptions && (
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--cb-text-muted)]">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
