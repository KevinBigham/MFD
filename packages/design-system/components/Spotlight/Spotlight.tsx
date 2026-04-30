import { useEffect, useState, type RefObject } from 'react';
import './Spotlight.css';

export interface SpotlightProps {
  targetId: string | null;
  targetRef?: RefObject<HTMLElement | null>;
  showCaret?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

const SPOTLIGHT_PADDING_PX = 6;
const SPOTLIGHT_CARET_SPACE_PX = 32;

function resolveCaretPlacement(rect: DOMRect): 'above' | 'below' {
  return rect.top < SPOTLIGHT_CARET_SPACE_PX ? 'below' : 'above';
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function queryTarget(targetId: string | null): HTMLElement | null {
  if (!targetId || typeof document === 'undefined') {
    return null;
  }
  return document.querySelector(
    `[data-spotlight-target="${escapeAttributeValue(targetId)}"]`,
  ) as HTMLElement | null;
}

function ensureTargetAccessibility(target: HTMLElement): void {
  target.setAttribute('aria-current', 'step');
  target.classList.add('mfd-spotlight-target');

  if (target.querySelector('[data-mfd-spotlight-label="true"]')) {
    return;
  }

  const label = target.ownerDocument.createElement('span');
  label.className = 'mfd-spotlight__sr-only';
  label.textContent = 'Next action';
  label.setAttribute('data-mfd-spotlight-label', 'true');
  target.insertBefore(label, target.firstChild);
}

export function Spotlight({
  targetId,
  targetRef,
  showCaret = true,
  reducedMotion = false,
  className,
}: SpotlightProps) {
  const [mountedTarget, setMountedTarget] = useState<HTMLElement | null>(null);
  const target = targetRef?.current ?? queryTarget(targetId) ?? mountedTarget;

  useEffect(() => {
    setMountedTarget(targetRef?.current ?? queryTarget(targetId));
  }, [targetId, targetRef]);

  if (!target) {
    return null;
  }

  ensureTargetAccessibility(target);

  const rect = target.getBoundingClientRect();
  const classes = ['mfd-spotlight', className].filter(Boolean).join(' ');
  const style = {
    top: `${rect.top - SPOTLIGHT_PADDING_PX}px`,
    left: `${rect.left - SPOTLIGHT_PADDING_PX}px`,
    width: `${rect.width + SPOTLIGHT_PADDING_PX * 2}px`,
    height: `${rect.height + SPOTLIGHT_PADDING_PX * 2}px`,
  };

  return (
    <span
      className={classes}
      data-mfd-spotlight="true"
      data-spotlight-motion={reducedMotion ? 'reduced' : 'animated'}
      data-spotlight-caret={resolveCaretPlacement(rect)}
      style={style}
      aria-hidden="true"
    >
      <span className="mfd-spotlight__ring" />
      {showCaret && !reducedMotion ? <span className="mfd-spotlight__caret">↓</span> : null}
    </span>
  );
}
