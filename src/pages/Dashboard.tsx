import { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Filter, TrendingUp, ArrowUpRight, Trophy, Plus, Download } from 'lucide-react';
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

const SHOW_RANKING_TIPSTERS = false;

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
  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const [expandedCasa, setExpandedCasa] = useState<string | null>(null);
  
  // Mock data for recent performance
  const [apostasRecentes] = useState([
    { id: 1, evento: 'Flamengo vs Palmeiras', odd: '2.10', status: 'GANHOU', lucro: 11.00 },
    { id: 2, evento: 'Corinthians vs São Paulo', odd: '1.85', status: 'PERDEU', lucro: -10.00 },
    { id: 3, evento: 'Atlético-MG vs Cruzeiro', odd: '2.25', status: 'GANHOU', lucro: 12.50 },
    { id: 4, evento: 'Vasco da Gama vs Botafogo', odd: '1.95', status: 'GANHOU', lucro: 9.50 },
    { id: 5, evento: 'Grêmio vs Internacional', odd: '2.00', status: 'PERDEU', lucro: -10.00 },
    { id: 6, evento: 'Fluminense vs Santos', odd: '1.75', status: 'GANHOU', lucro: 7.50 },
    { id: 7, evento: 'Palmeiras vs Corinthians', odd: '2.15', status: 'GANHOU', lucro: 11.50 }
  ]);

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
      : periodoGrafico === '90'
      ? lucroAcumulado.slice(-90)
      : periodoGrafico === '365'
      ? lucroAcumulado.slice(-365)
      : lucroAcumulado;
    
    return sliced.map((item) => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      diário: Number(item.lucro.toFixed(2)),
      acumulado: Number(item.acumulado.toFixed(2))
    }));
  }, [lucroAcumulado, periodoGrafico]);

  // Calcular crescimento percentual
  const crescimentoPercentual = useMemo(() => {
    if (evolucaoBancaChart.length < 2) return 0;
    const primeiro = evolucaoBancaChart[0]?.acumulado ?? 0;
    const ultimo = evolucaoBancaChart[evolucaoBancaChart.length - 1]?.acumulado ?? 0;
    if (primeiro === 0) return 0;
    return ((ultimo - primeiro) / Math.abs(primeiro)) * 100;
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
    const periodo = periodoGrafico === '7' ? 7 : periodoGrafico === '30' ? 30 : periodoGrafico === '90' ? 90 : periodoGrafico === '365' ? 365 : lucroAcumulado.length;
    const sliced = lucroAcumulado.slice(-periodo);
    const soma = sliced.reduce((acc, item) => acc + item.lucro, 0);
    return soma / sliced.length;
  }, [lucroAcumulado, periodoGrafico]);

  // Preparar dados para ranking de tipsters
  const roiReferencia = useMemo(() => {
    return resumoPorEsporte[0]?.roi ?? metricas.roi;
  }, [resumoPorEsporte, metricas.roi]);

  const taxaReferencia = useMemo(() => {
    return resumoPorEsporte[0]?.aproveitamento ?? metricas.taxaAcerto;
  }, [resumoPorEsporte, metricas.taxaAcerto]);

  const descricaoPadraoTipster = useMemo(() => {
    if (resumoPorCasa.length === 0) {
      return 'Tipster profissional';
    }
    const melhorCasa = [...resumoPorCasa].sort((a, b) => b.lucro - a.lucro)[0];
    return `Especialista em ${melhorCasa.casa}`;
  }, [resumoPorCasa]);

  const rankingTipsters = useMemo(() => {
    const reais = lucroPorTipster
      .map(item => {
        const tipster = tipsters.find(t => t.nome === item.tipster);
        if (!tipster) return null;
        
        // Calcular ROI e taxa de acerto do tipster (simplificado - usando dados do resumo)
        return {
          nome: item.tipster,
          lucro: item.lucro,
          roi: roiReferencia,
          taxa: taxaReferencia,
          descricao: descricaoPadraoTipster
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 5);
      
    const placeholders = [
      {
        nome: 'TIPSTER FICTÍCIO A',
        descricao: descricaoPadraoTipster,
        lucro: 450,
        roi: Math.max(roiReferencia - 8, 10),
        taxa: Math.max(taxaReferencia - 6, 15)
      },
      {
        nome: 'TIPSTER FICTÍCIO B',
        descricao: 'Analista de mercados emergentes',
        lucro: 320,
        roi: Math.max(roiReferencia - 12, 8),
        taxa: Math.max(taxaReferencia - 10, 12)
      }
    ];
    
    const resultado = [...reais];
    let placeholderIndex = 0;
    
    while (resultado.length < 3 && placeholderIndex < placeholders.length) {
      resultado.push(placeholders[placeholderIndex]);
      placeholderIndex += 1;
    }
    
    return resultado;
  }, [lucroPorTipster, tipsters, roiReferencia, taxaReferencia, descricaoPadraoTipster]);

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
            <button className="dashboard-new-date-filter-btn">
              <Plus size={16} />
              <span>Nova Aposta</span>
            </button>
            <button className="dashboard-new-date-filter-btn">
              <Download size={16} />
              <span>Importar Dados</span>
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
                <h3 className="dashboard-new-chart-title">Evolução do Lucro</h3>
                <p className="dashboard-new-chart-subtitle">Desempenho diário e acumulado</p>
              </div>
              
              <div className="dashboard-new-chart-controls">
                <div className="dashboard-new-time-buttons">
                  <button 
                    className={`dashboard-new-time-btn ${periodoGrafico === '7' ? 'active' : ''}`}
                    onClick={() => setPeriodoGrafico('7')}
                  >
                    7d
                  </button>
                  <button 
                    className={`dashboard-new-time-btn ${periodoGrafico === '30' ? 'active' : ''}`}
                    onClick={() => setPeriodoGrafico('30')}
                  >
                    30d
                  </button>
                  <button 
                    className={`dashboard-new-time-btn ${periodoGrafico === '90' ? 'active' : ''}`}
                    onClick={() => setPeriodoGrafico('90')}
                  >
                    90d
                  </button>
                  <button 
                    className={`dashboard-new-time-btn ${periodoGrafico === '365' ? 'active' : ''}`}
                    onClick={() => setPeriodoGrafico('365')}
                  >
                    1y
                  </button>
                </div>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="dashboard-new-summary-cards">
              <div className="dashboard-new-summary-card">
                <div className="dashboard-new-summary-header">
                  <p className="dashboard-new-summary-label">Total Acumulado</p>
                  <div className="dashboard-new-summary-trend">
                    <TrendingUp size={16} />
                    <span>{formatPercent(crescimentoPercentual)}</span>
                  </div>
                </div>
                <h3 className="dashboard-new-summary-value">{formatCurrency(metricas.lucroTotal)}</h3>
              </div>
              
              <div className="dashboard-new-summary-card">
                <p className="dashboard-new-summary-label">Melhor Dia</p>
                <h3 className="dashboard-new-summary-value">{formatCurrency(melhorDia.valor)}</h3>
                <p className="dashboard-new-summary-date">{melhorDia.data}</p>
              </div>
              
              <div className="dashboard-new-summary-card">
                <p className="dashboard-new-summary-label">Média Diária</p>
                <h3 className="dashboard-new-summary-value">{formatCurrency(mediaDiaria)}</h3>
                <p className="dashboard-new-summary-period">Últimos {periodoGrafico === '365' ? '1 ano' : `${periodoGrafico} dias`}</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={200}>
              {evolucaoBancaChart.length > 0 ? (
                <LineChart data={evolucaoBancaChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    formatter={(value: number, name: string) => [
                      `R$ ${value.toFixed(2)}`, 
                      name === 'diário' ? 'Lucro Diário' : 'Acumulado'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="diário" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="acumulado" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  Sem dados para exibir
                </div>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Performance Recente Card */}
          <div className="dashboard-new-chart-card">
            <div className="dashboard-new-chart-header">
              <div>
                <h3 className="dashboard-new-chart-title">Performance Recente</h3>
                <p className="dashboard-new-chart-subtitle">Últimas 7 apostas</p>
              </div>
              <TrendingUp size={20} className="dashboard-new-trending-icon" />
            </div>
            
            <div className="dashboard-new-recent-performance">
              {apostasRecentes && apostasRecentes.length > 0 ? (
                <div className="dashboard-new-recent-list">
                  {apostasRecentes.slice(0, 7).map((aposta, index) => (
                    <div key={aposta.id || index} className="dashboard-new-recent-item">
                      <div className="dashboard-new-recent-status">
                        <div className={`dashboard-new-recent-indicator ${aposta.status === 'GANHOU' ? 'win' : 'loss'}`}></div>
                      </div>
                      <div className="dashboard-new-recent-info">
                        <p className="dashboard-new-recent-event">{aposta.evento || 'Evento'}</p>
                        <p className="dashboard-new-recent-odd">Odd: {aposta.odd || '-'}</p>
                      </div>
                      <div className="dashboard-new-recent-result">
                        <p className={`dashboard-new-recent-value ${aposta.status === 'GANHOU' ? 'positive' : 'negative'}`}>
                          {aposta.status === 'GANHOU' ? '+' : '-'}{formatCurrency(aposta.lucro || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-new-empty-state">
                  <p className="dashboard-new-empty-text">Nenhuma aposta recente</p>
                </div>
              )}
            </div>
          </div>
          
          {SHOW_RANKING_TIPSTERS && (
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
          )}
        </div>
        
        {/* Layout Lado a Lado: Por Esporte e Por Casa de Apostas */}
        <div className="recreate-side-by-side-layout">
          {/* Por Esporte Card */}
          <div className="dashboard-new-chart-card recreate-sport-card-half">
            <div className="dashboard-new-chart-header">
              <div>
                <h3 className="dashboard-new-chart-title">Por Esporte</h3>
                <p className="dashboard-new-chart-subtitle">Acompanhe seus resultados por categoria</p>
              </div>
            </div>
            
            <div className="recreate-sports-breakdown">
              {resumoPorEsporte && resumoPorEsporte.length > 0 ? (
                <div className="recreate-sports-grid">
                  {resumoPorEsporte.slice(0, 4).map((esporte, index) => (
                    <div 
                      key={esporte.esporte || index} 
                      className={`recreate-sport-card ${expandedSport === esporte.esporte ? 'expanded' : ''}`}
                    >
                      <button
                        onClick={() => setExpandedSport(expandedSport === esporte.esporte ? null : esporte.esporte)}
                        className="recreate-sport-button"
                      >
                        <div className="recreate-sport-main">
                          <div className={`recreate-sport-icon ${esporte.roi >= 0 ? 'positive' : 'negative'}`}>
                            ⚽
                          </div>
                          <div className="recreate-sport-info">
                            <div className="recreate-sport-name">{esporte.esporte || 'Outros'}</div>
                            <div className="recreate-sport-subtitle">{esporte.apostas || 0} apostas • {formatPercent(esporte.aproveitamento)}% vitórias</div>
                          </div>
                        </div>

                        <div className="recreate-sport-metrics">
                          <div className="recreate-sport-roi">
                            <div className={`recreate-sport-roi-value ${esporte.roi >= 0 ? 'positive' : 'negative'}`}>
                              {esporte.roi >= 0 ? '+' : ''}{formatPercent(esporte.roi)}
                            </div>
                            <div className="recreate-sport-roi-label">ROI</div>
                          </div>

                          <div className="recreate-sport-profit">
                            <div className={`recreate-sport-profit-value ${esporte.lucro >= 0 ? 'positive' : 'negative'}`}>
                              {esporte.lucro >= 0 ? '+' : ''}{formatCurrency(esporte.lucro)}
                            </div>
                            <div className="recreate-sport-profit-label">Lucro</div>
                          </div>

                          <div className={`recreate-sport-expand ${expandedSport === esporte.esporte ? 'rotated' : ''}`}>
                            <span className="recreate-sport-expand-icon">▼</span>
                          </div>
                        </div>
                      </button>

                      {expandedSport === esporte.esporte && (
                        <div className="recreate-sport-expanded">
                          {/* Stats Summary */}
                          <div className="recreate-stats-grid">
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">Apostas</div>
                              <div className="recreate-stat-value">{esporte.apostas}</div>
                            </div>
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">Verdes</div>
                              <div className="recreate-stat-value positive">{esporte.ganhas}</div>
                              <div className="recreate-stat-subtitle">{formatPercent(esporte.aproveitamento)}%</div>
                            </div>
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">Apostado</div>
                              <div className="recreate-stat-value">{formatCurrency(esporte.stakeMedia * esporte.apostas)}</div>
                            </div>
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">ROI</div>
                              <div className={`recreate-stat-value ${esporte.roi >= 0 ? 'positive' : 'negative'}`}>
                                {esporte.roi >= 0 ? '+' : ''}{formatPercent(esporte.roi)}
                              </div>
                            </div>
                          </div>

                          {/* Recent Activity */}
                          <div className="recreate-recent-activity">
                            <h3 className="recreate-activity-title">Atividade Recente</h3>
                            
                            <div className="recreate-activity-table">
                              {/* Table Header */}
                              <div className="recreate-table-header">
                                <div className="recreate-header-col">Descrição</div>
                                <div className="recreate-header-col">Aposta</div>
                                <div className="recreate-header-col">Lucro</div>
                                <div className="recreate-header-col">Status</div>
                              </div>

                              {/* Sample Table Rows */}
                              <div className="recreate-table-row">
                                <div className="recreate-table-desc">Exemplo de aposta - {esporte.esporte}</div>
                                <div className="recreate-table-amount">R$ 50,00</div>
                                <div className={`recreate-table-profit ${esporte.roi >= 0 ? 'positive' : 'negative'}`}>
                                  {esporte.roi >= 0 ? '+' : '-'}R$ 25,00
                                </div>
                                <div className="recreate-table-status">
                                  <span className={`recreate-status-badge ${esporte.roi >= 0 ? 'win' : 'loss'}`}>
                                    {esporte.roi >= 0 ? 'Ganhou' : 'Perdeu'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-new-empty-state">
                  <p className="dashboard-new-empty-text">Nenhum dado por esporte disponível</p>
                </div>
              )}
            </div>
          </div>

          {/* Por Casa de Apostas Card */}
          <div className="dashboard-new-chart-card recreate-sport-card-half">
            <div className="dashboard-new-chart-header">
              <div>
                <h3 className="dashboard-new-chart-title">Por Casa de Apostas</h3>
                <p className="dashboard-new-chart-subtitle">Acompanhe seus resultados por casa</p>
              </div>
            </div>
            
            <div className="recreate-sports-breakdown">
              {resumoPorCasa && resumoPorCasa.length > 0 ? (
                <div className="recreate-sports-grid">
                  {resumoPorCasa.slice(0, 4).map((casa, index) => (
                    <div 
                      key={casa.casa || index} 
                      className={`recreate-sport-card ${expandedCasa === casa.casa ? 'expanded' : ''}`}
                    >
                      <button
                        onClick={() => setExpandedCasa(expandedCasa === casa.casa ? null : casa.casa)}
                        className="recreate-sport-button"
                      >
                        <div className="recreate-sport-main">
                          <div className={`recreate-sport-icon ${casa.roi >= 0 ? 'positive' : 'negative'}`}>
                            🏢
                          </div>
                          <div className="recreate-sport-info">
                            <div className="recreate-sport-name">{casa.casa || 'Outros'}</div>
                            <div className="recreate-sport-subtitle">{casa.apostas || 0} apostas • {formatPercent(casa.aproveitamento)}% vitórias</div>
                          </div>
                        </div>

                        <div className="recreate-sport-metrics">
                          <div className="recreate-sport-roi">
                            <div className={`recreate-sport-roi-value ${casa.roi >= 0 ? 'positive' : 'negative'}`}>
                              {casa.roi >= 0 ? '+' : ''}{formatPercent(casa.roi)}
                            </div>
                            <div className="recreate-sport-roi-label">ROI</div>
                          </div>

                          <div className="recreate-sport-profit">
                            <div className={`recreate-sport-profit-value ${casa.lucro >= 0 ? 'positive' : 'negative'}`}>
                              {casa.lucro >= 0 ? '+' : ''}{formatCurrency(casa.lucro)}
                            </div>
                            <div className="recreate-sport-profit-label">Lucro</div>
                          </div>

                          <div className={`recreate-sport-expand ${expandedCasa === casa.casa ? 'rotated' : ''}`}>
                            <span className="recreate-sport-expand-icon">▼</span>
                          </div>
                        </div>
                      </button>

                      {expandedCasa === casa.casa && (
                        <div className="recreate-sport-expanded">
                          {/* Stats Summary */}
                          <div className="recreate-stats-grid">
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">Apostas</div>
                              <div className="recreate-stat-value">{casa.apostas}</div>
                            </div>
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">Verdes</div>
                              <div className="recreate-stat-value positive">{casa.ganhas}</div>
                              <div className="recreate-stat-subtitle">{formatPercent(casa.aproveitamento)}%</div>
                            </div>
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">Apostado</div>
                              <div className="recreate-stat-value">{formatCurrency(casa.stakeMedia * casa.apostas)}</div>
                            </div>
                            <div className="recreate-stat-item">
                              <div className="recreate-stat-label">ROI</div>
                              <div className={`recreate-stat-value ${casa.roi >= 0 ? 'positive' : 'negative'}`}>
                                {casa.roi >= 0 ? '+' : ''}{formatPercent(casa.roi)}
                              </div>
                            </div>
                          </div>

                          {/* Recent Activity */}
                          <div className="recreate-recent-activity">
                            <h3 className="recreate-activity-title">Atividade Recente</h3>
                            
                            <div className="recreate-activity-table">
                              {/* Table Header */}
                              <div className="recreate-table-header">
                                <div className="recreate-header-col">Descrição</div>
                                <div className="recreate-header-col">Aposta</div>
                                <div className="recreate-header-col">Lucro</div>
                                <div className="recreate-header-col">Status</div>
                              </div>

                              {/* Sample Table Rows */}
                              <div className="recreate-table-row">
                                <div className="recreate-table-desc">Exemplo de aposta - {casa.casa}</div>
                                <div className="recreate-table-amount">R$ 50,00</div>
                                <div className={`recreate-table-profit ${casa.roi >= 0 ? 'positive' : 'negative'}`}>
                                  {casa.roi >= 0 ? '+' : '-'}R$ 25,00
                                </div>
                                <div className="recreate-table-status">
                                  <span className={`recreate-status-badge ${casa.roi >= 0 ? 'win' : 'loss'}`}>
                                    {casa.roi >= 0 ? 'Ganhou' : 'Perdeu'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-new-empty-state">
                  <p className="dashboard-new-empty-text">Nenhum dado por casa de apostas disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
