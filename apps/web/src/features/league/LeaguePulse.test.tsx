import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LeaguePulse from './LeaguePulse';

// ── Mock state ─────────────────────────────────────────

interface MockRivalry {
  id: string;
  teamA: string;
  teamB: string;
  intensity: number;
  isDivision: boolean;
  history: string[];
  lastMetYear: number | null;
  lastMetWeek: number | null;
}

interface MockRanking {
  rank: number;
  teamId: string;
  teamName: string;
  score: number;
  previousRank: number | null;
  delta: number;
  blurb: string;
  record: string;
}

interface MockState {
  leagueRivalries: MockRivalry[];
  powerRankings: MockRanking[];
  teams: Record<string, { id: string; name: string }>;
}

const mockState: MockState = {
  leagueRivalries: [
    { id: 'HOME::AWAY', teamA: 'HOME', teamB: 'AWAY', intensity: 85, isDivision: true, history: ['Y2026 W5: OT thriller'], lastMetYear: 2026, lastMetWeek: 5 },
    { id: 'A::B', teamA: 'A', teamB: 'B', intensity: 60, isDivision: false, history: [], lastMetYear: 2026, lastMetWeek: 3 },
    { id: 'C::D', teamA: 'C', teamB: 'D', intensity: 15, isDivision: false, history: [], lastMetYear: null, lastMetWeek: null },
  ],
  powerRankings: [
    { rank: 1, teamId: 'HOME', teamName: 'Blaze', score: 0.9, previousRank: 5, delta: 4, blurb: '', record: '6-1' },
    { rank: 10, teamId: 'AWAY', teamName: 'Thunder', score: 0.2, previousRank: 2, delta: -8, blurb: '', record: '2-5' },
    { rank: 3, teamId: 'A', teamName: 'Alpha', score: 0.6, previousRank: 3, delta: 0, blurb: '', record: '4-3' },
  ],
  teams: {
    HOME: { id: 'HOME', name: 'Blaze' },
    AWAY: { id: 'AWAY', name: 'Thunder' },
    A: { id: 'A', name: 'Alpha' },
    B: { id: 'B', name: 'Beta' },
    C: { id: 'C', name: 'Gamma' },
    D: { id: 'D', name: 'Delta' },
  },
};

// ── Mocks ──────────────────────────────────────────────

vi.mock('@mfd/engine', () => ({
  buildLeaguePulse: (
    inputs: { rivalries: MockRivalry[]; teamNames: Record<string, string>; powerRankings?: MockRanking[] },
  ) => {
    const rivalries = inputs.rivalries;
    const names = inputs.teamNames;
    const rankings = inputs.powerRankings ?? [];
    return {
      summary: {
        totalRivalries: rivalries.length,
        bloodFeudCount: rivalries.filter((r) => r.intensity >= 76).length,
        heatedCount: rivalries.filter((r) => r.intensity >= 51 && r.intensity < 76).length,
        buddingCount: rivalries.filter((r) => r.intensity >= 21 && r.intensity < 51).length,
        divisionalCount: rivalries.filter((r) => r.isDivision).length,
        averageIntensity: rivalries.length === 0 ? 0 : rivalries.reduce((s, r) => s + r.intensity, 0) / rivalries.length,
        topIntensity: rivalries.reduce((m, r) => Math.max(m, r.intensity), 0),
      },
      hottestRivalries: rivalries
        .filter((r) => r.intensity >= 25)
        .map((r) => ({
          id: r.id,
          teamA: r.teamA,
          teamB: r.teamB,
          teamAName: names[r.teamA] ?? r.teamA,
          teamBName: names[r.teamB] ?? r.teamB,
          intensity: r.intensity,
          tier: r.intensity >= 76 ? ('blood_feud' as const) : r.intensity >= 51 ? ('heated' as const) : ('budding' as const),
          isDivision: r.isDivision,
          lastMetLabel: r.lastMetYear === null ? '—' : `Y${r.lastMetYear} W${r.lastMetWeek}`,
          historyPreview: r.history[0] ?? '',
        })),
      risers: rankings.filter((r) => r.delta > 0),
      fallers: rankings.filter((r) => r.delta < 0),
    };
  },
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: MockState) => unknown) => selector(mockState),
  selectLeagueRivalries: (state: MockState) => state.leagueRivalries,
  selectPowerRankings: (state: MockState) => state.powerRankings,
  selectTeams: (state: MockState) => state.teams,
}));

// ── Tests ──────────────────────────────────────────────

describe('LeaguePulse', () => {
  it('renders the header with league summary badges', () => {
    const markup = renderToStaticMarkup(<LeaguePulse />);
    expect(markup).toContain('LEAGUE PULSE');
    expect(markup).toContain('Tracking 3 rivalries');
    expect(markup).toContain('BLOOD FEUDS');
    expect(markup).toContain('HEATED');
    expect(markup).toContain('DIVISION');
  });

  it('labels pulse sources without implying render-time writes', () => {
    const markup = renderToStaticMarkup(<LeaguePulse />);

    expect(markup).toContain('PULSE SOURCES');
    expect(markup).toContain('Rivalry source');
    expect(markup).toContain('leagueRivalries');
    expect(markup).toContain('Movement source');
    expect(markup).toContain('game.powerRankings');
    expect(markup).toContain('Aggregator owner');
    expect(markup).toContain('buildLeaguePulse');
    expect(markup).toContain('Heat-spike posts');
    expect(markup).toContain('explicit caller only');
    expect(markup).toContain('Route presentation');
    expect(markup).toContain('local display');
    expect(markup).toContain('Just viewing');
    expect(markup).toContain('display only');
    expect(markup).toContain('Opening League Pulse does not write rivalries, rankings, news, social posts, storyline threads, or history rows.');
  });

  it('renders the summary metric grid (rivalries / avg / top / divisional)', () => {
    const markup = renderToStaticMarkup(<LeaguePulse />);
    expect(markup).toContain('RIVALRIES');
    expect(markup).toContain('AVG HEAT');
    expect(markup).toContain('TOP HEAT');
    expect(markup).toContain('DIVISIONAL');
    // top intensity = 85
    expect(markup).toContain('85');
  });

  it('renders the hottest rivalries list with tier badges and resolved team names', () => {
    const markup = renderToStaticMarkup(<LeaguePulse />);
    expect(markup).toContain('HOTTEST RIVALRIES');
    expect(markup).toContain('hottest-rivalries-list');
    expect(markup).toContain('BLAZE');
    expect(markup).toContain('THUNDER');
    expect(markup).toContain('BLOOD FEUD');
    expect(markup).toContain('Y2026 W5: OT thriller');
  });

  it('filters out quiet rivalries below the highlight threshold', () => {
    const markup = renderToStaticMarkup(<LeaguePulse />);
    // intensity 15 rivalry shouldn't show in hottest list
    expect(markup).not.toContain('rivalry-row-C::D');
    expect(markup).toContain('rivalry-row-HOME::AWAY');
    expect(markup).toContain('rivalry-row-A::B');
  });

  it('renders risers and fallers panels with arrow indicators', () => {
    const markup = renderToStaticMarkup(<LeaguePulse />);
    expect(markup).toContain('RISERS');
    expect(markup).toContain('FALLERS');
    expect(markup).toContain('riser-row-HOME');
    expect(markup).toContain('faller-row-AWAY');
    // Arrow glyphs
    expect(markup).toContain('▲');
    expect(markup).toContain('▼');
  });

  it('renders the empty-state panel when league data is missing', () => {
    mockState.leagueRivalries = [];
    mockState.powerRankings = [];
    const markup = renderToStaticMarkup(<LeaguePulse />);
    expect(markup).toContain('LEAGUE PULSE');
    expect(markup).toContain('NO LEAGUE DATA');
    expect(markup).toContain('Advance a week');
    // Restore
    mockState.leagueRivalries = [
      { id: 'HOME::AWAY', teamA: 'HOME', teamB: 'AWAY', intensity: 85, isDivision: true, history: ['Y2026 W5: OT thriller'], lastMetYear: 2026, lastMetWeek: 5 },
      { id: 'A::B', teamA: 'A', teamB: 'B', intensity: 60, isDivision: false, history: [], lastMetYear: 2026, lastMetWeek: 3 },
      { id: 'C::D', teamA: 'C', teamB: 'D', intensity: 15, isDivision: false, history: [], lastMetYear: null, lastMetWeek: null },
    ];
    mockState.powerRankings = [
      { rank: 1, teamId: 'HOME', teamName: 'Blaze', score: 0.9, previousRank: 5, delta: 4, blurb: '', record: '6-1' },
      { rank: 10, teamId: 'AWAY', teamName: 'Thunder', score: 0.2, previousRank: 2, delta: -8, blurb: '', record: '2-5' },
      { rank: 3, teamId: 'A', teamName: 'Alpha', score: 0.6, previousRank: 3, delta: 0, blurb: '', record: '4-3' },
    ];
  });
});
