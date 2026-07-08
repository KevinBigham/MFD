import type { WeeklyDialogueVariant } from './dialogue/weekly';

export type ChipGuidanceConfidence = 'high' | 'medium' | 'low';

export interface ChipRecommendedAction {
  id: string;
  label: string;
  route: string;
  reason: string;
  priority: number;
}

export interface ChipFeatureLink {
  label: string;
  route: string;
}

export interface ChipWeeklyGuidance {
  headline: string;
  record: string;
  memoryCallbacks: string[];
  whatChanged: string[];
  whyItMatters: string;
  recommendedActions: ChipRecommendedAction[];
  risks: string[];
  featureLinks: ChipFeatureLink[];
  confidence: ChipGuidanceConfidence;
}

export interface BuildWeeklyGuidanceInput {
  currentWeek: number;
  currentSeason: number;
  phase: string;
  outcome: WeeklyDialogueVariant;
  record?: string;
  opponentName?: string | null;
  injuredStarterCount: number;
  injuryCount: number;
  capSpace: number;
  ownerMood: number;
  chemistry: number;
  pendingDecisions: number;
  hasGamePlan: boolean;
  difficulty?: string | null;
  memoryCallbacks?: string[];
}

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | null {
  return value && typeof value === 'object' ? value as LooseRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function userTeamFromGame(game: LooseRecord | null): LooseRecord | null {
  const teams = asRecord(game?.teams);
  if (!teams) return null;
  return Object.values(teams).map(asRecord).find((team) => team?.isUser === true) ?? null;
}

function latestSummaryFromGame(game: LooseRecord | null): LooseRecord | null {
  const summaries = asArray(game?.weekSummaries).map(asRecord).filter((entry): entry is LooseRecord => entry !== null);
  return summaries.at(-1) ?? null;
}

function teamLabel(game: LooseRecord | null, teamId: string): string {
  const team = asRecord(asRecord(game?.teams)?.[teamId]);
  if (!team) return teamId;
  return `${stringValue(team.city)} ${stringValue(team.name)}`.trim() || stringValue(team.abbr, teamId);
}

function rosterFromTeam(team: LooseRecord | null): LooseRecord[] {
  return asArray(team?.roster).map(asRecord).filter((player): player is LooseRecord => player !== null);
}

function countInjured(roster: readonly LooseRecord[]): { injuryCount: number; injuredStarterCount: number } {
  let injuryCount = 0;
  let injuredStarterCount = 0;
  for (const player of roster) {
    if (!player.injury) continue;
    injuryCount += 1;
    if (player.isStarter === true) injuredStarterCount += 1;
  }
  return { injuryCount, injuredStarterCount };
}

function deriveOutcome(summary: LooseRecord | null): WeeklyDialogueVariant {
  const result = stringValue(summary?.result, 'pending');
  const teamScore = numberValue(summary?.teamScore, 0);
  const opponentScore = numberValue(summary?.opponentScore, 0);
  const margin = teamScore - opponentScore;

  if (result === 'win') return margin <= 3 ? 'uglyWin' : 'cleanWin';
  if (result === 'loss') return margin <= -21 ? 'blowoutLoss' : 'loss';
  return 'midseason';
}

function headlineFor(input: BuildWeeklyGuidanceInput): string {
  if (input.outcome === 'blowoutLoss') return 'Bad tape, useful tape';
  if (input.outcome === 'threeLossStreak') return 'Losing streak, one clean decision';
  if (input.outcome === 'loss') return 'Loss logged, correction week starts now';
  if (input.outcome === 'uglyWin') return 'Win survived, cleanup required';
  if (input.outcome === 'cleanWin') {
    return input.injuredStarterCount > 0 || input.pendingDecisions > 0 || input.capSpace < 0
      ? 'Win banked, problem still on the board'
      : 'Win banked, keep the week honest';
  }
  if (input.outcome === 'playoffs') return 'Playoff room, smaller margins';
  if (input.outcome === 'championship') return 'Trophy won, harder questions next';
  return 'New week, read the board';
}

function addAction(actions: ChipRecommendedAction[], action: ChipRecommendedAction): void {
  if (actions.some((entry) => entry.id === action.id)) return;
  actions.push(action);
}

function buildActions(input: BuildWeeklyGuidanceInput): ChipRecommendedAction[] {
  const actions: ChipRecommendedAction[] = [];

  if (input.capSpace < 0) {
    addAction(actions, {
      id: 'cap-overage',
      label: 'Get cap compliant',
      route: '/contracts',
      reason: `$${Math.abs(Math.round(input.capSpace))}M over the cap blocks clean roster work.`,
      priority: 100,
    });
  }

  if (input.injuredStarterCount > 0) {
    addAction(actions, {
      id: 'injured-starter-depth',
      label: 'Fix the depth chart',
      route: '/depth-chart',
      reason: `${input.injuredStarterCount} starter injury changes the next matchup plan.`,
      priority: 98,
    });
  }

  if (input.pendingDecisions > 0) {
    addAction(actions, {
      id: 'pending-decisions',
      label: 'Clear urgent inbox',
      route: '/inbox',
      reason: `${input.pendingDecisions} decision${input.pendingDecisions === 1 ? '' : 's'} can move morale, cap, or leverage.`,
      priority: 94,
    });
  }

  if (!input.hasGamePlan && (input.phase === 'regular_season' || input.phase === 'playoffs')) {
    addAction(actions, {
      id: 'missing-game-plan',
      label: 'Set the game plan',
      route: '/game-plan',
      reason: 'The next opponent should not get your default answers.',
      priority: 92,
    });
  }

  if (input.outcome === 'loss' || input.outcome === 'blowoutLoss' || input.outcome === 'threeLossStreak') {
    addAction(actions, {
      id: 'film-correction',
      label: 'Review the film room',
      route: '/film-room',
      reason: 'Separate a plan problem from a roster problem before changing everything.',
      priority: 90,
    });
  }

  if (input.capSpace >= 0 && input.capSpace < 10) {
    addAction(actions, {
      id: 'cap-pressure',
      label: 'Check cap pressure',
      route: '/cap-lab',
      reason: `Only $${Math.round(input.capSpace)}M of room leaves little injury or trade flexibility.`,
      priority: 72,
    });
  }

  if (input.ownerMood < 40) {
    addAction(actions, {
      id: 'owner-pressure',
      label: 'Read owner pressure',
      route: '/owner',
      reason: 'Low owner mood makes losing weeks louder.',
      priority: 68,
    });
  }

  if (input.chemistry < 45) {
    addAction(actions, {
      id: 'locker-room',
      label: 'Check locker room',
      route: '/locker-room',
      reason: 'Low chemistry turns small mistakes into a heavier week.',
      priority: 64,
    });
  }

  if (input.currentWeek >= 8 || input.phase === 'playoffs') {
    addAction(actions, {
      id: 'standings-context',
      label: 'Check the standings',
      route: '/standings',
      reason: 'By midseason, the table changes how aggressive the next decision should be.',
      priority: 54,
    });
  }

  addAction(actions, {
    id: 'briefing-loop',
    label: 'Return to the briefing',
    route: '/',
    reason: 'Use the briefing as the weekly hub before widening the search.',
    priority: 10,
  });

  return actions.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0, 5);
}

function buildWhatChanged(input: BuildWeeklyGuidanceInput): string[] {
  const changes: string[] = [];
  if (input.injuredStarterCount > 0) {
    changes.push(`${input.injuredStarterCount} injured starter needs a depth answer.`);
  } else if (input.injuryCount > 0) {
    changes.push(`${input.injuryCount} injured player${input.injuryCount === 1 ? '' : 's'} changed the weekly floor.`);
  }

  if (input.pendingDecisions > 0) {
    changes.push(`${input.pendingDecisions} decision${input.pendingDecisions === 1 ? '' : 's'} waiting for a front-office call.`);
  }

  if (input.capSpace < 0) {
    changes.push(`Cap is $${Math.abs(Math.round(input.capSpace))}M over the line.`);
  } else if (input.capSpace < 10) {
    changes.push(`Cap room is thin at $${Math.round(input.capSpace)}M.`);
  }

  if (!input.hasGamePlan && (input.phase === 'regular_season' || input.phase === 'playoffs')) {
    changes.push('The next matchup still needs a game plan.');
  }

  if (changes.length === 0) {
    changes.push(input.outcome === 'cleanWin' || input.outcome === 'uglyWin'
      ? 'The win bought breathing room.'
      : 'The new week reset the board.');
  }

  return changes;
}

function buildRisks(input: BuildWeeklyGuidanceInput): string[] {
  const risks: string[] = [];
  if (input.injuredStarterCount > 0) {
    risks.push('If you ignore it, your passing plan may collapse by halftime.');
  }
  if (input.capSpace < 0) {
    risks.push('Cap noncompliance narrows every fix until you create room.');
  }
  if (input.outcome === 'loss' || input.outcome === 'blowoutLoss') {
    risks.push('Reacting before film can turn one bad Sunday into a permanent mistake.');
  }
  if (input.difficulty === 'hard' || input.difficulty === 'expert') {
    risks.push('Hard difficulty makes ignored cap and morale pressure bite faster.');
  }
  if (risks.length === 0) {
    risks.push('The risk is drifting into the next advance without choosing the week’s problem.');
  }
  return risks;
}

function buildMemoryCallbacks(game: LooseRecord | null, team: LooseRecord | null): string[] {
  const callbacks: string[] = [];
  const teamId = stringValue(team?.id);

  const timeline = asArray(game?.dynastyTimeline).map(asRecord).filter((entry): entry is LooseRecord => entry !== null);
  const landmark = [...timeline].reverse().find((entry) => {
    const teamIds = asArray(entry.teamIds);
    return (entry.importance === 'major' || entry.type === 'milestone')
      && (teamIds.length === 0 || teamIds.includes(teamId));
  });
  if (landmark) {
    callbacks.push(`I remember ${stringValue(landmark.headline, 'that landmark')} from ${numberValue(landmark.year, numberValue(game?.year, 0))}; receipts like that still travel with this team.`);
  }

  const activeThread = asArray(game?.storylineThreads)
    .map(asRecord)
    .filter((entry): entry is LooseRecord => entry !== null)
    .find((entry) => entry.status === 'active' && asArray(entry.teamIds).includes(teamId));
  if (activeThread) {
    callbacks.push(`${stringValue(activeThread.title, 'This storyline')} has been building for ${numberValue(activeThread.weeksActive, 1)} week${numberValue(activeThread.weeksActive, 1) === 1 ? '' : 's'}; Chip has the thread pinned.`);
  }

  const rivalry = asArray(game?.leagueRivalries)
    .map(asRecord)
    .filter((entry): entry is LooseRecord => entry !== null)
    .find((entry) => (entry.teamA === teamId || entry.teamB === teamId) && numberValue(entry.intensity, 0) >= 60);
  if (rivalry) {
    const opponentId = rivalry.teamA === teamId ? stringValue(rivalry.teamB) : stringValue(rivalry.teamA);
    callbacks.push(`The ${teamLabel(game, opponentId)} rivalry is already warm at ${numberValue(rivalry.intensity, 0)} heat; the old games are not done talking.`);
  }

  const playoffMemory = [...asArray(game?.franchiseHistory).map(asRecord).filter((entry): entry is LooseRecord => entry !== null)]
    .reverse()
    .find((entry) => entry.teamId === teamId && typeof entry.playoffFinish === 'string' && entry.playoffFinish !== 'missed');
  if (playoffMemory) {
    callbacks.push(`Last playoff receipt: ${stringValue(playoffMemory.playoffFinish).replace(/_/g, ' ')} in ${numberValue(playoffMemory.year, numberValue(game?.year, 0))}. That context belongs in the room.`);
  }

  return callbacks.slice(0, 3);
}

function confidenceFor(input: BuildWeeklyGuidanceInput): ChipGuidanceConfidence {
  if (input.injuredStarterCount > 0 || input.capSpace < 0 || input.pendingDecisions > 0) return 'high';
  if (!input.hasGamePlan || input.outcome === 'loss' || input.outcome === 'blowoutLoss') return 'medium';
  return 'low';
}

export function buildWeeklyGuidance(input: BuildWeeklyGuidanceInput): ChipWeeklyGuidance {
  const recommendedActions = buildActions(input);
  const featureLinks = recommendedActions.map((action) => ({
    label: action.label,
    route: action.route,
  }));

  return {
    headline: headlineFor(input),
    record: input.record ?? '0-0',
    memoryCallbacks: input.memoryCallbacks ?? [],
    whatChanged: buildWhatChanged(input),
    whyItMatters: input.opponentName
      ? `Next opponent: ${input.opponentName}. The week should answer the biggest mismatch first.`
      : 'The week should answer the biggest football problem first.',
    recommendedActions,
    risks: buildRisks(input),
    featureLinks,
    confidence: confidenceFor(input),
  };
}

export function buildWeeklyGuidanceFromGame(gameValue: unknown, pendingDecisions = 0): ChipWeeklyGuidance {
  const game = asRecord(gameValue);
  const team = userTeamFromGame(game);
  const roster = rosterFromTeam(team);
  const injuries = countInjured(roster);
  const latestSummary = latestSummaryFromGame(game);
  const lockerRoom = asRecord(team?.lockerRoom);
  const memoryCallbacks = buildMemoryCallbacks(game, team);

  return buildWeeklyGuidance({
    currentWeek: Math.max(0, Math.trunc(numberValue(game?.week, 0))),
    currentSeason: Math.max(0, Math.trunc(numberValue(game?.year, 0))),
    phase: stringValue(game?.phase, 'regular_season'),
    outcome: deriveOutcome(latestSummary),
    record: stringValue(latestSummary?.record, `${numberValue(team?.wins, 0)}-${numberValue(team?.losses, 0)}`),
    opponentName: stringValue(latestSummary?.opponentName, ''),
    injuredStarterCount: injuries.injuredStarterCount,
    injuryCount: Math.max(injuries.injuryCount, asArray(latestSummary?.injuries).length),
    capSpace: numberValue(team?.capSpace, 0),
    ownerMood: numberValue(team?.ownerMood, 50),
    chemistry: numberValue(lockerRoom?.cultureScore, numberValue(team?.chemistry, 50)),
    pendingDecisions: Math.max(0, Math.trunc(pendingDecisions)),
    hasGamePlan: boolValue(game?.currentGamePlan, false) || Boolean(game?.weeklyPrepPlan),
    difficulty: stringValue(asRecord(game?.difficulty)?.level, stringValue(game?.difficulty, 'standard')),
    memoryCallbacks,
  });
}

export function formatChipWeeklyGuidanceText(guidance: ChipWeeklyGuidance): string {
  const topAction = guidance.recommendedActions[0];
  const firstChange = guidance.whatChanged[0] ?? 'The new week is live.';
  const memory = guidance.memoryCallbacks[0];
  const firstRisk = guidance.risks[0] ?? 'Do not advance without choosing the week’s problem.';
  const next = topAction ? `Next: ${topAction.label}.` : 'Next: Return to the briefing.';
  const full = `${guidance.headline}. ${memory ? `${memory} ` : ''}${firstChange} ${next} Risk: ${firstRisk}`;
  if (full.length <= 240) return full;
  return `${full.slice(0, 237).trimEnd()}...`;
}
