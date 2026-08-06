import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  COMPACT_HEIGHT_MAX,
  DEFAULT_MEASUREMENT,
  LAYOUT_BREAKPOINTS,
  resolveLayoutEnvironment,
  resolveLayoutMode,
} from './AdaptiveViewport';
import { APP_CONTENT_ID, AppFrame, resolveFrameLayout } from './AppFrame';
import { PageScroll } from './PageScroll';
import { PaneLayout, resolvePaneColumns } from './PaneLayout';
import { StickyActionDock } from './StickyActionDock';

const layoutCss = readFileSync(fileURLToPath(new URL('./layout.module.css', import.meta.url)), 'utf8');
const a11yCss = readFileSync(fileURLToPath(new URL('../../app/a11y.css', import.meta.url)), 'utf8');
const semanticCss = readFileSync(
  fileURLToPath(new URL('../../../../../packages/design-system/tokens/semantic-v2.css', import.meta.url)),
  'utf8',
);

/** doc 09 LAY-06: total permanent chrome on phone. */
const LAY_06_CHROME_BUDGET_PX = 152;

describe('layout modes', () => {
  it('pins the breakpoint values themselves', () => {
    // Deriving the expectations from the constants makes the test agree with
    // whatever the constants happen to say. `medium` is the phone/not-phone
    // boundary and could drift anywhere in (320, 844] undetected.
    expect(LAYOUT_BREAKPOINTS).toEqual({ medium: 600, expanded: 1024, wide: 1440 });
    expect(COMPACT_HEIGHT_MAX).toBe(599);
  });

  it('places every boundary on the documented side of the line', () => {
    expect(resolveLayoutMode(320)).toBe('compact');
    expect(resolveLayoutMode(599)).toBe('compact');
    expect(resolveLayoutMode(600)).toBe('medium');
    expect(resolveLayoutMode(1023)).toBe('medium');
    expect(resolveLayoutMode(1024)).toBe('expanded');
    expect(resolveLayoutMode(1439)).toBe('expanded');
    expect(resolveLayoutMode(1440)).toBe('wide');
    expect(resolveLayoutMode(2560)).toBe('wide');
  });

  it('classifies every viewport in the doc-09 matrix as the audit does', () => {
    // The twelve the geometry harness actually captures. A breakpoint that
    // drifts reclassifies one of these before it reclassifies anything else.
    const matrix: [number, number, string, boolean][] = [
      [320, 568, 'compact', true],
      [360, 800, 'compact', false],
      [390, 844, 'compact', false],
      [430, 932, 'compact', false],
      [667, 375, 'medium', true],
      [844, 390, 'medium', true],
      [932, 430, 'medium', true],
      [768, 1024, 'medium', false],
      [1024, 768, 'expanded', false],
      [1280, 720, 'expanded', false],
      [1440, 900, 'wide', false],
      [1600, 1000, 'wide', false],
    ];

    for (const [width, height, mode, compactHeight] of matrix) {
      const environment = resolveLayoutEnvironment({ width, height, coarsePointer: false });
      expect(environment.mode, `${width}x${height}`).toBe(mode);
      expect(environment.compactHeight, `${width}x${height}`).toBe(compactHeight);
    }
  });

  it('treats compact height as its own dimension, not a width consequence', () => {
    // 844x390 landscape: a wide-ish window that is the worst case in the app.
    const landscape = resolveLayoutEnvironment({ width: 844, height: 390, coarsePointer: true });

    expect(landscape.mode).toBe('medium');
    expect(landscape.compactHeight).toBe(true);
  });

  it('puts the compact-height boundary exactly where the stylesheet does', () => {
    expect(
      resolveLayoutEnvironment({ width: 390, height: COMPACT_HEIGHT_MAX, coarsePointer: true })
        .compactHeight,
    ).toBe(true);
    expect(
      resolveLayoutEnvironment({ width: 390, height: COMPACT_HEIGHT_MAX + 1, coarsePointer: true })
        .compactHeight,
    ).toBe(false);
    expect(layoutCss).toContain(`@media (max-height: ${COMPACT_HEIGHT_MAX}px)`);
  });

  it('defaults to the most constrained shape before it can measure', () => {
    // Guessing "expanded" on the server produces a visible desktop-to-phone
    // collapse on hydration, on the viewport the audit found broken.
    const initial = resolveLayoutEnvironment(DEFAULT_MEASUREMENT);

    expect(initial.mode).toBe('compact');
    expect(initial.coarsePointer).toBe(true);
  });

  it('carries the measurement through so callers do not re-read the window', () => {
    expect(resolveLayoutEnvironment({ width: 1280, height: 720, coarsePointer: false })).toEqual({
      mode: 'expanded',
      compactHeight: false,
      coarsePointer: false,
      width: 1280,
      height: 720,
    });
  });
});

describe('AppFrame', () => {
  it('makes the skip link the first tab stop, before the chrome', () => {
    const html = renderToStaticMarkup(
      <AppFrame chrome={<nav>nav</nav>}>content</AppFrame>,
    );

    expect(html.indexOf('Skip to main content')).toBeLessThan(html.indexOf('<nav>'));
    expect(html).toContain(`href="#${APP_CONTENT_ID}"`);
    expect(html).toContain(`id="${APP_CONTENT_ID}"`);
  });

  it('publishes the layout mode to the DOM, where CSS and Playwright can read it', () => {
    const html = renderToStaticMarkup(<AppFrame>content</AppFrame>);

    expect(html).toContain('data-mfd-v2-viewport="true"');
    expect(html).toContain('data-mfd-v2-mode="compact"');
    expect(html).toContain('data-mfd-v2-compact-height="false"');
    expect(html).toContain('data-mfd-v2-pointer="coarse"');
  });

  it('renders exactly one scroll owner', () => {
    const html = renderToStaticMarkup(
      <AppFrame chrome={<nav>nav</nav>} dock={<StickyActionDock label="Week actions">go</StickyActionDock>}>
        <PageScroll contained reason="virtualised roster table">rows</PageScroll>
      </AppFrame>,
    );

    expect(html.match(/data-mfd-v2-scroll-owner="page"/g)).toHaveLength(1);
  });

  it('reserves nothing when there is no dock', () => {
    const html = renderToStaticMarkup(<AppFrame>content</AppFrame>);

    expect(html).not.toContain('data-mfd-v2-action-dock');
  });

  it('omits the chrome row entirely rather than rendering an empty bar', () => {
    expect(renderToStaticMarkup(<AppFrame>content</AppFrame>))
      .not.toContain('data-mfd-v2-chrome');
  });

  it('omits the nav row entirely rather than reserving an empty column', () => {
    const html = renderToStaticMarkup(<AppFrame>content</AppFrame>);

    expect(html).not.toContain('data-mfd-v2-nav-slot');
    expect(html).toContain('data-mfd-v2-frame-layout="stacked"');
  });

  it('puts navigation before content in the DOM, behind the skip link', () => {
    const html = renderToStaticMarkup(
      <AppFrame nav={<nav aria-label="Primary">hubs</nav>} chrome={<p>context</p>}>
        content
      </AppFrame>,
    );

    // The skip link is what makes nav-first acceptable on a phone: one tab
    // stop reaches the content instead of five. If the nav ever moves ahead of
    // it, a keyboard user has to walk the whole bar to start reading.
    expect(html.indexOf('Skip to main content')).toBeLessThan(html.indexOf('aria-label="Primary"'));
    expect(html.indexOf('aria-label="Primary"')).toBeLessThan(html.indexOf('data-mfd-v2-chrome'));
    expect(html.indexOf('data-mfd-v2-chrome')).toBeLessThan(html.indexOf('data-mfd-v2-scroll-owner'));
  });
});

describe('frame layout', () => {
  it('stacks the nav under the content on phone and sides it from medium up', () => {
    expect(resolveFrameLayout('compact', true)).toBe('stacked');
    expect(resolveFrameLayout('medium', true)).toBe('sided');
    expect(resolveFrameLayout('expanded', true)).toBe('sided');
    expect(resolveFrameLayout('wide', true)).toBe('sided');
  });

  it('stays stacked with no nav, so a bare frame reserves no column', () => {
    for (const mode of ['compact', 'medium', 'expanded', 'wide'] as const) {
      expect(resolveFrameLayout(mode, false), mode).toBe('stacked');
    }
  });

  it('renders in the default compact shape before it can measure', () => {
    // The server default is 390x844, so a frame with a nav must arrive stacked
    // — an expanded first paint would collapse to phone on hydration, which is
    // the visible flash the mobile-first default exists to avoid.
    const html = renderToStaticMarkup(<AppFrame nav={<nav>hubs</nav>}>content</AppFrame>);

    expect(html).toContain('data-mfd-v2-frame-layout="stacked"');
    expect(html).toContain('data-mfd-v2-nav-slot="true"');
  });
});

describe('PageScroll', () => {
  it('is the page scroll owner by default', () => {
    expect(renderToStaticMarkup(<PageScroll>content</PageScroll>))
      .toContain('data-mfd-v2-scroll-owner="page"');
  });

  it('records the reason for every contained exception, on the element itself', () => {
    const html = renderToStaticMarkup(
      <PageScroll contained reason="virtualised roster table">rows</PageScroll>,
    );

    expect(html).toContain('data-mfd-v2-scroll-owner="contained"');
    expect(html).toContain('data-mfd-v2-scroll-reason="virtualised roster table"');
  });

  it('is focusable as a route-change target without joining the tab order', () => {
    expect(renderToStaticMarkup(<PageScroll>content</PageScroll>)).toContain('tabindex="-1"');
  });
});

describe('PaneLayout', () => {
  it('collapses to one column on compact and up to three only on wide', () => {
    expect(resolvePaneColumns('compact', 3)).toBe(1);
    expect(resolvePaneColumns('medium', 3)).toBe(2);
    expect(resolvePaneColumns('expanded', 3)).toBe(2);
    expect(resolvePaneColumns('wide', 3)).toBe(3);
  });

  it('never claims more columns than it has panes', () => {
    expect(resolvePaneColumns('wide', 1)).toBe(1);
    expect(resolvePaneColumns('wide', 2)).toBe(2);
    expect(resolvePaneColumns('expanded', 1)).toBe(1);
  });

  it('keeps every pane in the document at compact — collapsing is not hiding', () => {
    const html = renderToStaticMarkup(
      <PaneLayout
        primary="offers"
        secondary="roster"
        tertiary="cap"
        labels={{ primary: 'Offers', secondary: 'Roster', tertiary: 'Cap' }}
      />,
    );

    expect(html).toContain('data-mfd-v2-panes="1"');
    expect(html).toContain('data-mfd-v2-pane-count="3"');
    expect(html).toContain('offers');
    expect(html).toContain('roster');
    expect(html).toContain('cap');
    expect(html).not.toContain('display:none');
  });

  it('names every pane, so a split view is navigable by landmark', () => {
    const html = renderToStaticMarkup(
      <PaneLayout primary="a" secondary="b" labels={{ primary: 'Offers', secondary: 'Roster' }} />,
    );

    expect(html).toContain('aria-label="Offers"');
    expect(html).toContain('aria-label="Roster"');
  });
});

describe('StickyActionDock', () => {
  it('is a named landmark rather than an anonymous bar', () => {
    const html = renderToStaticMarkup(
      <StickyActionDock label="Week actions">advance</StickyActionDock>,
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Week actions"');
    expect(html).toContain('data-mfd-v2-action-dock="true"');
  });
});

describe('layout stylesheet', () => {
  it('uses tokens and never a raw colour', () => {
    expect(layoutCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layoutCss).not.toMatch(/\brgba?\(/);
  });

  it('sizes the frame in dvh with a vh fallback', () => {
    const frame = layoutCss.slice(layoutCss.indexOf('.frame {'));
    const block = frame.slice(0, frame.indexOf('}'));

    expect(block).toContain('height: 100vh;');
    expect(block).toContain('height: 100dvh;');
    expect(block.indexOf('100vh')).toBeLessThan(block.indexOf('100dvh'));
  });

  it('lets the scroll row actually shrink', () => {
    // Without `min-height: 0` a grid row refuses to go below its content, the
    // frame outgrows the viewport, and the page scrolls behind the chrome.
    const block = layoutCss.slice(layoutCss.indexOf('.pageScroll {'));

    expect(block.slice(0, block.indexOf('}'))).toContain('min-height: 0;');
  });

  it('reserves nothing for the dock, because content cannot scroll under it', () => {
    // The dock is a grid row, so the content row already stops above it. The
    // old reservation added the dock's measured height to the content's
    // `padding-bottom` as well, which the geometry harness measured as 72px of
    // empty scroll at the end of every screen. If a dock ever becomes
    // `position: fixed` this has to come back — and the harness will say so.
    expect(layoutCss).not.toContain('--mfd-v2-dock-measured');
    expect(layoutCss).toContain('grid-area: dock;');
  });

  it('respects the bottom safe area on the dock', () => {
    const block = layoutCss.slice(layoutCss.indexOf('.actionDock {'));

    expect(block.slice(0, block.indexOf('}'))).toContain('var(--mfd-v2-safe-bottom)');
  });

  it('keeps dock controls at the nominal phone target height', () => {
    expect(layoutCss).toContain('min-height: var(--mfd-v2-control-default);');
  });

  it('fits nav plus dock inside the LAY-06 fixed-chrome budget', () => {
    // The budget is 152px of permanent chrome. The legacy shell measures
    // 383-425px on phone, so this is the arithmetic the whole frame exists to
    // satisfy — and it is the number that has to hold when WP-06 adds nav.
    const tokenPx = (name: string) => {
      const match = new RegExp(`${name}:\\s*(\\d+)px`).exec(semanticCss);
      expect(match, name).toBeTruthy();
      return Number(match![1]);
    };

    const nav = tokenPx('--mfd-v2-nav-compact');
    const dock = tokenPx('--mfd-v2-action-dock');

    expect(nav + dock).toBeLessThanOrEqual(LAY_06_CHROME_BUDGET_PX);
    // And each stays at or above the touch floor while doing it.
    expect(nav).toBeGreaterThanOrEqual(tokenPx('--mfd-v2-control-min'));
    expect(dock).toBeGreaterThanOrEqual(tokenPx('--mfd-v2-control-min'));
  });

  it('spends no raw length on the bottom edge', () => {
    expect(layoutCss).not.toMatch(/padding-bottom:\s*\d+px/);
  });

  it('gives every slot a named grid area in both shapes', () => {
    // A slot with no area lands in an implicit track, which on a four-row grid
    // means the dock quietly stops being the dock. Both templates are pinned
    // because they are the only place the two shapes are described.
    for (const area of ['nav', 'chrome', 'content', 'dock']) {
      expect(layoutCss, area).toMatch(new RegExp(`grid-area: ${area};`));
    }
    expect(layoutCss).toContain("'chrome'\n    'content'\n    'dock'\n    'nav'");
    expect(layoutCss).toContain("'nav chrome'\n    'nav content'\n    'nav dock'");
  });

  it('pays the home-indicator clearance once, not once per bottom element', () => {
    // Dock and nav both sit at the bottom on phone, and both defaulting to
    // safe-bottom spends the inset twice on a device that has one.
    expect(layoutCss).toContain(
      ".frame[data-mfd-v2-frame-layout='stacked']:has(.navSlot) .actionDock",
    );
  });

  it('lets a rail scroll instead of stretching the frame past the window', () => {
    const block = layoutCss.slice(layoutCss.indexOf('.navSlot {'));

    expect(block.slice(0, block.indexOf('}'))).toContain('min-height: 0;');
  });
});

describe('focus styling', () => {
  it('scopes the new ring so the legacy rule keeps owning legacy screens', () => {
    const legacyRule = a11yCss.slice(0, a11yCss.indexOf('/**'));

    expect(legacyRule).toContain('outline: 3px solid var(--mfd-cyan);');
    expect(a11yCss).toContain('[data-mfd-v2-viewport] :focus-visible');
    expect(a11yCss.indexOf('--mfd-v2-focus-ring')).toBeGreaterThan(a11yCss.indexOf('--mfd-cyan'));
  });

  it('keeps an outline under the shadow, because forced colors discards shadows', () => {
    expect(a11yCss).toContain('@media (forced-colors: active)');
    const scoped = a11yCss.slice(a11yCss.indexOf('[data-mfd-v2-viewport] :focus-visible'));

    expect(scoped.slice(0, scoped.indexOf('}'))).toContain('outline:');
  });
});
