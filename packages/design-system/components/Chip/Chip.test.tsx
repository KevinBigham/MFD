import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  Chip,
  CHIP_POSES,
  CHIP_POSE_ART,
  CHIP_POSE_MOTION_PROFILE,
  resolveChipPoseArt,
  type ChipPose,
} from './index';

const legacyPixels = {
  sm: 64,
  md: 112,
  lg: 176,
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
  size?: keyof typeof legacyPixels;
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
  it('exports the Sprint 43 pose atlas in a stable order', () => {
    expect(CHIP_POSES).toEqual([
      'idle',
      'greeting',
      'talk',
      'point-left',
      'point-right',
      'wave',
      'think',
      'whispering',
      'celebrate',
      'excited',
      'concern',
      'warning',
      'surprised',
      'sad',
      'disappointed',
      'mic-check',
      'thumbs-up',
      'rallying',
      'coaching-crouch',
      'calling-play',
      'time-out',
      'whistle-blow',
      'coffee-sip',
      'on-phone',
      'reviewing-tablet',
      'head-in-hands',
      'fist-bump',
      'note-taking',
      'laughing',
      'skeptical',
      'proud',
      'facepalm',
      'frustrated',
      'tired',
      'football-in-hand',
      'pointing-at-tape',
    ]);
  });

  it('renders every pose at desktop, tablet, and mobile sizes', () => {
    const renderContracts = CHIP_POSES.flatMap((pose) =>
      (Object.keys(legacyPixels) as Array<keyof typeof legacyPixels>).map((size) => {
        const elements = renderChipElements({ pose, size });
        const root = findElement(elements, 'span');
        const svg = findElement(elements, 'svg');
        expect(root.props['data-chip-pose']).toBe(pose);
        expect(svg.props.width).toBe(legacyPixels[size]);
        expect(svg.props.height).toBe(legacyPixels[size]);
        expect(svg.props.viewBox).toBe('0 0 160 220');
        return `${pose}:${size}:${legacyPixels[size]}`;
      }),
    );

    expect(renderContracts).toHaveLength(CHIP_POSES.length * Object.keys(legacyPixels).length);
    expect(renderContracts[0]).toBe('idle:sm:64');
    expect(renderContracts.at(-1)).toBe('pointing-at-tape:lg:176');
  });

  it('maps every pose to a concrete Chip PNG asset', () => {
    const sources = new Set<string>();

    for (const pose of CHIP_POSES) {
      const art = CHIP_POSE_ART[pose];
      expect(art.src).toMatch(/^assets\/chip\/.+\.png$/);
      expect(art.inlineSrc).toMatch(/^assets\/chip\/inline\/.+\.png$/);
      expect(art.alt).toContain('Chip');
      sources.add(art.src);
    }

    expect(CHIP_POSE_ART.idle.src).toBe('assets/chip/chip-coach.png');
    expect(CHIP_POSE_ART.talk.src).toBe('assets/chip/chip-broadcast.png');
    expect(CHIP_POSE_ART.warning.src).toBe('assets/chip/pose-warning.png');
    expect(CHIP_POSE_ART['thumbs-up'].src).toBe('assets/chip/pose-thumbs-up.png');
    expect(CHIP_POSE_ART.rallying.src).toBe('assets/chip/pose-rallying.png');
    expect(CHIP_POSE_ART['pointing-at-tape'].inlineSrc).toBe('assets/chip/inline/pose-pointing-at-tape.png');
    expect(sources.size).toBeGreaterThanOrEqual(12);
  });

  it('uses square inline crops for small and medium Chip art', () => {
    const mdElements = renderChipElements({ pose: 'warning', size: 'md' });
    const mdRoot = findElement(mdElements, 'span');
    const mdImage = findElement(mdElements, 'img', 'data-chip-image-pose', 'warning');
    const smImage = findElement(renderChipElements({ pose: 'warning', size: 'sm' }), 'img', 'data-chip-image-pose', 'warning');

    expect(resolveChipPoseArt('warning', 'md').src).toBe('assets/chip/inline/pose-warning.png');
    expect(resolveChipPoseArt('warning', 'lg').src).toBe('assets/chip/pose-warning.png');
    expect(mdRoot.props['data-chip-art-src']).toBe('assets/chip/inline/pose-warning.png');
    expect(mdRoot.props['data-chip-full-art-src']).toBe('assets/chip/pose-warning.png');
    expect(mdImage.props.src).toBe('assets/chip/inline/pose-warning.png');
    expect(mdImage.props.width).toBe(112);
    expect(mdImage.props.height).toBe(112);
    expect(smImage.props.width).toBe(64);
    expect(smImage.props.height).toBe(64);
  });

  it('renders the PNG art as the visible Chip layer while preserving pose metadata', () => {
    const elements = renderChipElements({ pose: 'warning', size: 'lg' });
    const root = findElement(elements, 'span');
    const image = findElement(elements, 'img', 'data-chip-image-pose', 'warning');

    expect(root.props['data-chip-art-src']).toBe('assets/chip/pose-warning.png');
    expect(image.props.src).toBe('assets/chip/pose-warning.png');
    expect(image.props.alt).toBe('');
    expect(image.props.width).toBe(224);
    expect(image.props.height).toBe(260);
  });

  it('routes visible portrait motion through a pose-specific rig profile', () => {
    const elements = renderChipElements({ pose: 'warning', size: 'lg' });
    const root = findElement(elements, 'span');
    const rig = findElement(elements, 'span', 'data-chip-motion-rig', 'urgent');

    expect(root.props['data-chip-motion-profile']).toBe('urgent');
    expect(rig.props.className).toBe('mfd-chip__motion-rig');
    expect(CHIP_POSE_MOTION_PROFILE.warning).toBe('urgent');
    expect(CHIP_POSE_MOTION_PROFILE.celebrate).toBe('victory');
    expect(CHIP_POSE_MOTION_PROFILE['head-in-hands']).toBe('downbeat');
    expect(CHIP_POSES.every((pose) => CHIP_POSE_MOTION_PROFILE[pose])).toBe(true);
  });

  it('keeps the portrait stage, shine, and scanline as separate animation layers', () => {
    const elements = renderChipElements({ pose: 'celebrate' });

    expect(findElement(elements, 'span', 'data-chip-pose-art', 'celebrate').props.className).toBe('mfd-chip__art-frame');
    expect(elements.some((element) => element.props.className === 'mfd-chip__stage-shadow')).toBe(true);
    expect(elements.some((element) => element.props.className === 'mfd-chip__shine')).toBe(true);
    expect(elements.some((element) => element.props.className === 'mfd-chip__scanline')).toBe(true);
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

  it('renders the tablet screen as chunky crisp pixel chart rects', () => {
    const tabletPixels = renderChipElements().filter((element) => element.props['data-chip-tablet-pixel']);

    expect(tabletPixels).toHaveLength(24);
    expect(tabletPixels.every((element) => element.type === 'rect')).toBe(true);
    expect(tabletPixels.every((element) => element.props.shapeRendering === 'crispEdges')).toBe(true);
  });

  it('marks reduced-motion renders without dropping the requested pose', () => {
    const root = findElement(renderChipElements({ pose: 'wave', reducedMotion: true }), 'span');

    expect(root.props['data-chip-motion']).toBe('reduced');
    expect(root.props['data-chip-pose']).toBe('wave');
  });

  it('wraps the active pose in a keyed fade layer for animated renders', () => {
    const elements = renderChipElements({ pose: 'thumbs-up' });
    const layer = findElement(elements, 'g', 'data-chip-pose-layer', 'thumbs-up');

    expect(layer.props.className).toBe('mfd-chip-svg__pose-layer mfd-chip-svg__pose-fade-in');
  });

  it('keeps reduced-motion pose changes to a single hard-cut layer', () => {
    const layers = renderChipElements({ pose: 'surprised', reducedMotion: true }).filter(
      (element) => element.props['data-chip-pose-layer'],
    );

    expect(layers).toHaveLength(1);
    expect(layers[0]?.props['data-chip-pose-layer']).toBe('surprised');
  });

  it('does not accumulate pose layers across rapid render changes', () => {
    for (const pose of ['wave', 'mic-check', 'idle'] satisfies ChipPose[]) {
      const layers = renderChipElements({ pose }).filter((element) => element.props['data-chip-pose-layer']);
      expect(layers).toHaveLength(1);
      expect(layers[0]?.props['data-chip-pose-layer']).toBe(pose);
    }
  });

  it('renders the Mic Check signature tap targets and cyan mic tip', () => {
    const elements = renderChipElements({ pose: 'mic-check' });
    const pixelSparkles = elements.filter((element) => element.props['data-chip-mic-sparkle']);

    expect(findElement(elements, 'circle', 'data-chip-mic-tap', 'left')).toBeTruthy();
    expect(findElement(elements, 'circle', 'data-chip-mic-tap', 'right')).toBeTruthy();
    expect(findElement(elements, 'rect', 'data-chip-mic-tip', 'signature')).toBeTruthy();
    expect(elements.some((element) => element.props.className === 'mfd-chip-svg__mic-tip')).toBe(true);
    expect(pixelSparkles).toHaveLength(5);
    expect(pixelSparkles.every((element) => element.type === 'rect')).toBe(true);
  });

  it('renders celebration confetti as chunky pixel-art rects', () => {
    const confettiBits = renderChipElements({ pose: 'celebrate' }).filter(
      (element) => element.props['data-chip-confetti-bit'],
    );

    expect(confettiBits.length).toBeGreaterThanOrEqual(16);
    expect(confettiBits.every((element) => element.type === 'rect')).toBe(true);
    expect(confettiBits.every((element) => element.props.shapeRendering === 'crispEdges')).toBe(true);
  });

  it('defines pose transition and reduced-motion CSS fallbacks', () => {
    const chipCss = readFileSync(join(__dirname, 'Chip.css'), 'utf8');
    const reducedMotionBlock = chipCss.slice(chipCss.indexOf('@media (prefers-reduced-motion: reduce)'));

    expect(chipCss).toContain('--chip-pose-transition: 210ms cubic-bezier(0.2, 0.86, 0.22, 1)');
    expect(chipCss).toContain('--chip-pose-crossfade: 240ms cubic-bezier(0.18, 0.86, 0.22, 1)');
    expect(chipCss).toContain('--chip-enter-from-y');
    expect(chipCss).toContain('--chip-enter-peak-scale');
    expect(chipCss).toContain('@keyframes mfd-chip-pose-crossfade');
    expect(chipCss).toContain(".mfd-chip[data-chip-motion='animated'] .mfd-chip-svg__pose-fade-in");
    expect(chipCss).toContain('@keyframes mfd-chip-art-arrive');
    expect(chipCss).toContain('will-change: transform, opacity;');
    expect(chipCss).toContain('mfd-chip-motion-focused 5.8s');
    expect(chipCss).toContain('@keyframes mfd-chip-motion-victory');
    expect(chipCss).toContain('mfd-chip-motion-urgent 2.55s');
    expect(chipCss).toContain('mfd-chip-motion-downbeat 7.9s');
    expect(chipCss).toContain("[data-chip-motion-profile='conversational'] .mfd-chip__motion-rig");
    expect(chipCss).toContain('@keyframes mfd-chip-idle-breathe');
    expect(chipCss).toContain('@keyframes mfd-chip-mic-check-tap');
    expect(reducedMotionBlock).toContain('opacity');
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='wave'] .mfd-chip-svg__arm--right");
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='mic-check'] .mfd-chip-svg__mic-tip");
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='surprised'] .mfd-chip-svg__headset");
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='sad'] .mfd-chip-svg__mic-tip--sad");
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='excited'] .mfd-chip-svg__figure");
    expect(reducedMotionBlock).toContain(".mfd-chip[data-chip-pose='thumbs-up'] .mfd-chip-svg__thumb-group--thumbs-up");
    const reducedTransforms = [...reducedMotionBlock.matchAll(/transform:\s*([^;]+);/g)].map((match) =>
      (match[1] ?? '').trim(),
    );
    expect(reducedMotionBlock).toContain('.mfd-chip .mfd-chip__image-rig');
    expect(reducedMotionBlock).toContain('scale(var(--chip-art-scale))');
    const hardCutTransforms = reducedTransforms.filter((value) => !value.includes('var(--chip-art'));
    expect(hardCutTransforms.every((value) => value === 'none')).toBe(true);
  });
});
