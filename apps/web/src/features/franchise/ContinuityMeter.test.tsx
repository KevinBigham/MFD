import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, Player, Team } from '@mfd/engine';
import { deriveDynastyId } from '../../lib/career-meta';
import { upsertDynastyStarters } from '../../lib/roster-continuity-store';

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

import { ContinuityMeter } from './ContinuityMeter';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

function makePlayer(id: string, isStarter: boolean): Player {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    name: `${id} Player`,
    pos: 'QB',
    age: 25,
    ovr: 80,
    pot: 85,
    ratings: {},
    devTrait: 'normal',
    personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [],
    archetype: null,
    contract: null,
    teamId: 'team-1',
    draftYear: 2025,
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
    isStarter,
    role: isStarter ? 'Starter' : 'Backup',
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

function makeTeam(roster: Player[], isUser = true): Team {
  return {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    abbr: 'CHI',
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
    offScheme: 'balanced',
    defScheme: 'base-43',
    schemeOff: 'balanced',
    schemeDef: 'base-43',
    coachingStaff: { hc: null, oc: null, dc: null },
    staff: { hc: null, oc: null, dc: null },
    ownerId: 'owner-1',
    owner: null as never,
    ownerMood: 50,
    fanConfidence: 50,
    ownerPatience80: 50,
    gmStrategy: 'neutral',
    philosophy: undefined,
    draftPicks: [],
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    franchiseTags: [],
    isUser,
    clinic: { xp: {}, perks: [] } as never,
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] } as never,
    txLog: [],
    seasonStats: {
      gamesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnoversLost: 0,
      turnoversForced: 0,
      sacksFor: 0,
      sacksAgainst: 0,
      drives: 0,
      thirdDownConversions: 0,
      thirdDownAttempts: 0,
      timeOfPossession: 0,
      fgMade: 0,
      fgAttempted: 0,
      punts: 0,
      pressuresAllowed: 0,
      yacYards: 0,
      redZoneTrips: 0,
      redZoneScores: 0,
    },
    mentoringPairs: [],
    trainingAssignments: {},
    medicalStaff: null,
    fatigueState: {},
    facilityState: { level: 1, regenBonus: 0, devBonus: 0 } as never,
    practiceSquad: [],
    stadiumType: 'outdoor',
    franchiseIdentity: {} as never,
    lockerRoom: {
      cliques: [],
      captains: [],
      culture: 'stable',
      cultureScore: 50,
      tensions: [],
      lastMeetingWeek: null,
    } as never,
    retiredJerseys: [],
  } as Team;
}

function makeGame(starterIds: string[], isUser = true): GameState {
  return {
    seed: 7,
    year: 2027,
    teams: {
      'team-1': makeTeam([
        ...starterIds.map((id) => makePlayer(id, true)),
        makePlayer('backup-1', false),
      ], isUser),
    },
    franchiseHistory: [
      { teamId: 'team-1', year: 2026 },
    ],
  } as unknown as GameState;
}

describe('ContinuityMeter', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders null when no active game is provided', () => {
    expect(renderToStaticMarkup(<ContinuityMeter game={null} />)).toBe('');
  });

  it('renders null when the active team is not a user franchise', () => {
    expect(renderToStaticMarkup(<ContinuityMeter game={makeGame(['a', 'b'], false)} />)).toBe('');
  });

  it('renders null when there is no prior-season starter snapshot', () => {
    expect(renderToStaticMarkup(<ContinuityMeter game={makeGame(['a', 'b'])} />)).toBe('');
  });

  it('renders a 100 percent retention panel when every starter is retained', () => {
    const game = makeGame(['a', 'b', 'c']);
    upsertDynastyStarters(deriveDynastyId(game), 2026, ['a', 'b', 'c']);

    const markup = renderToStaticMarkup(<ContinuityMeter game={game} />);

    expect(markup).toContain('Continuity');
    expect(markup).toContain('100%');
    expect(markup).toContain('Retained');
    expect(markup).toContain('width:100%');
  });

  it('renders partial retention counts and the four metric cards', () => {
    const game = makeGame(['a', 'b', 'x', 'y', 'z']);
    upsertDynastyStarters(deriveDynastyId(game), 2026, ['a', 'b', 'c', 'd', 'e']);

    const markup = renderToStaticMarkup(<ContinuityMeter game={game} />);

    expect(markup).toContain('40%');
    expect(markup).toContain('New Starters');
    expect(markup).toContain('Departed');
    expect(markup).toContain('Total Starters');
    expect(markup.match(/data-mock="metric-card"/g)?.length ?? 0).toBe(4);
  });

  it('labels continuity as a browser-local starter snapshot instead of cartridge data', () => {
    const game = makeGame(['a', 'b', 'c']);
    upsertDynastyStarters(deriveDynastyId(game), 2026, ['a', 'b', 'c']);

    const markup = renderToStaticMarkup(<ContinuityMeter game={game} />);

    expect(markup).toContain('browser-local mfd.rosterContinuity.v1 starter snapshot');
    expect(markup).toContain('current isStarter flags');
    expect(markup).toContain('This is not cartridge data');
  });
});
