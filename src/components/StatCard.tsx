import { memo, type ReactNode } from 'react';

export type StatCardColor = 'emerald' | 'blue' | 'red' | 'purple' | 'amber' | 'cyan';

interface StatCardProps {
  title: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  color?: StatCardColor;
}

function StatCard({ title, value, helper, icon, color = 'purple' }: StatCardProps) {
  return (
    <div className={`stat-card-new stat-card-new--${color}`}>
      <div className="stat-card-new__header">
        <p className="stat-card-new__title">{title}</p>
        {icon && <span className={`stat-card-new__icon stat-card-new__icon--${color}`}>{icon}</span>}
      </div>
      <p className="stat-card-new__value">{value}</p>
      {helper && <p className="stat-card-new__helper">{helper}</p>}
    </div>
  );
}

// Memoizar para evitar re-renders desnecessários quando props não mudam
export default memo(StatCard);

