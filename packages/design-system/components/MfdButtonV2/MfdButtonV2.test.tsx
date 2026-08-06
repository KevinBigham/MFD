import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MfdButtonV2, resolveButtonState } from './MfdButtonV2';
import { MfdStateFrame } from '../MfdStateFrame/MfdStateFrame';
import { MfdLocalNav, resolveNavItemState } from '../MfdLocalNav/MfdLocalNav';
import { MfdStickyAction } from '../MfdStickyAction/MfdStickyAction';
import {
  FOCUSABLE_SELECTOR,
  getFocusable,
  nextFocusIndex,
  selectInertTargets,
} from '../MfdBottomSheet/MfdBottomSheet';

const css = (file: string) =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');

const buttonCss = css('./MfdButtonV2.module.css');
const sheetCss = css('../MfdBottomSheet/MfdBottomSheet.module.css');
const navCss = css('../MfdLocalNav/MfdLocalNav.module.css');
const frameCss = css('../MfdStateFrame/MfdStateFrame.module.css');
const stickyCss = css('../MfdStickyAction/MfdStickyAction.module.css');
const allV2Css = [buttonCss, sheetCss, navCss, frameCss, stickyCss].join('\n');

describe('button state matrix', () => {
  it('marks a busy control busy without removing it from the tab order', () => {
    // A natively disabled button drops out of the tab order, so a player who
    // pressed it loses their place the moment it starts working.
    expect(resolveButtonState({ tone: 'primary', loading: true, disabled: false })).toEqual({
      'data-mfd-v2-button': 'primary',
      'data-mfd-v2-state': 'loading',
      'aria-busy': 'true',
      'aria-disabled': 'true',
    });
  });

  it('distinguishes blocked from busy', () => {
    expect(resolveButtonState({ tone: 'secondary', loading: false, disabled: true }))
      .toEqual({
        'data-mfd-v2-button': 'secondary',
        'data-mfd-v2-state': 'disabled',
        'aria-disabled': 'true',
      });
    expect(resolveButtonState({ tone: 'ghost', loading: false, disabled: false }))
      .toEqual({ 'data-mfd-v2-button': 'ghost', 'data-mfd-v2-state': 'rest' });
  });

  it('lets loading win over disabled, because busy is the more useful truth', () => {
    expect(resolveButtonState({ tone: 'primary', loading: true, disabled: true })['data-mfd-v2-state'])
      .toBe('loading');
  });

  it('renders a disabled reason and wires it as the description', () => {
    const html = renderToStaticMarkup(
      <MfdButtonV2 disabled disabledReason="Set a game plan first">
        Advance Week
      </MfdButtonV2>,
    );

    expect(html).toContain('Set a game plan first');
    expect(html).toContain('data-mfd-v2-button-description="true"');

    const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
  });

  it('announces a destructive consequence before the player commits', () => {
    const html = renderToStaticMarkup(
      <MfdButtonV2 tone="destructive" consequence="Releases the player and adds dead money">
        Release
      </MfdButtonV2>,
    );

    expect(html).toContain('data-mfd-v2-button="destructive"');
    expect(html).toContain('Releases the player and adds dead money');
  });

  it('keeps the label while busy, so the button cannot resize under a finger', () => {
    const html = renderToStaticMarkup(<MfdButtonV2 loading>Advance Week</MfdButtonV2>);

    expect(html).toContain('Advance Week');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('drops the handler while busy or blocked, so a double press cannot commit twice', () => {
    const onClick = vi.fn();

    expect(renderToStaticMarkup(<MfdButtonV2 loading onClick={onClick}>Go</MfdButtonV2>))
      .not.toContain('onclick');
    expect(
      renderToStaticMarkup(
        <MfdButtonV2 disabled disabledReason="Locked until Week 4" onClick={onClick}>Go</MfdButtonV2>,
      ),
    ).not.toContain('onclick');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('defaults to type=button, so it cannot submit a form it happens to sit in', () => {
    expect(renderToStaticMarkup(<MfdButtonV2>Go</MfdButtonV2>)).toContain('type="button"');
  });

  it('presents as one element to its parent, description included', () => {
    // A bare fragment makes the description a sibling of the button, and any
    // flex or grid parent — the action dock sizes every child to 48px — treats
    // the explanation as a second control.
    const html = renderToStaticMarkup(
      <MfdButtonV2 disabled disabledReason="Locked until Week 4">Go</MfdButtonV2>,
    );

    expect(html.startsWith('<span')).toBe(true);
    expect(html).toContain('data-mfd-v2-button-wrap="true"');
    expect(html.match(/data-mfd-v2-button-wrap/g)).toHaveLength(1);
  });
});

describe('state frame', () => {
  it('passes ready content straight through, adding no wrapper', () => {
    expect(renderToStaticMarkup(<MfdStateFrame label="Roster"><p>rows</p></MfdStateFrame>))
      .toBe('<p>rows</p>');
  });

  it('keeps content mounted under a loading state so the screen does not jump', () => {
    const html = renderToStaticMarkup(
      <MfdStateFrame status="loading" label="Roster"><p>rows</p></MfdStateFrame>,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('<p>rows</p>');
    expect(html).toContain('Loading Roster');
  });

  it('says what failed AND what was not changed', () => {
    // The second one is what everybody omits and what a player actually needs
    // after a failed trade or a failed save.
    const html = renderToStaticMarkup(
      <MfdStateFrame
        status="error"
        label="Trade"
        whatFailed="The offer could not be sent."
        whatWasNotChanged="Your roster and cap space are unchanged."
        recovery={<button type="button">Try again</button>}
      />,
    );

    expect(html).toContain('The offer could not be sent.');
    expect(html).toContain('Your roster and cap space are unchanged.');
    expect(html).toContain('data-mfd-v2-error-scope="true"');
    expect(html).toContain('Try again');
  });

  it('explains an empty state instead of showing a blank panel', () => {
    const html = renderToStaticMarkup(
      <MfdStateFrame status="empty" label="Offers" reason="No team has made an offer this week." />,
    );

    expect(html).toContain('No team has made an offer this week.');
    expect(html).toContain('data-mfd-v2-state-frame="empty"');
  });

  it('gives a locked state both its timing and a way back', () => {
    const html = renderToStaticMarkup(
      <MfdStateFrame
        status="locked"
        label="Draft"
        timing="The draft opens after the Super Bowl."
        wayBack={<a href="#/today">Back to Today</a>}
      />,
    );

    expect(html).toContain('The draft opens after the Super Bowl.');
    expect(html).toContain('Back to Today');
  });

  it('announces exactly one status per frame', () => {
    const html = renderToStaticMarkup(
      <MfdStateFrame status="empty" label="Offers" reason="Nothing yet." />,
    );

    expect(html.match(/role="status"/g)).toHaveLength(1);
  });
});

describe('overlay focus arithmetic', () => {
  it('wraps forward and backward, and reports nothing to focus', () => {
    expect(nextFocusIndex(0, 1, 3)).toBe(1);
    expect(nextFocusIndex(2, 1, 3)).toBe(0);
    expect(nextFocusIndex(0, -1, 3)).toBe(2);
    expect(nextFocusIndex(-1, 1, 3)).toBe(0);
    expect(nextFocusIndex(0, 1, 0)).toBe(-1);
  });

  it('starts from the first stop when focus is outside the trap', () => {
    // indexOf returns -1 for an element the sheet does not contain; Tab must
    // pull focus in rather than throw or land nowhere.
    expect(nextFocusIndex(-1, 1, 4)).toBe(0);
    expect(nextFocusIndex(-1, -1, 4)).toBe(3);
  });

  it('excludes tabindex -1 from the stops it collects', () => {
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
    expect(FOCUSABLE_SELECTOR).toContain('button:not([disabled])');
  });

  it('returns nothing for a missing container rather than throwing', () => {
    expect(getFocusable(null)).toEqual([]);
  });

  it('skips stops that are present but not perceivable', () => {
    // No jsdom here, so the container is a stub — but this is the filtering
    // the function exists for, and it was previously never executed.
    const stop = (attrs: { hidden?: boolean; insideHidden?: boolean }) => ({
      hasAttribute: (name: string) => name === 'hidden' && Boolean(attrs.hidden),
      closest: () => (attrs.insideHidden ? {} : null),
      id: JSON.stringify(attrs),
    });
    const visible = stop({});
    const container = {
      querySelectorAll: () => [visible, stop({ hidden: true }), stop({ insideHidden: true })],
    } as unknown as ParentNode;

    expect(getFocusable(container)).toEqual([visible]);
  });
});

describe('overlay inertness', () => {
  it('inerts every top-level sibling that does not contain the sheet', () => {
    // aria-modal tells a screen reader the rest of the page is out of play. It
    // does not stop a swipe-navigating user reaching it, and it does not stop
    // Tab escaping in older engines.
    const sheet = { tag: 'sheet' };
    const holder = { contains: (node: unknown) => node === sheet };
    const sibling = { contains: () => false };
    const other = { contains: () => false };

    expect(selectInertTargets([holder, sibling, other] as unknown as Element[], sheet as unknown as Node))
      .toEqual([sibling, other]);
  });

  it('inerts nothing when there is no sheet to protect', () => {
    expect(selectInertTargets([{ contains: () => false }] as unknown as Element[], null)).toEqual([]);
  });
});

describe('local nav', () => {
  it('marks the current section and hides a zero badge', () => {
    expect(resolveNavItemState({ id: 'a', label: 'A', href: '#/a', badge: 0 }, 'a'))
      .toEqual({ current: true, locked: false, badge: null });
    expect(resolveNavItemState({ id: 'b', label: 'B', href: '#/b', badge: 3 }, 'a'))
      .toEqual({ current: false, locked: false, badge: 3 });
    expect(resolveNavItemState({ id: 'c', label: 'C', href: '#/c', lockedReason: 'Opens Week 4' }, 'a').locked)
      .toBe(true);
  });

  it('renders sections as real links, not tabs', () => {
    const html = renderToStaticMarkup(
      <MfdLocalNav
        label="Team sections"
        activeId="roster"
        items={[
          { id: 'roster', label: 'Roster', href: '#/team/roster' },
          { id: 'depth', label: 'Depth', href: '#/team/depth', badge: 2 },
        ]}
      />,
    );

    // Every hub section is a real destination — that is what makes deep links
    // and return-to-task work at all.
    expect(html).toContain('href="#/team/roster"');
    expect(html).not.toContain('role="tab');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="Team sections"');
  });

  it('gives a badge a noun, because a bare number means nothing aloud', () => {
    const html = renderToStaticMarkup(
      <MfdLocalNav
        label="Team sections"
        activeId="roster"
        items={[{ id: 'depth', label: 'Depth', href: '#/team/depth', badge: 2 }]}
      />,
    );

    expect(html).toContain('items need attention');
  });

  it('puts a locked reason in the accessible name, not in a hover-only title', () => {
    const html = renderToStaticMarkup(
      <MfdLocalNav
        label="Office sections"
        activeId="trades"
        items={[{ id: 'draft', label: 'Draft', href: '#/office/draft', lockedReason: 'Opens after the season' }]}
      />,
    );

    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('Opens after the season');
    expect(html).not.toContain('tabindex="-1"');
    // A `title` is hover-only, which means a locked section would explain
    // itself to everyone except a phone.
    expect(html).not.toContain('title=');
  });
});

describe('sticky action', () => {
  it('shows the reason and the unblocking control together when gated', () => {
    const html = renderToStaticMarkup(
      <MfdStickyAction
        label="Advance to Week 15"
        onActivate={() => {}}
        blocked
        blockedReason="No game plan saved for this matchup."
        unblock={<a href="#/game-plan">Set game plan</a>}
      />,
    );

    expect(html).toContain('No game plan saved for this matchup.');
    expect(html).toContain('Set game plan');
    expect(html).toContain('data-mfd-v2-blocked="true"');
    expect(html).toContain('aria-disabled="true"');
  });

  it('is a plain primary action when nothing blocks it', () => {
    const html = renderToStaticMarkup(
      <MfdStickyAction label="Advance to Week 15" onActivate={() => {}} />,
    );

    expect(html).toContain('data-mfd-v2-blocked="false"');
    expect(html).toContain('data-mfd-v2-state="rest"');
    expect(html).not.toContain('data-mfd-v2-block-reason');
  });
});

describe('v2 component stylesheets', () => {
  it('use tokens and never a raw colour', () => {
    expect(allV2Css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(allV2Css).not.toMatch(/\brgba?\(/);
  });

  it('gate hover so a tap cannot leave a state stuck on', () => {
    for (const [name, sheet] of [['button', buttonCss], ['nav', navCss]] as const) {
      expect(sheet.includes(':hover'), name).toBe(true);
      expect(sheet.includes('@media (hover: hover)'), name).toBe(true);
    }
  });

  it('keep every control at or above the touch floor', () => {
    expect(buttonCss).toContain('min-height: var(--mfd-v2-control-default);');
    expect(buttonCss).toContain('min-height: var(--mfd-v2-control-min);');
    expect(navCss).toContain('min-height: var(--mfd-v2-control-min);');
  });

  it('answer reduced motion without removing the indicator entirely', () => {
    // Dropping the spinner would leave aria-busy as the only signal, which is
    // invisible to anyone not using a screen reader.
    expect(buttonCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(buttonCss).toMatch(/prefers-reduced-motion[\s\S]*animation: none/);
    expect(sheetCss).toMatch(/prefers-reduced-motion[\s\S]*animation: none/);
  });

  it('tint the scrim with a token instead of fading the sheet inside it', () => {
    // `opacity` on the scrim inherits to the sheet and creates a stacking
    // context, so the sheet would fade along with its own backdrop.
    expect(sheetCss).toContain('background: var(--mfd-v2-scrim);');
    const scrim = sheetCss.slice(sheetCss.indexOf('.scrim {'));
    expect(scrim.slice(0, scrim.indexOf('}'))).not.toMatch(/^\s*opacity:/m);
  });

  it('keep the sheet clear of the gesture bar and inside the window', () => {
    expect(sheetCss).toContain('var(--mfd-v2-safe-bottom)');
    expect(sheetCss).toContain('100dvh');
    expect(sheetCss).toContain('@media (max-height: 599px)');
  });

  it('sit the sheet on the modal layer rather than a hand-picked z-index', () => {
    expect(sheetCss).toContain('z-index: var(--mfd-v2-z-modal);');
    expect(allV2Css).not.toMatch(/z-index:\s*\d/);
  });

  it('signal selection with more than colour', () => {
    const current = navCss.slice(navCss.indexOf("[data-mfd-v2-current='true']"));
    const block = current.slice(0, current.indexOf('}'));

    expect(block).toContain('font-weight');
    expect(block).toContain('box-shadow');
  });
});
