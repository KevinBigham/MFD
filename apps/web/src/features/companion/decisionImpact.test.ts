import { describe, expect, it } from 'vitest';
import {
  buildDecisionImpactExplanation,
  decisionImpactToConsequenceItems,
} from './decisionImpact';

describe('Chip decision impact explainers', () => {
  it('explains a trade as present help with future and chemistry risk', () => {
    const explanation = buildDecisionImpactExplanation({
      surface: 'trade',
      label: 'Veteran starter trade',
      valueDelta: 7,
      capDelta: -9,
      chemistryDelta: -4,
      difficulty: 'hard',
    });

    expect(explanation).toMatchObject({
      surface: 'trade',
      severity: 'high',
      immediateImpact: 'Adds roster value now (+7).',
      thisSeasonImpact: 'Improves the Sunday solution, but the room has to absorb the change.',
      futureImpact: 'Costs $9M of future flexibility.',
      risk: 'Hard difficulty makes chemistry and cap mistakes harder to hide.',
    });
  });

  it('explains restructuring as borrowing from tomorrow', () => {
    const explanation = buildDecisionImpactExplanation({
      surface: 'contract',
      label: 'Restructure',
      capDelta: 14,
      futureCapDelta: -18,
      difficulty: 'standard',
    });

    expect(explanation.immediateImpact).toBe('Creates $14M of room today.');
    expect(explanation.futureImpact).toBe('Pushes $18M onto future ledgers.');
    expect(explanation.risk).toBe('Smart if the window is open; dangerous if this is just panic room.');
    expect(explanation.severity).toBe('medium');
  });

  it('converts impact explanations to the four visible consequence rows', () => {
    const items = decisionImpactToConsequenceItems(buildDecisionImpactExplanation({
      surface: 'week-advance',
      label: 'Advance',
      issueCount: 2,
      difficulty: 'standard',
    }));

    expect(items.map((item) => item.label)).toEqual([
      'Immediate',
      'This season',
      'Future',
      'Risk',
    ]);
    expect(items[0]?.delta).toContain('2 open checks');
  });
});
