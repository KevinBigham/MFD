import { useEffect, useMemo, useRef, useState } from 'react';
import { PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { FranchiseEra } from '@mfd/engine';
import { selectFranchiseEras, useGameStore } from '../../app/store/game-store';
import { useReducedMotionPreference } from '../shared/transitions/RouteTransition';
import { display, monoSm, pixelSm } from '../shared/pixelUi';

export interface EraTransitionSnapshot {
  id: string;
  name: string;
  summary: string;
  startYear: number;
  endYear: number | null;
}

export interface EraTransitionResolution {
  currentEra: EraTransitionSnapshot | null;
  previousEraId: string | null;
  firedEraIds: ReadonlySet<string>;
}

export function resolveEraTransitionEvent({
  currentEra,
  previousEraId,
  firedEraIds,
}: EraTransitionResolution): EraTransitionSnapshot | null {
  if (!currentEra || !previousEraId) return null;
  if (currentEra.id === previousEraId) return null;
  if (firedEraIds.has(currentEra.id)) return null;
  return currentEra;
}

function eraSnapshotId(era: FranchiseEra): string {
  return `${era.name}:${era.startYear}:${era.endYear ?? 'active'}`;
}

function toEraSnapshot(era: FranchiseEra | null): EraTransitionSnapshot | null {
  if (!era) return null;
  return {
    id: eraSnapshotId(era),
    name: era.name,
    summary: era.description,
    startYear: era.startYear,
    endYear: era.endYear,
  };
}

function latestEraSnapshot(eras: FranchiseEra[]): EraTransitionSnapshot | null {
  const latest = [...eras].sort((left, right) => {
    const rightEnd = right.endYear ?? Number.MAX_SAFE_INTEGER;
    const leftEnd = left.endYear ?? Number.MAX_SAFE_INTEGER;
    if (rightEnd !== leftEnd) return rightEnd - leftEnd;
    return right.startYear - left.startYear;
  })[0] ?? null;

  return toEraSnapshot(latest);
}

export function EraTransitionEmitterView({
  transition,
  reducedMotion,
  onDismiss,
}: {
  transition: EraTransitionSnapshot | null;
  reducedMotion: boolean;
  onDismiss: () => void;
}) {
  if (!transition) return null;

  return (
    <div
      data-era-transition-reveal="true"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="dialog"
      aria-label="Era transition reveal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mfd-sp-xl)',
        background: 'var(--mfd-bg)',
        animation: reducedMotion ? 'none' : 'mfdRouteEnter 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <PixelPanel title="Era Transition" accent="gold" style={{ width: 'min(560px, 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-cyan)', textTransform: 'uppercase' }}>
            {transition.startYear} - {transition.endYear ?? 'Present'}
          </div>
          <div style={{ ...display, color: 'var(--mfd-gold)', fontSize: '32px', lineHeight: 1.1 }}>
            {transition.name}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            {transition.summary}
          </div>
          <div>
            <PixelButton accent="gold" onClick={onDismiss}>Continue</PixelButton>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}

export function EraTransitionEmitter() {
  const eras = useGameStore(selectFranchiseEras);
  const reducedMotion = useReducedMotionPreference();
  const currentEra = useMemo(() => latestEraSnapshot(eras), [eras]);
  const previousEraId = useRef<string | null>(currentEra?.id ?? null);
  const firedEraIds = useRef<Set<string>>(new Set());
  const [transition, setTransition] = useState<EraTransitionSnapshot | null>(null);

  useEffect(() => {
    const event = resolveEraTransitionEvent({
      currentEra,
      previousEraId: previousEraId.current,
      firedEraIds: firedEraIds.current,
    });

    if (currentEra) {
      previousEraId.current = currentEra.id;
    }

    if (!event) return;
    firedEraIds.current.add(event.id);
    setTransition(event);
  }, [currentEra]);

  return (
    <EraTransitionEmitterView
      transition={transition}
      reducedMotion={reducedMotion}
      onDismiss={() => setTransition(null)}
    />
  );
}
