import { ResponsiveContainer } from 'recharts';

// Placeholder de componente para futuras extensões de stake.
// Mantido simples para não alterar comportamento atual da página.

export function AnaliseStakeChart() {
  return (
    <div className="chart-card">
      <h3 className="chart-title">Stake</h3>
      <ResponsiveContainer width="100%" height={260}>
        <div className="chart-empty" />
      </ResponsiveContainer>
    </div>
  );
}

export default AnaliseStakeChart;


