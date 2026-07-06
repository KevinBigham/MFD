import { useEffect, useMemo, useRef, useState } from 'react';
import type { FranchiseEra } from '@mfd/engine';
import { selectFranchiseEras, useGameStore } from '../../app/store/game-store';
import { useReducedMotionPreference } from '../shared/transitions/RouteTransition';
import {
  EraTransitionReveal,
  type EraTransitionVariant,
} from './EraTransitionReveal';
import type { EraTransitionStage } from './eraTransitionState';

export interface EraTransitionSnapshot {
  id: string;
  name: string;
  summary: string;
  startYear: number;
  endYear: number | null;
  variant: EraTransitionVariant;
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

export function resolveEraTransitionVariant(name: string): EraTransitionVariant {
  if (/dark|fall|grace|slump/i.test(name)) return 'fall-from-grace';
  if (/rebuild/i.test(name)) return 'rebuilding';
  if (/build|rise/i.test(name)) return 'building';
  if (/dynasty|crown/i.test(name)) return 'dynasty';
  if (/gold|age/i.test(name)) return 'golden-age';
  if (/contend|playoff|window/i.test(name)) return 'contender';
  return 'contender';
}

export function buildEraTransitionNarrative(transition: EraTransitionSnapshot): string {
  return `${transition.startYear} - ${transition.endYear ?? 'Present'}: ${transition.summary}`;
}

function toEraSnapshot(era: FranchiseEra | null): EraTransitionSnapshot | null {
  if (!era) return null;
  return {
    id: eraSnapshotId(era),
    name: era.name,
    summary: era.description,
    startYear: era.startYear,
    endYear: era.endYear,
    variant: resolveEraTransitionVariant(era.name),
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
  initialStage,
}: {
  transition: EraTransitionSnapshot | null;
  reducedMotion: boolean;
  onDismiss: () => void;
  initialStage?: EraTransitionStage;
}) {
  if (!transition) return null;

  return (
    <EraTransitionReveal
      open
      eraName={transition.name}
      eraType={transition.variant}
      narrative={buildEraTransitionNarrative(transition)}
      reducedMotion={reducedMotion}
      initialStage={initialStage}
      onContinue={onDismiss}
    />
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
