/**
 * MFD Save Migration Pipeline
 *
 * Version-keyed transforms that upgrade old saves to the current schema.
 * Each migration takes a save at version N and returns version N+1.
 */

import { createEmptyRecordBook } from '../systems/records';

type MigrationFn = (state: Record<string, unknown>) => Record<string, unknown>;

const migrations: Map<number, MigrationFn> = new Map();

const FACILITY_TYPES = ['training_complex', 'medical_center', 'film_room', 'weight_room', 'recovery_suite'] as const;

function defaultUpgradeCosts(): Record<string, number[]> {
  return {
    training_complex: [4, 8, 12],
    medical_center: [4, 8, 12],
    film_room: [3, 6, 9],
    weight_room: [3, 6, 9],
    recovery_suite: [5, 10, 15],
  };
}

function facilityBudgetForOwner(archetypeId: unknown): number {
  switch (archetypeId) {
    case 'profit_first':
      return 8;
    case 'fan_favorite':
    case 'legacy_builder':
      return 12;
    case 'win_now':
    case 'patient_builder':
    default:
      return 10;
  }
}

function emptyFacilityEffect() {
  return {
    trainingXPBonus: 1,
    recoveryBonus: 1,
    injuryPreventionBonus: 1,
    scoutingBonus: 1,
    moraleBonus: 1,
    fatigueGainBonus: 1,
  };
}

function defaultFacilityState(archetypeId: unknown): Record<string, unknown> {
  return {
    facilities: FACILITY_TYPES.map((type) => ({
      type,
      level: 1,
      effect: emptyFacilityEffect(),
    })),
    budget: facilityBudgetForOwner(archetypeId),
    maxFacilities: 5,
    upgradeCosts: defaultUpgradeCosts(),
  };
}

function severityTierForLegacy(value: unknown): string {
  switch (value) {
    case 'doubtful':
      return 'moderate';
    case 'out':
      return 'severe';
    case 'ir':
      return 'season_ending';
    case 'questionable':
    default:
      return 'minor';
  }
}

function affectedRatingsForInjury(type: unknown): string[] {
  switch (type) {
    case 'concussion':
      return ['awareness'];
    case 'acl':
    case 'hamstring':
    case 'groin':
    case 'quad':
    case 'ankle_sprain':
    case 'knee_sprain':
    case 'foot':
      return ['speed', 'acceleration', 'agility'];
    case 'shoulder':
    case 'hand':
      return ['throwPower', 'catching'];
    case 'back':
    case 'ribs':
      return ['strength', 'stamina'];
    default:
      return ['stamina'];
  }
}

function legacyReinjuryRisk(severity: unknown): number {
  switch (severity) {
    case 'doubtful':
      return 0.12;
    case 'out':
      return 0.22;
    case 'ir':
      return 0.35;
    case 'questionable':
    default:
      return 0.08;
  }
}

function convertInjury(injury: unknown, fallbackId: string): Record<string, unknown> | null {
  if (!injury || typeof injury !== 'object') return null;
  const record = injury as Record<string, unknown>;
  if (Array.isArray(record['affectedRatings']) && typeof record['severityTier'] === 'string') {
    return record;
  }

  const severity = typeof record['severity'] === 'string' ? record['severity'] : 'questionable';
  const gamesOut = Number(record['gamesOut'] ?? 0);
  const onIR = Boolean(record['onIR']) || severity === 'ir';

  return {
    id: typeof record['id'] === 'string' ? record['id'] : fallbackId,
    type: typeof record['type'] === 'string' ? record['type'] : 'hamstring',
    severity,
    severityTier: severityTierForLegacy(severity),
    gamesOut,
    gamesRecovered: Number(record['gamesRecovered'] ?? 0),
    reinjuryRisk: Number(record['reinjuryRisk'] ?? legacyReinjuryRisk(severity)),
    affectedRatings: Array.isArray(record['affectedRatings']) ? record['affectedRatings'] : affectedRatingsForInjury(record['type']),
    ratingPenalty: Number(record['ratingPenalty'] ?? 0),
    onIR,
  };
}

function extendSeasonStats(raw: unknown): Record<string, unknown> {
  const seasonStats = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    gamesPlayed: Number(seasonStats['gamesPlayed'] ?? 0),
    pointsFor: Number(seasonStats['pointsFor'] ?? 0),
    pointsAgainst: Number(seasonStats['pointsAgainst'] ?? 0),
    pointDifferential: Number(seasonStats['pointDifferential'] ?? 0),
    totalYards: Number(seasonStats['totalYards'] ?? 0),
    passingYards: Number(seasonStats['passingYards'] ?? 0),
    rushingYards: Number(seasonStats['rushingYards'] ?? 0),
    turnoversLost: Number(seasonStats['turnoversLost'] ?? 0),
    turnoversForced: Number(seasonStats['turnoversForced'] ?? 0),
    sacksFor: Number(seasonStats['sacksFor'] ?? 0),
    sacksAgainst: Number(seasonStats['sacksAgainst'] ?? 0),
    drives: Number(seasonStats['drives'] ?? 0),
    thirdDownConversions: Number(seasonStats['thirdDownConversions'] ?? 0),
    thirdDownAttempts: Number(seasonStats['thirdDownAttempts'] ?? 0),
    timeOfPossession: Number(seasonStats['timeOfPossession'] ?? 0),
    fgMade: Number(seasonStats['fgMade'] ?? 0),
    fgAttempted: Number(seasonStats['fgAttempted'] ?? 0),
    punts: Number(seasonStats['punts'] ?? 0),
    pressuresAllowed: Number(seasonStats['pressuresAllowed'] ?? 0),
    yacYards: Number(seasonStats['yacYards'] ?? 0),
    redZoneTrips: Number(seasonStats['redZoneTrips'] ?? 0),
    redZoneScores: Number(seasonStats['redZoneScores'] ?? 0),
  };
}

function rivalryId(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('::');
}

function deriveLeagueRivalries(state: Record<string, unknown>): Array<Record<string, unknown>> {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  const byId = new Map<string, Record<string, unknown>>();

  const upsert = (teamA: string, teamB: string, intensity: number): void => {
    if (!teams[teamA] || !teams[teamB]) return;
    const id = rivalryId(teamA, teamB);
    const existing = byId.get(id);
    const firstTeam = teams[teamA]!;
    const secondTeam = teams[teamB]!;
    const isDivision = firstTeam['division'] === secondTeam['division'];
    const nextIntensity = Math.max(isDivision ? 40 : 10, Math.round(intensity));

    if (existing) {
      existing['intensity'] = Math.max(Number(existing['intensity'] ?? 0), nextIntensity);
      existing['isDivision'] = Boolean(existing['isDivision']) || isDivision;
      return;
    }

    byId.set(id, {
      id,
      teamA: [teamA, teamB].sort()[0],
      teamB: [teamA, teamB].sort()[1],
      intensity: nextIntensity,
      isDivision,
      history: [],
      lastMetYear: null,
      lastMetWeek: null,
    });
  };

  for (const [teamId, team] of Object.entries(teams)) {
    const rivalries = Array.isArray(team['rivalries']) ? team['rivalries'] as Array<Record<string, unknown>> : [];
    for (const rivalry of rivalries) {
      const opponentId = typeof rivalry['teamId'] === 'string' ? rivalry['teamId'] : null;
      const heat = Number(rivalry['heat'] ?? 0);
      if (!opponentId || heat <= 0) continue;
      upsert(teamId, opponentId, heat);
    }

    const rivals = (team['rivals'] as Record<string, Record<string, unknown>> | undefined) ?? {};
    for (const [opponentId, rival] of Object.entries(rivals)) {
      const heat = Number(rival['heat'] ?? 0);
      if (heat <= 0) continue;
      upsert(teamId, opponentId, heat * 8);
    }
  }

  return [...byId.values()];
}

function sortWaiverTeams(a: Record<string, unknown>, b: Record<string, unknown>, aId: string, bId: string): number {
  const aWins = Number(a['wins'] ?? 0);
  const bWins = Number(b['wins'] ?? 0);
  if (aWins !== bWins) return aWins - bWins;

  const aLosses = Number(a['losses'] ?? 0);
  const bLosses = Number(b['losses'] ?? 0);
  if (aLosses !== bLosses) return bLosses - aLosses;

  const aTies = Number(a['ties'] ?? 0);
  const bTies = Number(b['ties'] ?? 0);
  if (aTies !== bTies) return aTies - bTies;

  const aDiff = Number((a['seasonStats'] as Record<string, unknown> | undefined)?.['pointDifferential'] ?? 0);
  const bDiff = Number((b['seasonStats'] as Record<string, unknown> | undefined)?.['pointDifferential'] ?? 0);
  if (aDiff !== bDiff) return aDiff - bDiff;

  return aId.localeCompare(bId);
}

function deriveWaiverOrder(state: Record<string, unknown>): string[] {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  return Object.entries(teams)
    .sort(([aId, a], [bId, b]) => sortWaiverTeams(a, b, aId, bId))
    .map(([teamId]) => teamId);
}

/** Register a migration from version N to N+1. */
export function registerMigration(fromVersion: number, fn: MigrationFn): void {
  migrations.set(fromVersion, fn);
}

/** Run all necessary migrations to bring a save up to the target version. */
export function migrate(
  state: Record<string, unknown>,
  targetVersion: number,
): Record<string, unknown> {
  let current = state;
  let version = (current['version'] as number) ?? 0;

  while (version < targetVersion) {
    const fn = migrations.get(version);
    if (!fn) {
      throw new Error(
        `No migration found for version ${version}. ` +
        `Cannot upgrade to version ${targetVersion}.`,
      );
    }
    current = fn(current);
    version++;
    current['version'] = version;
  }

  return current;
}

/** Get the list of registered migration versions. */
export function getRegisteredVersions(): number[] {
  return Array.from(migrations.keys()).sort((a, b) => a - b);
}

registerMigration(1, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};

  for (const team of Object.values(teams)) {
    const wins = Number(team['wins'] ?? 0);
    const losses = Number(team['losses'] ?? 0);
    const ties = Number(team['ties'] ?? 0);
    team['seasonStats'] = team['seasonStats'] ?? {
      gamesPlayed: wins + losses + ties,
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
    };
  }

  return {
    ...state,
    teams,
    weekSummaries: Array.isArray(state['weekSummaries']) ? state['weekSummaries'] : [],
    playoffBracket: state['playoffBracket'] ?? null,
  };
});

registerMigration(2, (state) => ({
  ...state,
  offseasonState: state['offseasonState'] ?? null,
}));

registerMigration(3, (state) => ({
  ...state,
  narrativeState: {
    activeArcs: Array.isArray((state['narrativeState'] as Record<string, unknown> | undefined)?.['activeArcs'])
      ? (state['narrativeState'] as Record<string, unknown>)['activeArcs']
      : [],
    hooks: Array.isArray((state['narrativeState'] as Record<string, unknown> | undefined)?.['hooks'])
      ? (state['narrativeState'] as Record<string, unknown>)['hooks']
      : [],
    recentHeadlines: Array.isArray((state['narrativeState'] as Record<string, unknown> | undefined)?.['recentHeadlines'])
      ? (state['narrativeState'] as Record<string, unknown>)['recentHeadlines']
      : [],
  },
  gameDayState: {
    recentPackages: [],
    latestPackageId: null,
  },
}));

registerMigration(4, (state) => ({
  ...state,
  franchiseHistory: Array.isArray(state['franchiseHistory']) ? state['franchiseHistory'] : [],
  playerArchive: Array.isArray(state['playerArchive']) ? state['playerArchive'] : [],
}));

registerMigration(5, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};

  for (const team of Object.values(teams)) {
    team['mentoringPairs'] = Array.isArray(team['mentoringPairs']) ? team['mentoringPairs'] : [];
  }

  return {
    ...state,
    teams,
    records: createEmptyRecordBook(),
    awardsHistory: Array.isArray(state['awardsHistory']) ? state['awardsHistory'] : [],
    hallOfFame: Array.isArray(state['hallOfFame']) ? state['hallOfFame'] : [],
    powerRankings: Array.isArray(state['powerRankings']) ? state['powerRankings'] : [],
  };
});

registerMigration(6, (state) => ({
  ...state,
  offFieldEvents: Array.isArray(state['offFieldEvents']) ? state['offFieldEvents'] : [],
  recentPressConferences: Array.isArray(state['recentPressConferences']) ? state['recentPressConferences'] : [],
  coachingHistory: Array.isArray(state['coachingHistory']) ? state['coachingHistory'] : [],
  leagueRivalries: Array.isArray(state['leagueRivalries']) ? state['leagueRivalries'] : deriveLeagueRivalries(state),
  activeEffects: Array.isArray(state['activeEffects']) ? state['activeEffects'] : [],
}));

registerMigration(7, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const team of Object.values(teams)) {
    team['practiceSquad'] = Array.isArray(team['practiceSquad']) ? team['practiceSquad'] : [];
    team['stadiumType'] = team['stadiumType'] ?? 'outdoor';
  }

  const draftClass = Array.isArray(state['draftClass']) ? state['draftClass'] as Array<Record<string, unknown>> : [];
  for (const prospect of draftClass) {
    prospect['combine'] = prospect['combine'] ?? null;
  }

  return {
    ...state,
    teams,
    draftClass,
    scoutingDepartment: state['scoutingDepartment'] ?? {
      scouts: [],
      availableScouts: [],
      budget: 5,
      maxScouts: 5,
    },
    conditionalPicks: Array.isArray(state['conditionalPicks']) ? state['conditionalPicks'] : [],
    waiverOrder: Array.isArray(state['waiverOrder']) ? state['waiverOrder'] : deriveWaiverOrder(state),
    waiverWire: Array.isArray(state['waiverWire']) ? state['waiverWire'] : [],
    waiverClaims: Array.isArray(state['waiverClaims']) ? state['waiverClaims'] : [],
    handshakes: Array.isArray(state['handshakes']) ? state['handshakes'] : [],
  };
});

registerMigration(8, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const team of Object.values(teams)) {
    team['trainingAssignments'] = team['trainingAssignments'] ?? {};
  }

  return {
    ...state,
    teams,
    leagueNews: Array.isArray(state['leagueNews']) ? state['leagueNews'] : [],
    activeProposals: Array.isArray(state['activeProposals']) ? state['activeProposals'] : [],
    difficultyState: state['difficultyState'] ?? {
      enabled: true,
      adaptiveSlider: 50,
      recentUserResults: [],
      currentStreak: 0,
      adjustmentHistory: [],
    },
  };
});

registerMigration(9, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const [teamId, team] of Object.entries(teams)) {
    team['medicalStaff'] = team['medicalStaff'] ?? null;
    team['fatigueState'] = team['fatigueState'] ?? {};
    team['facilityState'] = team['facilityState'] ?? defaultFacilityState((team['owner'] as Record<string, unknown> | undefined)?.['archetypeId']);
    team['seasonStats'] = extendSeasonStats(team['seasonStats']);

    const roster = Array.isArray(team['roster']) ? team['roster'] as Array<Record<string, unknown>> : [];
    for (const player of roster) {
      player['injury'] = convertInjury(player['injury'], `injury-${teamId}-${String(player['id'] ?? 'player')}`);
      const stats = (player['stats'] as Record<string, unknown> | undefined) ?? {};
      player['stats'] = {
        gamesPlayed: Number(stats['gamesPlayed'] ?? 0),
        passYds: Number(stats['passYds'] ?? 0),
        passTD: Number(stats['passTD'] ?? 0),
        passINT: Number(stats['passINT'] ?? 0),
        passAtt: Number(stats['passAtt'] ?? 0),
        passComp: Number(stats['passComp'] ?? 0),
        rushYds: Number(stats['rushYds'] ?? 0),
        rushAtt: Number(stats['rushAtt'] ?? 0),
        rushTD: Number(stats['rushTD'] ?? 0),
        fumbles: Number(stats['fumbles'] ?? 0),
        rec: Number(stats['rec'] ?? 0),
        recYds: Number(stats['recYds'] ?? 0),
        recTD: Number(stats['recTD'] ?? 0),
        targets: Number(stats['targets'] ?? 0),
        sacks: Number(stats['sacks'] ?? 0),
        defINT: Number(stats['defINT'] ?? 0),
        tackles: Number(stats['tackles'] ?? 0),
        fgMade: Number(stats['fgMade'] ?? 0),
        fgAtt: Number(stats['fgAtt'] ?? 0),
        yacYds: Number(stats['yacYds'] ?? 0),
      };
    }
  }

  const players = (state['players'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const [playerId, player] of Object.entries(players)) {
    player['injury'] = convertInjury(player['injury'], `injury-player-${playerId}`);
    const stats = (player['stats'] as Record<string, unknown> | undefined) ?? {};
    player['stats'] = {
      gamesPlayed: Number(stats['gamesPlayed'] ?? 0),
      passYds: Number(stats['passYds'] ?? 0),
      passTD: Number(stats['passTD'] ?? 0),
      passINT: Number(stats['passINT'] ?? 0),
      passAtt: Number(stats['passAtt'] ?? 0),
      passComp: Number(stats['passComp'] ?? 0),
      rushYds: Number(stats['rushYds'] ?? 0),
      rushAtt: Number(stats['rushAtt'] ?? 0),
      rushTD: Number(stats['rushTD'] ?? 0),
      fumbles: Number(stats['fumbles'] ?? 0),
      rec: Number(stats['rec'] ?? 0),
      recYds: Number(stats['recYds'] ?? 0),
      recTD: Number(stats['recTD'] ?? 0),
      targets: Number(stats['targets'] ?? 0),
      sacks: Number(stats['sacks'] ?? 0),
      defINT: Number(stats['defINT'] ?? 0),
      tackles: Number(stats['tackles'] ?? 0),
      fgMade: Number(stats['fgMade'] ?? 0),
      fgAtt: Number(stats['fgAtt'] ?? 0),
      yacYds: Number(stats['yacYds'] ?? 0),
    };
  }

  return {
    ...state,
    teams,
    players,
    availableMedicalStaff: Array.isArray(state['availableMedicalStaff']) ? state['availableMedicalStaff'] : [],
    playoffMomentum: state['playoffMomentum'] ?? {},
  };
});

registerMigration(10, (state) => {
  const players = (state['players'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const player of Object.values(players)) {
    player['agentId'] = player['agentId'] ?? null;
  }

  const offseasonState = (state['offseasonState'] && typeof state['offseasonState'] === 'object')
    ? { ...(state['offseasonState'] as Record<string, unknown>) }
    : null;
  if (offseasonState && offseasonState['reSignDecisions'] && typeof offseasonState['reSignDecisions'] === 'object') {
    const reSignDecisions = offseasonState['reSignDecisions'] as Record<string, Record<string, unknown>>;
    for (const decision of Object.values(reSignDecisions)) {
      const askingPrice = (decision['askingPrice'] as Record<string, unknown> | undefined) ?? {
        years: 1,
        salary: 1,
        signingBonus: 0,
        guaranteed: 0,
      };
      decision['agentDemand'] = decision['agentDemand'] ?? { ...askingPrice };
      decision['counterOffer'] = decision['counterOffer'] ?? null;
      decision['agentResponse'] = typeof decision['agentResponse'] === 'string' ? decision['agentResponse'] : '';
      decision['patienceWeeksRemaining'] = Number(decision['patienceWeeksRemaining'] ?? 0);
    }
  }

  return {
    ...state,
    players,
    offseasonState,
    tutorialState: state['tutorialState'] ?? {
      active: false,
      currentStepIndex: 0,
      steps: [],
      completedSteps: [],
      dismissed: false,
    },
    agents: Array.isArray(state['agents']) ? state['agents'] : [],
    narrativeIntensity: state['narrativeIntensity'] ?? {
      current: 50,
      recentBeats: [],
      cooldownWeeks: 0,
    },
    ceremonies: Array.isArray(state['ceremonies']) ? state['ceremonies'] : [],
    dynastyTimeline: Array.isArray(state['dynastyTimeline']) ? state['dynastyTimeline'] : [],
  };
});
