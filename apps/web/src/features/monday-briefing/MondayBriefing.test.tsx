import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MondayBriefing } from './MondayBriefing';

const MONDAY_BRIEFING_SOURCE = readFileSync(new URL('./MondayBriefing.tsx', import.meta.url), 'utf8');
const STALE_BRIEFING_HELPER_COPY =
  /\b(?:Competitive window phase and franchise trajectory|League positioning and movement|No achievement momentum yet|Current playoff momentum sits at|Legacy index and title posture|Narrative Pulse|STORY ARC|storyline|POSTGAME CINEMA)\b/i;

const userRoster = [
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
    teamId: 'team-1',
    injury: null,
    isStarter: true,
  },
];

const userTeam = {
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
  roster: userRoster,
  medicalStaff: {
    id: 'med-elite',
    name: 'Dr. Wynn',
    tier: 'elite',
    salary: 2.8,
    recoveryBonus: 0.8,
    preventionBonus: 0.8,
  },
  facilityState: {
    budget: 7,
    maxFacilities: 5,
    facilities: [
      {
        type: 'training_complex',
        level: 2,
        effect: { trainingXPBonus: 1.1, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1, moraleBonus: 1.02, fatigueGainBonus: 1 },
      },
      {
        type: 'medical_center',
        level: 3,
        effect: { trainingXPBonus: 1, recoveryBonus: 1.15, injuryPreventionBonus: 0.97, scoutingBonus: 1, moraleBonus: 1, fatigueGainBonus: 1 },
      },
    ],
    upgradeCosts: {
      training_complex: [4, 8, 12],
      medical_center: [4, 8, 12],
      film_room: [3, 6, 9],
      weight_room: [3, 6, 9],
      recovery_suite: [5, 10, 15],
    },
  },
};

const mockState: any = {
  seed: 9001,
  phase: 'regular_season',
  userTeam,
  roster: userRoster,
  players: {
    p1: userRoster[0],
  },
  playerArchive: [],
  week: 13,
  year: 2029,
  ownerState: { approval: 74 },
  latestSummary: {
    headline: 'Blaze stay hot behind a fourth-quarter avalanche.',
    result: 'win',
  },
  weekSummaries: [
    {
      id: 'summary-2029-12',
      year: 2029,
      week: 12,
      phase: 'regular_season',
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      opponentName: 'Austin Armadillos',
      result: 'win',
      teamScore: 31,
      opponentScore: 17,
      record: '8-4',
      headline: 'Blaze stay hot behind a fourth-quarter avalanche',
      ownerDelta: 2,
      injuries: [],
      mvpPlayerId: 'p1',
      notes: ['Jay Stone hit two deep shots after halftime.'],
    },
  ],
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
    'team-1': userTeam,
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
  activeMentors: [
    {
      playerId: 'mentor-qb',
      name: 'Ari Legacy',
      position: 'QB',
      peakOvr: 96,
      mentorRating: 4,
      specialty: 'technique',
      hiredYear: 2028,
      salary: 0.5,
    },
  ],
  mentorBudget: 1.5,
  trainingCampResults: [
    {
      teamId: 'team-1',
      standouts: [
        {
          playerId: 'p1',
          playerName: 'Jay Stone',
          pos: 'QB',
          ovrBefore: 83,
          ovrAfter: 84,
          reason: 'camp_standout',
        },
      ],
      injuries: [],
      battles: [],
      headlines: ['Jay Stone carried command into camp.'],
    },
  ],
  leagueNews: [
    {
      id: 'news-1',
      year: 2029,
      week: 13,
      type: 'trade',
      headline: 'League trade talks are heating up',
      body: 'A contender is pushing chips into the middle of the table.',
      teamIds: ['team-1'],
      playerIds: ['p1'],
      importance: 'breaking',
    },
  ],
  gameDayState: {
    latestPackageId: 'pkg-history-1',
    recentPackages: [
      {
        id: 'pkg-history-1',
        year: 2026,
        week: 13,
        phase: 'regular_season',
        teamId: 'team-1',
        opponentTeamId: 'team-2',
        headline: 'Chicago won a classic',
        result: 'win',
        finalScore: '38-35',
        stakes: [],
        turningPoints: [],
        topPerformers: [],
        injuryNotes: [],
        ceremony: null,
        pressConference: { prompt: '', options: [], selected: null },
        rivalry: null,
        activeEffectSummaries: [],
        autopsy: { diagnosis: '', leverage: '', nextFocus: [] },
        recordsMoments: [],
        milestoneMoments: [],
        namedGame: {
          name: 'The Comeback',
          archetype: 'comeback',
          gameId: 'game-history-1',
          year: 2026,
          week: 13,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          winnerTeamId: 'team-1',
          homeScore: 38,
          awayScore: 35,
          reason: 'Won after trailing by 14+ entering the fourth quarter.',
        },
      },
    ],
  },
  draftRecaps: [
    {
      year: 2026,
      teamId: 'team-1',
      classGrade: 'A',
      picks: [
        {
          playerId: 'p1',
          teamId: 'team-1',
          playerName: 'Jay Stone',
          position: 'QB',
          ovr: 82,
          round: 1,
          pick: 12,
          projectedPick: 18,
          valueDelta: 6,
          verdict: 'steal',
        },
      ],
      bestValue: {
        playerId: 'p1',
        teamId: 'team-1',
        playerName: 'Jay Stone',
        position: 'QB',
        ovr: 82,
        round: 1,
        pick: 12,
        projectedPick: 18,
        valueDelta: 6,
        verdict: 'steal',
      },
      biggestReach: {
        playerId: 'p1',
        teamId: 'team-1',
        playerName: 'Jay Stone',
        position: 'QB',
        ovr: 82,
        round: 1,
        pick: 12,
        projectedPick: 18,
        valueDelta: 6,
        verdict: 'steal',
      },
      steals: [],
      leagueHighlights: [],
    },
  ],
  hallOfFame: [],
  records: {
    singleGame: {},
    singleSeason: {
      passYds: [
        {
          category: 'singleSeason',
          stat: 'passYds',
          value: 5100,
          teamId: 'team-1',
          teamName: 'Chicago Blaze',
          year: 2025,
          week: 13,
          playerId: 'p1',
          playerName: 'Jay Stone',
          note: 'A saved passing mark still leads the board.',
        },
      ],
    },
    career: {},
    franchise: {},
  },
  franchiseHistory: [
    {
      year: 2026,
      teamId: 'team-1',
      wins: 11,
      losses: 6,
      ties: 0,
      record: '11-6',
      pointDifferential: 70,
      playoffFinish: 'division-loss',
      majorEvents: ['Won a December classic'],
      awardsWon: [],
      recordsBroken: [],
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
  fatigueReport: [],
  facilities: userTeam.facilityState,
  playoffMomentum: null,
  narrativeIntensity: { current: 76, status: 'hot' },
  dynastyScore: 19,
  handshakes: [],
  ownerMandates: [],
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
  tradeOffers: [],
  livingPlayerStories: [{
    playerId: 'p1',
    playerName: 'Jay Stone',
    teamId: 'team-1',
    stage: 'breakout',
    status: 'active',
    headline: 'Jay Stone has entered the MVP chase',
    summary: 'The apprentice is now a league-wide name.',
    heat: 78,
    mentor: { playerId: 'mentor-qb', name: 'Ari Legacy', positionGroup: 'QB', year: 2028, bonus: 3 },
    activeThreadId: 'storyline-1',
    nextBeatHint: 'Next beat: closing argument.',
    chapters: [{
      id: 'chapter-1',
      source: 'mentorship',
      year: 2028,
      week: null,
      label: 'The apprenticeship',
      summary: 'Ari Legacy took Jay Stone under his wing.',
      sourceRef: 'mentoringPair:team-1:2028:mentor-qb:p1',
    }],
    sourceRefs: ['mentoringPair:team-1:2028:mentor-qb:p1'],
  }],
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

mockState.game = mockState;

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
  selectOwnerMandates: (state: typeof mockState) => state.ownerMandates,
  selectWaiverWirePlayers: (state: typeof mockState) => state.waiverWirePlayers,
  selectWeather: (state: typeof mockState) => state.weather,
  selectConditionalPicks: (state: typeof mockState) => state.conditionalPicks,
  selectAchievements: (state: typeof mockState) => state.achievements,
  selectDashboardState: (state: typeof mockState) => state.dashboardState,
  selectTeamSchedule: (state: typeof mockState) => state.teamSchedule,
  selectStatLeaders: (state: typeof mockState) => state.statLeaders,
  selectTradeOffers: (state: typeof mockState) => state.tradeOffers,
  selectUserLivingPlayerStories: (state: typeof mockState) => state.livingPlayerStories,
}));

describe('MondayBriefing', () => {
  it('keeps dashboard helper copy concrete instead of abstract shorthand', () => {
    expect(MONDAY_BRIEFING_SOURCE).not.toMatch(STALE_BRIEFING_HELPER_COPY);
    expect(MONDAY_BRIEFING_SOURCE).toContain('Core age, contract timing, and whether to add veterans or save cap.');
    expect(MONDAY_BRIEFING_SOURCE).toContain('Closest unlocks and what action moves each one.');
    expect(MONDAY_BRIEFING_SOURCE).toContain('Upcoming opponent, broadcast, weather, and matchup calls.');
    expect(MONDAY_BRIEFING_SOURCE).toContain("Open awards/history after this week's lineup, cap, and matchup choices.");
    expect(MONDAY_BRIEFING_SOURCE).toContain('Another win improves seeding.');
    expect(MONDAY_BRIEFING_SOURCE).toContain('Season Signals');
    expect(MONDAY_BRIEFING_SOURCE).toContain('SAVED ARC');
    expect(MONDAY_BRIEFING_SOURCE).toContain('Next saved arc appears after a result, injury, rivalry, owner demand, or record event.');
    expect(MONDAY_BRIEFING_SOURCE).toContain('LATEST RECAP');
    expect(MONDAY_BRIEFING_SOURCE).not.toMatch(/matchup context|after weekly risks|Playoff profile/i);
    expect(MONDAY_BRIEFING_SOURCE).not.toMatch(/Playoff track|keep winning to improve seeding/i);
  });

  it('renders the widget-driven dashboard with layout controls and spotlight widgets', () => {
    const markup = renderToStaticMarkup(<MondayBriefing />);

    expect(markup).toContain('MONDAY BRIEFING');
    expect(markup).toContain('BRIEFING SOURCES');
    expect(markup).toContain('Monday Briefing reads the saved team, roster, phase, week');
    expect(markup).toContain('Saved dashboard layout controls which cards are pinned');
    expect(markup).toContain('Action Center reads phase, prep, starters');
    expect(markup).toContain('Must Do items stop or redirect Advance Week');
    expect(markup).toContain('THIS WEEK IN DYNASTY HISTORY');
    expect(markup).toContain('The Comeback');
    expect(markup).toContain('3 seasons ago: you drafted Jay Stone');
    expect(markup).toContain('Open Named Games');
    expect(markup).toContain('Open Player');
    expect(markup).toContain('From your saved game-day package and named game, Week 13 2026.');
    expect(markup).toContain('From your saved draft recap and current player table.');
    expect(markup).not.toContain('True blockers stop Advance Week');
    expect(markup).toContain('Customize, draft names, card columns');
    expect(markup).toContain('Opening Monday Briefing for 2029 does not click Advance Week');
    expect(markup).toContain('play scheduled games');
    expect(markup).toContain('reroll saved outcomes');
    expect(markup).not.toMatch(/GameState|Store selectors|engine selectors|Render boundary|commit paths/i);
    expect(markup).not.toMatch(/\bsim\/RNG\b|simulate games|touch RNG/i);
    expect(markup).toContain('TEAM OPS CARRYOVER');
    expect(markup).toContain('buildTeamOpsImpactReceipt');
    expect(markup).toContain('Training XP');
    expect(markup).toContain('Recovery Window');
    expect(markup).toContain('Camp Receipt');
    expect(markup).toContain('Reads saved team.facilityState, team.medicalStaff, game.activeMentors');
    expect(markup).toContain('Settings, Training Camp, and Alumni Mentors are the places that save those changes');
    expect(markup).toContain('Command Center');
    expect(markup).toContain('Customize');
    expect(markup).toContain('TEAM RECORD');
    expect(markup).toContain('NEXT GAME');
    expect(markup).toContain('MFN');
    expect(markup).toContain('Flexed');
    expect(markup).toContain('POWER RANKINGS');
    expect(markup).toContain('Chicago is climbing behind a quarterback heating up in December.');
    expect(markup).toContain('LEAGUE HEADLINES');
    expect(markup).toContain('League trade talks are heating up');
    expect(markup).toContain('LOCKED');
    expect(markup).toContain('Chicago matched the prep board to the game flow.');
    expect(markup).toContain('STABLE');
    expect(markup).toContain('RECORD WATCH');
    expect(markup).toContain('Jay Stone');
    expect(markup).toContain('PLAYOFF PICTURE');
    expect(markup).toContain('#1 Chicago Blaze');
    expect(markup).toContain('COACHING NEWS');
    expect(markup).toContain('Austin hires Mason Pike to run the sideline.');
    expect(markup).toContain('Narrative hot');
    expect(markup).toContain('Dynasty 19');
    expect(markup).toContain("CHIP&#x27;S LIVING PLAYER STORY");
    expect(markup).toContain('Mentor: Ari Legacy');
    expect(markup).toContain('Chip: Open Jay Stone');
    expect(markup).toContain('Open Timeline');
  });

  it('hides dynasty history when no saved callback receipts exist', () => {
    const previous = {
      leagueNews: mockState.leagueNews,
      gameDayState: mockState.gameDayState,
      draftRecaps: mockState.draftRecaps,
      hallOfFame: mockState.hallOfFame,
      records: mockState.records,
      franchiseHistory: mockState.franchiseHistory,
    };

    try {
      mockState.leagueNews = [];
      mockState.gameDayState = { latestPackageId: null, recentPackages: [] };
      mockState.draftRecaps = [];
      mockState.hallOfFame = [];
      mockState.records = { singleGame: {}, singleSeason: {}, career: {}, franchise: {} };
      mockState.franchiseHistory = [];

      const markup = renderToStaticMarkup(<MondayBriefing />);

      expect(markup).not.toContain('THIS WEEK IN DYNASTY HISTORY');
      expect(markup).not.toContain('Open Named Games');
    } finally {
      Object.assign(mockState, previous);
    }
  });
});
