import { describe, expect, it } from 'vitest';

import { GRUDGE_MATCH, REVENGE_GAME } from '../src/systems/grudge-revenge.js';

describe('grudge-revenge.js', () => {
  describe('GRUDGE_MATCH', () => {
    it('markGrudge sets grudge metadata and game detection works', () => {
      const p = { id: 1, name: 'Player', pos: 'WR' };
      GRUDGE_MATCH.markGrudge(p, 'BUF', 'cut');
      expect(p.grudge80.formerTeamId).toBe('BUF');
      expect(GRUDGE_MATCH.isGrudgeGame(p, 'BUF', 'MIA')).toBe(true);
      expect(GRUDGE_MATCH.isGrudgeGame(p, 'NE', 'MIA')).toBe(false);
    });

    it('applyBoost returns boosted clone with capped ratings', () => {
      const p = {
        ovr: 95,
        ratings: { speed: 97, routeRunning: 80 },
        grudge80: { formerTeamId: 'BUF' },
      };
      const boosted = GRUDGE_MATCH.applyBoost(p);
      expect(boosted).not.toBe(p);
      expect(boosted.ovr).toBe(99);
      expect(boosted.ratings.speed).toBe(99);
      expect(boosted.ratings.routeRunning).toBe(85);
      expect(boosted._grudgeActive).toBe(true);
    });

    it('resolve torches former team and then clears grudge state', () => {
      const p = { name: 'Torch Guy', pos: 'QB', grudge80: { formerTeamId: 'BUF', weeksActive: 0, torched: false } };
      const payload = GRUDGE_MATCH.resolve(p, { passTD: 4 }, true, 'BUF');
      expect(payload?.torched).toBe(true);
      expect(p.grudge80).toBeTruthy();
      expect(p.grudge80.torched).toBe(true);
    });

    it('resolve expires stale grudges after long duration', () => {
      const p = { name: 'Old Grudge', pos: 'RB', grudge80: { formerTeamId: 'BUF', weeksActive: 34, torched: false } };
      const payload = GRUDGE_MATCH.resolve(p, {}, false, 'BUF');
      expect(payload).toBeNull();
      expect(p.grudge80).toBeUndefined();
    });
  });

  describe('REVENGE_GAME', () => {
    const teamA = { id: 1, abbr: 'BUF', icon: '🦬' };
    const teamB = { id: 2, abbr: 'MIA', icon: '🐬' };

    it('returns revenge info when loser has 2+ game streak against opponent', () => {
      const riv = [{
        teamA: 1,
        teamB: 2,
        heat: 40,
        history: { streak: 3, lastResult: { loserId: 1 } },
      }];

      const out = REVENGE_GAME.check(teamA, teamB, riv);
      expect(out?.revengeTeam).toBe(1);
      expect(out?.bonus).toBe(3);
    });

    it('returns heat-rivalry fallback when no streak revenge but heat is high', () => {
      const riv = [{
        teamA: 1,
        teamB: 2,
        heat: 70,
        history: { streak: 1, lastResult: { loserId: 1 } },
      }];

      const out = REVENGE_GAME.check(teamA, teamB, riv);
      expect(out?.isHeatRivalry).toBe(true);
      expect(out?.bonus).toBe(2);
    });

    it('getBonus returns bonus for matching revenge team or heat rivalry', () => {
      expect(REVENGE_GAME.getBonus({ revengeTeam: 1, bonus: 4 }, 1)).toBe(4);
      expect(REVENGE_GAME.getBonus({ isHeatRivalry: true, bonus: 2 }, 2)).toBe(2);
      expect(REVENGE_GAME.getBonus({ revengeTeam: 1, bonus: 4 }, 2)).toBe(0);
    });
  });
});
