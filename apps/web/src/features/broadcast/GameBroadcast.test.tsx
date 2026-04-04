import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameBroadcast } from './GameBroadcast';

const broadcastState = {
  broadcastGameId: 'game-1',
};

let gameStoreState: { broadcastView: any | null } = {
  broadcastView: {
    gameResult: {
      id: 'game-1',
      week: 9,
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
    homeTeam: { city: 'Chicago', name: 'Blaze', roster: [{ id: 'p1', name: 'Marcus Cole' }] },
    awayTeam: { city: 'Detroit', name: 'Engines', roster: [] },
  },
};

vi.mock('../../app/store/ui-store', () => ({
  useUiStore: (selector: (state: typeof broadcastState) => unknown) => selector(broadcastState),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof gameStoreState) => unknown) => selector(gameStoreState),
  selectBroadcastByGameId: () => (state: typeof gameStoreState) => state.broadcastView,
}));

describe('GameBroadcast', () => {
  it('renders broadcast data with quarter tabs and play-by-play', () => {
    const markup = renderToStaticMarkup(<GameBroadcast />);

    expect(markup).toContain('GAME BROADCAST');
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
  });

  it('renders the empty state when no broadcast is available', () => {
    gameStoreState = { broadcastView: null };

    const markup = renderToStaticMarkup(<GameBroadcast />);

    expect(markup).toContain('NO RECENT BROADCAST');
    expect(markup).toContain('Advance a user game week');

    gameStoreState = {
      broadcastView: {
        gameResult: {
          id: 'game-1',
          week: 9,
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
        homeTeam: { city: 'Chicago', name: 'Blaze', roster: [{ id: 'p1', name: 'Marcus Cole' }] },
        awayTeam: { city: 'Detroit', name: 'Engines', roster: [] },
      },
    };
  });
});
