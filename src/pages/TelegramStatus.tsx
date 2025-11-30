import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../index.css';
import api from '../lib/api';
import { type ApiBetWithBank, type ApiError } from '../types/api';
import { STATUS_APOSTAS } from '../constants/statusApostas';

const STATUS_WITH_RETURNS = ['Ganha', 'Meio Ganha', 'Cashout'];

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        MainButton: {
          text: string;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
      };
    };
  }
}

export default function TelegramStatus() {
  const [searchParams] = useSearchParams();
  const betId = searchParams.get('betId');
  const messageId = searchParams.get('messageId');
  const chatId = searchParams.get('chatId');
  const [aposta, setAposta] = useState<ApiBetWithBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [retornoObtido, setRetornoObtido] = useState('');

  const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
  const [authenticated, setAuthenticated] = useState(false);

  // Autenticar via Telegram Web App
  useEffect(() => {
    const authenticateTelegram = async () => {
      const webapp = window.Telegram?.WebApp;
      if (isTelegram && webapp?.initData) {
        try {
          const { data } = await api.post<{ token?: string }>('/auth/telegram', {
            initData: webapp.initData
          });
          if (typeof data.token === 'string') {
            localStorage.setItem('token', data.token);
            setAuthenticated(true);
          }
        } catch (err: unknown) {
          console.error('Erro ao autenticar via Telegram:', err);
          setError('Erro ao autenticar. Verifique se sua conta está vinculada ao Telegram.');
        }
      } else {
        // Se não estiver no Telegram, verificar se já está autenticado
        const token = localStorage.getItem('token');
        if (token) {
          setAuthenticated(true);
        } else {
          setError('Você precisa estar logado para alterar o status.');
        }
      }
    };

    void authenticateTelegram();
  }, [isTelegram]);

  const fetchAposta = useCallback(async () => {
    try {
      setLoading(true);
      const { data: apostas } = await api.get<ApiBetWithBank[]>('/apostas');
      const apostaEncontrada = apostas.find(a => a.id === betId);
      if (apostaEncontrada) {
        setAposta(apostaEncontrada);
        setStatus(apostaEncontrada.status);
        setRetornoObtido(apostaEncontrada.retornoObtido != null ? apostaEncontrada.retornoObtido.toString() : '');
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

      const payload: { status: string; retornoObtido?: number | null } = {
        status: status
      };

      if (STATUS_WITH_RETURNS.includes(status) && retornoObtido) {
        payload.retornoObtido = parseFloat(retornoObtido);
      } else if (!STATUS_WITH_RETURNS.includes(status)) {
        payload.retornoObtido = null;
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
      if (isTelegram) {
        window.Telegram.WebApp.close();
      } else {
        window.close();
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao salvar status');
      if (isTelegram) {
        window.Telegram.WebApp.MainButton.hideProgress();
      }
    } finally {
      setSaving(false);
    }
  }, [betId, aposta, status, retornoObtido, isTelegram, saving, messageId, chatId]);

  useEffect(() => {
    if (isTelegram && authenticated) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.MainButton.setText('Salvar Status');
      window.Telegram.WebApp.MainButton.show();
      window.Telegram.WebApp.MainButton.onClick(() => void handleSave());
    }
  }, [isTelegram, authenticated, handleSave]);

  if (!authenticated || loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text)' }}>
        <p>{!authenticated ? 'Autenticando...' : 'Carregando...'}</p>
      </div>
    );
  }

  if (error && !aposta) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-danger)' }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg)',
      color: 'var(--text)',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>
        📚 Alterar Status
      </h2>

      {aposta && (
        <div style={{
          padding: '16px',
          background: 'var(--card-bg)',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid var(--border)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Jogo: {aposta.jogo}</p>
          <p style={{ margin: '0 0 8px 0', color: 'var(--muted)' }}>Esporte: {aposta.esporte}</p>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Valor: R$ {aposta.valorApostado.toFixed(2)} | Odd: {aposta.odd}</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          background: 'var(--color-danger)',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Status *</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              if (!STATUS_WITH_RETURNS.includes(e.target.value)) {
                setRetornoObtido('');
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: '16px'
            }}
          >
            {STATUS_APOSTAS.filter(s => s !== 'Tudo').map(statusOption => (
              <option key={statusOption} value={statusOption}>{statusOption}</option>
            ))}
          </select>
        </div>

        {STATUS_WITH_RETURNS.includes(status) && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Retorno Obtido *</label>
            <input
              type="number"
              step="0.01"
              value={retornoObtido}
              onChange={(e) => setRetornoObtido(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                fontSize: '16px'
              }}
            />
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--muted)' }}>
              Valor recebido após a aposta ser concluída
            </p>
          </div>
        )}
      </div>

      {!isTelegram && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '16px',
            background: saving ? 'var(--muted)' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Salvando...' : 'Salvar Status'}
        </button>
      )}
    </div>
  );
}

