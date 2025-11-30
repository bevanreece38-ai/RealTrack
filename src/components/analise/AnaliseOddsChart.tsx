import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTheme } from '../../utils/chartTheme';
import type { OddsChartPoint } from '../../types/OddsChartPoint';

interface AnaliseOddsChartProps {
  data: OddsChartPoint[];
}

export function AnaliseOddsChart({ data }: AnaliseOddsChartProps) {
  const hasData = data.length > 0 && data.some((item) => item.quantidade > 0);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Distribuição de Odds</h3>
      <ResponsiveContainer width="100%" height={260}>
        {hasData ? (
          <AreaChart data={data} margin={{ top: 5, right: 12, left: -6, bottom: 5 }}>
            <defs>
              <linearGradient id="oddsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
            <XAxis
              dataKey="faixa"
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
                value: 'Qtd. Apostas',
                angle: -90,
                position: 'insideLeft',
                style: chartTheme.axisLabel,
              }}
            />
            <Tooltip
              contentStyle={chartTheme.tooltip}
              labelStyle={chartTheme.tooltipLabel}
              itemStyle={chartTheme.tooltipItem}
            />
            <Area
              type="monotone"
              dataKey="quantidade"
              stroke="var(--color-success)"
              strokeWidth={3}
              fill="url(#oddsGradient)"
            />
          </AreaChart>
        ) : (
          <div className="chart-empty" />
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default AnaliseOddsChart;


