import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartPalette } from '@/hooks/useTheme';

export interface BarSeries {
  dataKey: string;
  label: string;
  colorKey: 'primary' | 'secondary' | 'warning' | 'critical' | 'success';
}

export interface CategoryBarChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: BarSeries[];
  heightClassName?: string;
}

export function CategoryBarChart({
  data,
  categoryKey,
  series,
  heightClassName = 'h-64',
}: CategoryBarChartProps) {
  const palette = useChartPalette();

  return (
    <div className={`w-full min-w-0 ${heightClassName}`}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 520, height: 256 }}
      >
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: -14, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={palette.grid}
          />
          <XAxis
            dataKey={categoryKey}
            tick={{ fill: palette.axis, fontSize: 11 }}
            axisLine={{ stroke: palette.grid }}
            tickLine={false}
            interval={0}
            angle={data.length > 5 ? -16 : 0}
            textAnchor={data.length > 5 ? 'end' : 'middle'}
            height={data.length > 5 ? 46 : 28}
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
          {series.map((item) => (
            <Bar
              key={item.dataKey}
              dataKey={item.dataKey}
              name={item.label}
              fill={palette[item.colorKey]}
              radius={[6, 6, 0, 0]}
              maxBarSize={42}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
