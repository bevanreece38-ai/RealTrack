import { useState, useEffect, useCallback, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Filter, TrendingUp, ArrowUpRight, Search, Bell, Calendar, Trophy } from 'lucide-react';
import FilterPopover from '../components/FilterPopover';
import DateInput from '../components/DateInput';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import api from '../lib/api';
import { useTipsters } from '../hooks/useTipsters';
import { formatCurrency, formatPercent, getFirstName } from '../utils/formatters';
import type { ApiProfileResponse } from '../types/api';
import '../styles/dashboard-new.css';

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
  const [periodoGrafico, setPeriodoGrafico] = useState('7');

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
      if (apiError.response?.status !== 429) {
        console.error('Erro ao carregar dados do dashboard:', error);
      }
    }
  }, [buildParams]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchDashboardData();
    }, 1000);

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
  }, []);

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter(v => v !== '').length,
    [filters]
  );

  // Preparar dados para gráfico de evolução da banca (acumulado)
  const evolucaoBancaChart = useMemo(() => {
    if (lucroAcumulado.length === 0) return [];
    const sliced = periodoGrafico === '7' 
      ? lucroAcumulado.slice(-7)
      : periodoGrafico === '30'
      ? lucroAcumulado.slice(-30)
      : lucroAcumulado;
    
    return sliced.map((item) => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      valor: Number(item.acumulado.toFixed(2))
    }));
  }, [lucroAcumulado, periodoGrafico]);

  // Calcular crescimento percentual
  const crescimentoPercentual = useMemo(() => {
    if (evolucaoBancaChart.length < 2) return 0;
    const primeiro = evolucaoBancaChart[0]?.valor ?? 0;
    const ultimo = evolucaoBancaChart[evolucaoBancaChart.length - 1]?.valor ?? 0;
    if (primeiro === 0) return 0;
    return ((ultimo - primeiro) / primeiro) * 100;
  }, [evolucaoBancaChart]);

  // Calcular melhor dia e média diária
  const melhorDia = useMemo(() => {
    if (lucroAcumulado.length === 0) return { valor: 0, data: '' };
    const melhor = lucroAcumulado.reduce((max, item) => 
      item.lucro > max.lucro ? item : max, lucroAcumulado[0]
    );
    return {
      valor: melhor.lucro,
      data: new Date(melhor.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    };
  }, [lucroAcumulado]);

  const mediaDiaria = useMemo(() => {
    if (lucroAcumulado.length === 0) return 0;
    const periodo = periodoGrafico === '7' ? 7 : periodoGrafico === '30' ? 30 : lucroAcumulado.length;
    const sliced = lucroAcumulado.slice(-periodo);
    const soma = sliced.reduce((acc, item) => acc + item.lucro, 0);
    return soma / sliced.length;
  }, [lucroAcumulado, periodoGrafico]);

  // Preparar dados para ranking de tipsters
  const rankingTipsters = useMemo(() => {
    return lucroPorTipster
      .map(item => {
        const tipster = tipsters.find(t => t.nome === item.tipster);
        if (!tipster) return null;
        
        // Calcular ROI e taxa de acerto do tipster (simplificado - usando dados do resumo)
        const resumoEsporte = resumoPorEsporte.find(r => r.esporte); // Simplificado
        return {
          nome: item.tipster,
          lucro: item.lucro,
          roi: metricas.roi, // Simplificado - usar dados reais se disponível
          taxa: metricas.taxaAcerto, // Simplificado
          descricao: 'Tipster profissional'
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 5);
  }, [lucroPorTipster, tipsters, resumoPorEsporte, metricas]);

  const roiStatus = useMemo(() => {
    if (metricas.roi >= 50) return 'Ótimo';
    if (metricas.roi >= 0) return 'Bom';
    return 'Atenção';
  }, [metricas.roi]);

  const roiStatusColor = useMemo(() => {
    if (metricas.roi >= 50) return 'emerald';
    if (metricas.roi >= 0) return 'blue';
    return 'red';
  }, [metricas.roi]);

  return (
    <div className="dashboard-new">
      {/* Header */}
      <header className="dashboard-new-header">
        <div className="dashboard-new-header-content">
          <div>
            <h1 className="dashboard-new-title">
              Bem-vindo de volta, {profile ? getFirstName(profile.nomeCompleto) : 'Usuário'}! 👋
            </h1>
            <p className="dashboard-new-subtitle">Aqui está o resumo das suas operações</p>
          </div>
          
          <div className="dashboard-new-header-actions">
            <div className="dashboard-new-search">
              <Search className="dashboard-new-search-icon" size={20} />
              <input
                type="text"
                placeholder="Buscar..."
                className="dashboard-new-search-input"
              />
            </div>
            
            <button className="dashboard-new-notification-btn">
              <Bell size={20} />
              <span className="dashboard-new-notification-dot"></span>
            </button>
            
            <button className="dashboard-new-date-filter-btn">
              <Calendar size={16} />
              <span>Últimos 30 dias</span>
            </button>
            
            <div className="filter-trigger-wrapper">
              <button
                className="dashboard-new-filter-btn"
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
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-new-content">
        {/* Hero Stats */}
        <div className="dashboard-new-hero-stats">
          {/* Main Balance Card */}
          <div className="dashboard-new-hero-main">
            <div className="dashboard-new-hero-main-header">
              <div>
                <p className="dashboard-new-hero-label">Saldo da Banca</p>
                <h2 className="dashboard-new-hero-value">{formatCurrency(metricas.saldoBanca)}</h2>
              </div>
              <div className="dashboard-new-hero-badge">
                <TrendingUp size={16} />
                <span>{formatPercent(metricas.roi)}</span>
              </div>
            </div>
            
            <div className="dashboard-new-hero-main-footer">
              <div>
                <p className="dashboard-new-hero-footer-label">Total Investido</p>
                <p className="dashboard-new-hero-footer-value">{formatCurrency(metricas.totalInvestido)}</p>
              </div>
              <div>
                <p className="dashboard-new-hero-footer-label">Lucro Total</p>
                <p className="dashboard-new-hero-footer-value">{formatCurrency(metricas.lucroTotal)}</p>
              </div>
              <button className="dashboard-new-hero-details-btn">
                Ver Detalhes
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          {/* ROI Card */}
          <div className={`dashboard-new-hero-card dashboard-new-hero-card--${roiStatusColor}`}>
            <div className="dashboard-new-hero-card-header">
              <div className={`dashboard-new-hero-card-icon dashboard-new-hero-card-icon--${roiStatusColor}`}>
                <TrendingUp size={24} />
              </div>
              <span className={`dashboard-new-hero-card-badge dashboard-new-hero-card-badge--${roiStatusColor}`}>
                {roiStatus}
              </span>
            </div>
            <p className="dashboard-new-hero-card-label">ROI</p>
            <h3 className="dashboard-new-hero-card-value">{formatPercent(metricas.roi)}</h3>
            <p className="dashboard-new-hero-card-subtitle">Retorno sobre investimento</p>
          </div>

          {/* Win Rate Card */}
          <div className="dashboard-new-hero-card dashboard-new-hero-card--blue">
            <div className="dashboard-new-hero-card-header">
              <div className="dashboard-new-hero-card-icon dashboard-new-hero-card-icon--blue">
                <span style={{ fontSize: '1.5rem' }}>🎯</span>
              </div>
              <span className="dashboard-new-hero-card-badge dashboard-new-hero-card-badge--blue">
                {formatPercent(metricas.taxaAcerto)}
              </span>
            </div>
            <p className="dashboard-new-hero-card-label">Taxa de Acerto</p>
            <h3 className="dashboard-new-hero-card-value">{formatPercent(metricas.taxaAcerto)}</h3>
            <p className="dashboard-new-hero-card-subtitle">Apostas ganhas</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="dashboard-new-charts-grid">
          <div className="dashboard-new-chart-card dashboard-new-chart-card--large">
            <div className="dashboard-new-chart-header">
              <div>
                <h3 className="dashboard-new-chart-title">Evolução da Banca</h3>
                <p className="dashboard-new-chart-subtitle">Crescimento acumulado</p>
              </div>
              
              <div className="dashboard-new-chart-controls">
                <div className="dashboard-new-growth-badge">
                  <TrendingUp size={16} />
                  <span>{formatPercent(crescimentoPercentual)}</span>
                </div>
                <select 
                  className="dashboard-new-period-select"
                  value={periodoGrafico}
                  onChange={(e) => setPeriodoGrafico(e.target.value)}
                >
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {evolucaoBancaChart.length > 0 ? (
                <AreaChart data={evolucaoBancaChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Saldo']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#a855f7" 
                    strokeWidth={3}
                    fill="url(#colorValor)" 
                  />
                </AreaChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  Sem dados para exibir
                </div>
              )}
            </ResponsiveContainer>
            
            <div className="dashboard-new-chart-stats">
              <div>
                <p className="dashboard-new-chart-stat-label">Melhor Dia</p>
                <p className="dashboard-new-chart-stat-value">{formatCurrency(melhorDia.valor)}</p>
                <p className="dashboard-new-chart-stat-date">{melhorDia.data}</p>
              </div>
              <div>
                <p className="dashboard-new-chart-stat-label">Média Diária</p>
                <p className="dashboard-new-chart-stat-value">{formatCurrency(mediaDiaria)}</p>
                <p className="dashboard-new-chart-stat-period">Últimos {periodoGrafico} dias</p>
              </div>
              <div>
                <p className="dashboard-new-chart-stat-label">Crescimento</p>
                <p className="dashboard-new-chart-stat-value">{formatPercent(crescimentoPercentual)}</p>
                <p className="dashboard-new-chart-stat-growth">vs. inicial</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-new-chart-card">
            <div className="dashboard-new-chart-header">
              <div>
                <h3 className="dashboard-new-chart-title">Ranking de Tipsters</h3>
                <p className="dashboard-new-chart-subtitle">Top performers</p>
              </div>
              <Trophy size={24} className="dashboard-new-trophy-icon" />
            </div>
            
            <div className="dashboard-new-tipster-list">
              {rankingTipsters.length > 0 ? (
                rankingTipsters.map((tipster, index) => (
                  <div key={tipster.nome} className="dashboard-new-tipster-item">
                    <div className="dashboard-new-tipster-gradient"></div>
                    <div className="dashboard-new-tipster-content">
                      <div className="dashboard-new-tipster-header">
                        <div className="dashboard-new-tipster-rank">
                          #{index + 1}
                        </div>
                        <div className="dashboard-new-tipster-info">
                          <h4 className="dashboard-new-tipster-name">{tipster.nome}</h4>
                          <p className="dashboard-new-tipster-desc">{tipster.descricao}</p>
                        </div>
                        <div className="dashboard-new-tipster-profit">
                          <p className="dashboard-new-tipster-profit-value">{formatCurrency(tipster.lucro)}</p>
                          <p className="dashboard-new-tipster-profit-label">Lucro total</p>
                        </div>
                      </div>
                      
                      <div className="dashboard-new-tipster-metrics">
                        <div className="dashboard-new-tipster-metric">
                          <p className="dashboard-new-tipster-metric-label">ROI</p>
                          <p className="dashboard-new-tipster-metric-value">{formatPercent(tipster.roi)}</p>
                        </div>
                        <div className="dashboard-new-tipster-metric">
                          <p className="dashboard-new-tipster-metric-label">Taxa</p>
                          <p className="dashboard-new-tipster-metric-value">{formatPercent(tipster.taxa)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="dashboard-new-empty-text">Nenhum tipster encontrado</p>
              )}
            </div>
            
            <button className="dashboard-new-tipster-view-all">
              <TrendingUp size={16} />
              Ver Todos os Tipsters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
