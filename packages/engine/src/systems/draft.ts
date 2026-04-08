import { createEmptySeasonStats, emptyPlayerStats } from './season-stats';
import { buildSeasonSchedule } from './season-schedule';
import {
  assignProspectRegion,
  buildActionNote,
  buildInitialScoutingState,
  normalizeScoutingState,
  resolvePrivateWorkout,
  tightenVisibleGrade,
} from './advanced-scouting';
import { makeContract } from './contracts';
import { rookieSlotContract } from '../config/rookie-slots';
import { recordDynastyEvent } from './dynasty-timeline';
import { generateDraftRecap } from './draft-recap';
import { applyFacilityBonuses } from './facilities';
import { syncPlayerArchiveEntry } from './history';
import { assignJerseyNumber } from './jersey-retirement';
import { getActiveRule } from './league-rules';
import { recordNewsItem } from './league-news';
import { initializeLockerRoom, syncLockerRoomRoster } from './locker-room';
import { createNearMissTracker, recordPassedPick } from './near-miss-receipts';
import { createTransactionalPressConference, recordPressConference } from './press-conference';
import { applyScoutAccuracy, bestScoutForProspect, runCombine } from './scouting-staff';
import { mulberry32 } from '../rng';
import type {
  DraftPick,
  DraftProspect,
  EngineOutput,
  GameState,
  Player,
  ScoutingAction,
  Team,
} from '../types';

const FIRST_NAMES = ['Jalen', 'Tyrese', 'Malik', 'Cam', 'Bryce', 'Jordan', 'Caleb', 'Micah', 'Cooper', 'Trevor'];
const LAST_NAMES = ['Carter', 'Daniels', 'Brooks', 'Turner', 'Parker', 'Walker', 'Mitchell', 'Hayes', 'Bennett', 'Ward'];
const COLLEGES = ['Texas', 'Georgia', 'Michigan', 'Oregon', 'LSU', 'Ohio State', 'Miami', 'Washington'];
const POSITIONS: Player['pos'][] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
const DRAFT_POSITION_PREMIUM: Partial<Record<Player['pos'], number>> = {
  QB: 12,
  OL: 4,
};

function cloneGame(game: GameState): GameState {
  return structuredClone(game);
}

function refreshRosterState(team: Team): void {
  for (const player of team.roster) {
    assignJerseyNumber(team, player);
  }
  team.lockerRoom = syncLockerRoomRoster(team, team.lockerRoom ?? initializeLockerRoom(team, () => 0.42));
}

function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function ensureNearMissTracker(game: GameState) {
  game.nearMissTracker ??= createNearMissTracker();
  return game.nearMissTracker;
}

function getDraftRounds(game: GameState | null, year: number): number {
  if (!game?.leagueRules) return 7;
  return Number(getActiveRule(game.leagueRules, 'draft_rounds', year));
}

function makeDraftPicks(teamId: string, year: number, rounds = 7): DraftPick[] {
  return Array.from({ length: rounds }, (_, index) => ({
    round: index + 1,
    pick: index + 1,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  }));
}

function rngForClass(seed: number, year: number) {
  return mulberry32((seed ^ (year * 7919)) >>> 0);
}

function nextInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function makeProspect(game: GameState, rand: () => number, index: number): DraftProspect {
  const pos = POSITIONS[nextInt(rand, 0, POSITIONS.length - 1)] ?? 'WR';
  const trueGrade = nextInt(rand, 65, 92);
  const scoutGrade = Math.max(55, trueGrade - nextInt(rand, 3, 10));
  const firstName = FIRST_NAMES[nextInt(rand, 0, FIRST_NAMES.length - 1)] ?? 'Jalen';
  const lastName = LAST_NAMES[nextInt(rand, 0, LAST_NAMES.length - 1)] ?? 'Carter';
  const college = COLLEGES[nextInt(rand, 0, COLLEGES.length - 1)] ?? 'Texas';

  return {
    id: `prospect-${game.year}-${index}`,
    firstName,
    lastName,
    pos,
    college,
    region: assignProspectRegion(college),
    ratings: { awareness: trueGrade, speed: Math.min(99, trueGrade + nextInt(rand, -5, 5)), stamina: Math.min(99, trueGrade + nextInt(rand, -4, 6)) },
    projectedRound: Math.min(7, Math.max(1, Math.ceil((93 - trueGrade) / 4))),
    scoutGrade,
    trueGrade,
    personality: {
      workEthic: nextInt(rand, 4, 10),
      loyalty: nextInt(rand, 3, 9),
      greed: nextInt(rand, 2, 8),
      pressure: nextInt(rand, 3, 9),
      ambition: nextInt(rand, 5, 10),
    },
    traits: [],
    archetype: null,
    characterArchetype: trueGrade >= 85 ? 'ceiling' : 'balanced',
    bustProbability: Math.round(rand() * 30) / 100,
    stealProbability: Math.round(rand() * 20) / 100,
    scoutingReports: [],
    combine: null,
  };
}

export function ensureDraftClass(game: GameState): void {
  if (game.draftClass.length > 0) return;
  const pickCount = Object.values(game.teams)
    .flatMap((team) => team.draftPicks)
    .filter((pick) => pick.year === game.year).length;
  const rand = rngForClass(game.seed, game.year);
  const count = Math.max(64, pickCount + 24);
  game.draftClass = Array.from({ length: count }, (_, index) => makeProspect(game, rand, index + 1))
    .sort((a, b) => b.trueGrade - a.trueGrade || a.id.localeCompare(b.id));
  runCombine(game, rand);
}

function prospectToPlayer(prospect: DraftProspect, teamId: string, year: number, round: number, pick: number): Player {
  const deal = rookieSlotContract(round, pick);
  return {
    id: prospect.id,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    name: `${prospect.firstName} ${prospect.lastName}`,
    pos: prospect.pos,
    age: 22,
    ovr: prospect.trueGrade,
    pot: Math.min(99, prospect.trueGrade + 6),
    ratings: prospect.ratings,
    devTrait: prospect.trueGrade >= 88 ? 'star' : 'normal',
    personality: prospect.personality,
    traits: prospect.traits,
    archetype: prospect.archetype,
    contract: makeContract(
      deal.salary,
      deal.years,
      deal.signingBonus,
      deal.guaranteed,
      prospect.id,
      teamId,
    ),
    teamId,
    draftYear: year,
    draftRound: round,
    draftPick: pick,
    college: prospect.college,
    yearsExp: 0,
    careerStats: { seasons: 0, gp: 0, snaps: 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 72,
    chemistry: 60,
    systemFit: 60,
    cliqueId: null,
    jerseyNumber: 0,
    endorsements: [],
    isStarter: false,
    role: 'Rookie',
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: emptyPlayerStats(),
  };
}

function removeUsedPick(team: Team, year: number, round: number, pick: number, originalTeamId: string): void {
  const index = team.draftPicks.findIndex((entry) =>
    entry.year === year &&
    entry.round === round &&
    entry.pick === pick &&
    entry.originalTeamId === originalTeamId,
  );
  if (index !== -1) {
    team.draftPicks.splice(index, 1);
  }
}

export function runScoutingAction(game: GameState, prospectId: string, action: ScoutingAction): EngineOutput {
  const nextState = cloneGame(game);
  const prospect = nextState.draftClass.find((entry) => entry.id === prospectId);
  if (!prospect || !nextState.offseasonState) {
    return { nextState, events: [], consequences: [] };
  }

  const scout = bestScoutForProspect(nextState, prospect);
  const current = nextState.offseasonState.scoutingState[prospectId]
    ? normalizeScoutingState(prospect, nextState.offseasonState.scoutingState[prospectId]!)
    : buildInitialScoutingState(prospect, scout);

  if (!current.actions.includes(action)) {
    const scoutingBonus = applyFacilityBonuses(findUserTeam(nextState) ?? Object.values(nextState.teams)[0]!).scoutingBonus;
    if (action === 'private_workout') {
      const workout = resolvePrivateWorkout(prospect, current, nextState.scoutingDepartment.privateWorkoutsRemaining);
      nextState.scoutingDepartment.privateWorkoutsRemaining = workout.remainingWorkouts;
      nextState.offseasonState.scoutingState[prospectId] = normalizeScoutingState(prospect, {
        ...workout.nextState,
        assignedScoutId: scout?.id ?? workout.nextState.assignedScoutId,
        visibleScoutGrade: tightenVisibleGrade(workout.nextState.visibleScoutGrade, prospect.trueGrade, workout.nextState.accuracy),
      });
    } else {
      const bonus = action === 'film' ? 0.16 : action === 'combine' ? 0.22 : 0.14;
      const accuracy = Math.min(0.95, current.accuracy + bonus + (scout?.accuracy ?? 0) * 0.1);
      const nextScoutingState = normalizeScoutingState(prospect, {
        ...current,
        actions: [...current.actions, action],
        accuracy,
        assignedScoutId: scout?.id ?? current.assignedScoutId,
        visibleScoutGrade: scout
          ? applyScoutAccuracy(prospect, scout, randForAction(action, prospectId), scoutingBonus)
          : tightenVisibleGrade(current.visibleScoutGrade, prospect.trueGrade, accuracy),
        notes: [...current.notes, buildActionNote(prospect, action)],
      });
      nextState.offseasonState.scoutingState[prospectId] = nextScoutingState;
    }
  }

  return { nextState, events: [], consequences: [] };
}

export function runPrivateWorkout(game: GameState, prospectId: string): EngineOutput {
  return runScoutingAction(game, prospectId, 'private_workout');
}

function randForAction(action: ScoutingAction, prospectId: string): () => number {
  const seed = [...`${action}:${prospectId}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rand = mulberry32(seed >>> 0);
  return () => rand();
}

function bestProspectForTeam(game: GameState, team: Team): DraftProspect | null {
  const weakestPosition = team.roster
    .reduce<Record<string, number>>((acc, player) => {
      acc[player.pos] = Math.min(acc[player.pos] ?? 99, player.ovr);
      return acc;
    }, {});

  return [...game.draftClass]
    .sort((a, b) => {
      const aNeed = 90 - (weakestPosition[a.pos] ?? 60);
      const bNeed = 90 - (weakestPosition[b.pos] ?? 60);
      const aPremium = DRAFT_POSITION_PREMIUM[a.pos] ?? 0;
      const bPremium = DRAFT_POSITION_PREMIUM[b.pos] ?? 0;
      return (b.trueGrade + bNeed + bPremium) - (a.trueGrade + aNeed + aPremium) || a.id.localeCompare(b.id);
    })[0] ?? null;
}

function applyDraftSelection(game: GameState, teamId: string, prospectId: string): void {
  if (!game.offseasonState) return;
  const draftEntry = game.offseasonState.draftOrder[game.offseasonState.currentDraftPickIndex];
  const team = game.teams[teamId];
  const prospectIndex = game.draftClass.findIndex((entry) => entry.id === prospectId);
  if (!draftEntry || !team || prospectIndex === -1) return;

  const [prospect] = game.draftClass.splice(prospectIndex, 1);
  if (!prospect) return;

  const rookie = prospectToPlayer(prospect, teamId, game.year, draftEntry.round, draftEntry.pick);
  team.roster.push(rookie);
  game.players[rookie.id] = rookie;
  refreshRosterState(team);
  syncPlayerArchiveEntry(game, rookie, game.year);
  removeUsedPick(team, game.year, draftEntry.round, draftEntry.pick, draftEntry.originalTeamId);
  game.offseasonState.completedDraftPickIds.push(draftEntry.id);
  game.offseasonState.currentDraftPickIndex += 1;
  recordNewsItem(game, {
    id: `draft-${rookie.id}-${game.year}`,
    year: game.year,
    week: game.week,
    type: 'draft',
    headline: `${team.city} drafts ${rookie.name}`,
    body: `${team.city} ${team.name} selects ${rookie.name} in Round ${draftEntry.round}, Pick ${draftEntry.pick}.`,
    teamIds: [team.id],
    playerIds: [rookie.id],
    importance: draftEntry.round === 1 ? 'breaking' : draftEntry.round <= 3 ? 'major' : 'minor',
  });
  if (draftEntry.round <= 2) {
    recordDynastyEvent(game, {
      id: `draft-dynasty-${rookie.id}-${game.year}`,
      year: game.year,
      week: game.week,
      type: 'draft_pick',
      headline: `${team.city} drafts ${rookie.name} in Round ${draftEntry.round}`,
      importance: draftEntry.round === 1 ? 'major' : 'minor',
      playerIds: [rookie.id],
      teamIds: [team.id],
    });
  }
}

function queuePassedPickTarget(
  game: GameState,
  selectedProspect: DraftProspect,
): void {
  if (!game.offseasonState) return;
  const currentEntry = game.offseasonState.draftOrder[game.offseasonState.currentDraftPickIndex];
  const userTeam = findUserTeam(game);
  if (!currentEntry || !userTeam || currentEntry.teamId !== userTeam.id) return;

  const bypassedProspect = [...game.draftClass]
    .filter((prospect) => prospect.id !== selectedProspect.id && prospect.trueGrade > selectedProspect.trueGrade)
    .sort((a, b) => b.trueGrade - a.trueGrade || a.id.localeCompare(b.id))[0] ?? null;

  if (!bypassedProspect) return;

  game.pendingPassedPickTargets ??= [];
  if (game.pendingPassedPickTargets.some((target) => target.prospectId === bypassedProspect.id)) {
    return;
  }

  game.pendingPassedPickTargets.push({
    prospectId: bypassedProspect.id,
    playerName: `${bypassedProspect.firstName} ${bypassedProspect.lastName}`,
    playerOvr: bypassedProspect.trueGrade,
    round: currentEntry.round,
    pickNumber: currentEntry.pick,
  });
}

function recordPendingPassedPick(game: GameState, team: Team, prospect: DraftProspect): void {
  const pendingIndex = game.pendingPassedPickTargets?.findIndex((target) => target.prospectId === prospect.id) ?? -1;
  if (pendingIndex < 0 || !game.pendingPassedPickTargets) return;

  const [pending] = game.pendingPassedPickTargets.splice(pendingIndex, 1);
  if (!pending) return;

  recordPassedPick(ensureNearMissTracker(game), {
    playerName: pending.playerName,
    playerOvr: pending.playerOvr,
    round: pending.round,
    pickNumber: pending.pickNumber,
    draftedByTeam: `${team.city} ${team.name}`,
  });
}

export function makeDraftPick(game: GameState, prospectId: string): EngineOutput {
  const nextState = cloneGame(game);
  const userTeam = findUserTeam(nextState);
  if (!nextState.offseasonState || !userTeam) {
    return { nextState, events: [], consequences: [] };
  }

  const drafted = nextState.draftClass.find((prospect) => prospect.id === prospectId) ?? null;
  if (drafted) {
    queuePassedPickTarget(nextState, drafted);
  }
  applyDraftSelection(nextState, userTeam.id, prospectId);
  if (drafted) {
    const conference = createTransactionalPressConference({
      game: nextState,
      teamId: userTeam.id,
      type: 'post_draft',
      topic: `${userTeam.city} presents ${drafted.firstName} ${drafted.lastName} as the newest addition.`,
      speaker: userTeam.staff.hc?.name ?? 'Head Coach',
    });
    recordPressConference(nextState, conference);
  }
  if (nextState.offseasonState.currentDraftPickIndex >= nextState.offseasonState.draftOrder.length) {
    nextState.phase = 'post_draft';
  }

  return { nextState, events: [], consequences: [] };
}

export function advanceDraft(game: GameState): void {
  if (!game.offseasonState) return;
  const userTeam = findUserTeam(game);

  while (game.offseasonState.currentDraftPickIndex < game.offseasonState.draftOrder.length) {
    const entry = game.offseasonState.draftOrder[game.offseasonState.currentDraftPickIndex]!;
    if (userTeam && entry.teamId === userTeam.id) {
      return;
    }

    const team = game.teams[entry.teamId];
    const prospect = team ? bestProspectForTeam(game, team) : null;
    if (!team || !prospect) {
      game.offseasonState.currentDraftPickIndex += 1;
      continue;
    }

    recordPendingPassedPick(game, team, prospect);
    applyDraftSelection(game, team.id, prospect.id);
  }

  game.phase = 'post_draft';
}

export function finalizePostDraft(game: GameState): void {
  const recaps = game.draftRecaps ?? [];
  game.draftRecaps = Object.values(game.teams).reduce<NonNullable<GameState['draftRecaps']>>((acc, team) => {
    const recap = generateDraftRecap(game, team.id);
    if (!recap) return acc;
    const filtered = acc.filter((entry) => !(entry.teamId === team.id && entry.year === recap.year));
    return [...filtered, recap];
  }, recaps);

  for (const team of Object.values(game.teams)) {
    team.wins = 0;
    team.losses = 0;
    team.ties = 0;
    team.streak = 0;
    team.seasonStats = createEmptySeasonStats();
    team.draftPicks = makeDraftPicks(team.id, game.year + 1, getDraftRounds(game, game.year));

    for (const player of team.roster) {
      player.age += 1;
      player.yearsExp += 1;
      player.injury = null;
      player.stats = emptyPlayerStats();
      game.players[player.id] = player;
    }
  }

  for (const playerId of game.freeAgents) {
    const player = game.players[playerId];
    if (!player) continue;
    player.age += 1;
    player.yearsExp += 1;
    player.injury = null;
    player.stats = emptyPlayerStats();
  }

  game.schedule = buildSeasonSchedule(Object.keys(game.teams), game.year, game);
  game.weekSummaries = [];
  game.playoffBracket = null;
  game.offseasonState = null;
  game.draftClass = [];
  game.phase = 'training_camp';
  game.week = 1;
}
