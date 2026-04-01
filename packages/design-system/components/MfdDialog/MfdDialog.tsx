import { type CSSProperties, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface MfdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title: string;
  description?: string;
  width?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function MfdDialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  width = 480,
  className,
  style,
}: MfdDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 30,
            animation: 'mfd-fadein var(--mfd-motion-fast)',
          }}
        />
        <DialogPrimitive.Content
          className={className}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
            background: 'var(--mfd-surface)',
            border: '1px solid var(--mfd-border)',
            borderRadius: 'var(--mfd-rad-xl)',
            boxShadow: 'var(--mfd-shadow-lg)',
            zIndex: 31,
            animation: 'mfd-slideIn var(--mfd-motion-normal)',
            ...style,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--mfd-sp-md) var(--mfd-sp-lg)',
            borderBottom: '1px solid var(--mfd-border)',
          }}>
            <div>
              <DialogPrimitive.Title style={{
                fontSize: '0.875rem',
                fontFamily: 'var(--mfd-font-sans)',
                fontWeight: 600,
                color: 'var(--mfd-text)',
                margin: 0,
              }}>
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description style={{
                  fontSize: '0.75rem',
                  color: 'var(--mfd-text-dim)',
                  margin: '4px 0 0',
                }}>
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                border: '1px solid var(--mfd-border)',
                borderRadius: 'var(--mfd-rad-sm)',
                background: 'transparent',
                color: 'var(--mfd-text-dim)',
                cursor: 'pointer',
                transition: 'color var(--mfd-motion-fast), border-color var(--mfd-motion-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--mfd-text)';
                e.currentTarget.style.borderColor = 'var(--mfd-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--mfd-text-dim)';
                e.currentTarget.style.borderColor = 'var(--mfd-border)';
              }}
            >
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <div style={{ padding: 'var(--mfd-sp-lg)' }}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
