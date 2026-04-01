import { type ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface MfdTooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}

export function MfdTooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function MfdTooltip({ children, content, side = 'top', delayDuration }: MfdTooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          style={{
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontFamily: 'var(--mfd-font-sans)',
            color: 'var(--mfd-text)',
            background: 'var(--mfd-bg-3)',
            border: '1px solid var(--mfd-border)',
            borderRadius: 'var(--mfd-rad-md)',
            boxShadow: 'var(--mfd-shadow-md)',
            zIndex: 50,
            maxWidth: 280,
            lineHeight: 1.4,
            animation: 'mfd-fadein var(--mfd-motion-fast)',
          }}
        >
          {content}
          <TooltipPrimitive.Arrow
            style={{ fill: 'var(--mfd-bg-3)' }}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
