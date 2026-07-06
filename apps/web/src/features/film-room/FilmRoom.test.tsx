import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilmRoom } from './FilmRoom';

function createMockState(): any {
  return {
    latestFilmRoomReport: {
      id: 'film-1',
      grade: 'B',
      score: 81,
      headline: 'Chicago matched the prep board to the game flow.',
      planSummary: 'attack secondary plus limit explosive produced a B review.',
      alignedCalls: ['Passing focus punished the opponent secondary.'],
      missedCalls: [],
      carryForward: ['Keep the successful plan family available next week.'],
    },
    filmRoomHistory: [
      {
        id: 'film-1',
        grade: 'B',
        week: 12,
        headline: 'Chicago matched the prep board to the game flow.',
        executionNotes: ['Chicago finished with 31 points and 402 total yards.'],
      },
    ],
  };
}

let mockState: any = createMockState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectLatestFilmRoomReport: (state: typeof mockState) => state.latestFilmRoomReport,
  selectFilmRoomHistory: (state: typeof mockState) => state.filmRoomHistory,
}));

describe('FilmRoom', () => {
  beforeEach(() => {
    mockState = createMockState();
  });

  it('renders the latest report and recent tape history', () => {
    const markup = renderToStaticMarkup(<FilmRoom />);

    expect(markup).toContain('FILM ROOM');
    expect(markup).toContain('FILM ROOM SOURCES');
    expect(markup).toContain('selectLatestFilmRoomReport');
    expect(markup).toContain('selectFilmRoomHistory');
    expect(markup).toContain('buildFilmRoomReport');
    expect(markup).toContain('franchise-week.ts appends weeklyPrepHistory');
    expect(markup).toContain('Opening Film Room does not evaluate prep');
    expect(markup).toContain('GRADE B');
    expect(markup).toContain('1 SAVED');
    expect(markup).toContain('Chicago matched the prep board to the game flow.');
    expect(markup).toContain('Keep the successful plan family available next week.');
    expect(markup).toContain('RECENT TAPE');
  });

  it('renders source context in the empty state before film exists', () => {
    mockState.latestFilmRoomReport = null;
    mockState.filmRoomHistory = [];

    const markup = renderToStaticMarkup(<FilmRoom />);

    expect(markup).toContain('STATUS');
    expect(markup).toContain('No postgame coaching report is available yet.');
    expect(markup).toContain('FILM ROOM SOURCES');
    expect(markup).toContain('NO REPORT');
    expect(markup).toContain('AWAITING RESULT');
    expect(markup).toContain('Opening Film Room does not evaluate prep');
  });
});
