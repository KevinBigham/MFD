/**
 * Navigation semantics, asserted from rendered markup.
 *
 * There is no jsdom in this monorepo, so what can be proved here is what the
 * server renders: the destinations present, their order, their links, their
 * accessible current-page state, and the textual equivalent of every badge.
 * Geometry — heights, targets, overlap — is proved in the Playwright harness
 * against a real engine, and the CSS assertions below are deliberately about
 * the *rules* that the harness cannot attribute to a cause.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { mergeTaskLedger, taskDestination, type UiTask } from '../tasks/task-ledger';
import { AdaptivePrimaryNav, navShowsSecondary, resolveNavVariant, type NavVariant } from './AdaptivePrimaryNav';
import { buildNavigationModel } from './navigation-model';

const navCss = readFileSync(fileURLToPath(new URL('./navigation.module.css', import.meta.url)), 'utf8');

function ledger(): ReturnType<typeof mergeTaskLedger> {
  const rows: UiTask[] = [
    {
      id: 'game-plan',
      category: 'must',
      title: 'Set the game plan',
      reason: 'reason',
      consequence: 'consequence',
      destination: taskDestination('/game-plan'),
      severity: 'blocking',
      blocksAdvance: true,
      source: 'state',
      dedupeKey: 'game-plan',
    },
    ...Array.from({ length: 11 }, (_unused, index): UiTask => ({
      id: `roster-${index}`,
      category: 'must',
      title: `Roster ${index}`,
      reason: 'reason',
      consequence: 'consequence',
      destination: taskDestination('/roster'),
      severity: 'warning',
      blocksAdvance: false,
      source: 'state',
      dedupeKey: `roster-${index}`,
    })),
  ];
  return mergeTaskLedger(rows);
}

function render(path: string, variant: NavVariant, tasks = ledger()): string {
  return renderToStaticMarkup(
    <AdaptivePrimaryNav model={buildNavigationModel(path, tasks)} variant={variant} />,
  );
}

const VARIANTS: readonly NavVariant[] = ['bar', 'rail', 'sidebar'];

describe('nav variant', () => {
  it('maps each layout mode to its blueprint shape', () => {
    expect(resolveNavVariant('compact')).toBe('bar');
    expect(resolveNavVariant('medium')).toBe('rail');
    expect(resolveNavVariant('expanded')).toBe('rail');
    expect(resolveNavVariant('wide')).toBe('sidebar');
  });

  it('drops the sidebar in a short window, where its rows do not fit', () => {
    // Seven 56px two-line rows need 392px before padding. At 1440x390 the
    // sidebar overflowed and the rail — which has `overflow-y: auto` so a
    // destination is never hidden — became a second scroll owner. The geometry
    // harness measured it; this is the rule that stops it.
    expect(resolveNavVariant('wide', true)).toBe('rail');
    expect(resolveNavVariant('expanded', true)).toBe('rail');
    expect(resolveNavVariant('compact', true)).toBe('bar');
  });

  it('shows Dynasty and System everywhere except the phone bar', () => {
    expect(navShowsSecondary('bar')).toBe(false);
    expect(navShowsSecondary('rail')).toBe(true);
    expect(navShowsSecondary('sidebar')).toBe(true);
  });
});

describe('destinations', () => {
  it('renders the five job destinations in order on phone, and nothing else', () => {
    const html = render('/today', 'bar');
    const hubs = [...html.matchAll(/data-mfd-v2-nav-hub="([a-z]+)"/g)].map((match) => match[1]);

    expect(hubs).toEqual(['today', 'team', 'game', 'office', 'league']);
    expect(html).toContain('data-mfd-v2-nav-count="5"');
  });

  it('adds Dynasty and System after the five, never in place of one', () => {
    for (const variant of ['rail', 'sidebar'] as const) {
      const hubs = [...render('/today', variant).matchAll(/data-mfd-v2-nav-hub="([a-z]+)"/g)].map((m) => m[1]);
      expect(hubs, variant).toEqual(['today', 'team', 'game', 'office', 'league', 'dynasty', 'system']);
    }
  });

  it('links each destination as a real hash link, so back and middle-click work', () => {
    const html = render('/today', 'sidebar');
    for (const route of ['#/today', '#/roster', '#/game-day', '#/front-office', '#/standings', '#/franchise', '#/settings']) {
      expect(html, route).toContain(`href="${route}"`);
    }
  });

  it('carries a visible text label for every destination at every width', () => {
    for (const variant of VARIANTS) {
      const html = render('/today', variant);
      for (const label of ['Today', 'Team', 'Game', 'Office', 'League']) {
        expect(html, `${variant}:${label}`).toContain(`>${label}<`);
      }
    }
  });

  it('shows the placement line only where there is room to read it', () => {
    expect(render('/today', 'sidebar')).toContain('Team default');
    expect(render('/today', 'rail')).not.toContain('Team default');
    expect(render('/today', 'bar')).not.toContain('Team default');
  });
});

describe('current page', () => {
  it('marks the active hub for assistive technology, not only for CSS', () => {
    const html = render('/today', 'bar');
    expect(html).toMatch(/aria-current="page"[^>]*data-mfd-v2-nav-hub="today"/);
    expect([...html.matchAll(/aria-current="page"/g)]).toHaveLength(1);
  });

  it('follows the path into a legacy hub, so the tab bar is right in both shells', () => {
    // `/depth-chart` is a team route rendered by the legacy shell. The
    // navigation still has to say Team is where you are.
    const html = render('/depth-chart', 'bar');
    expect(html).toMatch(/aria-current="page"[^>]*data-mfd-v2-nav-hub="team"/);
    expect(html).toContain('data-mfd-v2-nav-active="true"');
  });

  it('marks nothing current on a path no hub owns, rather than defaulting to Today', () => {
    const html = render('/not-a-route', 'bar');
    expect(html).not.toContain('aria-current="page"');
    expect(html).not.toContain('data-mfd-v2-nav-active="true"');
  });

  it('records which destinations stay in the new shell', () => {
    const html = render('/today', 'bar');
    expect([...html.matchAll(/data-mfd-v2-nav-migrated="true"/g)]).toHaveLength(1);
    expect([...html.matchAll(/data-mfd-v2-nav-migrated="false"/g)]).toHaveLength(4);
  });
});

describe('badges', () => {
  it('gives every badge a textual equivalent, not a bare number', () => {
    const html = render('/today', 'bar');
    // `/game-plan` is one game-hub job; the eleven roster rows are team jobs.
    expect(html).toContain('1 open job<');
    expect(html).toContain('11 open jobs<');
  });

  it('speaks the true count where the visible one is bounded', () => {
    const html = render('/today', 'bar');
    expect(html).toContain('>9+<');
    expect(html).toContain('11 open jobs<');
    expect(html).toContain('data-mfd-v2-nav-badge="11"');
  });

  it('renders no badge element at all when a hub is clear', () => {
    const html = render('/today', 'bar', []);
    expect(html).not.toContain('data-mfd-v2-nav-badge');
    expect(html).not.toContain('open job');
  });

  it('hides the glyph from assistive technology so the count is spoken once', () => {
    expect(render('/today', 'bar')).toContain('<span aria-hidden="true">9+</span>');
  });
});

describe('navigation css contracts', () => {
  it('names the navigation as a landmark rather than leaving it anonymous', () => {
    expect(render('/today', 'bar')).toContain('aria-label="Primary"');
  });

  it('never puts a target below the 44px floor, including in a short window', () => {
    // TOUCH-01. The compact-height rule shrinks the bar; the floor it shrinks
    // to is the assertion that matters, because `--mfd-v2-space-*` would
    // happily go lower.
    expect(navCss).toMatch(/min-height: var\(--mfd-v2-nav-compact\)/);
    const compactBlock = navCss.slice(navCss.indexOf('@media (max-height: 599px)'));
    expect(compactBlock).toContain('min-height: var(--mfd-v2-control-min)');
    expect(compactBlock).not.toMatch(/min-height: var\(--mfd-v2-space/);
  });

  it('keeps the phone bar clear of the home indicator', () => {
    const barBlock = navCss.slice(navCss.indexOf(".nav[data-mfd-v2-nav='bar'] {"));
    expect(barBlock).toContain('padding-bottom: var(--mfd-v2-safe-bottom)');
  });

  it('lets a rail scroll rather than dropping a destination it cannot fit', () => {
    // Hiding an overflowing destination is feature loss by CSS; ROUTE-01 counts
    // it the same as deleting the route.
    expect(navCss).not.toContain('display: none');
    expect(navCss).toContain('overflow-y: auto');
  });

  it('spends no raw colour or spacing, so WP-22 inherits nothing', () => {
    // Strip the tokens out and assert what is left carries no length and no
    // colour. Checking that a value merely *contains* `var(` passes for
    // `calc(var(--mfd-v2-space-2) + 12px)`, which is exactly the debt WP-22
    // exists to pay down.
    // Comments and at-rule preludes are stripped rather than skipped by line
    // position: anchoring to the start of a line let `.item { padding: 12px; }`
    // through, because a single-line rule puts the declaration after the
    // selector.
    const declarations = [
      ...navCss
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/@[a-z-]+[^{]*\{/g, '{')
        .matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g),
    ].filter(([, property]) => !property!.startsWith('--'));

    expect(declarations.length).toBeGreaterThan(20);

    // Hairline borders, the two halves of a centring transform, and the one
    // sidebar width the token scale has no member for. Everything else must be
    // a token.
    const ALLOWED_LITERALS = new Set(['1px', '-1px', '50%', '-50%', '13rem']);

    for (const [, property, value] of declarations) {
      const residue = value!.replace(/var\(--mfd-v2-[a-z0-9-]+\)/g, ' ');
      const literals = residue.match(/-?\d*\.?\d+(px|rem|em|%|fr|vh|vw|dvh)/g) ?? [];

      for (const literal of literals) {
        expect(ALLOWED_LITERALS.has(literal), `${property}: ${value} → ${literal}`).toBe(true);
      }
      expect(residue, `${property}: ${value}`).not.toMatch(/#[0-9a-f]{3}|rgba?\(|hsla?\(/i);
    }
  });
});
