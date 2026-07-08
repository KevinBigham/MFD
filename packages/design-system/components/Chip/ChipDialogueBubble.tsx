import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChipPose } from './Chip';
import './Chip.css';

const MAX_BUBBLE_TEXT_LENGTH = 240;
const DEFAULT_TYPEWRITER_SPEED = 28;

type ImportMetaWithEnv = ImportMeta & { env?: { PROD?: boolean } };

export interface ChipDialogueBubbleProps {
  text: string;
  pose?: ChipPose;
  speed?: number;
  onComplete?: () => void;
  skippable?: boolean;
  reducedMotion?: boolean;
  pointer?: 'left' | 'right';
  monoBody?: boolean;
  showPoseTag?: boolean;
}

export interface TypewriterRevealInput {
  elapsedMs: number;
  speed: number;
  textLength: number;
}

export interface TypewriterControllerOptions {
  textLength: number;
  speed: number;
  reducedMotion: boolean;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (handle: number) => void;
  onRevealCount: (count: number) => void;
  onComplete?: () => void;
}

export interface TypewriterController {
  start: () => void;
  skip: () => void;
  stop: () => void;
}

function isProductionMode(): boolean {
  const env = (import.meta as ImportMetaWithEnv).env;
  if (typeof env?.PROD === 'boolean') return env.PROD;
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
}

export function normalizeBubbleText(text: string, production = isProductionMode()): string {
  if (text.length <= MAX_BUBBLE_TEXT_LENGTH) return text;

  if (!production) {
    throw new Error(`Chip dialogue text must be ${MAX_BUBBLE_TEXT_LENGTH} characters or fewer.`);
  }

  return `${text.slice(0, MAX_BUBBLE_TEXT_LENGTH - 3)}...`;
}

export function computeTypewriterRevealCount({
  elapsedMs,
  speed,
  textLength,
}: TypewriterRevealInput): number {
  if (textLength <= 0) return 0;
  if (speed <= 0) return textLength;
  return Math.min(textLength, Math.floor((elapsedMs * speed) / 1000));
}

export function computeTypewriterFallbackMs({
  speed,
  textLength,
}: Pick<TypewriterRevealInput, 'speed' | 'textLength'>): number {
  if (textLength <= 0 || speed <= 0) return 0;
  return Math.ceil((textLength / speed) * 1000) + 500;
}

export interface TypewriterTimingMode {
  hasRAF: boolean;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (handle: number) => void;
}

type TimingHostWindow = Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame'>;

export function resolveTypewriterTimingMode(
  hostWindow: TimingHostWindow | undefined = typeof window !== 'undefined' ? window : undefined,
): TypewriterTimingMode {
  const hasRAF =
    !!hostWindow && typeof hostWindow.requestAnimationFrame === 'function';

  if (!hasRAF || !hostWindow) {
    // No-op stand-ins. The controller never invokes these when reducedMotion is
    // true, but we keep them safe in case a caller bypasses the early-flush path.
    return {
      hasRAF: false,
      requestFrame: () => 0,
      cancelFrame: () => undefined,
    };
  }

  return {
    hasRAF: true,
    requestFrame: hostWindow.requestAnimationFrame.bind(hostWindow),
    cancelFrame:
      typeof hostWindow.cancelAnimationFrame === 'function'
        ? hostWindow.cancelAnimationFrame.bind(hostWindow)
        : () => undefined,
  };
}

export function createTypewriterController({
  textLength,
  speed,
  reducedMotion,
  requestFrame,
  cancelFrame,
  onRevealCount,
  onComplete,
}: TypewriterControllerOptions): TypewriterController {
  let frameHandle: number | null = null;
  let startTimestamp: number | null = null;
  let completed = false;

  const complete = () => {
    if (completed) return;
    completed = true;
    onComplete?.();
  };

  const tick: FrameRequestCallback = (timestamp) => {
    if (completed) return;
    if (startTimestamp === null) startTimestamp = timestamp;

    const revealCount = computeTypewriterRevealCount({
      elapsedMs: timestamp - startTimestamp,
      speed,
      textLength,
    });
    onRevealCount(revealCount);

    if (revealCount >= textLength) {
      complete();
      return;
    }

    frameHandle = requestFrame(tick);
  };

  return {
    start() {
      if (reducedMotion || textLength === 0) {
        onRevealCount(textLength);
        complete();
        return;
      }
      frameHandle = requestFrame(tick);
    },
    skip() {
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
      onRevealCount(textLength);
      complete();
    },
    stop() {
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
      completed = true;
    },
  };
}

export function ChipDialogueBubble({
  text,
  pose,
  speed = DEFAULT_TYPEWRITER_SPEED,
  onComplete,
  skippable = true,
  reducedMotion = false,
  pointer = 'left',
  monoBody = true,
  showPoseTag = false,
}: ChipDialogueBubbleProps) {
  const normalizedText = useMemo(() => normalizeBubbleText(text), [text]);
  const [visibleCount, setVisibleCount] = useState(reducedMotion ? normalizedText.length : 0);
  const controllerRef = useRef<TypewriterController | null>(null);

  const complete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    setVisibleCount(reducedMotion ? normalizedText.length : 0);

    // Resolve frame helpers once per effect. When rAF is unavailable (SSR, exotic
    // test envs), force the controller into the reduced-motion early-flush path
    // and use a true no-op `requestFrame`. The previous fallback `(cb) => cb(0)`
    // recursed synchronously with elapsed=0 and stack-overflowed (PR #18 P2 fix).
    const { hasRAF, requestFrame, cancelFrame } = resolveTypewriterTimingMode();
    const effectiveReducedMotion = reducedMotion || !hasRAF;

    const controller = createTypewriterController({
      textLength: normalizedText.length,
      speed,
      reducedMotion: effectiveReducedMotion,
      requestFrame,
      cancelFrame,
      onRevealCount: setVisibleCount,
      onComplete: complete,
    });
    controllerRef.current = controller;
    controller.start();
    const fallbackMs = computeTypewriterFallbackMs({
      textLength: normalizedText.length,
      speed,
    });
    const fallbackTimerId =
      typeof window !== 'undefined' && !effectiveReducedMotion && fallbackMs > 0
        ? window.setTimeout(() => {
          controller.skip();
        }, fallbackMs)
        : null;

    return () => {
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
      controller.stop();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [complete, normalizedText, reducedMotion, speed]);

  const handleSkip = useCallback(() => {
    if (!skippable) return;
    controllerRef.current?.skip();
  }, [skippable]);

  const visibleText = reducedMotion ? normalizedText : normalizedText.slice(0, visibleCount);

  return (
    <section
      className="mfd-chip-bubble"
      data-chip-bubble="broadcast-card"
      data-chip-bubble-stage="sideline"
      data-chip-bubble-pointer={pointer}
      data-chip-bubble-pose={pose}
      data-chip-bubble-body={monoBody ? 'mono' : undefined}
      aria-label={normalizedText}
      onClick={handleSkip}
    >
      <div className="mfd-chip-bubble__header">
        <div className="mfd-chip-bubble__stamp">FRANCHISE OPS // CHIP</div>
        <div className="mfd-chip-bubble__signal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div
        className="mfd-chip-bubble__rule"
        role="separator"
        aria-orientation="horizontal"
      />
      <p
        className={
          monoBody
            ? 'mfd-chip-bubble__text mfd-chip-bubble__text--mono'
            : 'mfd-chip-bubble__text'
        }
        aria-hidden="true"
      >
        {visibleText}
        {!reducedMotion && visibleCount < normalizedText.length && (
          <span className="mfd-chip-bubble__caret" aria-hidden="true" />
        )}
      </p>
      {showPoseTag && pose && (
        <div className="mfd-chip-bubble__pose-tag">{pose}</div>
      )}
      {skippable && (
        <button className="mfd-chip-bubble__skip" type="button" onClick={handleSkip}>
          SKIP
        </button>
      )}
    </section>
  );
}
