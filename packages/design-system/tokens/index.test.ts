import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tokensCss = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf8');

describe('design tokens responsive table rules', () => {
  it('sizes card-mode rows as full-width touch targets', () => {
    const cardModeBlock = tokensCss.slice(tokensCss.indexOf('@media (max-width: 480px)'));

    expect(cardModeBlock).toContain('min-width: 100%;');
    expect(cardModeBlock).toContain('box-sizing: border-box;');
  });
});
