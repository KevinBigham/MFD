import { calcPickValue } from './trade-value';
import { buildLeagueAverageByGroup, analyzeTeamNeeds } from './team-needs';
import type {
  DraftOrderEntry,
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

function synthesizedEntry(currentPick: DraftOrderEntry, teamId: string, offset: number): DraftOrderEntry {
  const overall = currentPick.overall + offset;
  return {
    id: `${teamId}-${currentPick.round}-${overall}-${teamId}`,
    teamId,
    round: currentPick.round,
    pick: currentPick.pick + offset,
    overall,
    originalTeamId: teamId,
  };
}

function draftTradeCandidates(game: GameState, currentPick: DraftOrderEntry): Array<{ entry: DraftOrderEntry; team: Team }> {
  const actualCandidates = game.offseasonState?.draftOrder
    .filter((entry) => entry.overall > currentPick.overall && entry.overall <= currentPick.overall + 8)
    .map((entry) => ({ entry, team: game.teams[entry.teamId]! }))
    .filter(({ team }) => Boolean(team) && !team.isUser) ?? [];

  if (actualCandidates.length >= 3) {
    return actualCandidates;
  }

  const seenTeams = new Set(actualCandidates.map(({ team }) => team.id));
  let offset = 1;
  for (const team of Object.values(game.teams).sort((a, b) => a.id.localeCompare(b.id))) {
    if (team.isUser || seenTeams.has(team.id)) continue;
    actualCandidates.push({
      entry: synthesizedEntry(currentPick, team.id, offset),
      team,
    });
    offset += 1;
    if (actualCandidates.length >= 3) break;
  }

  return actualCandidates;
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

function transferPick(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (!asset.pickId) return;
  const fromTeam = game.teams[asset.teamId];
  const toTeam = game.teams[toTeamId];
  if (!fromTeam || !toTeam) return;
  const index = fromTeam.draftPicks.findIndex((pick) =>
    `${pick.currentTeamId}-${pick.round}-${pick.pick}-${pick.originalTeamId}` === asset.pickId ||
    `${asset.teamId}-${pick.round}-${pick.pick}-${pick.originalTeamId}` === asset.pickId,
  );
  if (index === -1) return;
  const [pick] = fromTeam.draftPicks.splice(index, 1);
  if (!pick) return;
  pick.currentTeamId = toTeamId;
  toTeam.draftPicks.push(pick);
}

export function generateDraftTradeOffers(
  game: GameState,
  currentPick: DraftOrderEntry,
  rng: () => number,
): DraftTradeOffer[] {
  const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
  if (!userTeam || currentPick.teamId !== userTeam.id || !game.offseasonState) return [];

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
    const sweetener = pickGap < -150
      ? [{
        type: 'pick' as const,
        teamId: team.id,
        playerId: null,
        pickId: `${team.id}-future-3-${team.id}`,
        description: 'Future round 3 pick',
      }]
      : [];

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
  const nextState = JSON.parse(JSON.stringify(game)) as GameState;
  const userTeam = (Object.values(nextState.teams) as Team[]).find((team) => team.isUser) ?? null;
  if (!userTeam) return nextState;

  for (const asset of offer.offer.offering) {
    transferPick(nextState, asset, userTeam.id);
  }
  for (const asset of offer.offer.requesting) {
    transferPick(nextState, asset, offer.from);
  }

  if (nextState.offseasonState) {
    nextState.offseasonState.draftOrder = nextState.offseasonState.draftOrder
      .map((entry: DraftOrderEntry) => {
        if (entry.teamId === offer.from && entry.overall === offer.targetPick) {
          return entry;
        }
        return entry;
      })
      .sort((a: DraftOrderEntry, b: DraftOrderEntry) => a.overall - b.overall);
  }

  return nextState;
}
