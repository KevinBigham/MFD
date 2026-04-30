import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Spotlight } from './index';

type MockTarget = {
  attributes: Map<string, string>;
  classList: { add: ReturnType<typeof vi.fn> };
  firstChild: null;
  getBoundingClientRect: () => DOMRect;
  insertBefore: ReturnType<typeof vi.fn>;
  ownerDocument: {
    createElement: ReturnType<typeof vi.fn>;
  };
  querySelector: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
};

function createRect(): DOMRect {
  return {
    x: 120,
    y: 80,
    width: 240,
    height: 48,
    top: 80,
    left: 120,
    right: 360,
    bottom: 128,
    toJSON: () => ({}),
  } as DOMRect;
}

function createTarget(): MockTarget {
  const attributes = new Map<string, string>();
  const hiddenLabel = {
    className: '',
    textContent: '',
    setAttribute: vi.fn(),
  };
  return {
    attributes,
    classList: { add: vi.fn() },
    firstChild: null,
    getBoundingClientRect: () => createRect(),
    insertBefore: vi.fn(),
    ownerDocument: {
      createElement: vi.fn(() => hiddenLabel),
    },
    querySelector: vi.fn(() => null),
    setAttribute: vi.fn((name: string, value: string) => {
      attributes.set(name, value);
    }),
  };
}

function installDocument(target: MockTarget | null) {
  vi.stubGlobal('document', {
    querySelector: vi.fn(() => target),
  });
}

describe('Spotlight', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a fixed gold ring around the active target', () => {
    const target = createTarget();
    installDocument(target);

    const markup = renderToStaticMarkup(<Spotlight targetId="wizard.cold-open.continue" />);

    expect(markup).toContain('data-mfd-spotlight="true"');
    expect(markup).toContain('data-spotlight-caret="above"');
    expect(markup).toContain('mfd-spotlight__ring');
    expect(markup).toContain('mfd-spotlight__caret');
    expect(markup).toContain('top:74px');
    expect(markup).toContain('left:114px');
    expect(target.attributes.get('aria-current')).toBe('step');
  });

  it('moves the down caret below a top-edge target so it remains visible', () => {
    const target = createTarget();
    target.getBoundingClientRect = () => ({
      ...createRect(),
      top: 8,
      bottom: 56,
    });
    installDocument(target);

    const markup = renderToStaticMarkup(<Spotlight targetId="wizard.cold-open.continue" />);

    expect(markup).toContain('data-spotlight-caret="below"');
  });

  it('targets a passed ref before querying by data attribute', () => {
    const refTarget = createTarget();
    const documentTarget = createTarget();
    installDocument(documentTarget);

    renderToStaticMarkup(
      <Spotlight
        targetId="wizard.team-select.confirm"
        targetRef={{ current: refTarget as unknown as HTMLElement }}
      />,
    );

    expect(refTarget.attributes.get('aria-current')).toBe('step');
    expect(documentTarget.attributes.get('aria-current')).toBeUndefined();
  });

  it('queries the matching data-spotlight-target when no ref is present', () => {
    const target = createTarget();
    installDocument(target);

    renderToStaticMarkup(<Spotlight targetId="wizard.agm-hire.confirm" />);

    expect(document.querySelector).toHaveBeenCalledWith(
      '[data-spotlight-target="wizard.agm-hire.confirm"]',
    );
    expect(target.insertBefore).toHaveBeenCalledTimes(1);
  });

  it('keeps animated pulse CSS for normal motion and disables it for reduced motion', () => {
    const spotlightCss = readFileSync(join(__dirname, 'Spotlight.css'), 'utf8');
    const reducedMotionBlock = spotlightCss.slice(
      spotlightCss.indexOf('@media (prefers-reduced-motion: reduce)'),
    );

    expect(spotlightCss).toContain('@keyframes mfd-spotlight-pulse');
    expect(spotlightCss).toContain('animation: mfd-spotlight-pulse');
    expect(reducedMotionBlock).toContain('animation: none');
    expect(reducedMotionBlock).toContain('.mfd-spotlight__caret');
    expect(reducedMotionBlock).toContain('display: none');
  });

  it('renders nothing when the target is missing', () => {
    installDocument(null);

    const markup = renderToStaticMarkup(<Spotlight targetId="wizard.dashboard.handoff" />);

    expect(markup).toBe('');
  });

  it('uses a z-index above the setup wizard chrome', () => {
    const spotlightCss = readFileSync(join(__dirname, 'Spotlight.css'), 'utf8');
    const zIndexMatch = spotlightCss.match(/z-index:\s*(\d+);/);

    expect(Number(zIndexMatch?.[1])).toBeGreaterThan(50);
  });
});
