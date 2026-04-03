import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MondayBriefing } from './MondayBriefing';

const mockState = {
  phase: 'regular_season',
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    conference: 'AFC',
    wins: 8,
    losses: 4,
    ties: 0,
    capSpace: 21.4,
    capUsed: 197.2,
    deadCap: 6.1,
    seasonStats: { pointDifferential: 37 },
    staff: { hc: { ratings: { development: 80 } } },
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
  ],
  week: 13,
  year: 2029,
  ownerState: { approval: 74 },
  latestSummary: {
    headline: 'Blaze stay hot behind a fourth-quarter avalanche.',
    result: 'win',
  },
  latestGameDayPackage: {
    headline: 'Week 12: Chicago Blaze torch the Austin Armadillos 31-17',
    result: 'win',
    autopsy: { diagnosis: 'Tempo and field position buried the opponent.' },
  },
  latestFilmRoomReport: {
    id: 'film-1',
    grade: 'B',
    headline: 'Chicago matched the prep board to the game flow.',
  },
  activeStoryArcs: [
    { id: 'arc-1', title: 'Division race tightening', summary: 'One more win keeps the inside track to the crown.' },
  ],
  teams: {
    'team-2': { id: 'team-2', city: 'Austin', name: 'Armadillos', wins: 7, losses: 5, ties: 0 },
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
  upcomingRivalry: {
    rivalryId: 'team-1::team-2',
    intensity: 68,
    tier: 'heated',
    ovrBoost: 3,
    headline: 'Chicago and Austin are carrying real heat into kickoff.',
  },
  coachingCarouselNews: [
    { id: 'coach-1', type: 'coach_hired', description: 'Austin hires Mason Pike to run the sideline.' },
  ],
  coachingMarket: {
    hotSeat: false,
  },
  currentWeeklyPrepPlan: {
    offensiveFocus: 'attack_secondary',
    defensiveFocus: 'limit_explosive',
  },
  leagueNews: [
    { id: 'news-1', headline: 'League trade talks are heating up', body: 'A contender is pushing chips into the middle of the table.', importance: 'breaking' },
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
  fatigueReport: [],
  facilities: {
    budget: 7,
    facilities: [{ type: 'training_complex', level: 2 }],
  },
  playoffMomentum: null,
  narrativeIntensity: { current: 76, status: 'hot' },
  dynastyScore: 19,
  handshakes: [],
  waiverWirePlayers: [],
  weather: 'clear',
  conditionalPicks: [],
  achievements: [
    {
      id: 'dynasty:first_championship',
      title: 'First Championship',
      description: 'Win your first title.',
      category: 'dynasty',
      tier: 'bronze',
      condition: { type: 'championships', threshold: 1 },
      unlockedYear: 2028,
      unlockedWeek: 18,
      icon: 'trophy',
    },
  ],
  dashboardState: {
    activeLayoutId: 'layout:default',
    pinnedWidgets: [],
    layouts: [
      {
        id: 'layout:default',
        name: 'Command Center',
        columns: 3,
        widgets: [
          'team_record',
          'next_game',
          'power_ranking',
          'league_headlines',
          'training_report',
          'record_watch',
          'playoff_picture',
          'coaching_news',
        ],
      },
    ],
  },
  teamSchedule: [
    {
      week: 13,
      opponentTeamId: 'team-2',
      opponentName: 'Austin Armadillos',
      home: true,
      result: null,
      recordAfterGame: null,
      bye: false,
      primetime: true,
      flexed: true,
      broadcastNetwork: 'MFN',
    },
  ],
  statLeaders: {
    passYds: [{ name: 'Jay Stone', value: 3810 }],
    rushYds: [{ name: 'Rick Mason', value: 1264 }],
    recYds: [],
    sacks: [{ name: 'Ace Bolt', value: 12 }],
    defINT: [],
  },
  actions: {
    pinWidget: () => Promise.resolve(),
    unpinWidget: () => Promise.resolve(),
    saveLayout: () => Promise.resolve(),
    switchLayout: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPhase: (state: typeof mockState) => state.phase,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectRoster: (state: typeof mockState) => state.roster,
  selectWeek: (state: typeof mockState) => state.week,
  selectYear: (state: typeof mockState) => state.year,
  selectOwnerState: (state: typeof mockState) => state.ownerState,
  selectLatestSummary: (state: typeof mockState) => state.latestSummary,
  selectLatestGameDayPackage: (state: typeof mockState) => state.latestGameDayPackage,
  selectLatestFilmRoomReport: (state: typeof mockState) => state.latestFilmRoomReport,
  selectActiveStoryArcs: (state: typeof mockState) => state.activeStoryArcs,
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserPowerRanking: (state: typeof mockState) => state.userPowerRanking,
  selectUserRecordWatch: (state: typeof mockState) => state.userRecordWatch,
  selectUpcomingRivalry: (state: typeof mockState) => state.upcomingRivalry,
  selectCoachingCarouselNews: (state: typeof mockState) => state.coachingCarouselNews,
  selectCoachingMarket: (state: typeof mockState) => state.coachingMarket,
  selectCurrentWeeklyPrepPlan: (state: typeof mockState) => state.currentWeeklyPrepPlan,
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
  selectAchievements: (state: typeof mockState) => state.achievements,
  selectDashboardState: (state: typeof mockState) => state.dashboardState,
  selectTeamSchedule: (state: typeof mockState) => state.teamSchedule,
  selectStatLeaders: (state: typeof mockState) => state.statLeaders,
}));

describe('MondayBriefing', () => {
  it('renders the widget-driven dashboard with layout controls and spotlight widgets', () => {
    const markup = renderToStaticMarkup(<MondayBriefing />);

    expect(markup).toContain('MONDAY BRIEFING');
    expect(markup).toContain('Command Center');
    expect(markup).toContain('Customize');
    expect(markup).toContain('--- TEAM RECORD ---');
    expect(markup).toContain('--- NEXT GAME ---');
    expect(markup).toContain('MFN');
    expect(markup).toContain('Flexed');
    expect(markup).toContain('--- POWER RANKINGS ---');
    expect(markup).toContain('Chicago is climbing behind a quarterback heating up in December.');
    expect(markup).toContain('--- LEAGUE HEADLINES ---');
    expect(markup).toContain('League trade talks are heating up');
    expect(markup).toContain('LOCKED');
    expect(markup).toContain('Chicago matched the prep board to the game flow.');
    expect(markup).toContain('STABLE');
    expect(markup).toContain('--- RECORD WATCH ---');
    expect(markup).toContain('Jay Stone');
    expect(markup).toContain('--- PLAYOFF PICTURE ---');
    expect(markup).toContain('#1 Chicago Blaze');
    expect(markup).toContain('--- COACHING NEWS ---');
    expect(markup).toContain('Austin hires Mason Pike to run the sideline.');
    expect(markup).toContain('Narrative hot');
    expect(markup).toContain('Dynasty 19');
  });
});
