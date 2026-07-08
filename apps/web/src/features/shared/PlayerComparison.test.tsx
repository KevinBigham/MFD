import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  applyRuleChange,
  initLeagueRules,
  makeContract,
  type GameState,
  type Player,
} from '@mfd/engine';
import { PlayerComparison } from './PlayerComparison';

function makeComparisonPlayer(id: string, name: string, totalAnnualSalary: number): Player {
  return {
    id,
    name,
    firstName: name.split(' ')[0] ?? name,
    lastName: name.split(' ')[1] ?? 'Player',
    pos: 'QB',
    ovr: id === 'p1' ? 88 : 84,
    pot: 90,
    age: id === 'p1' ? 27 : 29,
    yearsExp: 5,
    personality: { workEthic: 7, loyalty: 6, greed: 5, pressure: 8, ambition: 7 },
    traits: [],
    devTrait: 'star',
    jerseyNumber: id === 'p1' ? 12 : 7,
    contract: makeContract(totalAnnualSalary, 3, 0, 0, id, 'user'),
    stats: {},
  } as unknown as Player;
}

const playerA = makeComparisonPlayer('p1', 'Ace Cannon', 10);
const playerB = makeComparisonPlayer('p2', 'Brick Stone', 20);

const leagueRules = applyRuleChange(initLeagueRules(2028), {
  key: 'salary_cap_growth',
  newValue: 0.1,
  source: 'cba',
  proposedBy: 'owners',
  effectiveYear: 2028,
  rationale: 'Raise the cap faster.',
});

const mockState = {
  game: {
    year: 2028,
    players: {
      [playerA.id]: playerA,
      [playerB.id]: playerB,
    },
    leagueRules,
  } as unknown as GameState,
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectRoster: (state: typeof mockState) => Object.values(state.game.players),
  selectUserTeamId: () => 'user',
}));

describe('PlayerComparison', () => {
  it('renders annual cap share from the active salary cap growth rule', () => {
    const markup = renderToStaticMarkup(<PlayerComparison initialPlayerA="p1" initialPlayerB="p2" />);

    expect(markup).toContain('Annual Cap %');
    expect(markup).toContain('3.2% cap');
    expect(markup).toContain('6.5% cap');
    expect(markup).toContain('COMPARISON CONTEXT');
    expect(markup).toContain('CURRENT GAME.PLAYERS');
    expect(markup).toContain('ACTIVE SALARY CAP');
    expect(markup).toContain('ROUTE-LOCAL PICKS');
    expect(markup).toContain('DISPLAY ONLY');
    expect(markup).toContain('Player pool comes from current contracted players in game.players.');
    expect(markup).toContain('Rows compare current OVR, potential, age, experience, personality, contract cap hit, active-cap contract grade, and current-season player.stats.');
    expect(markup).toContain('Position stat rows follow Player A&#x27;s position lens (Pass Yds / Pass TD / INT) because both players share a position.');
    expect(markup).toContain('Opening this screen does not write stats, contracts, profile history, timelines, player archives, awards, records, news, or social posts.');
  });
});
