import { DIFF_SETTINGS } from '../config/difficulty';
import { mulberry32 } from '../rng';
import { generateAwards } from './awards';
import { runCoachingCarousel } from './coaching-carousel';
import { calculateCompPicks } from './comp-picks';
import { makeContract } from './contracts';
import { resolveConditions } from './conditional-picks';
import { ensureDraftClass } from './draft';
import { reevaluateLeagueStrategies } from './gm-strategies';
import { evaluateHandshakes } from './handshake-ledger';
import { inductHallOfFame } from './hall-of-fame';
import { syncPlayerArchiveEntry } from './history';
import { applyMentoringBonuses, formMentoringPairs } from './mentoring';
import { clearSeasonLivingWorldState } from './off-field-events';
import { processWaiverClaims } from './practice-squad';
import { createTransactionalPressConference, recordPressConference } from './press-conference';
import { progressPlayers } from './progression';
import { getSeasonRecordNotes, updateCareerRecords, updateSeasonRecords } from './records';
import { decayLeagueRivalries } from './rivalries';
import { createDefaultScoutingDepartment, generateScoutPool } from './scouting-staff';
import { generateTradeOffers } from './trade-market';
import type {
  AwardResult,
  ContractOffer,
  DraftOrderEntry,
  EngineOutput,
  FreeAgencyBid,
  GameState,
  OffseasonState,
  Player,
  ReSignDecision,
  Team,
} from '../types';

function cloneGame(game: GameState): GameState {
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function sortDraftTeams(a: Team, b: Team): number {
  if (a.wins !== b.wins) return a.wins - b.wins;
  if (a.losses !== b.losses) return b.losses - a.losses;
  if (a.ties !== b.ties) return a.ties - b.ties;
  if (a.seasonStats.pointDifferential !== b.seasonStats.pointDifferential) {
    return a.seasonStats.pointDifferential - b.seasonStats.pointDifferential;
  }
  return a.id.localeCompare(b.id);
}

function getPlayer(game: GameState, playerId: string): Player | null {
  return game.players[playerId] ?? null;
}

function findRosterPlayer(team: Team, playerId: string): Player | null {
  return team.roster.find((player) => player.id === playerId) ?? null;
}

function attachPlayerRecord(game: GameState, player: Player): void {
  game.players[player.id] = player;
}

function buildAskingPrice(player: Player): ContractOffer {
  const currentSalary = player.contract?.baseSalary ?? Math.max(1, player.ovr / 10);
  const years = player.age <= 25 ? 4 : player.age <= 29 ? 3 : 2;
  const greedMult = 0.9 + player.personality.greed / 20;
  const loyaltyDiscount = player.personality.loyalty >= 8 ? 0.9 : 1;
  const salary = Math.max(1, Math.round(currentSalary * greedMult * loyaltyDiscount * 10) / 10);
  const signingBonus = Math.round(salary * years * 0.25 * 10) / 10;
  const guaranteed = Math.round((salary * Math.min(years, 2) + signingBonus * 0.75) * 10) / 10;

  return {
    years,
    salary,
    signingBonus,
    guaranteed,
  };
}

function buildDraftOrder(game: GameState): DraftOrderEntry[] {
  const ordered: DraftOrderEntry[] = [];
  let overall = 1;

  for (let round = 1; round <= 7; round++) {
    const roundPicks = Object.values(game.teams)
      .flatMap((team) => team.draftPicks)
      .filter((entry) => entry.year === game.year && entry.round === round)
      .sort((a, b) =>
        a.pick - b.pick ||
        Number(a.isCompPick) - Number(b.isCompPick) ||
        a.originalTeamId.localeCompare(b.originalTeamId) ||
        a.currentTeamId.localeCompare(b.currentTeamId));

    for (const pick of roundPicks) {
      ordered.push({
        id: `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`,
        teamId: pick.currentTeamId,
        round: pick.round,
        pick: pick.pick,
        overall,
        originalTeamId: pick.originalTeamId,
      });
      overall += 1;
    }
  }

  return ordered;
}

function updateCap(team: Team, delta: number): void {
  team.capUsed = Math.round((team.capUsed + delta) * 10) / 10;
  team.capSpace = Math.round((team.capSpace - delta) * 10) / 10;
}

function applyOfferToPlayer(game: GameState, team: Team, player: Player, offer: ContractOffer): void {
  player.contract = makeContract(
    offer.salary,
    offer.years,
    offer.signingBonus,
    offer.guaranteed,
    player.id,
    team.id,
  );
  player.teamId = team.id;
  updateCap(team, offer.salary + player.contract.prorated);
  attachPlayerRecord(game, player);
  syncPlayerArchiveEntry(game, player, game.year);
}

function removePlayerFromRoster(team: Team, playerId: string): Player | null {
  const index = team.roster.findIndex((player) => player.id === playerId);
  if (index === -1) return null;
  const [player] = team.roster.splice(index, 1);
  return player ?? null;
}

function moveToFreeAgency(game: GameState, team: Team, playerId: string): void {
  const rosterPlayer = removePlayerFromRoster(team, playerId);
  const player = rosterPlayer ?? getPlayer(game, playerId);
  if (!player) return;

  team.txLog.push({
    type: 'LOSE_FA',
    year: game.year,
    week: game.week,
    playerId: player.id,
    fromTeamId: team.id,
  });
  syncPlayerArchiveEntry(game, player, game.year);
  player.teamId = null;
  player.contract = null;
  attachPlayerRecord(game, player);

  if (!game.freeAgents.includes(playerId)) {
    game.freeAgents.push(playerId);
  }
}

function decrementCarryoverContracts(game: GameState, offseason: OffseasonState): void {
  const expiring = new Set(offseason.expiringPlayerIds);

  for (const team of Object.values(game.teams)) {
    for (const player of team.roster) {
      if (!player.contract || expiring.has(player.id)) continue;
      player.contract.years = Math.max(1, player.contract.years - 1);
      player.contract.yearlyBreakdown = player.contract.yearlyBreakdown.slice(1);
      if (player.contract.yearlyBreakdown.length === 0) {
        player.contract.yearlyBreakdown = [{
          year: game.year,
          baseSalary: player.contract.baseSalary,
          capHit: player.contract.baseSalary + player.contract.prorated,
          deadCap: player.contract.prorated,
          guaranteed: false,
        }];
      }
      attachPlayerRecord(game, player);
    }
  }
}

function scoreOffer(offer: ContractOffer, ask: ContractOffer): number {
  return (
    offer.salary * 10 +
    offer.guaranteed * 1.5 +
    offer.signingBonus +
    offer.years * 2 -
    ask.salary * 6 -
    ask.guaranteed * 0.75
  );
}

function acceptThreshold(player: Player): number {
  return 8 + player.personality.greed - player.personality.loyalty;
}

function resolveUserOffer(player: Player, decision: ReSignDecision): boolean {
  if (!decision.lastOffer) return false;
  return scoreOffer(decision.lastOffer, decision.askingPrice) >= acceptThreshold(player);
}

function resolveAiReSigns(game: GameState, offseason: OffseasonState): void {
  const userTeamId = findUserTeam(game)?.id ?? null;

  for (const playerId of offseason.expiringPlayerIds) {
    const player = getPlayer(game, playerId);
    const decision = offseason.reSignDecisions[playerId];
    if (!player || !decision) continue;
    if (decision.teamId === userTeamId) continue;

    const team = game.teams[decision.teamId];
    if (!team) continue;

    const canAfford = team.capSpace >= decision.askingPrice.salary * 1.25;
    const wantsPlayer = player.ovr >= 72 || player.pos === 'QB' || player.personality.loyalty >= 7;

    if (canAfford && wantsPlayer) {
      applyOfferToPlayer(game, team, player, decision.askingPrice);
      decision.lastOffer = decision.askingPrice;
      decision.status = 'accepted';
    } else {
      decision.status = 'walked';
    }
  }
}

function resolveUserReSigns(game: GameState, offseason: OffseasonState): void {
  const userTeam = findUserTeam(game);
  if (!userTeam) return;

  for (const playerId of offseason.expiringPlayerIds) {
    const player = findRosterPlayer(userTeam, playerId);
    const decision = offseason.reSignDecisions[playerId];
    if (!player || !decision || decision.teamId !== userTeam.id) continue;

    if (resolveUserOffer(player, decision)) {
      applyOfferToPlayer(game, userTeam, player, decision.lastOffer!);
      decision.status = 'accepted';
      continue;
    }

    decision.status = decision.lastOffer ? 'declined' : 'walked';
  }
}

function finalizeUnsignedExpiringPlayers(game: GameState, offseason: OffseasonState): void {
  for (const playerId of offseason.expiringPlayerIds) {
    const decision = offseason.reSignDecisions[playerId];
    if (decision?.status === 'accepted') continue;
    const team = game.teams[decision?.teamId ?? ''];
    if (team) moveToFreeAgency(game, team, playerId);
  }
}

function createAiBid(player: Player, ask: ContractOffer, team: Team, round: number, difficulty: GameState['difficulty']): FreeAgencyBid | null {
  if (team.capSpace < ask.salary) return null;
  const positionNeed = team.roster
    .filter((candidate) => candidate.pos === player.pos)
    .reduce((lowest, candidate) => Math.min(lowest, candidate.ovr), 99);
  const needBoost = Math.max(0, 78 - positionNeed);
  const difficultyMult = DIFF_SETTINGS[difficulty].aiBidMod;
  const salary = Math.round((ask.salary * (0.88 + needBoost / 100) * difficultyMult) * 10) / 10;
  const signingBonus = Math.round((ask.signingBonus * (0.8 + needBoost / 120)) * 10) / 10;
  const guaranteed = Math.round((ask.guaranteed * (0.82 + needBoost / 150)) * 10) / 10;

  return {
    playerId: player.id,
    teamId: team.id,
    years: ask.years,
    salary,
    signingBonus,
    guaranteed,
    round,
    score: scoreOffer({ years: ask.years, salary, signingBonus, guaranteed }, ask),
    status: 'pending',
  };
}

function resolveFreeAgencyRound(game: GameState, offseason: OffseasonState): void {
  const userTeam = findUserTeam(game);

  for (const playerId of [...game.freeAgents]) {
    const player = getPlayer(game, playerId);
    if (!player) continue;

    const ask = buildAskingPrice(player);
    const userBids = (offseason.freeAgencyBids[playerId] ?? []).filter((bid) => bid.round === offseason.round);
    const aiBids = Object.values(game.teams)
      .filter((team) => !team.isUser)
      .map((team) => createAiBid(player, ask, team, offseason.round, game.difficulty))
      .filter((bid): bid is FreeAgencyBid => bid !== null)
      .slice(0, 3);

    const bids = [...userBids, ...aiBids].sort((a, b) => b.score - a.score || a.teamId.localeCompare(b.teamId));
    offseason.freeAgencyBids[playerId] = bids;

    const winner = bids[0];
    if (!winner) continue;
    if (winner.score < acceptThreshold(player)) continue;

    const team = game.teams[winner.teamId];
    if (!team) continue;

    const signedPlayer = player;
    if (!team.roster.some((candidate) => candidate.id === signedPlayer.id)) {
      team.roster.push(signedPlayer);
    }
    applyOfferToPlayer(game, team, signedPlayer, winner);
    team.txLog.push({
      type: 'SIGN_FA',
      year: game.year,
      week: game.week,
      playerId: signedPlayer.id,
      toTeamId: team.id,
    });
    game.freeAgents = game.freeAgents.filter((id) => id !== playerId);

    for (const bid of bids) {
      bid.status = bid.teamId === winner.teamId ? 'won' : 'lost';
    }
  }
}

function currentSeasonYear(game: GameState): number {
  return game.year - 1;
}

function markCompletedSeason(game: GameState, seasonYear: number): void {
  for (const player of Object.values(game.players)) {
    if ((player.careerStats.lastSeasonCountedYear ?? 0) === seasonYear) continue;
    player.careerStats.seasons = (player.careerStats.seasons ?? 0) + 1;
    player.careerStats.lastSeasonCountedYear = seasonYear;
  }
}

function patchSeasonHistory(game: GameState, seasonYear: number, awards: AwardResult[]): void {
  for (const entry of game.franchiseHistory) {
    if (entry.year !== seasonYear) continue;
    entry.awardsWon = awards
      .filter((award) => !['all_pro_first_team', 'all_pro_second_team', 'pro_bowl'].includes(award.awardId))
      .filter((award) => award.winnerTeamId === entry.teamId)
      .map((award) => award.label);
    entry.recordsBroken = getSeasonRecordNotes(game, seasonYear, entry.teamId);
  }
}

function patchMentoringHistory(game: GameState, seasonYear: number, team: Team, pairs: Team['mentoringPairs']): void {
  if (pairs.length === 0) return;

  const entry = game.franchiseHistory.find((history) => history.year === seasonYear && history.teamId === team.id);
  if (!entry) return;

  const existing = new Set(entry.majorEvents);
  for (const pair of pairs) {
    const event = `Mentoring: ${pair.mentorName} -> ${pair.menteeName} (+${pair.bonus} OVR)`;
    if (existing.has(event)) continue;
    entry.majorEvents.push(event);
    existing.add(event);
  }
}

function stampChampionCareers(game: GameState, seasonYear: number): void {
  const championTeamId = game.playoffBracket?.championTeamId ?? null;
  if (!championTeamId) return;

  const champion = game.teams[championTeamId];
  if (!champion) return;

  for (const player of champion.roster) {
    if ((player.careerStats.lastChampionshipYear ?? 0) === seasonYear) continue;
    player.careerStats.championships = (player.careerStats.championships ?? 0) + 1;
    player.careerStats.lastChampionshipYear = seasonYear;
  }
}

function refreshScoutPool(game: GameState): void {
  if (!game.scoutingDepartment) {
    game.scoutingDepartment = createDefaultScoutingDepartment();
  }
  const rand = mulberry32((game.seed ^ (game.year * 7919)) >>> 0);
  game.scoutingDepartment.availableScouts = generateScoutPool(rand, game.year);
}

function resetPracticeSquads(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    if (!team.practiceSquad) {
      team.practiceSquad = [];
    }
    for (const squadPlayer of team.practiceSquad) {
      const player = game.players[squadPlayer.playerId];
      if (!player) continue;
      if (!game.freeAgents.includes(player.id)) {
        game.freeAgents.push(player.id);
      }
      player.teamId = null;
      player.contract = null;
    }
    team.practiceSquad = [];
  }
  game.waiverWire = [];
  game.waiverClaims = [];
  processWaiverClaims(game);
}

function rebuildDraftBoard(game: GameState): void {
  if (!game.offseasonState) return;
  game.offseasonState.draftOrder = buildDraftOrder(game);
  game.offseasonState.currentDraftPickIndex = 0;
  game.offseasonState.completedDraftPickIds = [];
}

export function initializeOffseasonState(game: GameState): OffseasonState {
  refreshScoutPool(game);
  const expiringPlayers = Object.values(game.teams)
    .flatMap((team) => team.roster)
    .filter((player) => (player.contract?.years ?? 0) <= 1);

  const reSignDecisions = expiringPlayers.reduce<Record<string, ReSignDecision>>((acc, player) => {
    acc[player.id] = {
      playerId: player.id,
      teamId: player.teamId ?? '',
      askingPrice: buildAskingPrice(player),
      lastOffer: null,
      status: 'pending',
    };
    return acc;
  }, {});

  return {
    round: 1,
    expiringPlayerIds: expiringPlayers.map((player) => player.id),
    reSignDecisions,
    freeAgencyBids: {},
    scoutingState: {},
    tradeOffers: [],
    draftOrder: buildDraftOrder(game),
    currentDraftPickIndex: 0,
    completedDraftPickIds: [],
  };
}

export function submitReSignOffer(game: GameState, playerId: string, offer: ContractOffer): EngineOutput {
  const nextState = cloneGame(game);
  const decision = nextState.offseasonState?.reSignDecisions[playerId];
  if (decision) {
    decision.lastOffer = offer;
    decision.status = 'pending';
  }

  return { nextState, events: [], consequences: [] };
}

export function submitFreeAgentBid(game: GameState, playerId: string, offer: ContractOffer): EngineOutput {
  const nextState = cloneGame(game);
  const userTeam = findUserTeam(nextState);
  if (nextState.offseasonState && userTeam) {
    const bids = nextState.offseasonState.freeAgencyBids[playerId] ?? [];
    const currentRound = nextState.offseasonState.round;
    const filtered = bids.filter((bid) => !(bid.teamId === userTeam.id && bid.round === currentRound));
    filtered.push({
      ...offer,
      playerId,
      teamId: userTeam.id,
      round: currentRound,
      score: scoreOffer(offer, buildAskingPrice(nextState.players[playerId]!)),
      status: 'pending',
    });
    nextState.offseasonState.freeAgencyBids[playerId] = filtered;
  }

  return { nextState, events: [], consequences: [] };
}

export function advanceOffseason(game: GameState): void {
  if (!game.offseasonState) {
    ensureDraftClass(game);
    game.offseasonState = initializeOffseasonState(game);
  }
  if (game.scoutingDepartment.availableScouts.length === 0) {
    refreshScoutPool(game);
  }

  const seasonYear = currentSeasonYear(game);
  markCompletedSeason(game, seasonYear);
  clearSeasonLivingWorldState(game);
  stampChampionCareers(game, seasonYear);
  const awards = generateAwards(game, seasonYear);
  resolveConditions(game);
  evaluateHandshakes(game);
  updateSeasonRecords(game, seasonYear);
  updateCareerRecords(game, seasonYear);
  patchSeasonHistory(game, seasonYear, awards.awards);
  decrementCarryoverContracts(game, game.offseasonState);
  resolveUserReSigns(game, game.offseasonState);
  resolveAiReSigns(game, game.offseasonState);
  finalizeUnsignedExpiringPlayers(game, game.offseasonState);
  const hofClass = inductHallOfFame(game, seasonYear);
  decayLeagueRivalries(game);
  const carousel = runCoachingCarousel(game, seasonYear);
  const hireEvents = carousel.events.filter((event) => event.type === 'coach_hired');
  for (const event of hireEvents) {
    const teamId = String(event.data['teamId'] ?? '');
    const team = game.teams[teamId];
    if (!team) continue;
    const pressConference = createTransactionalPressConference({
      game,
      teamId: team.id,
      type: 'coaching_change',
      topic: `${team.city} introduces ${team.staff.hc?.name ?? 'a new head coach'}`,
      speaker: 'General Manager',
    });
    recordPressConference(game, pressConference);
  }
  const mentoringPairs = formMentoringPairs(game, game.year);
  for (const team of Object.values(game.teams)) {
    patchMentoringHistory(game, seasonYear, team, team.mentoringPairs);
  }
  const mentoringBonuses = applyMentoringBonuses(game, mentoringPairs);
  const progression = progressPlayers(game, { mentoringBonuses });
  game.eventLog.push(...progression.events);
  resetPracticeSquads(game);
  const narrativeAdds = [
    awards.ceremony.headline,
    ...hofClass.map((entry) => `${entry.name} enters the Hall of Fame.`),
    ...progression.events.map((event) => event.description),
  ];
  if (narrativeAdds.length > 0) {
    game.narrativeState.recentHeadlines = [
      ...narrativeAdds,
      ...game.narrativeState.recentHeadlines,
    ].slice(0, 8);
  }
  const strategyEvents = reevaluateLeagueStrategies(game);
  game.eventLog.push(...strategyEvents);
  game.offseasonState.tradeOffers = generateTradeOffers(game);
  game.phase = 'free_agency';
  game.week = 1;
}

export function advanceFreeAgency(game: GameState): void {
  if (!game.offseasonState) {
    game.offseasonState = initializeOffseasonState(game);
  }

  resolveFreeAgencyRound(game, game.offseasonState);
  game.offseasonState.tradeOffers = generateTradeOffers(game);

  if (game.offseasonState.round >= 3) {
    for (const team of Object.values(game.teams)) {
      calculateCompPicks(game, team.id);
    }
    rebuildDraftBoard(game);
    game.phase = 'draft';
    game.week = 1;
    return;
  }

  game.offseasonState.round += 1;
  game.week = game.offseasonState.round;
}
