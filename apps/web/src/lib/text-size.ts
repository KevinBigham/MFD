/**
 * Player text size. The design-system tokens define --mfd-fs-6 … --mfd-fs-14 for each
 * size; the value here is written to <html data-text-size> and CSS does the rest.
 */
export type TextSize = 's' | 'm' | 'l';

export const DEFAULT_TEXT_SIZE: TextSize = 'm';

export const TEXT_SIZES: ReadonlyArray<{ id: TextSize; label: string; hint: string }> = [
  { id: 's', label: 'Compact', hint: 'The original, denser sizes.' },
  { id: 'm', label: 'Comfortable', hint: 'Easier to read. The default.' },
  { id: 'l', label: 'Large', hint: 'Biggest text for long sessions.' },
];

export function normalizeTextSize(value: unknown, fallback: TextSize = DEFAULT_TEXT_SIZE): TextSize {
  return value === 's' || value === 'm' || value === 'l' ? value : fallback;
}

export function applyTextSize(
  size: TextSize,
  root: { dataset: DOMStringMap } | null = typeof document === 'undefined' ? null : document.documentElement,
): void {
  if (root) root.dataset.textSize = size;
}
