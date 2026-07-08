import { type CSSProperties, type ReactNode } from 'react';
import { PixelBadge } from '../PixelBadge';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gold' | 'purple';

export interface MfdBadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
}

const variantMap: Record<BadgeVariant, Parameters<typeof PixelBadge>[0]['variant']> = {
  default: 'default',
  success: 'green',
  danger: 'red',
  warning: 'gold',
  info: 'cyan',
  gold: 'gold',
  purple: 'cyan',
};

export function MfdBadge({ children, variant = 'default', size = 'sm', className, style }: MfdBadgeProps) {
  return (
    <PixelBadge
      variant={variantMap[variant]}
      className={className}
      style={{
        ...(size === 'md' ? { minHeight: '24px', padding: '4px 9px' } : null),
        ...style,
      }}
    >
      {children}
    </PixelBadge>
  );
}
