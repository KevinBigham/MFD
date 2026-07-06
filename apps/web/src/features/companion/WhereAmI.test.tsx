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

  it('keeps the summary beat in action and consequence language', () => {
    const pendingText = createWhereAmIBeat(summaryState).text;
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
});
