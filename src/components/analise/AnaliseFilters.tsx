import { Filter } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { CASAS_APOSTAS } from '../../constants/casasApostas';
import { STATUS_APOSTAS } from '../../constants/statusApostas';
import { useTipsters } from '../../hooks/useTipsters';
import DateInput from '../DateInput';
import FilterPopover from '../FilterPopover';
import type { AnaliseFilters } from '../../types/AnaliseFilters';

interface AnaliseFiltersProps {
  value: AnaliseFilters;
  onChange: (next: AnaliseFilters) => void;
}

const initialFilters: AnaliseFilters = {
  status: '',
  tipster: '',
  casa: '',
  esporte: '',
  evento: '',
  dataInicio: '',
  dataFim: '',
  oddMin: '',
  oddMax: '',
};

export function AnaliseFilters({ value, onChange }: AnaliseFiltersProps) {
  const { tipsters } = useTipsters();
  const [open, setOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<AnaliseFilters>(value);

  const handleFilterChange = useCallback(
    <K extends keyof AnaliseFilters>(field: K, fieldValue: AnaliseFilters[K]) => {
      setPendingFilters((prev) => ({ ...prev, [field]: fieldValue }));
    },
    [],
  );

  const handleApply = useCallback(() => {
    onChange(pendingFilters);
    setOpen(false);
  }, [onChange, pendingFilters]);

  const handleClear = useCallback(() => {
    setPendingFilters(initialFilters);
    onChange(initialFilters);
    setOpen(false);
  }, [onChange]);

  const activeFiltersCount = useMemo(
    () => Object.values(pendingFilters).filter((filterValue) => filterValue !== '').length,
    [pendingFilters],
  );

  return (
    <div className="filter-trigger-wrapper">
      <button
        type="button"
        className="filter-trigger"
        onClick={() => {
          setPendingFilters(value);
          setOpen((prev) => !prev);
        }}
      >
        <Filter size={16} /> Filtros{' '}
        {activeFiltersCount > 0 && <span className="filter-count">{activeFiltersCount}</span>}
      </button>
      <FilterPopover
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        onClear={handleClear}
        footer={
          <button type="button" className="btn" onClick={handleApply}>
            Aplicar Filtros
          </button>
        }
      >
        <div className="filters-panel filters-panel--plain filters-panel--two">
          <div className="field">
            <label>Status</label>
            <select
              value={pendingFilters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
            >
              <option value="" disabled hidden>
                Selecione um status
              </option>
              {STATUS_APOSTAS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipsters</label>
            <select
              value={pendingFilters.tipster}
              onChange={(event) => handleFilterChange('tipster', event.target.value)}
            >
              <option value="" disabled hidden>
                Selecione…
              </option>
              {tipsters
                .filter((tipster) => tipster.ativo)
                .map((tipster) => (
                  <option key={tipster.id} value={tipster.nome}>
                    {tipster.nome}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label>Casa de Apostas</label>
            <select
              value={pendingFilters.casa}
              onChange={(event) => handleFilterChange('casa', event.target.value)}
            >
              <option value="" disabled hidden>
                Selecione a casa
              </option>
              {CASAS_APOSTAS.map((casa) => (
                <option key={casa} value={casa}>
                  {casa}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Evento, Mercado, Aposta, País ou Torneio</label>
            <input
              type="text"
              value={pendingFilters.evento}
              onChange={(event) => handleFilterChange('evento', event.target.value)}
              placeholder="Digite o nome do evento, mercado ou aposta"
            />
          </div>
          <div className="field">
            <label>Data do Jogo (De)</label>
            <DateInput
              value={pendingFilters.dataInicio}
              onChange={(dateValue) => handleFilterChange('dataInicio', dateValue)}
              placeholder="dd/mm/aaaa"
              className="date-input-modern date-input-analise"
            />
          </div>
          <div className="field">
            <label>Data do Jogo (Até)</label>
            <DateInput
              value={pendingFilters.dataFim}
              onChange={(dateValue) => handleFilterChange('dataFim', dateValue)}
              placeholder="dd/mm/aaaa"
              className="date-input-modern date-input-analise"
            />
            <p className="field-hint">
              Se só preencher &quot;De&quot;, será filtrado apenas nesta data. Se preencher &quot;Até&quot;, será
              considerado como intervalo.
            </p>
          </div>
          <div className="field">
            <label>ODD</label>
            <div className="field-inline">
              <input
                type="number"
                value={pendingFilters.oddMin}
                onChange={(event) => handleFilterChange('oddMin', event.target.value)}
                placeholder="Mínimo"
                step="0.01"
              />
              <input
                type="number"
                value={pendingFilters.oddMax}
                onChange={(event) => handleFilterChange('oddMax', event.target.value)}
                placeholder="Máximo"
                step="0.01"
              />
            </div>
          </div>
        </div>
      </FilterPopover>
    </div>
  );
}

export default AnaliseFilters;


