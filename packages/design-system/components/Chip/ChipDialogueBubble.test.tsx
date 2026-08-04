import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  ChipDialogueBubble,
  computeTypewriterFallbackMs,
  computeTypewriterRevealCount,
  createTypewriterController,
  normalizeBubbleText,
  resolveTypewriterTimingMode,
} from './ChipDialogueBubble';

describe('ChipDialogueBubble', () => {
  it('renders a broadcast-card speech bubble with full accessible text in reduced motion', () => {
    const markup = renderToStaticMarkup(
      <ChipDialogueBubble
        text="Clipboard says this roster can win now. My stomach says check the cap first."
        pointer="right"
        reducedMotion
      />,
    );

    expect(markup).toContain('FRANCHISE OPS // CHIP');
    expect(markup).toContain('Clipboard says this roster can win now.');
    expect(markup).toContain('aria-label="Clipboard says this roster can win now. My stomach says check the cap first."');
    expect(markup).toContain('data-chip-bubble-pointer="right"');
  });

  it('computes deterministic reveal counts from elapsed rAF timestamps', () => {
    expect(computeTypewriterRevealCount({ elapsedMs: 0, speed: 28, textLength: 80 })).toBe(0);
    expect(computeTypewriterRevealCount({ elapsedMs: 500, speed: 28, textLength: 80 })).toBe(14);
    expect(computeTypewriterRevealCount({ elapsedMs: 10_000, speed: 28, textLength: 80 })).toBe(80);
  });

  it('computes a timeout fallback so typewriter copy cannot stay blank forever', () => {
    expect(computeTypewriterFallbackMs({ speed: 28, textLength: 84 })).toBe(3500);
    expect(computeTypewriterFallbackMs({ speed: 0, textLength: 84 })).toBe(0);
    expect(computeTypewriterFallbackMs({ speed: 28, textLength: 0 })).toBe(0);
  });

  it('advances the controller frame by frame and completes once', () => {
    const frames: FrameRequestCallback[] = [];
    const reveals: number[] = [];
    const onComplete = vi.fn();
    const controller = createTypewriterController({
      textLength: 12,
      speed: 4,
      reducedMotion: false,
      requestFrame: (callback) => {
        frames.push(callback);
        return frames.length;
      },
      cancelFrame: vi.fn(),
      onRevealCount: (count) => reveals.push(count),
      onComplete,
    });

    controller.start();
    frames[0]?.(100);
    frames[1]?.(600);
    frames[2]?.(3_200);

    expect(reveals).toEqual([0, 2, 12]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skip flushes all text immediately and does not double-complete', () => {
    const onComplete = vi.fn();
    const reveals: number[] = [];
    const controller = createTypewriterController({
      textLength: 18,
      speed: 28,
      reducedMotion: false,
      requestFrame: () => 42,
      cancelFrame: vi.fn(),
      onRevealCount: (count) => reveals.push(count),
      onComplete,
    });

    controller.start();
    controller.skip();
    controller.skip();

    expect(reveals.at(-1)).toBe(18);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reduced motion reveals all text on start without requesting a frame', () => {
    const onComplete = vi.fn();
    const onRevealCount = vi.fn();
    const requestFrame = vi.fn();
    const controller = createTypewriterController({
      textLength: 22,
      speed: 28,
      reducedMotion: true,
      requestFrame,
      cancelFrame: vi.fn(),
      onRevealCount,
      onComplete,
    });

    controller.start();

    expect(requestFrame).not.toHaveBeenCalled();
    expect(onRevealCount).toHaveBeenCalledWith(22);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('throws overlong text in dev and truncates in production mode', () => {
    const longText = 'x'.repeat(241);

    expect(() => normalizeBubbleText(longText, false)).toThrow(/240 characters/);
    expect(normalizeBubbleText(longText, true)).toHaveLength(240);
    expect(normalizeBubbleText(longText, true).endsWith('...')).toBe(true);
  });

  it('defines the desktop and mobile broadcast-card clamps in CSS', () => {
    const css = readFileSync(join(__dirname, 'Chip.css'), 'utf8');

    expect(css).toContain('max-width: 416px');
    expect(css).toContain('width: 100%');
    expect(css).toContain('mfd-chip-bubble-typewriter-caret');
  });

  it('renders the gold rule as a horizontal separator', () => {
    const markup = renderToStaticMarkup(
      <ChipDialogueBubble text="Cap table says breathe first." reducedMotion />,
    );

    expect(markup).toContain('class="mfd-chip-bubble__rule"');
    expect(markup).toContain('role="separator"');
    expect(markup).toContain('aria-orientation="horizontal"');
  });

  it('marks the body copy as mono when monoBody is enabled', () => {
    const markup = renderToStaticMarkup(
      <ChipDialogueBubble text="Run the numbers before the parade." monoBody reducedMotion />,
    );

    expect(markup).toContain('data-chip-bubble-body="mono"');
    expect(markup).toContain('mfd-chip-bubble__text mfd-chip-bubble__text--mono');
  });

  it('renders the opt-in pose tag with the current pose name', () => {
    const markup = renderToStaticMarkup(
      <ChipDialogueBubble
        text="I like this call."
        pose="thumbs-up"
        showPoseTag
        reducedMotion
      />,
    );

    expect(markup).toContain('class="mfd-chip-bubble__pose-tag"');
    expect(markup).toContain('thumbs-up');
  });

  it('keeps the pose tag hidden by default while retaining pose data', () => {
    const markup = renderToStaticMarkup(
      <ChipDialogueBubble text="Clock management is not a rumor." pose="warning" reducedMotion />,
    );

    expect(markup).toContain('data-chip-bubble-pose="warning"');
    expect(markup).not.toContain('mfd-chip-bubble__pose-tag');
  });

  it('defines the broadcast-card frame, mono body, and gold divider CSS', () => {
    const css = readFileSync(join(__dirname, 'Chip.css'), 'utf8');

    expect(css).toContain('padding: 14px 17px 16px;');
    expect(css).toContain('border: 2px solid rgba(255, 215, 0, 0.88);');
    expect(css).toContain('border-top: 1px solid rgba(255, 215, 0, 0.5);');
    expect(css).toContain('font-size: 15px;');
    expect(css).toContain('line-height: 1.56;');
    expect(css).toContain('text-wrap: pretty;');
    expect(css).toContain('.mfd-chip-bubble__signal');
    expect(css).toContain('.mfd-chip-bubble__pose-tag');
  });

  it('returns a non-recursive no-op timing mode when rAF is unavailable (PR #18 P2 fix)', () => {
    // Regression guard: the previous fallback `(cb) => cb(0)` recursed
    // synchronously and stack-overflowed in environments without rAF.
    const result = resolveTypewriterTimingMode({} as unknown as Window);
    expect(result.hasRAF).toBe(false);

    let callbackInvocations = 0;
    const handle = result.requestFrame(() => {
      callbackInvocations += 1;
    });
    // The no-op MUST NOT invoke the callback — that's what caused the recursion.
    expect(callbackInvocations).toBe(0);
    expect(typeof handle).toBe('number');
    // cancelFrame is a safe no-op
    expect(() => result.cancelFrame(handle)).not.toThrow();
  });

  it('announces bubble copy politely to screen readers', () => {
    const markup = renderToStaticMarkup(
      <ChipDialogueBubble text="The tape is ready when you are." reducedMotion />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="The tape is ready when you are."');
  });

  it('binds rAF helpers when the host window provides them', () => {
    const requestSpy = vi.fn(() => 99);
    const cancelSpy = vi.fn();
    const fakeWindow = {
      requestAnimationFrame: requestSpy,
      cancelAnimationFrame: cancelSpy,
    } as unknown as Window;

    const result = resolveTypewriterTimingMode(fakeWindow);
    expect(result.hasRAF).toBe(true);
    const cb: FrameRequestCallback = () => undefined;
    result.requestFrame(cb);
    expect(requestSpy).toHaveBeenCalledWith(cb);
    result.cancelFrame(99);
    expect(cancelSpy).toHaveBeenCalledWith(99);
  });
});
