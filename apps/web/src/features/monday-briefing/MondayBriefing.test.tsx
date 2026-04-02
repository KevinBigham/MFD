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
  userPowerRanking: {
    rank: 4,
    teamId: 'team-1',
    teamName: 'Chicago Blaze',
    score: 84.5,
    previousRank: 6,
    delta: 2,
    blurb: 'Chicago is climbing behind a quarterback heating up in December.',
    record: '8-4',
  },
  userRecordWatch: [
    {
      id: 'watch-1',
      playerId: 'p1',
      playerName: 'Jay Stone',
      stat: 'passYds',
      label: 'Passing Yards',
      currentValue: 3610,
      projectedValue: 5114,
      recordValue: 4980,
      recordHolder: 'Legend One',
    },
  ],
  userMentoringPairs: [
    {
      mentorId: 'mentor-1',
      mentorName: 'Rick Mason',
      menteeId: 'mentee-1',
      menteeName: 'Jay Stone',
      teamId: 'team-1',
      positionGroup: 'QB',
      year: 2029,
      bonus: 2,
    },
  ],
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
  selectUserPowerRanking: (state: typeof mockState) => state.userPowerRanking,
  selectUserRecordWatch: (state: typeof mockState) => state.userRecordWatch,
  selectUserMentoringPairs: (state: typeof mockState) => state.userMentoringPairs,
}));

describe('MondayBriefing', () => {
  it('renders the broadcast header plus rankings, record watch, and mentoring widgets', () => {
    const markup = renderToStaticMarkup(<MondayBriefing />);

    expect(markup).toContain('MFD NETWORK');
    expect(markup).toContain('--- POWER RANKINGS ---');
    expect(markup).toContain('Chicago is climbing behind a quarterback heating up in December.');
    expect(markup).toContain('--- RECORD WATCH ---');
    expect(markup).toContain('Jay Stone');
    expect(markup).toContain('--- MENTORING REPORT ---');
    expect(markup).toContain('Rick Mason -&gt; Jay Stone');
    expect(markup).toContain('--- NARRATIVE PULSE ---');
    expect(markup).toContain('DIVISION RACE TIGHTENING');
  });
});
