import { describe, expect, it } from 'vitest';
import {
  UI_FIXTURE_IDS,
  UI_FIXTURE_SEED,
  buildUiFixture,
  resolveTradeDeadlineWeek,
  uiOverhaulFixtures,
} from './ui-overhaul-fixtures';

describe('ui overhaul fixtures', () => {
  it('covers every lifecycle state the QA matrix requires', () => {
    expect(UI_FIXTURE_IDS).toEqual([
      'newGame',
      'regularSeasonEarly',
      'regularSeasonWeek14',
      'tradeDeadline',
      'tradeDeadlineExpired',
      'playoffs',
      'offseason',
      'freeAgency',
      'draft',
      'trainingCamp',
    ]);
  });

  it('builds each fixture at its intended phase and week', () => {
    expect(buildUiFixture('newGame')).toMatchObject({ phase: 'preseason', week: 1 });
    expect(buildUiFixture('regularSeasonEarly')).toMatchObject({ phase: 'regular_season', week: 2 });
    expect(buildUiFixture('regularSeasonWeek14')).toMatchObject({ phase: 'regular_season', week: 14 });
    expect(buildUiFixture('playoffs')).toMatchObject({ phase: 'playoffs' });
    expect(buildUiFixture('offseason')).toMatchObject({ phase: 'offseason' });
    expect(buildUiFixture('freeAgency')).toMatchObject({ phase: 'free_agency' });
    expect(buildUiFixture('draft')).toMatchObject({ phase: 'draft' });
    expect(buildUiFixture('trainingCamp')).toMatchObject({ phase: 'training_camp' });
  });

  it('straddles the live trade deadline rather than hardcoding a week', () => {
    const open = buildUiFixture('tradeDeadline');
    const expired = buildUiFixture('tradeDeadlineExpired');
    const deadline = resolveTradeDeadlineWeek(open);

    expect(open.week).toBe(deadline);
    expect(expired.week).toBe(deadline + 1);
  });

  it('is deterministic: the same fixture built twice is identical', () => {
    for (const id of UI_FIXTURE_IDS) {
      const first = buildUiFixture(id);
      const second = buildUiFixture(id);

      expect(first.seed).toBe(UI_FIXTURE_SEED);
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    }
  });

  it('returns independent states so one screen cannot mutate another fixture', () => {
    const first = uiOverhaulFixtures.regularSeasonWeek14();
    const second = uiOverhaulFixtures.regularSeasonWeek14();

    first.week = 99;

    expect(second.week).toBe(14);
  });

  it('shares one seed across fixtures so surfaces are comparable', () => {
    for (const id of UI_FIXTURE_IDS) {
      expect(buildUiFixture(id).seed).toBe(UI_FIXTURE_SEED);
    }
  });
});
