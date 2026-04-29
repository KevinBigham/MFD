import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  ChipDialogueBubble,
  computeTypewriterRevealCount,
  createTypewriterController,
  normalizeBubbleText,
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

    expect(markup).toContain('DYNASTY DESK // CHIP');
    expect(markup).toContain('Clipboard says this roster can win now.');
    expect(markup).toContain('aria-label="Clipboard says this roster can win now. My stomach says check the cap first."');
    expect(markup).toContain('data-chip-bubble-pointer="right"');
  });

  it('computes deterministic reveal counts from elapsed rAF timestamps', () => {
    expect(computeTypewriterRevealCount({ elapsedMs: 0, speed: 28, textLength: 80 })).toBe(0);
    expect(computeTypewriterRevealCount({ elapsedMs: 500, speed: 28, textLength: 80 })).toBe(14);
    expect(computeTypewriterRevealCount({ elapsedMs: 10_000, speed: 28, textLength: 80 })).toBe(80);
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

    expect(css).toContain('max-width: 360px');
    expect(css).toContain('width: 100%');
    expect(css).toContain('mfd-chip-bubble-typewriter-caret');
  });
});
