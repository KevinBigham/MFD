import { describe, expect, it } from 'vitest';
import { DEFAULT_TEXT_SIZE, TEXT_SIZES, applyTextSize, normalizeTextSize } from './text-size';

describe('text size', () => {
  it('defaults to Comfortable and offers Compact, Comfortable and Large', () => {
    expect(DEFAULT_TEXT_SIZE).toBe('m');
    expect(TEXT_SIZES.map((option) => [option.id, option.label])).toEqual([
      ['s', 'Compact'],
      ['m', 'Comfortable'],
      ['l', 'Large'],
    ]);
  });

  it('normalizes unknown stored values to the fallback', () => {
    expect(normalizeTextSize('s')).toBe('s');
    expect(normalizeTextSize('l')).toBe('l');
    expect(normalizeTextSize('xl')).toBe('m');
    expect(normalizeTextSize(undefined)).toBe('m');
    expect(normalizeTextSize(3, 's')).toBe('s');
  });

  it('writes the size to the root element dataset', () => {
    const root = { dataset: {} as DOMStringMap };
    applyTextSize('l', root);
    expect(root.dataset.textSize).toBe('l');
    applyTextSize('s', root);
    expect(root.dataset.textSize).toBe('s');
  });

  it('does nothing without a root', () => {
    expect(() => applyTextSize('m', null)).not.toThrow();
  });
});
