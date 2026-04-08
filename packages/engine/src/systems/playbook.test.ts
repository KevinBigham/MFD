import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import {
  OFFENSIVE_PLAYS,
  DEFENSIVE_PLAYS,
  determineSituation,
  scorePlay,
  scoreDefensivePlay,
  selectOffensivePlay,
  selectDefensivePlay,
  playMatchupQuality,
  getPlaysByCategory,
  getPlayById,
  getDefensivePlayById,
  formatPlayCommentary,
} from './playbook';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

describe('Playbook System', () => {
  describe('play catalog', () => {
    it('has 24 offensive plays', () => {
      expect(OFFENSIVE_PLAYS.length).toBe(24);
    });

    it('has 16 defensive plays', () => {
      expect(DEFENSIVE_PLAYS.length).toBe(16);
    });

    it('every offensive play has unique id', () => {
      const ids = OFFENSIVE_PLAYS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every defensive play has unique id', () => {
      const ids = DEFENSIVE_PLAYS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every offensive play has a commentary hook', () => {
      for (const play of OFFENSIVE_PLAYS) {
        expect(play.commentary.length).toBeGreaterThan(10);
      }
    });

    it('every defensive play has a commentary hook', () => {
      for (const play of DEFENSIVE_PLAYS) {
        expect(play.commentary.length).toBeGreaterThan(10);
      }
    });

    it('has both run and pass plays', () => {
      const runs = OFFENSIVE_PLAYS.filter((p) => p.category === 'run');
      const passes = OFFENSIVE_PLAYS.filter((p) => p.category === 'pass');
      expect(runs.length).toBeGreaterThanOrEqual(8);
      expect(passes.length).toBeGreaterThanOrEqual(12);
    });

    it('yardsRange min is less than max for all plays', () => {
      for (const play of OFFENSIVE_PLAYS) {
        expect(play.yardsRange[0]).toBeLessThan(play.yardsRange[1]);
      }
    });
  });

  describe('determineSituation', () => {
    it('returns goal_line in red zone with short yardage', () => {
      expect(determineSituation(3, 0, true, 1, 600)).toBe('goal_line');
    });

    it('returns red_zone when in red zone', () => {
      expect(determineSituation(2, 0, true, 8, 600)).toBe('red_zone');
    });

    it('returns short_yardage for 2 or less yards to go', () => {
      expect(determineSituation(1, 0, false, 2, 600)).toBe('short_yardage');
    });

    it('returns third_long for 8+ yards to go', () => {
      expect(determineSituation(3, 0, false, 10, 600)).toBe('third_long');
    });

    it('returns two_minute in Q4 with under 2 minutes and close game', () => {
      expect(determineSituation(4, -3, false, 5, 90)).toBe('two_minute');
    });

    it('returns normal for standard situations', () => {
      expect(determineSituation(2, 7, false, 5, 600)).toBe('normal');
    });
  });

  describe('scorePlay', () => {
    it('boosts plays with matching scheme affinity', () => {
      const insideZone = OFFENSIVE_PLAYS.find((p) => p.id === 'inside_zone')!;
      const smashmouthScore = scorePlay(insideZone, 'normal', 'smashmouth', 'balanced');
      const spreadScore = scorePlay(insideZone, 'normal', 'spread', 'balanced');
      expect(smashmouthScore).toBeGreaterThan(spreadScore);
    });

    it('boosts plays with matching plan affinity', () => {
      const deepPost = OFFENSIVE_PLAYS.find((p) => p.id === 'deep_post')!;
      const passHeavy = scorePlay(deepPost, 'normal', 'balanced', 'pass_heavy');
      const runHeavy = scorePlay(deepPost, 'normal', 'balanced', 'run_heavy');
      expect(passHeavy).toBeGreaterThan(runHeavy);
    });

    it('boosts power_run in short yardage', () => {
      const power = OFFENSIVE_PLAYS.find((p) => p.id === 'power_run')!;
      const shortYd = scorePlay(power, 'short_yardage', 'balanced', 'balanced');
      const normal = scorePlay(power, 'normal', 'balanced', 'balanced');
      expect(shortYd).toBeGreaterThan(normal);
    });

    it('boosts QB sneak in goal line', () => {
      const sneak = OFFENSIVE_PLAYS.find((p) => p.id === 'qb_sneak')!;
      const goalLine = scorePlay(sneak, 'goal_line', 'balanced', 'balanced');
      const normal = scorePlay(sneak, 'normal', 'balanced', 'balanced');
      expect(goalLine).toBeGreaterThan(normal);
    });
  });

  describe('selectOffensivePlay', () => {
    it('returns a valid play', () => {
      const rng = seededRng();
      const play = selectOffensivePlay(rng, 'normal', 'spread', 'balanced');
      expect(play).toBeDefined();
      expect(play.id).toBeTruthy();
      expect(play.category).toMatch(/^(run|pass)$/);
    });

    it('is deterministic with same seed', () => {
      const play1 = selectOffensivePlay(seededRng(99), 'normal', 'spread', 'balanced');
      const play2 = selectOffensivePlay(seededRng(99), 'normal', 'spread', 'balanced');
      expect(play1.id).toBe(play2.id);
    });

    it('favors run plays in short yardage with run_heavy plan', () => {
      const rng = seededRng(1);
      const picks: string[] = [];
      for (let i = 0; i < 50; i++) {
        picks.push(selectOffensivePlay(rng, 'short_yardage', 'smashmouth', 'run_heavy').category);
      }
      const runCount = picks.filter((c) => c === 'run').length;
      expect(runCount).toBeGreaterThan(15); // weighted toward runs in this situation
    });
  });

  describe('selectDefensivePlay', () => {
    it('returns a valid defensive play', () => {
      const rng = seededRng();
      const play = selectDefensivePlay(rng, 'normal', 'base');
      expect(play).toBeDefined();
      expect(play.id).toBeTruthy();
    });

    it('is deterministic with same seed', () => {
      const play1 = selectDefensivePlay(seededRng(77), 'normal', 'coverage');
      const play2 = selectDefensivePlay(seededRng(77), 'normal', 'coverage');
      expect(play1.id).toBe(play2.id);
    });
  });

  describe('playMatchupQuality', () => {
    it('blitz is risky against pass plays', () => {
      const screenPass = OFFENSIVE_PLAYS.find((p) => p.id === 'screen_pass')!;
      const coverZeroBlitz = DEFENSIVE_PLAYS.find((p) => p.id === 'cover_0_blitz')!;
      const cover2 = DEFENSIVE_PLAYS.find((p) => p.id === 'cover_2')!;
      const blitzQuality = playMatchupQuality(screenPass, coverZeroBlitz);
      const cover2Quality = playMatchupQuality(screenPass, cover2);
      // Cover 0 blitz gives up big play risk, so offense gets quality boost
      expect(blitzQuality).toBeGreaterThan(cover2Quality);
    });

    it('pinch d-line is strong against runs', () => {
      const insideZone = OFFENSIVE_PLAYS.find((p) => p.id === 'inside_zone')!;
      const pinch = DEFENSIVE_PLAYS.find((p) => p.id === 'pinch_dline')!;
      const prevent = DEFENSIVE_PLAYS.find((p) => p.id === 'prevent')!;
      const pinchQuality = playMatchupQuality(insideZone, pinch);
      const preventQuality = playMatchupQuality(insideZone, prevent);
      expect(pinchQuality).toBeLessThan(preventQuality); // pinch is harder for run
    });
  });

  describe('utility functions', () => {
    it('getPlaysByCategory filters correctly', () => {
      const runs = getPlaysByCategory('run');
      const passes = getPlaysByCategory('pass');
      expect(runs.every((p) => p.category === 'run')).toBe(true);
      expect(passes.every((p) => p.category === 'pass')).toBe(true);
      expect(runs.length + passes.length).toBe(OFFENSIVE_PLAYS.length);
    });

    it('getPlayById finds existing play', () => {
      const play = getPlayById('inside_zone');
      expect(play).toBeDefined();
      expect(play!.name).toBe('Inside Zone');
    });

    it('getPlayById returns undefined for missing id', () => {
      expect(getPlayById('nonexistent')).toBeUndefined();
    });

    it('getDefensivePlayById finds existing play', () => {
      const play = getDefensivePlayById('cover_2');
      expect(play).toBeDefined();
      expect(play!.name).toBe('Cover 2');
    });

    it('formatPlayCommentary substitutes player names', () => {
      const play = getPlayById('play_action')!;
      const text = formatPlayCommentary(play, 'Tom Brady', 'Rob Gronkowski');
      expect(text).toContain('Tom Brady');
      expect(text).toContain('Rob Gronkowski');
      expect(text).not.toContain('{{player}}');
      expect(text).not.toContain('{{target}}');
    });

    it('formatPlayCommentary works without target', () => {
      const play = getPlayById('inside_zone')!;
      const text = formatPlayCommentary(play, 'Derrick Henry');
      expect(text).toContain('Derrick Henry');
    });

    it('scoreDefensivePlay boosts plan-matched plays', () => {
      const cover0 = DEFENSIVE_PLAYS.find((p) => p.id === 'cover_0_blitz')!;
      const blitzScore = scoreDefensivePlay(cover0, 'normal', 'blitz_heavy');
      const coverageScore = scoreDefensivePlay(cover0, 'normal', 'coverage');
      expect(blitzScore).toBeGreaterThan(coverageScore);
    });
  });
});
