import { Filter, Loader2, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateInput from '../components/DateInput';
import FilterPopover from '../components/FilterPopover';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import { financeiroService, type TipoTransacao } from '../services/api';
import { useBancas } from '../hooks/useBancas';
import {
  formatCurrency,
  formatDate,
  formatDateDisplay,
  getTodayDateISO,
  normalizeDisplayToISO,
  toISODate,
} from '../utils/formatters';
import {
  type ApiError,
  type ApiFinancialSummary,
  type ApiFinancialTransaction,
} from '../types/api';
import { cn } from '../components/ui/utils';

type TipoFiltro = TipoTransacao | '';

interface FinanceiroFilters {
  bancaId: string;
  tipo: TipoFiltro;
  casa: string;
  dataDe: string;
  dataAte: string;
  observacao: string;
}

const initialFilters: FinanceiroFilters = {
  bancaId: '',
  tipo: '',
  casa: '',
  dataDe: '',
  dataAte: '',
  observacao: '',
};

interface FinanceiroFormData {
  bancaId: string;
  tipo: TipoFiltro;
  casaDeAposta: string;
  valor: string;
  dataTransacao: string;
  observacao: string;
}

const createDefaultFormData = (bancaId = '', date = getTodayDateISO()): FinanceiroFormData => ({
  bancaId,
  tipo: '',
  casaDeAposta: '',
  valor: '',
  dataTransacao: date,
  observacao: '',
});

const sectionCardClass =
  'rounded-3xl border border-border/30 bg-background-card/80 p-6 shadow-card backdrop-blur-sm';
const dashboardCardShellClass =
  'rounded-lg border border-white/5 bg-[#0f2d29] p-6 text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm';
const sectionLabelClass = 'text-2xs uppercase tracking-[0.3em] text-foreground-muted';
const inputClass =
  'w-full rounded-2xl border border-border/40 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const headerGhostButtonClass =
  'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-brand-emerald/50 hover:text-brand-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const headerPrimaryButtonClass =
  'inline-flex items-center gap-2 rounded-full border border-brand-emerald/60 bg-brand-emerald/15 px-4 py-2 text-sm font-semibold text-brand-emerald transition hover:bg-brand-emerald/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const tableActionButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/80 transition hover:border-brand-emerald/40 hover:bg-white/10 hover:text-brand-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const tableActionButtonDangerClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40';

const emptyStats: ApiFinancialSummary = {
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
  porCasa: {},
};

export default function Financeiro() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { bancas } = useBancas();
  const preferredBancaId = useMemo(() => {
    if (bancas.length === 0) {
      return '';
    }
    const padrao = bancas.find((banca) => banca.padrao);
    return padrao?.id ?? bancas[0].id;
  }, [bancas]);
  const [transacoes, setTransacoes] = useState<ApiFinancialTransaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<ApiFinancialSummary>(emptyStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [formData, setFormData] = useState<FinanceiroFormData>(() => createDefaultFormData());
  const [manualDateInput, setManualDateInput] = useState(() => formatDateDisplay(getTodayDateISO()));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingFilters, setPendingFilters] = useState<FinanceiroFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FinanceiroFilters>(initialFilters);
  const autoSyncBancaRef = useRef(true);
  const resolvedBancaId = useMemo(
    () => appliedFilters.bancaId || preferredBancaId || (bancas[0]?.id ?? ''),
    [appliedFilters.bancaId, preferredBancaId, bancas],
  );

  useEffect(() => {
    const fallbackId = preferredBancaId || bancas[0]?.id || '';
    if (!fallbackId) {
      return;
    }

    const syncFilters = (prev: FinanceiroFilters): FinanceiroFilters => {
      const bancaExists = prev.bancaId ? bancas.some((banca) => banca.id === prev.bancaId) : false;
      const shouldForceSync = !prev.bancaId || !bancaExists || autoSyncBancaRef.current;

      if (!shouldForceSync && prev.bancaId === fallbackId) {
        autoSyncBancaRef.current = true;
        return prev;
      }

      if (!shouldForceSync) {
        return prev;
      }

      if (prev.bancaId === fallbackId) {
        autoSyncBancaRef.current = true;
        return prev;
      }

      autoSyncBancaRef.current = true;
      return { ...prev, bancaId: fallbackId };
    };

    setPendingFilters(syncFilters);
    setAppliedFilters(syncFilters);
  }, [preferredBancaId, bancas]);

  useEffect(() => {
    if (!resolvedBancaId) {
      return;
    }
    setFormData((prev) => {
      const exists = prev.bancaId && bancas.some((banca) => banca.id === prev.bancaId);
      if (exists || prev.bancaId === resolvedBancaId) {
        return prev;
      }
      return { ...prev, bancaId: resolvedBancaId };
    });
  }, [resolvedBancaId, bancas]);

  const fetchTransacoes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!appliedFilters.bancaId) {
        setTransacoes([]);
        return;
      }

      const filters = {
        bancaId: appliedFilters.bancaId,
        tipo: appliedFilters.tipo || undefined,
        casaDeAposta: appliedFilters.casa || undefined,
        observacao: appliedFilters.observacao || undefined,
        dataInicio:
          appliedFilters.dataDe && !appliedFilters.dataAte ? appliedFilters.dataDe : appliedFilters.dataDe || undefined,
        dataFim:
          appliedFilters.dataDe && !appliedFilters.dataAte ? appliedFilters.dataDe : appliedFilters.dataAte || undefined,
      };

      const data = await financeiroService.getTransacoes(filters);
      setTransacoes(data);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
      setTransacoes([]);
      setError('Erro ao carregar transações. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  const fetchStats = useCallback(async () => {
    if (!appliedFilters.bancaId) {
      setStatsData(emptyStats);
      setStatsLoading(false);
      return;
    }

    try {
      setError(null);
      setStatsLoading(true);
      const data = await financeiroService.getSaldoGeral({ bancaId: appliedFilters.bancaId });
      setStatsData(data);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      setStatsData(emptyStats);
      setError('Erro ao carregar estatísticas. Tente recarregar a página.');
    } finally {
      setStatsLoading(false);
    }
  }, [appliedFilters.bancaId]);

  useEffect(() => {
    void fetchTransacoes();
    void fetchStats();
  }, [fetchTransacoes, fetchStats]);

  useEffect(() => {
    if (appliedFilters.bancaId) {
      setStatsLoading(true);
    }
  }, [appliedFilters]);

  const handleFormChange = <K extends keyof FinanceiroFormData>(field: K, value: FinanceiroFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as string]) {
      setFormErrors((prev) => ({ ...prev, [field as string]: '' }));
    }
  };

  const handleFilterChange = <K extends keyof FinanceiroFilters>(field: K, value: FinanceiroFilters[K]) => {
    if (field === 'bancaId') {
      autoSyncBancaRef.current = false;
    }
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    const bancaId = pendingFilters.bancaId || appliedFilters.bancaId || resolvedBancaId;
    const reset = { ...initialFilters, bancaId }; // mantém a banca atual e limpa o restante
    autoSyncBancaRef.current = true;
    setPendingFilters(reset);
    setAppliedFilters(reset);
    setFiltersOpen(false);
  };

  const activeFiltersCount = useMemo(
    () =>
      Object.entries(appliedFilters).filter(([key, value]) => key !== 'bancaId' && value !== '').length,
    [appliedFilters],
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
      errors.casaDeAposta = 'Selecione uma casa';
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const tipo = formData.tipo as TipoTransacao;
      const dataTransacaoISO = formData.dataTransacao || getTodayDateISO();

      const dataToSend = {
        bancaId: formData.bancaId,
        tipo,
        casaDeAposta: formData.casaDeAposta,
        valor: parseFloat(formData.valor),
        dataTransacao: `${dataTransacaoISO}T00:00:00`,
        observacao: formData.observacao.trim() === '' ? undefined : formData.observacao,
      };

      if (editingId) {
        await financeiroService.updateTransacao(editingId, dataToSend);
      } else {
        await financeiroService.createTransacao(dataToSend);
      }

      const today = getTodayDateISO();
      setFormData(createDefaultFormData(resolvedBancaId, today));
      setManualDateInput(formatDateDisplay(today));
      setFormErrors({});
      setEditingId(null);
      setModalOpen(false);

      await fetchTransacoes();
      await fetchStats();
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
      const apiError = err as ApiError;
      const errorData = apiError.response?.data?.error;

      if (errorData) {
        const message = Array.isArray(errorData)
          ? errorData
            .map((entry) => entry.message?.trim())
            .filter((entry): entry is string => Boolean(entry && entry.length > 0))
            .join(', ') || 'Erro desconhecido.'
          : typeof errorData === 'string'
            ? errorData
            : 'Erro desconhecido.';
        alert(`Erro ao salvar transação: ${message}`);
      } else {
        showToast('Erro ao salvar transação. Tente novamente.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    const today = getTodayDateISO();
    setFormData(createDefaultFormData(resolvedBancaId, today));
    setManualDateInput(formatDateDisplay(today));
    setFormErrors({});
    setEditingId(null);
    setModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    const today = getTodayDateISO();
    setFormData(createDefaultFormData(resolvedBancaId, today));
    setManualDateInput(formatDateDisplay(today));
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
      observacao: transacao.observacao ?? '',
    });
    setManualDateInput(formatDateDisplay(toISODate(transacao.dataTransacao)));
    setFormErrors({});
    setModalOpen(true);
  };

  const handleDeleteTransacao = async (transacao: ApiFinancialTransaction) => {
    if (!window.confirm('Deseja remover esta transação?')) {
      return;
    }

    try {
      await financeiroService.deleteTransacao(transacao.id);
      await fetchTransacoes();
      await fetchStats();
    } catch (err) {
      console.error('Erro ao deletar transação', err);
      showToast('Não foi possível remover a transação.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Financeiro</h1>
            <p className="text-sm text-foreground-muted">Gerencie transações e saldos por banca.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={headerGhostButtonClass}
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className="h-4 w-4" />
              FILTROS
            </button>
            <button
              type="button"
              className={headerPrimaryButtonClass}
              onClick={handleOpenCreateModal}
            >
              <Plus className="h-4 w-4" />
              NOVA TRANSAÇÃO
            </button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        {statsLoading ? (
          <>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={cn(dashboardCardShellClass, 'animate-pulse space-y-4 text-white')}
              >
                <div className="h-5 w-32 rounded-full bg-white/10" />
                <div className="h-10 w-40 rounded-full bg-white/10" />
                <div className="space-y-3">
                  <div className="h-4 w-full rounded-full bg-white/5" />
                  <div className="h-4 w-3/4 rounded-full bg-white/5" />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className={cn(dashboardCardShellClass, 'bg-bank-hero text-white shadow-[0_35px_55px_rgba(0,0,0,0.35)]')}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/70">Saldo Atual</p>
                  <p className="mt-3 text-4xl font-semibold text-white">{formatCurrency(statsData.saldoAtual)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-white">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 text-sm text-white/80">
                  <p>Total Depositado</p>
                  <p className="text-xl font-semibold text-white">{formatCurrency(statsData.totalDepositado)}</p>
                </div>
                <div className="space-y-1 text-sm text-white/80">
                  <p>Total Sacado</p>
                  <p className="text-xl font-semibold text-white">{formatCurrency(Math.abs(statsData.totalSacado))}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-white/75">
                {statsData.totalTransacoes}{' '}
                {statsData.totalTransacoes === 1 ? 'transação registrada' : 'transações registradas'}
              </div>
            </div>

            <div className={dashboardCardShellClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/60">Resultado de Apostas</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(statsData.resultadoApostas)}</p>
                  <p className="mt-4 text-sm text-white/70">Apostas/saldo recebidas</p>
                </div>
                <span className="text-xs font-semibold text-brand-emerald">
                  {statsData.apostasConcluidas}{' '}
                  {statsData.apostasConcluidas === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
            </div>

            <div className={dashboardCardShellClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/60">Apostas Pendentes</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(statsData.valorApostasPendentes)}</p>
                  <p className="mt-4 text-sm text-white/70">Aguardando resultado</p>
                </div>
                <span className="text-xs font-semibold text-amber-300">
                  {statsData.apostasPendentes}{' '}
                  {statsData.apostasPendentes === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
            </div>
          </>
        )}
      </section>

      {error && (
        <div className={cn(sectionCardClass, 'border-danger/30 bg-danger/5 text-sm text-danger')}>
          {error}
        </div>
      )}

      <section className={cn(dashboardCardShellClass, 'space-y-6')}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Gerenciar Transações Financeiras</h2>
            <p className="text-sm text-white/70">Visualize depósitos e saques registrados.</p>
          </div>
          <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            {transacoes.length} {transacoes.length === 1 ? 'transação' : 'transações'}
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-white/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : transacoes.length === 0 ? (
          <EmptyState title="Nenhuma transação" description="Cadastre um depósito ou saque para visualizar aqui." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full table-auto text-sm text-white">
              <thead className="bg-white/5 text-[0.7rem] uppercase tracking-[0.25em] text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Casa</th>
                  <th className="px-4 py-3 text-left">Valor</th>
                  <th className="px-4 py-3 text-left">Observação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {transacoes.map((transacao) => (
                  <tr key={transacao.id} className="text-white transition hover:bg-white/5">
                    <td className="px-4 py-4 font-medium">{formatDate(transacao.dataTransacao)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                          transacao.tipo === 'Depósito' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                        )}
                      >
                        {transacao.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-white/80">{transacao.casaDeAposta}</td>
                    <td
                      className={cn(
                        'px-4 py-4 font-semibold',
                        transacao.tipo === 'Depósito' ? 'text-emerald-300' : 'text-rose-300'
                      )}
                    >
                      {formatCurrency(transacao.valor)}
                    </td>
                    <td className="px-4 py-4 text-white/70">
                      {transacao.observacao?.trim() ? transacao.observacao : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={tableActionButtonClass}
                          onClick={() => handleEditTransacao(transacao)}
                          aria-label="Editar transação"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={tableActionButtonDangerClass}
                          onClick={() => handleDeleteTransacao(transacao)}
                          aria-label="Remover transação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={modalOpen}
        title={editingId ? 'Editar transação' : 'Nova transação'}
        onClose={handleCloseModal}
        size="lg"
      >
        <form className="space-y-5 text-foreground" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Banca</label>
              <select
                className={cn(inputClass, !formData.bancaId && 'text-foreground-muted')}
                value={formData.bancaId}
                onChange={(event) => handleFormChange('bancaId', event.target.value)}
              >
                <option value="">Selecione</option>
                {bancas.map((banca) => (
                  <option key={banca.id} value={banca.id}>
                    {banca.nome}
                  </option>
                ))}
              </select>
              {formErrors.bancaId && <p className="text-xs text-danger">{formErrors.bancaId}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de transação</label>
              <select
                className={cn(inputClass, !formData.tipo && 'text-foreground-muted')}
                value={formData.tipo}
                onChange={(event) => handleFormChange('tipo', event.target.value as TipoFiltro)}
              >
                <option value="">Selecione</option>
                <option value="Depósito">Depósito</option>
                <option value="Saque">Saque</option>
              </select>
              {formErrors.tipo && <p className="text-xs text-danger">{formErrors.tipo}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Casa de apostas</label>
              <select
                className={cn(inputClass, !formData.casaDeAposta && 'text-foreground-muted')}
                value={formData.casaDeAposta}
                onChange={(event) => handleFormChange('casaDeAposta', event.target.value)}
              >
                <option value="">Selecione</option>
                {CASAS_APOSTAS.map((casa) => (
                  <option key={casa} value={casa}>
                    {casa}
                  </option>
                ))}
              </select>
              {formErrors.casaDeAposta && <p className="text-xs text-danger">{formErrors.casaDeAposta}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor</label>
              <input
                className={inputClass}
                inputMode="decimal"
                value={formData.valor}
                onChange={(event) => handleFormChange('valor', event.target.value)}
                placeholder="0,00"
              />
              {formErrors.valor && <p className="text-xs text-danger">{formErrors.valor}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <DateInput
                value={manualDateInput}
                onChange={(value) => {
                  setManualDateInput(value);
                  const isoValue = normalizeDisplayToISO(value);
                  if (isoValue) {
                    handleFormChange('dataTransacao', isoValue);
                  }
                }}
                placeholder="dd/mm/aaaa"
                className={inputClass}
              />
              {formErrors.dataTransacao && <p className="text-xs text-danger">{formErrors.dataTransacao}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação</label>
              <input
                className={inputClass}
                value={formData.observacao}
                onChange={(event) => handleFormChange('observacao', event.target.value)}
                placeholder="Detalhes adicionais"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-2xl border border-border/40 px-4 py-2 text-sm text-foreground hocus:border-brand-emerald/40"
              onClick={handleCloseModal}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl border border-brand-emerald/40 bg-brand-emerald/10 px-4 py-2 text-sm font-semibold text-brand-emerald hocus:bg-brand-emerald/20"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando
                </>
              ) : (
                'Salvar transação'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


