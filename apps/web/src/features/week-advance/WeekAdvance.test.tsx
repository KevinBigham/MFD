import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DraftRecap } from '@mfd/engine';
import { WeekAdvance, buildOffseasonCommandSnapshot, buildRookieClassFollowUp } from './WeekAdvance';

type MockOffseasonCalendar = {
  visible: boolean;
  headline: string;
  summary: string;
  activeStepId: string | null;
  blocked: boolean;
  steps: Array<{
    id: string;
    label: string;
    status: 'complete' | 'active' | 'upcoming' | 'blocked';
    detail: string;
    route: string;
    ctaLabel: string;
  }>;
};

type MockOffseasonState = {
  round?: number;
  expiringPlayerIds?: string[];
  reSignDecisions?: Record<string, { status: string }>;
  freeAgencyBids?: Record<string, Array<{ round: number; status: string }>>;
} | null;

const hiddenOffseasonCalendar: MockOffseasonCalendar = {
  visible: false,
  headline: '',
  summary: '',
  activeStepId: null,
  blocked: false,
  steps: [],
};

const mockDraftRecaps: DraftRecap[] = [{
  year: 2031,
  teamId: 'team-1',
  classGrade: 'A',
  picks: [
    { playerId: 'rookie-1', playerName: 'Jay Reed', teamId: 'team-1', position: 'WR', ovr: 82, round: 1, pick: 18, projectedPick: 10, valueDelta: 8, verdict: 'fair' },
    { playerId: 'rookie-2', playerName: 'Drew Moss', teamId: 'team-1', position: 'LB', ovr: 84, round: 4, pick: 120, projectedPick: 40, valueDelta: 80, verdict: 'steal' },
  ],
  bestValue: { playerId: 'rookie-2', playerName: 'Drew Moss', teamId: 'team-1', position: 'LB', ovr: 84, round: 4, pick: 120, projectedPick: 40, valueDelta: 80, verdict: 'steal' },
  biggestReach: { playerId: 'rookie-1', playerName: 'Jay Reed', teamId: 'team-1', position: 'WR', ovr: 82, round: 1, pick: 18, projectedPick: 10, valueDelta: 8, verdict: 'fair' },
  steals: [{ playerId: 'rookie-2', playerName: 'Drew Moss', teamId: 'team-1', position: 'LB', ovr: 84, round: 4, pick: 120, projectedPick: 40, valueDelta: 80, verdict: 'steal' }],
  leagueHighlights: [],
}];

const mockState = {
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    capSpace: 18,
    schemeOff: 'spread',
    schemeDef: 'cover_3',
  },
  roster: [
    { id: 'qb-1', name: 'Cade Cannon', pos: 'QB', ovr: 92, isStarter: true, injury: null, contract: { years: 1 } },
    { id: 'rb-1', name: 'Milo Stone', pos: 'RB', ovr: 83, isStarter: true, injury: null, contract: { years: 3 } },
  ],
  week: 11,
  year: 2031,
  schedule: [
    {
      week: 11,
      games: [{ homeTeamId: 'team-1', awayTeamId: 'team-2', result: null }],
    },
  ],
  latestSummary: null,
  latestGameDayPackage: {
    id: 'gameday-2031-10-team-1',
    year: 2031,
    week: 10,
    phase: 'regular_season',
    teamId: 'team-1',
    opponentTeamId: 'team-2',
    headline: 'Week 10: Chicago Blaze beat Austin Armadillos 28-17',
    result: 'win',
    finalScore: '28-17',
    stakes: [{ label: 'Division pace', detail: 'The win protects a one-game lead.' }],
    turningPoints: [
      {
        label: 'Turnover edge',
        detail: 'Finished +2 in turnover margin and stole the middle eight.',
        impact: 'positive',
      },
    ],
    topPerformers: [],
    injuryNotes: ['RB1: ankle (questionable, 1 games)'],
    ceremony: null,
    pressConference: {
      theme: 'Statement win',
      opener: 'We stayed ahead of the sticks.',
      quotes: [],
      speaker: 'Head Coach',
      tone: 'confident',
      topic: 'postgame win',
      reporterQuestions: [],
    },
    rivalry: {
      rivalryId: 'team-1::team-2',
      intensity: 72,
      tier: 'heated',
      ovrBoost: 3,
      headline: 'These teams brought real heat into kickoff.',
    },
    activeEffectSummaries: ['Captain speech kept the room aligned.'],
    autopsy: {
      diagnosis: 'Controlled passing rhythm kept the offense ahead of schedule.',
      leverage: 'Turnover margin and situational stops decided which drives ended in points.',
      nextFocus: ['Protect the injured backfield', 'Keep the pass rush disruptive'],
    },
    weather: 'clear',
    specialTeamsHighlights: ['Keenan Ward ripped off a 74-yard kick return that flipped the field.'],
    recordsMoments: [],
    milestoneMoments: [],
    prepGrade: 'B',
    coachingNotes: ['Protection emphasis landed.'],
    carryForwardRecommendations: ['Keep the successful pass concept family active next week.'],
  },
  offseasonState: null as MockOffseasonState,
  draftRecaps: mockDraftRecaps,
  offseasonCalendar: hiddenOffseasonCalendar,
  phase: 'regular_season',
  teams: {
    'team-2': { id: 'team-2', city: 'Austin', name: 'Armadillos', wins: 7, losses: 3, schemeOff: 'power', schemeDef: 'base' },
  },
  currentGamePlan: null as { offensiveScheme: string; defensiveScheme: string } | null,
  actions: {
    advanceWeek: () => Promise.resolve(null),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCurrentGamePlan: (state: typeof mockState) => state.currentGamePlan,
  selectDraftRecaps: (state: typeof mockState) => state.draftRecaps,
  selectLatestGameDayPackage: (state: typeof mockState) => state.latestGameDayPackage,
  selectLatestSummary: (state: typeof mockState) => state.latestSummary,
  selectOffseasonCalendar: (state: typeof mockState) => state.offseasonCalendar,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectPhase: (state: typeof mockState) => state.phase,
  selectRoster: (state: typeof mockState) => state.roster,
  selectSchedule: (state: typeof mockState) => state.schedule,
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserTeam: (state: typeof mockState) => state.team,
  selectWeek: (state: typeof mockState) => state.week,
  selectYear: (state: typeof mockState) => state.year,
}));

describe('WeekAdvance', () => {
  beforeEach(() => {
    mockState.phase = 'regular_season';
    mockState.week = 11;
    mockState.year = 2031;
    mockState.offseasonState = null;
    mockState.offseasonCalendar = hiddenOffseasonCalendar;
    mockState.currentGamePlan = null;
  });

  it('shows the soft game-plan gate when no plan is set for a played week', () => {
    const markup = renderToStaticMarkup(<WeekAdvance />);

    expect(markup).toContain('GAME PLAN');
    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Game Plan before Advance Week');
    expect(markup).toContain("Weekly prep is required here. Open Game Plan, save this week&#x27;s plan, then return to Advance Week.");
    expect(markup).toContain('Plan Needed');
    expect(markup).toContain('Prepare Game Plan');
    expect(markup).toContain('DECISION IMPACT');
    expect(markup).toContain('Now');
    expect(markup).toContain('Must Do: fix 2 listed Advance Week items');
    expect(markup).toContain('next game uses the saved injury status, first backups, cap choices, and matchup calls');
    expect(markup).not.toMatch(/listed Advance Week issues?|unresolved issues/i);
    expect(markup).toContain('If ignored');
    expect(markup).toContain('Advance Check');
    expect(markup).toContain('Game Plan still needs a saved weekly plan');
    expect(markup).not.toMatch(/readiness issues?|clean commit|current board|review item\\(s\\) before Advance Week|Game plan before the sim/i);
    expect(markup).toContain('ADVANCE WEEK USES');
    expect(markup).toContain('Lineup and matchup');
    expect(markup).toContain('Advance Week uses your saved roster, starters, schedule, current week, and Game Plan.');
    expect(markup).toContain('Only this button advances the league.');
    expect(markup).not.toMatch(/ADVANCE SOURCES|Readiness selectors|selectUserTeam|selectRoster|selectPhase|selectWeek|selectYear|selectSchedule|selectCurrentGamePlan|actions\\.advanceWeek|runAdvanceWeek|advanceFranchiseWeek/i);
    expect(markup).toContain('the button opens Game Plan instead of advancing');
  });

  it('names listed Advance Week items without generic issue or problem copy', () => {
    mockState.currentGamePlan = {
      offensiveScheme: 'spread',
      defensiveScheme: 'cover_3',
    };

    const markup = renderToStaticMarkup(<WeekAdvance />);

    expect(markup).toContain('REGULAR SEASON // 1 ITEM(S) // 2031');
    expect(markup).toContain('Resolve or accept the listed items');
    expect(markup).toContain('1 listed item remains.');
    expect(markup).toContain('Fix the injury flag, first-backup choice, cap move, or matchup call');
    expect(markup).toContain('advance knowing those saved choices become the next result');
    expect(markup).toContain('1 listed item before Advance Week');
    expect(markup).not.toMatch(/listed issue|listed issues|Resolve or accept the listed issues|injury, backup, cap, or matchup problem|No blocking roster issues/i);
  });

  it('renders the post-week command deck from the latest game-day package', () => {
    const markup = renderToStaticMarkup(<WeekAdvance />);

    expect(markup).toContain('POST-WEEK COMMAND DECK');
    expect(markup).toContain('WHY IT HAPPENED');
    expect(markup).toContain('WHAT CHANGED');
    expect(markup).toContain('WHAT NOW');
    expect(markup).toContain('Controlled passing rhythm kept the offense ahead of schedule.');
    expect(markup).toContain('Turnover margin and situational stops decided which drives ended in points.');
    expect(markup).not.toMatch(/leverage battle|leverage points/i);
    expect(markup).toContain('Division pace: The win protects a one-game lead.');
    expect(markup).toContain('These teams brought real heat into kickoff.');
    expect(markup).toContain('Keenan Ward ripped off a 74-yard kick return that flipped the field.');
    expect(markup).toContain('Protect the injured backfield');
    expect(markup).toContain('Statement win: We stayed ahead of the sticks.');
    expect(markup).toContain('Protection emphasis landed.');
    expect(markup).toContain('Prep graded B');
    expect(markup).toContain('Last game notes');
    expect(markup).toContain('this screen shows injury, morale, and matchup notes that send you to Roster, Depth Chart, or Game Plan when a fix is still open');
    expect(markup).not.toContain('notes that may need a roster');
    expect(markup).not.toMatch(/Post-week receipt|selectLatestSummary|selectLatestGameDayPackage|buildPostWeekMoment|rendering does not build packages/i);
  });

  it('renders rookie class follow-up from saved draft recaps during the opening window', () => {
    mockState.week = 1;

    const markup = renderToStaticMarkup(<WeekAdvance />);

    expect(markup).toContain('ROOKIE CLASS FOLLOW-UP');
    expect(markup).toContain('2031 draft');
    expect(markup).toContain('Class A');
    expect(markup).toContain('selectDraftRecaps');
    expect(markup).toContain('Top pick');
    expect(markup).toContain('Best value');
    expect(markup).toContain('Jay Reed');
    expect(markup).toContain('Drew Moss');
    expect(markup).toContain('Open Jay Reed rookie profile');
    expect(markup).toContain('Open Drew Moss rookie profile');
    expect(markup).toContain('Open Development');
    expect(markup).toContain('Open Training Camp');
    expect(markup).toContain('Review Draft Recap');
    expect(markup).toContain('Source: saved user-team draftRecaps.');
    expect(markup).toContain('does not generate recaps, change rookie ratings, assign training');
    expect(markup).toContain('start the next week, autosave, or reroll outcomes');
  });

  it('does not surface the rookie class follow-up outside the opening window', () => {
    const followUp = buildRookieClassFollowUp({
      draftRecaps: mockState.draftRecaps,
      phase: 'regular_season',
      year: 2031,
      week: 11,
    });

    expect(followUp).toBeNull();
  });

  it('renders the offseason calendar from the read model without advancing state', () => {
    mockState.phase = 'free_agency';
    mockState.offseasonState = {
      round: 2,
      expiringPlayerIds: ['qb-1'],
      reSignDecisions: {
        'qb-1': { status: 'countered' },
      },
      freeAgencyBids: {
        'fa-1': [{ round: 2, status: 'pending' }],
      },
    };
    mockState.offseasonCalendar = {
      visible: true,
      headline: 'Free Agency Rounds',
      summary: 'Free Agency Rounds is the current window; advancement still runs through the existing phase action.',
      activeStepId: 'free_agency',
      blocked: false,
      steps: [
        {
          id: 're_sign',
          label: 'Re-sign Window',
          status: 'complete',
          detail: '3 accepted, 0 unresolved from 3 expiring player(s).',
          route: '/contracts',
          ctaLabel: 'Manage Contracts',
        },
        {
          id: 'free_agency',
          label: 'Free Agency Rounds',
          status: 'active',
          detail: 'Round 2 of 3.',
          route: '/free-agency',
          ctaLabel: 'Open Market',
        },
      ],
    };

    const markup = renderToStaticMarkup(<WeekAdvance />);

    expect(markup).toContain('OFFSEASON CALENDAR');
    expect(markup).toContain('FREE AGENCY ROUNDS');
    expect(markup).toContain('Round 2 of 3.');
    expect(markup).toContain('Open Market');
    expect(markup).toContain('Manage Contracts');
    expect(markup).toContain('League calendar');
    expect(markup).toContain('If the offseason, CBA, or expansion calendar has a required step');
    expect(markup).toContain('its button sends you there before the league moves');
    expect(markup).toContain('OFFSEASON COMMAND SNAPSHOT');
    expect(markup).toContain('selectOffseasonCalendar');
    expect(markup).toContain('Saved offseasonState');
    expect(markup).toContain('Saved roster/cap');
    expect(markup).toContain('Calendar Owner');
    expect(markup).toContain('Expiring Core');
    expect(markup).toContain('1 player(s)');
    expect(markup).toContain('Top expiring: Cade Cannon (QB). 1 unresolved re-sign decision(s).');
    expect(markup).toContain('Cap Room');
    expect(markup).toContain('Saved team.capSpace with');
    expect(markup).toContain('Market Load');
    expect(markup).toContain('1 pending bid(s)');
    expect(markup).toContain('Round 2 reads saved offseasonState.freeAgencyBids');
    expect(markup).toContain('Source: saved offseason calendar, offseasonState, user-team roster contracts, and team cap fields.');
    expect(markup).toContain('does not');
    expect(markup).toContain('advance the offseason, submit bids, resolve rounds, re-sign players, move roster assets, change cap totals, autosave, or resolve market outcomes');
    expect(markup).not.toMatch(/Calendar read model|saved phase\/offseason\/CBA\/expansion state|route to existing owners/i);
  });

  it('builds an offseason command snapshot from saved calendar, roster, cap, and bid state', () => {
    const rows = buildOffseasonCommandSnapshot({
      calendar: {
        visible: true,
        headline: 'Free Agency Rounds',
        summary: 'Free Agency Rounds is the current window; advancement still runs through the existing phase action.',
        activeStepId: 'free_agency',
        blocked: false,
        steps: [
          {
            id: 'free_agency',
            label: 'Free Agency Rounds',
            status: 'active',
            detail: 'Round 2 of 3.',
            route: '/free-agency',
            ctaLabel: 'Open Market',
          },
        ],
      },
      team: { capSpace: 18, capUsed: 226 },
      roster: [
        { id: 'qb-1', name: 'Cade Cannon', pos: 'QB', ovr: 92, contract: { years: 1 } },
        { id: 'wr-1', name: 'Trey Vale', pos: 'WR', ovr: 84, contract: { years: 1 } },
      ],
      offseasonState: {
        round: 2,
        expiringPlayerIds: ['qb-1'],
        reSignDecisions: {
          'qb-1': { status: 'countered' },
        },
        freeAgencyBids: {
          'fa-1': [{ round: 2, status: 'pending' }],
          'fa-2': [{ round: 1, status: 'pending' }],
        },
      },
    });

    expect(rows).toEqual([
      {
        id: 'calendar',
        label: 'Calendar Owner',
        value: 'Free Agency Rounds',
        detail: 'Free Agency Rounds is the current window; advancement still runs through the existing phase action. Next route: /free-agency.',
        route: '/free-agency',
        ctaLabel: 'Open Market',
        accent: 'gold',
      },
      {
        id: 'expiring',
        label: 'Expiring Core',
        value: '1 player(s)',
        detail: 'Top expiring: Cade Cannon (QB). 1 unresolved re-sign decision(s).',
        route: '/contracts',
        ctaLabel: 'Manage Contracts',
        accent: 'gold',
      },
      {
        id: 'cap',
        label: 'Cap Room',
        value: '$18M',
        detail: 'Saved team.capSpace with $226M used. Contracts and Cap Lab own cap changes.',
        route: '/contracts',
        ctaLabel: 'Open Cap',
        accent: 'green',
      },
      {
        id: 'market',
        label: 'Market Load',
        value: '1 pending bid(s)',
        detail: 'Round 2 reads saved offseasonState.freeAgencyBids; Free Agency owns bid submit and round resolution.',
        route: '/free-agency',
        ctaLabel: 'Open Market',
        accent: 'gold',
      },
    ]);
  });
});
