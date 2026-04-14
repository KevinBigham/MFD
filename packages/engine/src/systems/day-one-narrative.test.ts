import { describe, expect, it } from 'vitest';

import {
  createSetupState,
  generateDayOneNarrativePack,
  getTopPressureCard,
  generateTeamCrisisProfile,
} from '../index';
import { makeLeagueState } from './test-helpers';

describe('day one narrative pack', () => {
  it('is deterministic for the same seed, team, and decisions', () => {
    const game = makeLeagueState('regular_season', 1);
    const decisions = {
      ...createSetupState().decisions,
      agmProfileId: 'marcus_webb',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'balanced',
      defenseScheme: 'cover_3',
      depthChartPhilosophy: 'best_players',
      capPosture: 'balanced',
      cultureMandate: 'accountability',
      seasonGoals: ['winning_record', 'cap_health', 'draft_well'],
    };

    const first = generateDayOneNarrativePack(game, 'afce1', decisions);
    const second = generateDayOneNarrativePack(game, 'afce1', decisions);

    expect(second).toEqual(first);
  });

  it('recommends the crisis-fit AGM for the top pressure', () => {
    const game = makeLeagueState('regular_season', 1);
    const crisis = generateTeamCrisisProfile(game, 'afce1');
    const topPressure = getTopPressureCard(crisis);
    const pack = generateDayOneNarrativePack(game, 'afce1', createSetupState().decisions);

    expect(pack.meta.topPressureId).toBe(topPressure.id);
    expect(pack.agmScenes[pack.recommendedAgmId]?.recommended).toBe(true);
    if (topPressure.id === 'cap') expect(pack.recommendedAgmId).toBe('marcus_webb');
    if (topPressure.id === 'culture') expect(pack.recommendedAgmId).toBe('sandra_chen');
    if (topPressure.id === 'roster') expect(pack.recommendedAgmId).toBe('coach_d_hardaway');
  });

  it('selects a stable opener-context key for the same game state', () => {
    const game = makeLeagueState('regular_season', 1);

    const pack = generateDayOneNarrativePack(game, 'afce1', createSetupState().decisions);

    expect(pack.meta.openerContext).toMatch(/^(home|away)_(rivalry|dangerous|soft)$/);
    expect(pack.coldOpen.beats).toHaveLength(5);
    expect(pack.blueprint.opponentIdentity.length).toBeGreaterThan(0);
  });
});
