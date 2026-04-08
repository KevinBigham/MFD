import { describe, it, expect } from 'vitest';
import { getRookieSlot, rookieSlotContract } from './rookie-slots';

describe('rookie-slots', () => {
  it('tier 1: pick #1 gets top slot with option year', () => {
    const slot = getRookieSlot(1, 1);
    expect(slot.tier).toBe(1);
    expect(slot.salary).toBe(8.0);
    expect(slot.signingBonus).toBe(18.0);
    expect(slot.years).toBe(4);
    expect(slot.optionYear).toBe(true);
  });

  it('tier 2: pick #5 gets premium slot', () => {
    const slot = getRookieSlot(1, 5);
    expect(slot.tier).toBe(2);
    expect(slot.salary).toBe(7.0);
    expect(slot.optionYear).toBe(true);
  });

  it('tier 3: pick #12 gets mid-first-round slot', () => {
    const slot = getRookieSlot(1, 12);
    expect(slot.tier).toBe(3);
    expect(slot.salary).toBe(5.5);
    expect(slot.optionYear).toBe(true);
  });

  it('tier 4: pick #20 gets late-first no option year', () => {
    const slot = getRookieSlot(1, 20);
    expect(slot.tier).toBe(4);
    expect(slot.optionYear).toBe(false);
  });

  it('tier 5: pick #32 gets end of first round', () => {
    const slot = getRookieSlot(1, 32);
    expect(slot.tier).toBe(5);
    expect(slot.salary).toBe(3.0);
    expect(slot.optionYear).toBe(false);
  });

  it('round 2 maps to tier 6', () => {
    const slot = getRookieSlot(2, 40);
    expect(slot.tier).toBe(6);
    expect(slot.years).toBe(4);
  });

  it('round 4 maps to tier 8 with 3-year deal', () => {
    const slot = getRookieSlot(4, 100);
    expect(slot.tier).toBe(8);
    expect(slot.years).toBe(3);
  });

  it('round 7 maps to tier 10 with minimum slot', () => {
    const slot = getRookieSlot(7, 224);
    expect(slot.tier).toBe(10);
    expect(slot.salary).toBe(0.8);
    expect(slot.signingBonus).toBe(0.3);
    expect(slot.years).toBe(3);
  });

  it('rookieSlotContract returns same values as getRookieSlot', () => {
    const contract = rookieSlotContract(1, 3);
    const slot = getRookieSlot(1, 3);
    expect(contract.salary).toBe(slot.salary);
    expect(contract.years).toBe(slot.years);
    expect(contract.signingBonus).toBe(slot.signingBonus);
    expect(contract.guaranteed).toBe(slot.guaranteed);
  });

  it('salary decreases as tier increases', () => {
    const tier1 = getRookieSlot(1, 1);
    const tier5 = getRookieSlot(1, 32);
    const tier10 = getRookieSlot(7, 224);
    expect(tier1.salary).toBeGreaterThan(tier5.salary);
    expect(tier5.salary).toBeGreaterThan(tier10.salary);
  });
});
