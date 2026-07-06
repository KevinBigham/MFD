import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InboxTriage } from './InboxTriage';

const baseState = () => ({
  game: null as null | {
    ownerPersonalityInbox?: Array<{
      archetypeId: 'win_now' | 'patient_builder' | 'profit_first' | 'fan_favorite' | 'legacy_builder';
      label: string;
      desc: string;
      moodDelta: number;
      moraleDelta: number;
    }>;
  },
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    owner: { approval: 55 },
    capSpace: 24,
    draftPicks: [],
    fatigueState: {},
    facilityState: {
      facilities: [],
      budget: 0,
      maxFacilities: 5,
      upgradeCosts: {},
    },
  },
  roster: [],
  week: 8,
  narrative: null,
  latestSummary: null,
  phase: 'regular_season',
  latestPackage: null,
  activeArcs: [],
  offFieldEvents: [],
  offseasonState: null,
  recentPressConferences: [],
  upcomingRivalry: null,
  coachingNews: [],
  coachingMarket: {
    teamId: null,
    updatedYear: 2026,
    updatedWeek: 8,
    hotSeat: false,
    candidates: { HC: [], OC: [], DC: [] },
  },
  handshakes: [],
  conditionalPicks: [],
  waiverWire: [],
  weather: 'rain',
  leagueNews: [],
  activeProposals: [],
  trainingAssignments: {},
  difficultyState: null,
  medicalStaff: { available: [] },
  playoffMomentum: null,
  ceremonies: [],
  newlyUnlockedAchievements: [],
  seasonReports: [],
  teamSchedule: [
    {
      week: 8,
      opponentName: 'Detroit Motors',
      primetime: false,
      flexed: false,
      broadcastNetwork: null,
      bye: false,
    },
  ],
  currentWeeklyPrepPlan: null,
  draftRecaps: [],
  latestFilmRoomReport: null,
  claimResults: [],
  transactionLog: [],
  tradeSuggestions: [],
  faTargetBoard: { watchlist: [], targets: [], topAvailable: [], bestFits: [], bargains: [] },
  teamNeedsReport: {
    overall: 'Stable roster',
    positionGrades: [],
    criticalNeeds: [],
    strengths: [],
    draftTargets: [],
    faTargets: [],
    capFlexibility: 'moderate',
  },
  warRoomState: null,
  contractExtensions: [],
  apologyTourThreads: [],
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
  selectRoster: (state: typeof mockState) => state.roster,
  selectWeek: (state: typeof mockState) => state.week,
  selectNarrative: (state: typeof mockState) => state.narrative,
  selectLatestSummary: (state: typeof mockState) => state.latestSummary,
  selectPhase: (state: typeof mockState) => state.phase,
  selectLatestGameDayPackage: (state: typeof mockState) => state.latestPackage,
  selectActiveStoryArcs: (state: typeof mockState) => state.activeArcs,
  selectOffFieldEvents: (state: typeof mockState) => state.offFieldEvents,
  selectRecentPressConferences: (state: typeof mockState) => state.recentPressConferences,
  selectUpcomingRivalry: (state: typeof mockState) => state.upcomingRivalry,
  selectCoachingCarouselNews: (state: typeof mockState) => state.coachingNews,
  selectCoachingMarket: (state: typeof mockState) => state.coachingMarket,
  selectConditionalPicks: (state: typeof mockState) => state.conditionalPicks,
  selectHandshakes: (state: typeof mockState) => state.handshakes,
  selectWaiverWire: (state: typeof mockState) => state.waiverWire,
  selectWeather: (state: typeof mockState) => state.weather,
  selectLeagueNews: (state: typeof mockState) => state.leagueNews,
  selectActiveProposals: (state: typeof mockState) => state.activeProposals,
  selectTrainingAssignments: (state: typeof mockState) => state.trainingAssignments,
  selectDifficultyState: (state: typeof mockState) => state.difficultyState,
  selectMedicalStaff: (state: typeof mockState) => state.medicalStaff,
  selectPlayoffMomentum: (state: typeof mockState) => state.playoffMomentum,
  selectCeremonies: (state: typeof mockState) => state.ceremonies,
  selectNewlyUnlocked: (state: typeof mockState) => state.newlyUnlockedAchievements,
  selectSeasonReports: (state: typeof mockState) => state.seasonReports,
  selectTeamSchedule: (state: typeof mockState) => state.teamSchedule,
  selectCurrentWeeklyPrepPlan: (state: typeof mockState) => state.currentWeeklyPrepPlan,
  selectDraftRecaps: (state: typeof mockState) => state.draftRecaps,
  selectLatestFilmRoomReport: (state: typeof mockState) => state.latestFilmRoomReport,
  selectClaimResults: (state: typeof mockState) => state.claimResults,
  selectTransactionLog: (state: typeof mockState) => state.transactionLog,
  selectTradeSuggestions: (state: typeof mockState) => state.tradeSuggestions,
  selectFATargetBoard: (state: typeof mockState) => state.faTargetBoard,
  selectUserTeamNeeds: (state: typeof mockState) => state.teamNeedsReport,
  selectWarRoomState: (state: typeof mockState) => state.warRoomState,
  selectContractExtensions: (state: typeof mockState) => state.contractExtensions,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectApologyTourThreads: (state: typeof mockState) => state.apologyTourThreads,
}));

describe('InboxTriage', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders source copy for generated messages and local display boundaries', () => {
    const markup = renderToStaticMarkup(<InboxTriage />);
    expect(markup).toContain('INBOX SOURCES');
    expect(markup).toContain('buildInboxMessages projects selector inputs');
    expect(markup).toContain('Shell badge boundary');
    expect(markup).toContain('no /inbox badge');
    expect(markup).toContain('computeNavBadges badges trades, depth chart, game plan, and handshakes only');
    expect(markup).toContain('route-local header/filter counts, not a top-nav or mobile-tab badge');
    expect(markup).toContain('selectedMsg, filter, and apology-tour replay modal state live in React only');
    expect(markup).toContain('explicit message.link or Film Room, Prep Desk, and Ownership sender fallbacks');
    expect(markup).toContain('Owner mailbox');
    expect(markup).toContain('0 saved notes');
    expect(markup).toContain('Saved ownerPersonalityInbox events join the generated queue as Ownership messages');
    expect(markup).toContain('Durable read receipts remain outside this route until GameState exposes a saved receipt field');
    expect(markup).toContain('Opening Inbox does not click Advance Week');
  });

  it('renders saved owner personality inbox events as message rows', () => {
    mockState.game = {
      ownerPersonalityInbox: [
        {
          archetypeId: 'profit_first',
          label: 'Owner cuts budget',
          desc: 'Owner tightens team budget, reducing scouting resources.',
          moodDelta: -3,
          moraleDelta: -4,
        },
      ],
    } as typeof mockState.game;

    const markup = renderToStaticMarkup(<InboxTriage />);

    expect(markup).toContain('1 saved notes');
    expect(markup).toContain('OWNER CUTS BUDGET');
    expect(markup).toContain('Ownership');
    expect(markup).toContain('Action Required');
  });
});
