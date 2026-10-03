import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, Player } from '@mfd/engine';
import { buildWatchListRows, removeWatchListRow, WatchListScreen } from './WatchListScreen';
import type { WatchListPrefs } from './watchListPrefs';

function player(id: string, name: string, teamId: string | null, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: name.split(' ')[0] ?? name,
    lastName: name.split(' ')[1] ?? 'Player',
    name,
    pos: 'WR',
    age: 26,
    ovr: 84,
    pot: 86,
    ratings: {},
    devTrait: 'star',
    personality: { ambition: 6, loyalty: 6, temperament: 6, workEthic: 7, pressure: 6 },
    traits: [],
    archetype: null,
    contract: null,
    teamId,
    draftYear: 2024,
    draftRound: 2,
    draftPick: 40,
    college: 'MFD State',
    yearsExp: 3,
    careerStats: { seasons: 3, gp: 34, snaps: 400 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 70,
    chemistry: 70,
    systemFit: 76,
    cliqueId: null,
    jerseyNumber: 11,
    endorsements: [],
    isStarter: true,
    role: null,
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: { gamesPlayed: 0 },
    ...overrides,
  } as unknown as Player;
}

const ownPlayer = player('own-1', 'Jay Stone', 'team-1', { pos: 'QB', ovr: 91 });
const freeAgent = player('fa-1', 'Cole Hart', null, { pos: 'CB', ovr: 83 });
const formerPlayer = player('former-1', 'Rico North', 'team-2', { pos: 'RB', ovr: 79 });

let mockPrefs: WatchListPrefs = { playerIds: [], updatedAt: '' };
let mockGame: GameState | null = null;

function buildGame(): GameState {
  return {
    teams: {
      'team-1': { id: 'team-1', city: 'Chicago', name: 'Blaze', isUser: true },
      'team-2': { id: 'team-2', city: 'Detroit', name: 'Steel', isUser: false },
    },
    players: {
      [ownPlayer.id]: ownPlayer,
      [freeAgent.id]: freeAgent,
      [formerPlayer.id]: formerPlayer,
    },
    freeAgents: [freeAgent.id],
    draftClass: [
      {
        id: 'prospect-1',
        firstName: 'Jalen',
        lastName: 'North',
        pos: 'WR',
        college: 'Texas',
        region: 'south',
        ratings: {},
        projectedRound: 1,
        scoutGrade: 82,
        trueGrade: 84,
        personality: { ambition: 6, loyalty: 6, temperament: 6, workEthic: 7, pressure: 6 },
        traits: [],
        archetype: null,
        characterArchetype: 'steady',
        bustProbability: 0.12,
        stealProbability: 0.22,
        scoutingReports: [],
        combine: null,
      },
    ],
    playerArchive: [
      {
        playerId: 'retired-1',
        firstName: 'Avery',
        lastName: 'King',
        name: 'Avery King',
        positions: ['DL'],
        jerseyNumber: 99,
        peakOvr: 88,
        peakYear: 2028,
        firstYear: 2021,
        lastYear: 2030,
        retirementYear: 2031,
        teamHistory: [{ teamId: 'team-2', firstYear: 2021, lastYear: 2030 }],
      },
    ],
  } as unknown as GameState;
}

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: { game: GameState | null }) => unknown) => selector({ game: mockGame }),
}));

vi.mock('./watchListPrefs', async () => {
  const actual = await vi.importActual<typeof import('./watchListPrefs')>('./watchListPrefs');
  return {
    ...actual,
    getWatchList: () => mockPrefs,
    subscribeWatchList: () => () => undefined,
    removeFromWatchList: (playerId: string) => {
      mockPrefs = {
        playerIds: mockPrefs.playerIds.filter((id) => id !== playerId),
        updatedAt: 'removed-stamp',
      };
      return mockPrefs;
    },
  };
});

describe('WatchListScreen', () => {
  beforeEach(() => {
    mockGame = buildGame();
    mockPrefs = { playerIds: [], updatedAt: '' };
  });

  it('renders an empty state when no players are pinned', () => {
    const markup = renderToStaticMarkup(<WatchListScreen />);

    expect(markup).toContain('WATCH LIST');
    expect(markup).toContain('No players pinned yet.');
  });

  it('renders a single pinned own-roster player', () => {
    mockPrefs = { playerIds: ['own-1'], updatedAt: '2026-04-30T12:00:00.000Z' };

    const markup = renderToStaticMarkup(<WatchListScreen />);

    expect(markup).toContain('JAY STONE');
    expect(markup).toContain('QB // OVR 91 // Chicago Blaze');
    expect(markup).toContain('own roster');
  });

  it('renders source copy for browser-local pins and saved watchlist boundaries', () => {
    mockPrefs = { playerIds: ['own-1'], updatedAt: '2026-04-30T12:00:00.000Z' };

    const markup = renderToStaticMarkup(<WatchListScreen />);

    expect(markup).toContain('WATCH LIST SOURCES');
    expect(markup).toContain('mfd.watchlist.v1');
    expect(markup).toContain('browser-local convenience state by design');
    expect(markup).toContain('not included in .mfd cartridges or Combined Backup exports');
    expect(markup).toContain('buildWatchListRows resolves pinned ids');
    expect(markup).toContain('offseasonState.scoutingWatchlist');
    expect(markup).toContain('faTargetBoard.watchlist');
    expect(markup).toContain('Opening Watch List does not change the saved game');
  });

  it('builds rows for roster, free-agent, prospect, and retired groups', () => {
    const rows = buildWatchListRows(mockGame, {
      playerIds: ['own-1', 'fa-1', 'prospect-1', 'retired-1'],
      updatedAt: 'stamp',
    });

    expect(rows.map((row) => row.group)).toEqual(['own', 'fa', 'prospect', 'former']);
    expect(rows.map((row) => row.name)).toEqual(['Jay Stone', 'Cole Hart', 'Jalen North', 'Avery King']);
  });

  it('keeps status group panels in the expected order', () => {
    mockPrefs = { playerIds: ['retired-1', 'prospect-1', 'fa-1', 'own-1'], updatedAt: 'stamp' };

    const markup = renderToStaticMarkup(<WatchListScreen />);

    expect(markup.indexOf('OWN ROSTER')).toBeLessThan(markup.indexOf('FREE AGENTS'));
    expect(markup.indexOf('FREE AGENTS')).toBeLessThan(markup.indexOf('PROSPECTS'));
    expect(markup.indexOf('PROSPECTS')).toBeLessThan(markup.indexOf('RETIRED / FORMER'));
  });

  it('remove flow writes the next prefs into component state', () => {
    mockPrefs = { playerIds: ['own-1', 'fa-1'], updatedAt: 'stamp' };
    const setPrefs = vi.fn();

    removeWatchListRow('own-1', setPrefs);

    expect(setPrefs).toHaveBeenCalledWith({ playerIds: ['fa-1'], updatedAt: 'removed-stamp' });
  });

  it('renders missing-player resilience instead of dropping stale ids', () => {
    const rows = buildWatchListRows(mockGame, { playerIds: ['missing-1'], updatedAt: 'stamp' });

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'missing-1',
        name: 'missing-1',
        statusLabel: 'missing player record',
        group: 'former',
      }),
    ]);
  });

  it('falls back to first and last name when a save lacks player.name', () => {
    const nameless = {
      ...ownPlayer,
      id: 'nameless-1',
      firstName: 'Noah',
      lastName: 'Vale',
      name: undefined,
    } as unknown as Player;
    mockGame = {
      ...buildGame(),
      players: { ...buildGame().players, [nameless.id]: nameless },
    } as unknown as GameState;

    const rows = buildWatchListRows(mockGame, { playerIds: ['nameless-1'], updatedAt: 'stamp' });

    expect(rows[0]?.name).toBe('Noah Vale');
  });
});
