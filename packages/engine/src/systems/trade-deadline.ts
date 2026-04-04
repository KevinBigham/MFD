import { generateTradeOffers } from './trade-market';
import { calcPickValue, calcPlayerValue } from './trade-value';
import type {
  DeadlineDeal,
  DraftPick,
  GameState,
  Player,
  Team,
  TradeDeadlineState,
  TradeOffer,
} from '../types';
import type { PrngFn } from '../rng';

function cloneGame(game: GameState): GameState {
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function pickWithRng<T>(items: readonly T[], rng: PrngFn): T {
  return items[Math.floor(rng() * items.length)]!;
}

function randInt(rng: PrngFn, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickId(pick: DraftPick): string {
  return `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`;
}

function pickDescription(pick: DraftPick): string {
  const suffix = pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th';
  return `${pick.round}${suffix}-round pick`;
}

function urgencyLevel(minutesRemaining: number): TradeDeadlineState['urgencyLevel'] {
  if (minutesRemaining <= 15) return 'buzzer_beater';
  if (minutesRemaining <= 60) return 'frantic';
  if (minutesRemaining <= 120) return 'heating_up';
  return 'calm';
}

function isContender(team: Team): boolean {
  return team.wins > team.losses || team.gmStrategy === 'contend';
}

function isSeller(team: Team): boolean {
  return team.losses > team.wins || team.gmStrategy === 'rebuild';
}

function contractCost(player: Player): number {
  if (!player.contract) return Math.max(1, Math.round(player.ovr / 10));
  return (player.contract.baseSalary ?? 0) + (player.contract.prorated ?? 0);
}

function veteranCandidates(team: Team): Player[] {
  return [...team.roster]
    .filter((player) => player.age >= 28 || player.ovr >= 82)
    .sort((left, right) => right.ovr - left.ovr || right.age - left.age || left.id.localeCompare(right.id));
}

function playerMap(players: Player[]): Record<string, Player> {
  return players.reduce<Record<string, Player>>((map, player) => {
    map[player.id] = player;
    return map;
  }, {});
}

function gradeFromScore(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

function parseFallbackPickValue(label: string): number {
  const roundMatch = label.match(/(\d+)(?:st|nd|rd|th)-round/);
  const round = roundMatch ? Number(roundMatch[1]) : 4;
  return calcPickValue({ round, pick: 16 });
}

function selectCompensation(buyer: Team, playerValue: number, rng: PrngFn): { picks: DraftPick[]; ids: string[]; descriptions: string[] } {
  const available = [...buyer.draftPicks]
    .filter((pick) => pick.year === 2026)
    .sort((left, right) => left.round - right.round || left.pick - right.pick);
  const selected: DraftPick[] = [];
  let totalValue = 0;

  for (const pick of available) {
    if (selected.length >= 3) break;
    if (totalValue >= playerValue * 0.82) break;
    selected.push(pick);
    totalValue += calcPickValue(pick);
  }

  if (selected.length === 0 && available.length > 0) {
    selected.push(available[0]!);
  }

  if (selected.length === 0) {
    const syntheticRound = randInt(rng, 2, 4);
    const synthetic: DraftPick = {
      round: syntheticRound,
      pick: randInt(rng, 8, 24),
      originalTeamId: buyer.id,
      currentTeamId: buyer.id,
      year: 2026,
      isCompPick: false,
    };
    selected.push(synthetic);
  }

  return {
    picks: selected,
    ids: selected.map((pick) => pickId(pick)),
    descriptions: selected.map((pick) => pickDescription(pick)),
  };
}

export function gradeDeadlineDeal(
  deal: DeadlineDeal,
  teams: Record<string, Team>,
  players: Player[],
): { buyerGrade: string; sellerGrade: string } {
  const mappedPlayers = playerMap(players);
  const movedPlayers = deal.players.map((playerId) => mappedPlayers[playerId]).filter((player): player is Player => Boolean(player));
  const starPower = movedPlayers.reduce((sum, player) => sum + player.ovr, 0) / Math.max(1, movedPlayers.length);
  const pickValue = (deal.pickIds ?? []).length > 0
    ? (deal.pickIds ?? []).reduce((sum, id) => {
      const team = teams[deal.teams[0]];
      const pick = team?.draftPicks.find((candidate) => pickId(candidate) === id);
      return sum + (pick ? calcPickValue(pick) : parseFallbackPickValue(id));
    }, 0)
    : deal.picks.reduce((sum, label) => sum + parseFallbackPickValue(label), 0);

  const buyerBase = 78 + (starPower >= 85 ? 18 : starPower >= 82 ? 16 : starPower >= 78 ? 10 : 4) - Math.max(0, (pickValue - 520) / 55);
  const sellerBase = 68 + Math.min(24, pickValue / 28) - Math.max(0, (starPower - 84) * 2.2) + (deal.splash ? 2 : 0);

  return {
    buyerGrade: gradeFromScore(Math.round(Math.max(40, Math.min(99, buyerBase)))),
    sellerGrade: gradeFromScore(Math.round(Math.max(40, Math.min(97, sellerBase)))),
  };
}

function buildNarrative(buyer: Team, seller: Team, acquiredPlayer: Player, picks: string[], splash: boolean): string {
  const opening = splash ? 'In a stunning move' : 'Sources say';
  return `${opening}, the ${buyer.city} ${buyer.name} land ${acquiredPlayer.name} from the ${seller.city} ${seller.name} for ${picks.join(' and ')}.`;
}

export function getTickerMessage(
  deal: DeadlineDeal,
  teams: Record<string, Team>,
  players: Player[],
): string {
  const mappedPlayers = playerMap(players);
  const buyer = teams[deal.teams[0]];
  const seller = teams[deal.teams[1]];
  const mainPlayer = mappedPlayers[deal.players[0] ?? ''];
  return `BREAKING: ${buyer?.city ?? 'A contender'} acquires ${mainPlayer?.name ?? 'a veteran'} from ${seller?.city ?? 'another team'} for ${deal.picks.join(' and ')}.`;
}

export function generateDeadlineDeal(
  teams: Record<string, Team>,
  contenderIds: string[],
  sellerIds: string[],
  players: Player[],
  rng: PrngFn,
): DeadlineDeal {
  const mappedPlayers = playerMap(players);
  const fallbackTeamIds = Object.values(teams)
    .filter((team) => !team.isUser)
    .map((team) => team.id);
  const validContenders = (contenderIds.filter((teamId) => teams[teamId]).length > 0
    ? contenderIds.filter((teamId) => teams[teamId])
    : fallbackTeamIds);
  const validSellers = (sellerIds.filter((teamId) => teams[teamId]).length > 0
    ? sellerIds.filter((teamId) => teams[teamId])
    : fallbackTeamIds);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const buyerId = pickWithRng(validContenders, rng);
    const sellerId = pickWithRng(validSellers.filter((teamId) => teamId !== buyerId), rng);
    const buyer = teams[buyerId]!;
    const seller = teams[sellerId]!;
    const target = veteranCandidates(seller)
      .filter((player) => player.teamId === seller.id)
      .filter((player) => buyer.capSpace + 5 >= contractCost(player))[0];
    if (!target) continue;

    const playerValue = Math.max(1, calcPlayerValue({
      version: 0,
      seed: 0,
      year: 2026,
      week: 9,
    } as unknown as GameState, target, buyer));
    const compensation = selectCompensation(buyer, playerValue, rng);
    const splash = target.ovr >= 82;
    const draftDeal: DeadlineDeal = {
      id: `deadline-${buyer.id}-${seller.id}-${target.id}`,
      teams: [buyer.id, seller.id],
      players: [target.id],
      picks: compensation.descriptions,
      pickIds: compensation.ids,
      timestamp: randInt(rng, 20, 230),
      grade: 'B',
      splash,
      narrative: buildNarrative(buyer, seller, mappedPlayers[target.id] ?? target, compensation.descriptions, splash),
    };
    draftDeal.grade = gradeDeadlineDeal(draftDeal, teams, players).buyerGrade;
    return draftDeal;
  }

  const fallbackBuyer = teams[validContenders[0]!]!;
  const fallbackSeller = teams[validSellers[0]!]!;
  const fallbackPlayer = veteranCandidates(fallbackSeller)[0] ?? fallbackSeller.roster[0]!;
  const fallbackPicks = selectCompensation(fallbackBuyer, 250, rng);
  const fallback: DeadlineDeal = {
    id: `deadline-${fallbackBuyer.id}-${fallbackSeller.id}-${fallbackPlayer.id}`,
    teams: [fallbackBuyer.id, fallbackSeller.id],
    players: [fallbackPlayer.id],
    picks: fallbackPicks.descriptions,
    pickIds: fallbackPicks.ids,
    timestamp: 60,
    grade: 'B',
    splash: fallbackPlayer.ovr >= 82,
    narrative: buildNarrative(fallbackBuyer, fallbackSeller, fallbackPlayer, fallbackPicks.descriptions, fallbackPlayer.ovr >= 82),
  };
  fallback.grade = gradeDeadlineDeal(fallback, teams, players).buyerGrade;
  return fallback;
}

export function initializeDeadline(gameState: GameState, rng: PrngFn): TradeDeadlineState {
  const aiTeams = Object.values(gameState.teams).filter((team) => !team.isUser);
  const contenderIds = aiTeams.filter(isContender).map((team) => team.id);
  const sellerIds = aiTeams.filter(isSeller).map((team) => team.id);
  const derivedContenders = contenderIds.length > 0
    ? contenderIds
    : [...aiTeams]
      .sort((left, right) => right.wins - left.wins || left.id.localeCompare(right.id))
      .slice(0, Math.max(1, Math.floor(aiTeams.length / 2)))
      .map((team) => team.id);
  const derivedSellers = sellerIds.length > 0
    ? sellerIds
    : [...aiTeams]
      .sort((left, right) => left.wins - right.wins || left.id.localeCompare(right.id))
      .slice(0, Math.max(1, Math.floor(aiTeams.length / 2)))
      .map((team) => team.id);
  const dealCount = Math.max(3, Math.min(8, 3 + Math.floor(rng() * 6)));
  const scheduledDeals: DeadlineDeal[] = [];
  const usedPlayers = new Set<string>();

  for (let index = 0; index < dealCount; index += 1) {
    const deal = generateDeadlineDeal(gameState.teams, derivedContenders, derivedSellers, Object.values(gameState.players), rng);
    if (usedPlayers.has(deal.players[0]!)) continue;
    usedPlayers.add(deal.players[0]!);
    scheduledDeals.push({
      ...deal,
      timestamp: Math.max(5, 225 - index * randInt(rng, 22, 48)),
    });
  }

  scheduledDeals.sort((left, right) => right.timestamp - left.timestamp || left.id.localeCompare(right.id));
  const pendingOffers = generateTradeOffers(gameState)
    .filter((offer) => offer.direction === 'inbound')
    .slice(0, 3);

  return {
    isDeadlineWeek: true,
    minutesRemaining: 240,
    completedDeals: [],
    scheduledDeals,
    pendingOffers,
    urgencyLevel: 'calm',
    tickerMessages: ['TRADE DEADLINE OPEN: Phones are already buzzing around the league.'],
  };
}

export function advanceDeadlineClock(
  state: TradeDeadlineState,
  minutesToAdvance: number,
  _rng: PrngFn,
): TradeDeadlineState {
  const nextMinutes = Math.max(0, state.minutesRemaining - minutesToAdvance);
  const revealedIds = new Set(state.completedDeals.map((deal) => deal.id));
  const newlyRevealed = (state.scheduledDeals ?? [])
    .filter((deal) => !revealedIds.has(deal.id))
    .filter((deal) => deal.timestamp <= state.minutesRemaining && deal.timestamp > nextMinutes);

  return {
    ...state,
    minutesRemaining: nextMinutes,
    completedDeals: [...state.completedDeals, ...newlyRevealed].sort((left, right) => right.timestamp - left.timestamp || left.id.localeCompare(right.id)),
    urgencyLevel: urgencyLevel(nextMinutes),
    tickerMessages: [
      ...state.tickerMessages,
      ...newlyRevealed.map((deal) => deal.narrative),
    ].slice(-20),
  };
}

function movePlayer(game: GameState, fromTeamId: string, toTeamId: string, playerId: string): void {
  const fromTeam = game.teams[fromTeamId];
  const toTeam = game.teams[toTeamId];
  if (!fromTeam || !toTeam) return;
  const index = fromTeam.roster.findIndex((player) => player.id === playerId);
  if (index === -1) return;
  const [player] = fromTeam.roster.splice(index, 1);
  if (!player) return;
  player.teamId = toTeamId;
  toTeam.roster.push(player);
  game.players[player.id] = player;
}

function movePick(game: GameState, fromTeamId: string, toTeamId: string, pickIdString: string): void {
  const fromTeam = game.teams[fromTeamId];
  const toTeam = game.teams[toTeamId];
  if (!fromTeam || !toTeam) return;
  const index = fromTeam.draftPicks.findIndex((pick) => pickId(pick) === pickIdString);
  if (index === -1) return;
  const [pick] = fromTeam.draftPicks.splice(index, 1);
  if (!pick) return;
  pick.currentTeamId = toTeamId;
  toTeam.draftPicks.push(pick);
}

function applyDeadlineDeal(game: GameState, deal: DeadlineDeal): void {
  const buyerId = deal.teams[0];
  const sellerId = deal.teams[1];
  for (const playerId of deal.players) {
    movePlayer(game, sellerId, buyerId, playerId);
  }
  for (const pickIdString of deal.pickIds ?? []) {
    movePick(game, buyerId, sellerId, pickIdString);
  }
}

export function finalizeDeadline(gameState: GameState, deadlineState: TradeDeadlineState): GameState {
  const nextState = cloneGame(gameState);
  for (const deal of deadlineState.completedDeals) {
    applyDeadlineDeal(nextState, deal);
  }
  nextState.tradeDeadlineState = undefined;
  return nextState;
}
