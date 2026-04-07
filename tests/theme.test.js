import { describe, expect, it } from 'vitest';

import { RAD, S, SH, SP, T } from '../src/config/theme.js';

describe('theme.js', () => {
  it('defines core palette and scale tokens', () => {
    expect(T.bg).toBeTypeOf('string');
    expect(T.text).toBeTypeOf('string');
    expect(SP.md).toBeGreaterThan(0);
    expect(RAD.md).toBeGreaterThan(0);
    expect(SH.md).toContain('rgba');
  });

  it('provides base component style objects', () => {
    expect(S.btn.borderRadius).toBe(RAD.md);
    expect(S.btnPrimary.background).toBeTypeOf('string'); // Bloomberg: flat amber, not gradient
    expect(S.card.border).toContain(T.glassBorder);
    expect(S.badgeGold.color).toBe(T.gold);
    expect(S.toast.position).toBeUndefined();
    expect(S.toastArea.position).toBe('fixed');
  });
});
