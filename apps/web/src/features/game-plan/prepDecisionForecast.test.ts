import { describe, expect, it } from 'vitest';
import type { OpponentIntel, WeeklyPrepPlan } from '@mfd/engine';
import {
  PREP_ALIGNMENT_BALANCED_SCORE,
  PREP_ALIGNMENT_OFF_SCRIPT_SCORE,
  PREP_ALIGNMENT_RECOMMENDED_SCORE,
  buildPrepDecisionForecast,
  prepAlignmentScore,
} from './prepDecisionForecast';

const basePlan: WeeklyPrepPlan = {
  teamId: 'team-1',
  opponentTeamId: 'team-2',
  year: 2029,
  week: 11,
  offensiveFocus: 'attack_secondary',
  defensiveFocus: 'limit_explosive',
  practiceIntensity: 'normal',
  keyMatchupPlayerId: null,
  snapManagement: 'normal',
  specialSituation: 'third_down',
  contingencyRules: [],
  trickPlays: [],
};

const passingIntel: Pick<OpponentIntel, 'attackLane' | 'defendLane' | 'dangerPlayers' | 'weakLinks'> = {
  attackLane: 'passing',
  defendLane: 'passing',
  dangerPlayers: [{ id: 'wr-1', name: 'Zane Cross', pos: 'WR', ovr: 86 } as never],
  weakLinks: [{ id: 'cb-1', name: 'Rex Cole', pos: 'CB', ovr: 72 } as never],
};

const STALE_PREP_FORECAST_COPY = /\b(?:Intel matched|Balanced hedge|Off-script bet|sim gets|variance|Win-now prep can help|can tax|film-room receipts|clean plan|less signal|more miss risk|Opponent variance|tricks)\b/i;

function forecast(plan: WeeklyPrepPlan = basePlan) {
  return buildPrepDecisionForecast({
    plan,
    intel: passingIntel,
    storedPlan: false,
    contingencyCount: plan.contingencyRules?.length ?? 0,
    maxContingencies: 3,
    trickPlayCount: plan.trickPlays?.length ?? 0,
    maxTrickPlays: 2,
  });
}

describe('prep decision forecast', () => {
  it('scores recommended, balanced, and off-script alignment with named constants', () => {
    expect(prepAlignmentScore('attack_secondary', 'attack_secondary')).toBe(PREP_ALIGNMENT_RECOMMENDED_SCORE);
    expect(prepAlignmentScore('balanced', 'attack_secondary')).toBe(PREP_ALIGNMENT_BALANCED_SCORE);
    expect(prepAlignmentScore('attack_front', 'attack_secondary')).toBe(PREP_ALIGNMENT_OFF_SCRIPT_SCORE);
  });

  it('frames aligned weekly prep across immediate, season, future, and uncertainty windows', () => {
    const result = forecast({
      ...basePlan,
      contingencyRules: [{ id: 'rule-1' } as never],
      trickPlays: ['flea_flicker'],
    });

    expect(result.offensiveScore).toBe(PREP_ALIGNMENT_RECOMMENDED_SCORE);
    expect(result.defensiveScore).toBe(PREP_ALIGNMENT_RECOMMENDED_SCORE);
    expect(result.alignmentLabel).toBe('Scout report matched');
    expect(result.extrasLabel).toBe('1/3 contingencies, 1/2 trick plays');
    expect(result.consequenceItems.map((item) => item.label)).toEqual([
      'Immediate',
      'This season',
      'Future',
      'Uncertainty',
    ]);
    expect(result.consequenceItems[0]?.delta).toContain('missed execution is the main danger');
    expect(result.consequenceItems[2]?.delta).toContain('Film Room a specific call to judge');
    expect(result.consequenceItems[3]?.delta).toContain('Zane Cross');
    expect(JSON.stringify(result)).not.toMatch(STALE_PREP_FORECAST_COPY);
  });

  it('calls out high weekly load when full pads and ride-stars stack', () => {
    const result = forecast({
      ...basePlan,
      practiceIntensity: 'full_pads',
      snapManagement: 'ride_stars',
    });

    expect(result.loadLabel).toBe('High weekly load');
    expect(result.loadAccent).toBe('red');
    expect(result.consequenceItems[1]?.delta).toContain('repeated weeks raise fatigue and injury-report chances');
    expect(JSON.stringify(result)).not.toMatch(STALE_PREP_FORECAST_COPY);
  });

  it('labels scout-lane misses with concrete matchup consequences', () => {
    const result = forecast({
      ...basePlan,
      offensiveFocus: 'attack_front',
      defensiveFocus: 'stop_run',
    });

    expect(result.offensiveScore).toBe(PREP_ALIGNMENT_OFF_SCRIPT_SCORE);
    expect(result.defensiveScore).toBe(PREP_ALIGNMENT_OFF_SCRIPT_SCORE);
    expect(result.alignmentLabel).toBe('Scout lane missed');
    expect(result.alignmentAccent).toBe('red');
    expect(result.consequenceItems[0]?.delta).toContain('current starters win harder matchups');
    expect(result.consequenceItems[3]?.delta).toContain('Plan misses the report more often');
    expect(JSON.stringify(result)).not.toMatch(STALE_PREP_FORECAST_COPY);
  });
});
