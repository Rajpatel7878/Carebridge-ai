import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartPalette } from '@/hooks/useTheme';

export interface TrendSeries {
  dataKey: string;
  label: string;
  colorKey: 'primary' | 'secondary' | 'warning' | 'critical' | 'success';
}

export interface TrendAreaChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: TrendSeries[];
  heightClassName?: string;
}

export function TrendAreaChart({
  data,
  xKey,
  series,
  heightClassName = 'h-64',
}: TrendAreaChartProps) {
  const palette = useChartPalette();
  const baseId = useId().replace(/:/g, '');

  return (
    <div className={`w-full min-w-0 ${heightClassName}`}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 520, height: 256 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, left: -14, bottom: 0 }}
        >
          <defs>
            {series.map((item) => {
              const color = palette[item.colorKey];
              return (
                <linearGradient
                  key={item.dataKey}
                  id={`${baseId}-${item.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={palette.grid}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: palette.axis, fontSize: 12 }}
            axisLine={{ stroke: palette.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: palette.axis, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: palette.tooltipBg,
              borderColor: palette.tooltipBorder,
              borderRadius: '10px',
              color: palette.tooltipText,
              fontSize: '12px',
            }}
          />
          {series.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              iconType="circle"
            />
          )}
          {series.map((item) => {
            const color = palette[item.colorKey];
            return (
              <Area
                key={item.dataKey}
                type="monotone"
                dataKey={item.dataKey}
                name={item.label}
                stroke={color}
                strokeWidth={2.2}
                fill={`url(#${baseId}-${item.dataKey})`}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
