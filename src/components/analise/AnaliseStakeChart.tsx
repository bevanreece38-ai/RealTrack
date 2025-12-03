import { ResponsiveContainer } from 'recharts';
import { chartCardInteractiveClass, chartTitleClass } from './chartStyles';

// Placeholder de componente para futuras extensões de stake.
// Mantido simples para não alterar comportamento atual da página.

export function AnaliseStakeChart() {
  return (
    <div className={chartCardInteractiveClass}>
      <h3 className={chartTitleClass}>Stake</h3>
      <ResponsiveContainer width="100%" height={260} minWidth={200} minHeight={200}>
        <div className="flex h-full items-center justify-center text-sm font-medium text-foreground-muted">
          Em breve
        </div>
      </ResponsiveContainer>
    </div>
  );
}

export default AnaliseStakeChart;


