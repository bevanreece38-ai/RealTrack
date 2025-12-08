import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, ChevronDown, Download, Filter, Loader2, Plus, TrendingUp, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FilterPopover from '../components/FilterPopover';
import DateInput from '../components/DateInput';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import { formatCurrency, formatPercent, getFirstName } from '../utils/formatters';
import { useDashboardData, useTipsters, useBancas, useChartContainer } from '../hooks';
import { cn } from '../components/ui/utils';
import { chartTheme } from '../utils/chartTheme';
import ImportCSVModal from '../components/ImportCSVModal';

const formatSignedPercent = (value: number): string => {
  const normalized = formatPercent(Math.abs(value));
  if (value > 0) return `+${normalized}`;
  if (value < 0) return `-${normalized}`;
  return normalized;
};

const formatSignedCurrency = (value: number): string => {
  const normalized = formatCurrency(Math.abs(value));
  if (value > 0) return `+${normalized}`;
  if (value < 0) return `-${normalized}`;
  return normalized;
};

const timeframeOptions = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
];

const labelTextClass = 'text-white/65';
const softLabelTextClass = 'text-white/55';

interface BreakdownCardItem {
  id: string;
  icon: string;
  name: string;
  subtitle: string;
  roi: number;
  lucro: number;
  apostas: number;
  ganhas: number;
  aproveitamento: number;
  stake: number;
  extraStats?: {
    label: string;
    value: string;
    helper?: string;
    highlight?: 'positive' | 'negative';
  }[];
}

interface BreakdownListProps {
  items: BreakdownCardItem[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  emptyMessage: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const [expandedCasa, setExpandedCasa] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const {
    loading,
    profile,
    metricas,
    resumoPorEsporte,
    resumoPorCasa,
    apostasRecentes,
    loadingApostasRecentes,
    filters,
    handleFilterChange,
    clearFilters,
    activeFiltersCount,
    periodoGrafico,
    setPeriodoGrafico,
    evolucaoBancaChart,
    crescimentoPercentual,
    melhorDia,
    mediaDiaria,
    fetchDashboardData,
  } = useDashboardData();

  const {
    containerRef: evolucaoChartRef,
    hasSize: evolucaoChartReady,
    dimensions: evolucaoChartDimensions,
  } = useChartContainer({ minHeight: 200, minWidth: 200 });
  const evolucaoChartWidth = Math.max(evolucaoChartDimensions.width, 0);
  const evolucaoChartHeight = Math.max(evolucaoChartDimensions.height, 0);

  const { tipsters } = useTipsters();
  const { bancas: userBancas, loading: bancasLoading } = useBancas();

  const defaultBancaId = useMemo(() => {
    if (!userBancas.length) return '';
    const padrao = userBancas.find((banca) => banca.padrao);
    return padrao?.id ?? userBancas[0]?.id ?? '';
  }, [userBancas]);

  useEffect(() => {
    if (!defaultBancaId) return;
    const bancaStillExists = userBancas.some((banca) => banca.id === filters.bancaId);
    const shouldSync = !filters.bancaId || !bancaStillExists;
    if (shouldSync && filters.bancaId !== defaultBancaId) {
      handleFilterChange('bancaId', defaultBancaId);
    }
  }, [defaultBancaId, filters.bancaId, handleFilterChange, userBancas]);

  const handleApplyFilters = () => {
    setFiltersOpen(false);
    void fetchDashboardData();
  };

  const handleClearFilters = () => {
    clearFilters();
    setFiltersOpen(false);
    void fetchDashboardData();
  };

  const rawAccuracyPercent = Number.isFinite(metricas.taxaAcerto) ? metricas.taxaAcerto : 0;
  const normalizedAccuracyPercent = rawAccuracyPercent > 1 ? rawAccuracyPercent / 100 : rawAccuracyPercent;
  const accuracyPercent = Math.min(Math.max(normalizedAccuracyPercent, 0), 1);
  const accuracyPercentLabel = formatPercent(accuracyPercent * 100);
  const totalApostas = metricas.totalApostas ?? 0;
  const apostasGanhas = metricas.apostasGanhas ?? Math.round(totalApostas * accuracyPercent);
  const derrotasCalculadas = metricas.apostasPerdidas ?? Math.max(totalApostas - apostasGanhas, 0);
  const derrotasLabel = derrotasCalculadas === 1 ? 'derrota' : 'derrotas';
  const apostasLabel = totalApostas === 1 ? 'aposta' : 'apostas';
  const accuracyDetailText = `${derrotasCalculadas} ${derrotasLabel} de ${totalApostas} ${apostasLabel}`;
  const handleNovaAposta = () => {
    navigate('/atualizar', { state: { openNovaAposta: true } });
  };

  const sportBreakdown = useMemo<BreakdownCardItem[]>(
    () =>
      resumoPorEsporte.slice(0, 4).map((item, index) => ({
        id: item.esporte || `esporte-${index}`,
        icon: '⚽️',
        name: item.esporte || 'Outros',
        subtitle: `${item.apostas} apostas • ${formatPercent(item.aproveitamento)} de vitórias`,
        roi: item.roi,
        lucro: item.lucro,
        apostas: item.apostas,
        ganhas: item.ganhas,
        aproveitamento: item.aproveitamento,
        stake: item.stakeMedia,
      })),
    [resumoPorEsporte]
  );

  const casaBreakdown = useMemo<BreakdownCardItem[]>(
    () =>
      resumoPorCasa.slice(0, 4).map((item, index) => ({
        id: item.casa || `casa-${index}`,
        icon: '🏢',
        name: item.casa || 'Outros',
        subtitle: `${item.apostas} apostas • ${formatPercent(item.aproveitamento)} de vitórias`,
        roi: item.roi,
        lucro: item.lucro,
        apostas: item.apostas,
        ganhas: item.ganhas,
        aproveitamento: item.aproveitamento,
        stake: item.stakeMedia,
        extraStats: [
          {
            label: 'Saldo',
            value: formatCurrency(item.saldo),
            highlight: item.saldo >= 0 ? 'positive' : 'negative',
          },
        ],
      })),
    [resumoPorCasa]
  );

  const lucroPeriodo = useMemo(
    () => evolucaoBancaChart.reduce((total, item) => total + item.diário, 0),
    [evolucaoBancaChart]
  );
  const periodoDiasLabel = `${periodoGrafico} dias`;

  const filterInputClass =
    'mt-2 w-full rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted transition focus-visible:border-brand-emerald focus-visible:ring-2 focus-visible:ring-brand-emerald/30';

  const cardSurfaceClass = 'bg-[#10322e]';
  const cardBorderClass = 'border-white/5';
  const cardShadowClass = 'shadow-[0_25px_45px_rgba(0,0,0,0.25)]';
  const sectionCardClass = `rounded-lg ${cardBorderClass} ${cardSurfaceClass} p-6 ${cardShadowClass} backdrop-blur-sm`;

  return (
    <div className="space-y-8 text-foreground">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className={cn('text-2xs uppercase tracking-[0.3em]', softLabelTextClass)}>Visão geral</p>
            <h1 className="text-3xl font-semibold">
              Bem-vindo de volta, {profile ? getFirstName(profile.nomeCompleto) : 'Usuário'} 👋
            </h1>
            <p className={cn('text-sm', labelTextClass)}>Acompanhe seus números mais importantes em tempo real.</p>
          </div>
          <div className="flex items-center gap-3 mt-6 relative">
            {loading && (
              <span className={cn('inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs text-foreground-muted', softLabelTextClass)}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando
              </span>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/40 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
              onClick={handleNovaAposta}
            >
              <Plus size={16} /> Nova aposta
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/40 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
              onClick={() => setImportModalOpen(true)}
            >
              <Download size={16} /> Importar dados
            </button>
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-border/40 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
              >
                <Filter size={16} />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-brand-emerald/15 px-2 text-xs font-semibold text-brand-emerald">{activeFiltersCount}</span>
                )}
              </button>
              {filtersOpen && (
                <div className="absolute left-0 top-full mt-2 z-50">
                  <FilterPopover
                    open={filtersOpen}
                    onClose={() => setFiltersOpen(false)}
                    onClear={handleClearFilters}
                    footer={
                      <button
                        type="button"
                        className="w-full rounded-2xl bg-brand-linear px-4 py-2 text-sm font-semibold text-[#f2f2f2] shadow-glow transition active:scale-[0.99]"
                        onClick={handleApplyFilters}
                      >
                        Aplicar filtros
                      </button>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-medium text-foreground">
                        <span>Status</span>
                        <select
                          value={filters.status}
                          onChange={(event) => handleFilterChange('status', event.target.value)}
                          className={filterInputClass}
                        >
                          <option value="">Todos</option>
                          {STATUS_APOSTAS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        <span>Tipster</span>
                        <select
                          value={filters.tipster}
                          onChange={(event) => handleFilterChange('tipster', event.target.value)}
                          className={filterInputClass}
                        >
                          <option value="">Todos</option>
                          {tipsters
                            .filter((tipster) => tipster.ativo)
                            .map((tipster) => (
                              <option key={tipster.id} value={tipster.nome}>
                                {tipster.nome}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        <span>Casa de aposta</span>
                        <select
                          value={filters.casa}
                          onChange={(event) => handleFilterChange('casa', event.target.value)}
                          className={filterInputClass}
                        >
                          <option value="">Todas</option>
                          {CASAS_APOSTAS.map((casa) => (
                            <option key={casa} value={casa}>
                              {casa}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        <span>Banca</span>
                        <select
                          value={filters.bancaId}
                          onChange={(event) => handleFilterChange('bancaId', event.target.value)}
                          className={filterInputClass}
                          disabled={bancasLoading}
                        >
                          <option value="">Todas</option>
                          {userBancas.map((banca) => (
                            <option key={banca.id} value={banca.id}>
                              {banca.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-foreground">
                          <span>Data (de)</span>
                          <DateInput value={filters.dataInicio} onChange={(value) => handleFilterChange('dataInicio', value)} className={filterInputClass} />
                        </label>
                        <label className="text-sm font-medium text-foreground">
                          <span>Data (até)</span>
                          <DateInput value={filters.dataFim} onChange={(value) => handleFilterChange('dataFim', value)} className={filterInputClass} />
                          <p className="mt-2 text-xs text-foreground-muted">
                            Deixe o campo vazio para considerar todo o histórico.
                          </p>
                        </label>
                      </div>
                    </div>
                  </FilterPopover>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-4">
        <div
          className={cn(
            'col-span-1 space-y-6 rounded-lg border border-border/30 p-6 text-[#f2f2f2] shadow-card lg:col-span-2',
            'bg-bank-hero'
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/80">Saldo da banca</p>
              <p className="text-4xl font-semibold tracking-tight">{formatCurrency(metricas.saldoBanca)}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold">
              <TrendingUp size={16} />
              {formatSignedPercent(metricas.roi)}
            </span>
          </div>

          <div className="grid gap-6 text-sm md:grid-cols-3">
            <div>
              <p className="text-white/70">Lucro total</p>
              <p className="text-2xl font-semibold">{formatCurrency(metricas.lucroTotal)}</p>
            </div>
            <div>
              <p className="text-white/70">Depósitos</p>
              <p className="text-lg font-semibold">{formatCurrency(metricas.totalDepositado)}</p>
            </div>
            <div>
              <p className="text-white/70">Saques</p>
              <p className="text-lg font-semibold">{formatCurrency(metricas.totalSacado)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/75">
            <div className="flex flex-wrap gap-6">
              <span>Total investido: {formatCurrency(metricas.totalInvestido)}</span>
              <span>ROI médio: {formatSignedPercent(metricas.roi)}</span>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f2f2f2] transition hover:bg-white/20">
              Ver detalhes <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        <div className={cn(sectionCardClass, 'space-y-4 lg:col-span-2')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-emerald/15 text-brand-emerald">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Taxa de acerto</p>
                <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>Taxa atual</p>
              </div>
            </div>
            <span className="text-3xl font-semibold text-foreground">{accuracyPercentLabel}</span>
          </div>
          <div className="grid gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-foreground sm:grid-cols-3">
            <div>
              <p className={cn('text-2xs uppercase tracking-[0.3em] text-foreground-muted', softLabelTextClass)}>Apostas</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{totalApostas}</p>
            </div>
            <div>
              <p className={cn('text-2xs uppercase tracking-[0.3em] text-foreground-muted', softLabelTextClass)}>Greens</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">{apostasGanhas}</p>
            </div>
            <div>
              <p className={cn('text-2xs uppercase tracking-[0.3em] text-foreground-muted', softLabelTextClass)}>Reds</p>
              <p className="mt-1 text-xl font-semibold text-rose-400">{derrotasCalculadas}</p>
            </div>
          </div>
          <div className="rounded-full bg-foreground/10 p-0.5">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-[#10ad7b] via-[#11b08f] to-[#12b4a8] shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-[width] duration-500"
              style={{ width: `${(accuracyPercent * 100).toFixed(1)}%` }}
            />
          </div>
          <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>{accuracyPercentLabel} ({accuracyDetailText})</p>
        </div>

      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className={cn(sectionCardClass, 'space-y-6')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Evolução do lucro</h3>
              <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Desempenho diário e acumulado</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 p-1">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'rounded-2xl px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                    periodoGrafico === option.value
                      ? 'bg-brand-emerald text-slate-950 shadow-glow'
                      : cn('text-foreground-muted hover:text-foreground', softLabelTextClass)
                  )}
                  onClick={() => setPeriodoGrafico(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Total acumulado</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(lucroPeriodo)}</p>
              <p className="flex items-center gap-1 text-xs text-brand-emerald">
                <TrendingUp size={14} /> {formatSignedPercent(crescimentoPercentual)} nos últimos {periodoDiasLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Melhor dia</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(melhorDia.valor)}</p>
              <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>{melhorDia.data || 'Sem histórico'}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Média diária</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(mediaDiaria || 0)}</p>
              <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>Últimos {periodoGrafico} dias</p>
            </div>
          </div>

          <div ref={evolucaoChartRef} className="h-64 w-full">
            {!evolucaoChartReady ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs font-medium text-foreground-muted">
                Preparando gráfico...
              </div>
            ) : evolucaoBancaChart.length > 0 ? (
              <LineChart
                width={evolucaoChartWidth}
                height={evolucaoChartHeight}
                data={evolucaoBancaChart}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ ...chartTheme.axisTick, fill: 'rgba(255,255,255,0.65)' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ ...chartTheme.axisTick, fill: 'rgba(255,255,255,0.65)' }}
                  tickFormatter={(value) => `R$ ${value}`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTheme.tooltipDark}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'diário' ? 'Lucro diário' : 'Acumulado']}
                />
                <Line type="monotone" dataKey="diário" stroke={chartTheme.colors.linePrimary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="acumulado" stroke={chartTheme.colors.lineSecondary} strokeWidth={3} dot={false} />
              </LineChart>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-foreground-muted">
                Nenhum dado disponível para o período selecionado.
              </div>
            )}
          </div>
        </div>

        <div className={cn(sectionCardClass, 'space-y-5')}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Performance recente</h3>
              <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Últimas 5 apostas registradas</p>
            </div>
            <TrendingUp size={18} className="text-brand-emerald" />
          </div>

          {loadingApostasRecentes ? (
            <div className={cn('flex h-48 items-center justify-center text-foreground-muted', softLabelTextClass)}>
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : apostasRecentes.length === 0 ? (
            <div className={cn('flex h-48 items-center justify-center text-sm text-foreground-muted', labelTextClass)}>Nenhuma aposta recente.</div>
          ) : (
            <div className="space-y-3">
              {apostasRecentes.slice(0, 5).map((aposta) => {
                const status = aposta.status?.toUpperCase() ?? 'PENDENTE';
                const positive = status === 'GANHOU';
                const negative = status === 'PERDEU';
                const statusClass = positive
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : negative
                    ? 'border border-red-500/30 bg-red-500/15 text-red-500'
                    : 'border border-white/10 bg-white/5 text-white/70';
                const valueClass = positive ? 'text-emerald-400' : negative ? 'text-rose-400' : 'text-foreground';
                const rawDate = aposta.dataJogo ? new Date(aposta.dataJogo) : null;
                const formattedDate = rawDate && !Number.isNaN(rawDate.getTime())
                  ? rawDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : '—';
                const description = aposta.evento ?? 'Aposta sem descrição';
                const oddLabel = aposta.odd ?? '-';
                const bettingHouse = aposta.casaDeAposta ?? 'Casa desconhecida';

                return (
                  <div
                    key={aposta.id}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{description}</p>
                      <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>
                        {formattedDate} · Odd {oddLabel} · {bettingHouse}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', statusClass)}>
                        {status}
                      </span>
                      <span className={cn('text-base font-semibold', valueClass)}>
                        {formatSignedCurrency(aposta.lucro ?? 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={cn(sectionCardClass, 'space-y-5')}>
          <div>
            <h3 className="text-lg font-semibold">Desempenho por esporte</h3>
            <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Descubra onde a banca performa melhor</p>
          </div>
          <BreakdownList
            items={sportBreakdown}
            expandedId={expandedSport}
            onToggle={setExpandedSport}
            emptyMessage="Nenhum esporte registrado no período."
          />
        </div>

        <div className={cn(sectionCardClass, 'space-y-5')}>
          <div>
            <h3 className="text-lg font-semibold">Desempenho por casa</h3>
            <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Veja quais casas oferecem melhor ROI</p>
          </div>
          <BreakdownList
            items={casaBreakdown}
            expandedId={expandedCasa}
            onToggle={setExpandedCasa}
            emptyMessage="Nenhum histórico por casa disponível."
          />
        </div>
      </section>

      {/* Import Modal */}
      <ImportCSVModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        bancas={userBancas}
        defaultBancaId={defaultBancaId}
        onImportSuccess={() => {
          void fetchDashboardData();
        }}
      />
    </div>
  );
}

function BreakdownList({ items, expandedId, onToggle, emptyMessage }: BreakdownListProps) {
  if (items.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-foreground-muted', labelTextClass)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        const positiveRoi = item.roi >= 0;
        const positiveLucro = item.lucro >= 0;

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-2xl border border-white/5 bg-[#102f2b] text-foreground shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-sm',
              isExpanded && 'border-brand-emerald/40 shadow-glow'
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(isExpanded ? null : item.id)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left"
            >
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl text-xl', positiveRoi ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>{item.subtitle}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-sm font-semibold', positiveLucro ? 'text-emerald-400' : 'text-rose-400')}>
                  {formatSignedCurrency(item.lucro)}
                </p>
                <p className="text-xs text-foreground-muted">Lucro</p>
              </div>
              <ChevronDown className={cn('h-5 w-5 text-foreground-muted transition', isExpanded && 'rotate-180 text-foreground')} />
            </button>

            {isExpanded && (
              <div className="border-t border-border/20 px-4 py-4">
                <div className="grid gap-4 text-sm text-foreground sm:grid-cols-2 lg:grid-cols-5">
                  <BreakdownStat label="Apostas" value={item.apostas.toString()} />
                  <BreakdownStat label="Verdes" value={item.ganhas.toString()} helper={`${formatPercent(item.aproveitamento)} de aproveitamento`} />
                  <BreakdownStat label="Stake médio" value={formatCurrency(item.stake)} />
                  <BreakdownStat
                    label="ROI"
                    value={formatSignedPercent(item.roi)}
                    highlight={item.roi >= 0 ? 'positive' : 'negative'}
                  />
                  <BreakdownStat
                    label="Lucro"
                    value={formatSignedCurrency(item.lucro)}
                    highlight={item.lucro >= 0 ? 'positive' : 'negative'}
                  />
                  {item.extraStats?.map((extra) => (
                    <BreakdownStat
                      key={`${item.id}-${extra.label}`}
                      label={extra.label}
                      value={extra.value}
                      helper={extra.helper}
                      highlight={extra.highlight}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BreakdownStat({
  label,
  value,
  helper,
  highlight,
}: {
  label: string;
  value: string;
  helper?: string;
  highlight?: 'positive' | 'negative';
}) {
  return (
    <div>
      <p className={cn('text-2xs uppercase tracking-[0.3em] text-foreground-muted', softLabelTextClass)}>{label}</p>
      <p
        className={cn(
          'mt-1 text-base font-semibold text-foreground',
          highlight === 'positive' && 'text-emerald-400',
          highlight === 'negative' && 'text-rose-400'
        )}
      >
        {value}
      </p>
      {helper && <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>{helper}</p>}
    </div>
  );
}
