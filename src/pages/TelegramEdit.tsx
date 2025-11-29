import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../index.css';
import api from '../lib/api';
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
          const { data } = await api.post<{ token?: string }>('/auth/telegram', {
            initData: telegramWebApp.initData
          });
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
          const [bancasRes, tipstersRes] = await Promise.all([
            api.get('/bancas').catch(() => ({ data: [] })),
            api.get('/tipsters').catch(() => ({ data: [] }))
          ]);
          setBancas(Array.isArray(bancasRes.data) ? bancasRes.data : []);
          setTipsters(Array.isArray(tipstersRes.data) ? tipstersRes.data : []);
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
      const { data: apostas } = await api.get<ApiBetWithBank[]>('/apostas');
      const apostaEncontrada = apostas.find(a => a.id === betId);
      if (apostaEncontrada) {
        setAposta(apostaEncontrada);
        const dataJogo = new Date(apostaEncontrada.dataJogo).toISOString().split('T')[0];
        const esporteNormalizado = normalizeEsporte(apostaEncontrada.esporte);
        setFormData({
          bancaId: apostaEncontrada.bancaId,
          esporte: esporteNormalizado,
          jogo: apostaEncontrada.jogo,
          torneio: apostaEncontrada.torneio ?? '',
          pais: apostaEncontrada.pais ?? 'Mundo',
          mercado: apostaEncontrada.mercado,
          tipoAposta: apostaEncontrada.tipoAposta,
          valorApostado: apostaEncontrada.valorApostado.toString(),
          odd: apostaEncontrada.odd.toString(),
          bonus: apostaEncontrada.bonus.toString(),
          dataJogo,
          tipster: apostaEncontrada.tipster ?? '',
          status: apostaEncontrada.status,
          casaDeAposta: apostaEncontrada.casaDeAposta,
          retornoObtido: apostaEncontrada.retornoObtido != null ? apostaEncontrada.retornoObtido.toString() : ''
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

      await api.put(`/apostas/${betId}`, payload);

      // Atualizar mensagem do Telegram se messageId e chatId estiverem disponíveis
      if (messageId && chatId) {
        void api.post(`/telegram/update-bet-message/${betId}`, {
          messageId,
          chatId
        }).catch((err: unknown) => {
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
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#ffffff',
        background: '#1a1a1a',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #333',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <p style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
          {!authenticated ? 'Autenticando...' : 'Carregando aposta...'}
        </p>
        {betId && (
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#888' }}>
            Bet ID: {betId}
          </p>
        )}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !aposta) {
    console.log('Renderizando tela de erro:', error);
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#ef4444',
        background: '#1a1a1a',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '16px', marginBottom: '16px', color: '#ef4444' }}>❌ {error}</p>
          {betId && (
            <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>
              Bet ID: {betId}
            </p>
          )}
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  console.log('Renderizando formulário de edição');
  
  return (
    <div style={{
      padding: '16px',
      background: '#1a1a1a',
      color: '#ffffff',
      minHeight: '100vh',
      width: '100%',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>
        ✏️ Editar Aposta
      </h2>

      {error && (
        <div style={{
          padding: '12px',
          background: '#ef4444',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Banca *</label>
          <select
            value={formData.bancaId}
            onChange={(e) => setFormData({ ...formData, bancaId: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            <option value="">Selecione uma banca</option>
            {bancas.map(banca => (
              <option key={banca.id} value={banca.id}>{banca.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Esporte *</label>
          <select
            value={formData.esporte}
            onChange={(e) => setFormData({ ...formData, esporte: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            <option value="">Selecione um esporte</option>
            {ESPORTES.map(esporte => (
              <option key={esporte} value={esporte}>{esporte}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Jogo *</label>
          <input
            type="text"
            value={formData.jogo}
            onChange={(e) => setFormData({ ...formData, jogo: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Torneio</label>
          <input
            type="text"
            value={formData.torneio}
            onChange={(e) => setFormData({ ...formData, torneio: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>País</label>
          <input
            type="text"
            value={formData.pais}
            onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Mercado *</label>
          <input
            type="text"
            value={formData.mercado}
            onChange={(e) => setFormData({ ...formData, mercado: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tipo de Aposta *</label>
          <select
            value={formData.tipoAposta}
            onChange={(e) => setFormData({ ...formData, tipoAposta: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            <option value="">Selecione um tipo</option>
            {TIPOS_APOSTA.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Valor Apostado *</label>
            <input
              type="number"
              step="0.01"
              value={formData.valorApostado}
              onChange={(e) => setFormData({ ...formData, valorApostado: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#2a2a2a',
                color: '#ffffff',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Odd *</label>
            <input
              type="number"
              step="0.01"
              value={formData.odd}
              onChange={(e) => setFormData({ ...formData, odd: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#2a2a2a',
                color: '#ffffff',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Data do Jogo *</label>
          <input
            type="date"
            value={formData.dataJogo}
            onChange={(e) => setFormData({ ...formData, dataJogo: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Casa de Apostas *</label>
          <select
            value={formData.casaDeAposta}
            onChange={(e) => setFormData({ ...formData, casaDeAposta: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            <option value="">Selecione uma casa</option>
            {CASAS_APOSTAS.map(casa => (
              <option key={casa} value={casa}>{casa}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tipster</label>
          <select
            value={formData.tipster}
            onChange={(e) => setFormData({ ...formData, tipster: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            <option value="">Nenhum</option>
            {tipsters.map(tipster => (
              <option key={tipster.id} value={tipster.nome}>{tipster.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Status *</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            {STATUS_APOSTAS.filter(s => s !== 'Tudo').map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {(formData.status === 'Ganha' || formData.status === 'Meio Ganha' || formData.status === 'Cashout') && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Retorno Obtido</label>
            <input
              type="number"
              step="0.01"
              value={formData.retornoObtido}
              onChange={(e) => setFormData({ ...formData, retornoObtido: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#2a2a2a',
                color: '#ffffff',
                fontSize: '16px'
              }}
            />
          </div>
        )}
      </div>

      {!window.Telegram?.WebApp && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '16px',
            background: saving ? '#666' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      )}
    </div>
  );
}

