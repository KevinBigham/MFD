import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildFarewellTourStartReceipt, FarewellTourStartReceiptPanel, PlayerProfile } from './PlayerProfile';

const mockBundle = {
  profile: {
    player: {
      id: 'p-1',
      name: 'Jay Stone',
      pos: 'QB',
      age: 25,
      ovr: 91,
      devTrait: 'superstar',
      teamId: 'user',
      draftPick: 12,
      jerseyNumber: 12,
      bloodline: {
        parentPlayerId: 'legend-qb',
        parentName: 'Marcus Cole',
        parentTeamId: 'user',
        parentPosition: 'QB',
        relationship: 'son',
        legacyTag: 'franchise_royalty',
      },
      endorsements: [{ id: 'deal-1', playerId: 'p-1', brandName: 'Apex Athletics', revenuePerYear: 6, yearsTotal: 3, yearsRemaining: 2, tier: 'global', moraleBonus: 6, requirement: { type: 'min_ovr', value: 90 }, active: true }],
    },
    contractDetails: {
      yearByYear: [{ year: 2027, baseSalary: 18, capHit: 22, deadCap: 8 }],
      totalValue: 72,
      guaranteedRemaining: 38,
    },
    developmentArc: [{ age: 23, ovr: 84 }, { age: 24, ovr: 88 }, { age: 25, ovr: 91 }],
    careerStats: [{ season: 2026, team: 'Chicago Blaze', gamesPlayed: 17, gamesStarted: 17, keyStats: { passYds: 4800, passTD: 36 } }],
    personalityReport: {
      traits: ['captain'],
      agentStyle: 'old school',
      mediaPresence: 'high',
      lockerRoomImpact: 'positive',
    },
    awardsWon: ['2026 MVP'],
    mentorHistory: [{ mentorName: 'Rick Mason', bonus: 2 }],
    injuryHistory: [],
    legacyHistoryPartial: false,
  },
  value: { tradeValue: 94, marketValue: 23, surplus: 9 },
  comparables: [{ id: 'p-2', name: 'Cole Hart', ovr: 89, age: 26, pos: 'QB' }],
  projection: { nextYearOvr: 93, peakOvr: 95, peakAge: 28, retirementAge: 37 },
};

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ playerId: 'p-1' }),
  useNavigate: () => () => Promise.resolve(),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: any) => unknown) => selector({
    bundle: mockBundle,
    team: { id: 'user', city: 'Chicago', name: 'Blaze', isUser: true },
    rivalries: [{ id: 'riv-1', playerAId: 'p-1', playerBId: 'p-3', playerAName: 'Jay Stone', playerBName: 'Duke Hayes', intensity: 64, tier: 'heated', origin: 'Week 3, 2027: Hayes baited Stone into two picks' }],
    transactionLog: [
      { type: 'SIGN_FA', year: 2028, week: 1, playerId: 'p-1', fromTeamId: 'fa', toTeamId: 'user', notes: 'Won open-market bid' },
      { type: 'CUT', year: 2027, week: 10, playerId: 'p-4', fromTeamId: 'user', notes: 'Released to waivers' },
      { type: 'TRADE', year: 2026, week: 7, playerId: 'p-1', fromTeamId: 'away', toTeamId: 'user', notes: 'Deadline splash' },
    ],
    draftRecaps: [{
      year: 2027,
      teamId: 'user',
      classGrade: 'A',
      picks: [{
        playerId: 'p-1',
        teamId: 'user',
        playerName: 'Jay Stone',
        position: 'QB',
        ovr: 91,
        round: 1,
        pick: 12,
        projectedPick: 4,
        valueDelta: -8,
        verdict: 'fair',
      }],
      bestValue: {
        playerId: 'p-1',
        teamId: 'user',
        playerName: 'Jay Stone',
        position: 'QB',
        ovr: 91,
        round: 1,
        pick: 12,
        projectedPick: 4,
        valueDelta: -8,
        verdict: 'fair',
      },
      biggestReach: {
        playerId: 'p-1',
        teamId: 'user',
        playerName: 'Jay Stone',
        position: 'QB',
        ovr: 91,
        round: 1,
        pick: 12,
        projectedPick: 4,
        valueDelta: -8,
        verdict: 'fair',
      },
      steals: [],
      leagueHighlights: [],
    }],
    farewellCandidates: [{ id: 'p-1' }],
    farewellTours: [],
    actions: { startFarewellTour: () => Promise.resolve() },
    game: {
      year: 2028,
      week: 6,
      records: {
        singleGame: {
          passYds: [{ category: 'singleGame', stat: 'passYds', value: 512, teamId: 'user', teamName: 'Chicago Blaze', year: 2027, week: 14, playerId: 'p-1', playerName: 'Jay Stone', note: 'Franchise single-game passing record' }],
        },
        singleSeason: {},
        career: {},
        franchise: {},
      },
      playerArchive: [
        {
          playerId: 'legend-qb',
          firstName: 'Marcus',
          lastName: 'Cole',
          name: 'Marcus Cole',
          positions: ['QB'],
          jerseyNumber: 7,
          peakOvr: 96,
          peakYear: 2012,
          firstYear: 2002,
          lastYear: 2018,
          retirementYear: 2018,
          teamHistory: [{ teamId: 'user', firstYear: 2002, lastYear: 2018 }],
        },
      ],
      teams: {
        user: { id: 'user', city: 'Chicago', name: 'Blaze' },
        away: { id: 'away', city: 'Detroit', name: 'Motors' },
      },
    },
  }),
  selectPlayerProfileBundle: () => (state: any) => state.bundle,
  selectTeamById: () => (state: any) => state.team,
  selectPlayerRivalries: () => (state: any) => state.rivalries,
  selectTransactionLog: (state: any) => state.transactionLog,
  selectDraftRecaps: (state: any) => state.draftRecaps,
  selectFarewellCandidates: (state: any) => state.farewellCandidates,
  selectFarewellTours: (state: any) => state.farewellTours,
}));

vi.mock('../../app/store/ui-store', () => ({
  useUiStore: (selector: (state: { setFocusedPlayerContext: () => void }) => unknown) => selector({
    setFocusedPlayerContext: () => undefined,
  }),
}));

describe('PlayerProfile', () => {
  it('renders the player header and projection details', () => {
    const markup = renderToStaticMarkup(<PlayerProfile />);

    expect(markup).toContain('JAY STONE');
    expect(markup).toContain('Trade Value');
    expect(markup).toContain('2026 MVP');
    expect(markup).toContain('BLOODLINE');
    expect(markup).toContain('Apex Athletics');
    expect(markup).toContain('Retirement Age');
    expect(markup).toContain('Open Endorsements');
    expect(markup).toContain('View Rivalries');
    expect(markup).toContain('CAREER MEMORY');
    expect(markup).toContain('Recorded Seasons');
    expect(markup).toContain('Peak Arc');
    expect(markup).toContain('91 OVR');
    expect(markup).toContain('Story Threads');
    expect(markup).toContain('1 award // 1 rivalry // bloodline');
    expect(markup).toContain('Rivalry Heat');
    expect(markup).toContain('HEATED 64');
    expect(markup).toContain('vs Duke Hayes');
    expect(markup).toContain('SIGNATURE MOMENTS');
    expect(markup).toContain('awardsHistory');
    expect(markup).toContain('Saved awardsHistory winner row.');
    expect(markup).toContain('draftRecaps');
    expect(markup).toContain('Draft Class Memory');
    expect(markup).toContain('FAIR // Class A');
    expect(markup).toContain('2027 R1 P12');
    expect(markup).toContain('Saved draft recap: projected #4, selected #12, -8 value.');
    expect(markup).toContain('records');
    expect(markup).toContain('Single-Game Record');
    expect(markup).toContain('pass Yds 512');
    expect(markup).toContain('Franchise single-game passing record');
    expect(markup).toContain('playerSeasonHistory');
    expect(markup).toContain('Peak Ledger Season');
    expect(markup).toContain('17 GS // passYds: 4800 // passTD: 36');
    expect(markup).toContain('playerRivalries');
    expect(markup).toContain('Rivalry Memory vs Duke Hayes');
    expect(markup).toContain('txLog');
    expect(markup).toContain('Movement Receipt');
    expect(markup).toContain('playerArchive');
    expect(markup).toContain('Lineage Link');
    expect(markup).toContain('Bloodline archive links Jay Stone to QB legacy context.');
    expect(markup).toContain('TRANSACTION MEMORY');
    expect(markup).toContain('2028 W1');
    expect(markup).toContain('Free Agency -&gt; Chicago Blaze // Won open-market bid');
    expect(markup).toContain('Signed');
    expect(markup).toContain('2026 W7');
    expect(markup).toContain('Detroit Motors -&gt; Chicago Blaze // Deadline splash');
    expect(markup).toContain('Trade');
    expect(markup).toContain('PROFILE SOURCES');
    expect(markup).toContain('Active Player');
    expect(markup).toContain('Profile Bundle');
    expect(markup).toContain('Season Ledger');
    expect(markup).toContain('Career rows come from saved season/profile history.');
    expect(markup).toContain('Archive Link');
    expect(markup).toContain('Bloodline archive');
    expect(markup).toContain('Rivalry Feed');
    expect(markup).toContain('selectPlayerRivalries reads saved playerRivalries');
    expect(markup).toContain('Transactions');
    expect(markup).toContain('selectTransactionLog reads saved user-team txLog rows');
    expect(markup).toContain('Draft Recaps');
    expect(markup).toContain('selectDraftRecaps reads saved user-team draftRecaps');
    expect(markup).toContain('matching picks appear as Signature Moments without generating recaps');
    expect(markup).toContain('Farewell Tours');
    expect(markup).toContain('Eligible');
    expect(markup).toContain('only the Start Farewell Tour button calls actions.startFarewellTour');
    expect(markup).toContain('Display-only route: no profile render writes playerSeasonHistory, playerArchive, draftRecaps, txLog, awards, records, endorsements, rivalries, farewell tours, or timeline rows.');
    expect(markup).toContain('Start Farewell Tour');
  });

  it('renders the Lineage panel with parent archive data when a bloodline is present', () => {
    const markup = renderToStaticMarkup(<PlayerProfile />);

    expect(markup).toContain('LINEAGE');
    // Relationship + legacy tag badges surface inside the Lineage panel.
    expect(markup).toContain('SON');
    expect(markup).toContain('FRANCHISE ROYALTY');
    // Parent bio from playerArchive (peak OVR, career window, teams played).
    expect(markup).toContain('Marcus Cole');
    expect(markup).toContain('96'); // parent peakOvr
    expect(markup).toContain('2002-2018'); // career window
    expect(markup).toContain('Open Dynasty Legacy');
  });

  it('builds and renders a route-local farewell tour start receipt', () => {
    const receipt = buildFarewellTourStartReceipt({
      playerId: 'p-1',
      playerName: 'Jay Stone',
      position: 'QB',
      ovr: 91,
      teamName: 'Chicago Blaze',
      year: 2028,
      week: 6,
    });

    expect(receipt).toMatchObject({
      id: 'farewell-tour:p-1',
      title: 'Farewell Tour Started',
      actionLabel: 'Started',
      playerLabel: 'Jay Stone // QB // 91 OVR',
      context: 'Chicago Blaze // 2028 W6',
    });
    expect(receipt.result).toContain('writes game.farewellTours');
    expect(receipt.source).toContain('actions.startFarewellTour -> startFarewellTourEngine -> commitGame');
    expect(receipt.source).toContain('This confirmation appears here only');

    const markup = renderToStaticMarkup(<FarewellTourStartReceiptPanel receipt={receipt} />);
    expect(markup).toContain('FAREWELL TOUR RECEIPT');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Saved tour path');
    expect(markup).toContain('The durable row is game.farewellTours');
    expect(markup).toContain('does not reschedule moments');
    expect(markup).toContain('reroll saved outcomes');
  });
});
