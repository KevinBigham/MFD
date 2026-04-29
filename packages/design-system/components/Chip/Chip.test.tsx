import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Chip, CHIP_POSES, type ChipPose } from './index';

const sizePixels = {
  sm: 64,
  md: 96,
  lg: 144,
} as const;

type ElementRecord = {
  type: string;
  props: Record<string, unknown>;
};

function isCallableComponent(type: ReactElement['type']): type is (props: Record<string, unknown>) => ReactNode {
  return typeof type === 'function';
}

function collectElements(node: ReactNode): ElementRecord[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => collectElements(child));
  }
  if (!isValidElement(node)) {
    return [];
  }
  const element = node as ReactElement<Record<string, unknown>>;
  if (isCallableComponent(element.type)) {
    return collectElements(element.type(element.props));
  }
  if (typeof element.type !== 'string') {
    return collectElements(element.props.children as ReactNode);
  }
  return [
    { type: element.type, props: element.props },
    ...collectElements(element.props.children as ReactNode),
  ];
}

function renderChipElements({
  pose = 'idle',
  size = 'md',
  reducedMotion = false,
  ariaLabel,
}: {
  pose?: ChipPose;
  size?: keyof typeof sizePixels;
  reducedMotion?: boolean;
  ariaLabel?: string;
} = {}) {
  return collectElements(
    <Chip
      pose={pose}
      size={size}
      reducedMotion={reducedMotion}
      aria-label={ariaLabel}
    />,
  );
}

function findElement(elements: ElementRecord[], type: string, propName?: string, propValue?: unknown): ElementRecord {
  const found = elements.find((element) => {
    if (element.type !== type) return false;
    if (!propName) return true;
    return element.props[propName] === propValue;
  });
  if (!found) throw new Error(`Missing ${type}${propName ? ` with ${propName}` : ''}`);
  return found;
}

describe('Chip', () => {
  it('exports the nine Slice A poses in a stable order', () => {
    expect(CHIP_POSES).toEqual([
      'idle',
      'talk',
      'point-left',
      'point-right',
      'wave',
      'think',
      'celebrate',
      'concern',
      'mic-check',
    ]);
  });

  it('renders every pose at desktop, tablet, and mobile sizes', () => {
    const renderContracts = CHIP_POSES.flatMap((pose) =>
      (Object.keys(sizePixels) as Array<keyof typeof sizePixels>).map((size) => {
        const elements = renderChipElements({ pose, size });
        const root = findElement(elements, 'span');
        const svg = findElement(elements, 'svg');
        expect(root.props['data-chip-pose']).toBe(pose);
        expect(svg.props.width).toBe(sizePixels[size]);
        expect(svg.props.height).toBe(sizePixels[size]);
        expect(svg.props.viewBox).toBe('0 0 160 220');
        return `${pose}:${size}:${sizePixels[size]}`;
      }),
    );

    expect(renderContracts).toMatchInlineSnapshot(`
      [
        "idle:sm:64",
        "idle:md:96",
        "idle:lg:144",
        "talk:sm:64",
        "talk:md:96",
        "talk:lg:144",
        "point-left:sm:64",
        "point-left:md:96",
        "point-left:lg:144",
        "point-right:sm:64",
        "point-right:md:96",
        "point-right:lg:144",
        "wave:sm:64",
        "wave:md:96",
        "wave:lg:144",
        "think:sm:64",
        "think:md:96",
        "think:lg:144",
        "celebrate:sm:64",
        "celebrate:md:96",
        "celebrate:lg:144",
        "concern:sm:64",
        "concern:md:96",
        "concern:lg:144",
        "mic-check:sm:64",
        "mic-check:md:96",
        "mic-check:lg:144",
      ]
    `);
  });

  it('uses an accessible default name and accepts a custom aria label', () => {
    const defaultRoot = findElement(renderChipElements(), 'span');
    const customRoot = findElement(
      renderChipElements({ ariaLabel: 'Chip points at the team picker' }),
      'span',
    );

    expect(defaultRoot.props.role).toBe('img');
    expect(defaultRoot.props['aria-label']).toBe('Chip, your assistant');
    expect(customRoot.props['aria-label']).toBe('Chip points at the team picker');
  });

  it('locks the CRT scanline pattern inside the character SVG viewport', () => {
    const elements = renderChipElements();
    const pattern = findElement(elements, 'pattern');
    const overlay = findElement(elements, 'rect', 'data-chip-crt-overlay', 'true');

    expect(pattern.props.id).toBe('chip-crt-scanline');
    expect(pattern.props.patternUnits).toBe('userSpaceOnUse');
    expect(overlay.props.fill).toBe('url(#chip-crt-scanline)');
  });

  it('marks reduced-motion renders without dropping the requested pose', () => {
    const root = findElement(renderChipElements({ pose: 'wave', reducedMotion: true }), 'span');

    expect(root.props['data-chip-motion']).toBe('reduced');
    expect(root.props['data-chip-pose']).toBe('wave');
  });

  it('renders the Mic Check signature tap targets and cyan mic tip', () => {
    const elements = renderChipElements({ pose: 'mic-check' });

    expect(findElement(elements, 'circle', 'data-chip-mic-tap', 'left')).toBeTruthy();
    expect(findElement(elements, 'circle', 'data-chip-mic-tap', 'right')).toBeTruthy();
    expect(findElement(elements, 'path', 'data-chip-mic-tip', 'signature')).toBeTruthy();
    expect(elements.some((element) => element.props.className === 'mfd-chip-svg__mic-tip')).toBe(true);
  });

  it('defines pose transition and reduced-motion CSS fallbacks', () => {
    const chipCss = readFileSync(join(__dirname, 'Chip.css'), 'utf8');
    const reducedMotionBlock = chipCss.slice(chipCss.indexOf('@media (prefers-reduced-motion: reduce)'));

    expect(chipCss).toContain('--chip-pose-transition: 180ms ease-out');
    expect(chipCss).toContain('@keyframes mfd-chip-idle-breathe');
    expect(chipCss).toContain('@keyframes mfd-chip-mic-check-tap');
    expect(reducedMotionBlock).toContain('opacity');
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='wave'] .mfd-chip-svg__arm--right");
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='mic-check'] .mfd-chip-svg__mic-tip");
    const reducedTransforms = [...reducedMotionBlock.matchAll(/transform:\s*([^;]+);/g)].map((match) =>
      (match[1] ?? '').trim(),
    );
    expect(reducedTransforms.every((value) => value === 'none')).toBe(true);
  });
});
