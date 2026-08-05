import { CLIQUE_TYPES } from '../config';
import type { PrngFn } from '../rng';
import type {
  CaptainPerk,
  CaptainState,
  CliqueId,
  CliqueState,
  GameResult,
  LockerRoomState,
  LockerRoomTension,
  Player,
  Team,
} from '../types';
import { cl, playerDisplayName } from '../utils';

export const CLIQUE_ASSIGNMENT_RULES = {
  vets: { minAge: 28, minYearsExp: 6 },
  youngCore: { maxAge: 25, maxYearsExp: 3 },
  stars: { minOvr: 82, minDevTraits: ['star', 'superstar', 'x-factor'] as const },
};

export const CULTURE_THRESHOLDS = {
  toxic: { max: 20 },
  fragile: { max: 40 },
  stable: { max: 60 },
  strong: { max: 79 },
  elite: { min: 80 },
};

export const CAPTAIN_PERK_EFFECTS: Record<CaptainPerk, string> = {
  rally_cry: '+3 team chemistry after a loss',
  mentor_boost: '+1 OVR to all Young Core clique members',
  hazing_shield: 'Prevents rookie hazing tensions',
  clutch_aura: '+1 OVR to all starters in Q4 close games',
  media_shield: 'Reduces chemistry penalty from negative press conferences',
};

export const MAX_CAPTAINS = 3;
export const CAPTAIN_MIN_OVR = 78;
export const CAPTAIN_MIN_YEARS_EXP = 4;
export const CAPTAIN_RALLY_COOLDOWN = 4;

const TENSION_PENALTIES: Record<LockerRoomTension['severity'], number> = {
  minor: 4,
  moderate: 9,
  serious: 15,
};

const CAPTAIN_UNLOCK_MILESTONES = [3, 6] as const;

function teamRoster(team: Team | { roster?: Player[] }): Player[] {
  const roster = (team as { roster?: Player[] }).roster;
  return Array.isArray(roster) ? roster : [];
}

function labelForClique(id: CliqueId): string {
  return CLIQUE_TYPES.find((clique) => clique.id === id)?.label ?? 'Unknown';
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function currentWeek(lockerRoom: LockerRoomState, fallback = 1): number {
  const lastTensionWeek = lockerRoom.tensions.reduce((best, tension) => Math.max(best, tension.weekCreated), 0);
  return Math.max(fallback, lockerRoom.lastMeetingWeek ?? 0, lastTensionWeek);
}

function tensionId(rng: PrngFn): string {
  return `tension-${Math.floor(rng() * 1_000_000_000).toString(36)}`;
}

function captainPerkPriority(player: Player): CaptainPerk[] {
  const perks: CaptainPerk[] = [];
  if (player.traits.includes('vocal_leader')) perks.push('rally_cry');
  if (player.traits.includes('mentor')) perks.push('mentor_boost');
  if (player.traits.includes('captain')) perks.push('clutch_aura');
  if (player.personality.loyalty >= 8 || player.personality.workEthic >= 8) perks.push('media_shield');
  if (player.yearsExp >= CLIQUE_ASSIGNMENT_RULES.vets.minYearsExp || player.age >= CLIQUE_ASSIGNMENT_RULES.vets.minAge) {
    perks.push('hazing_shield');
  }
  for (const fallback of ['hazing_shield', 'media_shield', 'mentor_boost', 'clutch_aura', 'rally_cry'] satisfies CaptainPerk[]) {
    if (!perks.includes(fallback)) perks.push(fallback);
  }
  return perks;
}

function unlockCaptainPerks(player: Player | undefined, captain: CaptainState): CaptainState {
  if (!player) return captain;
  const available = captainPerkPriority(player);
  let desiredCount = 1;
  if (captain.captainMoments >= CAPTAIN_UNLOCK_MILESTONES[0]) desiredCount = 2;
  if (captain.captainMoments >= CAPTAIN_UNLOCK_MILESTONES[1]) desiredCount = 3;
  const perks = [...captain.perks];
  for (const perk of available) {
    if (perks.length >= desiredCount) break;
    if (!perks.includes(perk)) perks.push(perk);
  }
  return { ...captain, perks };
}

function hasEligibleCaptainPenalty(team: Team, lockerRoom: LockerRoomState, perk: CaptainPerk): boolean {
  return lockerRoom.captains.some((captain) => captain.perks.includes(perk) && team.roster.some((player) => player.id === captain.playerId));
}

function eligibleCaptain(player: Player): boolean {
  return (
    player.ovr >= CAPTAIN_MIN_OVR &&
    player.yearsExp >= CAPTAIN_MIN_YEARS_EXP &&
    !player.holdout &&
    !player.traits.includes('holdout') &&
    !player.traits.includes('cancer')
  );
}

function compareCaptainCandidates(a: Player, b: Player): number {
  const aVocal = Number(a.traits.includes('vocal_leader'));
  const bVocal = Number(b.traits.includes('vocal_leader'));
  if (aVocal !== bVocal) return bVocal - aVocal;
  const aCaptain = Number(a.traits.includes('captain'));
  const bCaptain = Number(b.traits.includes('captain'));
  if (aCaptain !== bCaptain) return bCaptain - aCaptain;
  if (a.ovr !== b.ovr) return b.ovr - a.ovr;
  if (a.yearsExp !== b.yearsExp) return b.yearsExp - a.yearsExp;
  return a.id.localeCompare(b.id);
}

function resolveCliqueId(player: Player): CliqueId {
  const isStar = player.ovr >= CLIQUE_ASSIGNMENT_RULES.stars.minOvr
    || player.devTrait === 'star'
    || player.devTrait === 'superstar'
    || player.devTrait === 'x-factor';
  const isVet = player.age >= CLIQUE_ASSIGNMENT_RULES.vets.minAge
    || player.yearsExp >= CLIQUE_ASSIGNMENT_RULES.vets.minYearsExp;
  if (isStar) return 2;
  if (isVet) return 0;
  return 1;
}

function buildCliqueState(id: CliqueId, roster: Player[]): CliqueState {
  const cliquePlayers = roster.filter((player) => player.cliqueId === id);
  if (cliquePlayers.length === 0) {
    return {
      id,
      label: labelForClique(id),
      playerIds: [],
      cohesion: 50,
      influence: 0,
    };
  }

  const chemistryBase = average(cliquePlayers.map((player) => player.chemistry));
  const moraleBase = average(cliquePlayers.map((player) => player.morale));
  const personalityBase = average(cliquePlayers.map((player) =>
    player.personality.workEthic * 3 + player.personality.loyalty * 2 + player.personality.ambition,
  ));
  const leaderBonus = cliquePlayers.reduce((bonus, player) => {
    if (player.traits.includes('vocal_leader')) return bonus + 2;
    if (player.traits.includes('captain') || player.traits.includes('mentor')) return bonus + 1;
    return bonus;
  }, 0);
  const volatilityPenalty = cliquePlayers.reduce((penalty, player) => {
    if (player.traits.includes('cancer')) return penalty + 6;
    if (player.traits.includes('ego') || player.traits.includes('hothead') || player.holdout) return penalty + 2;
    return penalty;
  }, 0);
  const cohesion = cl(
    Math.round(chemistryBase * 0.55 + moraleBase * 0.15 + personalityBase * 0.3 + leaderBonus - volatilityPenalty),
    0,
    100,
  );
  const influence = cl(
    Math.round((cliquePlayers.length / Math.max(1, roster.length)) * 55 + average(cliquePlayers.map((player) => player.ovr)) * 0.45),
    10,
    100,
  );

  return {
    id,
    label: labelForClique(id),
    playerIds: cliquePlayers.map((player) => player.id),
    cohesion,
    influence,
  };
}

function unresolvedTensions(lockerRoom: LockerRoomState): LockerRoomTension[] {
  return lockerRoom.tensions.filter((tension) => !tension.resolved);
}

function calculateCultureScore(team: Team, lockerRoom: LockerRoomState): number {
  const roster = teamRoster(team);
  const cliques = lockerRoom.cliques.filter((clique) => clique.playerIds.length > 0);
  const totalInfluence = cliques.reduce((total, clique) => total + clique.influence, 0) || 1;
  const weightedCohesion = cliques.reduce((total, clique) => total + clique.cohesion * clique.influence, 0) / totalInfluence;
  const rosterChemistry = average(roster.map((player) => player.chemistry));
  const rosterMorale = average(roster.map((player) => player.morale));
  const captainBoost = lockerRoom.captains.length * 3 + lockerRoom.captains.reduce((total, captain) => total + captain.captainMoments, 0);
  const tensionPenalty = unresolvedTensions(lockerRoom).reduce((total, tension) => total + TENSION_PENALTIES[tension.severity], 0);

  return cl(
    Math.round(weightedCohesion * 0.6 + rosterChemistry * 0.25 + rosterMorale * 0.15 + captainBoost - tensionPenalty),
    0,
    100,
  );
}

function recalcCulture(team: Team, lockerRoom: LockerRoomState): LockerRoomState {
  const cultureScore = calculateCultureScore(team, lockerRoom);
  return {
    ...lockerRoom,
    cultureScore,
    culture: getCultureLabel(cultureScore),
  };
}

function chooseSeverity(lockerRoom: LockerRoomState, rng: PrngFn): LockerRoomTension['severity'] {
  const roll = rng();
  if (lockerRoom.cultureScore <= 30 || roll > 0.82) return 'serious';
  if (lockerRoom.cultureScore <= 55 || roll > 0.45) return 'moderate';
  return 'minor';
}

function buildTensionNarrative(type: LockerRoomTension['type'], players: Player[]): string {
  const names = players.map((player) => player.lastName).slice(0, 2);
  switch (type) {
    case 'clique_beef':
      return `${names[0] ?? 'Veterans'} and ${names[1] ?? 'the young core'} are trading shots through the week.`;
    case 'contract_envy':
      return `${names[0] ?? 'A starter'} is side-eyeing the money handed to ${names[1] ?? 'a teammate'}.`;
    case 'playing_time':
      return `${names[0] ?? 'A reserve'} is pushing harder for snaps and the room is taking notice.`;
    case 'rookie_hazing':
      return `${names[0] ?? 'A rookie'} is getting tested by the old heads.`;
    case 'star_demands':
      return `${names[0] ?? 'A star'} wants the offense tilted even further in his direction.`;
    case 'captain_challenge':
      return `${names[0] ?? 'A veteran'} is feeling the room test the captaincy ladder.`;
    default:
      return 'The room is tighter than it should be.';
  }
}

function generateTension(team: Team, lockerRoom: LockerRoomState, week: number, rng: PrngFn): LockerRoomTension | null {
  if (unresolvedTensions(lockerRoom).length >= 5) return null;

  const stars = team.roster.filter((player) => player.cliqueId === 2);
  const vets = team.roster.filter((player) => player.cliqueId === 0);
  const youngCore = team.roster.filter((player) => player.cliqueId === 1);
  const rookies = youngCore.filter((player) => player.yearsExp <= 1);
  const captains = lockerRoom.captains
    .map((captain) => team.roster.find((player) => player.id === captain.playerId))
    .filter((player): player is Player => Boolean(player));
  const ambitiousBackups = team.roster.filter((player) => !player.isStarter && player.personality.ambition >= 8);

  const candidates: LockerRoomTension['type'][] = ['clique_beef', 'contract_envy', 'playing_time'];
  if (rookies.length > 0 && vets.length > 0 && !hasEligibleCaptainPenalty(team, lockerRoom, 'hazing_shield')) {
    candidates.push('rookie_hazing');
  }
  if (stars.length > 0) candidates.push('star_demands');
  if (captains.length > 0 && team.roster.some((player) => player.id !== captains[0]?.id && (player.traits.includes('captain') || player.traits.includes('vocal_leader')))) {
    candidates.push('captain_challenge');
  }

  const chosenType = candidates[Math.floor(rng() * candidates.length)] ?? 'clique_beef';
  let involvedPlayers: Player[] = [];
  let involvedCliqueIds: CliqueId[] = [];

  switch (chosenType) {
    case 'contract_envy': {
      const star = [...stars].sort((a, b) => b.ovr - a.ovr)[0] ?? team.roster[0];
      const peer = [...team.roster]
        .filter((player) => player.id !== star?.id)
        .sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
      involvedPlayers = [star, peer].filter((player): player is Player => Boolean(player));
      involvedCliqueIds = involvedPlayers.map((player) => player.cliqueId ?? 1) as CliqueId[];
      break;
    }
    case 'playing_time': {
      const challenger = ambitiousBackups[0] ?? team.roster.find((player) => !player.isStarter) ?? team.roster[0];
      const incumbent = team.roster
        .filter((player) => player.pos === challenger?.pos && player.id !== challenger?.id)
        .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr)[0];
      involvedPlayers = [challenger, incumbent].filter((player): player is Player => Boolean(player));
      involvedCliqueIds = involvedPlayers.map((player) => player.cliqueId ?? 1) as CliqueId[];
      break;
    }
    case 'rookie_hazing':
      involvedPlayers = [rookies[0], vets[0]].filter((player): player is Player => Boolean(player));
      involvedCliqueIds = [1, 0];
      break;
    case 'star_demands':
      involvedPlayers = [stars.sort((a, b) => b.ovr - a.ovr)[0] ?? team.roster[0]].filter((player): player is Player => Boolean(player));
      involvedCliqueIds = involvedPlayers.map((player) => player.cliqueId ?? 2) as CliqueId[];
      break;
    case 'captain_challenge': {
      const captain = captains[0] ?? team.roster[0];
      const challenger = team.roster
        .filter((player) => player.id !== captain?.id && (player.traits.includes('captain') || player.traits.includes('vocal_leader')))
        .sort(compareCaptainCandidates)[0];
      involvedPlayers = [captain, challenger].filter((player): player is Player => Boolean(player));
      involvedCliqueIds = involvedPlayers.map((player) => player.cliqueId ?? 1) as CliqueId[];
      break;
    }
    case 'clique_beef':
    default:
      involvedPlayers = [vets[0] ?? team.roster[0], stars[0] ?? youngCore[0] ?? team.roster[1] ?? team.roster[0]]
        .filter((player): player is Player => Boolean(player));
      involvedCliqueIds = Array.from(new Set(involvedPlayers.map((player) => player.cliqueId ?? 1))) as CliqueId[];
      break;
  }

  if (involvedPlayers.length === 0) return null;

  return {
    id: tensionId(rng),
    type: chosenType,
    involvedPlayerIds: involvedPlayers.map((player) => player.id),
    involvedCliqueIds,
    severity: chooseSeverity(lockerRoom, rng),
    weekCreated: week,
    resolved: false,
    narrative: buildTensionNarrative(chosenType, involvedPlayers),
  };
}

export function assignCliques(roster: Player[]): Record<string, CliqueId> {
  return roster.reduce<Record<string, CliqueId>>((assignments, player) => {
    const cliqueId = resolveCliqueId(player);
    player.cliqueId = cliqueId;
    assignments[player.id] = cliqueId;
    return assignments;
  }, {});
}

export function getCultureLabel(score: number): LockerRoomState['culture'] {
  if (score <= CULTURE_THRESHOLDS.toxic.max) return 'toxic';
  if (score <= CULTURE_THRESHOLDS.fragile.max) return 'fragile';
  if (score <= CULTURE_THRESHOLDS.stable.max) return 'stable';
  if (score <= CULTURE_THRESHOLDS.strong.max) return 'strong';
  return 'elite';
}

export function syncLockerRoomRoster(team: Team, lockerRoom: LockerRoomState): LockerRoomState {
  const roster = teamRoster(team);
  assignCliques(roster);
  const playerIds = new Set(roster.map((player) => player.id));
  const cliques = (CLIQUE_TYPES.map((clique) => buildCliqueState(clique.id as CliqueId, roster)));
  const captains = lockerRoom.captains
    .filter((captain) => playerIds.has(captain.playerId))
    .map((captain) => {
      const player = roster.find((candidate) => candidate.id === captain.playerId);
      return unlockCaptainPerks(player, {
        ...captain,
        playerName: player?.name ?? captain.playerName,
      });
    });
  const tensions = lockerRoom.tensions.filter((tension) => tension.involvedPlayerIds.every((playerId) => playerIds.has(playerId)));

  return recalcCulture(team, {
    ...lockerRoom,
    cliques,
    captains,
    tensions,
  });
}

export function electCaptains(team: Team, lockerRoom: LockerRoomState, _rng: PrngFn): CaptainState[] {
  const roster = teamRoster(team);
  const eligible = [...roster].filter(eligibleCaptain).sort(compareCaptainCandidates);
  if (eligible.length === 0) return [];
  const captainCount = cl(Math.min(MAX_CAPTAINS, eligible.length, roster.length >= 18 ? 3 : roster.length >= 10 ? 2 : 1), 1, MAX_CAPTAINS);
  const selected = eligible.slice(0, captainCount);

  return selected.map((player) => ({
    playerId: player.id,
    playerName: playerDisplayName(player),
    captainMoments: 0,
    rallyCooldown: 0,
    perks: captainPerkPriority(player).slice(0, 1),
  }));
}

export function appointCaptain(team: Team, lockerRoom: LockerRoomState, playerId: string): LockerRoomState {
  const player = team.roster.find((candidate) => candidate.id === playerId);
  if (!player || !eligibleCaptain(player)) return lockerRoom;

  const withoutPlayer = lockerRoom.captains.filter((captain) => captain.playerId !== playerId);
  const nextCaptains = [
    ...withoutPlayer,
    {
      playerId: player.id,
      playerName: playerDisplayName(player),
      captainMoments: 0,
      rallyCooldown: 0,
      perks: captainPerkPriority(player).slice(0, 1),
    },
  ].sort((a, b) => compareCaptainCandidates(
    team.roster.find((candidate) => candidate.id === a.playerId) ?? player,
    team.roster.find((candidate) => candidate.id === b.playerId) ?? player,
  )).slice(0, MAX_CAPTAINS);

  return recalcCulture(team, {
    ...lockerRoom,
    captains: nextCaptains.map((captain) => unlockCaptainPerks(team.roster.find((candidate) => candidate.id === captain.playerId), captain)),
  });
}

export function initializeLockerRoom(team: Team, rng: PrngFn): LockerRoomState {
  const roster = teamRoster(team);
  assignCliques(roster);
  const base: LockerRoomState = {
    cliques: CLIQUE_TYPES.map((clique) => buildCliqueState(clique.id as CliqueId, roster)),
    captains: [],
    culture: 'stable',
    cultureScore: 50,
    tensions: [],
    lastMeetingWeek: null,
  };
  const captains = electCaptains(team, base, rng);
  return recalcCulture(team, { ...base, captains });
}

export function updateLockerRoomWeekly(
  team: Team,
  lockerRoom: LockerRoomState,
  gameResult: GameResult | null,
  rng: PrngFn,
): { lockerRoom: LockerRoomState; events: LockerRoomTension[] } {
  const synced = syncLockerRoomRoster(team, lockerRoom);
  const week = gameResult?.week ?? currentWeek(synced);
  const teamWon = gameResult
    ? (gameResult.homeTeamId === team.id ? gameResult.homeScore > gameResult.awayScore : gameResult.awayScore > gameResult.homeScore)
    : null;
  const mediaShield = synced.captains.some((captain) => captain.perks.includes('media_shield'));
  const cohesionDelta = teamWon === null ? 0 : teamWon ? 2 : mediaShield ? -1 : -2;
  const nextCliques = synced.cliques.map((clique) => ({
    ...clique,
    cohesion: cl(
      clique.cohesion
      + cohesionDelta
      + (teamWon === true && team.streak >= 3 ? 1 : 0)
      - (clique.playerIds.some((playerId) => team.roster.find((player) => player.id === playerId)?.traits.includes('cancer')) ? 6 : 0),
      0,
      100,
    ),
  }));

  let nextTensions = synced.tensions.map((tension) => {
    if (tension.resolved) return tension;
    if (week - tension.weekCreated < 4) return tension;
    return rng() < 0.25 ? { ...tension, resolved: true } : tension;
  });

  const nextState: LockerRoomState = recalcCulture(team, {
    ...synced,
    cliques: nextCliques,
    captains: synced.captains.map((captain) => ({
      ...captain,
      rallyCooldown: Math.max(0, captain.rallyCooldown - 1),
    })),
    tensions: nextTensions,
  });

  const tensionChance = unresolvedTensions(nextState).length >= 5 ? 0 : nextState.cultureScore <= 40 ? 0.15 : 0.1;
  const events: LockerRoomTension[] = [];
  if (rng() < tensionChance) {
    const tension = generateTension(team, nextState, week, rng);
    if (tension) {
      nextTensions = [...nextState.tensions, tension];
      events.push(tension);
    }
  }

  return {
    lockerRoom: recalcCulture(team, {
      ...nextState,
      tensions: nextTensions,
    }),
    events,
  };
}

export function triggerCaptainRally(
  lockerRoom: LockerRoomState,
  captainId: string,
  team: Team,
  _currentWeek = currentWeek(lockerRoom),
): LockerRoomState {
  const captain = lockerRoom.captains.find((entry) => entry.playerId === captainId);
  const player = team.roster.find((entry) => entry.id === captainId);
  if (!captain || !player || !captain.perks.includes('rally_cry') || captain.rallyCooldown > 0 || team.streak > -3) {
    return lockerRoom;
  }

  const next = {
    ...lockerRoom,
    cliques: lockerRoom.cliques.map((clique) => ({ ...clique, cohesion: cl(clique.cohesion + 5, 0, 100) })),
    captains: lockerRoom.captains.map((entry) => {
      if (entry.playerId !== captainId) return entry;
      return unlockCaptainPerks(player, {
        ...entry,
        captainMoments: entry.captainMoments + 1,
        rallyCooldown: CAPTAIN_RALLY_COOLDOWN,
      });
    }),
  };

  return recalcCulture(team, next);
}

export function callTeamMeeting(
  team: Team,
  lockerRoom: LockerRoomState,
  rng: PrngFn,
  meetingWeek = currentWeek(lockerRoom),
): { lockerRoom: LockerRoomState; narrative: string } {
  if (lockerRoom.lastMeetingWeek !== null && meetingWeek - lockerRoom.lastMeetingWeek < 4) {
    return {
      lockerRoom,
      narrative: 'The room still remembers the last meeting. It is too soon to call another one.',
    };
  }

  const activeTensions = unresolvedTensions(lockerRoom);
  if (activeTensions.length === 0) {
    const quietRoom = recalcCulture(team, {
      ...lockerRoom,
      lastMeetingWeek: meetingWeek,
      cliques: lockerRoom.cliques.map((clique) => ({ ...clique, cohesion: cl(clique.cohesion + 1, 0, 100) })),
    });
    return {
      lockerRoom: quietRoom,
      narrative: 'The captains checked the temperature, found no fire to put out, and the room steadied itself.',
    };
  }

  if (lockerRoom.culture === 'toxic' && rng() < 0.1) {
    const backfire = recalcCulture(team, {
      ...lockerRoom,
      lastMeetingWeek: meetingWeek,
      cliques: lockerRoom.cliques.map((clique) => ({ ...clique, cohesion: cl(clique.cohesion - 3, 0, 100) })),
    });
    return {
      lockerRoom: backfire,
      narrative: 'The meeting turned into finger-pointing and the room walked out tighter than before.',
    };
  }

  const resolveCount = Math.min(activeTensions.length, rng() < 0.5 ? 1 : 2);
  const resolvedIds = new Set(activeTensions.slice(0, resolveCount).map((tension) => tension.id));
  const leader = lockerRoom.captains[0];
  const leaderPlayer = team.roster.find((player) => player.id === leader?.playerId);
  const nextState = recalcCulture(team, {
    ...lockerRoom,
    lastMeetingWeek: meetingWeek,
    cliques: lockerRoom.cliques.map((clique) => ({ ...clique, cohesion: cl(clique.cohesion + 2, 0, 100) })),
    tensions: lockerRoom.tensions.map((tension) => resolvedIds.has(tension.id) ? { ...tension, resolved: true } : tension),
    captains: lockerRoom.captains.map((captain) => {
      if (!leader || captain.playerId !== leader.playerId || !leaderPlayer) return captain;
      return unlockCaptainPerks(leaderPlayer, { ...captain, captainMoments: captain.captainMoments + 1 });
    }),
  });

  return {
    lockerRoom: nextState,
    narrative: `${leader?.playerName ?? 'The captains'} called the room together and cooled off ${resolveCount} tension${resolveCount > 1 ? 's' : ''}.`,
  };
}

export function getLockerRoomGameBonus(lockerRoom: LockerRoomState): { teamOvrBonus: number; captainBonuses: Record<string, number> } {
  const teamOvrBonus = lockerRoom.culture === 'toxic'
    ? -2
    : lockerRoom.culture === 'fragile'
      ? -1
      : lockerRoom.culture === 'strong'
        ? 1
        : lockerRoom.culture === 'elite'
          ? 2
          : 0;

  const youngCoreIds = new Set(lockerRoom.cliques.find((clique) => clique.id === 1)?.playerIds ?? []);
  const captainBonuses = lockerRoom.captains.reduce<Record<string, number>>((bonuses, captain) => {
    if (!captain.perks.includes('mentor_boost')) return bonuses;
    for (const playerId of youngCoreIds) {
      bonuses[playerId] = (bonuses[playerId] ?? 0) + 1;
    }
    return bonuses;
  }, {});

  return { teamOvrBonus, captainBonuses };
}

export function getLockerRoomClutchBonuses(lockerRoom: LockerRoomState, team: Team): Record<string, number> {
  const bonuses: Record<string, number> = {};
  for (const captain of lockerRoom.captains) {
    if (!captain.perks.includes('clutch_aura')) continue;
    const captainPlayer = team.roster.find((player) => player.id === captain.playerId);
    const cliqueId = captainPlayer?.cliqueId;
    if (cliqueId === null || cliqueId === undefined) continue;
    for (const player of team.roster) {
      if (player.isStarter && player.cliqueId === cliqueId) {
        bonuses[player.id] = Math.max(bonuses[player.id] ?? 0, 1);
      }
    }
  }
  return bonuses;
}
