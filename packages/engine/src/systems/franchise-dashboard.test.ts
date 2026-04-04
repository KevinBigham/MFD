import { describe, expect, it } from 'vitest';
import { buildFranchiseDashboard, detectFranchiseEras } from './franchise-dashboard';
import { getFranchiseLegends } from './franchise-legends';
import { makeLeagueState } from './test-helpers';

function buildDashboardGame() {
  const game = makeLeagueState('regular_season', 8);
  const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
  userTeam.franchiseIdentity = {
    ...userTeam.franchiseIdentity,
    fanbase: 82,
    prestige: 79,
    attendance: 91,
    stadiumName: 'Nexus Dome',
    stadiumDeal: {
      sponsorName: 'Nexus Dome',
      revenuePerYear: 12,
      yearsTotal: 3,
      yearsRemaining: 1,
      prestigeBonus: 4,
    },
    stadiumLevel: 3,
  };
  game.franchiseHistory = [
    { year: 2029, teamId: userTeam.id, wins: 5, losses: 12, ties: 0, record: '5-12', pointDifferential: -90, playoffFinish: 'missed_playoffs', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 42, prestige: 38, attendance: 58, stadiumName: 'Chicago Stadium' },
    { year: 2030, teamId: userTeam.id, wins: 6, losses: 11, ties: 0, record: '6-11', pointDifferential: -75, playoffFinish: 'missed_playoffs', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 45, prestige: 40, attendance: 60, stadiumName: 'Chicago Stadium' },
    { year: 2031, teamId: userTeam.id, wins: 7, losses: 10, ties: 0, record: '7-10', pointDifferential: -25, playoffFinish: 'missed_playoffs', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 51, prestige: 49, attendance: 66, stadiumName: 'Chicago Stadium' },
    { year: 2032, teamId: userTeam.id, wins: 10, losses: 7, ties: 0, record: '10-7', pointDifferential: 34, playoffFinish: 'wild_card_exit', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 64, prestige: 61, attendance: 76, stadiumName: 'TechNova Field' },
    { year: 2033, teamId: userTeam.id, wins: 13, losses: 4, ties: 0, record: '13-4', pointDifferential: 105, playoffFinish: 'champion', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 78, prestige: 74, attendance: 88, stadiumName: 'Nexus Dome' },
  ];
  game.playerArchive = [
    {
      playerId: 'legend-qb',
      firstName: 'Legend',
      lastName: 'Quarterback',
      name: 'Legend Quarterback',
      positions: ['QB'],
      peakOvr: 95,
      peakYear: 2033,
      firstYear: 2030,
      lastYear: 2034,
      retirementYear: null,
      teamHistory: [{ teamId: userTeam.id, firstYear: 2030, lastYear: 2034 }],
      careerStats: { seasons: 5, gp: 80, snaps: 4200, passYds: 40000 },
    },
  ];
  game.hallOfFame = [];
  game.awardsHistory = [];
  game.records.franchise.passYds = [{
    category: 'franchise',
    stat: 'passYds',
    value: 40000,
    teamId: userTeam.id,
    teamName: `${userTeam.city} ${userTeam.name}`,
    year: 2034,
    playerId: 'legend-qb',
    playerName: 'Legend Quarterback',
  }];
  game.allDecadeTeams = [{
    id: 'team-2030s',
    decade: '2030-2039',
    startYear: 2030,
    endYear: 2039,
    teamId: userTeam.id,
    roster: [],
    headline: 'The Rise',
  }];

  return { game, userTeam };
}

describe('franchise dashboard', () => {
  it('aggregates all-time record, championships, and playoff appearances from franchise history', () => {
    const { game, userTeam } = buildDashboardGame();

    const dashboard = buildFranchiseDashboard(game, userTeam.id);

    expect(dashboard.allTimeRecord).toMatchObject({ wins: 41, losses: 44, ties: 0 });
    expect(dashboard.championships).toBe(1);
    expect(dashboard.playoffAppearances).toBe(2);
  });

  it('detects dark ages, rebuilds, and winning eras from franchise history', () => {
    const { game, userTeam } = buildDashboardGame();

    const eras = detectFranchiseEras(game.franchiseHistory.filter((entry) => entry.teamId === userTeam.id));

    expect(eras.some((era) => era.name.includes('Dark'))).toBe(true);
    expect(eras.some((era) => era.name.includes('Rebuild'))).toBe(true);
    expect(eras.some((era) => era.name.includes('Golden') || era.name.includes('Dynasty'))).toBe(true);
  });

  it('pulls the last five seasons of fanbase and prestige trend data', () => {
    const { game, userTeam } = buildDashboardGame();

    const dashboard = buildFranchiseDashboard(game, userTeam.id);

    expect(dashboard.fanbaseTrend).toEqual([42, 45, 51, 64, 78]);
    expect(dashboard.prestigeTrend).toEqual([38, 40, 49, 61, 74]);
  });

  it('reports expiring stadium deals correctly', () => {
    const { game, userTeam } = buildDashboardGame();

    const dashboard = buildFranchiseDashboard(game, userTeam.id);

    expect(dashboard.stadiumDealStatus).toBe('expiring');
  });

  it('returns top franchise legends in descending legacy order', () => {
    const { game, userTeam } = buildDashboardGame();

    const legends = getFranchiseLegends(game, userTeam.id, 1);
    const dashboard = buildFranchiseDashboard(game, userTeam.id);

    expect(dashboard.topLegends[0]?.playerId).toBe(legends[0]?.playerId);
  });
});
