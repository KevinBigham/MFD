import { describe, expect, it } from 'vitest';
import { calculateWpSwing, getWpLeverageCallout } from './broadcast';

const FIXED_RNG = () => 0;

describe('broadcast leverage callouts', () => {
  it('calculates absolute win probability swing in percentage points', () => {
    expect(calculateWpSwing(0.42, 0.58)).toBe(16);
    expect(calculateWpSwing(0.78, 0.47)).toBe(31);
  });

  it('returns null for swings below the leverage threshold', () => {
    expect(getWpLeverageCallout(0.45, 0.54, 'Chicago Club', FIXED_RNG)).toBeNull();
  });

  it('returns a leverage callout at the 15 point threshold', () => {
    const line = getWpLeverageCallout(0.45, 0.60, 'Chicago Club', FIXED_RNG);

    expect(line).toBeTruthy();
    expect(line).toContain('15');
  });

  it('uses a critical leverage template for swings of 30 points or more', () => {
    const line = getWpLeverageCallout(0.20, 0.50, 'Chicago Club', FIXED_RNG);

    expect(line).toContain('analytics room');
    expect(line).toContain('30');
  });

  it('returns null for zero swing', () => {
    expect(getWpLeverageCallout(0.50, 0.50, 'Chicago Club', FIXED_RNG)).toBeNull();
  });

  it('replaces template variables and includes the team name', () => {
    const line = getWpLeverageCallout(0.42, 0.58, 'Nashville Club', FIXED_RNG);

    expect(line).toContain('42');
    expect(line).toContain('58');
    expect(line).toContain('16');
    expect(line).toContain('Nashville Club');
    expect(line).not.toContain('{{');
  });
});
