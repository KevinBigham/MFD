import { useState } from 'react';
import { PixelButton } from '@mfd/design-system/components';
import { monoSm, pixelSm } from '../shared/pixelUi';

export function getNextTeachingTipIndex(currentIndex: number, totalTips: number): number {
  if (totalTips <= 0) return 0;
  return (currentIndex + 1) % totalTips;
}

export function TeachingTooltip({
  tips,
  agmName,
  agmAccent,
}: {
  tips: string[];
  agmName: string;
  agmAccent: string;
}) {
  const [tipIndex, setTipIndex] = useState(0);

  if (tips.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        border: `2px solid ${agmAccent}`,
        background: 'var(--mfd-bg-2)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ ...pixelSm, color: agmAccent }}>{`${agmName.toUpperCase()} SAYS:`}</div>
      <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{tips[tipIndex] ?? ''}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>
          {tipIndex + 1} / {tips.length}
        </div>
        <PixelButton
          accent="gold"
          onClick={() => setTipIndex((currentIndex) => getNextTeachingTipIndex(currentIndex, tips.length))}
        >
          NEXT TIP
        </PixelButton>
      </div>
    </div>
  );
}
