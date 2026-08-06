import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Comments are stripped before anything is asserted. These files document their
 * own rules — "there is no @font-face here", "the legacy --mfd-font-pixel stays
 * available" — and a guard that reads prose instead of declarations fails on
 * the sentence describing the thing it is meant to prevent.
 */
const read = (file: string) =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const legacyCss = read('./index.css');
const semanticCss = read('./semantic-v2.css');
const typographyCss = read('./typography-v2.css');
const densityCss = read('./density-v2.css');

const v2Css = `${semanticCss}\n${typographyCss}\n${densityCss}`;

/**
 * Every `--name: value;` declaration, first write winning.
 *
 * First rather than last, because `:root` always comes before its overrides:
 * this yields the base value of a token that a media query or a density
 * attribute later narrows, which is the value these assertions are about.
 */
function declaredVars(css: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]/g)) {
    if (!vars.has(match[1]!)) vars.set(match[1]!, match[2]!.trim());
  }
  return vars;
}

const legacyVars = declaredVars(legacyCss);
const v2Vars = declaredVars(v2Css);

// ── WCAG 2.1 relative luminance and contrast ────────────────────────────────

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

function token(name: string): string {
  const value = v2Vars.get(name);
  if (!value) throw new Error(`token ${name} is not defined`);
  return value;
}

const SURFACES = ['--mfd-v2-canvas', '--mfd-v2-surface-1', '--mfd-v2-surface-2', '--mfd-v2-surface-3'];

describe('semantic v2 isolation', () => {
  it('never shadows a legacy token, which is the whole coexistence strategy', () => {
    const shadowed = [...v2Vars.keys()].filter((name) => legacyVars.has(name));

    expect(shadowed).toEqual([]);
  });

  it('namespaces every custom property it defines', () => {
    const unnamespaced = [...v2Vars.keys()].filter((name) => !name.startsWith('--mfd-v2-'));

    expect(unnamespaced).toEqual([]);
  });

  it('resolves every token it references back to a token it defines', () => {
    const referenced = [...v2Css.matchAll(/var\((--mfd-[\w-]+)/g)].map((match) => match[1]!);
    const dangling = [...new Set(referenced)].filter((name) => !v2Vars.has(name));

    expect(dangling).toEqual([]);
  });

  it('scopes new classes under the v2 namespace so legacy markup cannot match them', () => {
    const classes = [...v2Css.matchAll(/^\.([\w-]+)/gm)].map((match) => match[1]!);

    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((name) => !name.startsWith('mfd-v2-'))).toEqual([]);
  });
});

describe('semantic v2 contrast', () => {
  it('carries primary text at AAA on every surface', () => {
    for (const surface of SURFACES) {
      expect(contrast(token('--mfd-v2-text'), token(surface)), surface).toBeGreaterThanOrEqual(7);
    }
  });

  it('carries secondary text at AAA on every surface', () => {
    for (const surface of SURFACES) {
      expect(contrast(token('--mfd-v2-text-secondary'), token(surface)), surface)
        .toBeGreaterThanOrEqual(7);
    }
  });

  it('shows exactly why text-muted is metadata only', () => {
    // It clears AA on the two darkest surfaces and fails it on surface-3.
    // That single fact is the reason for the rule, so it is asserted rather
    // than trusted: anyone raising the value has to change this test on purpose.
    expect(contrast(token('--mfd-v2-text-muted'), token('--mfd-v2-canvas')))
      .toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--mfd-v2-text-muted'), token('--mfd-v2-surface-1')))
      .toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--mfd-v2-text-muted'), token('--mfd-v2-surface-3')))
      .toBeLessThan(4.5);
  });

  it('keeps every action and status colour readable as text on surface-1', () => {
    for (const role of [
      '--mfd-v2-brand',
      '--mfd-v2-interactive',
      '--mfd-v2-success',
      '--mfd-v2-warning',
      '--mfd-v2-danger',
    ]) {
      expect(contrast(token(role), token('--mfd-v2-surface-1')), role).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps danger legible on the overlay surface it warns from', () => {
    // Dialogs sit on surface-3, and a destructive confirmation is exactly where
    // the danger colour has to survive. The audit measured 4.69:1 here, which
    // clears AA for normal text but leaves no room — so it is pinned.
    expect(contrast(token('--mfd-v2-danger'), token('--mfd-v2-surface-3')))
      .toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the focus ring visible against every surface', () => {
    for (const surface of SURFACES) {
      expect(contrast(token('--mfd-v2-interactive'), token(surface)), surface)
        .toBeGreaterThanOrEqual(3);
    }
  });

  it('reproduces the published audit ratios rather than restating them', () => {
    expect(contrast('#f2f6f8', '#0e151d')).toBeGreaterThanOrEqual(16);
    expect(contrast('#aab7c4', '#0e151d')).toBeGreaterThanOrEqual(7.2);
    expect(contrast('#e6b94a', '#0e151d')).toBeGreaterThanOrEqual(8);
    expect(contrast('#42c7e8', '#0e151d')).toBeGreaterThanOrEqual(7.4);
  });
});

describe('semantic v2 layer model', () => {
  it('orders layers strictly, so no feature has to guess a z-index', () => {
    const layers = ['content', 'sticky', 'nonmodal', 'modal', 'event', 'critical']
      .map((name) => Number(token(`--mfd-v2-z-${name}`)));

    expect(layers).toEqual([...layers].sort((a, b) => a - b));
    expect(new Set(layers).size).toBe(layers.length);
  });
});

describe('typography v2', () => {
  it('depends on no network at all', () => {
    expect(typographyCss).not.toMatch(/@font-face/);
    expect(typographyCss).not.toMatch(/url\(/);
    expect(typographyCss).not.toMatch(/https?:/);
  });

  it('ends every family stack in a generic family', () => {
    for (const role of ['body', 'display', 'data']) {
      const stack = token(`--mfd-v2-font-${role}`);
      expect(stack, role).toMatch(/(?:sans-serif|serif|monospace)\s*$/);
    }
  });

  it('ships the editorial serif the owner chose, not a condensed face', () => {
    expect(token('--mfd-v2-font-display')).toMatch(/^Georgia/);
    expect(token('--mfd-v2-font-display')).toMatch(/serif$/);
  });

  it('keeps the pixel face out of the new shell entirely', () => {
    expect(v2Css).not.toMatch(/Press Start/);
    expect(v2Css).not.toMatch(/font-pixel/);
  });

  it('never defines a role below the 12px floor', () => {
    const sizes = [...typographyCss.matchAll(/--mfd-v2-[\w-]*size:\s*([^;]+);/g)]
      .flatMap((match) => [...match[1]!.matchAll(/(\d+(?:\.\d+)?)px/g)].map((px) => Number(px[1])));

    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
  });

  it('defaults body to 16px and does not scale it with the viewport', () => {
    expect(token('--mfd-v2-body-size')).toBe('16px');
    expect(token('--mfd-v2-body-line')).toBe('24px');
  });

  it('bounds every clamped role so a wide canvas cannot run away', () => {
    for (const match of typographyCss.matchAll(/clamp\(([^)]+)\)/g)) {
      const [min, , max] = match[1]!.split(',').map((part) => part.trim());
      expect(Number.parseFloat(min!)).toBeLessThanOrEqual(Number.parseFloat(max!));
    }
  });

  it('gives the numeric roles tabular figures, so columns line up', () => {
    for (const role of ['data-sm', 'data-md']) {
      const block = typographyCss.slice(typographyCss.indexOf(`.mfd-v2-${role} {`));
      expect(block.slice(0, block.indexOf('}')), role).toContain('tabular-nums');
    }
  });

  it('bounds the reading measure', () => {
    expect(Number.parseInt(token('--mfd-v2-measure'), 10)).toBeLessThanOrEqual(75);
    expect(Number.parseInt(token('--mfd-v2-measure'), 10)).toBeGreaterThanOrEqual(45);
  });
});

describe('density v2', () => {
  it('offers exactly two modes, and compact is opt-in', () => {
    expect(densityCss).toContain("[data-mfd-density='compact']");
    expect(densityCss).not.toMatch(/data-mfd-density='(?!compact)/);
  });

  it('restores the touch floor for compact on a coarse pointer', () => {
    const coarseBlock = densityCss.slice(densityCss.indexOf('@media (pointer: coarse)'));

    expect(coarseBlock).toContain('--mfd-v2-density-row:');
    expect(coarseBlock).toContain('var(--mfd-v2-control-min)');
  });

  it('never lets the tappable target shrink with density', () => {
    expect(token('--mfd-v2-density-target')).toBe('var(--mfd-v2-control-min)');
    expect(token('--mfd-v2-control-min')).toBe('44px');
    expect(token('--mfd-v2-control-default')).toBe('48px');
  });

  it('gives comfortable phone rows room for a reason line', () => {
    expect(Number.parseInt(token('--mfd-v2-density-row'), 10)).toBeGreaterThanOrEqual(48);
    expect(Number.parseInt(token('--mfd-v2-row-min'), 10)).toBeGreaterThanOrEqual(56);
  });

  it('treats compact height as a first-class case, since it is the worst one', () => {
    expect(densityCss).toContain('@media (max-height: 599px)');
  });

  it('uses the 4/8/12/16/24/32/48/64 scale and nothing else', () => {
    const scale = [1, 2, 3, 4, 5, 6, 7, 8]
      .map((step) => Number.parseInt(token(`--mfd-v2-space-${step}`), 10));

    expect(scale).toEqual([4, 8, 12, 16, 24, 32, 48, 64]);
  });
});
