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
      text: 'Week 8 / 17 — Record 5-2 — Division 1 — 4 decisions waiting',
    });
  });

  it('substitutes week, record, and division rank from game state', () => {
    const state = resolveWhereAmIState({
      game: {
        week: 12,
        teams: {
          a: { id: 'a', isUser: true, wins: 9, losses: 3, conference: 'AFC', division: 'East' },
          b: { id: 'b', wins: 8, losses: 4, conference: 'AFC', division: 'East' },
        },
      },
    }, 0);

    expect(state).toMatchObject({ week: 12, wins: 9, losses: 3, divisionRank: 1 });
  });

  it('formats a zero record correctly', () => {
    expect(createWhereAmIBeat({
      week: 1,
      wins: 0,
      losses: 0,
      divisionRank: 4,
      pendingTotal: 0,
    }).text).toBe('Week 1 / 17 — Record 0-0 — Division 4');
  });

  it('omits the pending suffix when there are zero pending decisions', () => {
    expect(createWhereAmIBeat({
      ...summaryState,
      pendingTotal: 0,
    }).text).toBe('Week 8 / 17 — Record 5-2 — Division 1');
  });
});
