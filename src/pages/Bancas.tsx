import { Copy, Eye, LineChart, Pencil, Share2, Trash2, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Toggle from '../components/Toggle';
import Modal from '../components/Modal';
import api from '../lib/api';
import EmptyState from '../components/EmptyState';
import { type Banco, type BancoStats } from '../data/mock';
import { BANK_COLOR_PALETTE, DEFAULT_BANK_COLOR, normalizeColor } from '../utils/colors';
import { formatNumber, formatDateTime } from '../utils/formatters';
import '../styles/pages/bancas.css';

interface BancoMetricasApi {
  totalApostas?: number;
  totalTransacoes?: number;
  visualizacoesHoje?: number;
  visualizacoesSemana?: number;
  visualizacoesMes?: number;
}

interface BancoApi {
  id: string;
  nome: string;
  descricao?: string | null;
  status?: string | null;
  ePadrao?: boolean | null;
  cor?: string | null;
  metricas?: BancoMetricasApi | null;
  stats?: BancoStats;
  linkCompartilhamento?: string | null;
  criadoEm?: string | null;
  updatedAt?: string | null;
}

interface BetApi {
  createdAt?: string | null;
  dataJogo?: string | null;
  data?: string | null;
}

interface EditFormState {
  nome: string;
  descricao: string;
  valorInicial: string;
  cor: string;
  ativa: boolean;
  padrao: boolean;
  compartilhamento: boolean;
}

const defaultForm: EditFormState = {
  nome: '',
  descricao: '',
  valorInicial: '',
  cor: DEFAULT_BANK_COLOR,
  ativa: true,
  padrao: false,
  compartilhamento: false
};

interface ConfirmDeleteState {
  open: boolean;
  banca?: Banco;
  loading: boolean;
}

export default function Bancas() {
  const [bancas, setBancas] = useState<Banco[]>([]);
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null);
  const [statsOverride, setStatsOverride] = useState<BancoStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loadingBancas, setLoadingBancas] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [editBanco, setEditBanco] = useState<Banco | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(defaultForm);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({
    open: false,
    loading: false
  });

  const fetchBancas = useCallback(async () => {
    setLoadingBancas(true);
    try {
      const { data } = await api.get<BancoApi[]>('/bancas');
      if (!Array.isArray(data)) {
        setBancas([]);
        setFetchError('');
        return;
      }

      if (data.length > 0) {
        setBancas(data.map(mapBancoFromApi));
        setFetchError('');
        return;
      }

      setBancas([]);
      setFetchError('');
    } catch (error) {
      console.warn('Não foi possível carregar bancas.', error);
      setBancas([]);
      setFetchError('Não foi possível carregar suas bancas agora.');
    } finally {
      setLoadingBancas(false);
    }
  }, []);

  useEffect(() => {
    void fetchBancas();
  }, [fetchBancas]);

  const summaryCards = useMemo(() => {
    const totalViews = bancas.reduce((sum, banca) => sum + banca.visualizacoes, 0);
    const totalVisitors = bancas.reduce((sum, banca) => sum + banca.visitantes, 0);
    const activeBancas = bancas.filter((banca) => banca.status === 'Ativa').length;
    const conversion =
      totalViews === 0 ? '0%' : `${Math.min(100, Math.round((totalVisitors / totalViews) * 100))}%`;

    return [
      {
        title: 'Total de Visualizações',
        value: formatNumber(totalViews),
        helper: '+0% em relação ao mês passado',
        icon: <Eye size={20} />,
        color: 'blue' as const
      },
      {
        title: 'Visitantes Únicos',
        value: formatNumber(totalVisitors),
        helper: '+0% em relação ao mês passado',
        icon: <Eye size={20} />,
        color: 'emerald' as const
      },
      {
        title: 'Bancas Ativas',
        value: String(activeBancas),
        helper: `de ${String(bancas.length)}`,
        icon: <LineChart size={20} />,
        color: 'purple' as const
      },
      {
        title: 'Taxa de Conversão',
        value: conversion,
        helper: 'visitantes únicos / visualizações',
        icon: <LineChart size={20} />,
        color: 'amber' as const
      }
    ];
  }, [bancas]);

  const handleOpenStats = async (banca: Banco) => {
    setSelectedBanco(banca);
    setStatsOverride(null);
    setStatsLoading(true);

    try {
      const { data: apostas } = await api.get<BetApi[]>('/apostas', {
        params: { bancaId: banca.id }
      });
      const views = computeViewsFromBets(apostas);
      setStatsOverride({
        ...banca.stats,
        views
      });
    } catch (error) {
      console.warn('Não foi possível carregar métricas detalhadas, exibindo dados locais.', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const openEditModal = (banca: Banco) => {
    setEditBanco(banca);
    setEditForm({
      nome: banca.nome,
      descricao: banca.descricao,
      valorInicial: '',
      cor: normalizeColor(banca.cor, DEFAULT_BANK_COLOR),
      ativa: banca.status === 'Ativa',
      padrao: banca.padrao,
      compartilhamento: false
    });
  };

  const handleDeleteBanco = async () => {
    if (!confirmDelete.banca) return;
    setConfirmDelete((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/bancas/${confirmDelete.banca.id}`);
      await fetchBancas();
    } catch (error) {
      console.error('Não foi possível excluir a banca.', error);
    } finally {
      setConfirmDelete({ open: false, banca: undefined, loading: false });
    }
  };

  const handleEditChange = <Key extends keyof EditFormState>(
    field: Key,
    value: EditFormState[Key]
  ) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTogglePadrao = async (banca: Banco) => {
    try {
      // Update local state optimistically
      setBancas(prev => prev.map(b => 
        b.id === banca.id ? { ...b, padrao: !b.padrao } : b
      ));
      
      // Make API call to update the bank
      await api.put(`/bancas/${banca.id}`, {
        ePadrao: !banca.padrao
      });
      
      // Refresh data to ensure consistency
      await fetchBancas();
    } catch (error) {
      console.error('Não foi possível atualizar o status padrão da banca:', error);
      // Revert the change if API call fails
      await fetchBancas();
    }
  };

  const handleSaveBanco = async () => {
    if (!editBanco) return;
    setSavingEdit(true);
    try {
      await api.put(`/bancas/${editBanco.id}`, {
        nome: editForm.nome,
        descricao: editForm.descricao,
        cor: editForm.cor,
        status: editForm.ativa ? 'Ativa' : 'Inativa',
        ePadrao: editForm.padrao
      });

      // Recarregar bancas do backend para garantir que temos os dados atualizados
      await fetchBancas();
      
      // Disparar evento para atualizar tema se a banca editada for a selecionada
      window.dispatchEvent(new CustomEvent('banca-updated', { detail: { id: editBanco.id, cor: editForm.cor } }));
      setEditBanco(null);
    } catch (error) {
      console.error('Não foi possível salvar a banca.', error);
    } finally {
      setSavingEdit(false);
    }
  };

  const statsData = selectedBanco ? statsOverride ?? selectedBanco.stats : undefined;

  return (
    <div className="bancas-page">
      <PageHeader title="Bancas" subtitle="Gerencie suas bancas" badge="Padrão" />

      <div className="stat-grid">
        {summaryCards.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} helper={stat.helper} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      {!loadingBancas && fetchError && (
        <div className="card">
          <h3 style={{ margin: 0 }}>Bancas Compartilhadas</h3>
          <p className="card-desc" style={{ marginTop: 12 }}>{fetchError}</p>
        </div>
      )}

      {bancas.length > 0 ? (
        <div className="card">
          <h3 style={{ margin: '0 0 16px' }}>Bancas Compartilhadas</h3>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Banca</th>
                  <th>Desc</th>
                  <th>Status</th>
                  <th>Padrão</th>
                  <th>Visualizações</th>
                  <th>Visitantes Únicos</th>
                  <th>Última Visualização</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {bancas.map((banca) => (
                  <tr key={banca.id}>
                    <td>
                      <strong>{banca.nome}</strong>
                      <p className="card-desc" style={{ margin: 0 }}>
                        ID: {banca.id}
                      </p>
                    </td>
                    <td>{banca.descricao}</td>
                    <td>
                      <Toggle checked={banca.status === 'Ativa'} />
                    </td>
                    <td>
                      <Toggle 
                        checked={banca.padrao} 
                        onClick={() => void handleTogglePadrao(banca)}
                      />
                    </td>
                    <td>
                      {banca.visualizacoes}
                      <p className="card-desc" style={{ margin: 0 }}>
                        Hoje: 0
                      </p>
                    </td>
                    <td>{banca.visitantes}</td>
                    <td>{banca.ultimaVisualizacao}</td>
                    <td>{banca.criadoEm}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn ghost"
                          onClick={() => {
                            void handleOpenStats(banca);
                          }}
                        >
                          <LineChart size={16} />
                        </button>
                        <button className="btn ghost">
                          <Share2 size={16} />
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => {
                            openEditModal(banca);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => {
                            setConfirmDelete({ open: true, banca, loading: false });
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !loadingBancas && !fetchError && (
          <div className="card">
            <h3 style={{ margin: '0 0 16px' }}>Bancas Compartilhadas</h3>
            <EmptyState
              title="Nenhuma banca cadastrada"
              description="Crie uma nova banca para começar a registrar suas estatísticas."
            />
          </div>
        )
      )}

      <Modal
        isOpen={!!selectedBanco}
        onClose={() => {
          setSelectedBanco(null);
          setStatsOverride(null);
        }}
        title={selectedBanco ? `Estatísticas Detalhadas - ${selectedBanco.nome}` : ''}
      >
        {selectedBanco && (
          <div className="stats-modal">
            <div className="stats-tabs">
              <button className="stats-tab active">Visão Geral</button>
            </div>
            {statsLoading ? (
              <p className="card-desc">Carregando métricas em tempo real...</p>
            ) : (
              <>
                <div className="stats-overview">
                  {statsData &&
                    (Object.entries(statsData.views) as [keyof BancoStats['views'], number][]).map(([key, value]) => (
                      <div key={key} className="stats-card">
                        <p className="stats-card-label">
                          {key === 'hoje' && 'Hoje'}
                          {key === 'semana' && 'Esta Semana'}
                          {key === 'mes' && 'Este Mês'}
                          {key === 'total' && 'Total'}
                        </p>
                        <p className="stats-card-value">{value}</p>
                        <p className="card-desc">visualizações</p>
                      </div>
                    ))}
                </div>

                <div className="stats-sections">
                  <div className="stats-section">
                    <h4>Informações do Link</h4>
                    <p className="card-desc">URL de Compartilhamento</p>
                    <div className="link-field">
                      <span>{statsData?.infoLink.url}</span>
                      <button
                        className="btn ghost"
                        onClick={() => {
                          copyToClipboard(statsData?.infoLink.url);
                        }}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <p className="card-desc" style={{ marginTop: 12 }}>
                      Criado em
                    </p>
                    <p>{statsData?.infoLink.criadoEm}</p>
                  </div>

                  <div className="stats-section">
                    <h4>Métricas de Engajamento</h4>
                    <div className="engagement-row">
                      <span>Taxa de Visitantes Únicos</span>
                      <strong>{statsData?.engajamento.taxaVisitantes}%</strong>
                    </div>
                    <div className="engagement-row">
                      <span>Média de Visualizações/Dia</span>
                      <strong>{statsData?.engajamento.mediaVisualizacoesDia}</strong>
                    </div>
                    <div className="engagement-row">
                      <span>Última Atividade</span>
                      <strong>{statsData?.engajamento.ultimaAtividade}</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editBanco}
        onClose={() => {
          setEditBanco(null);
          setSavingEdit(false);
        }}
        title="Editar Banca"
      >
        {editBanco && (
          <EditBancoForm
            form={editForm}
            onChange={handleEditChange}
            onCancel={() => setEditBanco(null)}
            onSubmit={handleSaveBanco}
            saving={savingEdit}
          />
        )}
      </Modal>

      <Modal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, banca: undefined, loading: false })}
        title="Excluir Banca"
      >
        <div className="danger-zone">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertTriangle color="var(--color-danger-dark)" />
            <div>
              <p className="toggle-title">Tem certeza que deseja excluir esta banca?</p>
              <p className="toggle-description">
                Essa ação não pode ser desfeita e todas as informações relacionadas serão removidas permanentemente.
              </p>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 18 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setConfirmDelete({ open: false, banca: undefined, loading: false });
          }}
        >
              Cancelar
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: 'var(--color-bg-button-danger)' }}
              onClick={() => {
                void handleDeleteBanco();
              }}
              disabled={confirmDelete.loading}
            >
              {confirmDelete.loading ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


const createStats = (banca: BancoApi): BancoStats => {
  if (banca.stats) return banca.stats;

  const totalApostas = banca.metricas?.totalApostas ?? 0;
  return {
    views: {
      hoje: banca.metricas?.visualizacoesHoje ?? 0,
      semana: banca.metricas?.visualizacoesSemana ?? 0,
      mes: banca.metricas?.visualizacoesMes ?? 0,
      total: totalApostas
    },
    infoLink: {
      url: banca.linkCompartilhamento ?? `${window.location.origin}/banca/${banca.id}`,
        criadoEm: formatDateTime(banca.criadoEm)
    },
    engajamento: {
      taxaVisitantes: Math.min(
        100,
        Math.round(
          (banca.metricas?.totalTransacoes && totalApostas
            ? (banca.metricas.totalTransacoes / totalApostas) * 100
            : 0) || 0
        )
      ),
      mediaVisualizacoesDia: totalApostas,
        ultimaAtividade: formatDateTime(banca.updatedAt)
    }
  };
};

const mapBancoFromApi = (item: BancoApi): Banco => {
  const stats = createStats(item);

  return {
    id: item.id,
    nome: item.nome,
    descricao: item.descricao ?? 'Banca sem descrição',
    status: item.status ?? 'Ativa',
    padrao: item.ePadrao ?? false,
    cor: normalizeColor(item.cor ?? undefined, DEFAULT_BANK_COLOR),
    visualizacoes: stats.views.total,
    visitantes: item.metricas?.totalTransacoes ?? 0,
    ultimaVisualizacao: stats.engajamento.ultimaAtividade,
    criadoEm: formatDateTime(item.criadoEm),
    stats
  };
};

const computeViewsFromBets = (bets?: BetApi[]): BancoStats['views'] => {
  if (!Array.isArray(bets)) {
    return { hoje: 0, semana: 0, mes: 0, total: 0 };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const getDate = (bet: BetApi) => new Date(bet.createdAt ?? bet.dataJogo ?? bet.data ?? Date.now());

  let hoje = 0;
  let semana = 0;
  let mes = 0;

  bets.forEach((bet) => {
    const date = getDate(bet);
    if (Number.isNaN(date.getTime())) return;
    if (date >= startOfDay) hoje += 1;
    if (date >= startOfWeek) semana += 1;
    if (date >= startOfMonth) mes += 1;
  });

  return {
    hoje,
    semana,
    mes,
    total: bets.length
  };
};

const copyToClipboard = (value?: string) => {
  if (!value) return;
  void navigator.clipboard.writeText(value);
};


interface EditFormProps {
  form: EditFormState;
  onChange: <Key extends keyof EditFormState>(field: Key, value: EditFormState[Key]) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}

function EditBancoForm({ form, onChange, onCancel, onSubmit, saving }: EditFormProps) {
  return (
    <div className="edit-banca-form">
      <div className="field">
        <label>Nome da Banca</label>
        <input value={form.nome} onChange={(e) => onChange('nome', e.target.value)} />
      </div>
      <div className="field">
        <label>Descrição</label>
        <textarea rows={3} value={form.descricao} onChange={(e) => onChange('descricao', e.target.value)} />
      </div>
      <div className="field">
        <label>Valor Inicial da Banca</label>
        <input
          value={form.valorInicial}
          onChange={(e) => onChange('valorInicial', e.target.value)}
          placeholder="0,00"
        />
      </div>

      <div className="field">
        <label>Cor da Banca</label>
        <div className="color-grid">
          {BANK_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-option ${form.cor === color ? 'selected' : ''}`}
              style={{ background: color }}
              onClick={() => {
                onChange('cor', color);
              }}
            />
          ))}
        </div>
        <div className="color-input">
          <input value={form.cor} onChange={(e) => onChange('cor', e.target.value)} />
        </div>
      </div>

      <div className="toggle-section">
        <ToggleLine
          title="Banca Ativa"
          description="Ativar ou desativar esta banca no sistema. A banca padrão do sistema não pode ser desativada."
          value={form.ativa}
          onToggle={() => onChange('ativa', !form.ativa)}
        />
        <ToggleLine
          title="Banca Padrão"
          description="Ativar ou desativar a banca padrão. A banca padrão é onde todas as apostas enviadas serão salvas."
          value={form.padrao}
          onToggle={() => onChange('padrao', !form.padrao)}
        />
        <ToggleLine
          title="Compartilhamento Público"
          description="Permitir que outras pessoas visualizem esta banca."
          value={form.compartilhamento}
          onToggle={() => onChange('compartilhamento', !form.compartilhamento)}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            onCancel();
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            onSubmit();
          }}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}

interface ToggleLineProps {
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}

function ToggleLine({ title, description, value, onToggle }: ToggleLineProps) {
  return (
    <div className="toggle-line">
      <div>
        <p className="toggle-title">{title}</p>
        <p className="toggle-description">{description}</p>
      </div>
      <button
        type="button"
        className={`toggle-control ${value ? 'active' : ''}`}
        onClick={() => {
          onToggle();
        }}
      >
        <span />
      </button>
    </div>
  );
}

