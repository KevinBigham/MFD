import { analyzeTeamNeeds, buildLeagueAverageByGroup, getTeamPositionNeed } from './team-needs';
import { playerDisplayName } from '../utils';
import type {
  DecisionReceipt,
  DynastyMemoryGraph,
  FranchisePlan,
  GameCapsule,
  GameResult,
  GameState,
  LeagueEvent,
  LeagueEventType,
  Position,
  PressConferenceResponseTier,
  PressMemoryTag,
  Team,
  TransactionLogEntry,
  WeeklyPrepPlan,
} from '../types';

interface AppendOnlyIdIndex<T extends { id: string }> {
  entries: T[];
  byId: Map<string, T>;
  indexedLength: number;
}

const leagueEventIndexes = new WeakMap<GameState, AppendOnlyIdIndex<LeagueEvent>>();
const decisionReceiptIndexes = new WeakMap<GameState, AppendOnlyIdIndex<DecisionReceipt>>();

/** GameState is cloned at each transaction boundary, so a WeakMap gives each
 * live state an ephemeral append index without adding anything to the save.
 * The array remains canonical and byte-identical; this only removes repeated
 * O(history) duplicate scans while reconciliation promotes legacy history. */
function getAppendOnlyIdIndex<T extends { id: string }>(
  game: GameState,
  entries: T[],
  cache: WeakMap<GameState, AppendOnlyIdIndex<T>>,
): AppendOnlyIdIndex<T> {
  let index = cache.get(game);
  if (!index || index.entries !== entries || index.indexedLength > entries.length) {
    const byId = new Map<string, T>();
    for (const entry of entries) {
      if (!byId.has(entry.id)) byId.set(entry.id, entry);
    }
    index = { entries, byId, indexedLength: entries.length };
    cache.set(game, index);
    return index;
  }
  for (let position = index.indexedLength; position < entries.length; position += 1) {
    const entry = entries[position]!;
    if (!index.byId.has(entry.id)) index.byId.set(entry.id, entry);
  }
  index.indexedLength = entries.length;
  return index;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stablePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function averageRosterOvr(team: Team): number {
  if (team.roster.length === 0) return 60;
  return team.roster.reduce((sum, player) => sum + player.ovr, 0) / team.roster.length;
}

function currentMandate(game: GameState, team: Team): string {
  const mandate = game.ownerMandates?.find((entry) => entry.teamId === team.id && entry.status === 'active');
  return mandate?.description ?? game.owners[team.ownerId]?.goals?.target ?? 'Build a sustainable playoff team';
}

function planNarrative(team: Team, year: number, endYear: number, capPosture: FranchisePlan['capPosture']): string {
  const action = capPosture === 'spend' ? 'pushing chips into' : capPosture === 'preserve' ? 'protecting flexibility for' : 'building deliberately toward';
  return `${team.city} is ${action} a ${year}–${endYear} competitive window.`;
}

export function createFranchisePlan(game: GameState, team: Team): FranchisePlan {
  const leagueAverage = buildLeagueAverageByGroup(Object.values(game.teams));
  const report = analyzeTeamNeeds(team, leagueAverage);
  const rosterOvr = averageRosterOvr(team);
  const winRate = (team.wins + team.ties * 0.5) / Math.max(1, team.wins + team.losses + team.ties);
  const competitive = rosterOvr >= 76 || winRate >= 0.56;
  const endYear = game.year + (competitive ? 2 : 3);
  const capPosture: FranchisePlan['capPosture'] = team.capSpace >= 30
    ? 'spend'
    : team.capSpace < 8
      ? 'preserve'
      : 'balanced';
  const priorityPositions = report.positionGrades
    .slice()
    .sort((a, b) => (b.needScore ?? 0) - (a.needScore ?? 0) || a.group.localeCompare(b.group))
    .slice(0, 4)
    .map((entry) => entry.group as Position);
  const protectedAssets = [...team.roster]
    .sort((a, b) => b.ovr - a.ovr || a.age - b.age || a.id.localeCompare(b.id))
    .filter((player) => player.age <= 30)
    .slice(0, 6)
    .map((player) => player.id);
  const expendableAssets = [...team.roster]
    .filter((player) => !protectedAssets.includes(player.id) && player.age >= 28)
    .sort((a, b) => a.ovr - b.ovr || b.age - a.age || a.id.localeCompare(b.id))
    .slice(0, 6)
    .map((player) => player.id);
  const riskTolerance = clamp(Math.round(35 + (team.ownerMood - 50) * 0.35 + (competitive ? 18 : 4)), 20, 85);
  const draftCapitalStrategy: FranchisePlan['draftCapitalStrategy'] = competitive && riskTolerance >= 60
    ? 'trade_up'
    : competitive
      ? 'balanced'
      : 'accumulate';

  return {
    teamId: team.id,
    windowYears: [game.year, endYear],
    ownerMandate: currentMandate(game, team),
    capPosture,
    priorityPositions,
    protectedAssets,
    expendableAssets,
    draftCapitalStrategy,
    riskTolerance,
    changeTriggers: [
      `coach:${team.staff.hc?.id ?? 'vacant'}`,
      `mandate:${stablePart(currentMandate(game, team))}`,
      `window_end:${endYear}`,
    ],
    publicNarrative: planNarrative(team, game.year, endYear, capPosture),
    planHistory: [{
      year: game.year,
      week: game.week,
      trigger: 'dynasty_seed',
      summary: `Plan opened with ${priorityPositions.join(', ')} as priority positions and ${capPosture} cap posture.`,
    }],
    lastUpdatedYear: game.year,
  };
}

export function ensureCausalSpineState(game: GameState): void {
  game.leagueEvents ??= [];
  game.decisionReceipts ??= [];
  game.franchisePlans ??= {};
  game.pressMemoryTags ??= [];
  game.gameCapsules ??= [];
  game.memoryGraph ??= { nodes: [], edges: [] };
  game.navigationMode ??= 'gm';
  game.onboardingMode ??= 'guided';
  game.settings.coachMode ??= false;

  for (const team of Object.values(game.teams).sort((a, b) => a.id.localeCompare(b.id))) {
    if (team.isUser) continue;
    if (game.franchisePlans[team.id]?.priorityPositions.length) continue;
    const plan = createFranchisePlan(game, team);
    game.franchisePlans[team.id] = plan;
    team.philosophy = derivePhilosophyLabel(plan);
  }
}

export function updateFranchisePlans(game: GameState): void {
  ensureCausalSpineState(game);
  for (const team of Object.values(game.teams).sort((a, b) => a.id.localeCompare(b.id))) {
    if (team.isUser) continue;
    const current = game.franchisePlans![team.id] ?? createFranchisePlan(game, team);
    const coachTrigger = `coach:${team.staff.hc?.id ?? 'vacant'}`;
    const mandateTrigger = `mandate:${stablePart(currentMandate(game, team))}`;
    const trigger = !current.changeTriggers.includes(coachTrigger)
      ? 'new_coach'
      : !current.changeTriggers.includes(mandateTrigger)
        ? 'owner_mandate'
        : game.year > current.windowYears[1]
          ? 'missed_window'
          : null;
    if (!trigger) continue;

    const refreshed = createFranchisePlan(game, team);
    refreshed.planHistory = [
      ...current.planHistory,
      {
        year: game.year,
        week: game.week,
        trigger,
        summary: `${current.publicNarrative} Pivoted to: ${refreshed.publicNarrative}`,
      },
    ].slice(-12);
    game.franchisePlans![team.id] = refreshed;
    team.philosophy = derivePhilosophyLabel(refreshed);
  }
}

export function derivePhilosophyLabel(plan: FranchisePlan): NonNullable<Team['philosophy']> {
  if (plan.draftCapitalStrategy === 'accumulate' && plan.capPosture === 'preserve') return 'rebuild';
  if (plan.draftCapitalStrategy === 'trade_up' || plan.capPosture === 'spend') return 'contend';
  return 'maintain';
}

export function appendLeagueEvent(game: GameState, event: LeagueEvent): LeagueEvent {
  ensureCausalSpineState(game);
  const index = getAppendOnlyIdIndex(game, game.leagueEvents!, leagueEventIndexes);
  const existing = index.byId.get(event.id);
  if (existing) return existing;
  game.leagueEvents!.push(event);
  index.byId.set(event.id, event);
  index.indexedLength = game.leagueEvents!.length;
  return event;
}

export function appendDecisionReceipt(game: GameState, receipt: DecisionReceipt): DecisionReceipt {
  ensureCausalSpineState(game);
  const index = getAppendOnlyIdIndex(game, game.decisionReceipts!, decisionReceiptIndexes);
  const existing = index.byId.get(receipt.id);
  if (existing) return existing;
  game.decisionReceipts!.push(receipt);
  index.byId.set(receipt.id, receipt);
  index.indexedLength = game.decisionReceipts!.length;
  return receipt;
}

function eventTypeForTransaction(entry: TransactionLogEntry): LeagueEventType {
  if (/TRADE/i.test(entry.type)) return 'trade';
  if (/DRAFT/i.test(entry.type)) return 'draft_pick';
  if (/SIGN|CLAIM|ELEVAT/i.test(entry.type)) return 'signing';
  if (/CUT|RELEASE|LOSE_FA/i.test(entry.type)) return 'cut';
  return 'legacy';
}

function receiptForTransaction(game: GameState, team: Team, entry: TransactionLogEntry, event: LeagueEvent): DecisionReceipt {
  const player = entry.playerId ? game.players[entry.playerId] ?? team.roster.find((candidate) => candidate.id === entry.playerId) : null;
  const plan = game.franchisePlans?.[team.id] ?? createFranchisePlan(game, team);
  const report = analyzeTeamNeeds(team, buildLeagueAverageByGroup(Object.values(game.teams)));
  const need = player ? getTeamPositionNeed(report, player.pos) : null;
  const priorityRank = player ? plan.priorityPositions.indexOf(player.pos) + 1 : 0;
  const eventType = eventTypeForTransaction(entry);
  const outcome = `${team.abbr} ${eventType.replace('_', ' ')}${player ? ` ${playerDisplayName(player)}` : ''}`;
  const counterfactual = need && (need.needScore ?? 0) >= 12
    ? `Without the move, ${team.abbr} would keep a ${need.needScore} need score at ${player?.pos}.`
    : `A lower-risk alternative was to preserve cap and draft capital for the ${plan.windowYears[0]}–${plan.windowYears[1]} window.`;

  return {
    id: `receipt:${event.id}`,
    seasonWeek: event.seasonWeek,
    teamId: team.id,
    decision: outcome,
    drivers: [
      { label: 'plan window', value: `${plan.windowYears[0]}-${plan.windowYears[1]}`, detail: plan.publicNarrative },
      { label: 'cap posture', value: plan.capPosture, detail: `${team.capSpace.toFixed(1)} cap space at decision time.` },
      { label: 'risk tolerance', value: plan.riskTolerance, detail: 'Persistent FranchisePlan risk score on a 0–100 scale.' },
      ...(need ? [{ label: `${player!.pos} need`, value: need.needScore ?? 0, detail: need.reasonCodes?.[0] ?? `${player!.pos} was evaluated by TeamNeedsModel.` }] : []),
      ...(priorityRank > 0 ? [{ label: 'priority rank', value: priorityRank, detail: `${player!.pos} was inside the persistent plan priority list.` }] : []),
    ],
    outcome,
    counterfactual,
    eventRefs: [event.id],
  };
}

function receiptForStaffEvent(game: GameState, team: Team, event: LeagueEvent, description: string): DecisionReceipt {
  const plan = game.franchisePlans?.[team.id] ?? createFranchisePlan(game, team);
  const staffCommitment = [team.staff.hc, team.staff.oc, team.staff.dc]
    .filter((staff): staff is NonNullable<typeof staff> => Boolean(staff))
    .reduce((sum, staff) => sum + (staff.term ?? 0) + (staff.buyoutPenalty ?? 0), 0);
  return {
    id: `receipt:${event.id}`,
    seasonWeek: event.seasonWeek,
    teamId: team.id,
    decision: description,
    drivers: [
      { label: 'risk tolerance', value: plan.riskTolerance, detail: 'Persistent FranchisePlan risk score on a 0-100 scale.' },
      { label: 'plan years remaining', value: Math.max(0, plan.windowYears[1] - game.year), detail: plan.publicNarrative },
      { label: 'staff commitment', value: Number(staffCommitment.toFixed(1)), detail: 'Current HC, OC, and DC contract-term plus buyout commitment after the transaction.' },
    ],
    outcome: `${team.abbr} changed its staff structure while preserving the ${plan.capPosture} roster-cap posture.`,
    counterfactual: `Keeping the previous staff would have avoided transition risk but left the ${plan.windowYears[0]}-${plan.windowYears[1]} plan on the same trajectory.`,
    eventRefs: [event.id],
  };
}

/**
 * Strangler adapter: legacy team tx logs remain readable while every entry is
 * promoted exactly once into the canonical append-only ledger and receipts.
 */
export function reconcileCausalSpine(game: GameState): void {
  ensureCausalSpineState(game);
  const eventsById = new Map((game.leagueEvents ?? []).map((event) => [event.id, event]));
  const receiptsById = new Map((game.decisionReceipts ?? []).map((receipt) => [receipt.id, receipt]));
  let causalChanged = (game.memoryGraph?.nodes.length ?? 0) === 0;
  const appendEventOnce = (event: LeagueEvent): LeagueEvent => {
    const existing = eventsById.get(event.id);
    if (existing) return existing;
    const appended = appendLeagueEvent(game, event);
    eventsById.set(appended.id, appended);
    causalChanged = true;
    return appended;
  };
  const appendReceiptOnce = (receipt: DecisionReceipt): DecisionReceipt => {
    const existing = receiptsById.get(receipt.id);
    if (existing) return existing;
    const appended = appendDecisionReceipt(game, receipt);
    receiptsById.set(appended.id, appended);
    causalChanged = true;
    return appended;
  };

  for (const team of Object.values(game.teams).sort((a, b) => a.id.localeCompare(b.id))) {
    team.txLog.forEach((entry, index) => {
      const eventId = `tx:${team.id}:${entry.year}:${entry.week}:${index}:${stablePart(entry.type)}:${stablePart(entry.playerId ?? 'none')}`;
      let event = eventsById.get(eventId);
      if (!event) {
        event = appendEventOnce({
          id: eventId,
          seasonWeek: { year: entry.year, week: entry.week },
          type: eventTypeForTransaction(entry),
          actors: {
            teamIds: [...new Set([team.id, entry.fromTeamId, entry.toTeamId].filter((id): id is string => Boolean(id)))],
            playerIds: entry.playerId ? [entry.playerId] : [],
            staffIds: [],
          },
          payload: { source: 'team.txLog', transactionType: entry.type, notes: entry.notes ?? null },
          causeIds: [],
        });
      }
      if (!team.isUser && !receiptsById.has(`receipt:${eventId}`)) {
        appendReceiptOnce(receiptForTransaction(game, team, entry, event));
      }
    });
  }

  for (const legacy of game.eventLog) {
    const type: LeagueEventType = /fire|retire/i.test(legacy.type)
      ? 'firing'
      : /hire|coach/i.test(legacy.type)
        ? 'hiring'
        : /injur/i.test(legacy.type)
          ? 'injury'
          : /award/i.test(legacy.type)
            ? 'award'
            : /record/i.test(legacy.type)
              ? 'record'
              : legacy.type === 'press_conference'
                ? 'press_conference'
                : 'legacy';
    const eventId = `legacy:${legacy.id}`;
    const event = eventsById.get(eventId) ?? appendEventOnce({
      id: eventId,
      seasonWeek: { year: game.year, week: game.week },
      type,
      actors: {
        teamIds: typeof legacy.data.teamId === 'string' ? [legacy.data.teamId] : [],
        playerIds: typeof legacy.data.playerId === 'string' ? [legacy.data.playerId] : [],
        staffIds: typeof legacy.data.coachId === 'string' ? [legacy.data.coachId] : [],
      },
      payload: { source: 'eventLog', description: legacy.description, legacyType: legacy.type },
      causeIds: [],
    });
    const teamId = typeof legacy.data.teamId === 'string' ? legacy.data.teamId : null;
    const team = teamId ? game.teams[teamId] : null;
    if (team && !team.isUser && (type === 'hiring' || type === 'firing') && !receiptsById.has(`receipt:${eventId}`)) {
      appendReceiptOnce(receiptForStaffEvent(game, team, event, legacy.description));
    }
  }

  for (const scheduleWeek of game.schedule) {
    for (const scheduled of scheduleWeek.games) {
      const result = scheduled.result;
      if (!result) continue;
      const gameEventId = `game:${result.id}`;
      const gameEvent = eventsById.get(gameEventId) ?? appendEventOnce({
        id: gameEventId,
        seasonWeek: { year: result.year, week: result.week },
        type: 'game',
        actors: { teamIds: [result.homeTeamId, result.awayTeamId], playerIds: result.mvpPlayerId ? [result.mvpPlayerId] : [], staffIds: [] },
        payload: { homeScore: result.homeScore, awayScore: result.awayScore, overtime: result.overtime },
        causeIds: [],
      });
      for (const activation of result.contingencyActivations ?? []) {
        if (!activation.ruleId.startsWith('trick:')) continue;
        const eventId = `trick:${result.id}:${activation.teamId}:${activation.ruleId.slice(6)}`;
        if (eventsById.has(eventId)) continue;
        appendEventOnce({
          id: eventId,
          seasonWeek: { year: result.year, week: result.week },
          type: 'trick_play',
          actors: { teamIds: [activation.teamId], playerIds: [], staffIds: [] },
          payload: {
            gameId: result.id,
            quarter: activation.quarter,
            playName: activation.label,
            outcome: activation.responseLabel ?? null,
            callout: activation.callout ?? null,
          },
          causeIds: [gameEvent.id],
        });
      }
      for (const snap of (result.snapEvents ?? []).filter((entry) =>
        entry.points > 0 || entry.turnover || Math.abs(entry.yards) >= 25).slice(-12)) {
        if (eventsById.has(snap.id)) continue;
        appendEventOnce({
          id: snap.id,
          seasonWeek: { year: result.year, week: result.week },
          type: 'snap',
          actors: { teamIds: [snap.offenseTeamId, snap.defenseTeamId], playerIds: [], staffIds: [] },
          payload: {
            gameId: snap.gameId,
            sequence: snap.sequence,
            playType: snap.playType,
            yards: snap.yards,
            points: snap.points,
            turnover: snap.turnover,
            description: snap.description,
            ledgerMode: result.snapLedgerMode ?? 'shadow',
          },
          causeIds: [gameEvent.id],
        });
      }
    }
  }
  if (causalChanged) rebuildMemoryGraph(game);
}

export function applyPressResponseConsequences(
  game: GameState,
  conferenceId: string,
  tier: PressConferenceResponseTier,
  response: string,
): DecisionReceipt | null {
  ensureCausalSpineState(game);
  const queued = game.postGameUi?.pressConferenceQueue.find((entry) => entry.conferenceId === conferenceId);
  if (!queued?.teamId) return null;
  const team = game.teams[queued.teamId];
  if (!team) return null;
  const ownerDelta = tier === 'high' ? 2 : tier === 'mid' ? 1 : -1;
  const moraleDelta = tier === 'high' ? 1 : tier === 'low' ? -1 : 0;
  team.ownerMood = clamp(team.ownerMood + ownerDelta, 0, 100);
  if (moraleDelta !== 0) {
    for (const player of team.roster) player.morale = clamp(player.morale + moraleDelta, 0, 100);
  }
  const tag: PressMemoryTag['tag'] = tier === 'high' ? 'bold' : tier === 'mid' ? 'measured' : 'deflecting';
  const event = appendLeagueEvent(game, {
    id: `press-response:${conferenceId}`,
    seasonWeek: { year: queued.year, week: queued.week },
    type: 'press_conference',
    actors: { teamIds: [team.id], playerIds: [], staffIds: [] },
    payload: { tier, response, ownerDelta, moraleDelta, mediaTag: tag },
    causeIds: [`legacy:${conferenceId}`],
  });
  const receipt = appendDecisionReceipt(game, {
    id: `receipt:${event.id}`,
    seasonWeek: event.seasonWeek,
    teamId: team.id,
    decision: `Press response: ${tag}`,
    drivers: [
      { label: 'response tier', value: tier, detail: response },
      { label: 'owner approval', value: ownerDelta, detail: `Owner mood moved ${ownerDelta >= 0 ? '+' : ''}${ownerDelta}.` },
      { label: 'locker room', value: moraleDelta, detail: `Roster morale moved ${moraleDelta >= 0 ? '+' : ''}${moraleDelta}.` },
    ],
    outcome: `${tag} media tag saved for a future callback.`,
    counterfactual: tier === 'high' ? 'A measured answer would have reduced both the upside and the scrutiny.' : 'A bolder answer would have earned more owner approval but created a stronger callback.',
    eventRefs: [event.id],
  });
  if (!game.pressMemoryTags!.some((entry) => entry.id === `press-memory:${conferenceId}`)) {
    game.pressMemoryTags!.push({
      id: `press-memory:${conferenceId}`,
      teamId: team.id,
      year: queued.year,
      week: queued.week,
      tag,
      quote: response,
      receiptId: receipt.id,
    });
  }
  return receipt;
}

export function buildGameCapsule(game: GameState, result: GameResult): GameCapsule {
  ensureCausalSpineState(game);
  const relatedEvents = game.leagueEvents!.filter((event) =>
    event.seasonWeek.year === result.year
    && event.seasonWeek.week === result.week
    && event.actors.teamIds.some((id) => id === result.homeTeamId || id === result.awayTeamId));
  const relatedReceipts = game.decisionReceipts!.filter((receipt) => receipt.eventRefs.some((id) => relatedEvents.some((event) => event.id === id)));
  const winnerId = result.homeScore >= result.awayScore ? result.homeTeamId : result.awayTeamId;
  return {
    id: `capsule:${result.id}`,
    gameId: result.id,
    year: result.year,
    week: result.week,
    teamIds: [result.homeTeamId, result.awayTeamId],
    score: [result.homeScore, result.awayScore],
    turningPoint: result.contingencyActivations?.at(-1)?.callout ?? `${winnerId} controlled the decisive scoring margin.`,
    keyPlayEventIds: relatedEvents.filter((event) => event.type === 'trick_play' || event.type === 'snap').slice(-5).map((event) => event.id),
    receiptIds: relatedReceipts.slice(-5).map((receipt) => receipt.id),
    starPlayerIds: result.mvpPlayerId ? [result.mvpPlayerId] : [],
    summary: `${game.teams[result.homeTeamId]?.abbr ?? result.homeTeamId} ${result.homeScore}, ${game.teams[result.awayTeamId]?.abbr ?? result.awayTeamId} ${result.awayScore}${result.overtime ? ' (OT)' : ''}.`,
  };
}

export function persistGameCapsule(game: GameState, result: GameResult): GameCapsule {
  const capsule = buildGameCapsule(game, result);
  const index = game.gameCapsules!.findIndex((entry) => entry.id === capsule.id);
  if (index >= 0) game.gameCapsules![index] = capsule;
  else game.gameCapsules!.push(capsule);
  // One user game per week stays tiny enough for a century-long dynasty while
  // preserving anniversaries that a 256-league-game ring buffer erased.
  game.gameCapsules = game.gameCapsules!.slice(-2_048);
  rebuildMemoryGraph(game);
  return capsule;
}

/** Reduce old full snap ledgers after their key plays, stats, receipts, and
 * capsule have been persisted. The two newest user games remain replayable. */
export function compactCanonicalSnapLedgers(game: GameState, userTeamId: string, retain = 2): number {
  const results = game.schedule
    .flatMap((week) => week.games.map((scheduled) => scheduled.result).filter((result): result is GameResult => Boolean(result)))
    .filter((result) => (result.homeTeamId === userTeamId || result.awayTeamId === userTeamId) && (result.snapEvents?.length ?? 0) > 0)
    .sort((left, right) => right.year - left.year || right.week - left.week || right.id.localeCompare(left.id));
  let compacted = 0;
  for (const result of results.slice(Math.max(0, retain))) {
    result.snapEvents = undefined;
    result.snapLedgerMode = undefined;
    compacted += 1;
  }
  return compacted;
}

export function recordGamePlanDecisionReceipt(
  game: GameState,
  teamId: string,
  plan: WeeklyPrepPlan,
  result: GameResult,
): DecisionReceipt {
  const stats = result.stats[teamId];
  const rushYards = stats?.rushingYards ?? 0;
  const carries = stats?.rushAttempts ?? 0;
  const passYards = stats?.passingYards ?? 0;
  const event = appendLeagueEvent(game, {
    id: `game-plan:${result.id}:${teamId}`,
    seasonWeek: { year: result.year, week: result.week },
    type: 'game',
    actors: { teamIds: [teamId], playerIds: plan.keyMatchupPlayerId ? [plan.keyMatchupPlayerId] : [], staffIds: [] },
    payload: {
      source: 'weeklyPrepPlans',
      offensiveFocus: plan.offensiveFocus,
      defensiveFocus: plan.defensiveFocus,
      practiceIntensity: plan.practiceIntensity,
      rushYards,
      carries,
      passYards,
    },
    causeIds: [`game:${result.id}`],
  });
  return appendDecisionReceipt(game, {
    id: `receipt:${event.id}`,
    seasonWeek: event.seasonWeek,
    teamId,
    decision: `Weekly plan: ${plan.offensiveFocus.replaceAll('_', ' ')} / ${plan.defensiveFocus.replaceAll('_', ' ')}`,
    drivers: [
      { label: 'rushing output', value: `${carries} carries, ${carries > 0 ? (rushYards / carries).toFixed(1) : '0.0'} YPC`, detail: `${rushYards} real rushing yards from the saved box score.` },
      { label: 'passing output', value: `${passYards} yards`, detail: 'Real passing yards from the saved box score.' },
      { label: 'practice intensity', value: plan.practiceIntensity, detail: 'Saved weekly-prep choice used by the readiness model.' },
    ],
    outcome: `${result.homeTeamId === teamId ? result.homeScore : result.awayScore} points scored; receipt tied to ${result.id}.`,
    counterfactual: plan.offensiveFocus === 'balanced'
      ? 'A specialized plan would have concentrated the prep bonus but exposed a narrower counter.'
      : 'A balanced plan would have reduced the specialized matchup bonus and widened the call mix.',
    eventRefs: [event.id, `game:${result.id}`],
  });
}

export interface ActionCenterCardClosure {
  id: string;
  lane: 'must_do' | 'recommended';
  label: string;
  route: string;
}

/** Persist the user's explicit close action in the append-only league ledger. */
export function recordActionCenterCardClosure(
  game: GameState,
  teamId: string,
  card: ActionCenterCardClosure,
): LeagueEvent {
  return appendLeagueEvent(game, {
    id: `action-center-closed:${game.year}:${game.week}:${stablePart(teamId)}:${stablePart(card.id)}`,
    seasonWeek: { year: game.year, week: game.week },
    type: 'legacy',
    actors: { teamIds: [teamId], playerIds: [], staffIds: [] },
    payload: {
      source: 'action_center.closed',
      cardId: card.id,
      lane: card.lane,
      label: card.label,
      route: card.route,
    },
    causeIds: [],
  });
}

/** Converts only explicitly closed cards into receipts in the next briefing. */
export function recordWeeklyBriefingReceipts(
  game: GameState,
  teamId: string,
  result: GameResult,
): DecisionReceipt[] {
  const team = game.teams[teamId];
  if (!team) return [];
  const score = result.homeTeamId === teamId ? result.homeScore : result.awayScore;
  const opponentScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;
  const closedCards = (game.leagueEvents ?? []).filter((event) =>
    event.type === 'legacy'
    && event.payload.source === 'action_center.closed'
    && event.actors.teamIds.includes(teamId)
    && event.seasonWeek.year === result.year
    && event.seasonWeek.week === result.week);
  return closedCards.map((event) => appendDecisionReceipt(game, {
    id: `receipt:${event.id}`,
    seasonWeek: { year: game.year, week: game.week },
    teamId,
    decision: `Action Center card closed: ${String(event.payload.label ?? event.payload.cardId ?? 'Weekly action')}`,
    drivers: [
      { label: 'lane', value: String(event.payload.lane ?? 'recommended'), detail: 'The lane shown when the user explicitly closed the card.' },
      { label: 'destination', value: String(event.payload.route ?? '/monday-briefing'), detail: 'Exact deep-link attached to the closed card.' },
      { label: 'score margin', value: score - opponentScore, detail: `${team.abbr} scored ${score}; opponent scored ${opponentScore}.` },
    ],
    outcome: `${team.abbr} carried this closed card into the next briefing after a ${score}-${opponentScore} result.`,
    counterfactual: 'Leaving the card open would have produced no closure receipt and kept the action visible for the current week.',
    eventRefs: [event.id, `game:${result.id}`],
  }));
}

/** Records a user victory as an explicit scar on the rival's durable plan. */
export function recordRivalPlanDefeat(
  game: GameState,
  result: GameResult,
  userTeamId: string,
): FranchisePlan | null {
  const userWon = (result.homeTeamId === userTeamId && result.homeScore > result.awayScore)
    || (result.awayTeamId === userTeamId && result.awayScore > result.homeScore);
  if (!userWon) return null;
  const rivalTeamId = result.homeTeamId === userTeamId ? result.awayTeamId : result.homeTeamId;
  const rival = game.teams[rivalTeamId];
  const plan = game.franchisePlans?.[rivalTeamId];
  if (!rival || rival.isUser || !plan) return null;
  const trigger = `defeated:${result.id}`;
  if (!plan.planHistory.some((entry) => entry.trigger === trigger)) {
    plan.planHistory = [...plan.planHistory, {
      year: result.year,
      week: result.week,
      trigger,
      summary: `${game.teams[userTeamId]?.abbr ?? userTeamId} beat ${rival.abbr} ${result.homeScore}-${result.awayScore}, testing the ${plan.windowYears[0]}-${plan.windowYears[1]} window. ${plan.publicNarrative}`,
    }].slice(-12);
  }
  return plan;
}

export interface CpuReceiptCoverageAudit {
  cpuTransactionCount: number;
  receiptBackedCpuTransactionCount: number;
  coverage: number;
  missingEventIds: string[];
}

export function auditCpuTransactionReceiptCoverage(game: GameState): CpuReceiptCoverageAudit {
  ensureCausalSpineState(game);
  const transactionTypes = new Set<LeagueEventType>(['signing', 'trade', 'cut', 'draft_pick', 'hiring', 'firing']);
  const receiptBackedEventIds = new Set<string>();
  for (const receipt of game.decisionReceipts ?? []) {
    if (!receipt.teamId || !game.teams[receipt.teamId] || game.teams[receipt.teamId]!.isUser) continue;
    for (const eventId of receipt.eventRefs) receiptBackedEventIds.add(eventId);
  }
  const events = (game.leagueEvents ?? []).filter((event) =>
    transactionTypes.has(event.type)
    && event.actors.teamIds.some((teamId) => Boolean(game.teams[teamId] && !game.teams[teamId]!.isUser)));
  const missingEventIds = events
    .filter((event) => !receiptBackedEventIds.has(event.id))
    .map((event) => event.id);
  const receiptBackedCpuTransactionCount = events.length - missingEventIds.length;
  return {
    cpuTransactionCount: events.length,
    receiptBackedCpuTransactionCount,
    coverage: events.length === 0 ? 1 : receiptBackedCpuTransactionCount / events.length,
    missingEventIds,
  };
}

export function rebuildMemoryGraph(game: GameState): DynastyMemoryGraph {
  ensureCausalSpineState(game);
  const nodes = new Map<string, DynastyMemoryGraph['nodes'][number]>();
  const edges = new Map<string, DynastyMemoryGraph['edges'][number]>();
  for (const team of Object.values(game.teams)) {
    nodes.set(`team:${team.id}`, { id: `team:${team.id}`, kind: 'team', label: `${team.city} ${team.name}`, eventRefs: [] });
  }
  for (const capsule of game.gameCapsules ?? []) {
    nodes.set(`game:${capsule.gameId}`, { id: `game:${capsule.gameId}`, kind: 'game', label: capsule.summary, eventRefs: capsule.keyPlayEventIds });
    for (const teamId of capsule.teamIds) {
      const id = `edge:team:${teamId}:game:${capsule.gameId}`;
      edges.set(id, { id, fromId: `team:${teamId}`, toId: `game:${capsule.gameId}`, kind: 'played', weight: 1 });
    }
    for (const playerId of capsule.starPlayerIds) {
      const player = game.players[playerId];
      const label = player ? `${player.firstName} ${player.lastName}`.trim() || playerId : playerId;
      const personId = `person:${playerId}`;
      nodes.set(personId, { id: personId, kind: 'person', label, eventRefs: capsule.keyPlayEventIds });
      const id = `edge:${personId}:game:${capsule.gameId}`;
      edges.set(id, { id, fromId: personId, toId: `game:${capsule.gameId}`, kind: 'remembered', weight: 1 });
    }
  }
  for (const receipt of game.decisionReceipts ?? []) {
    nodes.set(`decision:${receipt.id}`, { id: `decision:${receipt.id}`, kind: 'decision', label: receipt.decision, eventRefs: receipt.eventRefs });
    if (receipt.teamId) {
      const id = `edge:team:${receipt.teamId}:decision:${receipt.id}`;
      edges.set(id, { id, fromId: `team:${receipt.teamId}`, toId: `decision:${receipt.id}`, kind: 'decided', weight: 1 });
    }
  }
  for (const event of game.leagueEvents ?? []) {
    for (const playerId of event.actors.playerIds) {
      const player = game.players[playerId];
      const label = player ? `${player.firstName} ${player.lastName}`.trim() || playerId : playerId;
      const personId = `person:${playerId}`;
      const existing = nodes.get(personId);
      nodes.set(personId, {
        id: personId,
        kind: 'person',
        label,
        eventRefs: [...new Set([...(existing?.eventRefs ?? []), event.id])],
      });
      for (const causeId of event.causeIds) {
        const decision = (game.decisionReceipts ?? []).find((receipt) => receipt.id === causeId || receipt.eventRefs.includes(causeId));
        if (!decision) continue;
        const id = `edge:${personId}:decision:${decision.id}`;
        edges.set(id, { id, fromId: personId, toId: `decision:${decision.id}`, kind: 'affected', weight: 1 });
      }
    }
  }
  for (const thread of game.storylineThreads ?? []) {
    const eventRefs = thread.beats.map((beat, index) =>
      `storyline:${thread.id}:${beat.year}:${beat.weekNumber}:${index}`);
    for (const playerId of thread.playerIds) {
      const player = game.players[playerId];
      const label = player ? `${player.firstName} ${player.lastName}`.trim() || playerId : playerId;
      const personId = `person:${playerId}`;
      const existing = nodes.get(personId);
      nodes.set(personId, {
        id: personId,
        kind: 'person',
        label,
        eventRefs: [...new Set([...(existing?.eventRefs ?? []), ...eventRefs])],
      });
    }
  }
  for (const rivalry of game.leagueRivalries ?? []) {
    const rivalryId = `rivalry:${rivalry.id}`;
    const teamIds = [rivalry.teamA, rivalry.teamB];
    const teamLabels = teamIds.map((teamId) => {
      const team = game.teams[teamId];
      return team ? `${team.city} ${team.name}` : teamId;
    });
    nodes.set(rivalryId, {
      id: rivalryId,
      kind: 'rivalry',
      label: teamLabels.join(' vs. '),
      eventRefs: (game.leagueEvents ?? [])
        .filter((event) => teamIds.every((teamId) => event.actors.teamIds.includes(teamId)))
        .map((event) => event.id),
    });
    for (const teamId of teamIds) {
      const id = `edge:team:${teamId}:${rivalryId}`;
      edges.set(id, { id, fromId: `team:${teamId}`, toId: rivalryId, kind: 'rivaled', weight: Math.max(1, rivalry.intensity) });
    }
  }
  game.memoryGraph = { nodes: [...nodes.values()], edges: [...edges.values()] };
  return game.memoryGraph;
}

/** Read model for the player-facing memory loop. Every line is authored from
 * saved capsules, receipts, and their graph nodes rather than regenerated lore. */
export function buildDynastyMemoryDigest(game: GameState, teamId: string): import('../types').DynastyMemoryDigest {
  const capsules = (game.gameCapsules ?? [])
    .filter((capsule) => capsule.teamIds.includes(teamId))
    .sort((left, right) => right.year - left.year || right.week - left.week || right.id.localeCompare(left.id));
  const latest = capsules[0] ?? null;
  const anniversaryCapsule = capsules.find((capsule) => capsule.year < game.year && capsule.week === game.week) ?? null;
  const priorSeasonYear = Math.max(0, ...capsules.filter((capsule) => capsule.year < game.year).map((capsule) => capsule.year));
  const priorSeasonCapsules = priorSeasonYear > 0 ? capsules.filter((capsule) => capsule.year === priorSeasonYear) : [];
  const teamDecisionReceipts = (game.decisionReceipts ?? []).filter((receipt) => receipt.teamId === teamId);
  const connectedGameNodes = (game.memoryGraph?.nodes ?? [])
    .filter((node) => node.kind === 'game' && capsules.some((capsule) => node.id === `game:${capsule.gameId}`))
    .sort((left, right) => right.eventRefs.length - left.eventRefs.length || left.id.localeCompare(right.id));
  const retrospectiveNode = connectedGameNodes[0] ?? null;
  const sourceNodeIds = [
    ...(latest ? [`game:${latest.gameId}`] : []),
    ...(anniversaryCapsule ? [`game:${anniversaryCapsule.gameId}`] : []),
    ...(retrospectiveNode ? [retrospectiveNode.id] : []),
  ].filter((id, index, all) => all.indexOf(id) === index);

  return {
    previouslyOn: latest ? `Previously On: ${latest.summary}` : null,
    anniversary: anniversaryCapsule
      ? `${game.year - anniversaryCapsule.year} season${game.year - anniversaryCapsule.year === 1 ? '' : 's'} ago this week: ${anniversaryCapsule.summary}`
      : null,
    retrospective: retrospectiveNode
      ? `Retrospective: ${retrospectiveNode.label} (${retrospectiveNode.eventRefs.length} saved turning-point reference${retrospectiveNode.eventRefs.length === 1 ? '' : 's'}).`
      : null,
    seasonDocumentary: priorSeasonCapsules.length > 0
      ? `The ${priorSeasonYear} season: ${priorSeasonCapsules.length} game capsule${priorSeasonCapsules.length === 1 ? '' : 's'}, ${new Set(priorSeasonCapsules.flatMap((capsule) => capsule.starPlayerIds)).size} featured star${new Set(priorSeasonCapsules.flatMap((capsule) => capsule.starPlayerIds)).size === 1 ? '' : 's'}, and ${teamDecisionReceipts.filter((receipt) => receipt.seasonWeek.year === priorSeasonYear).length} saved decision receipt${teamDecisionReceipts.filter((receipt) => receipt.seasonWeek.year === priorSeasonYear).length === 1 ? '' : 's'}.`
      : null,
    sourceNodeIds,
  };
}
