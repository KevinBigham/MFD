import { type CSSProperties, type ReactNode } from 'react';

interface MfdKpiGridProps {
  children: ReactNode;
  columns?: number;
  className?: string;
  style?: CSSProperties;
}

export function MfdKpiGrid({ children, columns = 4, className, style }: MfdKpiGridProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 'var(--mfd-sp-md)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
