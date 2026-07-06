import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  applyRuleChange,
  initLeagueRules,
  makeContract,
  type CapProjectionYear,
  type GameState,
  type Player,
  type Team,
} from '@mfd/engine';
import { ContractsCap } from './ContractsCap';

const player = {
  id: 'p1',
  name: 'Ace Cannon',
  firstName: 'Ace',
  lastName: 'Cannon',
  pos: 'QB',
  ovr: 88,
  age: 28,
  contract: makeContract(24, 4, 8, 12, 'p1', 'user'),
  holdout: false,
  agentId: null,
} as unknown as Player;

const capGrowthRules = applyRuleChange(initLeagueRules(2028), {
  key: 'salary_cap_growth',
  newValue: 0.1,
  source: 'cba',
  proposedBy: 'owners',
  effectiveYear: 2028,
  rationale: 'Raise the cap faster.',
});
const capFloorRules = applyRuleChange(capGrowthRules, {
  key: 'cap_floor_pct',
  newValue: 0.95,
  source: 'cba',
  proposedBy: 'players',
  effectiveYear: 2028,
  rationale: 'Raise the spending floor.',
});
const leagueRules = applyRuleChange(capFloorRules, {
  key: 'franchise_tag_limit',
  newValue: 2,
  source: 'cba',
  proposedBy: 'owners',
  effectiveYear: 2028,
  rationale: 'Add tag flexibility.',
});
const leagueRulesWithTagTypes = applyRuleChange(leagueRules, {
  key: 'tag_types_allowed',
  newValue: ['exclusive', 'non-exclusive'],
  source: 'cba',
  proposedBy: 'owners',
  effectiveYear: 2028,
  rationale: 'Limit tag menu.',
});

const team = {
  id: 'user',
  city: 'Chicago',
  name: 'Blaze',
  abbrev: 'BLZ',
  isUser: true,
  roster: [player],
  capUsed: 210,
  capSpace: 98,
  deadCap: 3,
  deadCapByYear: {},
} as unknown as Team;

const projection: CapProjectionYear[] = [
  { year: 2029, totalCap: 339, committedCap: 120, deadCap: 2, freeSpace: 217 },
];

const mockState = {
  game: {
    year: 2028,
    teams: { user: team },
    players: { [player.id]: player },
    agents: [],
    leagueRules: leagueRulesWithTagTypes,
  } as unknown as GameState,
  actions: {
    restructure: vi.fn(),
    backload: vi.fn(),
    cutPlayer: vi.fn(),
    submitExtensionOffer: vi.fn(),
    applyFranchiseTag: vi.fn(),
  },
};

const uiState = {
  focusedPlayerId: null,
  focusedPlayerScreen: null,
  clearFocusedPlayerContext: vi.fn(),
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectRoster: (state: typeof mockState) => state.game.teams.user?.roster ?? [],
  selectUserTeam: (state: typeof mockState) => state.game.teams.user ?? null,
  selectUserTeamId: () => 'user',
  selectYear: (state: typeof mockState) => state.game.year,
  selectCapProjection: () => projection,
  selectIncentiveSummary: () => ({ total: 0, likely: 0, unlikely: 0, entries: [] }),
}));

vi.mock('../../app/store/ui-store', () => ({
  useUiStore: (selector: (state: typeof uiState) => unknown) => selector(uiState),
}));

describe('ContractsCap', () => {
  it('renders rule-aware salary cap ceiling and cap floor values', () => {
    const markup = renderToStaticMarkup(<ContractsCap />);

    expect(markup).toContain('Salary Cap');
    expect(markup).toContain('$308M');
    expect(markup).toContain('Cap Floor');
    expect(markup).toContain('$292M');
    expect(markup).toContain('under floor');
    expect(markup).toContain('FRANCHISE TAG WINDOW');
    expect(markup).toContain('0/2');
    expect(markup).toContain('exclusive, non exclusive');
    expect(markup).toContain('franchise_tag_limit and tag_types_allowed');
    expect(markup).toContain('CONTRACT SOURCES');
    expect(markup).toContain('selectRoster feeds active contracts');
    expect(markup).toContain('getSalaryCap(year, game)');
    expect(markup).toContain('getCapFloor(year, game)');
    expect(markup).toContain('selectCapProjection owns the multi-year committed/free-space read model');
    expect(markup).toContain('selectIncentiveSummary reads saved contract clauses');
    expect(markup).toContain('Opening /contracts and selecting rows do not write contracts');
    expect(markup).toContain('Submit Extension');
    expect(markup).toContain('Apply Franchise Tag');
  });
});
