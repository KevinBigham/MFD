import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BroadcastPresentation from './BroadcastPresentation';

// ── Mock state ─────────────────────────────────────────

const mockState: {
  broadcast: {
    gameResult: {
      id: string;
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number;
      awayScore: number;
      week: number;
    };
    broadcast: {
      gameId: string;
      broadcastNetwork: string;
      quarters: unknown[];
      finalNarrative: string;
    };
    homeTeam: { name: string };
    awayTeam: { name: string };
  } | null;
} = {
  broadcast: {
    gameResult: {
      id: 'g1',
      homeTeamId: 'HOME',
      awayTeamId: 'AWAY',
      homeScore: 27,
      awayScore: 24,
      week: 5,
    },
    broadcast: {
      gameId: 'g1',
      broadcastNetwork: 'ESPN8',
      quarters: [],
      finalNarrative: 'A nail-biter goes to the wire.',
    },
    homeTeam: { name: 'Blaze' },
    awayTeam: { name: 'Thunder' },
  },
};

// ── Mocks ──────────────────────────────────────────────

vi.mock('@mfd/engine', () => ({
  buildBroadcastPresentation: (result: { homeScore: number; awayScore: number }, broadcast: { broadcastNetwork: string; finalNarrative: string } | null) => ({
    gameId: 'g1',
    homeTeamId: 'HOME',
    awayTeamId: 'AWAY',
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    broadcastNetwork: broadcast?.broadcastNetwork ?? 'MFN',
    finalNarrative: broadcast?.finalNarrative ?? '',
    totalBeats: 3,
    totalDurationSec: 24,
    beats: [
      {
        index: 0,
        kind: 'opening' as const,
        quarter: 1,
        homeScore: 0,
        awayScore: 0,
        chyron: 'KICKOFF — 0-0',
        commentary: 'Kickoff on ESPN8.',
        play: null,
        intensity: 0,
      },
      {
        index: 1,
        kind: 'turning-point' as const,
        quarter: 3,
        homeScore: 21,
        awayScore: 14,
        chyron: 'Q3 TURNING POINT — 21-14',
        commentary: 'Go-ahead touchdown changes everything.',
        play: {
          type: 'touchdown',
          yardsGained: 45,
          playerIds: [],
          commentary: 'Go-ahead touchdown changes everything.',
          excitement: 9,
          isBigPlay: true,
          isClutch: true,
        },
        intensity: 22,
      },
      {
        index: 2,
        kind: 'final' as const,
        quarter: 4,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        chyron: `FINAL — ${result.homeScore}-${result.awayScore}`,
        commentary: broadcast?.finalNarrative ?? '',
        play: null,
        intensity: 0,
      },
    ],
  }),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectLatestBroadcast: (state: typeof mockState) => state.broadcast,
}));

// ── Tests ──────────────────────────────────────────────

describe('BroadcastPresentation', () => {
  it('renders the cinematic header with away @ home matchup', () => {
    const markup = renderToStaticMarkup(<BroadcastPresentation />);
    expect(markup).toContain('BROADCAST PRESENTATION');
    expect(markup).toContain('THUNDER @ BLAZE');
    expect(markup).toContain('WK5');
    expect(markup).toContain('ESPN8');
  });

  it('renders the summary metric grid (final / beats / runtime / network)', () => {
    const markup = renderToStaticMarkup(<BroadcastPresentation />);
    expect(markup).toContain('FINAL');
    expect(markup).toContain('BEATS');
    expect(markup).toContain('RUNTIME');
    expect(markup).toContain('NETWORK');
    expect(markup).toContain('27-24');
    expect(markup).toContain('24s');
  });

  it('shows the first beat (kickoff) on initial render', () => {
    const markup = renderToStaticMarkup(<BroadcastPresentation />);
    expect(markup).toContain('KICKOFF');
    expect(markup).toContain('KICKOFF — 0-0');
    expect(markup).toContain('BEAT 1 / 3');
  });

  it('renders the timeline with one dot per beat', () => {
    const markup = renderToStaticMarkup(<BroadcastPresentation />);
    expect(markup).toContain('beat-timeline');
    expect(markup).toContain('beat-dot-0');
    expect(markup).toContain('beat-dot-1');
    expect(markup).toContain('beat-dot-2');
  });

  it('renders the final-narrative panel with the broadcast blurb', () => {
    const markup = renderToStaticMarkup(<BroadcastPresentation />);
    expect(markup).toContain('FINAL NARRATIVE');
    expect(markup).toContain('A nail-biter goes to the wire.');
  });

  it('renders the empty-state panel when broadcast data is missing', () => {
    mockState.broadcast = null;
    const markup = renderToStaticMarkup(<BroadcastPresentation />);
    expect(markup).toContain('BROADCAST PRESENTATION');
    expect(markup).toContain('No broadcast data available.');
    expect(markup).toContain('AWAITING GAME');
    // Restore for subsequent tests
    mockState.broadcast = {
      gameResult: { id: 'g1', homeTeamId: 'HOME', awayTeamId: 'AWAY', homeScore: 27, awayScore: 24, week: 5 },
      broadcast: { gameId: 'g1', broadcastNetwork: 'ESPN8', quarters: [], finalNarrative: 'A nail-biter goes to the wire.' },
      homeTeam: { name: 'Blaze' },
      awayTeam: { name: 'Thunder' },
    };
  });
});
