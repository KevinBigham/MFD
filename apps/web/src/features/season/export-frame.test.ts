import type { CSSProperties } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExportFrame } from './export-frame';

class FakeStyle {
  private readonly values = new Map<string, string>();

  setProperty(key: string, value: string): void {
    this.values.set(key, value);
  }

  getPropertyValue(key: string): string {
    return this.values.get(key) ?? '';
  }
}

class FakeElement {
  public readonly style = new FakeStyle();
  public readonly children: FakeElement[] = [];
  public readonly attributes = new Map<string, string>();
  public parentElement: FakeElement | null = null;
  public textContent = '';

  constructor(public readonly tagName: string) {}

  appendChild(child: FakeElement): FakeElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  cloneNode(deep = false): FakeElement {
    const clone = new FakeElement(this.tagName);
    clone.textContent = this.textContent;
    for (const [key, value] of this.attributes.entries()) {
      clone.attributes.set(key, value);
    }
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  remove(): void {
    if (!this.parentElement) return;
    const index = this.parentElement.children.indexOf(this);
    if (index >= 0) {
      this.parentElement.children.splice(index, 1);
    }
    this.parentElement = null;
  }
}

function flattenText(node: FakeElement): string {
  return [node.textContent, ...node.children.map((child) => flattenText(child))].join(' ');
}

describe('createExportFrame', () => {
  beforeEach(() => {
    const body = new FakeElement('body');
    vi.stubGlobal('document', {
      body,
      createElement: (tagName: string) => new FakeElement(tagName),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps the cloned node inside an export frame', () => {
    const node = new FakeElement('section');
    node.textContent = 'Original body';

    const handle = createExportFrame(node as unknown as HTMLElement, {
      title: 'Dynasty Chronicle',
      footer: 'Chicago Blaze • 2032 • MFD',
    });

    expect((handle.frame as unknown as FakeElement).getAttribute('data-export-frame')).toBe('true');
    expect(flattenText(handle.frame as unknown as FakeElement)).toContain('Original body');
  });

  it('renders title, subtitle, and footer text when provided', () => {
    const node = new FakeElement('section');

    const handle = createExportFrame(node as unknown as HTMLElement, {
      title: 'Hall of Fame Directory',
      subtitle: 'Filtered export // 12 inductees',
      footer: 'Hall of Fame • 20260421 • MFD',
    });

    const text = flattenText(handle.frame as unknown as FakeElement);
    expect(text).toContain('Hall of Fame Directory');
    expect(text).toContain('Filtered export // 12 inductees');
    expect(text).toContain('Hall of Fame • 20260421 • MFD');
  });

  it('sets the 960px frame width and 24px outer padding', () => {
    const node = new FakeElement('section');

    const handle = createExportFrame(node as unknown as HTMLElement, {
      title: 'Playoff Lore',
      footer: '2026 • Wild Card • MFD',
    });

    const frame = handle.frame as unknown as FakeElement;
    expect(frame.style.getPropertyValue('width')).toBe('960px');
    expect(frame.style.getPropertyValue('padding')).toBe('24px');
  });

  it('applies provided team-color vars to the export shell', () => {
    const node = new FakeElement('section');

    const handle = createExportFrame(node as unknown as HTMLElement, {
      title: 'Scrapbook',
      footer: 'Chicago Blaze • 2026 • MFD',
      themeVars: {
        '--mfd-team-primary': '#cc2200',
      } as CSSProperties,
    });

    const frame = handle.frame as unknown as FakeElement;
    expect(frame.style.getPropertyValue('--mfd-team-primary')).toBe('#cc2200');
  });

  it('removes the export frame from document.body during cleanup', () => {
    const node = new FakeElement('section');
    const body = document.body as unknown as FakeElement;

    const handle = createExportFrame(node as unknown as HTMLElement, {
      title: 'Season Recap',
      footer: 'Chicago Blaze • 2026 • MFD',
    });

    expect(body.children).toHaveLength(1);
    handle.cleanup();
    expect(body.children).toHaveLength(0);
  });
});
