import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NearMissEntry, SeasonRecap } from '@mfd/engine';

const { teamThemeVarsMock } = vi.hoisted(() => ({
  teamThemeVarsMock: vi.fn(() => ({
    '--mfd-team-primary': '#bb3300',
    '--mfd-team-secondary': '#33bb00',
    '--mfd-team-tertiary': '#0033bb',
  })),
}));

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

const mockNearMissReceipts: NearMissEntry[] = [
  {
    type: 'declined_trade',
    playerName: 'Avery Bolt',
    playerOvr: 86,
    description: 'You declined a trade for Avery Bolt (86 OVR) in Week 8.',
    outcome: 'Avery Bolt had a breakout season with Phoenix, posting an 86 OVR.',
  },
  {
    type: 'passed_pick',
    playerName: 'Nico Redd',
    playerOvr: 80,
    description: 'You passed on Nico Redd in Round 2, Pick 44.',
    outcome: 'Nico Redd was drafted by Dallas and finished the season at 80 OVR.',
  },
  {
    type: 'missed_fa',
    playerName: 'Cole Hart',
    playerOvr: 82,
    description: 'You missed out on Cole Hart (CB) in free agency.',
    outcome: 'Cole Hart signed with Austin Club and posted 82 OVR after the market closed.',
  },
];

const mockStore = {
  game: {
    year: 2027,
    seasonNearMissReceipts: mockNearMissReceipts,
  },
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
  teamThemeVars: teamThemeVarsMock,
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

  it('applies the shared team theme vars to the recap card root shell', () => {
    teamThemeVarsMock.mockClear();

    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('afce1');
    expect(markup).toContain('--mfd-team-primary:#bb3300');
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

  it('renders saved near-miss receipts with source and no-write context', () => {
    const markup = renderToStaticMarkup(<SeasonRecapCard recap={mockRecap} nearMissReceipts={mockNearMissReceipts} />);

    expect(markup).toContain('WHAT-IF RECEIPTS');
    expect(markup).toContain('saved game.seasonNearMissReceipts');
    expect(markup).toContain('declined direct trade proposals');
    expect(markup).toContain('passed-pick draft flow');
    expect(markup).toContain('user free-agent bids that lose to a signed CPU offer');
    expect(markup).toContain('does not generate receipts or change the near-miss tracker');
    expect(markup).toContain('Declined Trade');
    expect(markup).toContain('Avery Bolt');
    expect(markup).toContain('Avery Bolt had a breakout season with Phoenix');
    expect(markup).toContain('Passed Pick');
    expect(markup).toContain('Nico Redd');
    expect(markup).toContain('Missed FA');
    expect(markup).toContain('Cole Hart signed with Austin Club');
  });

  it('renders the season recap route surface with export controls', () => {
    const markup = renderToStaticMarkup(<SeasonRecapScreen />);

    expect(markup).toContain('Season Recap');
    expect(markup).toContain('Export PNG');
    expect(markup).toContain('Copy Text');
  });

  it('renders route-level recap source context and separates share controls from save writes', () => {
    const markup = renderToStaticMarkup(<SeasonRecapScreen />);

    expect(markup).toContain('SEASON RECAP SOURCES');
    expect(markup).toContain('RECAP READ MODEL');
    expect(markup).toContain('SHARE CONTROLS ONLY');
    expect(markup).toContain('buildSeasonRecap(game, team.id)');
    expect(markup).toContain('SeasonRecapCard');
    expect(markup).toContain('game.seasonNearMissReceipts');
    expect(markup).toContain('exportRecapAsPng');
    expect(markup).toContain('copyRecapAsText');
    expect(markup).toContain('do not update the franchise save');
    expect(markup).toContain('Opening Season Recap does not archive the season');
    expect(markup).toContain('play scheduled games');
  });

  it('passes saved near-miss receipts from the route game state into the recap card', () => {
    const markup = renderToStaticMarkup(<SeasonRecapScreen />);

    expect(markup).toContain('WHAT-IF RECEIPTS');
    expect(markup).toContain('Avery Bolt');
    expect(markup).toContain('Nico Redd');
  });
});
