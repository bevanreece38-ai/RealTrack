import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import type {
  AnaliseBookmakerComparison,
  AnaliseHeatmapData,
  AnaliseOddDistribution,
  AnalisePerformanceResponse,
  AnaliseRoiEntry,
  AnaliseWinRatePorEsporte,
} from '../types/AnaliseData';
import type { AnaliseFilters } from '../types/analise';

export interface UseAnaliseDataState {
  evolucaoRoiMensal: AnaliseRoiEntry[];
  distribuicaoOdds: AnaliseOddDistribution[];
  heatmap: AnaliseHeatmapData;
  comparacaoBookmakers: AnaliseBookmakerComparison[];
  winRatePorEsporte: AnaliseWinRatePorEsporte[];
}

export interface UseAnaliseDataResult {
  data: UseAnaliseDataState;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

const defaultState: UseAnaliseDataState = {
  evolucaoRoiMensal: [],
  distribuicaoOdds: [],
  heatmap: {},
  comparacaoBookmakers: [],
  winRatePorEsporte: [],
};

export function useAnaliseData(filters: AnaliseFilters): UseAnaliseDataResult {
  const [state, setState] = useState<UseAnaliseDataState>(defaultState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};

    if (filters.status && filters.status !== 'Tudo') {
      params.status = filters.status;
    }
    if (filters.tipster) {
      params.tipster = filters.tipster;
    }
    if (filters.casa) {
      params.casa = filters.casa;
    }
    if (filters.esporte) {
      params.esporte = filters.esporte;
    }
    if (filters.evento) {
      params.evento = filters.evento;
    }
    if (filters.dataInicio) {
      params.dataInicio = filters.dataInicio;
    }
    if (filters.dataFim) {
      params.dataFim = filters.dataFim;
    }
    if (filters.oddMin) {
      params.oddMin = filters.oddMin;
    }
    if (filters.oddMax) {
      params.oddMax = filters.oddMax;
    }

    return params;
  }, [filters]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.get<AnalisePerformanceResponse>('/analise/performance', {
        params: queryParams,
      });

      setState({
        evolucaoRoiMensal: data.evolucaoRoiMensal ?? [],
        distribuicaoOdds: data.distribuicaoOdds ?? [],
        heatmap: data.heatmap ?? {},
        comparacaoBookmakers: data.comparacaoBookmakers ?? [],
        winRatePorEsporte: data.winRatePorEsporte ?? [],
      });
    } catch (err) {
      const apiError = err as { response?: { status?: number } };
      // Mantém o mesmo comportamento de log de erro da página original
      if (apiError.response?.status !== 429) {
        console.error('Erro ao carregar dados de performance:', err);
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get<AnalisePerformanceResponse>('/analise/performance', {
          params: queryParams,
        });

        if (isCancelled) return;

        setState({
          evolucaoRoiMensal: data.evolucaoRoiMensal ?? [],
          distribuicaoOdds: data.distribuicaoOdds ?? [],
          heatmap: data.heatmap ?? {},
          comparacaoBookmakers: data.comparacaoBookmakers ?? [],
          winRatePorEsporte: data.winRatePorEsporte ?? [],
        });
      } catch (err) {
        if (isCancelled) return;

        const apiError = err as { response?: { status?: number } };
        if (apiError.response?.status !== 429) {
          console.error('Erro ao carregar dados de performance:', err);
        }
        setError(err as Error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [queryParams]);

  const reload = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data: state,
    isLoading,
    error,
    reload,
  };
}

export default useAnaliseData;


