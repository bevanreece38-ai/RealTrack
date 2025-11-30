import { useState, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, getMonth, setYear, setMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  onClose?: () => void;
  alignLeft?: boolean; // Se true, alinha à esquerda (para filtros)
}

export default function DatePicker({ value, onChange, onClose, alignLeft = false }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => value ? new Date(value) : new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => value ? new Date(value) : null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Gerar dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Navegação
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    const formattedDate = format(day, 'yyyy-MM-dd');
    onChange(formattedDate);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
    onChange(format(today, 'yyyy-MM-dd'));
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
  };

  const handleOK = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  // Gerar anos para o seletor
  const currentYear = getYear(currentMonth);
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
  };

  // Formatar data selecionada
  const formatDatePT = (date: Date) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate());
    const month = months[date.getMonth()];
    return `${dayName}, ${day} de ${month}`;
  };

  const formattedSelectedDate = selectedDate
    ? formatDatePT(selectedDate)
    : 'Selecione uma data';

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute',
        top: alignLeft ? '50%' : '100%',
        left: alignLeft ? 'auto' : 0,
        right: alignLeft ? '100%' : 'auto',
        transform: alignLeft ? 'translateY(-50%)' : 'none',
        marginTop: alignLeft ? 0 : '8px',
        marginRight: alignLeft ? '8px' : 0,
        background: 'var(--surface)',
        borderRadius: '10px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        width: '360px',
        maxWidth: '90vw',
        border: '1px solid var(--border)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
      className="date-picker-container"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Seção Esquerda - Data Selecionada */}
      <div
        className="date-picker-left-panel"
        style={{
          width: '130px',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.6rem',
              color: 'var(--muted)',
              fontWeight: 500,
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Selecione a data
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: '1.2',
              marginBottom: '2px'
            }}
          >
            {formattedSelectedDate}
          </div>
        </div>
      </div>

      {/* Seção Direita - Calendário */}
      <div
        style={{
          flex: 1,
          padding: '10px',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header do Calendário */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={getMonth(currentMonth)}
              onChange={(e) => {
                handleMonthSelect(Number(e.target.value));
              }}
              className="date-picker-select date-picker-month-select"
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text)',
                cursor: 'pointer',
                outline: 'none',
                padding: '2px 4px',
                borderRadius: '6px',
                transition: 'background 0.2s'
              }}
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                  {month}
                </option>
              ))}
            </select>
            <div style={{ position: 'relative' }}>
              <select
                value={currentYear}
                onChange={(e) => {
                  handleYearSelect(Number(e.target.value));
                }}
                className="date-picker-select date-picker-year-select"
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  paddingRight: '20px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  minWidth: '60px'
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span
                className="date-picker-year-arrow"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  fontSize: '0.55rem',
                  color: 'var(--muted)'
                }}
              >
                ▼
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="date-picker-nav-btn"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s',
                color: 'var(--muted)'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="date-picker-nav-btn"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s',
                color: 'var(--muted)'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Dias da Semana */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            marginBottom: '4px'
          }}
        >
          {weekDays.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '0.6rem',
                fontWeight: 600,
                color: 'var(--muted)',
                padding: '3px 2px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid de Dias */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            marginBottom: '8px',
            flex: 1
          }}
        >
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={format(day, 'yyyy-MM-dd')}
                type="button"
                onClick={() => {
                  handleDateSelect(day);
                }}
                style={{
                  border: 'none',
                  background: isSelected
                    ? 'var(--bank-color, #3b82f6)'
                    : isToday
                    ? 'var(--bank-color-light, rgba(59, 130, 246, 0.1))'
                    : 'transparent',
                  color: isSelected
                    ? 'white'
                    : isCurrentMonth
                    ? 'var(--text)'
                    : 'var(--muted)',
                  borderRadius: '6px',
                  padding: '6px 2px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 700 : isToday ? 600 : 500,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    const root = getComputedStyle(document.documentElement);
                    const bankColorLight = root.getPropertyValue('--bank-color-light').trim() || 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.background = bankColorLight.replace('0.1', '0.15');
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    const root = getComputedStyle(document.documentElement);
                    const bankColorLight = root.getPropertyValue('--bank-color-light').trim() || 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.background = isToday ? bankColorLight : 'transparent';
                  }
                }}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Botões Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '1px solid var(--border)',
            marginTop: 'auto'
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            className="date-picker-footer-btn"
            style={{
              border: 'none',
              background: 'transparent',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            Limpar
          </button>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={handleToday}
              className="date-picker-footer-btn"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="date-picker-footer-btn"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOK}
              style={{
                border: 'none',
                background: 'var(--bank-color, #3b82f6)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '4px 14px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px var(--bank-color-accent, rgba(59, 130, 246, 0.3))'
              }}
              onMouseEnter={(e) => {
                const root = getComputedStyle(document.documentElement);
                const bankColorDark = root.getPropertyValue('--bank-color-dark').trim() || '#2563eb';
                const bankColorAccent = root.getPropertyValue('--bank-color-accent').trim() || 'rgba(59, 130, 246, 0.4)';
                e.currentTarget.style.background = bankColorDark;
                e.currentTarget.style.boxShadow = `0 4px 12px ${bankColorAccent}`;
              }}
              onMouseLeave={(e) => {
                const root = getComputedStyle(document.documentElement);
                const bankColor = root.getPropertyValue('--bank-color').trim() || '#3b82f6';
                const bankColorAccent = root.getPropertyValue('--bank-color-accent').trim() || 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.background = bankColor;
                e.currentTarget.style.boxShadow = `0 2px 8px ${bankColorAccent}`;
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

