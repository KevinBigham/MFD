import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerRivalries } from './PlayerRivalries';

const baseState = () => ({
  game: {
    year: 2028,
    teams: {
      CHI: { id: 'CHI', abbr: 'CHI' },
      DET: { id: 'DET', abbr: 'DET' },
    },
    socialFeed: [
      {
        id: 'post-1',
        trigger: 'rivalry',
        content: 'Jenkins told reporters: "Cole can throw it all day. I will be waiting."',
        authorName: 'MFSN Insider',
      },
    ],
  },
  rivalries: [
    {
      id: 'riv-1',
      playerAId: 'p1',
      playerBId: 'p2',
      playerAName: 'Marcus Cole',
      playerBName: 'James Jenkins',
      teamAId: 'CHI',
      teamBId: 'DET',
      intensity: 84,
      tier: 'nemesis' as const,
      origin: 'Week 3, 2028: Jenkins picked off Cole twice',
      history: [
        { year: 2028, week: 3, description: 'Jenkins picked off Cole twice', intensityDelta: 30 },
        { year: 2028, week: 12, description: 'Cole finally answered with a win', intensityDelta: 12 },
      ],
      seasonStarted: 2028,
    },
  ],
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectAllPlayerRivalries: (state: typeof mockState) => state.rivalries,
}));

describe('PlayerRivalries', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the header and active rivalry count', () => {
    const markup = renderToStaticMarkup(<PlayerRivalries />);
    expect(markup).toContain('PLAYER RIVALRIES');
    expect(markup).toContain('1 ACTIVE');
  });

  it('renders the rivalry matchup and origin text', () => {
    const markup = renderToStaticMarkup(<PlayerRivalries />);
    expect(markup).toContain('Marcus Cole');
    expect(markup).toContain('James Jenkins');
    expect(markup).toContain('Week 3, 2028: Jenkins picked off Cole twice');
  });

  it('renders the rivalry history timeline', () => {
    const markup = renderToStaticMarkup(<PlayerRivalries />);
    expect(markup).toContain('Week 3, 2028');
    expect(markup).toContain('Intensity +30');
    expect(markup).toContain('Cole finally answered with a win');
  });

  it('renders rivalry trash talk from the social feed', () => {
    const markup = renderToStaticMarkup(<PlayerRivalries />);
    expect(markup).toContain('I will be waiting');
    expect(markup).toContain('MFSN Insider');
  });

  it('labels rivalry sources without implying render-time writes', () => {
    const markup = renderToStaticMarkup(<PlayerRivalries />);

    expect(markup).toContain('RIVALRY SOURCES');
    expect(markup).toContain('Saved playerRivalries');
    expect(markup).toContain('Week-advance receipts');
    expect(markup).toContain('Social feed projection');
    expect(markup).toContain('Sim bonus source');
    expect(markup).toContain('selectAllPlayerRivalries');
    expect(markup).toContain('two interceptions, three sacks, or one forced fumble can seed a feud');
    expect(markup).toContain('Opening this screen does not create or decay rivalries');
    expect(markup).toContain('mfd.rivalries.v1 sidecar');
  });

  it('renders the empty state when no rivalries exist', () => {
    mockState.rivalries = [];
    const markup = renderToStaticMarkup(<PlayerRivalries />);
    expect(markup).toContain('No personal feuds have ignited yet');
  });
});
