import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { GameBroadcast } from './GameBroadcast';

const broadcastState = {
  broadcastGameId: 'game-1',
};

let gameStoreState: { broadcastView: any | null; game: any } = {
  broadcastView: {
    gameResult: {
      id: 'game-1',
      week: 9,
      homeTeamId: 'CHI',
      awayTeamId: 'DET',
      awayScore: 24,
      homeScore: 27,
      overtime: false,
    },
    broadcast: {
      broadcastNetwork: 'MFN',
      quarters: [
        [
          {
            narrative: 'The Blaze marched 75 yards in 8 plays.',
            endResult: 'touchdown',
            yardsTotal: 75,
            timeElapsed: 215,
            plays: [
              { commentary: 'Marcus Cole rips a 24-yard strike.', type: 'pass', yardsGained: 24, isBigPlay: true, isClutch: false, excitement: 0.72 },
              { commentary: 'Touchdown Chicago.', type: 'touchdown', yardsGained: 12, isBigPlay: true, isClutch: false, excitement: 0.9 },
            ],
          },
        ],
        [],
        [],
        [],
      ],
      highlights: [
        { commentary: 'Marcus Cole rips a 24-yard strike.', type: 'pass', yardsGained: 24, isBigPlay: true, isClutch: false, excitement: 0.72 },
        { commentary: 'Touchdown Chicago.', type: 'touchdown', yardsGained: 12, isBigPlay: true, isClutch: true, excitement: 0.96 },
      ],
      mvpPlayerIds: ['p1'],
      momentumSwings: [{ quarter: 4, play: 6, description: 'Chicago seized the late lead.' }],
      finalNarrative: 'In a thriller at Soldier Field, Chicago finished the job late.',
    },
    homeTeam: {
      id: 'CHI',
      city: 'Chicago',
      name: 'City of Broad Shoulders Deep-Dish',
      roster: [{ id: 'p1', name: 'Marcus Cole' }],
      staff: { hc: { id: 'hc-chi', name: 'Marcus Reed' }, oc: null, dc: null },
    },
    awayTeam: {
      id: 'DET',
      city: 'Detroit',
      name: 'Motown Music Machine',
      roster: [],
      staff: { hc: { id: 'hc-det', name: 'Nate Fields' }, oc: null, dc: null },
    },
  },
  game: {
    year: 2031,
    week: 9,
    teams: {
      CHI: {
        id: 'CHI',
        city: 'Chicago',
        name: 'City of Broad Shoulders Deep-Dish',
        roster: [{ id: 'p1', name: 'Marcus Cole', pos: 'QB' }],
        staff: { hc: { id: 'hc-chi', name: 'Marcus Reed' }, oc: null, dc: null },
      },
      DET: {
        id: 'DET',
        city: 'Detroit',
        name: 'Motown Music Machine',
        roster: [{ id: 'p2', name: 'Theo Watts', pos: 'WR' }],
        staff: { hc: { id: 'hc-det', name: 'Nate Fields' }, oc: null, dc: null },
      },
    },
    gameDayState: {
      latestPackageId: 'gameday-2031-9-CHI',
      recentPackages: [
        {
          id: 'gameday-2031-9-CHI',
          year: 2031,
          week: 9,
          teamId: 'CHI',
          opponentTeamId: 'DET',
          activeEffectSummaries: ['Halftime hell: flipped the second-half plan to open the throttle.'],
        },
      ],
    },
    relationships: [],
    franchiseHistory: [],
    playerArchive: [],
    players: {},
  },
};

vi.mock('../../app/store/ui-store', () => ({
  useUiStore: (selector: (state: typeof broadcastState) => unknown) => selector(broadcastState),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof gameStoreState) => unknown) => selector(gameStoreState),
  selectBroadcastByGameId: () => (state: typeof gameStoreState) => state.broadcastView,
  selectGameDayPackageByBroadcastGameId: () => (state: typeof gameStoreState) => state.game.gameDayState.recentPackages[0] ?? null,
}));

describe('GameBroadcast', () => {
  it('selects the broadcast view from transient broadcastGameId UI context', () => {
    const content = readFileSync(new URL('./GameBroadcast.tsx', import.meta.url), 'utf-8');

    expect(content).toContain('const broadcastGameId = useUiStore((state) => state.broadcastGameId);');
    expect(content).toContain('selectBroadcastByGameId(broadcastGameId)');
    expect(content).toContain('[broadcastGameId]');
  });

  it('renders broadcast data with quarter tabs and play-by-play', () => {
    const markup = renderToStaticMarkup(<GameBroadcast />);

    expect(markup).toContain('GAME BROADCAST');
    expect(markup).toContain('BROADCAST SOURCES');
    expect(markup).toContain('BROADCAST SELECTION');
    expect(markup).toContain('SELECTED GAME');
    expect(markup).toContain('selectBroadcastByGameId');
    expect(markup).toContain('MATCHED PACKAGE');
    expect(markup).toContain('selectGameDayPackageByBroadcastGameId');
    expect(markup).toContain('buildHalftimeDecisionReceipt');
    expect(markup).toContain('buildBroadcastCommentary');
    expect(markup).toContain('Opening the route does not append packages');
    expect(markup).toContain('Q1');
    expect(markup).toContain('Marcus Cole rips a 24-yard strike.');
    expect(markup).toContain('Touchdown Chicago.');
    expect(markup).toContain('MFN');
  });

  it('renders the score banner and closing narrative', () => {
    const markup = renderToStaticMarkup(<GameBroadcast />);

    expect(markup).toContain('27');
    expect(markup).toContain('24');
    expect(markup).toContain('Chicago');
    expect(markup).toContain('In a thriller at Soldier Field');
    expect(markup).toContain('BROADCAST NOTES');
    expect(markup).toContain('PA flavor');
    expect(markup).toContain('HALFTIME RECEIPT');
    expect(markup).toContain('Halftime receipt: flipped the second-half plan to open the throttle.');
    expect(markup).toContain('BROADCAST HOOK');
  });

  it('renders the empty state when no broadcast is available', () => {
    gameStoreState = { broadcastView: null, game: gameStoreState.game };

    const markup = renderToStaticMarkup(<GameBroadcast />);

    expect(markup).toContain('GAME BROADCAST');
    expect(markup).toContain('Advance Week');
    expect(markup).toContain('BROADCAST SOURCES');
    expect(markup).toContain('NO RESULT');
    expect(markup).toContain('NO PACKAGE');
    expect(markup).toContain('SELECTED GAME');
    expect(markup).toContain('Rendering does not simulate or replay the game.');

    gameStoreState = {
      broadcastView: {
        gameResult: {
          id: 'game-1',
          week: 9,
          homeTeamId: 'CHI',
          awayTeamId: 'DET',
          awayScore: 24,
          homeScore: 27,
          overtime: false,
        },
        broadcast: {
          broadcastNetwork: 'MFN',
          quarters: [
            [
              {
                narrative: 'The Blaze marched 75 yards in 8 plays.',
                endResult: 'touchdown',
                yardsTotal: 75,
                timeElapsed: 215,
                plays: [
                  { commentary: 'Marcus Cole rips a 24-yard strike.', type: 'pass', yardsGained: 24, isBigPlay: true, isClutch: false, excitement: 0.72 },
                  { commentary: 'Touchdown Chicago.', type: 'touchdown', yardsGained: 12, isBigPlay: true, isClutch: false, excitement: 0.9 },
                ],
              },
            ],
            [],
            [],
            [],
          ],
          highlights: [
            { commentary: 'Marcus Cole rips a 24-yard strike.', type: 'pass', yardsGained: 24, isBigPlay: true, isClutch: false, excitement: 0.72 },
            { commentary: 'Touchdown Chicago.', type: 'touchdown', yardsGained: 12, isBigPlay: true, isClutch: true, excitement: 0.96 },
          ],
          mvpPlayerIds: ['p1'],
          momentumSwings: [{ quarter: 4, play: 6, description: 'Chicago seized the late lead.' }],
          finalNarrative: 'In a thriller at Soldier Field, Chicago finished the job late.',
        },
        homeTeam: {
          id: 'CHI',
          city: 'Chicago',
          name: 'City of Broad Shoulders Deep-Dish',
          roster: [{ id: 'p1', name: 'Marcus Cole' }],
          staff: { hc: { id: 'hc-chi', name: 'Marcus Reed' }, oc: null, dc: null },
        },
        awayTeam: {
          id: 'DET',
          city: 'Detroit',
          name: 'Motown Music Machine',
          roster: [],
          staff: { hc: { id: 'hc-det', name: 'Nate Fields' }, oc: null, dc: null },
        },
      },
      game: {
        year: 2031,
        week: 9,
        teams: {
          CHI: {
            id: 'CHI',
            city: 'Chicago',
            name: 'City of Broad Shoulders Deep-Dish',
            roster: [{ id: 'p1', name: 'Marcus Cole', pos: 'QB' }],
            staff: { hc: { id: 'hc-chi', name: 'Marcus Reed' }, oc: null, dc: null },
          },
          DET: {
            id: 'DET',
            city: 'Detroit',
            name: 'Motown Music Machine',
            roster: [{ id: 'p2', name: 'Theo Watts', pos: 'WR' }],
            staff: { hc: { id: 'hc-det', name: 'Nate Fields' }, oc: null, dc: null },
          },
        },
        gameDayState: {
          latestPackageId: 'gameday-2031-9-CHI',
          recentPackages: [
            {
              id: 'gameday-2031-9-CHI',
              year: 2031,
              week: 9,
              teamId: 'CHI',
              opponentTeamId: 'DET',
              activeEffectSummaries: ['Halftime hell: flipped the second-half plan to open the throttle.'],
            },
          ],
        },
        relationships: [],
        franchiseHistory: [],
        playerArchive: [],
        players: {},
      },
    };
  });
});
