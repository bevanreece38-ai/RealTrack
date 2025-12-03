import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { chartTheme } from '../../utils/chartTheme';
import { formatPercent } from '../../utils/formatters';
import type { RoiChartPoint } from '../../types/RoiChartPoint';
import { chartCardInteractiveClass, chartTitleClass } from './chartStyles';

interface AnaliseRoiChartProps {
  data: RoiChartPoint[];
}

export function AnaliseRoiChart({ data }: AnaliseRoiChartProps) {
  return (
    <div className={chartCardInteractiveClass}>
      <h3 className={chartTitleClass}>Evolução do ROI Mensal</h3>
      <ResponsiveContainer width="100%" height={260} minWidth={200} minHeight={200}>
        {data.length > 0 ? (
          <LineChart data={data} margin={{ top: 5, right: 12, left: -6, bottom: 5 }}>
            <defs>
              <linearGradient id={chartTheme.gradients.roi.id} x1="0" y1="0" x2="0" y2="1">
                {chartTheme.gradients.roi.stops.map((stop) => (
                  <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
                ))}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
            <XAxis
              dataKey="mes"
              stroke={chartTheme.axisStroke}
              tick={{ ...chartTheme.axisTick }}
              tickLine={false}
            />
            <YAxis
              stroke={chartTheme.axisStroke}
              tick={{ ...chartTheme.axisTick }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'ROI (%)',
                angle: -90,
                position: 'insideLeft',
                style: chartTheme.axisLabel,
              }}
            />
            <Tooltip
              contentStyle={chartTheme.tooltip}
              formatter={(value: number) => formatPercent(value)}
              labelStyle={chartTheme.tooltipLabel}
              itemStyle={chartTheme.tooltipItem}
            />
            <Line
              type="monotone"
              dataKey="roi"
              stroke={`url(#${chartTheme.gradients.roi.id})`}
              strokeWidth={3}
              dot={chartTheme.lineDot}
              activeDot={chartTheme.lineActiveDot}
            />
          </LineChart>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-foreground-muted">
            Nenhum dado disponível
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default AnaliseRoiChart;


