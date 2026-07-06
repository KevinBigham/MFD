import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { buildFranchiseBookMock, teamThemeVarsMock } = vi.hoisted(() => ({
  buildFranchiseBookMock: vi.fn(),
  teamThemeVarsMock: vi.fn(() => ({
    '--mfd-team-primary': '#ee5500',
    '--mfd-team-secondary': '#55ee00',
    '--mfd-team-tertiary': '#0055ee',
  })),
}));

const baseState = () => ({
  game: { year: 2032 },
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze', abbr: 'CHI' },
});

let mockState = baseState();

vi.mock('@mfd/engine', () => ({
  buildFranchiseBook: buildFranchiseBookMock,
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span data-mock="badge">{children}</span>,
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    PixelScreenHeader: ({ title, subtitle, kicker, badges }: any) => (
      <div data-mock="screen-header">
        {title}
        {subtitle}
        {kicker}
        {badges}
      </div>
    ),
    teamThemeVars: teamThemeVarsMock,
  };
});

import { FranchiseBookScreen } from './FranchiseBook';

function makeBook(overrides: Record<string, unknown> = {}) {
  return {
    teamId: 'team-1',
    teamCity: 'Chicago',
    teamName: 'Blaze',
    firstYear: 2028,
    lastYear: 2032,
    generatedAt: '2032',
    totals: {
      championships: 2,
      seasons: 5,
      wins: 58,
      losses: 27,
      ties: 0,
      playoffAppearances: 4,
    },
    eras: [
      {
        id: 'era-1',
        chapterNumber: 1,
        arcType: 'golden',
        title: 'Chapter 1 · The Blaze Ascend',
        subtitle: 'Chicago discovered a title window.',
        startYear: 2028,
        endYear: 2032,
        championships: 2,
        playoffAppearances: 4,
        headCoachName: 'Mara Dean',
        trigger: 'championship_breakthrough',
        milestoneFlags: ['first_title'],
        signaturePlayers: [
          { playerId: 'p-1', name: 'Cole Stone', role: 'franchise_qb', peakOvr: 95, yearsInEra: 5 },
        ],
        definingMoments: [
          { year: 2031, kind: 'championship_win', headline: 'Chicago finished the climb.', sourceEventId: 'evt-1' },
        ],
        record: {
          wins: 58,
          losses: 27,
          ties: 0,
          winPct: 0.682,
          pointDifferential: 112,
          seasons: 5,
        },
      },
    ],
    ...overrides,
  };
}

describe('FranchiseBookScreen', () => {
  beforeEach(() => {
    mockState = baseState();
    buildFranchiseBookMock.mockReset();
  });

  it('renders the no-franchise state when no game is loaded', () => {
    mockState = { game: null, userTeam: null } as unknown as typeof mockState;

    const markup = renderToStaticMarkup(<FranchiseBookScreen />);

    expect(markup).toContain('NO FRANCHISE LOADED');
    expect(markup).toContain('Load or start a dynasty to read your franchise book.');
  });

  it('renders the blank-page state when the book has no chapters yet', () => {
    buildFranchiseBookMock.mockReturnValue(makeBook({ eras: [] }));

    const markup = renderToStaticMarkup(<FranchiseBookScreen />);

    expect(markup).toContain('A BLANK PAGE');
    expect(markup).toContain('Every book begins with a single season.');
  });

  it('renders the franchise header and totals badges when chapters exist', () => {
    buildFranchiseBookMock.mockReturnValue(makeBook());

    const markup = renderToStaticMarkup(<FranchiseBookScreen />);

    expect(markup).toContain('CHICAGO BLAZE');
    expect(markup).toContain('2 TITLES');
    expect(markup).toContain('5 SEASONS');
    expect(markup).toContain('1 CHAPTERS');
  });

  it('renders franchise book source context and separates print controls from writes', () => {
    buildFranchiseBookMock.mockReturnValue(makeBook());

    const markup = renderToStaticMarkup(<FranchiseBookScreen />);

    expect(markup).toContain('Franchise Book Sources');
    expect(markup).toContain('BOOK READ MODEL');
    expect(markup).toContain('PRINT CONTROL ONLY');
    expect(markup).toContain('buildFranchiseBook(game, userTeam.id)');
    expect(markup).toContain('game.franchiseHistory');
    expect(markup).toContain('game.userDynastyEras');
    expect(markup).toContain('game.dynastyTimeline');
    expect(markup).toContain('game.playerArchive');
    expect(markup).toContain('game.playerSeasonHistory');
    expect(markup).toContain('era-templates.json');
    expect(markup).toContain('book-commentary.json');
    expect(markup).toContain('Opening Franchise Book does not write dynasty events');
    expect(markup).toContain('update franchise history');
    expect(markup).toContain('play scheduled games');
  });

  it('renders the table of contents and the first chapter body', () => {
    buildFranchiseBookMock.mockReturnValue(makeBook());

    const markup = renderToStaticMarkup(<FranchiseBookScreen />);

    expect(markup).toContain('TABLE OF CONTENTS');
    expect(markup).toContain('CHAPTER 1');
    expect(markup).toContain('The Blaze Ascend'.toUpperCase());
    expect(markup).toContain('Cole Stone');
    expect(markup).toContain('WIN %');
    expect(markup).toContain('68.2%');
  });

  it('applies team theme vars to the franchise book root container', () => {
    buildFranchiseBookMock.mockReturnValue(makeBook());
    teamThemeVarsMock.mockClear();

    const markup = renderToStaticMarkup(<FranchiseBookScreen />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('team-1');
    expect(markup).toContain('--mfd-team-primary:#ee5500');
  });
});
