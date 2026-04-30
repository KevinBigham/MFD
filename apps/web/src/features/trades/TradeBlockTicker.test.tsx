import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LeagueTradeBlockEntry } from '../../app/store/game-store';
import {
  TradeBlockTicker,
  filterLeagueTradeBlockEntries,
  groupLeagueTradeBlockEntries,
  sortLeagueTradeBlockEntries,
} from './TradeBlockTicker';

let mockEntries: LeagueTradeBlockEntry[] = [];

const userTeam = {
  id: 'user',
  city: 'Chicago',
  name: 'Blaze',
  conference: 'AFC' as const,
  division: 'North',
};

function entry(index: number, overrides: Partial<LeagueTradeBlockEntry> = {}): LeagueTradeBlockEntry {
  const teamId = `team-${index}`;
  return {
    teamId,
    teamName: `Team ${String(index).padStart(2, '0')}`,
    teamConference: index % 2 === 0 ? 'AFC' : 'NFC',
    teamDivision: index % 3 === 0 ? 'North' : 'West',
    playerId: `player-${index}`,
    playerName: `Player ${String(index).padStart(2, '0')}`,
    position: index % 2 === 0 ? 'WR' : 'CB',
    ovr: 70 + index,
    seekerTeamId: `seeker-${index}`,
    seekerTeamName: `Seeker ${String(index).padStart(2, '0')}`,
    seekerNeed: index % 2 === 0 ? 'WR' : 'CB',
    acceptanceLikelihood: 0.75 + index / 100,
    valueGap: index - 16,
    reasoning: `Team ${index} is listening.`,
    ...overrides,
  };
}

function manyEntries(): LeagueTradeBlockEntry[] {
  return Array.from({ length: 31 }, (_, index) => entry(index + 1));
}

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: {
    entries: LeagueTradeBlockEntry[];
    userTeam: typeof userTeam;
  }) => unknown) => selector({ entries: mockEntries, userTeam }),
  selectLeagueTradeBlock: (state: { entries: LeagueTradeBlockEntry[] }) => state.entries,
  selectUserTeam: (state: { userTeam: typeof userTeam }) => state.userTeam,
}));

describe('TradeBlockTicker', () => {
  beforeEach(() => {
    mockEntries = manyEntries();
  });

  it('renders the league trade block screen with all non-user teams', () => {
    const markup = renderToStaticMarkup(<TradeBlockTicker />);

    expect(markup).toContain('LEAGUE TRADE BLOCK');
    expect(markup.match(/data-trade-block-team=/g)).toHaveLength(31);
    expect(markup).toContain('31 teams');
  });

  it('renders player, interest, and user-team context details', () => {
    mockEntries = [
      entry(1, {
        teamName: 'Austin Armadillos',
        playerName: 'Cole Hart',
        seekerTeamName: 'Dallas Bulls',
        acceptanceLikelihood: 0.92,
        valueGap: 1.4,
      }),
    ];

    const markup = renderToStaticMarkup(<TradeBlockTicker />);

    expect(markup).toContain('AUSTIN ARMADILLOS');
    expect(markup).toContain('Cole Hart');
    expect(markup).toContain('Interest: Dallas Bulls');
    expect(markup).toContain('User: Chicago Blaze');
    expect(markup).toContain('92%');
  });

  it('renders an empty state when no suggestions are available', () => {
    mockEntries = [];

    const markup = renderToStaticMarkup(<TradeBlockTicker />);

    expect(markup).toContain('No league-wide trade-block targets surfaced yet.');
    expect(markup).not.toContain('data-trade-block-team=');
  });

  it('filters to my conference and division rivals using user alignment', () => {
    const entries = [
      entry(1, { teamConference: 'AFC', teamDivision: 'North', teamName: 'Division Rival' }),
      entry(2, { teamConference: 'AFC', teamDivision: 'West', teamName: 'Conference Peer' }),
      entry(3, { teamConference: 'NFC', teamDivision: 'North', teamName: 'Other Conference' }),
    ];

    expect(filterLeagueTradeBlockEntries(entries, userTeam, 'conference').map((item) => item.teamName))
      .toEqual(['Division Rival', 'Conference Peer']);
    expect(filterLeagueTradeBlockEntries(entries, userTeam, 'division').map((item) => item.teamName))
      .toEqual(['Division Rival']);
  });

  it('sorts by team or player overall with stable tie-breakers', () => {
    const entries = [
      entry(1, { teamName: 'Zulu', playerName: 'Beta', ovr: 88 }),
      entry(2, { teamName: 'Alpha', playerName: 'Charlie', ovr: 88 }),
      entry(3, { teamName: 'Middle', playerName: 'Alpha', ovr: 91 }),
    ];

    expect(sortLeagueTradeBlockEntries(entries, 'team').map((item) => item.teamName))
      .toEqual(['Alpha', 'Middle', 'Zulu']);
    expect(sortLeagueTradeBlockEntries(entries, 'ovr').map((item) => item.playerName))
      .toEqual(['Alpha', 'Beta', 'Charlie']);
  });

  it('groups by offering team and caps each group at the requested top count', () => {
    const entries = [
      entry(1, { teamId: 'a', teamName: 'Austin', playerName: 'One', ovr: 91 }),
      entry(2, { teamId: 'a', teamName: 'Austin', playerName: 'Two', ovr: 89 }),
      entry(3, { teamId: 'a', teamName: 'Austin', playerName: 'Three', ovr: 88 }),
      entry(4, { teamId: 'b', teamName: 'Boston', playerName: 'Four', ovr: 87 }),
    ];

    const groups = groupLeagueTradeBlockEntries(entries, 2);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.entries.map((item) => item.playerName)).toEqual(['One', 'Two']);
    expect(groups[1]?.entries.map((item) => item.playerName)).toEqual(['Four']);
  });

  it('keeps deterministic markup across server renders', () => {
    const first = renderToStaticMarkup(<TradeBlockTicker />);
    const second = renderToStaticMarkup(<TradeBlockTicker />);

    expect(second).toBe(first);
  });
});
