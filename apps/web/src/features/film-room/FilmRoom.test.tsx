import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilmRoom } from './FilmRoom';

const mockState = {
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

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectLatestFilmRoomReport: (state: typeof mockState) => state.latestFilmRoomReport,
  selectFilmRoomHistory: (state: typeof mockState) => state.filmRoomHistory,
}));

describe('FilmRoom', () => {
  it('renders the latest report and recent tape history', () => {
    const markup = renderToStaticMarkup(<FilmRoom />);

    expect(markup).toContain('FILM ROOM');
    expect(markup).toContain('Chicago matched the prep board to the game flow.');
    expect(markup).toContain('Keep the successful plan family available next week.');
    expect(markup).toContain('RECENT TAPE');
  });
});
