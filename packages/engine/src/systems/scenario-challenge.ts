import { makeContract } from './contracts';
import type {
  GameState,
  Player,
  ScenarioConstraints,
  ScenarioDefinition,
  ScenarioObjective,
  ScenarioState,
  Team,
} from '../types';
import type { PrngFn } from '../rng';

const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'rebuild',
    name: 'The Rebuild',
    tagline: 'Inherited a dumpster fire. Now light it up.',
    description: 'A stripped-down roster, no first-rounder, and almost no cap room. The job is to make the franchise relevant fast.',
    difficulty: 'pro',
    seasonLimit: 3,
    objectives: [
      { id: 'rebuild-wins', description: 'Win 10+ games in a single season', type: 'wins', target: 10, completed: false },
      { id: 'rebuild-playoffs', description: 'Make the playoffs', type: 'playoffs', target: 1, completed: false },
    ],
    bonusObjectives: [
      { id: 'rebuild-title', description: 'Win the championship', type: 'championship', target: 1, completed: false },
    ],
    constraints: {
      blockTrades: false,
      blockFreeAgency: false,
      blockDraft: false,
      forcedDifficulty: undefined,
    },
  },
  {
    id: 'cap_hell',
    name: 'Cap Hell',
    tagline: '$45M over. No picks. Aging stars. Good luck.',
    description: 'The top of the roster is expensive and old, and the draft cupboard is bare. There is no room for a lazy reset.',
    difficulty: 'all_pro',
    seasonLimit: 2,
    objectives: [
      { id: 'cap-hell-cap', description: 'Get under the salary cap', type: 'cap_space', target: 0, completed: false },
      { id: 'cap-hell-playoffs', description: 'Make the playoffs', type: 'playoffs', target: 1, completed: false },
    ],
    bonusObjectives: [
      { id: 'cap-hell-ovr', description: 'Maintain 80+ team OVR average', type: 'roster_ovr', target: 80, completed: false },
    ],
    constraints: {
      blockTrades: false,
      blockFreeAgency: false,
      blockDraft: false,
      forcedDifficulty: undefined,
    },
  },
  {
    id: 'dynasty_or_bust',
    name: 'Dynasty or Bust',
    tagline: 'Back-to-back or bust. The window is NOW.',
    description: 'The ring is fresh, the roster is loaded, and the core is aging fast. There is no patience for a soft landing.',
    difficulty: 'rookie',
    seasonLimit: 2,
    objectives: [
      { id: 'dynasty-title', description: 'Win another championship', type: 'championship', target: 1, completed: false },
    ],
    bonusObjectives: [
      { id: 'dynasty-back-to-back', description: 'Win back-to-back championships', type: 'championship', target: 2, completed: false },
    ],
    constraints: {
      blockTrades: false,
      blockFreeAgency: false,
      blockDraft: false,
      forcedDifficulty: undefined,
    },
  },
  {
    id: 'expansion',
    name: 'The Expansion',
    tagline: 'Brand new franchise. Build from nothing.',
    description: 'The roster floor is ugly, but the books are clean and the draft board belongs to you. Build credibility from scratch.',
    difficulty: 'all_pro',
    seasonLimit: 4,
    objectives: [
      { id: 'expansion-wins', description: 'Win 8+ games in a single season', type: 'wins', target: 8, completed: false },
      { id: 'expansion-playoffs', description: 'Make the playoffs', type: 'playoffs', target: 1, completed: false },
    ],
    bonusObjectives: [
      { id: 'expansion-title', description: 'Win the championship', type: 'championship', target: 1, completed: false },
    ],
    constraints: {
      blockTrades: false,
      blockFreeAgency: false,
      blockDraft: false,
      forcedDifficulty: undefined,
    },
  },
  {
    id: 'the_savant',
    name: 'The Savant',
    tagline: 'Draft only. No trades. No free agents. Pure talent evaluation.',
    description: 'The roster is merely average, but every external shortcut is blocked. You either draft a winner or live with the consequence.',
    difficulty: 'hall_of_fame',
    seasonLimit: 5,
    objectives: [
      { id: 'savant-title', description: 'Win a championship using only the draft', type: 'championship', target: 1, completed: false },
    ],
    bonusObjectives: [
      { id: 'savant-ovr', description: 'Build an 85+ OVR roster through drafting alone', type: 'roster_ovr', target: 85, completed: false },
    ],
    constraints: {
      blockTrades: true,
      blockFreeAgency: true,
      blockDraft: false,
      forcedDifficulty: undefined,
    },
  },
];

function cloneScenario<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findUserTeam(gameState: GameState): Team {
  const team = Object.values(gameState.teams).find((entry) => entry.isUser);
  if (!team) {
    throw new Error('Scenario start requires a user team.');
  }
  return team;
}

function averageOvr(team: Team): number {
  if (team.roster.length === 0) return 0;
  return team.roster.reduce((sum, player) => sum + player.ovr, 0) / team.roster.length;
}

function tunePlayer(player: Player, targetOvr: number, age: number): void {
  player.ovr = targetOvr;
  player.pot = Math.max(player.ovr, targetOvr + 3);
  player.age = age;
  player.ratings = Object.fromEntries(
    Object.entries(player.ratings).map(([key]) => [key, targetOvr]),
  );
}

function rebuildContracts(team: Team, salaryBase: number, years = 3): void {
  team.capUsed = 0;
  for (const player of team.roster) {
    player.contract = makeContract(
      Math.max(1, Math.round((salaryBase + player.ovr / 12) * 10) / 10),
      years,
      Math.max(1, Math.round((salaryBase * 0.4) * 10) / 10),
      Math.max(1, Math.round((salaryBase * 0.7) * 10) / 10),
      player.id,
      team.id,
    );
    team.capUsed += player.contract.baseSalary + player.contract.prorated;
  }
  team.capUsed = Math.round(team.capUsed * 10) / 10;
}

function ensureDraftCapital(team: Team, year: number): void {
  team.draftPicks = Array.from({ length: 7 }, (_, index) => ({
    round: index + 1,
    pick: 16 + index,
    originalTeamId: team.id,
    currentTeamId: team.id,
    year,
    isCompPick: false,
  }));
}

function applyRebuild(team: Team, year: number): void {
  team.roster.forEach((player, index) => {
    tunePlayer(player, Math.max(67, 76 - index), 24 + (index % 5));
  });
  team.draftPicks = team.draftPicks.filter((pick) => !(pick.year === year && pick.round === 1));
  rebuildContracts(team, 5.5, 2);
  team.capSpace = 8;
  team.capUsed = 242;
  team.wins = 2;
  team.losses = 14;
}

function applyCapHell(team: Team, year: number): void {
  team.roster.forEach((player, index) => {
    const ovr = index < 3 ? 92 - index : Math.max(72, 82 - index);
    const age = index < 5 ? 32 + (index % 3) : 27 + (index % 5);
    tunePlayer(player, ovr, age);
  });
  team.draftPicks = team.draftPicks.filter((pick) => !(pick.year === year && (pick.round === 1 || pick.round === 2)));
  team.capUsed = 295;
  team.capSpace = -45;
  for (const [index, player] of team.roster.entries()) {
    player.contract = makeContract(index < 3 ? 24 + index : 8 + player.ovr / 14, 4, 10, 18, player.id, team.id);
  }
}

function applyDynasty(team: Team, gameState: GameState): void {
  team.roster.forEach((player, index) => {
    const ovr = Math.max(84, 95 - index);
    const age = index === 0 ? 36 : index < 5 ? 31 + (index % 3) : 27 + (index % 4);
    tunePlayer(player, ovr, age);
  });
  rebuildContracts(team, 12, 3);
  team.capSpace = 12;
  team.capUsed = 238;
  gameState.franchiseHistory.push({
    year: gameState.year - 1,
    teamId: team.id,
    wins: 14,
    losses: 3,
    ties: 0,
    record: '14-3',
    pointDifferential: 142,
    playoffFinish: 'champion',
    awardsWon: [],
    recordsBroken: [],
    majorEvents: ['Won the championship'],
  });
}

function applyExpansion(team: Team, year: number): void {
  team.roster.forEach((player, index) => {
    tunePlayer(player, Math.max(62, 71 - index), 24 + (index % 6));
  });
  ensureDraftCapital(team, year);
  rebuildContracts(team, 4.5, 2);
  team.capSpace = 95;
  team.capUsed = 155;
  team.wins = 0;
  team.losses = 0;
}

function applySavant(team: Team, year: number): void {
  team.roster.forEach((player, index) => {
    tunePlayer(player, Math.max(72, 80 - index), 24 + (index % 5));
  });
  ensureDraftCapital(team, year);
  rebuildContracts(team, 6.5, 3);
  team.capSpace = 32;
  team.capUsed = 218;
}

function evaluateObjective(gameState: GameState, team: Team, objective: ScenarioObjective): boolean {
  switch (objective.type) {
    case 'wins':
      return team.wins >= objective.target;
    case 'playoffs':
      return Boolean(
        gameState.playoffBracket &&
        [...gameState.playoffBracket.afc, ...gameState.playoffBracket.nfc].some((seed) => seed.teamId === team.id),
      );
    case 'championship':
      return gameState.playoffBracket?.championTeamId === team.id;
    case 'cap_space':
      return team.capSpace >= objective.target;
    case 'roster_ovr':
      return averageOvr(team) >= objective.target;
    default:
      return false;
  }
}

function updateObjectives(gameState: GameState, team: Team, objectives: ScenarioObjective[]): ScenarioObjective[] {
  return objectives.map((objective) => ({
    ...objective,
    completed: evaluateObjective(gameState, team, objective),
  }));
}

export function getAvailableScenarios(): ScenarioDefinition[] {
  return cloneScenario(SCENARIO_DEFINITIONS);
}

export function startScenario(
  scenarioId: string,
  baseGameState: GameState,
  _rng: PrngFn,
): GameState {
  const scenario = getAvailableScenarios().find((entry) => entry.id === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario ${scenarioId}.`);
  }

  const nextState = cloneScenario(baseGameState);
  const userTeam = findUserTeam(nextState);

  if (scenario.id === 'rebuild') applyRebuild(userTeam, nextState.year);
  if (scenario.id === 'cap_hell') applyCapHell(userTeam, nextState.year);
  if (scenario.id === 'dynasty_or_bust') applyDynasty(userTeam, nextState);
  if (scenario.id === 'expansion') applyExpansion(userTeam, nextState.year);
  if (scenario.id === 'the_savant') applySavant(userTeam, nextState.year);

  for (const player of userTeam.roster) {
    player.teamId = userTeam.id;
    nextState.players[player.id] = player;
  }

  if (scenario.constraints.forcedDifficulty) {
    nextState.difficulty = scenario.constraints.forcedDifficulty;
  }

  nextState.scenarioState = {
    activeScenario: scenario,
    scenarioSeason: 1,
    completedScenarios: cloneScenario(baseGameState.scenarioState?.completedScenarios ?? []),
  };
  return nextState;
}

export function checkScenarioProgress(gameState: GameState): ScenarioState {
  const state = gameState.scenarioState;
  if (!state?.activeScenario) {
    return state ?? {
      activeScenario: undefined,
      scenarioSeason: 1,
      completedScenarios: [],
    };
  }

  const userTeam = findUserTeam(gameState);
  const activeScenario = {
    ...state.activeScenario,
    objectives: updateObjectives(gameState, userTeam, state.activeScenario.objectives),
    bonusObjectives: updateObjectives(gameState, userTeam, state.activeScenario.bonusObjectives),
  };
  gameState.scenarioState = {
    ...state,
    activeScenario,
  };
  return gameState.scenarioState;
}

export function gradeScenarioCompletion(state: ScenarioState): { score: number; grade: string } {
  const scenario = state.activeScenario;
  if (!scenario) return { score: 0, grade: 'F' };

  const primaryComplete = scenario.objectives.filter((objective) => objective.completed).length;
  const bonusComplete = scenario.bonusObjectives.filter((objective) => objective.completed).length;
  const primaryScore = scenario.objectives.length === 0
    ? 60
    : Math.round((primaryComplete / scenario.objectives.length) * 60);
  const bonusScore = scenario.bonusObjectives.length === 0
    ? 0
    : Math.round((bonusComplete / scenario.bonusObjectives.length) * 20);
  const efficiencyScore = primaryComplete === scenario.objectives.length
    ? Math.round(((scenario.seasonLimit - state.scenarioSeason) / Math.max(1, scenario.seasonLimit - 1)) * 20)
    : 0;
  const score = Math.max(0, Math.min(100, primaryScore + bonusScore + efficiencyScore));

  if (score >= 95) return { score, grade: 'S' };
  if (score >= 85) return { score, grade: 'A' };
  if (score >= 75) return { score, grade: 'B' };
  if (score >= 65) return { score, grade: 'C' };
  if (score >= 50) return { score, grade: 'D' };
  return { score, grade: 'F' };
}

export function advanceScenarioSeason(
  gameState: GameState,
): { gameOver: boolean; result?: { score: number; grade: string } } {
  const state = gameState.scenarioState;
  if (!state?.activeScenario) return { gameOver: false };

  const updated = checkScenarioProgress(gameState);
  const scenario = updated.activeScenario!;
  const primaryComplete = scenario.objectives.every((objective) => objective.completed);
  const atLimit = updated.scenarioSeason >= scenario.seasonLimit;

  if (primaryComplete || atLimit) {
    const result = gradeScenarioCompletion(updated);
    const completedScenarios = [
      ...updated.completedScenarios.filter((entry) => entry.id !== scenario.id),
      { id: scenario.id, score: result.score, grade: result.grade },
    ];
    gameState.scenarioState = {
      activeScenario: undefined,
      scenarioSeason: updated.scenarioSeason,
      completedScenarios,
    };
    return { gameOver: true, result };
  }

  gameState.scenarioState = {
    ...updated,
    scenarioSeason: updated.scenarioSeason + 1,
  };
  return { gameOver: false };
}

export function getScenarioConstraints(gameState: GameState): ScenarioConstraints | null {
  return gameState.scenarioState?.activeScenario?.constraints ?? null;
}
