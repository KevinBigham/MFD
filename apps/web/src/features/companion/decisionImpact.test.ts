import { describe, expect, it } from 'vitest';
import {
  buildDecisionImpactExplanation,
  decisionImpactToConsequenceItems,
} from './decisionImpact';

describe('decision impact explanations', () => {
  it('frames week advance risk across immediate, season, future, and uncertainty windows', () => {
    const impact = buildDecisionImpactExplanation({
      surface: 'week-advance',
      label: 'Week advance',
      issueCount: 2,
      difficulty: 'hard',
    });

    expect(impact.severity).toBe('high');
    expect(impact.immediateImpact).toContain('2 readiness issues');
    expect(impact.thisSeasonImpact).toContain('weekly result');
    expect(impact.futureImpact).toContain('injuries, morale, and standings');
    expect(impact.risk).toContain('Hard difficulty');
    expect(decisionImpactToConsequenceItems(impact).map((item) => item.label)).toEqual([
      'Immediate',
      'This season',
      'Future',
      'Risk',
    ]);
  });

  it('uses trade-specific consequence language', () => {
    const impact = buildDecisionImpactExplanation({
      surface: 'trade',
      label: 'Trade package',
      outgoingAssets: 2,
      incomingAssets: 1,
      valueDelta: -4,
    });

    expect(impact.immediateImpact).toContain('send 2 assets');
    expect(impact.thisSeasonImpact).toContain('depth');
    expect(impact.futureImpact).toContain('pick');
    expect(impact.risk).toContain('market');
  });
});
