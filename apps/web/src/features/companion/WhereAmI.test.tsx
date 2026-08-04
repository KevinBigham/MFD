import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChipDock } from './ChipDock';
import {
  createWhereAmIBeat,
  resolveWhereAmIState,
  type WhereAmIState,
} from './whereAmI';

const summaryState: WhereAmIState = {
  week: 8,
  seasonWeeks: 18,
  wins: 5,
  losses: 2,
  divisionRank: 1,
  pendingTotal: 4,
};

describe('Where Am I dock summary', () => {
  it('renders the dock button', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(<ChipDock collapsed={false} whereAmI={summaryState} />);

    expect(markup).toContain('Where am I?');
    expect(markup).toContain('aria-label="Where am I?"');
  });

  it('creates the summary beat fired by the button', () => {
    expect(createWhereAmIBeat(summaryState)).toEqual({
      id: 'chip.dock.summary',
      pose: 'thinking',
      text: 'Week 8/18, 5-2, Division 1. Must Do: choose or defer 4 decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock at Advance Week.',
    });
    expect(createWhereAmIBeat(summaryState).text.length).toBeLessThanOrEqual(240);
  });

  it('substitutes week, record, and division rank from game state', () => {
    const state = resolveWhereAmIState({
      game: {
        week: 12,
        schedule: Array.from({ length: 19 }, (_, index) => ({ week: index + 1, games: [] })),
        teams: {
          a: { id: 'a', isUser: true, wins: 9, losses: 3, conference: 'AFC', division: 'East' },
          b: { id: 'b', wins: 8, losses: 4, conference: 'AFC', division: 'East' },
        },
      },
    }, 0);

    expect(state).toMatchObject({ week: 12, seasonWeeks: 19, wins: 9, losses: 3, divisionRank: 1 });
  });

  it('falls back to the default schedule length when generated schedule data is absent', () => {
    const state = resolveWhereAmIState({
      game: {
        week: 3,
        teams: {
          a: { id: 'a', isUser: true, wins: 1, losses: 2, conference: 'AFC', division: 'East' },
        },
      },
    }, 0);

    expect(state.seasonWeeks).toBe(18);
  });

  it('formats a zero record correctly', () => {
    expect(createWhereAmIBeat({
      week: 1,
      seasonWeeks: 18,
      wins: 0,
      losses: 0,
      divisionRank: 4,
      pendingTotal: 0,
    }).text).toBe('Week 1/18, 0-0, Division 4. Must Do: none right now. Recommended: open Monday Briefing. Where: Action Center, then any legal team screen: roster, depth, cap, market, staff, scouting, medical, or Game Plan. Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.');
  });

  it('omits the pending suffix when there are zero pending decisions', () => {
    expect(createWhereAmIBeat({
      ...summaryState,
      pendingTotal: 0,
    }).text).toBe('Week 8/18, 5-2, Division 1. Must Do: none right now. Recommended: open Monday Briefing. Where: Action Center, then any legal team screen: roster, depth, cap, market, staff, scouting, medical, or Game Plan. Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.');
  });

  it('keeps the summary beat in action and consequence language', () => {    const pendingText = createWhereAmIBeat(summaryState).text;
    const clearText = createWhereAmIBeat({ ...summaryState, pendingTotal: 0 }).text;

    expect(pendingText).toContain('Must Do:');
    expect(pendingText).toContain('Consequence:');
    expect(pendingText).toContain('before Advance Week');
    expect(pendingText).toContain('choose or defer 4 decisions');
    expect(pendingText).toContain('Where:');
    expect(pendingText).toContain('Inbox, Action Center, or highlighted screen badges');
    expect(pendingText).not.toContain('route badges');
    expect(pendingText).toContain('expire or lock at Advance Week');
    expect(pendingText).not.toContain('waiting decision screen');
    expect(pendingText).not.toContain('unanswered items');
    expect(pendingText).not.toContain('lock in without your answer');
    expect(pendingText).not.toContain('flagged decision');
    expect(clearText).toContain('Must Do: none right now.');
    expect(clearText).toContain('Recommended:');
    expect(clearText).toContain('Recommended: open Monday Briefing.');
    expect(clearText).toContain('Where: Action Center, then any legal team screen');
    expect(clearText).toContain('roster, depth, cap, market, staff, scouting, medical, or Game Plan');
    expect(clearText).toContain('Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.');
    expect(clearText).not.toContain('open Monday Briefing first');
    expect(clearText).not.toContain('use Monday Briefing first');
    expect(clearText).not.toMatch(/\bcap room\b/i);
    expect(clearText).not.toContain('review injuries, depth, cap space, and Game Plan');
    expect(clearText).not.toContain('only if injuries, backup order, cap space, or matchup calls need a change');
    expect(`${pendingText} ${clearText}`).not.toMatch(/affect the sim|normal sim risk|normal matchup risk|No required action is stopping|No true blockers|true blockers|affect Advance Week|backup or plan risk|can wait/i);
  });

  it('enriches the summary with next opponent, streak, and a form-aware pose', () => {
    const state = resolveWhereAmIState({
      game: {
        week: 8,
        schedule: Array.from({ length: 18 }, (_, index) => ({
          week: index + 1,
          games: index + 1 === 8
            ? [{ homeTeamId: 'a', awayTeamId: 'z' }]
            : [],
        })),
        weekSummaries: [
          { result: 'loss' },
          { result: 'win' },
          { result: 'win' },
        ],
        teams: {
          a: { id: 'a', isUser: true, wins: 5, losses: 2, conference: 'AFC', division: 'East' },
          z: { id: 'z', city: 'Austin', name: 'Armadillos', wins: 6, losses: 1, conference: 'AFC', division: 'West' },
        },
      },
    }, 4);

    expect(state.opponentName).toBe('Austin Armadillos');
    expect(state.streak).toBe('W2');

    const beat = createWhereAmIBeat(state);
    expect(beat.pose).toBe('proud');
    expect(beat.text).toContain('Week 8/18, 5-2 (W2), Division 1.');
    expect(beat.text).toContain('Next: Austin Armadillos.');
    expect(beat.text).toContain('Must Do: choose or defer 4 decisions before Advance Week');
    expect(beat.text).toContain('expire or lock');
    expect(beat.text.length).toBeLessThanOrEqual(240);
  });

  it('keeps a loss streak skeptical and stays inside the bubble budget', () => {
    const state = resolveWhereAmIState({
      game: {
        week: 11,
        weekSummaries: [
          { result: 'win' },
          { result: 'loss' },
          { result: 'loss' },
          { result: 'loss' },
        ],
        teams: {
          a: { id: 'a', isUser: true, wins: 3, losses: 7, conference: 'AFC', division: 'East' },
        },
      },
    }, 0);

    expect(state.streak).toBe('L3');

    const beat = createWhereAmIBeat(state);
    expect(beat.pose).toBe('skeptical');
    expect(beat.text).toContain('(L3)');
    expect(beat.text).toContain('Must Do: none right now.');
    expect(beat.text).toContain('Recommended: open Monday Briefing');
    expect(beat.text.length).toBeLessThanOrEqual(240);
  });

  it('falls back to the legacy summary when no schedule or results exist', () => {
    const beat = createWhereAmIBeat(summaryState);
    expect(beat.pose).toBe('thinking');
    expect(beat.text).not.toContain('Next:');
    expect(beat.text).not.toMatch(/\([WL]\d\)/);
  });

  it('surfaces user injuries and a tight cap in the enriched summary', () => {
    const state = resolveWhereAmIState({
      game: {
        week: 6,
        players: [
          { id: 'p1', teamId: 'a', injury: { weeks: 2 } },
          { id: 'p2', teamId: 'a', injury: null },
          { id: 'p3', teamId: 'a', injury: { weeks: 1 } },
          { id: 'p4', teamId: 'z', injury: { weeks: 4 } },
        ],
        teams: {
          a: { id: 'a', isUser: true, wins: 3, losses: 2, conference: 'AFC', division: 'East', capSpace: 2.5 },
        },
      },
    }, 0);

    expect(state.injuryCount).toBe(2);
    expect(state.capTight).toBe(true);

    const beat = createWhereAmIBeat(state);
    expect(beat.text).toContain('Injuries: 2 (Roster).');
    expect(beat.text).toContain('Cap tight.');
    expect(beat.text.length).toBeLessThanOrEqual(240);
  });

  it('keeps the worst-case enriched summary inside the bubble budget', () => {
    const beat = createWhereAmIBeat({
      week: 18,
      seasonWeeks: 18,
      wins: 12,
      losses: 5,
      divisionRank: 4,
      pendingTotal: 12,
      opponentName: 'Truth or Consequences Armadillos',
      streak: 'L9',
      injuryCount: 11,
      capTight: true,
    });

    expect(beat.text).toContain('Week 18/18, 12-5 (L9), Division 4.');
    expect(beat.text).toContain('choose or defer 12 decisions');
    expect(beat.text.length).toBeLessThanOrEqual(240);
  });

  it('ignores cap data that is missing or not finite', () => {
    const state = resolveWhereAmIState({
      game: {
        week: 2,
        teams: {
          a: { id: 'a', isUser: true, wins: 1, losses: 1, conference: 'AFC', division: 'East' },
        },
      },
    }, 0);

    expect(state.injuryCount).toBeUndefined();
    expect(state.capTight).toBeUndefined();
    expect(createWhereAmIBeat(state).text).not.toContain('Cap tight.');
  });

  it('phrases the season arc for early, midway, and stretch-run weeks', () => {
    const base = { wins: 5, losses: 2, divisionRank: 1, pendingTotal: 0, streak: 'W1' };
    const early = createWhereAmIBeat({ ...base, week: 2, seasonWeeks: 18 });
    const midway = createWhereAmIBeat({ ...base, week: 9, seasonWeeks: 18 });
    const stretch = createWhereAmIBeat({ ...base, week: 16, seasonWeeks: 18 });

    expect(early.text).toContain('Early days.');
    expect(midway.text).toContain('Midway point.');
    expect(stretch.text).toContain('Stretch run.');
    for (const beat of [early, midway, stretch]) {
      expect(beat.text.length).toBeLessThanOrEqual(240);
    }
  });

  it('rotates deterministic sign-offs across weeks and stays inside the budget', () => {
    const beats = Array.from({ length: 18 }, (_, index) =>
      createWhereAmIBeat({
        week: index + 1,
        seasonWeeks: 18,
        wins: 6,
        losses: 3,
        divisionRank: 2,
        pendingTotal: 1,
        streak: 'W1',
      }));
    const signed = beats.filter((beat) =>
      / (Headsets on\.|That's the tape\.|We move\.)$/.test(beat.text));
    expect(signed.length).toBeGreaterThan(0);
    expect(new Set(beats.map((beat) => beat.text)).size).toBeGreaterThan(1);
    for (const beat of beats) {
      expect(beat.text.length).toBeLessThanOrEqual(240);
    }
  });

  it('keeps every Where Am I beat inside Chip voice guards', () => {
    const RETIRED_PHRASES =
      /\b(vibe|feels?|story|context|identity|foundation|momentum|real answer|good energy|tone setter|read|verify|confirm|check|review|compare|worth|use|sim|triage)\b/i;
    const beats = [
      createWhereAmIBeat(summaryState),
      createWhereAmIBeat({ ...summaryState, pendingTotal: 0 }),
      createWhereAmIBeat({
        week: 16,
        seasonWeeks: 18,
        wins: 10,
        losses: 5,
        divisionRank: 1,
        pendingTotal: 3,
        opponentName: 'Austin Armadillos',
        streak: 'W3',
        injuryCount: 4,
        capTight: true,
      }),
    ];
    for (const beat of beats) {
      expect(beat.text, beat.text).not.toMatch(RETIRED_PHRASES);
    }
  });
});

describe('B10 year-over-year callbacks', () => {
  function gameWithHistory(year: number, historyYears: number[]) {
    return {
      game: {
        week: 10,
        year,
        schedule: Array.from({ length: 18 }, (_, index) => ({ week: index + 1, games: [] })),
        teams: {
          a: { id: 'a', isUser: true, wins: 6, losses: 3, conference: 'AFC', division: 'East' },
        },
        franchiseHistory: historyYears.map((historyYear) => ({
          year: historyYear,
          teamId: 'a',
          wins: 8,
          losses: 9,
        })),
      },
    };
  }

  it('derives the 1-based dynasty year from the earliest saved history entry', () => {
    expect(resolveWhereAmIState(gameWithHistory(2029, [2027, 2028]), 0).dynastyYear).toBe(3);
    expect(resolveWhereAmIState(gameWithHistory(2029, []), 0).dynastyYear).toBe(1);
    expect(resolveWhereAmIState(gameWithHistory(0, [2027]), 0).dynastyYear).toBeUndefined();
  });

  it('leads the extras with the climb callback from year 2 onward', () => {
    const state = resolveWhereAmIState(gameWithHistory(2029, [2027, 2028]), 0);
    expect(state.opponentName).toBeUndefined();
    const beat = createWhereAmIBeat({
      ...state,
      opponentName: 'Austin Armadillos',
    });
    expect(beat.text).toContain('Year 3 of the climb.');
    expect(beat.text.length).toBeLessThanOrEqual(240);
  });

  it('stays silent in year 1 so the callback never reads as filler', () => {
    const state = resolveWhereAmIState(gameWithHistory(2027, []), 0);
    const beat = createWhereAmIBeat({ ...state, streak: 'W2' });
    expect(beat.text).not.toContain('of the climb.');
  });
});

describe('G5 AGM reference', () => {
  function gameWithAgm(agmProfileId: string | null) {
    return {
      game: {
        week: 12,
        schedule: Array.from({ length: 18 }, (_, index) => ({ week: index + 1, games: [] })),
        teams: {
          a: { id: 'a', isUser: true, wins: 9, losses: 3, conference: 'AFC', division: 'East' },
          b: { id: 'b', wins: 8, losses: 4, conference: 'AFC', division: 'East' },
        },
        frontOffice: agmProfileId ? { agmProfileId } : {},
      },
    };
  }

  it('references the hired AGM by name, personality, and desk', () => {
    const state = resolveWhereAmIState(gameWithAgm('marcus_webb'), 0);

    expect(state.agmReference).toBe('AGM Marcus Webb (analytical) holds the cap desk.');

    const beat = createWhereAmIBeat(state);
    expect(beat.text).toContain('AGM Marcus Webb (analytical) holds the cap desk.');
    expect(beat.text.length).toBeLessThanOrEqual(240);
  });

  it('humanizes every personality and expertise label', () => {
    expect(resolveWhereAmIState(gameWithAgm('coach_d_hardaway'), 0).agmReference)
      .toMatch(/\(fiery\) holds the defense desk\./);
    expect(resolveWhereAmIState(gameWithAgm('sandra_chen'), 0).agmReference)
      .toMatch(/\(player-whisperer\) holds the personnel desk\./);
  });

  it('stays silent with no AGM hire or an unknown profile id', () => {
    expect(resolveWhereAmIState(gameWithAgm(null), 0).agmReference).toBeUndefined();
    expect(resolveWhereAmIState(gameWithAgm('not_a_real_agm'), 0).agmReference).toBeUndefined();

    const beat = createWhereAmIBeat(resolveWhereAmIState(gameWithAgm(null), 0));
    expect(beat.text).not.toContain('AGM');
  });
});
