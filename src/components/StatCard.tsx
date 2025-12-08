import { memo, type ReactNode } from 'react';
import { cn } from './ui/utils';

export type StatCardColor = 'emerald' | 'blue' | 'red' | 'purple' | 'amber' | 'cyan';

interface StatCardProps {
  title: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  color?: StatCardColor;
}

const COLOR_STYLES: Record<StatCardColor, { icon: string; helper: string }> = {
  emerald: {
    icon: 'border-brand-emerald/40 bg-brand-emerald/15 text-brand-emerald',
    helper: 'text-brand-emerald/70',
  },
  blue: {
    icon: 'border-sky-400/40 bg-sky-400/15 text-sky-300',
    helper: 'text-sky-200/80',
  },
  red: {
    icon: 'border-rose-400/40 bg-rose-400/15 text-rose-300',
    helper: 'text-rose-200/80',
  },
  purple: {
    icon: 'border-violet-400/40 bg-violet-400/15 text-violet-200',
    helper: 'text-violet-200/80',
  },
  amber: {
    icon: 'border-[#ffb347]/40 bg-[#ff8a00]/20 text-[#ffe6b8]',
    helper: 'text-[#ffd36b]',
  },
  cyan: {
    icon: 'border-cyan-400/40 bg-cyan-400/15 text-cyan-200',
    helper: 'text-cyan-100/80',
  },
};

const STAT_CARD_BASE =
  'rounded-lg border border-white/5 bg-[#10322e] p-5 text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-glow';

function StatCard({ title, value, helper, icon, color = 'purple' }: StatCardProps) {
  const style = COLOR_STYLES[color];

  return (
    <div className={STAT_CARD_BASE}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">{title}</p>
        {icon && (
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl border text-lg',
              style.icon
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      {helper && <p className={cn('mt-2 text-sm font-medium', style.helper)}>{helper}</p>}
    </div>
  );
}

// Memoizar para evitar re-renders desnecessários quando props não mudam
export default memo(StatCard);

