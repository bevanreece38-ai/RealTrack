import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ComposedChart, Legend, Cell } from 'recharts';
import { Filter, Wallet2, TrendingUp, Percent, CreditCard, Target } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import FilterPopover from '../components/FilterPopover';
import DateInput from '../components/DateInput';
import { GlassCard } from '../components/ui/GlassCard';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import api from '../lib/api';
import { useTipsters } from '../hooks/useTipsters';
import { chartTheme } from '../utils/chartTheme';
import { formatCurrency, formatPercent } from '../utils/formatters';
import type { ApiProfileResponse } from '../types/api';


interface DashboardFilters {
  status: string;
  tipster: string;
  casa: string;
  dataInicio: string;
  dataFim: string;
}

interface DashboardMetricas {
  roi: number;
  taxaAcerto: number;
  lucroTotal: number;
  totalInvestido: number;
  totalDepositado: number;
  totalSacado: number;
  saldoBanca: number;
}

interface LucroAcumuladoItem {
  date: string;
  lucro: number;
  acumulado: number;
}

interface LucroPorTipsterItem {
  tipster: string;
  lucro: number;
}

interface ResumoEsporteItem {
  esporte: string;
  apostas: number;
  ganhas: number;
  aproveitamento: number;
  stakeMedia: number;
  lucro: number;
  roi: number;
}

interface ResumoCasaItem {
  casa: string;
  apostas: number;
  ganhas: number;
  aproveitamento: number;
  stakeMedia: number;
  lucro: number;
  saldo: number;
  roi: number;
}

interface DashboardResponse {
  metricas: DashboardMetricas;
  lucroAcumulado: LucroAcumuladoItem[];
  lucroPorTipster: LucroPorTipsterItem[];
  resumoPorEsporte: ResumoEsporteItem[];
  resumoPorCasa: ResumoCasaItem[];
}

export default function Dashboard() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { tipsters } = useTipsters();
  const [profile, setProfile] = useState<ApiProfileResponse | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    status: '',
    tipster: '',
    casa: '',
    dataInicio: '',
    dataFim: ''
  });
  const [metricas, setMetricas] = useState<DashboardMetricas>({
    roi: 0,
    taxaAcerto: 0,
    lucroTotal: 0,
    totalInvestido: 0,
    totalDepositado: 0,
    totalSacado: 0,
    saldoBanca: 0
  });
  const [lucroAcumulado, setLucroAcumulado] = useState<LucroAcumuladoItem[]>([]);
  const [lucroPorTipster, setLucroPorTipster] = useState<LucroPorTipsterItem[]>([]);
  const [resumoPorEsporte, setResumoPorEsporte] = useState<ResumoEsporteItem[]>([]);
  const [resumoPorCasa, setResumoPorCasa] = useState<ResumoCasaItem[]>([]);
  const [resumoEsporteExpanded, setResumoEsporteExpanded] = useState(false);
  const [resumoCasaExpanded, setResumoCasaExpanded] = useState(false);

  const buildParams = useCallback((): Partial<DashboardFilters> => {
    const params: Partial<DashboardFilters> = {};
    
    if (filters.status && filters.status !== 'Tudo' && filters.status !== '') {
      params.status = filters.status;
    }
    if (filters.tipster) {
      params.tipster = filters.tipster;
    }
    if (filters.casa) {
      params.casa = filters.casa;
    }
    if (filters.dataInicio) {
      params.dataInicio = filters.dataInicio;
    }
    if (filters.dataFim) {
      params.dataFim = filters.dataFim;
    }
    return params;
  }, [filters.status, filters.tipster, filters.casa, filters.dataInicio, filters.dataFim]);

  const fetchDashboardData = useCallback(async () => {
    const params = buildParams();
    try {
      const { data } = await api.get<DashboardResponse>('/analise/dashboard', { params });
      
      setMetricas(data.metricas);
      setLucroAcumulado(data.lucroAcumulado);
      setLucroPorTipster(data.lucroPorTipster);
      setResumoPorEsporte(data.resumoPorEsporte);
      setResumoPorCasa(data.resumoPorCasa);
    } catch (error) {
      const apiError = error as { response?: { status?: number } };
      // Não logar erro se for rate limit (já tratado no interceptor)
      if (apiError.response?.status !== 429) {
        console.error('Erro ao carregar dados do dashboard:', error);
      }
    }
  }, [buildParams]);

  // Adicionar debounce para evitar requisições muito frequentes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchDashboardData();
    }, 1000); // Aumentar para 1 segundo para reduzir requisições

    return () => clearTimeout(timeoutId);
  }, [fetchDashboardData]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get<ApiProfileResponse>('/perfil');
        setProfile(data);
      } catch (error) {
        console.warn('Não foi possível carregar perfil do usuário.', error);
      }
    };
    void fetchProfile();

    // Ouvir eventos de atualização de perfil
    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<ApiProfileResponse | undefined>;
      const updatedProfile = customEvent.detail;
      if (updatedProfile) {
        setProfile(updatedProfile);
      } else {
        void fetchProfile();
      }
    };

    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, []);

  const handleFilterChange = useCallback((field: keyof DashboardFilters, value: string) => {
    setFilters(prev => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
  }, []);

  const handleApplyFilters = useCallback(() => {
    void fetchDashboardData();
    setFiltersOpen(false);
  }, [fetchDashboardData]);

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: '',
      tipster: '',
      casa: '',
      dataInicio: '',
      dataFim: ''
    });
    setFiltersOpen(false);
    // fetchDashboardData será chamado automaticamente quando filters mudar via useEffect
  }, []);

  // Memoizar contagem de filtros ativos
  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter(v => v !== '').length,
    [filters]
  );

  // Memoizar preparação de dados para gráfico de lucro acumulado
  const lucroAcumuladoChart = useMemo(() => {
    if (lucroAcumulado.length === 0) return [];
    return lucroAcumulado.slice(-30).map((item) => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      lucro: Number(item.lucro.toFixed(2)),
      acumulado: Number(item.acumulado.toFixed(2))
    }));
  }, [lucroAcumulado]);

  // Memoizar preparação de dados para gráfico de lucro por tipster
  const lucroPorTipsterChart = useMemo(() => {
    if (lucroPorTipster.length === 0) return [];
    return lucroPorTipster.map(item => ({
      tipster: item.tipster,
      lucro: item.lucro
    }));
  }, [lucroPorTipster]);

  // Memoizar estatísticas do dashboard
  const dashboardStats = useMemo(() => [
    { 
      label: 'Total Investido', 
      value: formatCurrency(metricas.totalInvestido), 
      helper: 'Soma de todas as apostas', 
      icon: <Wallet2 size={20} />
    },
    { 
      label: 'Lucro Total', 
      value: formatCurrency(metricas.lucroTotal), 
      helper: 'Resultado líquido + banca inicial', 
      icon: <TrendingUp size={20} />
    },
    { 
      label: 'ROI', 
      value: formatPercent(metricas.roi), 
      helper: 'Retorno sobre investimento', 
      icon: <Percent size={20} />
    },
    { 
      label: 'Saldo da Banca', 
      value: formatCurrency(metricas.saldoBanca), 
      helper: 'Resultado líquido + saldo inicial', 
      icon: <CreditCard size={20} />
    },
    { 
      label: 'Taxa de Acerto', 
      value: formatPercent(metricas.taxaAcerto), 
      helper: 'Percentual de apostas ganhas', 
      icon: <Target size={20} />
    }
  ], [metricas]);

  return (
    <div>
      <PageHeader
        title="Inicio"
        badge="Padrão"
        subtitle={profile ? `👋 Olá, ${profile.nomeCompleto}! Aqui está seu resumo geral.` : '👋 Olá! Aqui está seu resumo geral.'}
        actions={
          <div className="filter-trigger-wrapper">
            <button
              className="filter-trigger"
              onClick={() => {
                setFiltersOpen((prev) => !prev);
              }}
            >
              <Filter size={16} /> Filtros {activeFiltersCount > 0 && <span className="filter-count">{activeFiltersCount}</span>}
            </button>
            <FilterPopover
              open={filtersOpen}
              onClose={() => {
                setFiltersOpen(false);
              }}
              onClear={handleClearFilters}
              footer={
                <button
                  className="btn"
                  onClick={() => {
                    handleApplyFilters();
                  }}
                >
                  Aplicar Filtros
                </button>
              }
            >
              <div className="filters-panel filters-panel--plain">
                <div className="field">
                  <label>Status</label>
                  <select 
                    value={filters.status} 
                    onChange={(e) => {
                      handleFilterChange('status', e.target.value);
                    }}
                    style={{ color: filters.status ? 'var(--text)' : 'var(--muted)' }}
                  >
                    <option value="" disabled hidden>Selecione um status</option>
                    {STATUS_APOSTAS.length > 0 && STATUS_APOSTAS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tipsters</label>
                  <select 
                    value={filters.tipster}
                    onChange={(e) => {
                      handleFilterChange('tipster', e.target.value);
                    }}
                    style={{ color: filters.tipster ? 'var(--text)' : 'var(--muted)' }}
                  >
                    <option value="" disabled hidden>Selecione</option>
                    {tipsters.filter(t => t.ativo).map((tipster) => (
                      <option key={tipster.id} value={tipster.nome}>
                        {tipster.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Casa de Aposta</label>
                  <select 
                    value={filters.casa}
                    onChange={(e) => {
                      handleFilterChange('casa', e.target.value);
                    }}
                    style={{ color: filters.casa ? 'var(--text)' : 'var(--muted)' }}
                  >
                    <option value="" disabled hidden>Selecione a casa</option>
                    {CASAS_APOSTAS.length > 0 && CASAS_APOSTAS.map((casa) => (
                      <option key={casa} value={casa}>
                        {casa}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Data do Jogo (De)</label>
                  <DateInput
                    value={filters.dataInicio}
                    onChange={(value) => {
                      handleFilterChange('dataInicio', value);
                    }}
                    placeholder="dd/mm/aaaa"
                    className="date-input-modern"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '0.9rem',
                      border: '1.5px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      const root = getComputedStyle(document.documentElement);
                      const bankColor = root.getPropertyValue('--bank-color').trim() || getComputedStyle(document.documentElement).getPropertyValue('--color-chart-primary').trim();
                      const bankColorLight = root.getPropertyValue('--bank-color-light').trim() || getComputedStyle(document.documentElement).getPropertyValue('--color-bg-hover').trim();
                      e.target.style.borderColor = bankColor;
                      e.target.style.boxShadow = `0 0 0 3px ${bankColorLight}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="field">
                  <label>Data do Jogo (Até)</label>
                  <DateInput
                    value={filters.dataFim}
                    onChange={(value) => {
                      handleFilterChange('dataFim', value);
                    }}
                    placeholder="dd/mm/aaaa"
                    className="date-input-modern"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '0.9rem',
                      border: '1.5px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      const root = getComputedStyle(document.documentElement);
                      const bankColor = root.getPropertyValue('--bank-color').trim() || getComputedStyle(document.documentElement).getPropertyValue('--color-chart-primary').trim();
                      const bankColorLight = root.getPropertyValue('--bank-color-light').trim() || getComputedStyle(document.documentElement).getPropertyValue('--color-bg-hover').trim();
                      e.target.style.borderColor = bankColor;
                      e.target.style.boxShadow = `0 0 0 3px ${bankColorLight}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <p style={{ 
                    margin: '8px 0 0 0', 
                    fontSize: '0.75rem', 
                    color: 'var(--muted)',
                    lineHeight: '1.4'
                  }}>
                    Se só preencher "De", será filtrado apenas nesta data. Se preencher "Até", será considerado como intervalo.
                  </p>
                </div>
              </div>
            </FilterPopover>
          </div>
        }
      />

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.label}
            title={stat.label}
            value={stat.value}
            helper={stat.helper}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <GlassCard className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary, var(--color-text-primary-dark))' }}>Lucro Diário e Acumulado</h3>
            <span className="card-desc" style={{ fontSize: '0.875rem', color: 'var(--text-primary, var(--color-text-primary-dark))' }}>Últimos 30 dias</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {lucroAcumuladoChart.length > 0 ? (
              <ComposedChart data={lucroAcumuladoChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorLucroPositivo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="colorLucroNegativo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--bank-color, var(--color-chart-primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--bank-color, var(--color-chart-primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                <XAxis 
                  dataKey="date"
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick, fill: 'var(--color-success)' }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Lucro Diário (R$)', angle: -90, position: 'insideLeft', style: { ...chartTheme.axisLabel, fill: 'var(--color-success)' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick, fill: 'var(--bank-color, var(--color-chart-primary))' }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Acumulado (R$)', angle: 90, position: 'insideRight', style: { ...chartTheme.axisLabel, fill: 'var(--bank-color, var(--color-chart-primary))' } }}
                />
                <Tooltip 
                  contentStyle={chartTheme.tooltip}
                  formatter={(value: number, name: string) => {
                    const formatted = formatCurrency(value);
                    const label = name === 'lucro' ? 'Lucro Diário' : 'Acumulado';
                    return [formatted, label];
                  }}
                  labelStyle={chartTheme.tooltipLabel}
                  itemStyle={chartTheme.tooltipItem}
                />
                <Legend 
                  {...chartTheme.legendProps}
                  formatter={(value: string) => {
                    if (value === 'lucro') return 'Lucro Diário';
                    if (value === 'acumulado') return 'Lucro Acumulado';
                    return value;
                  }}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="lucro" 
                  name="lucro"
                  radius={chartTheme.barRadius}
                  maxBarSize={18}
                >
                  {lucroAcumuladoChart.map((entry) => (
                    <Cell 
                      key={`cell-${entry.date}`} 
                      fill={entry.lucro >= 0 ? 'url(#colorLucroPositivo)' : 'url(#colorLucroNegativo)'}
                    />
                  ))}
                </Bar>
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="acumulado" 
                  name="acumulado"
                  stroke="var(--bank-color, var(--color-chart-primary))" 
                  strokeWidth={3}
                  dot={chartTheme.lineDot}
                  activeDot={chartTheme.lineActiveDot}
                />
              </ComposedChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              </div>
            )}
          </ResponsiveContainer>
        </GlassCard>
        <GlassCard className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary, var(--color-text-primary-dark))' }}>Lucro por Tipster</h3>
            <span className="card-desc" style={{ fontSize: '0.875rem', color: 'var(--text-primary, var(--color-text-primary-dark))' }}>Últimos 90 dias</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {lucroPorTipsterChart.length > 0 ? (
              <BarChart data={lucroPorTipsterChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTipster" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-primary)" stopOpacity={0.9}/>
                    <stop offset="50%" stopColor="var(--color-chart-primary-light)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-chart-primary-dark)" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                <XAxis 
                  dataKey="tipster" 
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick }}
                  tickLine={false}
                />
                <YAxis 
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Lucro (R$)', angle: -90, position: 'insideLeft', style: chartTheme.axisLabel }}
                />
                <Tooltip 
                  contentStyle={chartTheme.tooltip}
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={chartTheme.tooltipLabel}
                  itemStyle={chartTheme.tooltipItem}
                />
                <Bar 
                  dataKey="lucro" 
                  fill="url(#colorTipster)" 
                  radius={chartTheme.barRadius}
                  animationDuration={800}
                  maxBarSize={28}
                >
                  {lucroPorTipsterChart.map((entry) => (
                    <Cell key={`cell-${entry.tipster}`} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              </div>
            )}
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid-2">
        <GlassCard>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', fontWeight: 600 }}>Resumo por Esporte</h3>
              <p className="card-desc" style={{ margin: 0, fontSize: '0.875rem' }}>Performance detalhada por modalidade esportiva</p>
            </div>
            {resumoPorEsporte.length > 0 && (
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => setResumoEsporteExpanded(prev => !prev)}
              >
                {resumoEsporteExpanded ? 'Recolher' : 'Expandir'}
              </button>
            )}
          </div>
          {resumoPorEsporte.length > 0 ? (
            <div
              style={{
                maxHeight: resumoEsporteExpanded ? 'none' : '360px',
                overflowY: resumoEsporteExpanded ? 'visible' : 'auto',
                paddingRight: resumoEsporteExpanded ? 0 : 4
              }}
            >
            {resumoPorEsporte.map((item) => (
              <div
                key={item.esporte}
                style={{ 
                  padding: '16px 0', 
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{item.esporte}</p>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '12px', 
                    background: 'var(--bank-color-light, var(--color-bg-success))',
                    color: 'var(--bank-color, var(--color-success))',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    {formatPercent(item.roi)}
                  </span>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '8px',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Apostas: </span>
                    <span style={{ fontWeight: 600 }}>{item.apostas}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Greens: </span>
                    <span style={{ fontWeight: 600 }}>{item.ganhas}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Aproveitamento: </span>
                    <span style={{ fontWeight: 600 }}>{item.aproveitamento.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Stake Média: </span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(item.stakeMedia)}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--muted)' }}>Lucro: </span>
                    <span style={{ 
                      fontWeight: 600, 
                      color: item.lucro >= 0 ? 'var(--color-success)' : 'var(--color-danger)' 
                    }}>
                      {formatCurrency(item.lucro)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          ) : (
            <p className="card-desc" style={{ padding: '12px 0' }}>
              Nenhuma aposta registrada por esporte
            </p>
          )}
        </GlassCard>
        <GlassCard>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', fontWeight: 600 }}>Resumo por Casa de Aposta</h3>
              <p className="card-desc" style={{ margin: 0, fontSize: '0.875rem' }}>Performance detalhada por bookmaker</p>
            </div>
            {resumoPorCasa.length > 0 && (
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => setResumoCasaExpanded(prev => !prev)}
              >
                {resumoCasaExpanded ? 'Recolher' : 'Expandir'}
              </button>
            )}
          </div>
          {resumoPorCasa.length > 0 ? (
            <div
              style={{
                maxHeight: resumoCasaExpanded ? 'none' : '360px',
                overflowY: resumoCasaExpanded ? 'visible' : 'auto',
                paddingRight: resumoCasaExpanded ? 0 : 4
              }}
            >
            {resumoPorCasa.map((item) => (
              <div
                key={item.casa}
                style={{ 
                  padding: '16px 0', 
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{item.casa}</p>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '12px', 
                    background: 'var(--bank-color-light, var(--color-bg-success))',
                    color: 'var(--bank-color, var(--color-success))',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    {formatPercent(item.roi)}
                  </span>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '8px',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Apostas: </span>
                    <span style={{ fontWeight: 600 }}>{item.apostas}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Greens: </span>
                    <span style={{ fontWeight: 600 }}>{item.ganhas}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Aproveitamento: </span>
                    <span style={{ fontWeight: 600 }}>{item.aproveitamento.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Stake Média: </span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(item.stakeMedia)}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--muted)' }}>Lucro: </span>
                    <span style={{ 
                      fontWeight: 600, 
                      color: item.lucro >= 0 ? 'var(--color-success)' : 'var(--color-danger)' 
                    }}>
                      {formatCurrency(item.lucro)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          ) : (
            <p className="card-desc" style={{ padding: '12px 0' }}>
              Nenhuma aposta registrada por casa de aposta
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

