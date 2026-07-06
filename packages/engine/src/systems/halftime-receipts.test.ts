import { describe, expect, it } from 'vitest';
import { buildHalftimeDecisionReceipt } from './halftime-receipts';

describe('halftime receipts', () => {
  it('builds a structured receipt from saved halftime active-effect summaries', () => {
    const receipt = buildHalftimeDecisionReceipt([
      'Breakout practice carried into kickoff.',
      'Halftime hell: flipped the second-half plan to open the throttle.',
    ]);

    expect(receipt).toEqual({
      source: 'GameDayPackage.activeEffectSummaries',
      summary: 'Halftime hell: flipped the second-half plan to open the throttle.',
      detail: 'flipped the second-half plan to open the throttle.',
      choice: 'switch',
      broadcastLine: 'Halftime receipt: flipped the second-half plan to open the throttle.',
      recapLine: 'Saved halftime receipt from GameDayPackage.activeEffectSummaries: flipped the second-half plan to open the throttle.',
    });
  });

  it('returns null when no halftime summary is saved', () => {
    expect(buildHalftimeDecisionReceipt(['Breakout practice carried into kickoff.'])).toBeNull();
    expect(buildHalftimeDecisionReceipt(null)).toBeNull();
  });
});
