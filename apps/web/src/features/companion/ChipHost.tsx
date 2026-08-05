import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Chip, ChipDialogueBubble, PixelButton, Spotlight } from '@mfd/design-system/components';
import './ChipHost.css';
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
import { resolveBrowserStorage } from './storageBoundary';
import { readFirstTenMinutesCompleted } from '../franchise-setup/setupPersistence';

export const CHIP_ONBOARDING_STORAGE_KEY = 'mfd.chip.onboarding';
export const CHIP_INTRO_STORAGE_KEY = 'mfd.chip.intro.v1';

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
  setCompanionDialogue: (dialogue: ChipHostDialogueOverride | null) => void;
}

export interface ChipOnboardingSkipState {
  skipped: true;
  lastBeat: number;
  timestamp: string;
}

export interface ChipIntroState {
  seen: true;
  skipped: boolean;
  timestamp: string;
}

export interface ChipOnboardingReplayStore {
  showDialogue: (dialogueId: string, options?: { pose?: DialogueCatalogEntry['pose']; context?: 'onboarding' }) => void;
}

export type ChipHostDialogueOverride = Partial<Pick<DialogueCatalogEntry, 'pose' | 'text' | 'contextDetails'>>;

export interface ChipHostProps {
  newGame: boolean;
  stages: ChipHostStage[];
  children: ReactNode | ((controls: ChipHostRenderControls) => ReactNode);
  companionAction?: ReactNode;
  companionDialogue?: ChipHostDialogueOverride | null;
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
  return resolveBrowserStorage();
}

export function readOnboardingSkipState(storage: Storage | null = resolveStorage()): ChipOnboardingSkipState | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(CHIP_ONBOARDING_STORAGE_KEY);
  } catch {
    return null;
  }
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

export function readChipIntroState(storage: Storage | null = resolveStorage()): ChipIntroState | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(CHIP_INTRO_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ChipIntroState>;
    if (parsed.seen !== true) return null;
    if (typeof parsed.skipped !== 'boolean') return null;
    if (typeof parsed.timestamp !== 'string') return null;
    return {
      seen: true,
      skipped: parsed.skipped,
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
  try {
    storage.setItem(CHIP_ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // The in-memory onboarding state still advances when storage is blocked.
  }
}

export function writeChipIntroState(storage: Storage | null, skipped: boolean, timestamp = new Date()): void {
  if (!storage) return;
  const payload: ChipIntroState = {
    seen: true,
    skipped,
    timestamp: timestamp.toISOString(),
  };
  try {
    storage.setItem(CHIP_INTRO_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // The current session remains usable when storage is blocked.
  }
}

export function clearOnboardingSkipState(storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(CHIP_ONBOARDING_STORAGE_KEY);
  } catch {
    // Ask Chip can still restore the current session when storage is blocked.
  }
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

interface ChipContextDetailParts {
  label: string;
  body: string;
  kind: 'consequence' | 'decision' | 'where' | 'why' | 'forecast' | 'owner' | 'risk' | 'choice' | 'note';
}

function resolveChipContextDetailKind(label: string): ChipContextDetailParts['kind'] {
  const normalized = label.toLowerCase();
  if (normalized.includes('must do') || normalized.includes('recommended') || normalized.includes('optional')) return 'decision';
  if (normalized.includes('deadline')) return 'risk';
  if (normalized.includes('consequence')) return 'consequence';
  if (normalized.includes('decision')) return 'decision';
  if (normalized.includes('where')) return 'where';
  if (normalized.includes('why')) return 'why';
  if (normalized.includes('forecast')) return 'forecast';
  if (normalized.includes('owner')) return 'owner';
  if (normalized.includes('risk')) return 'risk';
  if (normalized.includes('advisor') || normalized.includes('game')) return 'choice';
  return 'note';
}

export function splitChipContextDetail(detail: string): ChipContextDetailParts {
  const [rawLabel, ...bodyParts] = detail.split(':');
  const label = rawLabel?.trim() ?? '';
  const body = bodyParts.join(':').trim();

  if (!label || !body) {
    return {
      label: 'Note',
      body: detail.trim(),
      kind: 'note',
    };
  }

  return {
    label,
    body,
    kind: resolveChipContextDetailKind(label),
  };
}

interface ChipIntroScreenProps {
  onContinue: () => void;
  onSkip: () => void;
  reducedMotion: boolean;
  /** G8: Settings replay re-labels the setup-oriented actions. */
  continueLabel?: string;
  skipLabel?: string;
}

export function ChipIntroScreen({
  onContinue,
  onSkip,
  reducedMotion,
  continueLabel = 'Start Setup',
  skipLabel = 'Skip Chip Intro',
}: ChipIntroScreenProps) {
  return (
    <section
      className="mfd-chip-intro"
      data-chip-intro="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mfd-chip-intro-title"
      aria-describedby="mfd-chip-intro-copy"
    >
      <PixelButton
        accent="default"
        className="mfd-chip-intro__skip"
        data-chip-intro-skip="true"
        onClick={onSkip}
      >
        {skipLabel}
      </PixelButton>

      <div className="mfd-chip-intro__stage">
        <div className="mfd-chip-intro__portrait" aria-hidden="true">
          <Chip pose="greeting" size="lg" reducedMotion={reducedMotion} ariaLabel="Chip, franchise operations chief" />
        </div>

        <div className="mfd-chip-intro__copy">
          <div className="mfd-chip-intro__eyebrow">Franchise Ops // Chip</div>
          <h1 id="mfd-chip-intro-title">I'm Chip</h1>
          <p id="mfd-chip-intro-copy">
            I separate Must Do, Recommended, and Optional work, point to the exact screen to open, and explain the
            consequence before a choice hurts the roster, cap space, owner patience, or the next game.
          </p>
          <p className="mfd-chip-intro__character" data-chip-intro-character="true">
            I've seen a 40-yard dash decide a season and one missed backup decide a Sunday. You bring the calls;
            I bring the map.
          </p>
          <div className="mfd-chip-intro__actions">
            <PixelButton
              accent="gold"
              data-chip-intro-start="true"
              onClick={onContinue}
            >
              {continueLabel}
            </PixelButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ChipHost({
  newGame,
  stages,
  children,
  companionAction,
  companionDialogue = null,
  onCompanionVisibleChange,
  reducedMotion = false,
  storage,
  now = () => new Date(),
}: ChipHostProps) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [activeStageId, setActiveStageId] = useState<string | null>(() => resolveStageSpotlightId(stages[0]));
  const [revealElapsedMs, setRevealElapsedMs] = useState(reducedMotion ? ONBOARDING_REVEAL_TOTAL_MS : 0);
  const [skipOverride, setSkipOverride] = useState(false);
  const revealStartMs = useRef<number | null>(null);
  const backingStorage = storage === undefined ? resolveStorage() : storage;
  // G4: players who already finished a full setup run know the beats; they
  // get view-only Back/Forward navigation through Chip's briefings.
  const returningPlayer = readFirstTenMinutesCompleted(backingStorage);
  const skipped = readOnboardingSkipState(backingStorage)?.skipped === true && !skipOverride;
  const enabled = isChipFeatureEnabled();
  const [introDismissed, setIntroDismissed] = useState(() => readChipIntroState(backingStorage)?.seen === true);
  const [renderedCompanionDialogue, setRenderedCompanionDialogue] = useState<ChipHostDialogueOverride | null>(null);
  const subscribedStoreDismissed = useChipStore((state) => state.dismissed);
  const storeDismissed = subscribedStoreDismissed || useChipStore.getState().dismissed;
  const hostDismissed = dismissed || storeDismissed;
  const baseDialogue = onboardingDialogue[beatIndex] ?? onboardingDialogue[0]!;
  const effectiveCompanionDialogue = companionDialogue ?? renderedCompanionDialogue;
  const currentDialogue = useMemo(
    () => ({
      ...baseDialogue,
      ...effectiveCompanionDialogue,
    }),
    [baseDialogue, effectiveCompanionDialogue],
  );
  const currentStage = stages[beatIndex] ?? stages[0];
  const introSeen = introDismissed || readChipIntroState(backingStorage)?.seen === true;
  const showIntro = Boolean(enabled && newGame && !skipped && !hostDismissed && currentDialogue && !introSeen);
  const shouldPlayReveal = enabled && newGame && !skipped && !hostDismissed && introSeen && !reducedMotion;
  const revealFrame = getOnboardingRevealFrame({
    elapsedMs: shouldPlayReveal ? revealElapsedMs : ONBOARDING_REVEAL_TOTAL_MS,
    reducedMotion,
  });
  const revealComplete = !shouldPlayReveal || revealFrame.complete;
  const companionVisible = Boolean(enabled && newGame && !skipped && !hostDismissed && currentDialogue && introSeen);
  const spotlightTargetId = resolveChipHostSpotlightTarget({
    beatIndex,
    stageId: activeStageId,
    enabled,
    skipped,
    dismissed: hostDismissed || !introSeen || !revealComplete,
  });

  const hostStyle = useMemo(
    () => ({
      boxSizing: 'border-box' as const,
      width: '100%',
      minWidth: 0,
      display: 'grid',
      gap: '18px',
      padding: '24px',
      border: '3px solid rgba(255, 215, 0, 0.84)',
      borderLeft: '10px solid var(--mfd-gold)',
      background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.09), rgba(0, 0, 0, 0.22)), var(--mfd-bg-2)',
      color: 'var(--mfd-text)',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.58), 0 22px 46px rgba(0, 0, 0, 0.38), 0 0 28px rgba(255, 215, 0, 0.1)',
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

  const beatNavStyle = useMemo(
    () => ({
      display: 'flex',
      gap: 'var(--mfd-sp-xs)',
      alignItems: 'center',
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
      gap: '10px',
      width: '100%',
      padding: '16px',
      border: '1px solid rgba(0, 229, 255, 0.38)',
      background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.08), rgba(0, 0, 0, 0.18))',
      color: 'var(--mfd-text)',
      fontFamily: 'var(--mfd-font-mono)',
      fontSize: '15px',
      lineHeight: 1.5,
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

  const completeIntro = useCallback((introSkipped: boolean) => {
    writeChipIntroState(backingStorage, introSkipped, now());
    setIntroDismissed(true);
  }, [backingStorage, now]);

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
    const fallbackTimerId = window.setTimeout(() => {
      if (cancelled) return;
      setRevealElapsedMs(ONBOARDING_REVEAL_TOTAL_MS);
    }, ONBOARDING_REVEAL_TOTAL_MS + 250);

    const tick = (timestamp: number) => {
      if (cancelled) return;
      if (revealStartMs.current === null) {
        revealStartMs.current = timestamp;
      }
      const elapsed = Math.min(ONBOARDING_REVEAL_TOTAL_MS, timestamp - revealStartMs.current);
      setRevealElapsedMs(elapsed);
      if (elapsed < ONBOARDING_REVEAL_TOTAL_MS) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        window.clearTimeout(fallbackTimerId);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame?.(frameId);
      window.clearTimeout(fallbackTimerId);
    };
  }, [shouldPlayReveal]);

  useEffect(() => {
    if (!showIntro || typeof window === 'undefined') return undefined;

    window.document.querySelector<HTMLButtonElement>('[data-chip-intro-start="true"]')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      completeIntro(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [completeIntro, showIntro]);

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

  // G4: returning-player beat navigation is view-only — it moves Chip's
  // briefing and spotlight, never the store's onboarding progress.
  const navigateBeat = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(beatIndex + delta, onboardingDialogue.length - 1));
    if (next === beatIndex) return;
    setBeatIndex(next);
    setActiveStageId(resolveStageSpotlightId(stages[next]));
  }, [beatIndex, stages]);

  const dismissForNow = useCallback(() => {
    useChipStore.getState().dismiss();
    setDismissed(true);
  }, []);

  const restoreChip = useCallback(() => {
    clearOnboardingSkipState(backingStorage);
    setSkipOverride(true);
    setDismissed(false);
    useChipStore.getState().showDialogue(currentDialogue.id, {
      pose: currentDialogue.pose,
      context: 'onboarding',
    });
  }, [backingStorage, currentDialogue]);

  const replayCurrentBeat = useCallback(() => {
    replayOnboardingBeat(currentDialogue);
  }, [currentDialogue]);

  const renderChildren = (companionPanel: ReactNode | null) => (typeof children === 'function'
    ? children({
      onStageAdvance: handleStageAdvance,
      spotlightTargetId,
      currentBeat: beatIndex + 1,
      companionPanel,
      setCompanionDialogue: setRenderedCompanionDialogue,
    })
    : children);

  if (showIntro) {
    return (
      <ChipIntroScreen
        reducedMotion={reducedMotion}
        onContinue={() => completeIntro(false)}
        onSkip={() => completeIntro(true)}
      />
    );
  }

  const askChipButton = (
    <PixelButton
      accent="cyan"
      className="mfd-chip-ask-button"
      data-chip-ask-button="true"
      aria-label="Ask Chip to return"
      title="Ask Chip"
      onClick={restoreChip}
    >
      Ask Chip
    </PixelButton>
  );

  if (enabled && newGame && (skipped || hostDismissed) && currentDialogue) {
    return (
      <>
        {renderChildren(null)}
        {askChipButton}
      </>
    );
  }

  if (!enabled || !newGame || !currentDialogue) {
    return <>{renderChildren(null)}</>;
  }

  const companionPanel = !revealComplete ? (
    <aside
      className="mfd-chip-host mfd-chip-host--setup"
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
          <Chip pose={revealFrame.pose} reducedMotion={reducedMotion} size="lg" ariaLabel="Chip, franchise operations chief" />
        </div>
      </div>
    </aside>
  ) : (
    <aside
      className="mfd-chip-host mfd-chip-host--setup"
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
          <Chip pose={currentDialogue.pose} reducedMotion={reducedMotion} size="lg" ariaLabel="Chip, franchise operations chief" />
        </button>
        <ChipDialogueBubble
          text={currentDialogue.text}
          pose={currentDialogue.pose}
          reducedMotion={reducedMotion}
          skippable={false}
          pointer="left"
        />
        <div data-chip-host-controls="true" style={controlsStyle}>
          {companionAction ? (
            <div data-chip-host-primary-action="true" style={primaryActionStyle}>
              {companionAction}
            </div>
          ) : currentDialogue.contextDetails?.length ? null : (
            <div style={quietNoteStyle}>
              Finish the visible setup choice. Continue saves that decision and moves Chip to the next consequence.
            </div>
          )}
          {returningPlayer && onboardingDialogue.length > 1 ? (
            <div data-chip-beat-nav-controls="true" style={beatNavStyle}>
              <PixelButton
                accent="default"
                data-chip-beat-nav="back"
                aria-label="Previous Chip briefing"
                disabled={beatIndex === 0}
                onClick={() => navigateBeat(-1)}
              >
                Back
              </PixelButton>
              <PixelButton
                accent="default"
                data-chip-beat-nav="forward"
                aria-label="Next Chip briefing"
                disabled={beatIndex >= onboardingDialogue.length - 1}
                onClick={() => navigateBeat(1)}
              >
                Forward
              </PixelButton>
            </div>
          ) : null}
          <PixelButton
            accent="cyan"
            onClick={dismissForNow}
            style={!companionAction && currentDialogue.contextDetails?.length ? { marginLeft: 'auto' } : undefined}
          >
            not now Chip!
          </PixelButton>
        </div>
        {currentDialogue.contextDetails?.length ? (
          <section
            data-chip-host-context-details="true"
            style={contextDetailsStyle}
          >
            <div
              data-chip-host-context-heading="true"
              style={{ color: 'var(--mfd-cyan)', fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px', lineHeight: 1.35 }}
            >
              Choice Consequences
            </div>
            <div className="mfd-chip-host__context-list" data-chip-host-context-list="true">
              {currentDialogue.contextDetails.map((detail) => {
                const parts = splitChipContextDetail(detail);
                return (
                  <div
                    key={detail}
                    className="mfd-chip-host__context-detail"
                    data-chip-host-context-kind={parts.kind}
                    aria-label={detail}
                  >
                    <span className="mfd-chip-host__context-detail-label">{parts.label}</span>
                    <span className="mfd-chip-host__context-detail-body">{parts.body}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
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
