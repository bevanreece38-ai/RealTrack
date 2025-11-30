import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../lib/api';

interface Tipster {
  id: string;
  nome: string;
  ativo: boolean;
}

interface TipsterApi {
  id?: string | null;
  nome?: string | null;
  ativo?: boolean | null;
}
// Cache global para evitar múltiplas requisições
let tipstersCache: Tipster[] | null = null;
let tipstersCacheTime: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

export function useTipsters() {
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [loading, setLoading] = useState(true);

  const mapTipster = (item: TipsterApi): Tipster => ({
    id: item.id ?? '',
    nome: item.nome ?? 'Tipster',
    ativo: Boolean(item.ativo),
  });

  const fetchTipsters = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Usar cache se ainda válido e não for forçado
    if (!force && tipstersCache && (now - tipstersCacheTime) < CACHE_DURATION) {
      setTipsters(tipstersCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get<TipsterApi[]>('/tipsters');
      const tipstersData = Array.isArray(data) ? data.map(mapTipster) : [];
      setTipsters(tipstersData);
      
      // Atualizar cache
      tipstersCache = tipstersData;
      tipstersCacheTime = now;
    } catch (error) {
      console.error('Erro ao carregar tipsters:', error);
      // Usar cache mesmo em caso de erro se disponível
      if (tipstersCache) {
        setTipsters(tipstersCache);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTipsters();
  }, [fetchTipsters]);

  // Função para invalidar cache (útil após criar/editar/deletar)
  const invalidateCache = useCallback(() => {
    tipstersCache = null;
    tipstersCacheTime = 0;
    void fetchTipsters(true);
  }, [fetchTipsters]);

  // Memoizar retorno para evitar re-criação do objeto
  return useMemo(
    () => ({ tipsters, loading, refetch: fetchTipsters, invalidateCache }),
    [tipsters, loading, fetchTipsters, invalidateCache]
  );
}

