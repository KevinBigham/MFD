import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChipPose } from './Chip';
import './Chip.css';

const MAX_BUBBLE_TEXT_LENGTH = 240;
const DEFAULT_TYPEWRITER_SPEED = 28;

interface ImportMetaWithEnv extends ImportMeta {
  env?: {
    PROD?: boolean;
  };
}

export interface ChipDialogueBubbleProps {
  text: string;
  pose?: ChipPose;
  speed?: number;
  onComplete?: () => void;
  skippable?: boolean;
  reducedMotion?: boolean;
  pointer?: 'left' | 'right';
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
}: ChipDialogueBubbleProps) {
  const normalizedText = useMemo(() => normalizeBubbleText(text), [text]);
  const [visibleCount, setVisibleCount] = useState(reducedMotion ? normalizedText.length : 0);
  const controllerRef = useRef<TypewriterController | null>(null);

  const complete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    setVisibleCount(reducedMotion ? normalizedText.length : 0);

    const requestFrame =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback) => callback(0) as unknown as number;
    const cancelFrame =
      typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
        ? window.cancelAnimationFrame.bind(window)
        : () => undefined;

    const controller = createTypewriterController({
      textLength: normalizedText.length,
      speed,
      reducedMotion,
      requestFrame,
      cancelFrame,
      onRevealCount: setVisibleCount,
      onComplete: complete,
    });
    controllerRef.current = controller;
    controller.start();

    return () => {
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
      data-chip-bubble-pointer={pointer}
      data-chip-bubble-pose={pose}
      aria-label={normalizedText}
      onClick={handleSkip}
    >
      <div className="mfd-chip-bubble__stamp">DYNASTY DESK // CHIP</div>
      <div className="mfd-chip-bubble__rule" />
      <p className="mfd-chip-bubble__text" aria-hidden="true">
        {visibleText}
        {!reducedMotion && visibleCount < normalizedText.length && (
          <span className="mfd-chip-bubble__caret" aria-hidden="true" />
        )}
      </p>
      {skippable && (
        <button className="mfd-chip-bubble__skip" type="button" onClick={handleSkip}>
          SKIP
        </button>
      )}
    </section>
  );
}
