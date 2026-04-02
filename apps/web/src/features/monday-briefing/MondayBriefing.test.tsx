import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MondayBriefing } from './MondayBriefing';

const mockState = {
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    wins: 8,
    losses: 4,
    ties: 0,
    capSpace: 21.4,
    seasonStats: { pointDifferential: 37 },
  },
  roster: [
    {
      id: 'p1',
      firstName: 'Jay',
      lastName: 'Stone',
      name: 'Jay Stone',
      pos: 'QB',
      ovr: 84,
      pot: 91,
      age: 25,
      devTrait: 'superstar',
      injury: null,
    },
    {
      id: 'p2',
      firstName: 'Rick',
      lastName: 'Mason',
      name: 'Rick Mason',
      pos: 'RB',
      ovr: 78,
      pot: 80,
      age: 27,
      devTrait: 'normal',
      injury: { severity: 'out', gamesOut: 2 },
    },
  ],
  week: 13,
  year: 2029,
  schedule: [
    {
      week: 13,
      games: [{ homeTeamId: 'team-1', awayTeamId: 'team-2' }],
    },
  ],
  ownerState: {
    approval: 74,
    label: 'Players First',
  },
  latestSummary: {
    headline: 'Blaze stay hot behind a fourth-quarter avalanche.',
    result: 'win',
  },
  latestGameDayPackage: {
    headline: 'Week 12: Chicago Blaze torch the Austin Armadillos 31-17',
    result: 'win',
    autopsy: { diagnosis: 'Tempo and field position buried the opponent.' },
  },
  activeStoryArcs: [
    {
      id: 'arc-1',
      title: 'Division race tightening',
      summary: 'One more win keeps the inside track to the crown.',
    },
  ],
  teams: {
    'team-2': {
      id: 'team-2',
      city: 'Austin',
      name: 'Armadillos',
    },
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectRoster: (state: typeof mockState) => state.roster,
  selectWeek: (state: typeof mockState) => state.week,
  selectYear: (state: typeof mockState) => state.year,
  selectSchedule: (state: typeof mockState) => state.schedule,
  selectOwnerState: (state: typeof mockState) => state.ownerState,
  selectLatestSummary: (state: typeof mockState) => state.latestSummary,
  selectLatestGameDayPackage: (state: typeof mockState) => state.latestGameDayPackage,
  selectActiveStoryArcs: (state: typeof mockState) => state.activeStoryArcs,
  selectTeams: (state: typeof mockState) => state.teams,
}));

describe('MondayBriefing', () => {
  it('renders the 8-Bit ESPN broadcast header and narrative panel labels', () => {
    const markup = renderToStaticMarkup(<MondayBriefing />);

    expect(markup).toContain('MFD NETWORK');
    expect(markup).toContain('--- NARRATIVE PULSE ---');
    expect(markup).toContain('DIVISION RACE TIGHTENING');
  });
});
