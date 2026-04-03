import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MondayBriefing } from './MondayBriefing';

const mockState = {
  phase: 'playoffs',
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    conference: 'AFC',
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
      injury: { type: 'hamstring', severity: 'out', severityTier: 'severe', gamesOut: 2, reinjuryRisk: 0.18, onIR: false },
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
  offFieldEvents: [
    {
      id: 'event-1',
      headline: 'Jay Stone owns the media cycle',
      description: 'Stone leaned into the spotlight and the room fed off it.',
      category: 'media',
    },
  ],
  upcomingRivalry: {
    rivalryId: 'team-1::team-2',
    intensity: 68,
    tier: 'heated',
    ovrBoost: 3,
    headline: 'Chicago and Austin are carrying real heat into kickoff.',
  },
  coachingCarouselNews: [
    {
      id: 'coach-1',
      type: 'coach_hired',
      description: 'Austin hires Mason Pike to run the sideline.',
    },
  ],
  leagueNews: [
    {
      id: 'news-1',
      headline: 'League trade talks are heating up',
      body: 'A contender is pushing chips into the middle of the table.',
      importance: 'breaking',
    },
  ],
  trainingAssignments: {
    p1: {
      playerId: 'p1',
      focus: 'film_study',
      weeksAssigned: 4,
      xpGained: 18.5,
      focusXp: {
        film_study: 18.5,
        position_drills: 0,
        conditioning: 0,
        mentorship: 0,
        rest: 0,
      },
    },
  },
  playoffPicture: {
    afc: [
      { seed: 1, teamId: 'team-1', teamName: 'Chicago Blaze', divisionWinner: true, indicator: 'X' },
      { seed: 2, teamId: 'team-2', teamName: 'Austin Armadillos', divisionWinner: true, indicator: '' },
    ],
    nfc: [],
  },
  fatigueReport: [
    { playerId: 'p1', fatigue: 82, status: 'exhausted' },
    { playerId: 'p2', fatigue: 66, status: 'fatigued' },
  ],
  facilities: {
    budget: 7,
    facilities: [
      { type: 'training_complex', level: 2 },
      { type: 'recovery_suite', level: 3 },
    ],
  },
  playoffMomentum: {
    teamId: 'team-1',
    momentum: 88,
    narrativeTag: 'hot_streak',
    winStreak: 6,
  },
  narrativeIntensity: {
    current: 76,
    status: 'hot',
  },
  dynastyScore: 19,
  handshakes: [],
  waiverWirePlayers: [],
  weather: 'clear',
  conditionalPicks: [],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPhase: (state: typeof mockState) => state.phase,
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
  selectOffFieldEvents: (state: typeof mockState) => state.offFieldEvents,
  selectUpcomingRivalry: (state: typeof mockState) => state.upcomingRivalry,
  selectCoachingCarouselNews: (state: typeof mockState) => state.coachingCarouselNews,
  selectLeagueNews: (state: typeof mockState) => state.leagueNews,
  selectTrainingAssignments: (state: typeof mockState) => state.trainingAssignments,
  selectPlayoffPicture: (state: typeof mockState) => state.playoffPicture,
  selectFatigueReport: (state: typeof mockState) => state.fatigueReport,
  selectFacilities: (state: typeof mockState) => state.facilities,
  selectPlayoffMomentum: (state: typeof mockState) => state.playoffMomentum,
  selectNarrativeIntensity: (state: typeof mockState) => state.narrativeIntensity,
  selectDynastyScore: (state: typeof mockState) => state.dynastyScore,
  selectHandshakes: (state: typeof mockState) => state.handshakes,
  selectWaiverWirePlayers: (state: typeof mockState) => state.waiverWirePlayers,
  selectWeather: (state: typeof mockState) => state.weather,
  selectConditionalPicks: (state: typeof mockState) => state.conditionalPicks,
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
    expect(markup).toContain('--- LEAGUE HEADLINES ---');
    expect(markup).toContain('League trade talks are heating up');
    expect(markup).toContain('--- TRAINING REPORT ---');
    expect(markup).toContain('film study');
    expect(markup).toContain('Narrative hot');
    expect(markup).toContain('Dynasty 19');
    expect(markup).toContain('--- PLAYOFF RACE ---');
    expect(markup).toContain('#1 Chicago Blaze');
    expect(markup).toContain('--- FATIGUE WATCH ---');
    expect(markup).toContain('--- FACILITY STATUS ---');
    expect(markup).toContain('--- PLAYOFF MOMENTUM ---');
    expect(markup).toContain('hot streak');
    expect(markup).toContain('--- LOCKER ROOM PULSE ---');
    expect(markup).toContain('Jay Stone owns the media cycle');
    expect(markup).toContain('--- RIVALRY WATCH ---');
    expect(markup).toContain('Chicago and Austin are carrying real heat into kickoff.');
    expect(markup).toContain('--- COACHING NEWS ---');
    expect(markup).toContain('Austin hires Mason Pike to run the sideline.');
    expect(markup).toContain('--- NARRATIVE PULSE ---');
    expect(markup).toContain('DIVISION RACE TIGHTENING');
  });
});
