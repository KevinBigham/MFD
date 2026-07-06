import { type CSSProperties, type ReactNode } from 'react';
import { PixelModal } from '../PixelModal';

export interface MfdDialogProps {
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
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      width={width}
      className={className}
      style={style}
    >
      {children}
    </PixelModal>
  );
}
