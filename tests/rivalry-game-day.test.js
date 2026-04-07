import { afterEach, describe, expect, it } from 'vitest';

import { RNG } from '../src/utils/rng.js';
import {
  RIVALRY_TROPHIES977,
  RIVALRY_WEEK977,
  PREGAME_TALK977,
  HALFTIME_PANEL977,
  POSTGAME_LOCKER977,
  GAME_OF_WEEK977,
  buildRivalryDashboard977,
} from '../src/systems/rivalry-game-day.js';

describe('rivalry-game-day.js', () => {
  const originalUi = RNG.ui;

  afterEach(() => {
    RNG.ui = originalUi;
  });

  it('RIVALRY_TROPHIES977.generateTrophy and updateTrophy work with history/holder changes', () => {
    RNG.ui = () => 0;
    const trophy = RIVALRY_TROPHIES977.generateTrophy(
      { id: 'a', city: 'New York', abbr: 'NYC' },
      { id: 'b', city: 'Boston', abbr: 'BOS' }
    );

    expect(trophy.name).toContain('New York-Boston Cup');
    expect(trophy.holderId).toBeNull();
    expect(trophy.history).toEqual([]);

    const changed1 = RIVALRY_TROPHIES977.updateTrophy(trophy, 'a', 2026, 9, '24-21');
    const changed2 = RIVALRY_TROPHIES977.updateTrophy(trophy, 'a', 2026, 10, '27-20');

    expect(changed1).toBe(true);
    expect(changed2).toBe(false);
    expect(trophy.holderId).toBe('a');
    expect(trophy.history).toHaveLength(2);
  });

  it('RIVALRY_WEEK977.getAtmosphere returns correct tier effects and hype lines', () => {
    const myTeam = { id: 'me', abbr: 'PHI' };
    const opp = { id: 'opp', abbr: 'DAL' };

    const heated = RIVALRY_WEEK977.getAtmosphere(myTeam, opp, { heat: 45, history: { streak: 0 } }, 6);
    expect(heated.tier).toBe('heated');
    expect(heated.effects.moraleBoost).toBe(2);
    expect(heated.effects.crowdBoost).toBe(1);

    const intense = RIVALRY_WEEK977.getAtmosphere(myTeam, opp, { heat: 65, history: { streak: 0 } }, 6);
    expect(intense.tier).toBe('intense');
    expect(intense.effects.injuryRisk).toBe(0.05);

    const war = RIVALRY_WEEK977.getAtmosphere(
      myTeam,
      opp,
      {
        heat: 85,
        history: { streak: -3 },
        trophy977: { icon: '🏆', name: 'The Iron Boot', holderId: 'opp' },
      },
      12
    );
    expect(war.tier).toBe('war');
    expect(war.hypeLines.some((line) => line.includes('BLOOD FEUD WEEK'))).toBe(true);
    expect(war.hypeLines.some((line) => line.includes('holds The Iron Boot'))).toBe(true);
    expect(war.hypeLines.some((line) => line.includes("lost 3 straight"))).toBe(true);
  });

  it('PREGAME_TALK977.generate adds rivalry/playoff/season-context speeches', () => {
    const base = PREGAME_TALK977.generate({ wins: 4, losses: 4 }, {}, {}, null, false);
    expect(base).toHaveLength(3);

    const rivalry = PREGAME_TALK977.generate(
      { wins: 5, losses: 5 },
      {},
      {},
      { tier: 'intense', emoji: '🔥🔥' },
      false
    );
    expect(rivalry).toHaveLength(4);
    expect(rivalry.some((s) => s.id === 'rivalry')).toBe(true);

    const playoff = PREGAME_TALK977.generate({ wins: 12, losses: 5 }, {}, {}, null, true);
    expect(playoff.some((s) => s.id === 'playoff')).toBe(true);

    const desperation = PREGAME_TALK977.generate({ wins: 3, losses: 8 }, {}, {}, null, false);
    expect(desperation.some((s) => s.id === 'desperation')).toBe(true);
  });

  it('HALFTIME_PANEL977.generate supports desperation, prevent, and normal branches', () => {
    const downBig = HALFTIME_PANEL977.generate(-14);
    expect(downBig.some((a) => a.id === 'desperation')).toBe(true);
    expect(downBig.some((a) => a.id === 'prevent')).toBe(false);
    expect(downBig.some((a) => a.id === 'two_minute')).toBe(false);

    const upBig = HALFTIME_PANEL977.generate(14);
    expect(upBig.some((a) => a.id === 'prevent')).toBe(true);
    expect(upBig.some((a) => a.id === 'desperation')).toBe(false);

    const close = HALFTIME_PANEL977.generate(3);
    expect(close.some((a) => a.id === 'two_minute')).toBe(true);
    expect(close).toHaveLength(7);
  });

  it('POSTGAME_LOCKER977.generate handles mood and star/young quotes', () => {
    const roster = [
      { id: 'p1', name: 'Star QB', pos: 'QB', age: 29, ovr: 92, isStarter: true },
      { id: 'p2', name: 'Young WR', pos: 'WR', age: 22, ovr: 79, isStarter: true },
    ];

    const win = POSTGAME_LOCKER977.generate(true, 38, 14, { roster }, true);
    expect(win.mood).toBe('euphoric');
    expect(win.locker.some((q) => q.quote.includes('trophy is OURS'))).toBe(true);
    expect(win.locker.some((q) => q.player === 'Young WR')).toBe(true);

    const loss = POSTGAME_LOCKER977.generate(false, 20, 23, { roster }, false);
    expect(loss.mood).toBe('gutted');
    expect(loss.locker[0].quote).toContain('stings');
  });

  it('GAME_OF_WEEK977.pick factors rivalry heat and returns top matchup', () => {
    const teams = [
      { id: 'a', icon: '🦅', abbr: 'PHI', wins: 5, prestige: 50, rivals: [] },
      { id: 'b', icon: '⭐', abbr: 'DAL', wins: 5, prestige: 50, rivals: [] },
      { id: 'c', icon: '🐻', abbr: 'CHI', wins: 5, prestige: 50, rivals: [{ teamId: 'd', heat: 60 }] },
      { id: 'd', icon: '🦬', abbr: 'BUF', wins: 5, prestige: 50, rivals: [] },
    ];
    const sched = [
      { week: 8, played: false, home: 'a', away: 'b' },
      { week: 8, played: false, home: 'c', away: 'd' },
    ];

    const gotw = GAME_OF_WEEK977.pick(sched, teams, 8, 'none');
    expect(gotw.home.id).toBe('c');
    expect(gotw.away.id).toBe('d');
    expect(gotw.label).toContain('GAME OF THE WEEK');
  });

  it('buildRivalryDashboard977 filters active rivalries and tracks held trophies', () => {
    const myTeam = {
      id: 'me',
      rivals: [
        { teamId: 't1', heat: 10 },
        { teamId: 't2', heat: 80, history: { wins: 4, losses: 1, streak: 3 }, trophy977: { holderId: 'me' } },
        { teamId: 't3', heat: 50, history: { wins: 2, losses: 3, streak: -1 }, trophy977: { holderId: 't3' } },
      ],
    };
    const teams = [
      { id: 't1', abbr: 'AAA' },
      { id: 't2', abbr: 'BBB' },
      { id: 't3', abbr: 'CCC' },
    ];

    const dash = buildRivalryDashboard977(myTeam, teams);

    expect(dash.active).toHaveLength(2);
    expect(dash.active[0].rival.teamId).toBe('t2');
    expect(dash.trophies).toHaveLength(1);
    expect(dash.trophies[0].holdsTrophy).toBe(true);
  });
});
