import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../rng';
import type { Team } from '../types';
import {
  TRICK_PLAYS,
  canCallTrickPlays,
  getAvailableTrickPlays,
  executeTrickPlay,
  shouldCallTrickPlay,
} from './trick-plays';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

function makeTeam(traits: string[] = [], gameplan = 75): Team {
  return {
    id: 'test-team',
    city: 'Test',
    name: 'Testers',
    abbrev: 'TST',
    roster: [],
    staff: {
      hc: {
        id: 'hc-1',
        name: 'Coach Test',
        age: 50,
        role: 'hc',
        ratings: { gameplan, motivation: 70, development: 70 },
        traits,
        contract: null,
        yearsWithTeam: 3,
        careerWins: 40,
        careerLosses: 20,
        experience: 10,
        xp: 0,
        perks: [],
      },
    },
  } as unknown as Team;
}

function readSystemSource(filename: string): string {
  return readFileSync(fileURLToPath(new URL(filename, import.meta.url)), 'utf8');
}

function blankPreservingNewlines(value: string): string {
  return value.replace(/[^\n\r]/g, ' ');
}

function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blankPreservingNewlines)
    .replace(/\/\/[^\n\r]*/g, blankPreservingNewlines)
    .replace(/(['"`])(?:\\[\s\S]|(?!\1)[\s\S])*\1/g, blankPreservingNewlines);
}

describe('Trick Plays', () => {
  describe('catalog', () => {
    it('has 8 trick plays', () => {
      expect(TRICK_PLAYS.length).toBe(8);
    });

    it('every play has unique id', () => {
      const ids = TRICK_PLAYS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every play has success and failure commentary', () => {
      for (const play of TRICK_PLAYS) {
        expect(play.successCommentary.length).toBeGreaterThan(10);
        expect(play.failureCommentary.length).toBeGreaterThan(10);
      }
    });

    it('all success rates are between 0 and 1', () => {
      for (const play of TRICK_PLAYS) {
        expect(play.successRate).toBeGreaterThan(0);
        expect(play.successRate).toBeLessThan(1);
      }
    });

    it('all fumble risk multipliers are above 1', () => {
      for (const play of TRICK_PLAYS) {
        expect(play.fumbleRiskMultiplier).toBeGreaterThanOrEqual(2.0);
      }
    });
  });

  describe('canCallTrickPlays', () => {
    it('returns true when coach has a gambler trait', () => {
      const team = makeTeam(['gambler']);
      expect(canCallTrickPlays(team)).toBe(true);
    });

    it('returns true when coach has creative trait', () => {
      const team = makeTeam(['creative']);
      expect(canCallTrickPlays(team)).toBe(true);
    });

    it('returns false when coach has no trick play traits', () => {
      const team = makeTeam(['disciplined', 'conservative']);
      expect(canCallTrickPlays(team)).toBe(false);
    });

    it('returns false when gameplan rating is too low', () => {
      const team = makeTeam(['gambler'], 55);
      expect(canCallTrickPlays(team)).toBe(false);
    });

    it('returns false when no head coach', () => {
      const team = { id: 'test', roster: [], staff: {} } as unknown as Team;
      expect(canCallTrickPlays(team)).toBe(false);
    });
  });

  describe('getAvailableTrickPlays', () => {
    it('returns plays matching coach traits and rating', () => {
      const team = makeTeam(['gambler', 'creative'], 80);
      const plays = getAvailableTrickPlays(team);
      expect(plays.length).toBeGreaterThan(0);
      expect(plays.length).toBeLessThanOrEqual(TRICK_PLAYS.length);
    });

    it('returns fewer plays for lower-rated coaches', () => {
      const highRated = makeTeam(['gambler', 'creative'], 85);
      const lowRated = makeTeam(['gambler', 'creative'], 65);
      const highPlays = getAvailableTrickPlays(highRated);
      const lowPlays = getAvailableTrickPlays(lowRated);
      expect(highPlays.length).toBeGreaterThanOrEqual(lowPlays.length);
    });

    it('returns empty for coach without trick traits', () => {
      const team = makeTeam(['conservative'], 90);
      expect(getAvailableTrickPlays(team)).toHaveLength(0);
    });
  });

  describe('executeTrickPlay', () => {
    it('returns a valid result', () => {
      const rng = seededRng();
      const play = TRICK_PLAYS[0]!;
      const result = executeTrickPlay(rng, play, 75, 'Tom Brady', 'Rob Gronkowski');
      expect(result.play.id).toBe(play.id);
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.yards).toBe('number');
      expect(typeof result.fumble).toBe('boolean');
      expect(result.commentary.length).toBeGreaterThan(0);
    });

    it('is deterministic with same seed', () => {
      const play = TRICK_PLAYS[0]!;
      const r1 = executeTrickPlay(seededRng(123), play, 75);
      const r2 = executeTrickPlay(seededRng(123), play, 75);
      expect(r1.success).toBe(r2.success);
      expect(r1.yards).toBe(r2.yards);
      expect(r1.fumble).toBe(r2.fumble);
    });

    it('substitutes player names in commentary', () => {
      const rng = seededRng(999);
      const play = TRICK_PLAYS.find((p) => p.id === 'flea_flicker')!;
      const result = executeTrickPlay(rng, play, 75, 'Patrick Mahomes', 'Tyreek Hill');
      expect(result.commentary).not.toContain('{{qb}}');
      expect(result.commentary).not.toContain('{{target}}');
    });

    it('higher coach rating increases success chance', () => {
      const play = TRICK_PLAYS[0]!;
      let highSuccess = 0;
      let lowSuccess = 0;
      for (let seed = 0; seed < 200; seed++) {
        if (executeTrickPlay(seededRng(seed), play, 90).success) highSuccess++;
        if (executeTrickPlay(seededRng(seed), play, 55).success) lowSuccess++;
      }
      expect(highSuccess).toBeGreaterThan(lowSuccess);
    });
  });

  describe('shouldCallTrickPlay', () => {
    it('returns boolean', () => {
      expect(typeof shouldCallTrickPlay(seededRng(), 1, 0, false)).toBe('boolean');
    });

    it('is more likely when trailing big', () => {
      let trailingCount = 0;
      let leadingCount = 0;
      for (let seed = 0; seed < 500; seed++) {
        if (shouldCallTrickPlay(seededRng(seed), 3, -21, false)) trailingCount++;
        if (shouldCallTrickPlay(seededRng(seed), 3, 14, false)) leadingCount++;
      }
      expect(trailingCount).toBeGreaterThan(leadingCount);
    });
  });

  describe('simulation wiring boundary', () => {
    it('keeps trick-play execution helpers out of the current simulation spine', () => {
      const simulationSources = [
        'game-sim.ts',
        'game-flow.ts',
        'franchise-week.ts',
      ].map((filename) => ({
        filename,
        rawSource: readSystemSource(filename),
      }));
      const normalizedSources = simulationSources.map(({ filename, rawSource }) => ({
        filename,
        rawSource,
        strippedSource: stripCommentsAndStrings(rawSource),
      }));
      const runtimeHelperPatterns = [
        /\bTRICK_PLAYS\b/,
        /\bexecuteTrickPlay\b/,
        /\bshouldCallTrickPlay\b/,
        /\bgetAvailableTrickPlays\b/,
        /\bcanCallTrickPlays\b/,
      ];
      const importPattern = /from\s+['"]\.\/trick-plays['"]/;

      const violations = normalizedSources.flatMap(({ filename, rawSource, strippedSource }) => {
        const helperMatches = runtimeHelperPatterns
          .filter((pattern) => pattern.test(strippedSource))
          .map((pattern) => `${filename} matches ${pattern}`);
        const importMatches = importPattern.test(rawSource) ? [`${filename} imports ./trick-plays`] : [];
        return [...helperMatches, ...importMatches];
      });

      expect(violations).toEqual([]);
    });
  });
});
