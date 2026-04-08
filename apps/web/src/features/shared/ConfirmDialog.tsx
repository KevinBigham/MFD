import { PixelButton, PixelModal } from '@mfd/design-system/components';
import { mono } from './pixelUi';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  accent?: 'default' | 'gold' | 'cyan' | 'green' | 'red';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  accent = 'red',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <PixelModal
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}
      title={title}
      accent={accent}
      width={400}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ ...mono, color: 'var(--mfd-text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <PixelButton accent="default" onClick={onCancel}>
            {cancelLabel}
          </PixelButton>
          <PixelButton accent={accent} onClick={onConfirm}>
            {confirmLabel}
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
