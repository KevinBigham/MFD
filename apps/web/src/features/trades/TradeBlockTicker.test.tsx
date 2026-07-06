import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LeagueTradeBlockEntry } from '../../app/store/game-store';
import {
  TradeBlockTicker,
  buildTradeBlockMarketReason,
  classifyTradeBlockIntent,
  filterLeagueTradeBlockEntries,
  groupLeagueTradeBlockEntries,
  sortLeagueTradeBlockEntries,
} from './TradeBlockTicker';

let mockEntries: LeagueTradeBlockEntry[] = [];
let mockScenarioState: any | null = null;

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
    teamGmStrategy: 'neutral',
    teamPhilosophy: 'maintain',
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
    scenarioState: any | null;
  }) => unknown) => selector({ entries: mockEntries, userTeam, scenarioState: mockScenarioState }),
  selectLeagueTradeBlock: (state: { entries: LeagueTradeBlockEntry[] }) => state.entries,
  selectScenarioState: (state: { scenarioState: any | null }) => state.scenarioState,
  selectUserTeam: (state: { userTeam: typeof userTeam }) => state.userTeam,
}));

describe('TradeBlockTicker', () => {
  beforeEach(() => {
    mockEntries = manyEntries();
    mockScenarioState = null;
  });

  it('renders the league trade block screen with all non-user teams', () => {
    const markup = renderToStaticMarkup(<TradeBlockTicker />);

    expect(markup).toContain('LEAGUE TRADE BLOCK');
    expect(markup).toContain('TRADE BLOCK SOURCE');
    expect(markup).toContain('selectLeagueTradeBlock builds this ticker');
    expect(markup).toContain('Route filters are local to this screen');
    expect(markup).toContain('CPU intent reads saved team.gmStrategy and team.philosophy');
    expect(markup).toContain('Opening /trade-block does not create proposals');
    expect(markup).toContain('Direct proposals still expose players and current-year picks only');
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
    expect(markup).toContain('Market Receipt');
    expect(markup).toContain('Listening post');
    expect(markup).toContain('Dallas Bulls needs CB');
    expect(markup).toContain('92% acceptance, Gap +1.4');
  });

  it('renders an empty state when no suggestions are available', () => {
    mockEntries = [];

    const markup = renderToStaticMarkup(<TradeBlockTicker />);

    expect(markup).toContain('No league-wide trade-block targets surfaced yet.');
    expect(markup).not.toContain('data-trade-block-team=');
  });

  it('renders scenario planning guidance while keeping trade-block scanning available', () => {
    mockScenarioState = {
      activeScenario: {
        id: 'savant',
        name: 'The Savant',
        constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
      },
    };

    const markup = renderToStaticMarkup(<TradeBlockTicker />);

    expect(markup).toContain('SCENARIO LOCK');
    expect(markup).toContain('The Savant');
    expect(markup).toContain('TRADE COMMITS BLOCKED');
    expect(markup).toContain('SCANNING AVAILABLE');
    expect(markup).toContain('saved scenarioState.activeScenario.constraints.blockTrades');
    expect(markup).toContain('Trade-block scouting remains available for planning');
    expect(markup).toContain('TRADES LOCKED');
    expect(markup).toContain('TICKER CONTROLS');
    expect(markup).toContain('Trade Center');
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

  it('classifies and filters CPU trade-block intent from saved strategy and philosophy fields', () => {
    const entries = [
      entry(1, { teamName: 'Deadline Buyer', teamGmStrategy: 'contend', teamPhilosophy: 'maintain' }),
      entry(2, { teamName: 'Rebuild Seller', teamGmStrategy: 'neutral', teamPhilosophy: 'rebuild' }),
      entry(3, { teamName: 'Fire Sale Seller', teamGmStrategy: 'contend', teamPhilosophy: 'fire_sale' }),
      entry(4, { teamName: 'Hold Pattern', teamGmStrategy: 'neutral', teamPhilosophy: 'maintain' }),
    ];

    expect(classifyTradeBlockIntent(entries[0]!).id).toBe('buyer');
    expect(classifyTradeBlockIntent(entries[1]!).id).toBe('seller');
    expect(classifyTradeBlockIntent(entries[2]!).id).toBe('seller');
    expect(classifyTradeBlockIntent(entries[3]!).id).toBe('neutral');
    expect(filterLeagueTradeBlockEntries(entries, userTeam, 'all', 'buyer').map((item) => item.teamName))
      .toEqual(['Deadline Buyer']);
    expect(filterLeagueTradeBlockEntries(entries, userTeam, 'all', 'seller').map((item) => item.teamName))
      .toEqual(['Rebuild Seller', 'Fire Sale Seller']);
    expect(filterLeagueTradeBlockEntries(entries, userTeam, 'all', 'neutral').map((item) => item.teamName))
      .toEqual(['Hold Pattern']);
  });

  it('builds read-only market receipt copy from saved CPU intent and valuation fields', () => {
    expect(buildTradeBlockMarketReason(entry(1, {
      teamPhilosophy: 'fire_sale',
      teamGmStrategy: 'contend',
      seekerTeamName: 'Dallas Bulls',
      seekerNeed: 'WR',
      acceptanceLikelihood: 0.88,
      valueGap: -0.6,
    }))).toMatchObject({
      label: 'Fire-sale market',
      detail: 'Dallas Bulls needs WR; saved fire-sale philosophy keeps future-asset conversations open. 88% acceptance, Gap -0.6.',
      accent: 'red',
    });
    expect(buildTradeBlockMarketReason(entry(2, {
      teamPhilosophy: 'rebuild',
      seekerTeamName: 'Boston Founders',
      seekerNeed: 'CB',
    })).label).toBe('Seller market');
    expect(buildTradeBlockMarketReason(entry(3, {
      teamGmStrategy: 'contend',
      teamPhilosophy: 'maintain',
      seekerTeamName: 'Seattle Surge',
      seekerNeed: null,
    })).detail).toContain('Seattle Surge has a roster fit');
    expect(buildTradeBlockMarketReason(entry(4, {
      teamGmStrategy: 'neutral',
      teamPhilosophy: 'maintain',
    })).label).toBe('Listening post');
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
