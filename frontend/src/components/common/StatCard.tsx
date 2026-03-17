import type { ReactNode } from 'react';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  valueColor?: string;
}

export default function StatCard({ title, value, subtitle, icon, valueColor }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__header">
        <span className="stat-card__title">{title}</span>
        {icon && <span className="stat-card__icon">{icon}</span>}
      </div>
      <div className="stat-card__value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      {subtitle && <div className="stat-card__subtitle">{subtitle}</div>}
    </div>
  );
}
