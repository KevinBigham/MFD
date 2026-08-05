import { describe, it, expect } from 'vitest';
import { PlayoffBracketSchema } from './schema';

/**
 * Schema hardening island 6: GameState.playoffBracket is typed against the
 * real PlayoffBracket interface (types/schedule.ts) instead of
 * z.any().nullable().
 *
 * The writer set is closed: seedPlayoffBracket + advancePlayoffBracket
 * (systems/playoff-bracket.ts) build seeds via toSeed and matchups via
 * createMatchup — both emit exactly the typed shapes — and advance only
 * fills winnerTeamId/result. All golden fixtures carry
 * playoffBracket: null, so strict strip is lossless. matchup.result stays
 * z.any() for now: that payload is typed by island 1's GameResultSchema
 * and gets wired here in a one-line follow-up once that island lands.
 */

const seed = {
  seed: 1,
  teamId: 'afc1',
  conference: 'AFC',
  division: 'AFC East',
  divisionWinner: true,
  wins: 13,
  losses: 4,
  ties: 0,
  pointDifferential: 121,
};

const matchup = {
  id: 'wild_card-AFC-19-afc2-afc7',
  round: 'wild_card',
  conference: 'AFC',
  week: 19,
  homeTeamId: 'afc2',
  awayTeamId: 'afc7',
  winnerTeamId: null,
  result: null,
};

const bracket = {
  season: 2029,
  afc: [seed],
  nfc: [{ ...seed, teamId: 'nfc1', conference: 'NFC', division: 'NFC East' }],
  matchups: [matchup],
  championTeamId: null,
};

describe('PlayoffBracketSchema (island 6: typed GameState.playoffBracket)', () => {
  it('round-trips a freshly seeded bracket without data loss', () => {
    const parsed = PlayoffBracketSchema.safeParse(bracket);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(bracket);
    }
  });

  it('round-trips a completed bracket (winners filled, champion crowned)', () => {
    const completed = {
      ...bracket,
      matchups: [{ ...matchup, winnerTeamId: 'afc2', result: { homeTeamId: 'afc2', awayTeamId: 'afc7', homeScore: 27, awayScore: 20 } }],
      championTeamId: 'afc2',
    };
    const parsed = PlayoffBracketSchema.safeParse(completed);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.championTeamId).toBe('afc2');
      expect(parsed.data.matchups[0]?.winnerTeamId).toBe('afc2');
    }
  });

  it('round-trips the super-bowl NFL conference and every round enum value', () => {
    const rounds = ['wild_card', 'divisional', 'conference', 'super_bowl'];
    for (const round of rounds) {
      const parsed = PlayoffBracketSchema.safeParse({
        ...bracket,
        matchups: [{ ...matchup, id: `${round}-x`, round, conference: round === 'super_bowl' ? 'NFL' : 'AFC' }],
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('rejects malformed brackets loudly instead of passing them through as any', () => {
    expect(PlayoffBracketSchema.safeParse({ season: 2029 }).success).toBe(false);
    expect(
      PlayoffBracketSchema.safeParse({ ...bracket, matchups: [{ ...matchup, round: 'quarterfinal' }] }).success,
    ).toBe(false);
    expect(
      PlayoffBracketSchema.safeParse({ ...bracket, afc: [{ ...seed, conference: 'NFL' }] }).success,
    ).toBe(false);
    expect(
      PlayoffBracketSchema.safeParse({ ...bracket, matchups: [{ ...matchup, conference: 'AFC East' }] }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = PlayoffBracketSchema.safeParse({ ...bracket, sponsorName: 'Big Corp' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('sponsorName' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(bracket);
    }
  });
});
