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
