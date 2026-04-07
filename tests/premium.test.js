import { beforeEach, describe, expect, it } from 'vitest';
import { PREMIUM, PREMIUM_FEATURES } from '../src/systems/premium.js';

// Mock localStorage for test environment
var store = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; },
};

describe('PREMIUM_FEATURES', () => {
  it('defines all expected feature IDs', () => {
    var ids = Object.keys(PREMIUM_FEATURES);
    expect(ids).toContain('godMode');
    expect(ids).toContain('extraScouting');
    expect(ids).toContain('quickSim');
    expect(ids).toContain('extraSaves');
    expect(ids).toContain('advancedAnalytics');
  });

  it('each feature has required fields', () => {
    Object.values(PREMIUM_FEATURES).forEach(function (f) {
      expect(typeof f.id).toBe('string');
      expect(typeof f.label).toBe('string');
      expect(typeof f.icon).toBe('string');
      expect(typeof f.desc).toBe('string');
      expect(typeof f.detail).toBe('string');
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.desc.length).toBeGreaterThan(0);
    });
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(PREMIUM_FEATURES)).toBe(true);
  });
});

describe('PREMIUM', () => {
  beforeEach(function () { store = {}; });

  it('isUnlocked returns false for locked feature', () => {
    expect(PREMIUM.isUnlocked('godMode')).toBe(false);
  });

  it('unlock sets feature to unlocked', () => {
    PREMIUM.unlock('godMode');
    expect(PREMIUM.isUnlocked('godMode')).toBe(true);
  });

  it('unlockAll unlocks every feature and sets supporter flag', () => {
    PREMIUM.unlockAll();
    expect(PREMIUM.isSupporter()).toBe(true);
    Object.keys(PREMIUM_FEATURES).forEach(function (id) {
      expect(PREMIUM.isUnlocked(id)).toBe(true);
    });
  });

  it('reset clears all flags', () => {
    PREMIUM.unlockAll();
    PREMIUM.reset();
    expect(PREMIUM.isSupporter()).toBe(false);
    Object.keys(PREMIUM_FEATURES).forEach(function (id) {
      expect(PREMIUM.isUnlocked(id)).toBe(false);
    });
  });

  it('getStatus reflects current unlock state', () => {
    PREMIUM.unlock('extraScouting');
    var status = PREMIUM.getStatus();
    expect(status.supporter).toBe(false);
    expect(status.features.extraScouting).toBe(true);
    expect(status.features.godMode).toBe(false);
  });

  it('getScoutingBonus returns 20 when unlocked, 0 when locked', () => {
    expect(PREMIUM.getScoutingBonus()).toBe(0);
    PREMIUM.unlock('extraScouting');
    expect(PREMIUM.getScoutingBonus()).toBe(20);
  });

  it('getSaveSlotCount returns 3 base or 8 with premium', () => {
    expect(PREMIUM.getSaveSlotCount()).toBe(3);
    PREMIUM.unlock('extraSaves');
    expect(PREMIUM.getSaveSlotCount()).toBe(8);
  });

  it('getKoFiUrl returns a valid URL string', () => {
    var url = PREMIUM.getKoFiUrl();
    expect(typeof url).toBe('string');
    expect(url).toContain('ko-fi.com');
  });

  it('features are independent — unlocking one does not affect others', () => {
    PREMIUM.unlock('godMode');
    expect(PREMIUM.isUnlocked('extraScouting')).toBe(false);
    expect(PREMIUM.isUnlocked('quickSim')).toBe(false);
  });

  it('getStatus returns all feature keys', () => {
    var status = PREMIUM.getStatus();
    var featureKeys = Object.keys(PREMIUM_FEATURES);
    featureKeys.forEach(function (id) {
      expect(Object.prototype.hasOwnProperty.call(status.features, id)).toBe(true);
    });
  });
});
