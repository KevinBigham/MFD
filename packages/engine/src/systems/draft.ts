import { createEmptySeasonStats, emptyPlayerStats } from './season-stats';
import { makeContract } from './contracts';
import { recordDynastyEvent } from './dynasty-timeline';
import { applyFacilityBonuses } from './facilities';
import { syncPlayerArchiveEntry } from './history';
import { recordNewsItem } from './league-news';
import { createTransactionalPressConference, recordPressConference } from './press-conference';
import { applyScoutAccuracy, bestScoutForProspect, runCombine, runProDay } from './scouting-staff';
import { mulberry32 } from '../rng';
import type {
  DraftPick,
  DraftProspect,
  EngineOutput,
  GameState,
  Player,
  ScoutingAction,
  ScheduleWeek,
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
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function makeSchedule(teamIds: string[]): ScheduleWeek[] {
  const teams = [...teamIds].sort();
  const weeks: ScheduleWeek[] = [];
  const working = [...teams];

  for (let week = 1; week <= 18; week++) {
    const games = [];
    for (let i = 0; i < working.length / 2; i++) {
      const home = week % 2 === 0 ? working[working.length - 1 - i]! : working[i]!;
      const away = week % 2 === 0 ? working[i]! : working[working.length - 1 - i]!;
      games.push({
        homeTeamId: home,
        awayTeamId: away,
        result: null,
      });
    }

    weeks.push({ week, games });
    const fixed = working[0]!;
    const rotated = [fixed, working[working.length - 1]!, ...working.slice(1, -1)];
    working.splice(0, working.length, ...rotated);
  }

  return weeks;
}

function makeDraftPicks(teamId: string, year: number): DraftPick[] {
  return Array.from({ length: 7 }, (_, index) => ({
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

  return {
    id: `prospect-${game.year}-${index}`,
    firstName,
    lastName,
    pos,
    college: COLLEGES[nextInt(rand, 0, COLLEGES.length - 1)] ?? 'Texas',
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

function rookieContract(round: number): { salary: number; years: number; signingBonus: number; guaranteed: number } {
  const salary = Math.max(1, 8 - round * 0.7);
  return {
    salary: Math.round(salary * 10) / 10,
    years: round <= 3 ? 4 : 3,
    signingBonus: Math.round(Math.max(0.5, salary * 0.35) * 10) / 10,
    guaranteed: Math.round(Math.max(0.5, salary * (round <= 2 ? 2.2 : 1.2)) * 10) / 10,
  };
}

function prospectToPlayer(prospect: DraftProspect, teamId: string, year: number, round: number): Player {
  const deal = rookieContract(round);
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
    draftPick: 1,
    college: prospect.college,
    yearsExp: 0,
    careerStats: { seasons: 0, gp: 0, snaps: 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 72,
    chemistry: 60,
    systemFit: 60,
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

function makeScoutingNote(action: ScoutingAction, prospect: DraftProspect): string {
  if (action === 'film') return `${prospect.lastName} flashes ${prospect.pos} instincts on tape.`;
  if (action === 'combine') return `${prospect.lastName} tested like an ${prospect.trueGrade >= 85 ? 'elite' : 'solid'} athlete.`;
  return `${prospect.lastName} interviewed as a ${prospect.personality.workEthic >= 7 ? 'high-motor' : 'volatile'} competitor.`;
}

export function runScoutingAction(game: GameState, prospectId: string, action: ScoutingAction): EngineOutput {
  const nextState = cloneGame(game);
  const prospect = nextState.draftClass.find((entry) => entry.id === prospectId);
  if (!prospect || !nextState.offseasonState) {
    return { nextState, events: [], consequences: [] };
  }

  const current = nextState.offseasonState.scoutingState[prospectId] ?? {
    prospectId,
    actions: [] as ScoutingAction[],
    accuracy: 0,
    visibleScoutGrade: prospect.scoutGrade,
    notes: [] as string[],
    proDayRating: null,
  };

  if (!current.actions.includes(action)) {
    const scout = bestScoutForProspect(nextState, prospect);
    const scoutingBonus = applyFacilityBonuses(findUserTeam(nextState) ?? Object.values(nextState.teams)[0]!).scoutingBonus;
    const bonus = action === 'film' ? 0.16 : action === 'combine' ? 0.22 : 0.14;
    current.actions.push(action);
    current.accuracy = Math.min(0.95, current.accuracy + bonus + (scout?.accuracy ?? 0) * 0.1);
    current.visibleScoutGrade = scout
      ? applyScoutAccuracy(prospect, scout, randForAction(action, prospectId), scoutingBonus)
      : Math.round(((prospect.scoutGrade * (1 - current.accuracy)) + (prospect.trueGrade * current.accuracy)) * 10) / 10;
    current.notes.push(makeScoutingNote(action, prospect));
    if (action === 'combine' && prospect.combine) {
      current.notes.push(`Combine: ${prospect.combine.fortyYard}s 40 // ${prospect.combine.vertical}" vertical.`);
    }
    if (action === 'interview') {
      const proDay = runProDay(nextState, prospectId, randForAction('interview', prospectId));
      nextState.offseasonState = proDay.nextState.offseasonState;
      current.proDayRating = nextState.offseasonState?.scoutingState[prospectId]?.proDayRating ?? current.proDayRating;
    }
  }

  if (nextState.offseasonState) {
    nextState.offseasonState.scoutingState[prospectId] = current;
  }
  return { nextState, events: [], consequences: [] };
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

  const rookie = prospectToPlayer(prospect, teamId, game.year, draftEntry.round);
  team.roster.push(rookie);
  game.players[rookie.id] = rookie;
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

export function makeDraftPick(game: GameState, prospectId: string): EngineOutput {
  const nextState = cloneGame(game);
  const userTeam = findUserTeam(nextState);
  if (!nextState.offseasonState || !userTeam) {
    return { nextState, events: [], consequences: [] };
  }

  const drafted = nextState.draftClass.find((prospect) => prospect.id === prospectId) ?? null;
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

    applyDraftSelection(game, team.id, prospect.id);
  }

  game.phase = 'post_draft';
}

export function finalizePostDraft(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    team.wins = 0;
    team.losses = 0;
    team.ties = 0;
    team.streak = 0;
    team.seasonStats = createEmptySeasonStats();
    team.draftPicks = makeDraftPicks(team.id, game.year + 1);

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

  game.schedule = makeSchedule(Object.keys(game.teams));
  game.weekSummaries = [];
  game.playoffBracket = null;
  game.offseasonState = null;
  game.draftClass = [];
  game.phase = 'preseason';
  game.week = 1;
}
