import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tokensCss = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf8');

describe('design tokens responsive table rules', () => {
  it('sizes card-mode rows as full-width touch targets', () => {
    const cardModeBlock = tokensCss.slice(tokensCss.indexOf('@media (max-width: 480px)'));

    expect(cardModeBlock).toContain('min-width: 100%;');
    expect(cardModeBlock).toContain('box-sizing: border-box;');
    expect(cardModeBlock).toContain('display: flex;');
    expect(cardModeBlock).toContain('data-mfd-table-cell-id="name"');
  });
});

describe('design tokens table layout', () => {
  const cardModeBlock = tokensCss.slice(
    tokensCss.indexOf('/* Card-mode PixelTable at phone widths'),
    tokensCss.indexOf('/* Sticky first column'),
  );

  it('lays phone cards out as a two-column grid with full-width name and control cells', () => {
    expect(cardModeBlock).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(cardModeBlock).toContain('grid-column: 1 / -1;');
    expect(cardModeBlock).toContain('td:has(button, select, input, textarea)');
  });

  it('puts the self-labelled Manage and Watch buttons side by side without captions', () => {
    expect(cardModeBlock).toMatch(/td\[data-mfd-table-cell-id="watch"\]\s*\{\s*grid-column: auto;/);
    expect(cardModeBlock).toMatch(/td\[data-mfd-table-cell-id="watch"\]::before\s*\{\s*content: none;/);
  });

  it('switches opted-in dense cards to three columns and drops the redundant Name caption', () => {
    expect(cardModeBlock).toContain('[data-mfd-table-dense="true"] tr');
    expect(cardModeBlock).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
    expect(cardModeBlock).toMatch(/\[data-mfd-table-dense="true"\] td\[data-mfd-table-cell-id="name"\]::before\s*\{\s*content: none;/);
  });

  it('lets badges wrap inside dense third-width cells', () => {
    expect(cardModeBlock).toMatch(/\[data-mfd-table-dense="true"\] td \[data-mfd-pixel-badge\] \{[^}]*white-space: normal !important;/);
  });

  it('tokenizes the card label size (no literal 8px)', () => {
    expect(cardModeBlock).toContain('font-size: var(--mfd-fs-8);');
    expect(cardModeBlock).not.toMatch(/font-size:\s*8px/);
  });

  it('pins the first column only above the phone breakpoint and keeps its header opaque', () => {
    const stickyBlock = tokensCss.slice(tokensCss.indexOf('/* Sticky first column'));
    expect(stickyBlock).toContain('@media (min-width: 481px)');
    expect(stickyBlock).toContain('[data-mfd-table-sticky-first="true"] td:first-child');
    expect(stickyBlock).toContain('position: sticky;');
    expect(stickyBlock).toContain('white-space: nowrap;');
    expect(stickyBlock).toContain('background: var(--mfd-surface-raised) !important;');
    expect(stickyBlock).toContain('z-index: 3 !important;');
  });
});

describe('design tokens text size scale', () => {
  const sizes = [6, 7, 8, 9, 10, 11, 12, 13, 14];
  const px = (block: string, n: number) => {
    const match = block.match(new RegExp(`--mfd-fs-${n}:\\s*(\\d+)px;`));
    if (!match) throw new Error(`--mfd-fs-${n} missing`);
    return Number(match[1]);
  };
  const defaultBlock = tokensCss.slice(tokensCss.indexOf(':root {'), tokensCss.indexOf(':root[data-text-size="s"]'));
  const compactBlock = tokensCss.slice(tokensCss.indexOf(':root[data-text-size="s"]'), tokensCss.indexOf(':root[data-text-size="l"]'));
  const largeBlock = tokensCss.slice(tokensCss.indexOf(':root[data-text-size="l"]'));

  it('keeps Compact (S) identical to the original sizes', () => {
    for (const n of sizes) expect(px(compactBlock, n)).toBe(n);
  });

  it('makes Comfortable (default) and Large progressively bigger and never smaller than the original', () => {
    for (const n of sizes) {
      expect(px(defaultBlock, n)).toBeGreaterThanOrEqual(n);
      expect(px(largeBlock, n)).toBeGreaterThanOrEqual(px(defaultBlock, n));
    }
  });

  it('lifts reading text (originally 10px and up) to at least 12px by default, and labels to at least 9px', () => {
    for (const n of sizes.filter((size) => size >= 10)) expect(px(defaultBlock, n)).toBeGreaterThanOrEqual(12);
    for (const n of sizes) expect(px(defaultBlock, n)).toBeGreaterThanOrEqual(9);
  });

  it('keeps each size step monotonic so hierarchy is preserved', () => {
    for (const block of [defaultBlock, compactBlock, largeBlock]) {
      for (let i = 1; i < sizes.length; i += 1) {
        expect(px(block, sizes[i]!)).toBeGreaterThanOrEqual(px(block, sizes[i - 1]!));
      }
    }
  });
});
