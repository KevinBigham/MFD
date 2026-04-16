/**
 * Sprint 43 — Progressive tab disclosure tests.
 */

import { describe, it, expect } from 'vitest';
import {
  NAV_UNLOCK_RULES,
  MIDSEASON_UNLOCK_WEEK,
  getNavUnlockStatus,
  isNavItemUnlocked,
} from './navigation';

describe('navigation unlock rules', () => {
  it('roster is always unlocked', () => {
    expect(isNavItemUnlocked('/roster', { week: 1, phase: 'regular_season' })).toBe(true);
    expect(isNavItemUnlocked('/roster', { week: 17, phase: 'playoffs' })).toBe(true);
  });

  it('trades unlocks at week 4', () => {
    expect(isNavItemUnlocked('/trades', { week: 3, phase: 'regular_season' })).toBe(false);
    expect(isNavItemUnlocked('/trades', { week: 4, phase: 'regular_season' })).toBe(true);
    expect(getNavUnlockStatus('/trades', { week: 2, phase: 'regular_season' }).unlockLabel)
      .toBe('Unlocks Week 4');
  });

  it('midseason routes unlock at MIDSEASON_UNLOCK_WEEK', () => {
    expect(isNavItemUnlocked('/scouting', { week: MIDSEASON_UNLOCK_WEEK - 1, phase: 'regular_season' }))
      .toBe(false);
    expect(isNavItemUnlocked('/scouting', { week: MIDSEASON_UNLOCK_WEEK, phase: 'regular_season' }))
      .toBe(true);
  });

  it('draft is offseason-phase-gated', () => {
    expect(isNavItemUnlocked('/draft', { week: 10, phase: 'regular_season' })).toBe(false);
    expect(isNavItemUnlocked('/draft', { week: 1, phase: 'draft' })).toBe(true);
  });

  it('unknown routes fall through to unlocked', () => {
    expect(isNavItemUnlocked('/custom-unregistered', { week: 1, phase: 'regular_season' }))
      .toBe(true);
  });

  it('every rule has a unique route', () => {
    const routes = NAV_UNLOCK_RULES.map((r) => r.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
