import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Chip, ChipDialogueBubble, PixelButton, Spotlight } from '@mfd/design-system/components';
import { onboardingDialogue } from './dialogue/onboarding';
import type { DialogueCatalogEntry } from './dialogue/types';
import { useChipStore } from './store';
import {
  createSpotlightController,
  SPOTLIGHT_TARGETS_BY_BEAT,
  type SpotlightWizardStageId,
} from './spotlightController';
import {
  ONBOARDING_REVEAL_TOTAL_MS,
  getOnboardingRevealFrame,
} from './onboardingReveal';

export const CHIP_ONBOARDING_STORAGE_KEY = 'mfd.chip.onboarding';

export interface ChipHostStage {
  id: string;
  label: string;
  content: ReactNode;
  spotlightStageId?: SpotlightWizardStageId | string;
}

export interface ChipHostRenderControls {
  onStageAdvance: (stageId: string) => void;
  spotlightTargetId: string | null;
  currentBeat: number;
  companionPanel: ReactNode | null;
}

export interface ChipOnboardingSkipState {
  skipped: true;
  lastBeat: number;
  timestamp: string;
}

export interface ChipOnboardingReplayStore {
  showDialogue: (dialogueId: string, options?: { pose?: DialogueCatalogEntry['pose']; context?: 'onboarding' }) => void;
}

export interface ChipHostProps {
  newGame: boolean;
  stages: ChipHostStage[];
  children: ReactNode | ((controls: ChipHostRenderControls) => ReactNode);
  companionAction?: ReactNode;
  onCompanionVisibleChange?: (visible: boolean) => void;
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

export function resolveBeatIndexForStageAdvance(
  currentBeatIndex: number,
  stageId: string | null | undefined,
  totalBeats: number,
): number {
  if (!stageId || totalBeats <= 0) return currentBeatIndex;
  const matchingTarget = SPOTLIGHT_TARGETS_BY_BEAT.find((entry) => entry.stageId === stageId);
  if (!matchingTarget) return currentBeatIndex;
  return Math.max(0, Math.min(matchingTarget.beat - 1, totalBeats - 1));
}

export function resolveChipHostSpotlightTarget({
  beatIndex,
  stageId,
  enabled,
  skipped,
  dismissed,
}: {
  beatIndex: number;
  stageId: string | null | undefined;
  enabled: boolean;
  skipped: boolean;
  dismissed: boolean;
}): string | null {
  return createSpotlightController({
    getCurrentBeat: () => beatIndex + 1,
    getCurrentStage: () => stageId,
    isEnabled: () => enabled,
    isSkipped: () => skipped,
    isDismissed: () => dismissed,
  }).getTargetId();
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

export function replayOnboardingBeat(
  entry: DialogueCatalogEntry,
  chipStore: ChipOnboardingReplayStore = useChipStore.getState(),
): void {
  chipStore.showDialogue(entry.id, {
    pose: entry.pose,
    context: 'onboarding',
  });
}

function resolveStageSpotlightId(stage: ChipHostStage | undefined): string | null {
  if (!stage) return null;
  if (stage.spotlightStageId) return stage.spotlightStageId;
  const beatMatch = stage.id.match(/beat-(\d+)$/);
  if (!beatMatch) return null;
  const beat = Number(beatMatch[1]);
  return SPOTLIGHT_TARGETS_BY_BEAT.find((entry) => entry.beat === beat)?.stageId ?? null;
}

export function ChipHost({
  newGame,
  stages,
  children,
  companionAction,
  onCompanionVisibleChange,
  reducedMotion = false,
  storage,
  now = () => new Date(),
}: ChipHostProps) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [activeStageId, setActiveStageId] = useState<string | null>(() => resolveStageSpotlightId(stages[0]));
  const [revealElapsedMs, setRevealElapsedMs] = useState(reducedMotion ? ONBOARDING_REVEAL_TOTAL_MS : 0);
  const revealStartMs = useRef<number | null>(null);
  const backingStorage = storage === undefined ? resolveStorage() : storage;
  const skipped = readOnboardingSkipState(backingStorage)?.skipped === true;
  const enabled = isChipFeatureEnabled();
  const subscribedStoreDismissed = useChipStore((state) => state.dismissed);
  const storeDismissed = subscribedStoreDismissed || useChipStore.getState().dismissed;
  const hostDismissed = dismissed || storeDismissed;
  const currentDialogue = onboardingDialogue[beatIndex] ?? onboardingDialogue[0]!;
  const currentStage = stages[beatIndex] ?? stages[0];
  const shouldPlayReveal = enabled && newGame && !skipped && !hostDismissed && !reducedMotion;
  const revealFrame = getOnboardingRevealFrame({
    elapsedMs: shouldPlayReveal ? revealElapsedMs : ONBOARDING_REVEAL_TOTAL_MS,
    reducedMotion,
  });
  const revealComplete = !shouldPlayReveal || revealFrame.complete;
  const companionVisible = Boolean(enabled && newGame && !skipped && !hostDismissed && currentDialogue);
  const spotlightTargetId = resolveChipHostSpotlightTarget({
    beatIndex,
    stageId: activeStageId,
    enabled,
    skipped,
    dismissed: hostDismissed || !revealComplete,
  });

  const hostStyle = useMemo(
    () => ({
      boxSizing: 'border-box' as const,
      width: '100%',
      minWidth: 0,
      display: 'grid',
      gap: 'var(--mfd-sp-sm)',
      padding: '12px',
      border: '1px solid rgba(255, 215, 0, 0.72)',
      borderLeft: '4px solid var(--mfd-gold)',
      background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.09), rgba(0, 0, 0, 0.22)), var(--mfd-bg-2)',
      color: 'var(--mfd-text)',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.58), 0 18px 34px rgba(0, 0, 0, 0.32)',
      overflow: 'hidden' as const,
    }),
    [],
  );

  const stageStyle = useMemo(
    () => ({
      display: 'grid',
      gap: '10px',
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
      justifyContent: 'space-between' as const,
    }),
    [],
  );

  const primaryActionStyle = useMemo(
    () => ({
      display: 'grid',
      gap: 'var(--mfd-sp-xs)',
      justifyItems: 'stretch',
      width: '100%',
    }),
    [],
  );

  const portraitButtonStyle = useMemo(
    () => ({
      display: 'grid',
      placeItems: 'center',
      padding: 0,
      border: '1px solid rgba(0, 229, 255, 0.32)',
      background: 'rgba(0, 229, 255, 0.06)',
      color: 'inherit',
      cursor: 'pointer',
    }),
    [],
  );

  const revealStyle = useMemo(
    () => ({
      display: 'grid',
      placeItems: 'center',
      opacity: revealFrame.opacity,
      transform: revealFrame.phase === 'hidden' ? 'translateY(8px)' : 'translateY(0)',
      transition: reducedMotion ? 'none' : 'opacity 240ms ease, transform 240ms ease',
    }),
    [reducedMotion, revealFrame.opacity, revealFrame.phase],
  );

  const contextDetailsStyle = useMemo(
    () => ({
      display: 'grid',
      gap: 'var(--mfd-sp-xs)',
      width: '100%',
      padding: '8px',
      border: '1px solid rgba(0, 229, 255, 0.26)',
      background: 'rgba(0, 229, 255, 0.05)',
      color: 'var(--mfd-text-dim)',
      fontFamily: 'var(--mfd-font-mono)',
      fontSize: '11px',
      lineHeight: 1.55,
    }),
    [],
  );

  const railMetaStyle = useMemo(
    () => ({
      display: 'flex',
      justifyContent: 'space-between',
      gap: '8px',
      alignItems: 'center',
      color: 'var(--mfd-gold)',
      fontFamily: 'var(--mfd-font-pixel)',
      fontSize: '8px',
      lineHeight: 1.25,
      textTransform: 'uppercase' as const,
    }),
    [],
  );

  const quietNoteStyle = useMemo(
    () => ({
      color: 'var(--mfd-text-dim)',
      fontFamily: 'var(--mfd-font-mono)',
      fontSize: '11px',
      lineHeight: 1.45,
    }),
    [],
  );

  useEffect(() => {
    onCompanionVisibleChange?.(companionVisible);
  }, [companionVisible, onCompanionVisibleChange]);

  useEffect(() => {
    useChipStore.getState().setSpotlightTarget(spotlightTargetId);
  }, [spotlightTargetId]);

  useEffect(() => {
    if (!shouldPlayReveal) {
      revealStartMs.current = null;
      setRevealElapsedMs(ONBOARDING_REVEAL_TOTAL_MS);
      return undefined;
    }

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      setRevealElapsedMs(ONBOARDING_REVEAL_TOTAL_MS);
      return undefined;
    }

    setRevealElapsedMs(0);
    revealStartMs.current = null;
    let frameId = 0;
    let cancelled = false;

    const tick = (timestamp: number) => {
      if (cancelled) return;
      if (revealStartMs.current === null) {
        revealStartMs.current = timestamp;
      }
      const elapsed = Math.min(ONBOARDING_REVEAL_TOTAL_MS, timestamp - revealStartMs.current);
      setRevealElapsedMs(elapsed);
      if (elapsed < ONBOARDING_REVEAL_TOTAL_MS) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame?.(frameId);
    };
  }, [shouldPlayReveal]);

  const handleStageAdvance = useCallback((stageId: string) => {
    setActiveStageId(stageId);
    setBeatIndex((current) => {
      const next = resolveBeatIndexForStageAdvance(current, stageId, onboardingDialogue.length);
      const delta = Math.max(0, next - current);
      for (let index = 0; index < delta; index += 1) {
        useChipStore.getState().advance();
      }
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    writeOnboardingSkipState(backingStorage, beatIndex + 1, now());
    useChipStore.getState().dismiss();
    setDismissed(true);
  }, [backingStorage, beatIndex, now]);

  const replayCurrentBeat = useCallback(() => {
    replayOnboardingBeat(currentDialogue);
  }, [currentDialogue]);

  const renderChildren = (companionPanel: ReactNode | null) => (typeof children === 'function'
    ? children({
      onStageAdvance: handleStageAdvance,
      spotlightTargetId,
      currentBeat: beatIndex + 1,
      companionPanel,
    })
    : children);

  if (!enabled || !newGame || skipped || hostDismissed || !currentDialogue) {
    return <>{renderChildren(null)}</>;
  }

  const companionPanel = !revealComplete ? (
    <aside
      data-chip-host="true"
      data-chip-host-reveal={revealFrame.phase}
      data-chip-host-stage-id={currentStage?.id}
      style={hostStyle}
      aria-label="Chip operations rail"
    >
      <div style={railMetaStyle}>
        <span>Operations Chief</span>
        <span>{currentStage?.label}</span>
      </div>
      <div data-chip-host-companion="true" style={stageStyle}>
        <div data-chip-host-reveal-portrait="true" style={revealStyle}>
          <Chip pose={revealFrame.pose} reducedMotion={reducedMotion} size="sm" ariaLabel="Chip, franchise operations chief" />
        </div>
      </div>
    </aside>
  ) : (
    <aside
      data-chip-host="true"
      data-chip-host-stage-id={currentStage?.id}
      style={hostStyle}
      aria-label="Chip operations rail"
    >
      <div style={railMetaStyle}>
        <span>Operations Chief</span>
        <span>{currentStage?.label}</span>
      </div>
      <div data-chip-host-companion="true" style={stageStyle}>
        <button
          type="button"
          data-chip-host-portrait="true"
          onClick={replayCurrentBeat}
          aria-label="Replay Chip briefing"
          style={portraitButtonStyle}
        >
          <Chip pose={currentDialogue.pose} reducedMotion={reducedMotion} size="sm" ariaLabel="Chip, franchise operations chief" />
        </button>
        <ChipDialogueBubble
          text={currentDialogue.text}
          pose={currentDialogue.pose}
          reducedMotion={reducedMotion}
          skippable={false}
          pointer="left"
        />
        {currentDialogue.contextDetails?.length ? (
          <details
            data-chip-host-context-details="true"
            style={contextDetailsStyle}
          >
            <summary style={{ color: 'var(--mfd-cyan)', cursor: 'pointer', fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px' }}>
              Board Notes
            </summary>
            {currentDialogue.contextDetails.map((detail) => (
              <div key={detail}>{detail}</div>
            ))}
          </details>
        ) : null}
        <div data-chip-host-controls="true" style={controlsStyle}>
          {companionAction ? (
            <div data-chip-host-primary-action="true" style={primaryActionStyle}>
              {companionAction}
            </div>
          ) : (
            <div style={quietNoteStyle}>
              No note. Work the board.
            </div>
          )}
          <PixelButton accent="cyan" onClick={skip}>
            Quiet
          </PixelButton>
        </div>
      </div>
    </aside>
  );

  const renderedChildren = renderChildren(companionPanel);

  const renderPropChildren = typeof children === 'function';

  return (
    <>
      <Spotlight targetId={spotlightTargetId} reducedMotion={reducedMotion} />
      <div data-chip-host-content="true" aria-label={currentStage?.label}>
        {renderedChildren}
      </div>
      {renderPropChildren ? null : companionPanel}
    </>
  );
}
