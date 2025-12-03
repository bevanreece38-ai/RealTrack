import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService, apostaService, bancaService, tipsterService, telegramService } from '../services/api';
import { type ApiBetWithBank, type ApiError } from '../types/api';
import { ESPORTES } from '../constants/esportes';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import { TIPOS_APOSTA } from '../constants/tiposAposta';

// Declaração do tipo Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
      };
    };
  }
}

// Função para normalizar o esporte
const normalizeEsporte = (esporteFromDb: string): string => {
  if (!esporteFromDb) return '';
  const normalized = esporteFromDb.toLowerCase().trim();
  const esporteMap: Record<string, string> = {
    'basquete': 'Basquete 🏀',
    'basketball': 'Basquete 🏀',
    'futebol': 'Futsal',
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
  if (esporteMap[normalized]) {
    return esporteMap[normalized];
  }
  const esporteEncontrado = ESPORTES.find(esp => {
    const espNormalized = esp.toLowerCase().replace(/[🏀⚽🏈🎾⚾🏒🏇🥌🎮]/gu, '').trim();
    return espNormalized === normalized || espNormalized.includes(normalized) || normalized.includes(espNormalized);
  });
  return esporteEncontrado ?? esporteFromDb;
};

const getTextWithFallback = (value?: string | null, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed === '' ? fallback : trimmed;
};

export default function TelegramEdit() {
  const [searchParams] = useSearchParams();
  const betId = searchParams.get('betId');
  const messageId = searchParams.get('messageId');
  const chatId = searchParams.get('chatId');
  const [aposta, setAposta] = useState<ApiBetWithBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [bancas, setBancas] = useState<{ id: string; nome: string }[]>([]);
  const [tipsters, setTipsters] = useState<{ id: string; nome: string }[]>([]);

  // Log inicial para debug e garantir que algo apareça
  useEffect(() => {
    console.log('=== TELEGRAM EDIT PAGE LOADED ===');
    console.log('Telegram WebApp:', !!window.Telegram?.WebApp);

    // Garantir que o body tenha estilos básicos
    if (typeof document !== 'undefined') {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.background = '#1a1a1a';
      document.body.style.color = '#ffffff';
      document.body.style.minHeight = '100vh';
    }
  }, [betId]);

  const [formData, setFormData] = useState({
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
    dataJogo: '',
    tipster: '',
    status: 'Pendente',
    casaDeAposta: '',
    retornoObtido: ''
  });

  // Aguardar o carregamento do script do Telegram
  const [telegramReady, setTelegramReady] = useState(false);

  // Aguardar o script do Telegram carregar
  useEffect(() => {
    // Verificar se já está disponível (script no HTML)
    const checkTelegram = () => {
      if (window.Telegram?.WebApp) {
        console.log('✅ Telegram WebApp detectado');
        setTelegramReady(true);
        return true;
      }
      return false;
    };

    // Verificar imediatamente
    if (checkTelegram()) {
      return;
    }

    // Se não estiver disponível, aguardar o script carregar
    let attempts = 0;
    const maxAttempts = 30; // 3 segundos (30 * 100ms)

    const checkInterval = setInterval(() => {
      attempts++;
      if (checkTelegram() || attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (attempts >= maxAttempts && !window.Telegram?.WebApp) {
          console.warn('⚠️ Telegram WebApp não detectado após 3 segundos');
          // Continuar mesmo sem Telegram para permitir desenvolvimento/teste
          setTelegramReady(true);
        }
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  // Autenticar via Telegram Web App
  useEffect(() => {
    if (!telegramReady) return;

    const authenticateTelegram = async () => {
      const telegramWebApp = window.Telegram?.WebApp;
      if (telegramWebApp?.initData) {
        try {
          const data = await authService.telegramAuth(telegramWebApp.initData);
          if (typeof data.token === 'string') {
            localStorage.setItem('token', data.token);
            setAuthenticated(true);
            setLoading(false);
          }
        } catch (err: unknown) {
          console.error('❌ Erro ao autenticar via Telegram:', err);
          setError('Erro ao autenticar. Verifique se sua conta está vinculada ao Telegram.');
          setLoading(false);
        }
      } else {
        // Se não estiver no Telegram, verificar se já está autenticado
        const token = localStorage.getItem('token');
        if (token) {
          setAuthenticated(true);
          setLoading(false);
        } else {
          setError('Você precisa estar logado para editar apostas.');
          setLoading(false);
        }
      }
    };

    void authenticateTelegram();
  }, [telegramReady]);

  // Carregar bancas e tipsters após autenticação
  useEffect(() => {
    if (authenticated) {
      const loadData = async () => {
        try {
          const [bancasData, tipstersData] = await Promise.all([
            bancaService.getAll().catch(() => []),
            tipsterService.getAll().catch(() => [])
          ]);
          setBancas(Array.isArray(bancasData) ? bancasData : []);
          setTipsters(Array.isArray(tipstersData) ? tipstersData : []);
        } catch (err) {
          console.warn('Erro ao carregar bancas/tipsters:', err);
        }
      };
      void loadData();
    }
  }, [authenticated]);

  const fetchAposta = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apostaService.getAll();
      const apostasArray = response.apostas;
      const apostaEncontrada = apostasArray.find(a => a.id === betId);
      if (apostaEncontrada) {
        setAposta(apostaEncontrada);
        const dataJogo = new Date(apostaEncontrada.dataJogo).toISOString().split('T')[0];
        const esporteNormalizado = normalizeEsporte(apostaEncontrada.esporte);
        const paisNormalizado = getTextWithFallback(apostaEncontrada.pais, 'Mundo');
        const torneioNormalizado = getTextWithFallback(apostaEncontrada.torneio);
        const tipsterNormalizado = getTextWithFallback(apostaEncontrada.tipster);
        const casaNormalizada = getTextWithFallback(apostaEncontrada.casaDeAposta);
        const retornoNumero = apostaEncontrada.retornoObtido;
        const retornoObtido = Number.isFinite(retornoNumero) ? retornoNumero.toString() : '';
        setFormData({
          bancaId: apostaEncontrada.bancaId,
          esporte: esporteNormalizado,
          jogo: apostaEncontrada.jogo,
          torneio: torneioNormalizado,
          pais: paisNormalizado,
          mercado: apostaEncontrada.mercado,
          tipoAposta: apostaEncontrada.tipoAposta,
          valorApostado: apostaEncontrada.valorApostado.toString(),
          odd: apostaEncontrada.odd.toString(),
          bonus: apostaEncontrada.bonus.toString(),
          dataJogo,
          tipster: tipsterNormalizado,
          status: apostaEncontrada.status,
          casaDeAposta: casaNormalizada,
          retornoObtido: retornoObtido
        });
      } else {
        setError('Aposta não encontrada');
      }
    } catch (err) {
      console.error('Erro ao buscar aposta:', err);
      setError('Erro ao carregar aposta');
    } finally {
      setLoading(false);
    }
  }, [betId]);

  useEffect(() => {
    if (betId && authenticated) {
      void fetchAposta();
    }
  }, [betId, authenticated, fetchAposta]);


  const handleSave = useCallback(async () => {
    if (!betId || !aposta) return;

    // Prevenir múltiplas chamadas simultâneas
    if (saving) {
      console.warn('Salvamento já em andamento, ignorando chamada duplicada');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Validar campos obrigatórios
      const esporte = formData.esporte.trim();
      const jogo = formData.jogo.trim();
      const mercado = formData.mercado.trim();
      const tipoAposta = formData.tipoAposta.trim();
      const casaDeAposta = formData.casaDeAposta.trim();
      const valorApostado = parseFloat(formData.valorApostado);
      const odd = parseFloat(formData.odd);
      const bonus = parseFloat(formData.bonus) || 0;

      if (!esporte || !jogo || !mercado || !tipoAposta || !casaDeAposta) {
        setError('Preencha todos os campos obrigatórios');
        setSaving(false);
        return;
      }

      if (isNaN(valorApostado) || valorApostado <= 0) {
        setError('Valor apostado deve ser um número positivo');
        setSaving(false);
        return;
      }

      if (isNaN(odd) || odd <= 0) {
        setError('Odd deve ser um número positivo');
        setSaving(false);
        return;
      }

      // Formatar dataJogo corretamente (ISO 8601 com timezone)
      let dataJogoISO: string | undefined;
      if (formData.dataJogo) {
        const dataJogoDate = new Date(`${formData.dataJogo}T00:00:00`);
        if (!isNaN(dataJogoDate.getTime())) {
          dataJogoISO = dataJogoDate.toISOString();
        }
      }

      const payload: Record<string, unknown> = {
        bancaId: formData.bancaId,
        esporte,
        jogo,
        mercado,
        tipoAposta,
        valorApostado,
        odd,
        bonus,
        casaDeAposta,
        status: formData.status
      };

      // Adicionar campos opcionais apenas se tiverem valor
      const torneio = formData.torneio.trim();
      if (torneio) {
        payload.torneio = torneio;
      }

      const pais = formData.pais.trim();
      if (pais) {
        payload.pais = pais;
      }

      if (dataJogoISO) {
        payload.dataJogo = dataJogoISO;
      }

      const tipster = formData.tipster.trim();
      if (tipster) {
        payload.tipster = tipster;
      }

      if (formData.retornoObtido) {
        const retornoObtido = parseFloat(formData.retornoObtido);
        if (!isNaN(retornoObtido)) {
          payload.retornoObtido = retornoObtido;
        }
      }

      await apostaService.update(betId, payload);

      // Atualizar mensagem do Telegram se messageId e chatId estiverem disponíveis
      if (messageId && chatId) {
        void telegramService.updateBetMessage(betId, messageId, chatId).catch((err: unknown) => {
          console.warn('Erro ao atualizar mensagem do Telegram:', err);
        });
      }

      // Disparar evento para atualizar a página principal que mostra as apostas
      window.dispatchEvent(new Event('apostas-updated'));

      // Fechar a janela sem enviar dados para evitar mensagem do Telegram
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.close();
      } else {
        // Se não estiver no Telegram, apenas fechar
        window.close();
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao salvar aposta');
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.MainButton.hideProgress();
      }
    } finally {
      setSaving(false);
    }
  }, [betId, aposta, formData, saving, messageId, chatId]);

  // Configurar Telegram WebApp após handleSave estar definido
  useEffect(() => {
    if (authenticated && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.MainButton.setText('Salvar Alterações');
      window.Telegram.WebApp.MainButton.show();
      window.Telegram.WebApp.MainButton.onClick(() => void handleSave());
    }
  }, [authenticated, handleSave]);

  // SEMPRE renderizar algo - nunca deixar tela preta
  // Mostrar loading ou erro com estilos inline para garantir que apareça
  if (!authenticated || loading) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-5 text-center text-foreground">
        <div className="h-10 w-10 rounded-full border-4 border-border/60 border-t-brand-emerald animate-spin" />
        <p className="text-base font-medium text-foreground">
          {!authenticated ? 'Autenticando...' : 'Carregando aposta...'}
        </p>
        {betId && <p className="text-xs text-foreground-muted">Bet ID: {betId}</p>}
      </div>
    );
  }

  if (error && !aposta) {
    console.log('Renderizando tela de erro:', error);
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center text-foreground">
        <p className="mb-2 text-base font-semibold text-danger">❌ {error}</p>
        {betId && <p className="text-sm text-foreground-muted">Bet ID: {betId}</p>}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-brand-emerald px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  console.log('Renderizando formulário de edição');

  const inputClasses = 'w-full rounded-lg border border-border/60 bg-background px-3 py-3 text-base text-foreground shadow-sm focus:border-brand-emerald focus:outline-none focus:ring-2 focus:ring-brand-emerald/30';

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground">
      <h2 className="mb-6 text-2xl font-semibold">✏️ Editar Aposta</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/90 px-4 py-3 text-sm font-medium text-white">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Banca *</label>
          <select
            value={formData.bancaId}
            onChange={(e) => setFormData({ ...formData, bancaId: e.target.value })}
            className={inputClasses}
          >
            <option value="">Selecione uma banca</option>
            {bancas.map(banca => (
              <option key={banca.id} value={banca.id}>{banca.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Esporte *</label>
          <select
            value={formData.esporte}
            onChange={(e) => setFormData({ ...formData, esporte: e.target.value })}
            className={inputClasses}
          >
            <option value="">Selecione um esporte</option>
            {ESPORTES.map(esporte => (
              <option key={esporte} value={esporte}>{esporte}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Jogo *</label>
          <input
            type="text"
            value={formData.jogo}
            onChange={(e) => setFormData({ ...formData, jogo: e.target.value })}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Torneio</label>
          <input
            type="text"
            value={formData.torneio}
            onChange={(e) => setFormData({ ...formData, torneio: e.target.value })}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">País</label>
          <input
            type="text"
            value={formData.pais}
            onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Mercado *</label>
          <input
            type="text"
            value={formData.mercado}
            onChange={(e) => setFormData({ ...formData, mercado: e.target.value })}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Tipo de Aposta *</label>
          <select
            value={formData.tipoAposta}
            onChange={(e) => setFormData({ ...formData, tipoAposta: e.target.value })}
            className={inputClasses}
          >
            <option value="">Selecione um tipo</option>
            {TIPOS_APOSTA.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Valor Apostado *</label>
            <input
              type="number"
              step="0.01"
              value={formData.valorApostado}
              onChange={(e) => setFormData({ ...formData, valorApostado: e.target.value })}
              className={inputClasses}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Odd *</label>
            <input
              type="number"
              step="0.01"
              value={formData.odd}
              onChange={(e) => setFormData({ ...formData, odd: e.target.value })}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Data do Jogo *</label>
          <input
            type="date"
            value={formData.dataJogo}
            onChange={(e) => setFormData({ ...formData, dataJogo: e.target.value })}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Casa de Apostas *</label>
          <select
            value={formData.casaDeAposta}
            onChange={(e) => setFormData({ ...formData, casaDeAposta: e.target.value })}
            className={inputClasses}
          >
            <option value="">Selecione uma casa</option>
            {CASAS_APOSTAS.map(casa => (
              <option key={casa} value={casa}>{casa}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Tipster</label>
          <select
            value={formData.tipster}
            onChange={(e) => setFormData({ ...formData, tipster: e.target.value })}
            className={inputClasses}
          >
            <option value="">Nenhum</option>
            {tipsters.map(tipster => (
              <option key={tipster.id} value={tipster.nome}>{tipster.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Status *</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className={inputClasses}
          >
            {STATUS_APOSTAS.filter(s => s !== 'Tudo').map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {(formData.status === 'Ganha' || formData.status === 'Meio Ganha' || formData.status === 'Cashout') && (
          <div>
            <label className="mb-2 block text-sm font-medium">Retorno Obtido</label>
            <input
              type="number"
              step="0.01"
              value={formData.retornoObtido}
              onChange={(e) => setFormData({ ...formData, retornoObtido: e.target.value })}
              className={inputClasses}
            />
          </div>
        )}
      </div>

      {!window.Telegram?.WebApp && (
        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-6 w-full rounded-lg px-5 py-4 text-base font-semibold text-white transition-colors ${saving
            ? 'cursor-not-allowed bg-foreground-muted'
            : 'bg-brand-emerald hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-emerald'}`}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      )}
    </div>
  );
}

