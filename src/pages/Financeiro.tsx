import { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, Plus, Wallet, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { GlassCard } from '../components/ui/GlassCard';
import Modal from '../components/Modal';
import FilterPopover from '../components/FilterPopover';
import DateInput from '../components/DateInput';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import api from '../lib/api';
import { useBancas } from '../hooks/useBancas';
import { formatCurrency, formatDate, formatDateDisplay, normalizeDisplayToISO, getTodayDateISO, toISODate } from '../utils/formatters';
import { type ApiFinancialTransaction, type ApiFinancialSummary, type ApiError } from '../types/api';

interface FinanceiroFilters {
  tipo: string;
  casa: string;
  dataDe: string;
  dataAte: string;
  observacao: string;
}

const initialFilters: FinanceiroFilters = {
  tipo: '',
  casa: '',
  dataDe: '',
  dataAte: '',
  observacao: ''
};

export default function Financeiro() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { bancas } = useBancas();
  const [transacoes, setTransacoes] = useState<ApiFinancialTransaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<ApiFinancialSummary>({
    totalDepositado: 0,
    totalSacado: 0,
    resultadoApostas: 0,
    apostasPendentes: 0,
    valorApostasPendentes: 0,
    saldoAtual: 0,
    totalDepositos: 0,
    totalSaques: 0,
    apostasConcluidas: 0,
    totalTransacoes: 0,
    porCasa: {}
  });
  const [formData, setFormData] = useState(() => ({
    bancaId: '',
    tipo: '',
    casaDeAposta: '',
    valor: '',
    dataTransacao: getTodayDateISO(),
    observacao: ''
  }));
  const [manualDateInput, setManualDateInput] = useState(() => formatDateDisplay(getTodayDateISO()));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  const [saldoCasaExpanded, setSaldoCasaExpanded] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<FinanceiroFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FinanceiroFilters>(initialFilters);

  const fetchTransacoes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};

      if (appliedFilters.tipo) {
        params.tipo = appliedFilters.tipo;
      }
      if (appliedFilters.casa) {
        params.casaDeAposta = appliedFilters.casa;
      }
      if (appliedFilters.observacao) {
        params.observacao = appliedFilters.observacao;
      }

      if (appliedFilters.dataDe && !appliedFilters.dataAte) {
        params.dataInicio = appliedFilters.dataDe;
        params.dataFim = appliedFilters.dataDe;
      } else {
        if (appliedFilters.dataDe) {
          params.dataInicio = appliedFilters.dataDe;
        }
        if (appliedFilters.dataAte) {
          params.dataFim = appliedFilters.dataAte;
        }
      }

      const { data } = await api.get<ApiFinancialTransaction[]>('/financeiro/transacoes', { params });
      setTransacoes(data);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      setTransacoes([]);
      const apiError = error as ApiError;
      if (apiError.response?.data) {
        setError('Erro ao carregar transações. Tente recarregar a página.');
      } else {
        setError('Erro ao carregar transações. Tente recarregar a página.');
      }
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);

      const params: Record<string, string> = {};

      if (appliedFilters.tipo) {
        params.tipo = appliedFilters.tipo;
      }
      if (appliedFilters.casa) {
        params.casaDeAposta = appliedFilters.casa;
      }
      if (appliedFilters.observacao) {
        params.observacao = appliedFilters.observacao;
      }

      if (appliedFilters.dataDe && !appliedFilters.dataAte) {
        params.dataInicio = appliedFilters.dataDe;
        params.dataFim = appliedFilters.dataDe;
      } else {
        if (appliedFilters.dataDe) {
          params.dataInicio = appliedFilters.dataDe;
        }
        if (appliedFilters.dataAte) {
          params.dataFim = appliedFilters.dataAte;
        }
      }

      const { data } = await api.get<ApiFinancialSummary>('/financeiro/saldo-geral', { params });
      setStatsData(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      const apiError = error as ApiError;
      setStatsData({
        totalDepositado: 0,
        totalSacado: 0,
        resultadoApostas: 0,
        apostasPendentes: 0,
        valorApostasPendentes: 0,
        saldoAtual: 0,
        totalDepositos: 0,
        totalSaques: 0,
        apostasConcluidas: 0,
        totalTransacoes: 0,
        porCasa: {}
      });
      if (apiError.response?.data) {
        setError('Erro ao carregar estatísticas. Tente recarregar a página.');
      } else {
        setError('Erro ao carregar estatísticas. Tente recarregar a página.');
      }
    }
  }, [appliedFilters]);

  useEffect(() => {
    void fetchTransacoes();
    void fetchStats();
  }, [fetchTransacoes, fetchStats]);

  useEffect(() => {
    if (bancas.length > 0 && !formData.bancaId) {
      setFormData(prev => ({ ...prev, bancaId: bancas[0].id }));
    }
  }, [bancas, formData.bancaId]);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFilterChange = <K extends keyof FinanceiroFilters>(field: K, value: FinanceiroFilters[K]) => {
    setPendingFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(pendingFilters);
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setPendingFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setFiltersOpen(false);
  };

  const activeFiltersCount = useMemo(
    () => Object.values(appliedFilters).filter((v) => v !== '').length,
    [appliedFilters]
  );

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.bancaId) {
      errors.bancaId = 'Selecione uma banca';
    }
    if (!formData.tipo) {
      errors.tipo = 'Selecione o tipo de transação';
    }
    if (!formData.casaDeAposta) {
      errors.casaDeAposta = 'Selecione uma casa de apostas';
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      errors.valor = 'Informe um valor válido';
    }
    if (!formData.dataTransacao) {
      errors.dataTransacao = 'Informe a data da transação';
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

      const dataToSend = {
        bancaId: formData.bancaId,
        tipo: formData.tipo,
        casaDeAposta: formData.casaDeAposta,
        valor: parseFloat(formData.valor),
        dataTransacao: formData.dataTransacao ? `${formData.dataTransacao}T00:00:00` : undefined,
        observacao: formData.observacao.trim() === '' ? undefined : formData.observacao
      };

      if (editingId) {
        await api.put(`/financeiro/transacao/${editingId}`, dataToSend);
      } else {
        await api.post('/financeiro/transacao', dataToSend);
      }

      // Reset form
      setFormData({
        bancaId: bancas.length > 0 ? bancas[0].id : '',
        tipo: '',
        casaDeAposta: '',
        valor: '',
        dataTransacao: getTodayDateISO(),
        observacao: ''
      });
      setManualDateInput(formatDateDisplay(getTodayDateISO()));
      setFormErrors({});
      setEditingId(null);
      setModalOpen(false);

      // Refresh transactions and stats
      await fetchTransacoes();
      await fetchStats();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      const apiError = error as ApiError;
      const errorData = apiError.response?.data?.error;

      if (errorData) {
        const message = Array.isArray(errorData)
          ? errorData
              .map((entry) => entry.message?.trim())
              .filter((entry): entry is string => Boolean(entry && entry.length > 0))
              .join(', ') || 'Erro desconhecido.'
          : typeof errorData === 'string' ? errorData : 'Erro desconhecido.';
        alert(`Erro ao salvar transação: ${message}`);
      } else {
        alert('Erro ao salvar transação. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setFormData({
      bancaId: bancas.length > 0 ? bancas[0].id : '',
      tipo: '',
      casaDeAposta: '',
      valor: '',
      dataTransacao: getTodayDateISO(),
      observacao: ''
    });
    setManualDateInput(formatDateDisplay(getTodayDateISO()));
    setFormErrors({});
    setEditingId(null);
    setModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      bancaId: bancas.length > 0 ? bancas[0].id : '',
      tipo: '',
      casaDeAposta: '',
      valor: '',
      dataTransacao: getTodayDateISO(),
      observacao: ''
    });
    setManualDateInput(formatDateDisplay(getTodayDateISO()));
    setModalOpen(true);
  };

  const handleEditTransacao = (transacao: ApiFinancialTransaction) => {
    setEditingId(transacao.id);
    setFormData({
      bancaId: transacao.bancaId,
      tipo: transacao.tipo,
      casaDeAposta: transacao.casaDeAposta,
      valor: String(transacao.valor),
      dataTransacao: toISODate(transacao.dataTransacao),
      observacao: transacao.observacao ?? ''
    });
    setManualDateInput(formatDateDisplay(toISODate(transacao.dataTransacao)));
    setModalOpen(true);
  };

  const handleDeleteTransacao = async (transacao: ApiFinancialTransaction) => {
    if (!window.confirm('Deseja remover esta transação?')) {
      return;
    }
    try {
      await api.delete(`/financeiro/transacao/${transacao.id}`);
      await fetchTransacoes();
      await fetchStats();
    } catch (err) {
      console.error('Erro ao deletar transação', err);
      alert('Não foi possível remover a transação.');
    }
  };


  return (
    <div>
      <PageHeader
        title='Financeiro'
        subtitle='Gerencie suas transações e acompanhe seus saldos'
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="filter-trigger-wrapper">
              <button className='filter-trigger' onClick={() => setFiltersOpen((prev) => !prev)}>
                <Filter size={16} /> Filtros {activeFiltersCount > 0 && <span className="filter-count">{activeFiltersCount}</span>}
              </button>
              <FilterPopover
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                onClear={handleClearFilters}
                footer={
                  <button className='btn' onClick={handleApplyFilters}>
                    Aplicar Filtros
                  </button>
                }
              >
                <div className='filters-panel filters-panel--plain'>
                  <div className='field'>
                    <label>Tipo</label>
                    <select
                      value={pendingFilters.tipo}
                      onChange={(e) => handleFilterChange('tipo', e.target.value)}
                      style={{ color: pendingFilters.tipo ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <option value="" disabled hidden>Selecione um status</option>
                      <option value="Depósito">Depósito</option>
                      <option value="Saque">Saque</option>
                    </select>
                  </div>
                  <div className='field'>
                    <label>Casa de Apostas</label>
                    <select
                      value={pendingFilters.casa}
                      onChange={(e) => handleFilterChange('casa', e.target.value)}
                      style={{ color: pendingFilters.casa ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <option value="" disabled hidden>Selecione a casa</option>
                      {CASAS_APOSTAS.length > 0 && CASAS_APOSTAS.map((casa) => (
                        <option key={casa} value={casa}>
                          {casa}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='field'>
                    <label>Período (De)</label>
                    <DateInput
                      value={pendingFilters.dataDe}
                      onChange={(value) => handleFilterChange('dataDe', value)}
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
                  </div>
                  <div className='field'>
                    <label>Período (Até)</label>
                    <DateInput
                      value={pendingFilters.dataAte}
                      onChange={(value) => handleFilterChange('dataAte', value)}
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
                    <p style={{ 
                      margin: '8px 0 0 0', 
                      fontSize: '0.75rem', 
                      color: 'var(--muted)',
                      lineHeight: '1.4'
                    }}>
                      Se só preencher "De", será filtrado apenas nesta data. Se preencher "Até", será considerado como intervalo.
                    </p>
                  </div>
                  <div className='field'>
                    <label>Observação</label>
                    <input
                      type='text'
                      placeholder='Buscar na observação…'
                      value={pendingFilters.observacao}
                      onChange={(e) => handleFilterChange('observacao', e.target.value)}
                    />
                  </div>
                </div>
              </FilterPopover>
            </div>
            <button className='btn' onClick={handleOpenCreateModal}>
              <Plus size={16} /> Nova Transação
            </button>
          </div>
        }
      />

      {error && (
        <div style={{ 
          padding: '12px 16px', 
          marginBottom: '24px',
          background: 'var(--surface)',
          border: '1px solid var(--color-danger)',
          borderRadius: '8px',
          color: 'var(--color-danger)'
        }}>
          {error}
        </div>
      )}

      <div className='stat-grid' style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <StatCard 
          title='Total Depositado' 
          value={formatCurrency(statsData.totalDepositado)} 
          helper={`${statsData.totalDepositos} ${statsData.totalDepositos === 1 ? 'depósito' : 'depósitos'}`} 
          icon={<Wallet size={20} />} 
        />
        <StatCard 
          title='Total Sacado' 
          value={formatCurrency(statsData.totalSacado)} 
          helper={`${statsData.totalSaques} ${statsData.totalSaques === 1 ? 'saque' : 'saques'}`} 
          icon={<Wallet size={20} />} 
        />
        <StatCard 
          title='Resultado de Apostas' 
          value={formatCurrency(statsData.resultadoApostas)} 
          helper={`${statsData.apostasConcluidas} ${statsData.apostasConcluidas === 1 ? 'aposta concluída' : 'apostas concluídas'}`} 
          icon={<Wallet size={20} />} 
        />
        <StatCard 
          title='Apostas Pendentes' 
          value={formatCurrency(statsData.valorApostasPendentes)} 
          helper={`${statsData.apostasPendentes} ${statsData.apostasPendentes === 1 ? 'aposta' : 'apostas'} aguardando resultado`} 
          icon={<Wallet size={20} />} 
        />
        <StatCard 
          title='Saldo Atual' 
          value={formatCurrency(statsData.saldoAtual)} 
          helper='Saldo total ajustado' 
          icon={<Wallet size={20} />} 
        />
      </div>

      <GlassCard style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ marginTop: 0 }}>Gerenciar Transações Financeiras</h3>
          {transacoes.length > 0 && (
            <button
              type="button"
              className="btn ghost"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => setTransactionsExpanded(prev => !prev)}
            >
              {transactionsExpanded ? 'Recolher' : 'Expandir'}
            </button>
          )}
        </div>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Carregando...</div>
        ) : transacoes.length === 0 ? (
          <EmptyState title='Nada encontrado' description='Nenhuma transação financeira foi encontrada.' />
        ) : (
          <div
            style={{
              maxHeight: transactionsExpanded ? 'none' : '420px',
              overflowY: transactionsExpanded ? 'visible' : 'auto',
              marginTop: 4
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Casa</th>
                  <th>Valor</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((transacao) => (
                  <tr key={transacao.id}>
                    <td>{formatDate(transacao.dataTransacao)}</td>
                    <td>{transacao.tipo}</td>
                    <td>{transacao.casaDeAposta}</td>
                    <td>{formatCurrency(transacao.valor)}</td>
                    <td>{transacao.observacao ?? '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleEditTransacao(transacao)}
                        style={{
                          border: 'none',
                          background: 'var(--bank-color-light, var(--color-bg-hover))',
                          color: 'var(--bank-color, var(--color-chart-primary))',
                          padding: '6px 10px',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransacao(transacao)}
                        style={{
                          border: 'none',
                          background: 'var(--color-bg-danger-medium)',
                          color: 'var(--color-danger)',
                          padding: '6px 10px',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ marginTop: 0 }}>Saldo Ajustado por Casa</h3>
          {Object.keys(statsData.porCasa).length > 0 && (
            <button
              type="button"
              className="btn ghost"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => setSaldoCasaExpanded(prev => !prev)}
            >
              {saldoCasaExpanded ? 'Recolher' : 'Expandir'}
            </button>
          )}
        </div>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Carregando...</div>
        ) : Object.keys(statsData.porCasa).length > 0 ? (
          <div
            style={{
              maxHeight: saldoCasaExpanded ? 'none' : '360px',
              overflowY: saldoCasaExpanded ? 'visible' : 'auto',
              marginTop: 4
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Casa de Aposta</th>
                  <th>Depósitos</th>
                  <th>Saques</th>
                  <th>Resultado de Apostas</th>
                  <th>Saldo Ajustado</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(statsData.porCasa)
                  .sort((a, b) => b[1].saldo - a[1].saldo)
                  .map(([casa, dados]) => (
                    <tr key={casa}>
                      <td style={{ fontWeight: 600 }}>{casa}</td>
                      <td>{formatCurrency(dados.depositos)}</td>
                      <td>{formatCurrency(dados.saques)}</td>
                      <td style={{ color: dados.resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {formatCurrency(dados.resultado)}
                      </td>
                      <td style={{ 
                        fontWeight: 600, 
                        color: dados.saldo >= 0 ? 'var(--color-success)' : 'var(--color-danger)' 
                      }}>
                        {formatCurrency(dados.saldo)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title='Nada encontrado' description='Nenhum saldo encontrado para as casas filtradas.' />
        )}
      </GlassCard>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Transação' : 'Nova Transação'}
      >
        <form onSubmit={handleSubmit} className='filters-panel filters-panel--plain' style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className='field'>
            <label>Banca *</label>
            <select 
              value={formData.bancaId}
              onChange={(e) => handleFormChange('bancaId', e.target.value)}
              style={{ color: formData.bancaId ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled hidden>Selecione uma banca</option>
              {bancas.map((banca) => (
                <option key={banca.id} value={banca.id}>
                  {banca.nome}
                </option>
              ))}
            </select>
            {formErrors.bancaId && <span className="field-error">{formErrors.bancaId}</span>}
          </div>
          <div className='field'>
            <label>Tipo *</label>
            <select 
              value={formData.tipo}
              onChange={(e) => handleFormChange('tipo', e.target.value)}
              style={{ color: formData.tipo ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled hidden>Selecione o tipo</option>
              <option value="Depósito">Depósito</option>
              <option value="Saque">Saque</option>
            </select>
            {formErrors.tipo && <span className="field-error">{formErrors.tipo}</span>}
          </div>
          <div className='field'>
            <label>Casa de Apostas *</label>
            <select 
              value={formData.casaDeAposta}
              onChange={(e) => handleFormChange('casaDeAposta', e.target.value)}
              style={{ color: formData.casaDeAposta ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled hidden>Selecione uma casa…</option>
              {CASAS_APOSTAS.length > 0 && CASAS_APOSTAS.map((casa) => (
                <option key={casa} value={casa}>
                  {casa}
                </option>
              ))}
            </select>
            {formErrors.casaDeAposta && <span className="field-error">{formErrors.casaDeAposta}</span>}
          </div>
          <div className='field'>
            <label>Valor *</label>
            <input 
              type='number' 
              placeholder='0,00' 
              value={formData.valor}
              onChange={(e) => handleFormChange('valor', e.target.value)}
              step="0.01"
              min="0.01"
            />
            {formErrors.valor && <span className="field-error">{formErrors.valor}</span>}
          </div>
          <div className='field'>
            <label>Data da Transação *</label>
            <input
              type='text'
              placeholder='dd/mm/aaaa'
              value={manualDateInput}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
                const day = digits.slice(0, 2);
                const month = digits.slice(2, 4);
                const year = digits.slice(4, 8);
                let formatted = day;
                if (month) {
                  formatted = `${day}/${month}`;
                }
                if (year) {
                  formatted = `${formatted}/${year}`;
                }
                setManualDateInput(formatted);

                const maybeISO = normalizeDisplayToISO(formatted);
                if (maybeISO) {
                  handleFormChange('dataTransacao', maybeISO);
                  if (formErrors.dataTransacao) {
                    setFormErrors(prev => ({ ...prev, dataTransacao: '' }));
                  }
                }
              }}
              onBlur={(e) => {
                const maybeISO = normalizeDisplayToISO(e.target.value);
                if (maybeISO) {
                  handleFormChange('dataTransacao', maybeISO);
                  setManualDateInput(formatDateDisplay(maybeISO));
                  setFormErrors(prev => ({ ...prev, dataTransacao: '' }));
                } else if (e.target.value.trim() !== '') {
                  setFormErrors(prev => ({ ...prev, dataTransacao: 'Informe uma data válida' }));
                }
              }}
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontWeight: 500
              }}
            />
            {formErrors.dataTransacao && <span className="field-error">{formErrors.dataTransacao}</span>}
          </div>
          <div className='field' style={{ gridColumn: 'span 2' }}>
            <label>Observação</label>
            <textarea 
              rows={3} 
              placeholder='Descrição opcional da transação…'
              value={formData.observacao}
              onChange={(e) => handleFormChange('observacao', e.target.value)}
            />
          </div>
          <button 
            type='submit' 
            className='btn' 
            style={{ gridColumn: 'span 2', justifyContent: 'center' }}
            disabled={saving}
          >
            {saving ? 'Salvando...' : editingId ? 'Atualizar Transação' : 'Salvar Transação'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

