import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SeasonRecap } from '@mfd/engine';

const mockRecap: SeasonRecap = {
  teamId: 'afce1',
  teamName: 'Blaze',
  teamCity: 'Chicago',
  teamAbbr: 'CHI',
  seasonYear: 2026,
  record: '12-5',
  wins: 12,
  losses: 5,
  ties: 0,
  division: 'East',
  conference: 'AFC',
  divisionFinish: 1,
  conferenceFinish: 2,
  playoffResult: 'conf-loss',
  teamAwards: ['MVP'],
  topPerformers: {
    passingLeader: {
      playerId: 'qb-1',
      playerName: 'Cole Stone',
      pos: 'QB',
      value: 4612,
      gamesPlayed: 17,
      perGame: 271.3,
    },
    rushingLeader: {
      playerId: 'rb-1',
      playerName: 'Jay Mercer',
      pos: 'RB',
      value: 1487,
      gamesPlayed: 17,
      perGame: 87.5,
    },
  },
  seasonStory: 'Your contention window widened instead of closing.',
  teamMotto: 'Fear The Burn',
  breakoutCandidates: [
    {
      playerId: 'wr-1',
      playerName: 'Mason Vale',
      pos: 'WR',
      age: 24,
      ovr: 82,
      ovrDelta: 5,
      reason: 'Strong 5-point improvement.',
    },
  ],
};

const mockStore = {
  game: { year: 2027 },
  team: {
    id: 'afce1',
    city: 'Chicago',
    name: 'Blaze',
    abbr: 'CHI',
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
  selectUserTeam: (state: typeof mockStore) => state.team,
}));

vi.mock('@mfd/engine', () => ({
  buildSeasonRecap: vi.fn(() => mockRecap),
  getTeamContent: vi.fn(() => ({
    motto: 'Fear The Burn',
    primaryColor: '#112233',
    secondaryColor: '#445566',
    tertiaryColor: '#778899',
  })),
}));

vi.mock('../shared/pixelUi', () => ({
  PixelScreenHeader: ({ title, subtitle, kicker, badges }: any) => (
    <div data-mock="screen-header" data-title={title} data-subtitle={subtitle} data-kicker={kicker}>
      {title}
      {subtitle}
      {kicker}
      {badges}
    </div>
  ),
  PixelMetricCard: ({ label, value, detail }: any) => (
    <div data-mock="metric-card" data-label={label}>
      {label}
      {value}
      {detail}
    </div>
  ),
  autoGrid: () => ({}),
  display: {},
  monoSm: {},
  pixelSm: {},
  screenStackStyle: {},
}));

vi.mock('../shared/EmptyState', () => ({
  EmptyState: ({ title, reason, nextStep }: any) => (
    <div data-mock="empty-state">
      {title}
      {reason}
      {nextStep}
    </div>
  ),
}));

import { SeasonRecapCard, SeasonRecapScreen } from './SeasonRecapCard';

describe('SeasonRecapCard', () => {
  it('renders record, playoff result, and top performers without crashing', () => {
    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} />);

    expect(markup).toContain('12-5');
    expect(markup).toContain('Conference Final Loss');
    expect(markup).toContain('COLE STONE');
    expect(markup).toContain('JAY MERCER');
  });

  it('uses team colors from getTeamContent via recap css variables', () => {
    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} />);

    expect(markup).toContain('--mfd-recap-primary:#112233');
    expect(markup).toContain('--mfd-recap-secondary:#445566');
    expect(markup).toContain('--mfd-recap-tertiary:#778899');
  });

  it('shows the team motto in the subheader', () => {
    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} />);

    expect(markup).toContain('Fear The Burn');
  });

  it('uses PixelScreenHeader instead of a custom header', () => {
    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} />);

    expect(markup).toContain('data-mock="screen-header"');
  });

  it('uses PixelMetricCard for the summary grid', () => {
    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} />);

    expect(markup.match(/data-mock="metric-card"/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('contains zero emoji characters in rendered text', () => {
    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} />);

    expect(/[\p{Extended_Pictographic}]/u.test(markup)).toBe(false);
  });

  it('renders the season recap route surface with export controls', () => {
    const markup = renderToStaticMarkup(<SeasonRecapScreen />);

    expect(markup).toContain('Season Recap');
    expect(markup).toContain('Export PNG');
    expect(markup).toContain('Copy Text');
  });
});
