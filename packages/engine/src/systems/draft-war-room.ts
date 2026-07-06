import { calcPickValue } from './trade-value';
import { buildLeagueAverageByGroup, analyzeTeamNeeds } from './team-needs';
import { getScenarioConstraints } from './scenario-challenge';
import { recordNewsItem } from './league-news';
import type {
  DraftOrderEntry,
  DraftPick,
  DraftTradeOffer,
  DraftProspect,
  GameState,
  Player,
  PositionGroup,
  Team,
  TradeDownEvaluation,
  TradePackage,
  TradeUpEvaluation,
  TradeOfferAsset,
  WarRoomState,
} from '../types';

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function groupForPosition(position: string): PositionGroup {
  return position as PositionGroup;
}

function premiumForGroup(group: PositionGroup): number {
  switch (group) {
    case 'QB':
      return 18;
    case 'WR':
    case 'OL':
    case 'DL':
    case 'CB':
      return 8;
    case 'LB':
    case 'S':
    case 'TE':
      return 5;
    case 'RB':
      return 3;
    case 'K':
    case 'P':
      return 1;
    default:
      return 4;
  }
}

function topProspect(draftClass: DraftProspect[] | Player[]): (DraftProspect | Player) | null {
  return [...draftClass].sort((a, b) =>
    Number((b as DraftProspect).trueGrade ?? (b as Player).ovr ?? 0) - Number((a as DraftProspect).trueGrade ?? (a as Player).ovr ?? 0) ||
    String((a as DraftProspect).id ?? (a as Player).id).localeCompare(String((b as DraftProspect).id ?? (b as Player).id)))[0] ?? null;
}

function hasSourceDraftOrderPick(game: GameState, entry: DraftOrderEntry): boolean {
  const team = game.teams[entry.teamId];
  return Boolean(team?.draftPicks.some((pick) =>
    pick.year === game.year &&
    pick.currentTeamId === entry.teamId &&
    pick.round === entry.round &&
    pick.pick === entry.pick &&
    pick.originalTeamId === entry.originalTeamId));
}

function draftTradeCandidates(game: GameState, currentPick: DraftOrderEntry): Array<{ entry: DraftOrderEntry; team: Team }> {
  return game.offseasonState?.draftOrder
    .filter((entry) => entry.overall > currentPick.overall && entry.overall <= currentPick.overall + 8)
    .map((entry) => ({ entry, team: game.teams[entry.teamId]! }))
    .filter(({ entry, team }) => Boolean(team) && !team.isUser && hasSourceDraftOrderPick(game, entry))
    .slice(0, 3) ?? [];
}

function buildPickAsset(teamId: string, pick: DraftOrderEntry, description?: string): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: `${teamId}-${pick.round}-${pick.pick}-${pick.originalTeamId}`,
    description: description ?? `Round ${pick.round}, Pick ${pick.pick}`,
  };
}

function gradeToScore(grade: string): number {
  const table: Record<string, number> = {
    'A+': 98,
    A: 94,
    'A-': 90,
    'B+': 87,
    B: 84,
    'B-': 80,
    'C+': 77,
    C: 74,
    'C-': 70,
    D: 64,
    F: 55,
  };
  return table[grade] ?? 84;
}

function scoreToGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 89) return 'A-';
  if (score >= 86) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 79) return 'B-';
  if (score >= 76) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 69) return 'C-';
  if (score >= 63) return 'D';
  return 'F';
}

function draftPickIdCandidates(pick: DraftPick, teamId = pick.currentTeamId): string[] {
  return [
    `${teamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`,
    `${teamId}-${pick.round}-${pick.pick}-${pick.originalTeamId}`,
  ];
}

function draftOrderIdForPick(pick: DraftPick, teamId = pick.currentTeamId): string {
  return `${teamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`;
}

function buildFuturePickAsset(game: GameState, team: Team, round: number): TradeOfferAsset | null {
  const pick = [...team.draftPicks]
    .filter((entry) => entry.currentTeamId === team.id && entry.year > game.year && entry.round === round)
    .sort((a, b) =>
      a.year - b.year ||
      a.pick - b.pick ||
      a.originalTeamId.localeCompare(b.originalTeamId))[0] ?? null;
  if (!pick) return null;
  return {
    type: 'pick',
    teamId: team.id,
    playerId: null,
    pickId: draftOrderIdForPick(pick, team.id),
    description: `Future round ${round} pick`,
  };
}

function describeAssets(assets: TradeOfferAsset[]): string {
  return assets
    .map((asset) => asset.description ?? asset.pickId ?? asset.playerId ?? asset.type)
    .filter(Boolean)
    .join(' + ') || 'draft assets';
}

function recordAcceptedDraftTradeNews(game: GameState, offer: DraftTradeOffer, userTeam: Team): void {
  const sourceTeam = game.teams[offer.from];
  const sourceLabel = sourceTeam ? `${sourceTeam.city} ${sourceTeam.name}` : offer.from;
  const userLabel = `${userTeam.city} ${userTeam.name}`;
  const sourceCity = sourceTeam?.city ?? offer.from;

  recordNewsItem(game, {
    id: `draft-trade-${game.year}-${game.week}-${offer.targetPick}-${offer.from}`,
    year: game.year,
    week: game.week,
    type: 'trade',
    headline: `${sourceCity} trades up to pick #${offer.targetPick}`,
    body: `${sourceLabel} sends ${describeAssets(offer.offer.offering)} to ${userLabel} for ${describeAssets(offer.offer.requesting)}. Draft order ownership updated before the next pick.`,
    teamIds: [offer.from, userTeam.id],
    playerIds: [],
    importance: 'breaking',
  });
}

function assetMatchesDraftPick(asset: TradeOfferAsset, pick: DraftPick): boolean {
  if (asset.type !== 'pick' || !asset.pickId) return false;
  return [
    ...draftPickIdCandidates(pick),
    ...draftPickIdCandidates(pick, asset.teamId),
  ].includes(asset.pickId);
}

function assetMatchesDraftOrderEntry(game: GameState, asset: TradeOfferAsset, entry: DraftOrderEntry): boolean {
  if (asset.type !== 'pick' || !asset.pickId) return false;
  const year = game.year;
  return [
    `${entry.teamId}-${year}-${entry.round}-${entry.pick}-${entry.originalTeamId}`,
    `${entry.teamId}-${entry.round}-${entry.pick}-${entry.originalTeamId}`,
    `${asset.teamId}-${year}-${entry.round}-${entry.pick}-${entry.originalTeamId}`,
    `${asset.teamId}-${entry.round}-${entry.pick}-${entry.originalTeamId}`,
  ].includes(asset.pickId);
}

function findLiveDraftOrderEntry(game: GameState, asset: TradeOfferAsset): DraftOrderEntry | null {
  return game.offseasonState?.draftOrder.find((entry) =>
    entry.teamId === asset.teamId && assetMatchesDraftOrderEntry(game, asset, entry)) ?? null;
}

function hasSourceDraftPick(game: GameState, asset: TradeOfferAsset): boolean {
  const fromTeam = game.teams[asset.teamId];
  return Boolean(fromTeam?.draftPicks.some((pick) => assetMatchesDraftPick(asset, pick)));
}

function updateDraftOrderForTransfer(
  game: GameState,
  transfer: { pick: DraftPick; fromTeamId: string; toTeamId: string },
): void {
  if (!game.offseasonState || transfer.pick.year !== game.year) return;
  game.offseasonState.draftOrder = game.offseasonState.draftOrder
    .map((entry) => {
      if (
        entry.teamId === transfer.fromTeamId &&
        entry.round === transfer.pick.round &&
        entry.pick === transfer.pick.pick &&
        entry.originalTeamId === transfer.pick.originalTeamId
      ) {
        return {
          ...entry,
          id: draftOrderIdForPick(transfer.pick, transfer.toTeamId),
          teamId: transfer.toTeamId,
        };
      }
      return entry;
    })
    .sort((a, b) => a.overall - b.overall);
}

function transferPick(
  game: GameState,
  asset: TradeOfferAsset,
  toTeamId: string,
): { pick: DraftPick; fromTeamId: string; toTeamId: string } | null {
  if (!asset.pickId) return null;
  const fromTeam = game.teams[asset.teamId];
  const toTeam = game.teams[toTeamId];
  if (!fromTeam || !toTeam) return null;
  const index = fromTeam.draftPicks.findIndex((pick) => assetMatchesDraftPick(asset, pick));
  if (index === -1) return null;
  const [pick] = fromTeam.draftPicks.splice(index, 1);
  if (!pick) return null;
  const fromTeamId = fromTeam.id;
  pick.currentTeamId = toTeamId;
  toTeam.draftPicks.push(pick);
  return { pick, fromTeamId, toTeamId };
}

export function generateDraftTradeOffers(
  game: GameState,
  currentPick: DraftOrderEntry,
  rng: () => number,
): DraftTradeOffer[] {
  if (getScenarioConstraints(game)?.blockTrades) return [];

  const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
  if (!userTeam || currentPick.teamId !== userTeam.id || !game.offseasonState) return [];
  if (!hasSourceDraftOrderPick(game, currentPick)) return [];

  const eliteProspect = topProspect(game.draftClass as DraftProspect[] | Player[]);
  if (!eliteProspect) return [];

  const leagueAverage = buildLeagueAverageByGroup(Object.values(game.teams));
  const targetGroup = groupForPosition((eliteProspect as DraftProspect).pos ?? (eliteProspect as Player).pos);
  const eliteScore = Number((eliteProspect as DraftProspect).trueGrade ?? (eliteProspect as Player).ovr ?? 0);

  return draftTradeCandidates(game, currentPick).flatMap(({ entry, team }) => {
    const report = analyzeTeamNeeds(team, leagueAverage);
    const targetGrade = report.positionGrades.find((grade) => grade.group === targetGroup) ?? null;
    const criticalNeedIndex = report.criticalNeeds.indexOf(targetGroup);
    const covetsPlayer =
      criticalNeedIndex !== -1 ||
      (
        targetGroup === 'QB' &&
        eliteScore >= 88 &&
        (targetGrade?.starterOvr ?? 0) <= 86
      ) ||
      (
        eliteScore >= 86 &&
        ['C+', 'C', 'D', 'F'].includes(targetGrade?.grade ?? 'B')
      );
    const speculativeChance = clamp(
      0.12 + premiumForGroup(targetGroup) / 100 + Math.max(0, eliteScore - 84) / 100,
      0.12,
      0.48,
    );
    if (!covetsPlayer && rng() > speculativeChance) return [];

    const urgency: DraftTradeOffer['urgency'] =
      report.criticalNeeds[0] === targetGroup || ['D', 'F'].includes(targetGrade?.grade ?? 'B')
        ? 'desperate'
        : report.criticalNeeds.includes(targetGroup) || (targetGroup === 'QB' && covetsPlayer)
          ? 'interested'
          : 'casual';

    const pickGap = calcPickValue({ round: entry.round, pick: entry.pick }) - calcPickValue({ round: currentPick.round, pick: currentPick.pick });
    const futureSweetener = pickGap < -150 ? buildFuturePickAsset(game, team, 3) : null;
    if (pickGap < -150 && !futureSweetener) return [];
    const sweetener = futureSweetener ? [futureSweetener] : [];

    return [{
      from: team.id,
      targetPick: currentPick.overall,
      offer: {
        offering: [buildPickAsset(team.id, entry), ...sweetener],
        requesting: [buildPickAsset(userTeam.id, currentPick, `Round ${currentPick.round}, Pick ${currentPick.pick}`)],
        type: 'mixed',
      },
      urgency,
      reasoning: `${team.city} wants to jump the queue for ${(eliteProspect as DraftProspect).pos ?? (eliteProspect as Player).pos} talent${criticalNeedIndex === 0 ? ' that fills a top need' : ''}.`,
    }];
  });
}

export function evaluateTradeUp(currentPick: number, targetPick: number): TradeUpEvaluation {
  const currentValue = calcPickValue({ round: 1, pick: currentPick });
  const targetValue = calcPickValue({ round: 1, pick: targetPick });
  const gap = Math.max(0, targetValue - currentValue);
  const extraAsset: TradeOfferAsset[] = [];

  if (gap > 90) {
    extraAsset.push({
      type: 'pick',
      teamId: 'user',
      playerId: null,
      pickId: 'user-future-3-user',
      description: 'Future round 3 pick',
    });
  }
  if (gap > 220) {
    extraAsset.push({
      type: 'pick',
      teamId: 'user',
      playerId: null,
      pickId: 'user-future-2-user',
      description: 'Future round 2 pick',
    });
  }

  return {
    cost: {
      offering: [
        {
          type: 'pick',
          teamId: 'user',
          playerId: null,
          pickId: `user-1-${currentPick}-user`,
          description: `Current pick #${currentPick}`,
        },
        ...extraAsset,
      ],
      requesting: [{
        type: 'pick',
        teamId: 'trade-partner',
        playerId: null,
        pickId: `trade-partner-1-${targetPick}-trade-partner`,
        description: `Target pick #${targetPick}`,
      }],
      type: extraAsset.length > 0 ? 'mixed' : 'pick_for_player',
    },
    worthIt: gap <= 350,
    reasoning: gap <= 120
      ? 'Reasonable move-up cost for a premium target.'
      : gap <= 250
        ? 'Expensive, but justifiable if a true difference-maker is available.'
        : 'Heavy premium. Only worth it for a franchise-level prospect.',
  };
}

export function evaluateTradeDown(
  _userTeam: Team,
  currentPick: number,
  targetPick: number,
  draftBoard: Array<DraftProspect | Player>,
): TradeDownEvaluation {
  const gap = Math.max(1, targetPick - currentPick);
  const bonusAssets: TradeOfferAsset[] = gap >= 8
    ? [{
      type: 'pick',
      teamId: 'trade-partner',
      playerId: null,
      pickId: 'trade-partner-future-3-trade-partner',
      description: 'Future round 3 pick',
    }]
    : [];

  return {
    haul: {
      offering: [{
        type: 'pick',
        teamId: 'user',
        playerId: null,
        pickId: `user-1-${currentPick}-user`,
        description: `Current pick #${currentPick}`,
      }],
      requesting: [{
        type: 'pick',
        teamId: 'trade-partner',
        playerId: null,
        pickId: `trade-partner-1-${targetPick}-trade-partner`,
        description: `Target pick #${targetPick}`,
      }, ...bonusAssets],
      type: 'mixed',
    },
    bestAvailableAfter: [...draftBoard]
      .sort((a, b) => Number((b as DraftProspect).trueGrade ?? (b as Player).ovr ?? 0) - Number((a as DraftProspect).trueGrade ?? (a as Player).ovr ?? 0))
      .slice(0, 5) as Player[],
  };
}

export function updateDraftWarRoomState(
  currentState: WarRoomState,
  pickResult: { playerId: string; expectedValue: number; actualValue: number },
): WarRoomState {
  const delta = pickResult.actualValue - pickResult.expectedValue;
  const nextScore = gradeToScore(currentState.draftGrade) + delta * 1.2;

  return {
    ...currentState,
    draftGrade: scoreToGrade(clamp(Math.round(nextScore), 55, 98)),
  };
}

export function buildDraftWarRoomState(game: GameState, rng: () => number): WarRoomState | null {
  const currentPick = game.offseasonState?.draftOrder[game.offseasonState.currentDraftPickIndex] ?? null;
  if (!currentPick) return null;

  return {
    currentPick: currentPick.overall,
    onTheClock: currentPick.teamId,
    timeRemaining: 90,
    incomingOffers: generateDraftTradeOffers(game, currentPick, rng),
    userCanTradeUp: Array.from({ length: Math.min(3, currentPick.overall - 1) }, (_, index) => {
      const targetPick = currentPick.overall - (index + 1);
      return {
        targetPick,
        cost: evaluateTradeUp(currentPick.overall, targetPick).cost,
      };
    }),
    draftGrade: game.warRoomState?.draftGrade ?? 'B',
  };
}

export function applyDraftTradeOffer(game: GameState, offer: DraftTradeOffer): GameState {
  if (getScenarioConstraints(game)?.blockTrades) return game;
  const userTeam = (Object.values(game.teams) as Team[]).find((team) => team.isUser) ?? null;
  const currentPick = game.offseasonState?.draftOrder[game.offseasonState.currentDraftPickIndex] ?? null;
  if (!userTeam || !currentPick || currentPick.teamId !== userTeam.id || currentPick.overall !== offer.targetPick) {
    return game;
  }

  const offeredLiveAssets = offer.offer.offering.filter((asset) => findLiveDraftOrderEntry(game, asset));
  const requestedLiveAssets = offer.offer.requesting.filter((asset) => findLiveDraftOrderEntry(game, asset));
  if (offeredLiveAssets.length === 0 || requestedLiveAssets.length === 0) return game;
  if (![...offeredLiveAssets, ...requestedLiveAssets].every((asset) => hasSourceDraftPick(game, asset))) {
    return game;
  }

  const nextState = structuredClone(game);
  const transfers: Array<{ pick: DraftPick; fromTeamId: string; toTeamId: string }> = [];
  for (const asset of offer.offer.offering) {
    const transfer = transferPick(nextState, asset, userTeam.id);
    if (transfer) transfers.push(transfer);
  }
  for (const asset of offer.offer.requesting) {
    const transfer = transferPick(nextState, asset, offer.from);
    if (transfer) transfers.push(transfer);
  }

  for (const transfer of transfers) {
    updateDraftOrderForTransfer(nextState, transfer);
  }

  recordAcceptedDraftTradeNews(nextState, offer, userTeam);

  return nextState;
}
