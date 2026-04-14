import { describe, expect, it } from 'vitest';
import {
  getAgmDialogueLine,
  getAwardSpeech,
  getBroadcastTemplate,
  getCallYourShotReactions,
  getCoachArchetype,
  getContingencyCallouts,
  getPersonalityLine,
  getScoutingReportTemplate,
} from './content-loader';

describe('content loader dormant content accessors', () => {
  it('returns scouting report template arrays by position and tier', () => {
    const template = getScoutingReportTemplate('QB', 'elite');

    expect(template).not.toBeNull();
    expect(template?.length).toBeGreaterThan(0);
    expect(template?.[0]).toContain('arm');
  });

  it('normalizes live coach archetype labels into content entries', () => {
    const archetype = getCoachArchetype('Air Attack');

    expect(archetype).not.toBeNull();
    expect(archetype?.id).toBe('offensive_genius');
    expect(archetype?.press_conference[0]).toContain('leverage');
  });

  it('builds award speeches using player personality tone and interpolation', () => {
    const speech = getAwardSpeech('mvp', {
      name: 'Quincy Hale',
      teamName: 'Chicago Deep Dish',
      coachName: 'Dana Price',
      year: 2031,
      stat: '4,982 passing yards',
      personality: { workEthic: 9, loyalty: 7, greed: 3, pressure: 9, ambition: 10 },
    }, () => 0);

    expect(speech).not.toBeNull();
    expect(speech?.presenterIntro).toContain('Quincy Hale');
    expect(speech?.acceptance).toContain('Chicago Deep Dish');
    expect(speech?.acceptance).toContain('4,982 passing yards');
  });

  it('chooses personality flavor lines from the strongest personality signal for a scenario', () => {
    const line = getPersonalityLine({
      workEthic: 9,
      loyalty: 4,
      greed: 3,
      pressure: 7,
      ambition: 8,
    }, 'socialPost', () => 0);

    expect(line).toContain('5AM');
  });

  it('loads AGM dialogue by persona, event, and context', () => {
    const line = getAgmDialogueLine('marcus_webb', 'gameStart', 'winning_record', () => 0);

    expect(line).toContain('numbers never lie');
  });

  it('renders broadcast templates with placeholder interpolation', () => {
    const opener = getBroadcastTemplate('routine_pass', 'openers', () => 0, {
      player: 'Jules Mercer',
      team: 'Peaches',
      yards: 9,
    });
    const ending = getBroadcastTemplate('routine_pass', 'endings', () => 0, {
      player: 'Jules Mercer',
      team: 'Peaches',
      yards: 9,
    });

    expect(opener).toBe('Jules Mercer quick throw');
    expect(ending).toBe('for 9, moves chains.');
  });

  it('returns authored Call Your Shot reaction pools by outcome', () => {
    const hitReactions = getCallYourShotReactions('hit');
    const missReactions = getCallYourShotReactions('miss');
    const partialReactions = getCallYourShotReactions('partial');

    expect(hitReactions.length).toBeGreaterThanOrEqual(3);
    expect(missReactions.length).toBeGreaterThanOrEqual(3);
    expect(partialReactions.length).toBeGreaterThanOrEqual(3);
    expect(hitReactions[0]?.quote).toBeTruthy();
    expect(missReactions[0]?.speaker).toBeTruthy();
  });

  it('returns contingency callout pools for sprint trigger types', () => {
    const callouts = getContingencyCallouts('go_air_raid');

    expect(callouts.length).toBeGreaterThanOrEqual(5);
    expect(callouts[0]).toContain('{responseLabel}');
  });
});
