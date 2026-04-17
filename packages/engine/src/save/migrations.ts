/**
 * MFD Save Migration Pipeline
 *
 * Version-keyed transforms that upgrade old saves to the current schema.
 * Each migration takes a save at version N and returns version N+1.
 */

import { createDefaultAchievements } from '../systems/achievements';
import { assignProspectRegion, deriveConfidence } from '../systems/advanced-scouting';
import { initCBA } from '../systems/cba-engine';
import { initCommissioner } from '../systems/commissioner';
import { createDefaultDashboardState } from '../systems/dashboard-config';
import { initLaborState } from '../systems/labor-relations';
import { initLeagueRules } from '../systems/league-rules';
import { initializeLockerRoom } from '../systems/locker-room';
import { assignJerseyNumber } from '../systems/jersey-retirement';
import { createEmptyRecordBook } from '../systems/records';
import { buildSpecialTeamsState, createDefaultSpecialTeamsState } from '../systems/special-teams';
import { getDefaultHalftimeDecisionSetting } from '../config';
import type { Team } from '../types';

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

function clampPercentage(value: unknown, fallback = 50): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function migrateScheduledGame(raw: unknown): Record<string, unknown> {
  const matchup = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    ...matchup,
    flexed: Boolean(matchup['flexed']),
    primetime: Boolean(matchup['primetime']),
    broadcastNetwork: matchup['broadcastNetwork'] ?? null,
  };
}

function migrateSchedule(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.map((week) => {
    const entry = (week && typeof week === 'object' ? week : {}) as Record<string, unknown>;
    const games = Array.isArray(entry['games']) ? entry['games'].map((game) => migrateScheduledGame(game)) : [];
    return {
      ...entry,
      week: Number(entry['week'] ?? 0),
      games,
    };
  });
}

function teamSpecialTeams(team: Record<string, unknown>): Record<string, unknown> {
  if (team['specialTeams'] && typeof team['specialTeams'] === 'object') {
    return team['specialTeams'] as Record<string, unknown>;
  }
  if (!Array.isArray(team['roster'])) {
    return createDefaultSpecialTeamsState() as unknown as Record<string, unknown>;
  }
  return buildSpecialTeamsState(team as unknown as Team) as unknown as Record<string, unknown>;
}

function normalizeCoachRecord(
  coach: Record<string, unknown> | null,
  role: 'HC' | 'OC' | 'DC',
): Record<string, unknown> | null {
  if (!coach) return null;
  const firstName = typeof coach['firstName'] === 'string'
    ? coach['firstName']
    : typeof coach['name'] === 'string'
      ? String(coach['name']).split(' ')[0] ?? role
      : role;
  const lastName = typeof coach['lastName'] === 'string'
    ? coach['lastName']
    : typeof coach['name'] === 'string'
      ? String(coach['name']).split(' ').slice(1).join(' ') || 'Coach'
      : 'Coach';

  return {
    ...coach,
    id: typeof coach['id'] === 'string' ? coach['id'] : `${role.toLowerCase()}-legacy`,
    firstName,
    lastName,
    role,
    archetype: typeof coach['archetype'] === 'string' ? coach['archetype'] : 'balanced',
    traits: Array.isArray(coach['traits']) ? coach['traits'] : [],
    skillTree: (coach['skillTree'] && typeof coach['skillTree'] === 'object') ? coach['skillTree'] : {},
    xp: Number(coach['xp'] ?? 0),
    reputation: Number(coach['reputation'] ?? 50),
    tenure: Number(coach['tenure'] ?? 0),
  };
}

function normalizeStaffRecord(
  staff: Record<string, unknown> | null,
  role: 'HC' | 'OC' | 'DC',
  year: number,
  offenseScheme: string,
  defenseScheme: string,
): Record<string, unknown> | null {
  if (!staff) return null;
  const derivedName = typeof staff['firstName'] === 'string' || typeof staff['lastName'] === 'string'
    ? `${String(staff['firstName'] ?? role)} ${String(staff['lastName'] ?? 'Coach')}`.trim()
    : `${role} Coach`;
  return {
    ...staff,
    id: typeof staff['id'] === 'string' ? staff['id'] : `${role.toLowerCase()}-${year}`,
    name: typeof staff['name'] === 'string' ? staff['name'] : derivedName,
    role,
    archetype: typeof staff['archetype'] === 'string' ? staff['archetype'] : 'balanced',
    traits: Array.isArray(staff['traits']) ? staff['traits'] : [],
    ratings: (staff['ratings'] && typeof staff['ratings'] === 'object')
      ? staff['ratings']
      : {
        gameplan: 70,
        development: 70,
        motivation: 70,
        strategy: 70,
      },
    level: Number(staff['level'] ?? 1),
    age: Number(staff['age'] ?? 48),
    specialty75: staff['specialty75'] ?? null,
    term: Number(staff['term'] ?? 3),
    buyoutPenalty: Number(staff['buyoutPenalty'] ?? 2),
    loyalty: Number(staff['loyalty'] ?? 5),
    ambition: Number(staff['ambition'] ?? 5),
    schemeLean: (staff['schemeLean'] && typeof staff['schemeLean'] === 'object')
      ? staff['schemeLean']
      : {
        offense: offenseScheme,
        defense: defenseScheme,
      },
    lastHiredYear: Number(staff['lastHiredYear'] ?? year),
  };
}

function coachFromStaff(staff: Record<string, unknown> | null, role: 'HC' | 'OC' | 'DC'): Record<string, unknown> | null {
  if (!staff) return null;
  const name = typeof staff['name'] === 'string' ? staff['name'] : `${role} Coach`;
  const [firstName, ...rest] = name.split(' ');
  const hireYear = Number(staff['lastHiredYear'] ?? 0);
  return {
    id: typeof staff['id'] === 'string' ? staff['id'] : `${role.toLowerCase()}-legacy`,
    firstName: firstName || role,
    lastName: rest.join(' ') || 'Coach',
    role,
    archetype: typeof staff['archetype'] === 'string' ? staff['archetype'] : 'balanced',
    traits: Array.isArray(staff['traits']) ? staff['traits'] : [],
    skillTree: {},
    xp: 0,
    reputation: Number(staff['level'] ?? 1) * 10 + 40,
    tenure: hireYear > 0 ? 1 : 0,
  };
}

function normalizeTeamsForV15(state: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  const year = Number(state['year'] ?? 2026);

  for (const team of Object.values(teams)) {
    const offenseScheme = String(team['schemeOff'] ?? team['offScheme'] ?? 'balanced');
    const defenseScheme = String(team['schemeDef'] ?? team['defScheme'] ?? '4-3');
    team['schemeOff'] = offenseScheme;
    team['offScheme'] = offenseScheme;
    team['schemeDef'] = defenseScheme;
    team['defScheme'] = defenseScheme;

    const coachingStaff = (team['coachingStaff'] && typeof team['coachingStaff'] === 'object')
      ? team['coachingStaff'] as Record<string, Record<string, unknown> | null>
      : {};
    const staff = (team['staff'] && typeof team['staff'] === 'object')
      ? team['staff'] as Record<string, Record<string, unknown> | null>
      : {};

    const hc = normalizeStaffRecord(
      (staff['hc'] as Record<string, unknown> | null) ?? normalizeCoachRecord(coachingStaff['hc'] ?? null, 'HC'),
      'HC',
      year,
      offenseScheme,
      defenseScheme,
    );
    const oc = normalizeStaffRecord(
      (staff['oc'] as Record<string, unknown> | null) ?? normalizeCoachRecord(coachingStaff['oc'] ?? null, 'OC'),
      'OC',
      year,
      offenseScheme,
      defenseScheme,
    );
    const dc = normalizeStaffRecord(
      (staff['dc'] as Record<string, unknown> | null) ?? normalizeCoachRecord(coachingStaff['dc'] ?? null, 'DC'),
      'DC',
      year,
      offenseScheme,
      defenseScheme,
    );

    team['staff'] = { hc, oc, dc };
    team['coachingStaff'] = {
      hc: coachFromStaff(hc, 'HC'),
      oc: coachFromStaff(oc, 'OC'),
      dc: coachFromStaff(dc, 'DC'),
    };
  }

  return teams;
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

registerMigration(11, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const team of Object.values(teams)) {
    team['specialTeams'] = teamSpecialTeams(team);
  }

  return {
    ...state,
    teams,
    schedule: migrateSchedule(state['schedule']),
    achievements: Array.isArray(state['achievements']) && state['achievements'].length > 0
      ? state['achievements']
      : createDefaultAchievements(),
    dashboardState: state['dashboardState'] ?? createDefaultDashboardState(),
    seasonReports: Array.isArray(state['seasonReports']) ? state['seasonReports'] : [],
  };
});

registerMigration(12, (state) => ({
  ...state,
  gamePlan: state['gamePlan'] ?? null,
  opponentReports: Array.isArray(state['opponentReports']) ? state['opponentReports'] : [],
  draftRecaps: Array.isArray(state['draftRecaps']) ? state['draftRecaps'] : [],
  tradeSuggestions: Array.isArray(state['tradeSuggestions']) ? state['tradeSuggestions'] : [],
  waiverResults: Array.isArray(state['waiverResults']) ? state['waiverResults'] : [],
}));

registerMigration(13, (state) => ({
  ...state,
  playerSeasonHistory: (state['playerSeasonHistory'] && typeof state['playerSeasonHistory'] === 'object')
    ? state['playerSeasonHistory']
    : {},
  faTargetBoard: (state['faTargetBoard'] && typeof state['faTargetBoard'] === 'object')
    ? state['faTargetBoard']
    : {
      teamId: null,
      watchlist: [],
      targets: [],
    },
  teamNeedsCache: (state['teamNeedsCache'] && typeof state['teamNeedsCache'] === 'object')
    ? state['teamNeedsCache']
    : {},
  warRoomState: state['warRoomState'] ?? null,
  contractExtensions: Array.isArray(state['contractExtensions']) ? state['contractExtensions'] : [],
}));

registerMigration(14, (state) => ({
  ...state,
  teams: normalizeTeamsForV15(state),
  coachingMarket: (state['coachingMarket'] && typeof state['coachingMarket'] === 'object')
    ? state['coachingMarket']
    : {
      teamId: null,
      updatedYear: Number(state['year'] ?? 0),
      updatedWeek: Number(state['week'] ?? 0),
      hotSeat: false,
      candidates: {
        HC: [],
        OC: [],
        DC: [],
      },
    },
  weeklyPrepPlans: (state['weeklyPrepPlans'] && typeof state['weeklyPrepPlans'] === 'object')
    ? state['weeklyPrepPlans']
    : {},
  weeklyPrepHistory: Array.isArray(state['weeklyPrepHistory']) ? state['weeklyPrepHistory'] : [],
  filmRoomHistory: Array.isArray(state['filmRoomHistory']) ? state['filmRoomHistory'] : [],
}));

registerMigration(15, (state) => {
  const draftClass: Array<Record<string, unknown>> = Array.isArray(state['draftClass'])
    ? (state['draftClass'] as Array<Record<string, unknown>>).map((prospect) => ({
      ...prospect,
      region: typeof prospect['region'] === 'string'
        ? prospect['region']
        : assignProspectRegion(String(prospect['college'] ?? 'unknown')),
    }))
    : [];

  const scoutingDepartment: Record<string, unknown> = (state['scoutingDepartment'] && typeof state['scoutingDepartment'] === 'object')
    ? { ...(state['scoutingDepartment'] as Record<string, unknown>) }
    : {
      scouts: [],
      availableScouts: [],
      budget: 5,
      maxScouts: 5,
    };

  const normalizeScout = (scout: Record<string, unknown>): Record<string, unknown> => ({
    ...scout,
    scope: scout['scope'] ?? 'national',
    region: scout['region'] ?? null,
  });

  scoutingDepartment['scouts'] = Array.isArray(scoutingDepartment['scouts'])
    ? (scoutingDepartment['scouts'] as Array<Record<string, unknown>>).map(normalizeScout)
    : [];
  scoutingDepartment['availableScouts'] = Array.isArray(scoutingDepartment['availableScouts'])
    ? (scoutingDepartment['availableScouts'] as Array<Record<string, unknown>>).map(normalizeScout)
    : [];
  scoutingDepartment['privateWorkoutsRemaining'] = Number(scoutingDepartment['privateWorkoutsRemaining'] ?? 3);

  const prospectById = new Map<string, Record<string, unknown>>(
    draftClass.map((prospect): [string, Record<string, unknown>] => [String(prospect['id'] ?? ''), prospect]),
  );
  const offseasonState: Record<string, unknown> | null = (state['offseasonState'] && typeof state['offseasonState'] === 'object')
    ? { ...(state['offseasonState'] as Record<string, unknown>) }
    : null;

  if (offseasonState) {
    const scoutingState = (offseasonState['scoutingState'] && typeof offseasonState['scoutingState'] === 'object')
      ? { ...(offseasonState['scoutingState'] as Record<string, Record<string, unknown>>) }
      : {};

    for (const [prospectId, scouting] of Object.entries(scoutingState)) {
      const prospect = prospectById.get(prospectId);
      const accuracy = Number(scouting['accuracy'] ?? 0);
      scoutingState[prospectId] = {
        ...scouting,
        actions: Array.isArray(scouting['actions']) ? scouting['actions'] : [],
        confidence: Number(scouting['confidence'] ?? deriveConfidence(accuracy)),
        assignedScoutId: scouting['assignedScoutId'] ?? null,
        riskBand: scouting['riskBand'] ?? 'unknown',
        ceilingBand: scouting['ceilingBand'] ?? 'unknown',
        characterRead: scouting['characterRead'] ?? 'unknown',
        privateWorkoutRatings: Array.isArray(scouting['privateWorkoutRatings']) ? scouting['privateWorkoutRatings'] : [],
      };
      if (prospect && typeof prospect['region'] !== 'string') {
        prospect['region'] = assignProspectRegion(String(prospect['college'] ?? 'unknown'));
      }
    }

    offseasonState['scoutingState'] = scoutingState;
    offseasonState['scoutingWatchlist'] = Array.isArray(offseasonState['scoutingWatchlist']) ? offseasonState['scoutingWatchlist'] : [];
  }

  return {
    ...state,
    draftClass,
    scoutingDepartment,
    offseasonState,
  };
});

registerMigration(16, (state) => ({
  ...state,
  socialFeed: Array.isArray(state['socialFeed']) ? state['socialFeed'] : [],
  tradeDeadlineState: state['tradeDeadlineState'],
  scenarioState: state['scenarioState'],
}));

registerMigration(17, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};

  for (const team of Object.values(teams)) {
    if (team['franchiseIdentity']) continue;
    team['franchiseIdentity'] = {
      fanbase: 55,
      prestige: 50,
      marketSize: 'medium',
      marketModifier: 1,
      stadiumName: `${String(team['city'] ?? 'City')} Stadium`,
      stadiumDeal: null,
      stadiumLevel: 1,
      attendance: 70,
      relocationHistory: [],
    };
  }

  return {
    ...state,
    teams,
    allDecadeTeams: Array.isArray(state['allDecadeTeams']) ? state['allDecadeTeams'] : [],
    expansionDraftState: state['expansionDraftState'],
    stadiumDealOffers: Array.isArray(state['stadiumDealOffers']) ? state['stadiumDealOffers'] : [],
  };
});

registerMigration(18, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  const players = (state['players'] as Record<string, Record<string, unknown>> | undefined) ?? {};

  for (const team of Object.values(teams)) {
    team['retiredJerseys'] = Array.isArray(team['retiredJerseys']) ? team['retiredJerseys'] : [];
    team['roster'] = Array.isArray(team['roster']) ? team['roster'] : [];
    const roster = team['roster'] as Array<Record<string, unknown>>;
    for (const player of roster) {
      player['endorsements'] = Array.isArray(player['endorsements']) ? player['endorsements'] : [];
      player['cliqueId'] = player['cliqueId'] ?? null;
      player['jerseyNumber'] = Number(player['jerseyNumber'] ?? 0);
    }

    const typedTeam = team as unknown as Team;
    for (const player of typedTeam.roster ?? []) {
      assignJerseyNumber(typedTeam, player);
      const storedPlayer = players[player.id];
      if (storedPlayer) {
        storedPlayer['endorsements'] = Array.isArray(storedPlayer['endorsements']) ? storedPlayer['endorsements'] : player.endorsements ?? [];
        storedPlayer['cliqueId'] = player.cliqueId ?? null;
        storedPlayer['jerseyNumber'] = Number(player.jerseyNumber ?? 0);
      }
    }

    team['lockerRoom'] = team['lockerRoom'] ?? initializeLockerRoom(typedTeam, () => 0.42);
    for (const player of typedTeam.roster ?? []) {
      const storedPlayer = players[player.id];
      if (!storedPlayer) continue;
      storedPlayer['cliqueId'] = player.cliqueId ?? null;
      storedPlayer['jerseyNumber'] = Number(player.jerseyNumber ?? 0);
    }
  }

  for (const player of Object.values(players)) {
    player['endorsements'] = Array.isArray(player['endorsements']) ? player['endorsements'] : [];
    player['cliqueId'] = player['cliqueId'] ?? null;
    player['jerseyNumber'] = Number(player['jerseyNumber'] ?? 0);
  }

  const playerArchive = Array.isArray(state['playerArchive']) ? state['playerArchive'] as Array<Record<string, unknown>> : [];
  for (const entry of playerArchive) {
    entry['jerseyNumber'] = entry['jerseyNumber'] ?? null;
  }

  return {
    ...state,
    teams,
    players,
    playerArchive,
    playerRivalries: Array.isArray(state['playerRivalries']) ? state['playerRivalries'] : [],
    farewellTours: Array.isArray(state['farewellTours']) ? state['farewellTours'] : [],
    endorsementOffers: Array.isArray(state['endorsementOffers']) ? state['endorsementOffers'] : [],
  };
});

registerMigration(19, (state) => {
  const year = Number(state['year'] ?? 2026);
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};

  for (const team of Object.values(teams)) {
    team['franchiseTags'] = Array.isArray(team['franchiseTags']) ? team['franchiseTags'] : [];
  }

  return {
    ...state,
    teams,
    leagueRules: state['leagueRules'] ?? initLeagueRules(year),
    cbaState: state['cbaState'] ?? initCBA(year),
    commissionerState: state['commissionerState'] ?? initCommissioner(year),
    laborState: state['laborState'] ?? initLaborState(),
  };
});

registerMigration(20, (state) => ({
  ...state,
  activeRecordChases: Array.isArray(state['activeRecordChases']) ? state['activeRecordChases'] : [],
  recentBrokenRecords: Array.isArray(state['recentBrokenRecords']) ? state['recentBrokenRecords'] : [],
  recentMilestones: Array.isArray(state['recentMilestones']) ? state['recentMilestones'] : [],
}));

registerMigration(21, (state) => {
  const teams = state['teams'] as Record<string, Record<string, unknown>> | undefined;
  if (teams) {
    for (const team of Object.values(teams)) {
      if (!team.staffChemistry) team.staffChemistry = undefined;
    }
  }
  return { ...state, teams };
});

registerMigration(22, (state) => {
  const teams = state['teams'] as Record<string, Record<string, unknown>> | undefined;
  if (teams) {
    for (const team of Object.values(teams)) {
      if (!team.positionCoaches) team.positionCoaches = undefined;
    }
  }
  return { ...state, teams };
});

// v23→v24: Snap counts added as optional field on PlayerGameLine — no data transform needed
registerMigration(23, (state) => {
  return { ...state };
});

// v24→v25: Cap Engine v2 — add bonus slices, guarantee schedule, and missing contract fields
registerMigration(24, (state) => {
  const players: Record<string, any> = { ...(state.players ?? {}) };
  for (const pid of Object.keys(players)) {
    const p = players[pid];
    if (!p?.contract) continue;
    const c = p.contract;
    // Backfill missing fields that existed in runtime but not in schema
    if (c.baseSalary == null && c.yearlyBreakdown?.[0]) {
      c.baseSalary = c.yearlyBreakdown[0].baseSalary ?? 1;
    }
    if (c.prorated == null) {
      c.prorated = c.years > 0 ? (c.signingBonus ?? 0) / c.years : 0;
    }
    if (c.originalYears == null) {
      c.originalYears = c.years ?? 1;
    }
    if (c.restructured == null) {
      c.restructured = false;
    }
    // Add empty slices and guarantee schedule — old contracts get clean slate
    if (!c.slices) c.slices = [];
    if (!c.guaranteeSchedule) c.guaranteeSchedule = [];
    // Add guaranteeType to yearly breakdown entries
    if (Array.isArray(c.yearlyBreakdown)) {
      for (const yr of c.yearlyBreakdown) {
        if (yr.guaranteeType == null) {
          yr.guaranteeType = yr.guaranteed ? (yr.year <= 1 ? 'GAS' : 'RDG') : undefined;
        }
      }
    }
  }
  return { ...state, players };
});

// v25→v26: Persist weekly prep wiring and dynasty bookkeeping defaults
registerMigration(25, (state) => {
  const weeklyPrepPlans = (state['weeklyPrepPlans'] && typeof state['weeklyPrepPlans'] === 'object')
    ? { ...(state['weeklyPrepPlans'] as Record<string, Record<string, unknown>>) }
    : {};

  for (const plan of Object.values(weeklyPrepPlans)) {
    plan['contingencyRules'] = Array.isArray(plan['contingencyRules']) ? plan['contingencyRules'] : [];
    plan['trickPlays'] = Array.isArray(plan['trickPlays']) ? plan['trickPlays'] : [];
  }

  return {
    ...state,
    weeklyPrepPlans,
    earnedDoctrines: Array.isArray(state['earnedDoctrines']) ? state['earnedDoctrines'] : [],
    seasonNearMissReceipts: Array.isArray(state['seasonNearMissReceipts']) ? state['seasonNearMissReceipts'] : [],
    activeCallYourShot: state['activeCallYourShot'],
  };
});

// v26→v27: Postgame UX queues and inbox-driven narrative state
registerMigration(26, (state) => ({
  ...state,
  postGameUi: (state['postGameUi'] && typeof state['postGameUi'] === 'object')
    ? state['postGameUi']
    : {
      pressConferenceQueue: [],
      audioCueQueue: [],
    },
  breakingNewsQueue: Array.isArray(state['breakingNewsQueue']) ? state['breakingNewsQueue'] : [],
  ownerPersonalityInbox: Array.isArray(state['ownerPersonalityInbox']) ? state['ownerPersonalityInbox'] : [],
  commissionerDisciplineLog: Array.isArray(state['commissionerDisciplineLog']) ? state['commissionerDisciplineLog'] : [],
}));

// v27→v28: Finishing moves save fields (fan confidence, halftime setting, halftime prompt persistence)
registerMigration(27, (state) => {
  const teams = (state['teams'] && typeof state['teams'] === 'object')
    ? { ...(state['teams'] as Record<string, Record<string, unknown>>) }
    : {};

  for (const team of Object.values(teams)) {
    const franchiseIdentity = team['franchiseIdentity'];
    const fanbase = franchiseIdentity && typeof franchiseIdentity === 'object'
      ? (franchiseIdentity as Record<string, unknown>)['fanbase']
      : undefined;
    team['fanConfidence'] = clampPercentage(team['fanConfidence'] ?? fanbase, 50);
  }

  const postGameUi: Record<string, unknown> = (state['postGameUi'] && typeof state['postGameUi'] === 'object')
    ? { ...(state['postGameUi'] as Record<string, unknown>) }
    : {
      pressConferenceQueue: [],
      audioCueQueue: [],
    };
  postGameUi['pressConferenceQueue'] = Array.isArray(postGameUi['pressConferenceQueue']) ? postGameUi['pressConferenceQueue'] : [];
  postGameUi['audioCueQueue'] = Array.isArray(postGameUi['audioCueQueue']) ? postGameUi['audioCueQueue'] : [];
  postGameUi['pendingHalftimeDecision'] = postGameUi['pendingHalftimeDecision'] ?? null;

  const difficulty = typeof state['difficulty'] === 'string' ? state['difficulty'] : 'pro';
  const settings = (state['settings'] && typeof state['settings'] === 'object')
    ? { ...(state['settings'] as Record<string, unknown>) }
    : {};
  settings['halftimeDecisions'] = settings['halftimeDecisions'] === 'on' || settings['halftimeDecisions'] === 'off'
    ? settings['halftimeDecisions']
    : getDefaultHalftimeDecisionSetting(difficulty as 'rookie' | 'pro' | 'allpro' | 'legend');

  return {
    ...state,
    teams,
    settings,
    postGameUi,
  };
});

// v28→v29: Apology Tour continuity threads
registerMigration(28, (state) => ({
  ...state,
  apologyTourThreads: Array.isArray(state['apologyTourThreads']) ? state['apologyTourThreads'] : [],
}));

function defaultBloodlineOnRecord(record: Record<string, unknown>): Record<string, unknown> {
  return {
    ...record,
    bloodline: record['bloodline'] ?? null,
  };
}

// v29→v30: Bloodlines persistence defaults for players and draft prospects
registerMigration(29, (state) => {
  const players = (state['players'] && typeof state['players'] === 'object')
    ? Object.fromEntries(
      Object.entries(state['players'] as Record<string, unknown>).map(([id, player]) => [
        id,
        player && typeof player === 'object'
          ? defaultBloodlineOnRecord(player as Record<string, unknown>)
          : player,
      ]),
    )
    : {};

  const draftClass = Array.isArray(state['draftClass'])
    ? state['draftClass'].map((prospect) => (
      prospect && typeof prospect === 'object'
        ? defaultBloodlineOnRecord(prospect as Record<string, unknown>)
        : prospect
    ))
    : [];

  return {
    ...state,
    players,
    draftClass,
  };
});

// v31→v32: Sprint 45 "The Family Tree"
// - Top-level `relationships: RelationshipEdge[]` (empty by default).
// - Each team's HC/OC/DC gains `mentorCoachId`, `disciples`, `yearsUnderMentor`
//   lineage fields. Defaults mean existing saves render with an empty tree.
registerMigration(31, (state) => {
  const patchCoach = (coach: unknown): unknown => {
    if (!coach || typeof coach !== 'object') return coach;
    const record = coach as Record<string, unknown>;
    return {
      ...record,
      mentorCoachId: record['mentorCoachId'] ?? null,
      disciples: Array.isArray(record['disciples']) ? record['disciples'] : [],
      yearsUnderMentor: typeof record['yearsUnderMentor'] === 'number'
        ? record['yearsUnderMentor']
        : 0,
    };
  };

  const teamsRaw = state['teams'];
  let migratedTeams: unknown = teamsRaw;
  if (teamsRaw && typeof teamsRaw === 'object' && !Array.isArray(teamsRaw)) {
    const teamsRecord = teamsRaw as Record<string, unknown>;
    const nextTeams: Record<string, unknown> = {};
    for (const [teamId, team] of Object.entries(teamsRecord)) {
      if (!team || typeof team !== 'object') {
        nextTeams[teamId] = team;
        continue;
      }
      const teamRecord = team as Record<string, unknown>;
      const staff = teamRecord['staff'];
      if (!staff || typeof staff !== 'object') {
        nextTeams[teamId] = teamRecord;
        continue;
      }
      const staffRecord = staff as Record<string, unknown>;
      nextTeams[teamId] = {
        ...teamRecord,
        staff: {
          ...staffRecord,
          hc: patchCoach(staffRecord['hc']),
          oc: patchCoach(staffRecord['oc']),
          dc: patchCoach(staffRecord['dc']),
        },
      };
    }
    migratedTeams = nextTeams;
  }

  return {
    ...state,
    teams: migratedTeams,
    relationships: Array.isArray(state['relationships']) ? state['relationships'] : [],
  };
});

// v32→v33: Sprint 46 "The Long Game"
// - Top-level `storyArcs: LeagueStoryArc[]` (empty by default).
// - Each team gains `philosophy`, defaulting to `maintain`.
registerMigration(32, (state) => {
  const teamsRaw = state['teams'];
  let migratedTeams: unknown = teamsRaw;

  if (teamsRaw && typeof teamsRaw === 'object' && !Array.isArray(teamsRaw)) {
    migratedTeams = Object.fromEntries(
      Object.entries(teamsRaw as Record<string, unknown>).map(([teamId, team]) => {
        if (!team || typeof team !== 'object') return [teamId, team];
        const teamRecord = team as Record<string, unknown>;
        return [teamId, {
          ...teamRecord,
          philosophy: typeof teamRecord['philosophy'] === 'string' ? teamRecord['philosophy'] : 'maintain',
        }];
      }),
    );
  }

  return {
    ...state,
    teams: migratedTeams,
    storyArcs: Array.isArray(state['storyArcs']) ? state['storyArcs'] : [],
  };
});

// v30→v31: Add tutorialState.visitedScreens (Sprint 43 "Rookie Card" onboarding)
registerMigration(30, (state) => {
  const tutorialRaw = (state['tutorialState'] && typeof state['tutorialState'] === 'object')
    ? (state['tutorialState'] as Record<string, unknown>)
    : {};

  const existingVisited = Array.isArray(tutorialRaw['visitedScreens'])
    ? (tutorialRaw['visitedScreens'] as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    ...state,
    tutorialState: {
      active: typeof tutorialRaw['active'] === 'boolean' ? tutorialRaw['active'] : false,
      currentStepIndex: typeof tutorialRaw['currentStepIndex'] === 'number' ? tutorialRaw['currentStepIndex'] : 0,
      steps: Array.isArray(tutorialRaw['steps']) ? tutorialRaw['steps'] : [],
      completedSteps: Array.isArray(tutorialRaw['completedSteps'])
        ? (tutorialRaw['completedSteps'] as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
      dismissed: typeof tutorialRaw['dismissed'] === 'boolean' ? tutorialRaw['dismissed'] : false,
      visitedScreens: existingVisited,
    },
  };
});
