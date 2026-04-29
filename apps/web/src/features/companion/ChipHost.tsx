import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Chip, ChipDialogueBubble, PixelButton } from '@mfd/design-system/components';
import { onboardingDialogue } from './dialogue/onboarding';
import { useChipStore } from './store';

export const CHIP_ONBOARDING_STORAGE_KEY = 'mfd.chip.onboarding';

export interface ChipHostStage {
  id: string;
  label: string;
  content: ReactNode;
}

export interface ChipOnboardingSkipState {
  skipped: true;
  lastBeat: number;
  timestamp: string;
}

export interface ChipHostProps {
  newGame: boolean;
  stages: ChipHostStage[];
  children: ReactNode;
  reducedMotion?: boolean;
  storage?: Storage | null;
  now?: () => Date;
}

export function isChipFeatureEnabled(env: Record<string, string | boolean | undefined> = import.meta.env): boolean {
  return env.VITE_CHIP_ENABLED === 'true';
}

export function advanceOnboardingBeat(currentBeatIndex: number, totalBeats: number): number {
  if (totalBeats <= 0) return 0;
  return Math.min(currentBeatIndex + 1, totalBeats - 1);
}

function resolveStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

export function readOnboardingSkipState(storage: Storage | null = resolveStorage()): ChipOnboardingSkipState | null {
  if (!storage) return null;
  const raw = storage.getItem(CHIP_ONBOARDING_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ChipOnboardingSkipState>;
    if (parsed.skipped !== true) return null;
    const lastBeat = parsed.lastBeat;
    if (typeof lastBeat !== 'number' || !Number.isInteger(lastBeat)) return null;
    if (typeof parsed.timestamp !== 'string') return null;
    return {
      skipped: true,
      lastBeat,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function writeOnboardingSkipState(storage: Storage | null, lastBeat: number, timestamp = new Date()): void {
  if (!storage) return;
  const payload: ChipOnboardingSkipState = {
    skipped: true,
    lastBeat,
    timestamp: timestamp.toISOString(),
  };
  storage.setItem(CHIP_ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
}

export function ChipHost({
  newGame,
  stages,
  children,
  reducedMotion = false,
  storage,
  now = () => new Date(),
}: ChipHostProps) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const backingStorage = storage === undefined ? resolveStorage() : storage;
  const skipped = readOnboardingSkipState(backingStorage)?.skipped === true;
  const enabled = isChipFeatureEnabled();
  const currentDialogue = onboardingDialogue[beatIndex] ?? onboardingDialogue[0];
  const currentStage = stages[beatIndex] ?? stages[0];

  const hostStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)',
      gap: 'var(--mfd-sp-lg)',
      alignItems: 'start',
      padding: 'var(--mfd-sp-lg)',
      border: '2px solid var(--mfd-gold)',
      background: 'var(--mfd-bg)',
      color: 'var(--mfd-text)',
    }),
    [],
  );

  const stageStyle = useMemo(
    () => ({
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 'var(--mfd-sp-md)',
      minWidth: 0,
    }),
    [],
  );

  const controlsStyle = useMemo(
    () => ({
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: 'var(--mfd-sp-sm)',
      alignItems: 'center',
    }),
    [],
  );

  const advance = useCallback(() => {
    useChipStore.getState().advance();
    setBeatIndex((current) => advanceOnboardingBeat(current, onboardingDialogue.length));
  }, []);

  const skip = useCallback(() => {
    writeOnboardingSkipState(backingStorage, beatIndex + 1, now());
    useChipStore.getState().dismiss();
    setDismissed(true);
  }, [backingStorage, beatIndex, now]);

  if (!enabled || !newGame || skipped || dismissed || !currentDialogue) {
    return <>{children}</>;
  }

  return (
    <section data-chip-host="true" data-chip-host-stage-id={currentStage?.id} style={hostStyle}>
      <div data-chip-host-companion="true" style={stageStyle}>
        <Chip pose={currentDialogue.pose} reducedMotion={reducedMotion} size="lg" />
        <ChipDialogueBubble
          text={currentDialogue.text}
          pose={currentDialogue.pose}
          reducedMotion={reducedMotion}
          skippable={false}
          pointer="left"
        />
        <div data-chip-host-controls="true" style={controlsStyle}>
          <PixelButton accent="gold" onClick={advance}>
            Continue
          </PixelButton>
          <PixelButton accent="cyan" onClick={skip}>
            Skip
          </PixelButton>
        </div>
      </div>
      <div data-chip-host-content="true" aria-label={currentStage?.label}>
        {children}
      </div>
    </section>
  );
}
