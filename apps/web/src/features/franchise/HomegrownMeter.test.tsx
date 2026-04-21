import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, Player, PlayerArchiveEntry, Team } from '@mfd/engine';

vi.mock('@mfd/design-system/components', () => ({
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    PixelMetricCard: ({ label, value }: any) => (
      <div data-mock="metric-card">
        <span>{label}</span>
        <span>{String(value)}</span>
      </div>
    ),
    autoGrid: () => ({}),
    display: {},
    monoSm: {},
  };
});

import { HomegrownMeter } from './HomegrownMeter';

function makePlayer(id: string, age: number, teamId = 'team-1'): Player {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    name: `${id} Player`,
    pos: 'QB',
    age,
    ovr: 80,
    pot: 85,
    ratings: {},
    devTrait: 'normal',
    personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [],
    archetype: null,
    contract: null,
    teamId,
    draftYear: 2026,
    draftRound: 1,
    draftPick: 1,
    college: 'State',
    yearsExp: 1,
    careerStats: { seasons: 1, gp: 0, snaps: 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 60,
    chemistry: 60,
    systemFit: 60,
    cliqueId: null,
    jerseyNumber: 10,
    endorsements: [],
    isStarter: false,
    role: null,
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: {
      gamesPlayed: 0,
      passYds: 0,
      passTD: 0,
      passINT: 0,
      passAtt: 0,
      passComp: 0,
      rushYds: 0,
      rushAtt: 0,
      rushTD: 0,
      fumbles: 0,
      rec: 0,
      recYds: 0,
      recTD: 0,
      targets: 0,
      sacks: 0,
      defINT: 0,
      tackles: 0,
      fgMade: 0,
      fgAtt: 0,
      yacYds: 0,
    },
  };
}

function makeArchiveEntry(playerId: string, teamId: string): PlayerArchiveEntry {
  return {
    playerId,
    firstName: playerId,
    lastName: 'Player',
    name: `${playerId} Player`,
    positions: ['QB'],
    jerseyNumber: 10,
    peakOvr: 80,
    peakYear: 2026,
    firstYear: 2026,
    lastYear: 2026,
    retirementYear: null,
    teamHistory: [{ teamId, firstYear: 2026, lastYear: 2026 }],
    careerStats: { seasons: 1, gp: 0, snaps: 0 },
  };
}

function makeTeam(id: string, roster: Player[], isUser = false): Team {
  return {
    id,
    city: 'City',
    name: 'Club',
    abbr: id.toUpperCase(),
    icon: 'icon',
    conference: 'AFC',
    division: 'East',
    roster,
    capSpace: 0,
    capUsed: 0,
    deadCap: 0,
    deadCapByYear: {},
    wins: 0,
    losses: 0,
    ties: 0,
    streak: 0,
    divisionWins: 0,
    divisionLosses: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    headToHead: {},
    pointsFor: 0,
    pointsAgainst: 0,
    seasonStats: {
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      totalYards: 0,
      rushYards: 0,
      passYards: 0,
      sacks: 0,
      turnovers: 0,
      takeaways: 0,
      thirdDownPct: 0,
      redZonePct: 0,
    },
    teamStats: [],
    staff: { hc: null, oc: null, dc: null },
    owner: null,
    clinic: { xp: {}, perks: [] },
    lockerRoom: {
      cliques: [],
      captains: [],
      culture: 'stable',
      cultureScore: 50,
      tensions: [],
      lastMeetingWeek: null,
    },
    doctrineIds: [],
    franchiseIdentity: null,
    stadiumSponsorsSeen: [],
    specialTeams: { kickerId: null, punterId: null, returnerIds: [] },
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    doctrineProgress: {},
    draftPicks: [],
    retiredNumbers: [],
    practiceSquad: [],
    injuryReport: [],
    trainingAssignments: [],
    mentoringPairs: [],
    history: [],
    relocationStatus: null,
    teamNeeds: null,
    depthChart: {},
    scheme: { offense: 'balanced', defense: 'base-43' },
    gmStrategy: 'neutral',
    philosophy: 'maintain',
    medicalStaff: { level: 1, injuryReduction: 0, recoveryBoost: 0 },
    fatigue: { players: {}, weeklyRecovery: 0, injuryRiskModifier: 0 },
    facilities: { level: 1, regenBonus: 0, devBonus: 0 },
    isUser,
  } as unknown as Team;
}

function makeGame(): GameState {
  const roster = [
    makePlayer('homegrown-rookie', 22),
    makePlayer('homegrown-mid', 26),
    makePlayer('vet-transfer', 31),
    makePlayer('mid-transfer', 27),
    makePlayer('rookie-transfer', 21),
  ];

  return {
    teams: {
      'team-1': makeTeam('team-1', roster, true),
    },
    playerArchive: [
      makeArchiveEntry('homegrown-rookie', 'team-1'),
      makeArchiveEntry('homegrown-mid', 'team-1'),
      makeArchiveEntry('vet-transfer', 'team-2'),
      makeArchiveEntry('mid-transfer', 'team-2'),
      makeArchiveEntry('rookie-transfer', 'team-2'),
    ],
  } as unknown as GameState;
}

describe('HomegrownMeter', () => {
  it('renders the empty-state panel when identity is null', () => {
    const markup = renderToStaticMarkup(<HomegrownMeter game={null} />);

    expect(markup).toContain('Franchise Identity');
    expect(markup).toContain('Franchise identity unavailable - no active dynasty.');
  });

  it('renders the HOMEGROWN headline with the calculated percent', () => {
    const markup = renderToStaticMarkup(<HomegrownMeter game={makeGame()} />);

    expect(markup).toContain('40%');
    expect(markup).toContain('HOMEGROWN');
  });

  it('renders five metric cards for the roster breakdown', () => {
    const markup = renderToStaticMarkup(<HomegrownMeter game={makeGame()} />);

    expect(markup.match(/data-mock="metric-card"/g)?.length ?? 0).toBe(5);
    expect(markup).toContain('Total Players');
    expect(markup).toContain('Homegrown');
    expect(markup).toContain('Rookies');
    expect(markup).toContain('Mid-Career');
    expect(markup).toContain('Veterans');
  });

  it('renders the bar width from the computed homegrown percent', () => {
    const markup = renderToStaticMarkup(<HomegrownMeter game={makeGame()} />);

    expect(markup).toContain('width:40%');
  });

  it('renders the correct homegrown count from the passed game fixture', () => {
    const markup = renderToStaticMarkup(<HomegrownMeter game={makeGame()} />);

    expect(markup).toContain('2');
  });
});
