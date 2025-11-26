import {
  BarChart2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Layers,
  Loader2,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  User2,
  Wallet2,
  Users,
  X
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';
import Modal from './Modal';
import { useTheme } from '../contexts/ThemeContext';
import { BANK_COLOR_PALETTE, DEFAULT_BANK_COLOR, normalizeColor, applyColorTheme } from '../utils/colors';
import { getFirstName } from '../utils/formatters';
import type { ApiProfileResponse } from '../types/api';

const navItems = [
  { label: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Bancas', path: '/bancas', icon: Layers },
  { label: 'Financeiro', path: '/financeiro', icon: Wallet2 },
  { label: 'Gráficos', path: '/analise', icon: BarChart2 },
  { label: 'Apostas', path: '/atualizar', icon: RefreshCw },
  { label: 'Tipsters', path: '/tipsters', icon: Users },
  { label: 'Perfil', path: '/perfil', icon: User2 }
];

interface SidebarBanco {
  id: string;
  nome: string;
  descricao: string;
  status: string;
  cor: string;
}

interface SidebarBancoApi {
  id?: string | null;
  nome?: string | null;
  descricao?: string | null;
  status?: string | null;
  cor?: string | null;
  ePadrao?: boolean | null;
}

interface ConsumoPlanoState {
  plano: { nome: string; limiteDiario: number };
  consumo: { apostasHoje: number; limite: number; porcentagem: number; proximoReset: string | null };
}

interface ConsumoPlanoApi {
  plano?: {
    nome?: string | null;
    limiteDiario?: number | null;
  };
  consumo?: {
    apostasHoje?: number | null;
    limite?: number | null;
    porcentagem?: number | null;
    proximoReset?: string | null;
  };
}

interface CreateBancoPayload {
  nome: string;
  cor: string;
  descricao?: string;
}

interface CreateBancoResponse {
  id?: string | null;
  nome?: string | null;
  descricao?: string | null;
  status?: string | null;
  cor?: string | null;
  ePadrao?: boolean | null;
}

interface BancaUpdatedDetail {
  id?: string;
  cor?: string;
}

const DEFAULT_BANCA_DESCRIPTION = 'Banca sem descrição.';

const mapSidebarBanco = (
  item: SidebarBancoApi,
  index: number,
  requestedColor?: string
): SidebarBanco => ({
  id: item.id ?? `banca-${index}`,
  nome: item.nome ?? 'Banca',
  descricao: item.descricao ?? DEFAULT_BANCA_DESCRIPTION,
  status: item.status ?? 'Ativa',
  cor: normalizeColor(
    item.cor ?? requestedColor,
    BANK_COLOR_PALETTE[index % BANK_COLOR_PALETTE.length]
  ),
});

const mapConsumoPlano = (data: ConsumoPlanoApi): ConsumoPlanoState => ({
  plano: {
    nome: data.plano?.nome ?? 'Plano',
    limiteDiario: data.plano?.limiteDiario ?? 0,
  },
  consumo: {
    apostasHoje: data.consumo?.apostasHoje ?? 0,
    limite: data.consumo?.limite ?? 0,
    porcentagem: data.consumo?.porcentagem ?? 0,
    proximoReset: data.consumo?.proximoReset ?? null,
  },
});

export default function Layout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [bancas, setBancas] = useState<SidebarBanco[]>([]);
  const [selectedBanco, setSelectedBanco] = useState<SidebarBanco | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    nome: '',
    descricao: '',
    saldo: '',
    cor: BANK_COLOR_PALETTE[0]
  });
  const [consumoPlano, setConsumoPlano] = useState<ConsumoPlanoState | null>(null);
  const [loadingConsumo, setLoadingConsumo] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<ApiProfileResponse | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Fechar seletor quando sidebar for recolhida
  useEffect(() => {
    if (sidebarCollapsed) {
      setSelectorOpen(false);
    }
  }, [sidebarCollapsed]);

  const fetchBancas = useCallback(async () => {
    try {
      const { data } = await api.get<SidebarBancoApi[]>('/bancas');
      if (!Array.isArray(data) || data.length === 0) {
        setBancas([]);
        setSelectedBanco(null);
        return;
      }

      const formatted = data.map((item, index) => mapSidebarBanco(item, index));
      if (formatted.length === 0) {
        setBancas([]);
        setSelectedBanco(null);
        return;
      }
      setBancas(formatted);
      setSelectedBanco((prev) => {
        if (prev) {
          const updated = formatted.find((banca) => banca.id === prev.id);
          return updated ?? formatted[0];
        }
        return formatted[0];
      });
    } catch (error) {
      console.warn('Não foi possível carregar bancas para o seletor.', error);
      setBancas([]);
      setSelectedBanco(null);
    }
  }, []);

  useEffect(() => {
    void fetchBancas();
  }, [fetchBancas]);

  // Ouvir eventos de atualização de banca de outras páginas
  const handleBancaUpdated = useCallback(
    (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<BancaUpdatedDetail | undefined>;
      const detail = event.detail;

      if (detail?.id && typeof detail.cor === 'string' && selectedBanco?.id === detail.id) {
        setSelectedBanco((prev) => (prev ? { ...prev, cor: detail.cor! } : null));
      }

      void fetchBancas();
    },
    [fetchBancas, selectedBanco?.id]
  );

  useEffect(() => {
    window.addEventListener('banca-updated', handleBancaUpdated as EventListener);
    return () => {
      window.removeEventListener('banca-updated', handleBancaUpdated as EventListener);
    };
  }, [handleBancaUpdated]);

  // Aplicar cor da banca selecionada como tema secundário
  useEffect(() => {
    const accentColor = selectedBanco?.cor;
    if (accentColor) {
      applyColorTheme(accentColor);
    } else {
      // Se não houver banca selecionada, usar cor padrão
      applyColorTheme(DEFAULT_BANK_COLOR);
    }
  }, [selectedBanco?.cor, selectedBanco?.id]);

  const fetchConsumoPlano = useCallback(async () => {
    try {
      setLoadingConsumo(true);
      const { data } = await api.get<ConsumoPlanoApi | null>('/perfil/consumo');
      setConsumoPlano(data ? mapConsumoPlano(data) : null);
    } catch (error) {
      console.warn('Não foi possível carregar consumo do plano.', error);
    } finally {
      setLoadingConsumo(false);
    }
  }, []);

  useEffect(() => {
    void fetchConsumoPlano();

    // Aumentar intervalo para 5 minutos para reduzir requisições
    const interval = window.setInterval(() => {
      void fetchConsumoPlano();
    }, 300000); // 5 minutos em vez de 1 minuto

    return () => window.clearInterval(interval);
  }, [fetchConsumoPlano]);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get<ApiProfileResponse>('/perfil');
      console.log('Perfil carregado:', data);
      setProfile(data);
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      // Se houver erro de autenticação, redirecionar para login
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 401) {
        localStorage.removeItem('token');
        void navigate('/login');
      }
    }
  }, [navigate]);

  useEffect(() => {
    void fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar o componente

  // Ouvir eventos de atualização de perfil
  const handleProfileUpdated = useCallback(
    (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<ApiProfileResponse | undefined>;
      const updatedProfile = event.detail;
      if (updatedProfile) {
        setProfile(updatedProfile);
      } else {
        // Se não recebeu os dados, recarregar do servidor
        void fetchProfile();
      }
    },
    [fetchProfile]
  );

  useEffect(() => {
    window.addEventListener('profile-updated', handleProfileUpdated as EventListener);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated as EventListener);
    };
  }, [handleProfileUpdated]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateBanco = async () => {
    if (!createForm.nome.trim()) {
      setCreateError('Nome é obrigatório');
      return;
    }
    setCreateError('');
    setCreating(true);

    const payload: CreateBancoPayload = {
      nome: createForm.nome.trim(),
      cor: normalizeColor(createForm.cor, DEFAULT_BANK_COLOR)
    };
    
    if (createForm.descricao.trim()) {
      payload.descricao = createForm.descricao.trim();
    }

    try {
      const { data } = await api.post<CreateBancoResponse>('/bancas', payload);
      const newBanco = mapSidebarBanco(
        {
          id: data.id ?? undefined,
          nome: data.nome ?? payload.nome,
          descricao: data.descricao ?? payload.descricao ?? DEFAULT_BANCA_DESCRIPTION,
          status: data.status ?? 'Ativa',
          cor: data.cor ?? payload.cor,
        },
        bancas.length,
        payload.cor
      );

      setBancas((prev) => [...prev, newBanco]);
      setSelectedBanco(newBanco);
      setCreateModal(false);
      setCreateForm({ nome: '', descricao: '', saldo: '', cor: BANK_COLOR_PALETTE[0] });
      // Disparar evento para garantir que a cor seja aplicada
      window.dispatchEvent(new CustomEvent('banca-updated', { detail: { id: newBanco.id, cor: newBanco.cor } }));
      void navigate('/bancas');
    } catch (error: unknown) {
      console.error('Não foi possível criar a banca.', error);
      const apiError = error as { response?: { data?: { error?: unknown } }; message?: string };
      const errorPayload = apiError.response?.data?.error;
      const errorMessage =
        (typeof errorPayload === 'string' ? errorPayload : undefined) ??
        apiError.message ??
        'Não foi possível criar a banca. Tente novamente.';
      setCreateError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Botão hambúrguer para mobile */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Abrir menu"
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop para mobile */}
      {mobileMenuOpen && (
        <div 
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="sidebar-wrapper">
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">RC</div>
          <div>
            <h1>Real Comando</h1>
          </div>
          <button 
            className="theme-toggle" 
            onClick={() => {
              toggleTheme();
              // Não fechar o menu no mobile ao alternar tema, pois é um botão pequeno
            }} 
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="plan-selection" ref={selectorRef}>
          <button 
            className="plan-status" 
            onClick={() => !sidebarCollapsed && setSelectorOpen((prev) => !prev)}
            disabled={sidebarCollapsed}
          >
            <div className="status-badge">
              <span className="status-dot" style={{ background: selectedBanco?.cor ?? DEFAULT_BANK_COLOR }} />
              <div>
                <p className="plan-title">{selectedBanco?.nome ?? 'Selecione uma banca'}</p>
                <p className="plan-desc">{selectedBanco?.descricao}</p>
              </div>
            </div>
            {!sidebarCollapsed && <ChevronDown size={16} />}
          </button>

          {selectorOpen && !sidebarCollapsed && (
            <div className="plan-popover">
              <p className="plan-popover-title">Bancas Ativas</p>
              <div className="plan-list">
                {bancas.map((banca) => (
                  <button
                    key={banca.id}
                    type="button"
                    className={`plan-item ${selectedBanco?.id === banca.id ? 'active' : ''}`}
                  onClick={() => {
                      setSelectedBanco(banca);
                      setSelectorOpen(false);
                      setMobileMenuOpen(false);
                      // Recarregar bancas para garantir que a cor está atualizada
                      void fetchBancas();
                    }}
                  >
                    <span className="plan-item-dot" style={{ background: banca.cor }} />
                    <span className="plan-item-text">
                      <strong>{banca.nome}</strong>
                      <small>{banca.descricao}</small>
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="plan-new"
                onClick={() => {
                  setSelectorOpen(false);
                  setCreateError('');
                  setCreateForm({ nome: '', descricao: '', saldo: '', cor: BANK_COLOR_PALETTE[0] });
                  setCreateModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                <span>+</span> Nova Banca
              </button>
            </div>
          )}
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <item.icon size={16} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {loadingConsumo ? (
          <div className="plan-card compact loading-skeleton">
            <div style={{ marginBottom: '12px' }}>
              <p className="plan-card-title">PLANO</p>
              <p className="plan-card-sub">Limite Diário</p>
            </div>
            <div className="plan-card-value" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={20} className="loading-spinner" />
              </div>
              <div className="plan-pill" style={{ 
                opacity: 0.5,
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.25) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '6px 12px',
                borderRadius: '10px'
              }}>
                <Clock size={13} />
              </div>
            </div>
            <div className="progress-track thick" style={{
              marginBottom: '10px',
              borderRadius: '10px',
              overflow: 'hidden',
              height: '6px',
              background: 'rgba(139, 92, 246, 0.1)'
            }}>
              <div className="progress-fill loading-progress" />
            </div>
            <div className="plan-hints" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              opacity: 0.5
            }}>
              <RefreshCw size={12} />
              <span>Reseta todo dia às 00:00</span>
            </div>
          </div>
        ) : consumoPlano ? (
          <div className="plan-card compact">
            <div style={{ marginBottom: '12px' }}>
              <p className="plan-card-title">PLANO</p>
              <p className="plan-card-sub">Limite Diário</p>
            </div>
            <div className="plan-card-value" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'baseline', 
                gap: '6px',
                flex: 1
              }}>
                <strong style={{ 
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>{consumoPlano.consumo.apostasHoje}</strong>
                <span style={{ 
                  fontSize: '0.9rem',
                  opacity: 0.7,
                  fontWeight: 500
                }}>de {consumoPlano.consumo.limite}</span>
              </div>
              <div className="plan-pill" style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.25) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '6px 12px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#a78bfa',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <Clock size={13} style={{ opacity: 0.9 }} />
                {profile?.plano.nome || consumoPlano.plano.nome || 'Plano'}
              </div>
            </div>
            <div className="progress-track thick" style={{
              marginBottom: '10px',
              borderRadius: '10px',
              overflow: 'hidden',
              height: '6px',
              background: 'rgba(139, 92, 246, 0.1)'
            }}>
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min(consumoPlano.consumo.porcentagem, 100)}%`,
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)',
                  height: '100%',
                  borderRadius: '10px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)'
                }} 
              />
            </div>
            <div className="plan-hints" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              color: 'var(--muted)',
              opacity: 0.8
            }}>
              <RefreshCw size={12} style={{ opacity: 0.6 }} />
              <span>Reseta todo dia às 00:00</span>
            </div>
          </div>
        ) : null}

        <div className="profile-box">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '10px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.35) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <User2 size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ 
                margin: 0, 
                fontWeight: 700, 
                fontSize: '0.95rem',
                color: 'var(--text)',
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {profile ? getFirstName(profile.nomeCompleto) : (
                  <Loader2 size={14} className="loading-spinner" style={{ display: 'inline-block' }} />
                )}
              </p>
              <p style={{ 
                margin: '4px 0 0', 
                color: 'var(--muted)', 
                fontSize: '0.75rem',
                opacity: 0.8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {profile?.email ? (
                  profile.email
                ) : (
                  <Loader2 size={12} className="loading-spinner" style={{ display: 'inline-block' }} />
                )}
              </p>
            </div>
          </div>
          <button 
            className="btn ghost" 
            style={{ 
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.12) 100%)',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.2) 100%)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.12) 100%)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => {
              localStorage.removeItem('token');
              setMobileMenuOpen(false);
              void navigate('/login');
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
      </div>

      <div className="app-main">
        <main className="app-body">
          <Outlet />
        </main>
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Criar Nova Banca">
        <div className="edit-banca-form">
          <div className="field">
            <label>Nome da Banca</label>
            <input
              placeholder="Ex: Banca Conservadora"
              value={createForm.nome}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nome: e.target.value }))}
            />
            {createError && <span className="field-error">{createError}</span>}
          </div>
          <div className="field">
            <label>Descrição (opcional)</label>
            <textarea
              placeholder="Descreva o propósito desta banca..."
              rows={3}
              value={createForm.descricao}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, descricao: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Saldo Inicial</label>
            <input
              value={createForm.saldo}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, saldo: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label>Cor da Banca</label>
            <div className="color-grid">
              {BANK_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${createForm.cor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setCreateForm((prev) => ({ ...prev, cor: color }))}
                />
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={() => setCreateModal(false)}>
              Cancelar
            </button>
            <button type="button" className="btn" onClick={handleCreateBanco} disabled={creating}>
              {creating ? 'Criando...' : 'Criar Banca'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


