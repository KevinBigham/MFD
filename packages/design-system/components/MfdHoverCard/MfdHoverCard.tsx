import { type ReactNode } from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';

interface MfdHoverCardProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  openDelay?: number;
  closeDelay?: number;
}

export function MfdHoverCard({
  children,
  content,
  side = 'bottom',
  openDelay = 200,
  closeDelay = 100,
}: MfdHoverCardProps) {
  return (
    <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardPrimitive.Trigger asChild>
        {children}
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side={side}
          sideOffset={8}
          style={{
            padding: 'var(--mfd-sp-md)',
            fontFamily: 'var(--mfd-font-sans)',
            fontSize: '0.8125rem',
            color: 'var(--mfd-text)',
            background: 'var(--mfd-gradient-card)',
            border: '1px solid var(--mfd-border)',
            borderRadius: 'var(--mfd-rad-lg)',
            boxShadow: 'var(--mfd-shadow-lg)',
            zIndex: 50,
            maxWidth: 340,
            lineHeight: 1.5,
            animation: 'mfd-slideIn var(--mfd-motion-normal)',
          }}
        >
          {content}
          <HoverCardPrimitive.Arrow
            style={{ fill: 'var(--mfd-bg-3)' }}
          />
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
