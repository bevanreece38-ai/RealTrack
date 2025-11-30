import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../lib/api';

interface Banca {
  id: string;
  nome: string;
  ePadrao: boolean;
}

interface BancaApi {
  id?: string | null;
  nome?: string | null;
  ePadrao?: boolean | null;
}

// Cache global para evitar múltiplas requisições
let bancasCache: Banca[] | null = null;
let bancasCacheTime: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

export function useBancas() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [loading, setLoading] = useState(true);

  const mapBanca = (item: BancaApi): Banca => ({
    id: item.id ?? '',
    nome: item.nome ?? 'Banca',
    ePadrao: Boolean(item.ePadrao),
  });

  const fetchBancas = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Usar cache se ainda válido e não for forçado
    if (!force && bancasCache && (now - bancasCacheTime) < CACHE_DURATION) {
      setBancas(bancasCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get<BancaApi[]>('/bancas');
      const bancasData = Array.isArray(data) ? data.map(mapBanca) : [];
      setBancas(bancasData);
      
      // Atualizar cache
      bancasCache = bancasData;
      bancasCacheTime = now;
    } catch (error) {
      console.error('Erro ao carregar bancas:', error);
      // Usar cache mesmo em caso de erro se disponível
      if (bancasCache) {
        setBancas(bancasCache);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBancas();
  }, [fetchBancas]);

  // Função para invalidar cache (útil após criar/editar/deletar)
  const invalidateCache = useCallback(() => {
    bancasCache = null;
    bancasCacheTime = 0;
    void fetchBancas(true);
  }, [fetchBancas]);

  // Memoizar retorno para evitar re-criação do objeto
  return useMemo(
    () => ({ bancas, loading, refetch: fetchBancas, invalidateCache }),
    [bancas, loading, fetchBancas, invalidateCache]
  );
}

