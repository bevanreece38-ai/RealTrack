import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Plus, Pencil, Clock, CheckCircle, XCircle, RefreshCw, TrendingUp, TrendingDown, Zap, Upload, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import FilterPopover from '../components/FilterPopover';
import DateInput from '../components/DateInput';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import { ESPORTES } from '../constants/esportes';
import { STATUS_SALVAMENTO } from '../constants/statusSalvamento';
import { TIPOS_APOSTA } from '../constants/tiposAposta';
import api from '../lib/api';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/formatters';
import { useTipsters } from '../hooks/useTipsters';
import { useBancas } from '../hooks/useBancas';
import '../styles/pages/atualizar.css';
// Tesseract será carregado dinamicamente apenas quando necessário (biblioteca pesada ~2MB)
import { type ApiBetWithBank, type ApiError, type ApiUploadTicketResponse } from '../types/api';

const VITE_API_URL: unknown = import.meta.env.VITE_API_URL;
const API_BASE_URL = (typeof VITE_API_URL === 'string' && VITE_API_URL.length > 0 ? VITE_API_URL : 'http://localhost:3001/api').replace(/\/$/, '');

const STATUS_WITH_RETURNS = ['Ganha', 'Meio Ganha', 'Cashout'];

type UploadTicketData = NonNullable<ApiUploadTicketResponse['data']>;

interface StatusUpdatePayload {
  status: string;
  retornoObtido?: number | null;
}

interface ApostaFormState {
  bancaId: string;
  esporte: string;
  jogo: string;
  torneio: string;
  pais: string;
  mercado: string;
  tipoAposta: string;
  valorApostado: string;
  odd: string;
  bonus: string;
  dataJogo: string;
  tipster: string;
  status: string;
  casaDeAposta: string;
  retornoObtido: string;
}

interface StatusFormState {
  status: string;
  retornoObtido: string;
}

export default function Atualizar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    esporte: '',
    status: '',
    statusSalvamento: '',
    tipster: '',
    casaDeAposta: '',
    dataDe: '',
    dataAte: '',
    searchText: '',
    oddMin: '',
    oddMax: ''
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrExtracting, setOcrExtracting] = useState(false);
  const ocrCancelledRef = useRef(false);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const tesseractInstanceRef = useRef<typeof import('tesseract.js') | null>(null);
  const [selectedApostaForStatus, setSelectedApostaForStatus] = useState<ApiBetWithBank | null>(null);
  const [editingAposta, setEditingAposta] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [apostas, setApostas] = useState<ApiBetWithBank[]>([]);
  const { bancas } = useBancas();
  const { tipsters } = useTipsters();
  const todayISO = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<ApostaFormState>({
    bancaId: '',
    esporte: '',
    jogo: '',
    torneio: '',
    pais: 'Mundo',
    mercado: '',
    tipoAposta: '',
    valorApostado: '',
    odd: '',
    bonus: '0',
    dataJogo: todayISO,
    tipster: '',
    status: 'Pendente',
    casaDeAposta: '',
    retornoObtido: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ApostaFormState, string>>>({});
  const [formNotice, setFormNotice] = useState('');
  const [statusFormData, setStatusFormData] = useState<StatusFormState>({
    status: '',
    retornoObtido: ''
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [retornoManual, setRetornoManual] = useState(false);
  const [betsExpanded, setBetsExpanded] = useState(false);

  const isDev = import.meta.env.DEV;

  const normalizeOptionalString = (value: string) => {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  };

  const parseNumberOrFallback = (value: string, fallback = 0) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const parseNullableNumber = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  // Função para normalizar o esporte do banco para o formato da lista do frontend
  const normalizeEsporte = (esporteFromDb: string): string => {
    if (!esporteFromDb) return '';
    
    // Normalizar: remover emojis, converter para minúsculo, remover espaços extras
    const normalized = esporteFromDb.toLowerCase().trim();
    
    // Mapear variações comuns para o formato correto da lista
    const esporteMap: Record<string, string> = {
      'basquete': 'Basquete 🏀',
      'basketball': 'Basquete 🏀',
      'futebol': 'Futsal', // Mapear para o mais próximo disponível
      'soccer': 'Futsal',
      'futebol americano': 'Futebol Americano 🏈',
      'football': 'Futebol Americano 🏈',
      'tênis': 'Tênis 🎾',
      'tennis': 'Tênis 🎾',
      'beisebol': 'Beisebol ⚾',
      'baseball': 'Beisebol ⚾',
      'hóquei no gelo': 'Hóquei no Gelo 🏒',
      'hockey': 'Hóquei no Gelo 🏒',
      'corrida de cavalos': 'Corrida de Cavalos 🏇',
      'horse racing': 'Corrida de Cavalos 🏇',
      'curling': 'Curling 🥌',
      'e-sports': 'E-Sports 🎮',
      'esports': 'E-Sports 🎮',
      'e sports': 'E-Sports 🎮',
      'outros': 'Outros',
      'outros esportes': 'Outros Esportes'
    };
    
    // Verificar se há mapeamento direto
    if (esporteMap[normalized]) {
      return esporteMap[normalized];
    }
    
    // Tentar encontrar correspondência parcial na lista (case-insensitive, sem emojis)
    const esporteEncontrado = ESPORTES.find(esp => {
      const espNormalized = esp.toLowerCase().replace(/[🏀⚽🏈🎾⚾🏒🏇🥌🎮]/gu, '').trim();
      return espNormalized === normalized || espNormalized.includes(normalized) || normalized.includes(espNormalized);
    });
    
    if (esporteEncontrado) {
      return esporteEncontrado;
    }
    
    // Se não encontrou, retornar o valor original (pode não estar na lista)
    return esporteFromDb;
  };

  const fetchApostas = useCallback(async () => {
    try {
      const { data } = await api.get<ApiBetWithBank[]>('/apostas');
      setApostas(data);
    } catch (error) {
      console.error('Erro ao buscar apostas:', error);
    }
  }, []);

  const seedTestBets = useCallback(async () => {
    try {
      if (!window.confirm('Gerar 200 apostas de teste? Isso vai inserir registros no backend.')) {
        return;
      }

      const bancaPadrao = bancas.find((banca) => banca.ePadrao) ?? bancas.at(0);
      const defaultBancaId = bancaPadrao?.id ?? '';
      if (!defaultBancaId) {
        alert('Nenhuma banca encontrada para associar às apostas de teste.');
        return;
      }

      const esportesList = ESPORTES;
      const casasList = CASAS_APOSTAS;
      const statusList = STATUS_APOSTAS.filter((s) => s !== 'Tudo');

      const today = new Date();

      const promises: Promise<unknown>[] = [];

      for (let i = 0; i < 200; i += 1) {
        const esporte = esportesList[i % esportesList.length];
        const casaDeAposta = casasList[i % casasList.length];
        const status = statusList[i % statusList.length];
        const valorApostado = 10 + (i % 20);
        const odd = 1.5 + (i % 10) * 0.1;

        const date = new Date(today);
        date.setDate(today.getDate() - (i % 30));
        const dataJogoISO = date.toISOString();

        const payload: Record<string, unknown> = {
          bancaId: defaultBancaId,
          esporte,
          jogo: `Jogo de teste #${i + 1}`,
          torneio: 'Liga de Teste',
          pais: 'Mundo',
          mercado: 'Resultado Final',
          tipoAposta: 'Simples',
          valorApostado,
          odd,
          bonus: 0,
          dataJogo: dataJogoISO,
          tipster: undefined,
          status,
          casaDeAposta
        };

        // Para status que têm retorno, já enviar um valor calculado, senão omitir o campo
        if (STATUS_WITH_RETURNS.includes(status)) {
          payload.retornoObtido = valorApostado * odd;
        }

        promises.push(api.post('/apostas', payload));
      }

      // Enviar em lotes para não sobrecarregar
      const chunkSize = 20;
      for (let i = 0; i < promises.length; i += chunkSize) {
        await Promise.all(promises.slice(i, i + chunkSize));
      }

      await fetchApostas();
      window.dispatchEvent(new Event('apostas-updated'));
      alert('200 apostas de teste criadas com sucesso.');
    } catch (error) {
      console.error('Erro ao criar apostas de teste:', error);
      alert('Erro ao criar apostas de teste. Confira o console para mais detalhes.');
    }
  }, [bancas, fetchApostas]);

  // Buscar banca padrão e apostas
  useEffect(() => {
    if (bancas.length > 0 && !formData.bancaId) {
      const bancaPadrao = bancas.find((banca) => banca.ePadrao) ?? bancas.at(0);
      if (!bancaPadrao) return;
      setFormData((prev) => ({ ...prev, bancaId: bancaPadrao.id }));
    }
  }, [bancas, formData.bancaId]);

  useEffect(() => {
    void fetchApostas();
  }, [fetchApostas]);

  // Escutar evento de atualização de apostas (disparado quando edita via Telegram)
  useEffect(() => {
    const handleApostasUpdated = () => {
      void fetchApostas();
    };

    window.addEventListener('apostas-updated', handleApostasUpdated);
    return () => {
      window.removeEventListener('apostas-updated', handleApostasUpdated);
    };
  }, [fetchApostas]);

  // Processar parâmetros de URL para abrir modais automaticamente
  useEffect(() => {
    const editParam = searchParams.get('edit');
    const statusParam = searchParams.get('status');
    
    if (editParam && apostas.length > 0) {
      const aposta = apostas.find(a => a.id === editParam);
      if (aposta) {
        // Preencher formulário com os dados da aposta (mesma lógica de handleEditAposta)
        const dataJogo = new Date(aposta.dataJogo).toISOString().split('T')[0];
        // Normalizar o esporte para corresponder ao formato da lista
        const esporteNormalizado = normalizeEsporte(aposta.esporte);
        setFormData({
          bancaId: aposta.bancaId,
          esporte: esporteNormalizado,
          jogo: aposta.jogo,
          torneio: aposta.torneio ?? '',
          pais: aposta.pais ?? 'Mundo',
          mercado: aposta.mercado,
          tipoAposta: aposta.tipoAposta,
          valorApostado: aposta.valorApostado.toString(),
          odd: aposta.odd.toString(),
          bonus: aposta.bonus.toString(),
          dataJogo,
          tipster: aposta.tipster ?? '',
          status: aposta.status,
          casaDeAposta: aposta.casaDeAposta,
          retornoObtido: aposta.retornoObtido != null ? aposta.retornoObtido.toString() : ''
        });
        setEditingAposta(aposta.id);
        setModalOpen(true);
        setFormErrors({});
        setRetornoManual(true);
        setFormNotice('');
        // Limpar parâmetro da URL
        searchParams.delete('edit');
        setSearchParams(searchParams, { replace: true });
      }
    }
    
    if (statusParam && apostas.length > 0) {
      const aposta = apostas.find(a => a.id === statusParam);
      if (aposta) {
        setSelectedApostaForStatus(aposta);
        setStatusModalOpen(true);
        // Preencher o formulário de status com os dados atuais
        setStatusFormData({
          status: aposta.status,
          retornoObtido: aposta.retornoObtido != null ? aposta.retornoObtido.toString() : ''
        });
        // Limpar parâmetro da URL
        searchParams.delete('status');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams, apostas]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const streamUrl = `${API_BASE_URL}/apostas/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    // Throttle para evitar muitas requisições
    let lastFetchTime = 0;
    const THROTTLE_MS = 2000; // Aguardar 2 segundos entre requisições

    const handleBetUpdate = () => {
      const now = Date.now();
      if (now - lastFetchTime < THROTTLE_MS) {
        return; // Ignorar se ainda não passou o tempo mínimo
      }
      lastFetchTime = now;
      void fetchApostas();
      window.dispatchEvent(new Event('apostas-updated'));
    };

    eventSource.addEventListener('bet-update', handleBetUpdate);
    eventSource.onerror = (error) => {
      console.warn('Conexão com o stream de apostas instável, tentando novamente...', error);
    };

    return () => {
      eventSource.removeEventListener('bet-update', handleBetUpdate);
      eventSource.close();
    };
  }, [fetchApostas]);

  const handleFormChange = useCallback(
    <K extends keyof ApostaFormState>(field: K, value: ApostaFormState[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => {
        if (!prev[field]) {
          return prev;
        }
        return { ...prev, [field]: undefined };
      });
    },
    []
  );

  useEffect(() => {
    if (!modalOpen || retornoManual || !STATUS_WITH_RETURNS.includes(formData.status)) {
      return;
    }

    const valor = parseFloat(formData.valorApostado);
    const odd = parseFloat(formData.odd);

    if (Number.isFinite(valor) && valor > 0 && Number.isFinite(odd) && odd > 0) {
      const retornoCalculado = (valor * odd).toFixed(2);
      setFormData(prev => {
        if (prev.retornoObtido === retornoCalculado) {
          return prev;
        }
        return { ...prev, retornoObtido: retornoCalculado };
      });
    } else {
      setFormData(prev => {
        if (prev.retornoObtido === '') {
          return prev;
        }
        return { ...prev, retornoObtido: '' };
      });
    }
  }, [modalOpen, retornoManual, formData.status, formData.valorApostado, formData.odd]);

  const handleDeleteAposta = async (aposta: ApiBetWithBank) => {
    if (!window.confirm(`Tem certeza que deseja deletar a aposta "${aposta.jogo}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await api.delete(`/apostas/${aposta.id}`);
      // Recarregar apostas após deletar
      await fetchApostas();
      // Disparar evento para atualizar dashboard
      window.dispatchEvent(new Event('apostas-updated'));
    } catch (error) {
      console.error('Erro ao deletar aposta:', error);
      const apiError = error as ApiError;
      const deleteError = apiError.response?.data?.error;
      alert(typeof deleteError === 'string' ? deleteError : 'Erro ao deletar aposta. Tente novamente.');
    }
  };

  const handleEditAposta = (aposta: ApiBetWithBank) => {
    // Converter data para formato do input (YYYY-MM-DD)
    const dataJogo = new Date(aposta.dataJogo).toISOString().split('T')[0];
    // Normalizar o esporte para corresponder ao formato da lista
    const esporteNormalizado = normalizeEsporte(aposta.esporte);
    
    setFormData({
      bancaId: aposta.bancaId,
      esporte: esporteNormalizado,
      jogo: aposta.jogo,
      torneio: aposta.torneio ?? '',
      pais: aposta.pais ?? 'Mundo',
      mercado: aposta.mercado,
      tipoAposta: aposta.tipoAposta,
      valorApostado: aposta.valorApostado.toString(),
      odd: aposta.odd.toString(),
      bonus: aposta.bonus.toString(),
      dataJogo,
      tipster: aposta.tipster ?? '',
      status: aposta.status,
      casaDeAposta: aposta.casaDeAposta,
      retornoObtido: aposta.retornoObtido != null ? aposta.retornoObtido.toString() : ''
    });
    setEditingAposta(aposta.id);
    setModalOpen(true);
    setFormErrors({});
    setRetornoManual(true);
    setFormNotice('');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingAposta(null);
    setFormErrors({});
    setFormNotice('');
    // Resetar formulário
    const bancaPadrao = bancas.find((banca) => banca.ePadrao) ?? bancas.at(0);
    const defaultBancaId = bancaPadrao?.id ?? '';
    setFormData({
      bancaId: defaultBancaId,
      esporte: '',
      jogo: '',
      torneio: '',
      pais: 'Mundo',
      mercado: '',
      tipoAposta: '',
      valorApostado: '',
      odd: '',
      bonus: '0',
      dataJogo: todayISO,
      tipster: '',
      status: 'Pendente',
      casaDeAposta: '',
      retornoObtido: ''
    });
    setRetornoManual(false);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ApostaFormState, string>> = {};

    if (!formData.bancaId) {
      errors.bancaId = 'Selecione uma banca';
    }
    if (!formData.esporte) {
      errors.esporte = 'Selecione um esporte';
    }
    if (!formData.jogo.trim()) {
      errors.jogo = 'Digite o jogo';
    }
    if (!formData.mercado.trim()) {
      errors.mercado = 'Digite o mercado';
    }
    if (!formData.tipoAposta) {
      errors.tipoAposta = 'Selecione o tipo de aposta';
    }
    if (!formData.valorApostado || parseFloat(formData.valorApostado) <= 0) {
      errors.valorApostado = 'Digite um valor válido';
    }
    if (!formData.odd || parseFloat(formData.odd) <= 0) {
      errors.odd = 'Digite uma odd válida';
    }
    if (!formData.dataJogo) {
      errors.dataJogo = 'Selecione a data do jogo';
    }
    if (!formData.casaDeAposta) {
      errors.casaDeAposta = 'Selecione a casa de aposta';
    }
    if (formData.status !== 'Pendente' && !formData.retornoObtido) {
      // Se o status não é Pendente, retornoObtido pode ser necessário dependendo do status
      if (['Ganha', 'Meio Ganha', 'Cashout'].includes(formData.status)) {
        if (!formData.retornoObtido || parseFloat(formData.retornoObtido) <= 0) {
          errors.retornoObtido = 'Digite o retorno obtido';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Validar e converter data
      if (!formData.dataJogo) {
        setFormErrors({ dataJogo: 'Selecione a data do jogo' });
        setSaving(false);
        return;
      }

      const dataJogoDate = new Date(formData.dataJogo);
      if (isNaN(dataJogoDate.getTime())) {
        setFormErrors({ dataJogo: 'Data inválida' });
        setSaving(false);
        return;
      }

      // Converter para ISO string (apenas data, sem hora)
      // O input type="date" retorna no formato YYYY-MM-DD, então ao converter para Date
      // a hora será 00:00:00 automaticamente
      const dataJogoISO = dataJogoDate.toISOString();

      const payload = {
        bancaId: formData.bancaId,
        esporte: formData.esporte.trim(),
        jogo: formData.jogo.trim(),
        torneio: normalizeOptionalString(formData.torneio),
        pais: normalizeOptionalString(formData.pais),
        mercado: formData.mercado.trim(),
        tipoAposta: formData.tipoAposta,
        valorApostado: Number.parseFloat(formData.valorApostado),
        odd: Number.parseFloat(formData.odd),
        bonus: parseNumberOrFallback(formData.bonus),
        dataJogo: dataJogoISO,
        tipster: normalizeOptionalString(formData.tipster),
        status: formData.status,
        casaDeAposta: formData.casaDeAposta,
        retornoObtido: parseNullableNumber(formData.retornoObtido)
      };

      if (editingAposta) {
        // Atualizar aposta existente
        await api.put(`/apostas/${editingAposta}`, payload);
      } else {
        // Criar nova aposta
        await api.post('/apostas', payload);
      }

      // Limpar formulário e fechar modal
      handleCloseModal();

      // Recarregar apostas e atualizar estatísticas
      await fetchApostas();
      
      // Recarregar dados do dashboard (pode ser feito via contexto ou refetch)
      window.dispatchEvent(new Event('apostas-updated'));
    } catch (error) {
      console.error('Erro ao criar aposta:', error);
      const apiError = error as ApiError;
      const responseError = apiError.response?.data?.error;
      if (Array.isArray(responseError)) {
        const zodErrors: Record<string, string> = {};
        responseError.forEach((err) => {
          const fieldKey = err.path?.[0];
          if (fieldKey) {
            zodErrors[fieldKey] = err.message ?? '';
          }
        });
        setFormErrors(zodErrors);
      } else if (typeof responseError === 'string') {
        alert(responseError);
      } else {
        alert('Erro ao criar aposta. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const extractTextFromImage = useCallback(async (file: File) => {
    setOcrExtracting(true);
    setOcrText('');

    try {
      // Carregar Tesseract dinamicamente apenas quando necessário (reduz bundle inicial em ~2MB)
      const tesseractModule = await import('tesseract.js');
      const Tesseract = tesseractModule.default;
      tesseractInstanceRef.current = tesseractModule;
      
      const { data } = await Tesseract.recognize(file, 'por+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            // progresso oculto do usuário
          }
        }
      });
      if (ocrCancelledRef.current) {
        return;
      }
      const text = data.text.trim();
      setOcrText(text);
    } catch (error) {
      if (ocrCancelledRef.current) {
        return;
      }
      console.error('Erro ao extrair texto do bilhete:', error);
    } finally {
      if (!ocrCancelledRef.current) {
        setOcrExtracting(false);
      }
    }
  }, []);

  // Função para processar arquivo de imagem
  const processImageFile = useCallback((file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas imagens');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB');
      return false;
    }
    setSelectedFile(file);
    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    ocrCancelledRef.current = false;
    void extractTextFromImage(file);
    return true;
  }, [extractTextFromImage]);

  // Função para lidar com seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Função para lidar com colagem de imagem (Ctrl+V)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!uploadModalOpen) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          void processImageFile(file);
        }
        break;
      }
    }
  }, [uploadModalOpen, processImageFile]);

  // Adicionar listener para Ctrl+V quando modal estiver aberto
  useEffect(() => {
    if (uploadModalOpen) {
      window.addEventListener('paste', handlePaste);
      return () => {
        window.removeEventListener('paste', handlePaste);
      };
    }
  }, [uploadModalOpen, handlePaste]);

  // Função para processar upload e extrair dados
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Por favor, selecione uma imagem');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('image', selectedFile);
      if (ocrText.trim()) {
        formData.append('ocrText', ocrText.trim());
      }
      uploadAbortControllerRef.current?.abort();
      const controller = new AbortController();
      uploadAbortControllerRef.current = controller;

      const { data } = await api.post<ApiUploadTicketResponse>('/upload/bilhete', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        signal: controller.signal
      });

      if (data.success && data.data) {
        const extractedData: UploadTicketData = data.data;
        
        // Preencher formulário com dados extraídos
        const bancaPadrao = bancas.find((b) => b.ePadrao) ?? bancas.at(0);
        const defaultBancaId = bancaPadrao?.id ?? '';
        const normalizedDate = extractedData.dataJogo ? extractedData.dataJogo.split('T')[0] : todayISO;
        setFormData({
          bancaId: defaultBancaId,
          esporte: extractedData.esporte ?? '',
          jogo: extractedData.jogo ?? '',
          torneio: extractedData.torneio ?? '',
          pais: extractedData.pais ?? 'Mundo',
          mercado: extractedData.mercado ?? '',
          tipoAposta: extractedData.tipoAposta ?? 'Simples',
          valorApostado: extractedData.valorApostado !== undefined ? extractedData.valorApostado.toString() : '',
          odd: extractedData.odd !== undefined ? extractedData.odd.toString() : '',
          bonus: '0',
          dataJogo: normalizedDate,
          tipster: extractedData.tipster ?? '',
          status: extractedData.status ?? 'Pendente',
          casaDeAposta: extractedData.casaDeAposta ?? '',
          retornoObtido: ''
        });

        // Fechar modal de upload e abrir modal de criação de aposta
        setUploadModalOpen(false);
        setModalOpen(true);
        setEditingAposta(null);
        setRetornoManual(false);
        setFormNotice('Dados extraídos com sucesso! Revise e ajuste os campos antes de salvar.');
        
        // Limpar upload
        setSelectedFile(null);
        setUploadPreview(null);
        setOcrText('');
      }
    } catch (error) {
      const apiError = error as ApiError & { code?: string };
      if (apiError.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Erro ao processar upload:', error);
      const errorData = apiError.response?.data;
      const errorMessage =
        (typeof errorData?.error === 'string' ? errorData.error : undefined) ??
        errorData?.message ??
        apiError.message ??
        'Erro ao processar imagem. Tente novamente.';
      
      // Mensagem mais detalhada para erro de quota
      if (errorMessage.includes('Quota') || errorMessage.includes('quota') || errorMessage.includes('excedida')) {
        const isGemini = errorMessage.includes('Gemini');
        const apiName = isGemini ? 'Google Gemini' : 'OpenAI';
        const billingUrl = isGemini 
          ? 'https://aistudio.google.com/app/apikey'
          : 'https://platform.openai.com/account/billing';
        
        alert(
          `⚠️ Quota da API ${apiName} Excedida\n\n` +
          `Você excedeu a cota atual da sua conta ${apiName}.\n\n` +
          `Para resolver:\n` +
          `1. Acesse: ${billingUrl}\n` +
          `2. Verifique seus créditos disponíveis\n` +
          `3. Adicione créditos ou atualize seu plano\n\n` +
          `Após resolver, tente novamente.`
        );
      } else {
        alert(`Erro: ${errorMessage}`);
      }
    } finally {
      uploadAbortControllerRef.current = null;
      setUploading(false);
    }
  };

  // Função para fechar modal de upload
  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    setUploadPreview(null);
    setOcrText('');
    setOcrExtracting(false);
    ocrCancelledRef.current = true;
    try {
      // Terminar OCR se Tesseract foi carregado
      if (tesseractInstanceRef.current) {
        const terminable = tesseractInstanceRef.current.default as { terminate?: () => void };
      terminable.terminate?.();
      }
    } catch (error) {
      console.warn('Falha ao encerrar OCR:', error);
    }
    uploadAbortControllerRef.current?.abort();
    uploadAbortControllerRef.current = null;
    setUploading(false);
  };

  // Formatar valores monetários usando utilitário compartilhado
  const formatCurrency = useCallback((value: number): string => {
    return formatCurrencyUtil(value);
  }, []);

  // Formatar data (apenas data, sem horário) usando utilitário compartilhado
  const formatDate = useCallback((dateString: string): string => {
    return formatDateUtil(dateString);
  }, []);

  const getStatusIcon = (status: string) => {
    const iconSize = 14;
    switch (status) {
      case 'Pendente':
        return <Clock size={iconSize} />;
      case 'Ganha':
        return <CheckCircle size={iconSize} />;
      case 'Perdida':
        return <XCircle size={iconSize} />;
      case 'Reembolsada':
        return <RefreshCw size={iconSize} />;
      case 'Meio Ganha':
        return <TrendingUp size={iconSize} />;
      case 'Meio Perdida':
        return <TrendingDown size={iconSize} />;
      case 'Cashout':
        return <Zap size={iconSize} />;
      default:
        return <Clock size={iconSize} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente':
        return { bg: 'var(--color-warning-light)', text: 'var(--color-text-white)' };
      case 'Ganha':
        return { bg: 'var(--color-success)', text: 'var(--color-text-white)' };
      case 'Perdida':
        return { bg: 'var(--color-danger)', text: 'var(--color-text-white)' };
      case 'Reembolsada':
        return { bg: 'var(--color-chart-primary)', text: 'var(--color-text-white)' };
      case 'Meio Ganha':
        return { bg: 'var(--color-success-light)', text: 'var(--color-text-white)' };
      case 'Meio Perdida':
        return { bg: 'var(--color-bank-palette-3)', text: 'var(--color-text-white)' };
      case 'Cashout':
        return { bg: 'var(--color-secondary)', text: 'var(--color-text-white)' };
      default:
        return { bg: 'var(--color-text-muted)', text: 'var(--color-text-white)' };
    }
  };

  // Calcular retorno obtido automaticamente baseado no status
  const calcularRetornoObtido = useCallback((status: string, valorApostado: number, odd: number, retornoManualValue?: number): number | null => {
    switch (status) {
      case 'Ganha':
        // Retorno = valor apostado * odd
        return valorApostado * odd;
      
      case 'Meio Ganha':
        // Retorno = (valor apostado * odd) / 2 + valor apostado / 2
        return (valorApostado * odd) / 2 + valorApostado / 2;
      
      case 'Cashout':
        // Para cashout, usar valor manual se fornecido, senão calcular baseado na odd
        return retornoManualValue ?? valorApostado * odd * 0.7; // 70% do retorno potencial como padrão
      
      case 'Perdida':
      case 'Meio Perdida':
      case 'Reembolsada':
      case 'Void':
      case 'Pendente':
      default:
        return null;
    }
  }, []);

  const handleUpdateStatus = async () => {
    if (!selectedApostaForStatus) return;

    // Validação
    if (!statusFormData.status) {
      alert('Selecione um status');
      return;
    }

    try {
      setUpdatingStatus(true);

      const dataToSend: StatusUpdatePayload = {
        status: statusFormData.status
      };

      // Calcular retorno obtido automaticamente
      if (STATUS_WITH_RETURNS.includes(statusFormData.status)) {
        const retornoManualValue = parseNullableNumber(statusFormData.retornoObtido);
        // Se há valor manual, usar ele; senão calcular automaticamente
        if (retornoManualValue !== undefined && retornoManualValue > 0) {
          dataToSend.retornoObtido = retornoManualValue;
        } else {
          const retornoCalculado = calcularRetornoObtido(
            statusFormData.status,
            selectedApostaForStatus.valorApostado,
            selectedApostaForStatus.odd,
            retornoManualValue
          );
          if (retornoCalculado !== null) {
            dataToSend.retornoObtido = retornoCalculado;
          }
        }
      } else {
        // Para outros status (Perdida, Meio Perdida, Reembolsada, Void, Pendente), não há retorno
        // Não enviamos o campo ou enviamos explicitamente null
        dataToSend.retornoObtido = null;
      }

      await api.put(`/apostas/${selectedApostaForStatus.id}`, dataToSend);

      // Atualizar lista e estatísticas
      await fetchApostas();
      
      // Fechar modal
      setStatusModalOpen(false);
      setSelectedApostaForStatus(null);
      setStatusFormData({ status: '', retornoObtido: '' });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCloseStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    setSelectedApostaForStatus(null);
    setStatusFormData({ status: '', retornoObtido: '' });
  }, []);

  // Função para abrir modal de status
  const handleOpenStatusModal = useCallback((aposta: ApiBetWithBank) => {
    setSelectedApostaForStatus(aposta);
    setStatusFormData({
      status: aposta.status,
      retornoObtido: aposta.retornoObtido != null ? aposta.retornoObtido.toString() : ''
    });
    setStatusModalOpen(true);
  }, []);

  // Calcular estatísticas (recalcula automaticamente quando apostas mudam)
  const stats = useMemo(() => {
    const totalInvestido = apostas.reduce((sum, aposta) => sum + aposta.valorApostado, 0);
    const ganhos = apostas
      .filter(
        (aposta): aposta is ApiBetWithBank & { retornoObtido: number } =>
          aposta.status !== 'Pendente' && typeof aposta.retornoObtido === 'number'
      )
      .reduce((sum, aposta) => sum + aposta.retornoObtido, 0);
    const pendente = apostas
      .filter((aposta) => aposta.status === 'Pendente')
      .reduce((sum, aposta) => sum + aposta.valorApostado, 0);

    return [
      { 
        title: 'Total Apostas', 
        value: apostas.length.toString(), 
        helper: 'apostas registradas',
        color: 'blue' as const
      },
      { 
        title: 'Valor Investido', 
        value: formatCurrency(totalInvestido), 
        helper: 'total investido',
        color: 'purple' as const
      },
      { 
        title: 'Ganhos', 
        value: formatCurrency(ganhos), 
        helper: 'lucro obtido',
        color: 'emerald' as const
      },
      { 
        title: 'Pendente', 
        value: formatCurrency(pendente), 
        helper: 'aguardando resultado',
        color: 'amber' as const
      }
    ];
  }, [apostas, formatCurrency]);

  const filteredApostas = useMemo(() => {
    return apostas.filter((aposta) => {
      if (filters.esporte && aposta.esporte !== filters.esporte) return false;
      if (filters.status && aposta.status !== filters.status) return false;
      if (filters.tipster && aposta.tipster !== filters.tipster) return false;
      if (filters.casaDeAposta && aposta.casaDeAposta !== filters.casaDeAposta) return false;

      if (filters.dataDe) {
        const dataAposta = new Date(aposta.dataJogo).getTime();
        const deTime = new Date(filters.dataDe).getTime();
        if (Number.isFinite(deTime) && dataAposta < deTime) return false;
      }
      if (filters.dataAte) {
        const dataAposta = new Date(aposta.dataJogo).getTime();
        const ateDate = new Date(filters.dataAte);
        // incluir o dia inteiro no "até"
        ateDate.setHours(23, 59, 59, 999);
        const ateTime = ateDate.getTime();
        if (Number.isFinite(ateTime) && dataAposta > ateTime) return false;
      }

      if (filters.searchText) {
        const text = filters.searchText.toLowerCase();
        const combined = `${aposta.jogo} ${aposta.mercado} ${aposta.esporte}`.toLowerCase();
        if (!combined.includes(text)) return false;
      }

      if (filters.oddMin) {
        const min = Number.parseFloat(filters.oddMin);
        if (Number.isFinite(min) && aposta.odd < min) return false;
      }
      if (filters.oddMax) {
        const max = Number.parseFloat(filters.oddMax);
        if (Number.isFinite(max) && aposta.odd > max) return false;
      }

      return true;
    });
  }, [apostas, filters]);

  const activeFilterCount = useMemo(() => {
    return Object.values({
      esporte: filters.esporte,
      status: filters.status,
      statusSalvamento: filters.statusSalvamento,
      tipster: filters.tipster,
      casaDeAposta: filters.casaDeAposta,
      dataDe: filters.dataDe,
      dataAte: filters.dataAte,
      searchText: filters.searchText,
      oddMin: filters.oddMin,
      oddMax: filters.oddMax
    }).filter((value) => value !== '').length;
  }, [filters]);

  const manualRetornoValue = parseNullableNumber(statusFormData.retornoObtido);
  const retornoPreview = STATUS_WITH_RETURNS.includes(statusFormData.status)
    ? (manualRetornoValue ??
        calcularRetornoObtido(
          statusFormData.status,
          selectedApostaForStatus?.valorApostado ?? 0,
          selectedApostaForStatus?.odd ?? 0,
          manualRetornoValue
        ) ??
        0)
    : 0;

  return (
    <div className="atualizar-page">
      <PageHeader
        title="Apostas"
        subtitle="Gerencie suas apostas e acompanhe resultados"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              type="button"
              className="btn" 
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload size={16} /> Upload
            </button>
            <div className="filter-trigger-wrapper">
              <button className="filter-trigger" onClick={() => setFiltersOpen((prev) => !prev)}>
                <Filter size={16} /> Filtros{' '}
                {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
              </button>
              <FilterPopover
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                onClear={() => {
                  setFilters({
                    esporte: '',
                    status: '',
                    statusSalvamento: '',
                    tipster: '',
                    casaDeAposta: '',
                    dataDe: '',
                    dataAte: '',
                    searchText: '',
                    oddMin: '',
                    oddMax: ''
                  });
                  setFiltersOpen(false);
                }}
                footer={
                  <button className="btn" onClick={() => setFiltersOpen(false)}>
                    Aplicar Filtros
                  </button>
                }
              >
                <div className="filters-panel filters-panel--plain">
                  <div className="field">
                    <label>Esporte</label>
                    <select
                      value={filters.esporte}
                      onChange={(e) => setFilters((prev) => ({ ...prev, esporte: e.target.value }))}
                      style={{ color: filters.esporte ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <option value="" disabled hidden>Selecione…</option>
                      {ESPORTES.map((esporte) => (
                        <option key={esporte} value={esporte}>
                          {esporte}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                      style={{ color: filters.status ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <option value="" disabled hidden>Selecione um status</option>
                      {STATUS_APOSTAS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Status Salvamento</label>
                    <select
                      value={filters.statusSalvamento}
                      onChange={(e) => setFilters((prev) => ({ ...prev, statusSalvamento: e.target.value }))}
                      style={{ color: filters.statusSalvamento ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <option value="" disabled hidden>Selecione…</option>
                      {STATUS_SALVAMENTO.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Tipster</label>
                    <select
                      value={filters.tipster}
                      onChange={(e) => setFilters((prev) => ({ ...prev, tipster: e.target.value }))}
                      style={{ color: filters.tipster ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <option value="" disabled hidden>Selecione…</option>
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
                      value={filters.casaDeAposta}
                      onChange={(e) => setFilters((prev) => ({ ...prev, casaDeAposta: e.target.value }))}
                      style={{ color: filters.casaDeAposta ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <option value="" disabled hidden>Selecione…</option>
                      {CASAS_APOSTAS.map((casa) => (
                        <option key={casa} value={casa}>
                          {casa}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Data do Jogo (De)</label>
                    <DateInput
                      value={filters.dataDe}
                      onChange={(value) => setFilters((prev) => ({ ...prev, dataDe: value }))}
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
                        e.target.style.borderColor = 'var(--color-border-input-focus)';
                        e.target.style.boxShadow = 'var(--color-shadow-input-focus)';
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
                      value={filters.dataAte}
                      onChange={(value) => setFilters((prev) => ({ ...prev, dataAte: value }))}
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
                        e.target.style.borderColor = 'var(--color-border-input-focus)';
                        e.target.style.boxShadow = 'var(--color-shadow-input-focus)';
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
                  <div className="field">
                    <label>Evento, Mercado, Aposta</label>
                    <input
                      type="text"
                      placeholder="Digite o nome do evento, mercado ou aposta"
                      value={filters.searchText}
                      onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>ODD</label>
                    <div className="field-inline">
                      <input
                        type="number"
                        placeholder="Mínimo"
                        value={filters.oddMin}
                        onChange={(e) => setFilters((prev) => ({ ...prev, oddMin: e.target.value }))}
                      />
                      <input
                        type="number"
                        placeholder="Máximo"
                        value={filters.oddMax}
                        onChange={(e) => setFilters((prev) => ({ ...prev, oddMax: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </FilterPopover>
            </div>
            <button 
              type="button"
              className="btn" 
              onClick={() => {
                setEditingAposta(null);
                setModalOpen(true);
                setRetornoManual(false);
                setFormNotice('');
              }}
            >
              <Plus size={16} /> Nova Aposta
            </button>
          </div>
        }
      />

      <div className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} helper={stat.helper} color={stat.color} />
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Apostas</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {isDev && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  void seedTestBets();
                }}
                title="Gerar 200 apostas de teste (apenas desenvolvimento)"
              >
                Gerar testes
              </button>
            )}
            <button
              type="button"
              className="btn ghost"
              onClick={() => setBetsExpanded((prev) => !prev)}
            >
              {betsExpanded ? 'Recolher' : 'Expandir'}
            </button>
          </div>
        </div>

        {apostas.length === 0 ? (
          <EmptyState title="Nenhuma aposta" description="Cadastre uma nova aposta para começar a acompanhar resultados." />
        ) : (
          <div
            style={{
              maxHeight: betsExpanded ? 'none' : '420px',
              overflowY: betsExpanded ? 'visible' : 'auto',
              marginTop: '8px'
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Casa de Aposta</th>
                  <th>Tipster</th>
                  <th>Data</th>
                  <th>Esporte</th>
                  <th>Partida</th>
                  <th>Mercado</th>
                  <th>Stake</th>
                  <th>Status</th>
                  <th>Retorno Obtido</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredApostas.map((aposta) => (
                  <tr key={aposta.id}>
                    <td>{aposta.casaDeAposta ?? '-'}</td>
                    <td>{aposta.tipster ?? '-'}</td>
                    <td>{formatDate(aposta.dataJogo)}</td>
                    <td>{aposta.esporte}</td>
                    <td>{aposta.jogo}</td>
                    <td>{aposta.mercado}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>{formatCurrency(aposta.valorApostado)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Odd: {aposta.odd}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(aposta)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: 'none',
                          background: getStatusColor(aposta.status).bg,
                          color: getStatusColor(aposta.status).text,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.8';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {getStatusIcon(aposta.status)}
                        {aposta.status}
                      </button>
                    </td>
                    <td>{aposta.retornoObtido != null ? formatCurrency(aposta.retornoObtido) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => handleEditAposta(aposta)}
                          style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                          title="Editar aposta"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => handleDeleteAposta(aposta)}
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '0.875rem',
                            color: 'var(--color-danger)'
                          }}
                          title="Deletar aposta"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg-danger-light)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingAposta ? "Editar Aposta" : "Nova Aposta"}>
        {formNotice && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'var(--color-bg-active)',
              border: '1px solid var(--color-border-nav-active-dark)',
              color: 'var(--color-text-secondary-dark)',
              fontSize: '0.9rem',
              lineHeight: 1.4
            }}
          >
            {formNotice}
          </div>
        )}
        <form onSubmit={handleSubmit} className="filters-panel" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {bancas.length > 0 && (
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Banca *</label>
              <select 
                value={formData.bancaId}
                onChange={(e) => handleFormChange('bancaId', e.target.value)}
                style={{ color: formData.bancaId ? 'var(--text)' : 'var(--muted)' }}
              >
                <option value="" disabled hidden>Selecione uma banca</option>
                {bancas.map((banca) => (
                  <option key={banca.id} value={banca.id}>
                    {banca.nome} {banca.ePadrao ? '(Padrão)' : ''}
                  </option>
                ))}
              </select>
              {formErrors.bancaId && <span className="field-error">{formErrors.bancaId}</span>}
            </div>
          )}
          <div className="field">
            <label>Esporte *</label>
            <select 
              value={formData.esporte}
              onChange={(e) => handleFormChange('esporte', e.target.value)}
              style={{ color: formData.esporte ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled hidden>Selecione uma opção…</option>
              {ESPORTES.map((esporte) => (
                <option key={esporte} value={esporte}>
                  {esporte}
                </option>
              ))}
            </select>
            {formErrors.esporte && <span className="field-error">{formErrors.esporte}</span>}
          </div>
          <div className="field">
            <label>Jogo *</label>
            <input 
              type="text" 
              value={formData.jogo}
              onChange={(e) => handleFormChange('jogo', e.target.value)}
              placeholder="Digite o jogo" 
            />
            {formErrors.jogo && <span className="field-error">{formErrors.jogo}</span>}
          </div>
          <div className="field">
            <label>Torneio</label>
            <input 
              type="text" 
              value={formData.torneio}
              onChange={(e) => handleFormChange('torneio', e.target.value)}
              placeholder="Torneio" 
            />
          </div>
          <div className="field">
            <label>País</label>
            <input 
              type="text" 
              value={formData.pais}
              onChange={(e) => handleFormChange('pais', e.target.value)}
              placeholder="Mundo" 
            />
          </div>
          <div className="field">
            <label>Mercado *</label>
            <input 
              type="text" 
              value={formData.mercado}
              onChange={(e) => handleFormChange('mercado', e.target.value)}
              placeholder="Mercado" 
            />
            {formErrors.mercado && <span className="field-error">{formErrors.mercado}</span>}
          </div>
          <div className="field">
            <label>Tipo de Aposta *</label>
            <select 
              value={formData.tipoAposta}
              onChange={(e) => handleFormChange('tipoAposta', e.target.value)}
              style={{ color: formData.tipoAposta ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled hidden>Selecione o tipo</option>
              {TIPOS_APOSTA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            {formErrors.tipoAposta && <span className="field-error">{formErrors.tipoAposta}</span>}
          </div>
          <div className="field">
            <label>Valor Apostado *</label>
            <input 
              type="number" 
              value={formData.valorApostado}
              onChange={(e) => handleFormChange('valorApostado', e.target.value)}
              placeholder="0" 
              step="0.01"
              min="0.01"
            />
            {formErrors.valorApostado && <span className="field-error">{formErrors.valorApostado}</span>}
          </div>
          <div className="field">
            <label>Odd *</label>
            <input 
              type="number" 
              value={formData.odd}
              onChange={(e) => handleFormChange('odd', e.target.value)}
              placeholder="0" 
              step="0.01"
              min="1.01"
            />
            {formErrors.odd && <span className="field-error">{formErrors.odd}</span>}
          </div>
          <div className="field">
            <label>Bônus</label>
            <input 
              type="number" 
              value={formData.bonus}
              onChange={(e) => handleFormChange('bonus', e.target.value)}
              placeholder="0" 
              step="0.01"
              min="0"
            />
          </div>
          <div className="field">
            <label>Data do Jogo *</label>
            <DateInput
              value={formData.dataJogo}
              onChange={(value) => handleFormChange('dataJogo', value)}
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
                const bankColorValue = root.getPropertyValue('--bank-color').trim();
                const bankColorLightValue = root.getPropertyValue('--bank-color-light').trim();
                const bankColor = bankColorValue === '' ? getComputedStyle(document.documentElement).getPropertyValue('--color-chart-primary').trim() : bankColorValue;
                const bankColorLight = bankColorLightValue === '' ? getComputedStyle(document.documentElement).getPropertyValue('--color-bg-hover').trim() : bankColorLightValue;
                e.target.style.borderColor = bankColor;
                e.target.style.boxShadow = `0 0 0 3px ${bankColorLight}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {formErrors.dataJogo && <span className="field-error">{formErrors.dataJogo}</span>}
          </div>
          <div className="field">
            <label>Tipster</label>
            <select 
              value={formData.tipster}
              onChange={(e) => handleFormChange('tipster', e.target.value)}
              style={{ color: formData.tipster ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled hidden>Selecione…</option>
              {tipsters.filter(t => t.ativo).map((tipster) => (
                <option key={tipster.id} value={tipster.nome}>
                  {tipster.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status *</label>
            <select 
              value={formData.status}
              onChange={(e) => {
                const value = e.target.value;
                handleFormChange('status', value);
                setRetornoManual(false);
                if (!STATUS_WITH_RETURNS.includes(value)) {
                  setFormData(prev => (
                    prev.retornoObtido === '' ? prev : { ...prev, retornoObtido: '' }
                  ));
                }
              }}
              style={{ color: formData.status ? 'var(--text)' : 'var(--muted)' }}
            >
              {STATUS_APOSTAS.filter((status) => status !== 'Tudo').map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Casa de Aposta *</label>
            <select 
              value={formData.casaDeAposta}
              onChange={(e) => handleFormChange('casaDeAposta', e.target.value)}
              style={{ color: formData.casaDeAposta ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled hidden>Selecione uma opção…</option>
              {CASAS_APOSTAS.map((casa) => (
                <option key={casa} value={casa}>
                  {casa}
                </option>
              ))}
            </select>
            {formErrors.casaDeAposta && <span className="field-error">{formErrors.casaDeAposta}</span>}
          </div>
          {STATUS_WITH_RETURNS.includes(formData.status) && (
            <div className="field">
              <label>Retorno Obtido *</label>
              <input 
                type="number" 
                value={formData.retornoObtido}
                onChange={(e) => {
                  const value = e.target.value;
                  setRetornoManual(value !== '');
                  handleFormChange('retornoObtido', value);
                }}
                placeholder="0" 
                step="0.01"
                min="0.01"
              />
              {formErrors.retornoObtido && <span className="field-error">{formErrors.retornoObtido}</span>}
            </div>
          )}
          <button 
            type="submit" 
            className="btn" 
            style={{ gridColumn: 'span 2', justifyContent: 'center' }}
            disabled={saving}
          >
            {saving ? 'Salvando...' : editingAposta ? 'Salvar Alterações' : 'Criar Aposta'}
          </button>
        </form>
      </Modal>

      {/* Modal de Upload */}
      <Modal isOpen={uploadModalOpen} onClose={handleCloseUploadModal} title="Upload de Bilhete">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 600, 
              fontSize: '0.9rem' 
            }}>
              Selecione uma imagem do bilhete de aposta
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              style={{
                display: 'block',
                padding: '20px',
                border: '2px dashed var(--border)',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--card-bg)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-input-focus)';
                e.currentTarget.style.background = 'var(--color-bg-selected)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--card-bg)';
              }}
            >
              {uploadPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  <img 
                    src={uploadPreview} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '300px', 
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }} 
                  />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Clique para selecionar outra imagem
                  </span>
    </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <Upload size={48} style={{ color: 'var(--muted)' }} />
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    Clique para selecionar uma imagem
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    PNG, JPG ou JPEG (máx. 10MB)
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                    ou pressione Ctrl+V para colar
                  </span>
                </div>
              )}
            </label>
          </div>

          {uploadPreview && (
            <>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={handleCloseUploadModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleUpload}
                  disabled={uploading || ocrExtracting}
              >
                  {ocrExtracting ? 'Preparando...' : uploading ? 'Processando...' : 'Processar Bilhete'}
              </button>
            </div>
            </>
          )}
          {uploading && (
            <div style={{ 
              padding: '16px', 
              background: 'var(--color-bg-hover)', 
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--text)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Analisando bilhete com IA...</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={statusModalOpen} onClose={handleCloseStatusModal} title="Atualizar Status">
        <div style={{ padding: '8px 0' }}>
          <p style={{ margin: '0 0 20px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
            {selectedApostaForStatus?.jogo ?? 'Aposta'}
          </p>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 600 }}>Status da Aposta</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '12px' 
            }}>
              {STATUS_APOSTAS.filter(s => s !== 'Tudo').map((status) => {
                const handleStatusClick = () => {
                  const novoRetorno = calcularRetornoObtido(
                    status,
                    selectedApostaForStatus?.valorApostado ?? 0,
                    selectedApostaForStatus?.odd ?? 0
                  );
                  setStatusFormData(prev => ({ 
                    ...prev, 
                    status,
                    retornoObtido: novoRetorno ? novoRetorno.toString() : ''
                  }));
                };
                
                return (
                <button
                  key={status}
                  type="button"
                  onClick={handleStatusClick}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: statusFormData.status === status 
                      ? '2px solid var(--color-border-input-focus)' 
                      : '1px solid var(--border)',
                    background: statusFormData.status === status 
                      ? 'var(--color-bg-hover)' 
                      : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    color: 'var(--text)'
                  }}
                  onMouseEnter={(e) => {
                    if (statusFormData.status !== status) {
                      e.currentTarget.style.background = 'var(--color-bg-selected)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (statusFormData.status !== status) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ 
                    color: getStatusColor(status).bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getStatusIcon(status)}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{status}</span>
                </button>
                );
              })}
            </div>
          </div>

          {(statusFormData.status === 'Ganha' || statusFormData.status === 'Meio Ganha' || statusFormData.status === 'Cashout') && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 600 }}>Valor Resultado</h4>
              <div style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                background: 'var(--color-bg-hover)',
                border: '1px solid var(--color-border-nav-active-dark)',
                marginBottom: '12px'
              }}>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-chart-primary)',
                    textAlign: 'center'
                  }}
                >
                  {formatCurrency(retornoPreview)}
                </div>
                <p style={{ margin: '8px 0 0 0', color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                  {statusFormData.status === 'Cashout' 
                    ? 'Valor calculado automaticamente. Você pode ajustar manualmente abaixo se necessário.'
                    : 'Valor calculado automaticamente baseado no valor apostado e odd'
                  }
                </p>
              </div>
              {statusFormData.status === 'Cashout' && (
                <>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={statusFormData.retornoObtido}
                    onChange={(e) => setStatusFormData(prev => ({ ...prev, retornoObtido: e.target.value }))}
                    placeholder="Ajustar manualmente (opcional)"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '1rem'
                    }}
                  />
                  <p style={{ margin: '8px 0 0 0', color: 'var(--muted)', fontSize: '0.8rem' }}>
                    Deixe vazio para usar o valor calculado automaticamente
                  </p>
                </>
              )}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            marginTop: '24px'
          }}>
            <button
              type="button"
              className="btn secondary"
              onClick={handleCloseStatusModal}
              disabled={updatingStatus}
            >
              Fechar
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Atualizando...' : 'Editar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

