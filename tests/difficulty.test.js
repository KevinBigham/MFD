import { describe, expect, it } from 'vitest';

import { DIFF_ACTIVE, DIFF_SETTINGS, SAVE_VERSION } from '../src/config/difficulty.js';

describe('difficulty.js', () => {
  const tiers = ['rookie', 'pro', 'allpro', 'legend'];
  const requiredKeys = [
    'name',
    'icon',
    'desc',
    'tradeMod',
    'injMod',
    'ownerMod',
    'clutchSwing',
    'moraleMod',
    'aiBidMod',
    'staffBudget',
    'startCash',
    'foBudget',
  ];

  it('contains exactly the four expected tiers', () => {
    expect(Object.keys(DIFF_SETTINGS).sort()).toEqual(tiers.sort());
  });

  tiers.forEach((tier) => {
    it(`${tier} includes all required keys`, () => {
      requiredKeys.forEach((key) => {
        expect(DIFF_SETTINGS[tier]).toHaveProperty(key);
      });
    });

    it(`${tier} has non-empty text fields`, () => {
      expect(DIFF_SETTINGS[tier].name.length).toBeGreaterThan(0);
      expect(DIFF_SETTINGS[tier].icon.length).toBeGreaterThan(0);
      expect(DIFF_SETTINGS[tier].desc.length).toBeGreaterThan(10);
    });
  });

  it('injury and owner modifiers increase with difficulty', () => {
    expect(DIFF_SETTINGS.rookie.injMod).toBeLessThan(DIFF_SETTINGS.pro.injMod);
    expect(DIFF_SETTINGS.pro.injMod).toBeLessThan(DIFF_SETTINGS.allpro.injMod);
    expect(DIFF_SETTINGS.allpro.injMod).toBeLessThan(DIFF_SETTINGS.legend.injMod);

    expect(DIFF_SETTINGS.rookie.ownerMod).toBeLessThan(DIFF_SETTINGS.pro.ownerMod);
    expect(DIFF_SETTINGS.pro.ownerMod).toBeLessThan(DIFF_SETTINGS.allpro.ownerMod);
    expect(DIFF_SETTINGS.allpro.ownerMod).toBeLessThan(DIFF_SETTINGS.legend.ownerMod);
  });

  it('trade and AI bid modifiers scale with difficulty', () => {
    // Rookie tradeMod is HIGHER (trades are easier for the player)
    expect(DIFF_SETTINGS.rookie.tradeMod).toBeGreaterThan(DIFF_SETTINGS.pro.tradeMod);
    expect(DIFF_SETTINGS.pro.tradeMod).toBeLessThan(DIFF_SETTINGS.allpro.tradeMod);
    expect(DIFF_SETTINGS.allpro.tradeMod).toBeLessThan(DIFF_SETTINGS.legend.tradeMod);

    expect(DIFF_SETTINGS.rookie.aiBidMod).toBeLessThan(DIFF_SETTINGS.pro.aiBidMod);
    expect(DIFF_SETTINGS.pro.aiBidMod).toBeLessThan(DIFF_SETTINGS.allpro.aiBidMod);
    expect(DIFF_SETTINGS.allpro.aiBidMod).toBeLessThan(DIFF_SETTINGS.legend.aiBidMod);
  });

  it('starting resources decrease with difficulty', () => {
    expect(DIFF_SETTINGS.rookie.staffBudget).toBeGreaterThan(DIFF_SETTINGS.pro.staffBudget);
    expect(DIFF_SETTINGS.pro.staffBudget).toBeGreaterThan(DIFF_SETTINGS.allpro.staffBudget);
    expect(DIFF_SETTINGS.allpro.staffBudget).toBeGreaterThan(DIFF_SETTINGS.legend.staffBudget);

    expect(DIFF_SETTINGS.rookie.startCash).toBeGreaterThan(DIFF_SETTINGS.pro.startCash);
    expect(DIFF_SETTINGS.pro.startCash).toBeGreaterThan(DIFF_SETTINGS.allpro.startCash);
    expect(DIFF_SETTINGS.allpro.startCash).toBeGreaterThan(DIFF_SETTINGS.legend.startCash);
  });

  it('SAVE_VERSION and DIFF_ACTIVE are set as expected', () => {
    expect(SAVE_VERSION).toBe(986);
    expect(DIFF_ACTIVE).toBe('pro');
  });
});
