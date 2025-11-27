import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { GlassCard } from '../components/ui/GlassCard';
import { chartTheme } from '../utils/chartTheme';
import { formatCurrency, formatPercent } from '../utils/formatters';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import AnaliseFilters from '../components/analise/AnaliseFilters';
import AnaliseRoiChart from '../components/analise/AnaliseRoiChart';
import AnaliseOddsChart from '../components/analise/AnaliseOddsChart';
import useAnaliseData from '../hooks/useAnaliseData';
import type { AnaliseFilters } from '../types/AnaliseFilters';
import type { AnaliseHeatmapData } from '../types/AnaliseData';
import type { RoiChartPoint } from '../types/RoiChartPoint';
import type { OddsChartPoint } from '../types/OddsChartPoint';
import '../styles/pages/analise.css';

const heatmapRows = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const heatmapCols = ['Manhã (06-12)', 'Tarde (12-18)', 'Noite (18-24)', 'Madrugada (00-06)'];
const defaultHeatmap: AnaliseHeatmapData = {};
const defaultDistribuicaoOdds: OddsChartPoint[] = [
  { faixa: '1.00-1.50', quantidade: 0 },
  { faixa: '1.51-2.00', quantidade: 0 },
  { faixa: '2.01-3.00', quantidade: 0 },
  { faixa: '3.01-5.00', quantidade: 0 },
  { faixa: '5.01+', quantidade: 0 },
];
const initialFilters: AnaliseFilters = {
  status: '',
  tipster: '',
  casa: '',
  esporte: '',
  evento: '',
  dataInicio: '',
  dataFim: '',
  oddMin: '',
  oddMax: '',
};

export default function Analise() {
  const [filters, setFilters] = useState<AnaliseFilters>(initialFilters);
  const { data, isLoading } = useAnaliseData(filters);
  const [bookmakersExpanded, setBookmakersExpanded] = useState(false);

  // Sincronizar dados derivados com o hook de análise
  const evolucaoRoiMensal = useMemo(() => data.evolucaoRoiMensal, [data.evolucaoRoiMensal]);
  const distribuicaoOdds = useMemo(() => data.distribuicaoOdds, [data.distribuicaoOdds]);
  const heatmap = useMemo((): AnaliseHeatmapData => {
    // Safe parsing do heatmap vindo do hook - retorna default se vazio
    const hm: AnaliseHeatmapData = data.heatmap ?? {};
    if (Object.keys(hm).length === 0) {
      return defaultHeatmap;
    }
    return hm;
  }, [data.heatmap]);
  const winRatePorEsporte = useMemo(() => data.winRatePorEsporte, [data.winRatePorEsporte]);
  const comparacaoBookmakers = useMemo(
    () => {
      const bks = data.comparacaoBookmakers;
      return Array.isArray(bks) ? bks : [];
    },
    [data.comparacaoBookmakers],
  );

  // Preparar dados para gráfico de ROI mensal
  const roiMensalChart: RoiChartPoint[] = useMemo(
    () =>
      evolucaoRoiMensal.map((item) => ({
        mes: new Date(`${item.mes}-01`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        roi: item.roi,
      })),
    [evolucaoRoiMensal],
  );

  // Preparar dados para distribuição de odds
  const oddsChart: OddsChartPoint[] = useMemo(
    () => (distribuicaoOdds.length > 0 ? distribuicaoOdds : defaultDistribuicaoOdds),
    [distribuicaoOdds],
  );

  // Função para obter cor do heatmap baseado no ROI
  const getHeatmapColor = (roi: number): string => {
    if (roi > 10) return 'var(--color-success)'; // Verde - ROI muito positivo
    if (roi > 0) return 'var(--color-warning-yellow)'; // Verde claro - ROI positivo
    if (roi > -10) return 'var(--color-warning-light)'; // Amarelo - ROI próximo de zero
    return 'var(--color-danger)'; // Vermelho - ROI negativo
  };

  const getHeatmapOpacity = (roi: number, investido: number): number => {
    if (investido === 0) return 0.1;
    const absRoi = Math.abs(roi);
    return Math.min(0.3 + (absRoi / 50) * 0.7, 1);
  };

  // Calcular estatísticas filtradas (por enquanto usando dados totais)
  const totalApostas = distribuicaoOdds.reduce((sum, item) => sum + item.quantidade, 0);
  const totalInvestido = comparacaoBookmakers.reduce((sum, item) => sum + item.investido, 0);
  const totalLucro = comparacaoBookmakers.reduce((sum, item) => sum + item.resultado, 0);
  const roiMedio = totalInvestido > 0 ? (totalLucro / totalInvestido) * 100 : 0;

  const stats = [
    { title: 'Apostas Filtradas', value: totalApostas.toString(), helper: 'Total de apostas', color: 'blue' as const },
    { title: 'Investimento Filtrado', value: formatCurrency(totalInvestido), helper: 'Total investido', color: 'purple' as const },
    { title: 'Lucro Filtrado', value: formatCurrency(totalLucro), helper: 'Lucro/prejuízo total', color: 'emerald' as const },
    { title: 'ROI Filtrado', value: formatPercent(roiMedio), helper: 'Retorno sobre investimento', color: 'amber' as const }
  ];

  return (
    <div className="analise-page">
      <PageHeader
        title="Gráficos"
        subtitle="Visualize suas métricas e acompanhe evolução"
        actions={
          <AnaliseFilters value={filters} onChange={setFilters} />
        }
      />

      {isLoading ? (
        <div className="stat-grid">
          {stats.map((stat) => (
            <Skeleton key={stat.title} className="card">
              <div className="card-title">{stat.title}</div>
              <div className="card-value">...</div>
              <p className="card-desc">{stat.helper}</p>
            </Skeleton>
          ))}
        </div>
      ) : (
        <div className="stat-grid">
          {stats.map((stat) => (
            <StatCard key={stat.title} title={stat.title} value={stat.value} helper={stat.helper} color={stat.color} />
          ))}
        </div>
      )}

      <div className="grid-2 mb-6">
        {isLoading ? (
          <>
            <Skeleton className="chart-card" />
            <Skeleton className="chart-card" />
          </>
        ) : (
          <>
            <AnaliseRoiChart data={roiMensalChart} />
            <AnaliseOddsChart data={oddsChart} />
          </>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="chart-card">
          <h3 style={{ marginTop: 0 }}>Win Rate por Esporte</h3>
          {winRatePorEsporte.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart 
                data={winRatePorEsporte.slice(0, 10)} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.9}/>
                    <stop offset="50%" stopColor="var(--color-success-light)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-success-dark)" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                <XAxis 
                  dataKey="esporte" 
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickLine={false}
                />
                <YAxis 
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', style: chartTheme.axisLabel }}
                />
                <Tooltip 
                  contentStyle={{ 
                    ...chartTheme.tooltip, 
                    border: '1px solid var(--color-border-success)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'winRate') {
                      return [formatPercent(value), 'Win Rate'];
                    }
                    return [value, name === 'ganhas' ? 'Ganhas' : 'Total'];
                  }}
                  labelStyle={chartTheme.tooltipLabel}
                  itemStyle={chartTheme.tooltipItem}
                />
                <Bar 
                  dataKey="winRate" 
                  fill="url(#colorWinRate)" 
                  radius={chartTheme.barRadius}
                  animationDuration={800}
                  maxBarSize={32}
                >
                  {winRatePorEsporte.slice(0, 10).map((entry) => (
                    <Cell key={`cell-${entry.esporte}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Sem dados" description="Nenhuma aposta encontrada para os filtros." />
          )}
        </div>
        <div className="chart-card">
          <h3 style={{ marginTop: 0 }}>Heatmap de Performance</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `120px repeat(${heatmapCols.length}, 1fr)`,
              gap: 8,
              marginTop: 16
            }}
          >
            <div />
            {heatmapCols.map((col) => (
              <span key={col} style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.75rem' }}>
                {col.split(' ')[0]}
              </span>
            ))}
            {heatmapRows.map((row) => (
              <div key={row} style={{ display: 'contents' }}>
                <span key={`${row}-label`} style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {row}
                </span>
                {heatmapCols.map((col) => {
                  // Safe access do heatmap data com type narrowing
                  const rowData = heatmap[row];
                  const cellData = rowData?.[col];
                  const roi = cellData?.roi ?? 0;
                  const investido = cellData?.investido ?? 0;
                  const color = getHeatmapColor(roi);
                  const opacity = getHeatmapOpacity(roi, investido);
                  
                  return (
                    <div
                      key={`${row}-${col}`}
                      style={{
                        height: 36,
                        borderRadius: 12,
                        background: color,
                        opacity: opacity,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: opacity > 0.5 ? 'white' : 'var(--text)',
                        cursor: investido > 0 ? 'pointer' : 'default'
                      }}
                      title={investido > 0 ? `ROI: ${formatPercent(roi)}\nInvestido: ${formatCurrency(investido)}` : ''}
                    >
                      {investido > 0 && formatPercent(roi)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ marginTop: 0 }}>Comparação de Bookmakers</h3>
            {comparacaoBookmakers.length > 0 && (
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => setBookmakersExpanded(prev => !prev)}
              >
                {bookmakersExpanded ? 'Recolher' : 'Expandir'}
              </button>
            )}
          </div>
          {comparacaoBookmakers.length > 0 ? (
            <div
              style={{
                maxHeight: bookmakersExpanded ? 'none' : '360px',
                overflowY: bookmakersExpanded ? 'visible' : 'auto',
                paddingRight: '10px',
                marginTop: 8
              }}
            >
              {comparacaoBookmakers.slice(0, 50).map((bookmaker, index) => (
                <div
                  key={bookmaker.casa}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: index < comparacaoBookmakers.length - 1 ? '1px solid var(--border)' : 'none'
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{bookmaker.casa}</p>
                    <p className="card-desc" style={{ margin: 0, marginTop: 4 }}>
                      Investido: {formatCurrency(bookmaker.investido)} | ROI: {formatPercent(bookmaker.roi)}
                    </p>
                  </div>
                  <span style={{ fontWeight: 600, color: bookmaker.resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {formatCurrency(bookmaker.resultado)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem dados" description="Adicione apostas para visualizar comparações." />
          )}
        </GlassCard>
        <GlassCard>
          <h3 style={{ marginTop: 0 }}>Histórico de Apostas</h3>
          <EmptyState title="Sem resultados" description="Nenhuma aposta encontrada para os filtros selecionados." />
        </GlassCard>
      </div>
    </div>
  );
}

