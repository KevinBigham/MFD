/**
 * The shell's composition contract.
 *
 * What matters here is that the shell is the *only* owner of permanent chrome.
 * The legacy shell's 383–425px came from every surface declaring its own; the
 * guard against repeating that is structural — a screen that reaches for
 * `AppFrame` directly gets its own nav, its own dock, and its own arithmetic.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildNavigationModel } from '../navigation/navigation-model';
import { MfdAppShell, shouldMoveFocus } from './MfdAppShell';

const todayScreenSource = readFileSync(
  fileURLToPath(new URL('../today/TodayScreen.tsx', import.meta.url)),
  'utf8',
);

const frameSource = readFileSync(fileURLToPath(new URL('../layout/AppFrame.tsx', import.meta.url)), 'utf8');

function render(): string {
  return renderToStaticMarkup(
    <MfdAppShell
      header={<h1>Lakeview Ridgebacks</h1>}
      navigation={buildNavigationModel('/today', [])}
      dock={<div data-test-dock="true">Advance Week</div>}
      routeKey="/today"
    >
      <p>content</p>
    </MfdAppShell>,
  );
}

describe('shell composition', () => {
  it('renders exactly one navigation, one main landmark, and one header', () => {
    const html = render();

    expect(html.match(/<nav /g), 'nav').toHaveLength(1);
    expect(html.match(/<main /g), 'main').toHaveLength(1);
    expect(html.match(/data-mfd-v2-chrome="true"/g), 'chrome').toHaveLength(1);
    expect(html.match(/data-mfd-v2-frame="true"/g), 'frame').toHaveLength(1);
  });

  it('puts the screen content inside the single scroll owner', () => {
    const html = render();
    const main = html.slice(html.indexOf('<main '), html.indexOf('</main>'));

    expect(main).toContain('<p>content</p>');
    expect(html.match(/data-mfd-v2-scroll-owner="page"/g)).toHaveLength(1);
  });

  it('keeps the header, the nav and the dock outside the scrolling region', () => {
    const html = render();
    const mainStart = html.indexOf('<main ');
    const mainEnd = html.indexOf('</main>');
    const main = html.slice(mainStart, mainEnd);

    expect(main).not.toContain('<nav ');
    expect(main).not.toContain('Lakeview Ridgebacks');
    expect(main).not.toContain('data-test-dock');
    // …and the dock still follows the content, so it is the last thing before
    // the frame closes rather than something the content scrolls under.
    expect(html.indexOf('data-test-dock')).toBeGreaterThan(mainEnd);
  });

  it('gives the shell a nav slot rather than letting the screen supply one', () => {
    expect(render()).toContain('data-mfd-v2-nav-slot="true"');
  });
});

describe('route-change focus', () => {
  it('does not steal focus on first paint', () => {
    // The player has just loaded the page; focus is wherever the browser put
    // it. Moving it into the content region on arrival is a steal.
    expect(shouldMoveFocus(null, '/today')).toBe(false);
  });

  it('moves focus when the route actually changes', () => {
    expect(shouldMoveFocus('/today', '/roster')).toBe(true);
  });

  it('leaves focus alone when a re-render reports the same route', () => {
    // Store notifications re-render the shell constantly. Focusing the main
    // landmark on every one of them would eject a player mid-keystroke.
    expect(shouldMoveFocus('/today', '/today')).toBe(false);
  });

  it('aims the focus at the element the frame actually renders', () => {
    // The effect itself cannot be executed here — no jsdom — and it is dormant
    // in production until a second route joins the shell, so nothing catches
    // the two ids drifting apart. This does: both come from one binding.
    const source = readFileSync(fileURLToPath(new URL('./MfdAppShell.tsx', import.meta.url)), 'utf8');

    expect(source).toContain('useRouteFocus(routeKey, contentId)');
    expect(source).toContain('contentId={contentId}');
    expect(source).toContain("document.getElementById(contentId)?.focus()");
    // The frame gives that id to `PageScroll`, which carries `tabIndex={-1}`
    // so it is focusable as a target without joining the tab order.
    expect(frameSource).toContain('<PageScroll id={contentId}');
  });
});

describe('chrome ownership', () => {
  it('is the only thing the Today screen frames itself with', () => {
    // A screen that imports `AppFrame` renders a second frame inside the
    // first: two navs, two docks, and a LAY-06 number that is the sum.
    expect(todayScreenSource).toContain('MfdAppShell');
    expect(todayScreenSource).not.toMatch(/import .*\bAppFrame\b/);
    expect(todayScreenSource).not.toContain('<AppFrame');
  });
});
