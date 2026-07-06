import { describe, expect, it } from 'vitest';

import {
  createSetupState,
  generateDayOneNarrativePack,
  getTopPressureCard,
  generateTeamCrisisProfile,
} from '../index';
import { makeLeagueState } from './test-helpers';

const DAY_ONE_ACTION_CUE = /\b(assign|check|choose|cut|fix|hire|hold|identify|keep|list|lock|make|move|name|pick|protect|review|set|trade|turn)\b/i;
const DAY_ONE_CONSEQUENCE_CUE =
  /\b(before|blocks?|cap|cost|depth|development|extension|fixes|future|games?|injur\w*|limits?|mistakes?|money|morale|owner|pressure|risk|roles?|starter|stall\w*|trades?|weak|Week 1|wins?)\b/i;
const RETIRED_DAY_ONE_SOFT_COPY =
  /first morning is not a tutorial|It is a diagnosis|survivable and useful|should wait|leaders matter|Leadership will decide|adversity settles or snowballs|simplify the opener|force the opponent|If this works|opener should show|full certainty|playable path|false confidence|starter and backup groups needs|wrong diagnosis|opening diagnosis|roster spine|first fire|cap pressure|panic cuts|Week 1 pressure spreads|spread the damage|protect weak spots|weak depth|owner pressure|weak Week 1 plan|bad Week 1 plan|bad Week 1 choices|bad money|raise pressure quickly|Use the safest Week 1 plan|first Week 1 consequence|biggest Week 1 consequence|Week 1 risk to fix|setup signal|public Week 1 consequence/i;
const RETIRED_DAY_ONE_PERMISSION_COPY =
  /\bchoose\b[^.!?;]*(?:if you want|only if|only when|only after|unless)\b|\bChoose (?:Marcus|Sandra)\b[^.!?;]*\bif\b|\buse\b[^.!?;]*\bonly if\b/i;

function expectDayOneActionAndConsequence(copy: string, label: string): void {
  expect(copy.length, label).toBeGreaterThan(0);
  expect(DAY_ONE_ACTION_CUE.test(copy), `${label}: ${copy}`).toBe(true);
  expect(DAY_ONE_CONSEQUENCE_CUE.test(copy), `${label}: ${copy}`).toBe(true);
}

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
    expect(JSON.stringify({
      coldOpen: pack.coldOpen,
      agmScenes: pack.agmScenes,
      intelBriefing: pack.intelBriefing,
      blueprint: pack.blueprint,
    })).not.toMatch(
      /first bet|real bite|dangerous in a good way|owner heat|room still|run the room|breathing room|street fight|room believe|fake confidence|generic|messy cap pressure|raw talent|competitive edge|Public hype will magnify every early signal|does not trust this team|feels heavier|stop feeling trapped|setting the standard|talent is real|The market will criticize|long game|locker-room leadership|diagnose the problem cleanly|right diagnosis|Enter War Room|written in|spilling into panic decisions|cleaner weekly matchup plan|first morning is not a tutorial|It is a diagnosis|survivable and useful|should wait|leaders matter|simplify the opener|force the opponent|If this works|opener should show|full certainty|playable path|wrong diagnosis|opening diagnosis/i,
    );
  });

  it('keeps AGM recommendation panels actionable and consequence-led', () => {
    const game = makeLeagueState('regular_season', 1);
    const pack = generateDayOneNarrativePack(game, 'afce1', createSetupState().decisions);

    for (const [profileId, scene] of Object.entries(pack.agmScenes)) {
      const copy = `${scene.whyThisFits} ${scene.dayOnePromise} ${scene.seasonBet}`;
      expectDayOneActionAndConsequence(scene.whyThisFits, `${profileId} why this fits`);
      expectDayOneActionAndConsequence(scene.dayOnePromise, `${profileId} day one promise`);
      expect(scene.dayOnePromise, `${profileId} day one promise`).not.toMatch(RETIRED_DAY_ONE_SOFT_COPY);
      expectDayOneActionAndConsequence(scene.seasonBet, `${profileId} season bet`);
      expect(copy, profileId).not.toMatch(RETIRED_DAY_ONE_PERMISSION_COPY);
      expect(`${scene.whyThisFits} ${scene.seasonBet}`, profileId).not.toMatch(/room harder to fix|key-veteran support|fast roster play|need the first fix/i);
    }
  });

  it('keeps first-day narrative labels and blueprint copy direct', () => {
    const game = makeLeagueState('regular_season', 1);
    const pack = generateDayOneNarrativePack(game, 'afce1', createSetupState().decisions);

    expectDayOneActionAndConsequence(pack.coldOpen.diagnosisLabel, 'cold open diagnosis label');
    expect(pack.coldOpen.diagnosisLabel).toBe('First job: choose the AGM who names the Week 1 danger to fix before kickoff.');
    expect(pack.coldOpen.diagnosisLabel).not.toMatch(RETIRED_DAY_ONE_SOFT_COPY);
    expect(pack.coldOpen.beats.map((beat) => `${beat.headline} ${beat.body}`).join(' ')).not.toMatch(/\bDay 1\b/i);

    expectDayOneActionAndConsequence(pack.blueprint.ifThisWorks, 'blueprint if this works');
    expectDayOneActionAndConsequence(pack.blueprint.ifThisBreaks, 'blueprint if this breaks');
    expect(pack.blueprint.ifThisWorks).not.toMatch(RETIRED_DAY_ONE_SOFT_COPY);
    expect(pack.blueprint.ifThisWorks).not.toMatch(RETIRED_DAY_ONE_PERMISSION_COPY);
    expect(pack.blueprint.ifThisBreaks).not.toMatch(RETIRED_DAY_ONE_SOFT_COPY);
  });
});
