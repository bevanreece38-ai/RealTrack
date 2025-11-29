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
  X,
  Settings
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';
import Modal from './Modal';
import { useTheme } from '../contexts/ThemeContext';
import { AuthManager } from '../lib/auth';
import { BANK_COLOR_PALETTE, DEFAULT_BANK_COLOR, normalizeColor, applyColorTheme } from '../utils/colors';
import { getFirstName } from '../utils/formatters';
import type { ApiProfileResponse } from '../types/api';
import '../styles/layout-new.css';

const navItems = [
  { label: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Bancas', path: '/bancas', icon: Layers },
  { label: 'Financeiro', path: '/financeiro', icon: Wallet2 },
  { label: 'Gráficos', path: '/analise', icon: BarChart2 },
  { label: 'Apostas', path: '/atualizar', icon: RefreshCw },
  { label: 'Tipsters', path: '/tipsters', icon: Users }
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
        const cor = detail.cor;
        setSelectedBanco((prev) => (prev ? { ...prev, cor } : null));
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
    // Só carregar perfil se usuário estiver autenticado
    if (!AuthManager.isTokenValid()) {
      return;
    }

    try {
      const { data } = await api.get<ApiProfileResponse>('/perfil');
      setProfile(data);
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      // Se houver erro de autenticação, limpar tokens e redirecionar para login
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 401) {
        AuthManager.clearTokens();
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
    <div className="layout-new-app-shell">
      {/* Botão hambúrguer para mobile */}
      <button 
        className="layout-new-mobile-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Abrir menu"
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop para mobile */}
      {mobileMenuOpen && (
        <div 
          className="layout-new-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="layout-new-sidebar-wrapper">
        <button 
          className="layout-new-sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        
        <aside className={`layout-new-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Brand Header */}
          <div className="layout-new-brand">
            <div className="layout-new-brand-logo">
              <span>💰</span>
            </div>
            <div className="layout-new-brand-text">
              <h2>Real Comando</h2>
              <p>Sistema de Gestão</p>
            </div>
            <button 
              className="layout-new-theme-toggle" 
              onClick={() => {
                toggleTheme();
              }} 
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          {/* Banca Selection */}
          <div className="layout-new-banca-selection" ref={selectorRef}>
            <button 
              className="layout-new-banca-button" 
              onClick={() => !sidebarCollapsed && setSelectorOpen((prev) => !prev)}
              disabled={sidebarCollapsed}
            >
              <div className="layout-new-banca-badge">
                <span 
                  className="layout-new-banca-dot" 
                  style={{ background: selectedBanco?.cor ?? DEFAULT_BANK_COLOR }} 
                />
                <div className="layout-new-banca-info">
                  <p className="layout-new-banca-title">{selectedBanco?.nome ?? 'Selecione uma banca'}</p>
                  {!sidebarCollapsed && (
                    <p className="layout-new-banca-desc">{selectedBanco?.descricao}</p>
                  )}
                </div>
              </div>
              {!sidebarCollapsed && <ChevronDown size={16} />}
            </button>

            {selectorOpen && !sidebarCollapsed && (
              <div className="layout-new-banca-popover">
                <p className="layout-new-banca-popover-title">Bancas Ativas</p>
                <div className="layout-new-banca-list">
                  {bancas.map((banca) => (
                    <button
                      key={banca.id}
                      type="button"
                      className={`layout-new-banca-item ${selectedBanco?.id === banca.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedBanco(banca);
                        setSelectorOpen(false);
                        setMobileMenuOpen(false);
                        void fetchBancas();
                      }}
                    >
                      <span 
                        className="layout-new-banca-item-dot" 
                        style={{ background: banca.cor }} 
                      />
                      <span className="layout-new-banca-item-text">
                        <strong>{banca.nome}</strong>
                        <small>{banca.descricao}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="layout-new-banca-new"
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

          {/* Navigation */}
          <nav className="layout-new-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `layout-new-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="layout-new-nav-icon" size={16} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Plano Card */}
          {loadingConsumo ? (
            <div className="layout-new-plano-card loading">
              <div className="layout-new-plano-header">
                <p className="layout-new-plano-title">PLANO</p>
                <p className="layout-new-plano-sub">Limite Diário</p>
              </div>
              <div className="layout-new-plano-value">
                <Loader2 size={20} className="layout-new-spinner" />
                <div className="layout-new-plano-pill">
                  <Clock size={13} />
                </div>
              </div>
              <div className="layout-new-plano-progress">
                <div className="layout-new-plano-progress-fill loading" />
              </div>
              <div className="layout-new-plano-hint">
                <RefreshCw size={12} />
                <span>Reseta todo dia às 00:00</span>
              </div>
            </div>
          ) : consumoPlano ? (
            <div className="layout-new-plano-card">
              <div className="layout-new-plano-header">
                <p className="layout-new-plano-title">PLANO</p>
                <p className="layout-new-plano-sub">Limite Diário</p>
              </div>
              <div className="layout-new-plano-value">
                <div className="layout-new-plano-numbers">
                  <strong>{consumoPlano.consumo.apostasHoje}</strong>
                  <span>de {consumoPlano.consumo.limite}</span>
                </div>
                <div className="layout-new-plano-pill">
                  <Clock size={13} />
                  {profile?.plano.nome ?? consumoPlano.plano.nome}
                </div>
              </div>
              <div className="layout-new-plano-progress">
                <div 
                  className="layout-new-plano-progress-fill" 
                  style={{ 
                    width: `${Math.min(consumoPlano.consumo.porcentagem, 100)}%`
                  }} 
                />
              </div>
              <div className="layout-new-plano-hint">
                <RefreshCw size={12} />
                <span>Reseta todo dia às 00:00</span>
              </div>
            </div>
          ) : null}

          {/* Profile Box */}
          <div className="layout-new-profile-box">
            <div className="layout-new-profile-info">
              <div className="layout-new-profile-avatar">
                <User2 size={18} />
              </div>
              <div className="layout-new-profile-details">
                <p className="layout-new-profile-name">
                  {profile ? getFirstName(profile.nomeCompleto) : (
                    <Loader2 size={14} className="layout-new-spinner" />
                  )}
                </p>
                {!sidebarCollapsed && (
                  <p className="layout-new-profile-email">
                    {profile?.email ?? (
                      <Loader2 size={12} className="layout-new-spinner" />
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="layout-new-profile-actions">
              {!sidebarCollapsed && (
                <button 
                  className="layout-new-profile-action-btn"
                  onClick={() => {
                    void navigate('/perfil');
                    setMobileMenuOpen(false);
                  }}
                  title="Configurações"
                >
                  <Settings size={16} />
                </button>
              )}
              <button 
                className="layout-new-profile-logout-btn"
                onClick={() => {
                  AuthManager.clearTokens();
                  setMobileMenuOpen(false);
                  void navigate('/login');
                }}
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <div className="layout-new-main">
        <main className="layout-new-body">
          <Outlet />
        </main>
      </div>

      {/* Create Banca Modal */}
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
