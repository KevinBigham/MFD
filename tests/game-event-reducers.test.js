import { describe, expect, it } from 'vitest';

import { GOLDEN_GAME_EVENTS } from './fixtures/game-events/golden-game.js';
import {
  reduceTeamStats,
  reduceDrives,
  reducePlayerStats,
  reduceScoringPlays,
  reduceTurnovers,
  reduceInjuries,
  reduceMomentum,
} from '../src/systems/events/reducers.js';

describe('reducers.js', () => {
  describe('reduceTeamStats', () => {
    it('counts plays for both sides', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      expect(stats.home.plays).toBeGreaterThan(0);
      expect(stats.away.plays).toBeGreaterThan(0);
    });

    it('accumulates passing yards', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      expect(stats.home.passYds).toBeGreaterThan(0);
      expect(stats.away.passYds).toBeGreaterThan(0);
    });

    it('accumulates rushing yards', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      expect(stats.home.rushYds).toBeGreaterThan(0);
    });

    it('counts turnovers', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      // Home has 1 fumble, away has 1 interception
      expect(stats.home.turnovers).toBe(1);
      expect(stats.away.turnovers).toBe(1);
    });

    it('counts penalties', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      expect(stats.away.penalties).toBe(1);
      expect(stats.away.penYds).toBe(5);
    });

    it('counts scoring drives', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      expect(stats.home.scoringDrives).toBeGreaterThanOrEqual(2);
    });

    it('accumulates points from score events', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      expect(stats.home.points).toBe(17);
      expect(stats.away.points).toBe(7);
    });

    it('counts sacks', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      // Khalil Storm sacked Trey Palmer once (event 21)
      expect(stats.home.sacks).toBeGreaterThanOrEqual(1);
    });

    it('returns zeroes for empty event list', () => {
      const stats = reduceTeamStats([]);
      expect(stats.home.plays).toBe(0);
      expect(stats.away.plays).toBe(0);
      expect(stats.home.points).toBe(0);
    });

    it('all values are numbers', () => {
      const stats = reduceTeamStats(GOLDEN_GAME_EVENTS);
      for (const side of ['home', 'away']) {
        for (const val of Object.values(stats[side])) {
          expect(typeof val).toBe('number');
        }
      }
    });
  });

  describe('reduceDrives', () => {
    it('produces correct number of drives', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      expect(drives.length).toBeGreaterThanOrEqual(5);
    });

    it('first drive starts at fieldPos 25', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      expect(drives[0].startFieldPos).toBe(25);
    });

    it('drive 1 ends in a touchdown', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      expect(drives[0].result).toBe('touchdown');
    });

    it('drive 2 ends in a punt', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      expect(drives[1].result).toBe('punt');
    });

    it('each drive has a team', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      for (const d of drives) {
        expect(['home', 'away']).toContain(d.team);
      }
    });

    it('drives accumulate yards from play_result events', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      expect(drives[0].yards).toBeGreaterThan(0);
    });

    it('drives are in chronological order', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      for (let i = 1; i < drives.length; i++) {
        expect(drives[i].driveNum).toBeGreaterThanOrEqual(drives[i - 1].driveNum);
      }
    });

    it('returns empty array for no events', () => {
      expect(reduceDrives([])).toEqual([]);
    });

    it('drive plays are counted correctly', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      // Drive 1 has 3 play_result events (seqs 5, 8, 11)
      expect(drives[0].plays).toBe(3);
    });

    it('drive events contain nested event refs', () => {
      const drives = reduceDrives(GOLDEN_GAME_EVENTS);
      expect(drives[0].events.length).toBeGreaterThan(0);
      expect(drives[0].events[0]).toHaveProperty('eventName');
    });
  });

  describe('reducePlayerStats', () => {
    it('tracks passing stats for QBs', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      expect(players['Drew Cannon']).toBeDefined();
      expect(players['Drew Cannon'].comp).toBeGreaterThan(0);
      expect(players['Drew Cannon'].passYds).toBeGreaterThan(0);
    });

    it('tracks rushing stats for RBs', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      expect(players['Marcus Bell']).toBeDefined();
      expect(players['Marcus Bell'].rushAtt).toBeGreaterThan(0);
    });

    it('tracks receiving stats', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      expect(players['Jaylen Swift']).toBeDefined();
      expect(players['Jaylen Swift'].rec).toBeGreaterThan(0);
      expect(players['Jaylen Swift'].recYds).toBeGreaterThan(0);
    });

    it('tracks sacks for defenders', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      expect(players['Khalil Storm']).toBeDefined();
      expect(players['Khalil Storm'].sacks).toBeGreaterThanOrEqual(1);
    });

    it('returns empty object for no events', () => {
      expect(reducePlayerStats([])).toEqual({});
    });

    it('player stat objects are serializable', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      const json = JSON.stringify(players);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(players);
    });

    it('tracks TD passes for QB', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      expect(players['Drew Cannon'].passTD).toBeGreaterThanOrEqual(1);
    });

    it('tracks rushing TDs', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      expect(players['Marcus Bell'].rushTD).toBeGreaterThanOrEqual(1);
    });

    it('tracks receiving TDs', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      expect(players['Jaylen Swift'].recTD).toBeGreaterThanOrEqual(1);
    });

    it('counts scramble as rushing attempt', () => {
      const players = reducePlayerStats(GOLDEN_GAME_EVENTS);
      // Drew Cannon scrambled (event 51)
      expect(players['Drew Cannon'].rushAtt).toBeGreaterThanOrEqual(1);
    });
  });

  describe('reduceScoringPlays', () => {
    it('returns all scoring events in order', () => {
      const scores = reduceScoringPlays(GOLDEN_GAME_EVENTS);
      expect(scores.length).toBeGreaterThanOrEqual(3);
      expect(scores[0].type).toBe('touchdown');
    });

    it('each scoring play has quarter, clock, team', () => {
      const scores = reduceScoringPlays(GOLDEN_GAME_EVENTS);
      for (const s of scores) {
        expect(s).toHaveProperty('quarter');
        expect(s).toHaveProperty('clock');
        expect(s).toHaveProperty('team');
        expect(s).toHaveProperty('points');
      }
    });

    it('returns empty for no events', () => {
      expect(reduceScoringPlays([])).toEqual([]);
    });
  });

  describe('reduceTurnovers', () => {
    it('returns fumble and interception turnovers', () => {
      const tos = reduceTurnovers(GOLDEN_GAME_EVENTS);
      expect(tos.length).toBe(2);
      const types = tos.map(t => t.type);
      expect(types).toContain('fumble');
      expect(types).toContain('interception');
    });

    it('each turnover has quarter, type, player', () => {
      const tos = reduceTurnovers(GOLDEN_GAME_EVENTS);
      for (const t of tos) {
        expect(t).toHaveProperty('quarter');
        expect(t).toHaveProperty('type');
        expect(t).toHaveProperty('player');
      }
    });
  });

  describe('reduceInjuries', () => {
    it('returns injury events', () => {
      const inj = reduceInjuries(GOLDEN_GAME_EVENTS);
      expect(inj.length).toBe(1);
      expect(inj[0].player).toBe('CB Revis Jr');
    });

    it('injury has severity and gamesOut', () => {
      const inj = reduceInjuries(GOLDEN_GAME_EVENTS);
      expect(inj[0].severity).toBe('questionable');
      expect(inj[0].gamesOut).toBe(1);
    });
  });

  describe('reduceMomentum', () => {
    it('produces a momentum chart', () => {
      const chart = reduceMomentum(GOLDEN_GAME_EVENTS);
      expect(chart.length).toBeGreaterThan(0);
    });

    it('momentum values are bounded [-10, 10]', () => {
      const chart = reduceMomentum(GOLDEN_GAME_EVENTS);
      for (const pt of chart) {
        expect(pt.momentum).toBeGreaterThanOrEqual(-10);
        expect(pt.momentum).toBeLessThanOrEqual(10);
      }
    });

    it('each point has seq and momentum', () => {
      const chart = reduceMomentum(GOLDEN_GAME_EVENTS);
      for (const pt of chart) {
        expect(pt).toHaveProperty('seq');
        expect(pt).toHaveProperty('momentum');
      }
    });

    it('returns empty for no events', () => {
      expect(reduceMomentum([])).toEqual([]);
    });
  });
});
