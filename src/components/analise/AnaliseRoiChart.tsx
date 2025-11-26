import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { chartTheme } from '../../utils/chartTheme';
import { formatPercent } from '../../utils/formatters';
import type { RoiChartPoint } from '../../types/RoiChartPoint';

interface AnaliseRoiChartProps {
  data: RoiChartPoint[];
}

export function AnaliseRoiChart({ data }: AnaliseRoiChartProps) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">Evolução do ROI Mensal</h3>
      <ResponsiveContainer width="100%" height={260}>
        {data.length > 0 ? (
          <LineChart data={data} margin={{ top: 5, right: 12, left: -6, bottom: 5 }}>
            <defs>
              <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--bank-color, var(--color-chart-primary))"
                  stopOpacity={0.95}
                />
                <stop
                  offset="100%"
                  stopColor="var(--bank-color, var(--color-chart-primary))"
                  stopOpacity={0.2}
                />
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
              stroke="url(#roiGradient)"
              strokeWidth={3}
              dot={chartTheme.lineDot}
              activeDot={chartTheme.lineActiveDot}
            />
          </LineChart>
        ) : (
          <div className="chart-empty" />
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default AnaliseRoiChart;


