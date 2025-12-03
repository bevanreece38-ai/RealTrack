/**
 * Hook para dados do Dashboard
 * 
 * Encapsula toda a lógica de busca e processamento de dados
 * do dashboard, incluindo métricas, gráficos e filtros.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '../services/api';
import { perfilService, type Perfil } from '../services/api';
import { eventBus } from '../utils/eventBus';

// ============================================
// Tipos
// ============================================

export interface DashboardFilters {
  status: string;
  tipster: string;
  casa: string;
  dataInicio: string;
  dataFim: string;
  bancaId: string;
}

export interface DashboardMetricas {
  roi: number;
  taxaAcerto: number;
  lucroTotal: number;
  totalInvestido: number;
  totalDepositado: number;
  totalSacado: number;
  saldoBanca: number;
  totalApostas?: number;
  apostasGanhas?: number;
  apostasPerdidas?: number;
  apostasPendentes?: number;
}

export interface LucroAcumuladoItem {
  date: string;
  lucro: number;
  acumulado: number;
}

export interface LucroPorTipsterItem {
  tipster: string;
  lucro: number;
}

export interface ResumoEsporteItem {
  esporte: string;
  apostas: number;
  ganhas: number;
  aproveitamento: number;
  stakeMedia: number;
  lucro: number;
  roi: number;
}

export interface ResumoCasaItem {
  casa: string;
  apostas: number;
  ganhas: number;
  aproveitamento: number;
  stakeMedia: number;
  lucro: number;
  saldo: number;
  roi: number;
}

export interface ApostaRecente {
  id: string;
  evento?: string | null;
  odd?: string | number | null;
  status?: string | null;
  lucro?: number | null;
  dataJogo?: string | Date | null;
  esporte?: string | null;
  casaDeAposta?: string | null;
}

interface DashboardResponse {
  metricas: DashboardMetricas;
  lucroAcumulado: LucroAcumuladoItem[];
  lucroPorTipster: LucroPorTipsterItem[];
  resumoPorEsporte: ResumoEsporteItem[];
  resumoPorCasa: ResumoCasaItem[];
}

export interface EvolucaoBancaChartItem {
  date: string;
  diário: number;
  acumulado: number;
}

// ============================================
// Valores Iniciais
// ============================================

const initialFilters: DashboardFilters = {
  status: '',
  tipster: '',
  casa: '',
  dataInicio: '',
  dataFim: '',
  bancaId: '',
};

const initialMetricas: DashboardMetricas = {
  roi: 0,
  taxaAcerto: 0,
  lucroTotal: 0,
  totalInvestido: 0,
  totalDepositado: 0,
  totalSacado: 0,
  saldoBanca: 0,
  totalApostas: 0,
  apostasGanhas: 0,
  apostasPerdidas: 0,
  apostasPendentes: 0,
};

// ============================================
// Helpers
// ============================================

/**
 * Converte filtros para query params da API
 */
const buildParams = (filters: DashboardFilters): Partial<DashboardFilters> => {
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
  if (filters.bancaId) {
    params.bancaId = filters.bancaId;
  }
  
  return params;
};

const periodMap: Record<string, number | undefined> = {
  '7': 7,
  '30': 30,
  '60': 60,
};

const sliceByPeriod = (
  lucroAcumulado: LucroAcumuladoItem[],
  periodoGrafico: string
): LucroAcumuladoItem[] => {
  if (lucroAcumulado.length === 0) return [];
  const periodo = periodMap[periodoGrafico];
  return periodo ? lucroAcumulado.slice(-periodo) : lucroAcumulado;
};

/**
 * Prepara dados para o gráfico de evolução da banca
 */
const prepareChartData = (
  lucroAcumulado: LucroAcumuladoItem[],
  periodoGrafico: string
): EvolucaoBancaChartItem[] => {
  const sliced = sliceByPeriod(lucroAcumulado, periodoGrafico);
  if (sliced.length === 0) return [];
  
  return sliced.map((item) => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short' 
    }),
    diário: Number(item.lucro.toFixed(2)),
    acumulado: Number(item.acumulado.toFixed(2)),
  }));
};

/**
 * Calcula crescimento percentual entre primeiro e último valor
 */
const calculateGrowthPercent = (chartData: EvolucaoBancaChartItem[]): number => {
  if (chartData.length < 2) return 0;
  
  const primeiro = chartData[0]?.acumulado ?? 0;
  const ultimo = chartData[chartData.length - 1]?.acumulado ?? 0;
  
  if (primeiro === 0) return 0;
  return ((ultimo - primeiro) / Math.abs(primeiro)) * 100;
};

/**
 * Encontra o melhor dia do período
 */
const findBestDay = (
  lucroAcumulado: LucroAcumuladoItem[],
  periodoGrafico?: string
): { valor: number; data: string } => {
  const dataset = periodoGrafico ? sliceByPeriod(lucroAcumulado, periodoGrafico) : lucroAcumulado;
  if (dataset.length === 0) return { valor: 0, data: '' };
  
  const melhor = dataset.reduce(
    (max, item) => (item.lucro > max.lucro ? item : max),
    dataset[0]
  );
  
  return {
    valor: melhor.lucro,
    data: new Date(melhor.date).toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'long' 
    }),
  };
};

/**
 * Calcula média diária de lucro
 */
const calculateDailyAverage = (
  lucroAcumulado: LucroAcumuladoItem[],
  periodoGrafico: string
): number => {
  const sliced = sliceByPeriod(lucroAcumulado, periodoGrafico);
  if (sliced.length === 0) return 0;
  const soma = sliced.reduce((acc, item) => acc + item.lucro, 0);
  
  return soma / sliced.length;
};

// ============================================
// Hook Principal
// ============================================

interface UseDashboardDataOptions {
  autoFetch?: boolean;
  debounceMs?: number;
}

interface UseDashboardDataResult {
  // Estados
  loading: boolean;
  error: Error | null;
  profile: Perfil | null;
  
  // Dados
  metricas: DashboardMetricas;
  lucroAcumulado: LucroAcumuladoItem[];
  lucroPorTipster: LucroPorTipsterItem[];
  resumoPorEsporte: ResumoEsporteItem[];
  resumoPorCasa: ResumoCasaItem[];
  apostasRecentes: ApostaRecente[];
  loadingApostasRecentes: boolean;
  
  // Filtros
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  handleFilterChange: (field: keyof DashboardFilters, value: string) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  
  // Período do gráfico
  periodoGrafico: string;
  setPeriodoGrafico: React.Dispatch<React.SetStateAction<string>>;
  
  // Dados calculados
  evolucaoBancaChart: EvolucaoBancaChartItem[];
  crescimentoPercentual: number;
  melhorDia: { valor: number; data: string };
  mediaDiaria: number;
  
  // Ações
  fetchDashboardData: () => Promise<void>;
  fetchApostasRecentes: () => Promise<void>;
  refetch: () => void;
}

export function useDashboardData(
  options: UseDashboardDataOptions = {}
): UseDashboardDataResult {
  const { autoFetch = true, debounceMs = 300 } = options;
  
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  
  // Dados do dashboard
  const [metricas, setMetricas] = useState<DashboardMetricas>(initialMetricas);
  const [lucroAcumulado, setLucroAcumulado] = useState<LucroAcumuladoItem[]>([]);
  const [lucroPorTipster, setLucroPorTipster] = useState<LucroPorTipsterItem[]>([]);
  const [resumoPorEsporte, setResumoPorEsporte] = useState<ResumoEsporteItem[]>([]);
  const [resumoPorCasa, setResumoPorCasa] = useState<ResumoCasaItem[]>([]);
  
  // Apostas recentes
  const [apostasRecentes, setApostasRecentes] = useState<ApostaRecente[]>([]);
  const [loadingApostasRecentes, setLoadingApostasRecentes] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [periodoGrafico, setPeriodoGrafico] = useState('7');
  
  // Ref para acessar filtros atuais sem causar re-criação do callback
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const clearDashboardData = useCallback(() => {
    setMetricas(() => ({ ...initialMetricas }));
    setLucroAcumulado([]);
    setLucroPorTipster([]);
    setResumoPorEsporte([]);
    setResumoPorCasa([]);
  }, []);
  
  // Fetch do perfil
  const fetchProfile = useCallback(async () => {
    try {
      const data = await perfilService.get();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);
  
  // Fetch das apostas recentes
  const fetchApostasRecentes = useCallback(async () => {
    const bancaId = filtersRef.current.bancaId;
    if (!bancaId) {
      setApostasRecentes([]);
      setLoadingApostasRecentes(false);
      return;
    }

    setLoadingApostasRecentes(true);
    try {
      const response = await apiClient.get<ApostaRecente[]>('/apostas/recentes', { params: { bancaId } });
      const recentData = Array.isArray(response.data) ? response.data : [];
      setApostasRecentes(recentData);
    } catch {
      setApostasRecentes([]);
    } finally {
      setLoadingApostasRecentes(false);
    }
  }, []);
  
  // Fetch dos dados do dashboard
  const fetchDashboardData = useCallback(async () => {
    const bancaId = filtersRef.current.bancaId;
    const hasBanca = Boolean(bancaId);
    console.log('[DEBUG] fetchDashboardData chamado', new Error().stack);
    if (!hasBanca) {
      clearDashboardData();
      setLoading(false);
      return;
    }

    const params = buildParams(filtersRef.current);
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get<DashboardResponse>('/analise/dashboard', { params });
      const data = response.data;
      
      setMetricas(data.metricas);
      setLucroAcumulado(data.lucroAcumulado);
      setLucroPorTipster(data.lucroPorTipster);
      setResumoPorEsporte(data.resumoPorEsporte);
      setResumoPorCasa(data.resumoPorCasa);
    } catch (err) {
      const apiError = err as { response?: { status?: number } };
      if (apiError.response?.status !== 429) {
        console.error('Erro ao carregar dados do dashboard:', err);
        setError(err instanceof Error ? err : new Error('Erro ao carregar dashboard'));
      }
    } finally {
      setLoading(false);
    }
  }, [clearDashboardData]);
  
  // Handler para mudança de filtros
  const handleFilterChange = useCallback((field: keyof DashboardFilters, value: string) => {
    setFilters((prev: DashboardFilters) => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
  }, []);
  
  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);
  
  // Refetch completo
  const refetch = useCallback(() => {
    console.log('[DEBUG] refetch chamado');
    void fetchDashboardData();
    void fetchApostasRecentes();
  }, [fetchDashboardData, fetchApostasRecentes]);
  
  // Ref para controlar se já fez o fetch inicial
  const hasFetchedRef = useRef(false);
  
  // Efeito único para fetch inicial (roda apenas uma vez)
  useEffect(() => {
    // Ignora se autoFetch está desabilitado
    if (!autoFetch) return;
    
    // Evita fetch duplicado
    if (hasFetchedRef.current) {
      console.log('[DEBUG] fetch inicial ignorado - já foi feito');
      return;
    }
    hasFetchedRef.current = true;
    
    console.log('[DEBUG] fetch inicial executado');
    void fetchDashboardData();
    void fetchApostasRecentes();
    void fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Ref para controlar mudança real de filtros (não primeira renderização)
  const prevFiltersRef = useRef<string>(JSON.stringify(initialFilters));
  
  // Efeito para mudança de filtros (com debounce)
  useEffect(() => {
    if (!autoFetch) return;
    
    const currentFilters = JSON.stringify(filters);
    
    // Ignora se os filtros não mudaram de verdade
    if (prevFiltersRef.current === currentFilters) {
      return;
    }
    prevFiltersRef.current = currentFilters;
    
    console.log('[DEBUG] filtros mudaram, agendando fetch');
    const timeoutId = setTimeout(() => {
      console.log('[DEBUG] fetch por mudança de filtros');
      void fetchDashboardData();
      void fetchApostasRecentes();
    }, debounceMs);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, fetchApostasRecentes]);
  
  // Escutar eventos de atualização (refs para evitar re-criação)
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const fetchProfileRef = useRef(fetchProfile);
  fetchProfileRef.current = fetchProfile;
  
  useEffect(() => {
    const unsubscribeProfile = eventBus.on('profile:updated', () => {
      console.log('[DEBUG] evento profile:updated');
      void fetchProfileRef.current();
    });
    
    const unsubscribeBanca = eventBus.on('banca:updated', () => {
      console.log('[DEBUG] evento banca:updated');
      refetchRef.current();
    });
    
    const unsubscribeApostas = eventBus.on('apostas:updated', () => {
      console.log('[DEBUG] evento apostas:updated');
      refetchRef.current();
    });
    
    return () => {
      unsubscribeProfile();
      unsubscribeBanca();
      unsubscribeApostas();
    };
  }, []); // Dependências vazias - usa refs para funções atuais
  
  // Dados calculados (memoizados)
  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter(v => v !== '').length,
    [filters]
  );
  
  const evolucaoBancaChart = useMemo(
    () => prepareChartData(lucroAcumulado, periodoGrafico),
    [lucroAcumulado, periodoGrafico]
  );
  
  const crescimentoPercentual = useMemo(
    () => calculateGrowthPercent(evolucaoBancaChart),
    [evolucaoBancaChart]
  );
  
  const melhorDia = useMemo(
    () => findBestDay(lucroAcumulado, periodoGrafico),
    [lucroAcumulado, periodoGrafico]
  );
  
  const mediaDiaria = useMemo(
    () => calculateDailyAverage(lucroAcumulado, periodoGrafico),
    [lucroAcumulado, periodoGrafico]
  );
  
  return {
    // Estados
    loading,
    error,
    profile,
    
    // Dados
    metricas,
    lucroAcumulado,
    lucroPorTipster,
    resumoPorEsporte,
    resumoPorCasa,
    apostasRecentes,
    loadingApostasRecentes,
    
    // Filtros
    filters,
    setFilters,
    handleFilterChange,
    clearFilters,
    activeFiltersCount,
    
    // Período do gráfico
    periodoGrafico,
    setPeriodoGrafico,
    
    // Dados calculados
    evolucaoBancaChart,
    crescimentoPercentual,
    melhorDia,
    mediaDiaria,
    
    // Ações
    fetchDashboardData,
    fetchApostasRecentes,
    refetch,
  };
}

export default useDashboardData;
