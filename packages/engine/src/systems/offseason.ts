import { DIFF_SETTINGS } from '../config/difficulty';
import { mulberry32, RNG } from '../rng';
import { checkAchievements } from './achievements';
import { generateAwards } from './awards';
import { applyCBADealToRules, checkCBAStatus, getLockoutRisk, initCBA } from './cba-engine';
import { recordCeremony, generateAwardsNight, generateChampionshipCeremony, generateHOFInduction } from './ceremonies';
import { runCoachingCarousel } from './coaching-carousel';
import { calculateCompPicks } from './comp-picks';
import { advanceCommissioner, initCommissioner } from './commissioner';
import { makeContract } from './contracts';
import { resolveConditions } from './conditional-picks';
import { ensureDraftClass } from './draft';
import { recordDynastyEvent } from './dynasty-timeline';
import { generateEndorsementOffers, getEndorsementNarrative, tickEndorsements } from './endorsements';
import { replenishFacilityBudget } from './facilities';
import { reevaluateLeagueStrategies } from './gm-strategies';
import { evaluateHandshakes } from './handshake-ledger';
import { inductHallOfFame } from './hall-of-fame';
import { syncPlayerArchiveEntry } from './history';
import { generateMedicalStaffPool } from './injury-system';
import { assignJerseyNumber, generateJerseyRetirement, shouldRetireJersey } from './jersey-retirement';
import { getActiveRule, initLeagueRules } from './league-rules';
import { generateOffseasonNews, recordGovernanceNews, recordLaborNews, recordNewsItem } from './league-news';
import { generateLaborEvent, initLaborState } from './labor-relations';
import { initializeLockerRoom, syncLockerRoomRoster } from './locker-room';
import { applyMentoringBonuses, formMentoringPairs } from './mentoring';
import { recordBeat } from './narrative-director';
import { clearSeasonLivingWorldState } from './off-field-events';
import { buildTrainingProgressionBonuses, clearTrainingAssignments } from './player-development';
import { archivePlayerSeasonHistory } from './player-profile';
import { agentDemand, ensureAgentsInitialized, getAgentPatienceWeeks, getPlayerAgent, negotiateOffer } from './player-agents';
import { processWaiverClaims } from './practice-squad';
import { createTransactionalPressConference, recordPressConference } from './press-conference';
import { progressPlayers } from './progression';
import { getSeasonRecordNotes, updateCareerRecords, updateSeasonRecords } from './records';
import { decayLeagueRivalries } from './rivalries';
import { decayRivalries } from './player-rivalries';
import { getScenarioConstraints } from './scenario-challenge';
import { createDefaultScoutingDepartment, generateScoutPool } from './scouting-staff';
import { generateSeasonReport } from './season-report';
import { buildSpecialTeamsState } from './special-teams';
import { appendToSocialFeed, createGovernancePost, createLaborPost, generateTransactionPosts } from './social-feed';
import { generateTradeOffers } from './trade-market';
import {
  createDefaultFranchiseIdentity,
  generateStadiumDeals,
  getFanbaseEffect,
  tickStadiumDeal,
  updateAttendance,
  updateFanbase,
  updatePrestige,
} from './franchise-identity';
import { generateAllDecadeTeam, shouldGenerateAllDecadeTeam } from './franchise-legends';
import type {
  AwardResult,
  ContractOffer,
  DraftOrderEntry,
  EngineOutput,
  FranchiseHistoryEntry,
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

function ensureGovernanceState(game: GameState): void {
  game.leagueRules = game.leagueRules ?? initLeagueRules(game.year);
  game.cbaState = game.cbaState ?? initCBA(game.year);
  game.commissionerState = game.commissionerState ?? initCommissioner(game.year);
  game.laborState = game.laborState ?? initLaborState();
}

function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function refreshRosterState(team: Team): void {
  for (const player of team.roster) {
    assignJerseyNumber(team, player);
  }
  team.lockerRoom = syncLockerRoomRoster(team, team.lockerRoom ?? initializeLockerRoom(team, () => 0.42));
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

function topFiveAtPosition(game: GameState, player: Player): boolean {
  const peers = Object.values(game.players)
    .filter((candidate) => candidate.pos === player.pos)
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));
  return peers.slice(0, 5).some((candidate) => candidate.id === player.id);
}

function buildAgentDemandForPlayer(game: GameState, player: Player, baseOffer: ContractOffer = buildAskingPrice(player)): ContractOffer {
  ensureAgentsInitialized(game);
  const agent = getPlayerAgent(game, player.id);
  if (!agent) return baseOffer;
  return agentDemand(player, agent, {
    baseOffer,
    topFiveAtPosition: topFiveAtPosition(game, player),
  });
}

function buildDraftOrder(game: GameState): DraftOrderEntry[] {
  const ordered: DraftOrderEntry[] = [];
  let overall = 1;
  const draftRounds = game.leagueRules ? Number(getActiveRule(game.leagueRules, 'draft_rounds', game.year)) : 7;

  for (let round = 1; round <= draftRounds; round++) {
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

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
}

function isCBAInterruptStatus(status: GameState['cbaState']['status']): boolean {
  return status === 'negotiating' || status === 'awaiting_owner_vote' || status === 'lockout';
}

function startCBANegotiation(game: GameState): void {
  game.cbaState = {
    ...game.cbaState,
    status: 'negotiating',
    negotiationState: game.cbaState.negotiationState ?? {
      round: 0,
      ownersProposal: null,
      playersProposal: null,
      currentProposal: null,
      gap: Math.max(35, getLockoutRisk(game.cbaState, game.year)),
      mediator: false,
      publicPressure: 15,
      ownerVotes: {},
      userVote: null,
    },
    lockoutRisk: getLockoutRisk(game.cbaState, game.year),
    lastNegotiationYear: game.year,
  };
  recordLaborNews(
    game,
    'CBA negotiations open',
    'League business pauses while owners and players begin bargaining on a new agreement.',
    { idSuffix: `cba-open-${game.year}`, importance: 'breaking' },
  );
  game.socialFeed = appendToSocialFeed(game.socialFeed, [
    createLaborPost('Negotiations are underway as the league and players association work toward a new CBA.', game.week, RNG.ai),
  ]);
}

function maybeGenerateGovernanceNarrative(game: GameState, previousCommissionerName: string, previousProposalIds: string[]): void {
  const newProposals = game.commissionerState.activeProposals.filter((proposal) => !previousProposalIds.includes(proposal.id));
  for (const proposal of newProposals) {
    recordGovernanceNews(
      game,
      `${game.commissionerState.name} proposes a rules vote`,
      `${game.commissionerState.name} wants to change ${proposal.ruleKey.replaceAll('_', ' ')} for ${proposal.effectiveYear}.`,
      { idSuffix: proposal.id },
    );
    game.socialFeed = appendToSocialFeed(game.socialFeed, [
      createGovernancePost(
        `${game.commissionerState.name} floated a rule proposal: ${proposal.ruleKey.replaceAll('_', ' ')} from ${String(proposal.currentValue)} to ${String(proposal.proposedValue)}.`,
        game.week,
        RNG.ai,
      ),
    ]);
  }

  if (previousCommissionerName !== game.commissionerState.name) {
    recordGovernanceNews(
      game,
      `${previousCommissionerName} is out as commissioner`,
      `${game.commissionerState.name} takes over league governance after a collapse in approval.`,
      { idSuffix: `commissioner-fired-${game.year}`, importance: 'breaking' },
    );
    game.socialFeed = appendToSocialFeed(game.socialFeed, [
      createGovernancePost(
        `${previousCommissionerName} is out. ${game.commissionerState.name} takes the office with a ${game.commissionerState.personality} agenda.`,
        game.week,
        RNG.ai,
        { sentiment: 'hype' },
      ),
    ]);
  }
}

function maybeGenerateOffseasonLaborEvent(game: GameState): void {
  const laborEvent = generateLaborEvent(game.laborState, game);
  if (!laborEvent) return;

  game.laborState = {
    ...game.laborState,
    unionSatisfaction: Math.max(0, Math.min(100, game.laborState.unionSatisfaction + (laborEvent.impact.satisfaction ?? 0))),
    laborEvents: [...game.laborState.laborEvents, laborEvent].slice(-20),
  };

  if (laborEvent.impact.morale) {
    for (const player of Object.values(game.players)) {
      player.morale = Math.max(0, Math.min(100, player.morale + laborEvent.impact.morale));
    }
  }

  recordLaborNews(
    game,
    'Labor tensions stay in the spotlight',
    laborEvent.description,
    { idSuffix: `${laborEvent.type}-${game.year}-${game.week}` },
  );
  game.socialFeed = appendToSocialFeed(game.socialFeed, [
    createLaborPost(laborEvent.description, game.week, RNG.ai, {
      sentiment: laborEvent.impact.satisfaction && laborEvent.impact.satisfaction > 0 ? 'positive' : 'negative',
    }),
  ]);
}

function adjustCapSpace(team: Team, amount: number): void {
  team.capSpace = roundMoney(team.capSpace + amount);
  team.capUsed = roundMoney(Math.max(0, team.capUsed - amount));
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

    const canAfford = team.capSpace >= decision.agentDemand.salary * 1.25;
    const wantsPlayer = player.ovr >= 72 || player.pos === 'QB' || player.personality.loyalty >= 7;

    if (canAfford && wantsPlayer) {
      applyOfferToPlayer(game, team, player, decision.agentDemand);
      decision.lastOffer = decision.agentDemand;
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

    if (decision.status === 'accepted' && decision.lastOffer) {
      applyOfferToPlayer(game, userTeam, player, decision.lastOffer!);
      continue;
    }

    if (!decision.lastOffer) {
      decision.status = 'pending';
    }
  }
}

function finalizeUnsignedExpiringPlayers(game: GameState, offseason: OffseasonState): void {
  for (const playerId of offseason.expiringPlayerIds) {
    const decision = offseason.reSignDecisions[playerId];
    if (decision?.status === 'accepted') continue;
    const team = game.teams[decision?.teamId ?? ''];
    if (!team) continue;
    if (!team.isUser || !decision?.lastOffer) {
      moveToFreeAgency(game, team, playerId);
      continue;
    }

    const player = findRosterPlayer(team, playerId);
    const agent = getPlayerAgent(game, playerId);
    if (!player) continue;
    player.contract = null;
    player.teamId = team.id;
    player.holdout = false;
    player.careerStats.holdoutPatienceWeeksRemaining = decision?.patienceWeeksRemaining ?? Math.max(0, getAgentPatienceWeeks(agent ?? {
      id: '',
      name: 'Agent',
      style: 'old_school',
      demandMultiplier: 1,
      patienceModifier: 0,
      clients: [],
    }));
    player.careerStats.holdoutWalkWeeksRemaining = Math.max(1, getAgentPatienceWeeks(agent ?? {
      id: '',
      name: 'Agent',
      style: 'old_school',
      demandMultiplier: 1,
      patienceModifier: 0,
      clients: [],
    }));
    player.careerStats.agentDemandSalary = decision?.agentDemand.salary ?? 0;
    attachPlayerRecord(game, player);
  }
}

function createAiBid(player: Player, ask: ContractOffer, team: Team, round: number, difficulty: GameState['difficulty']): FreeAgencyBid | null {
  if (team.capSpace < ask.salary) return null;
  const identity = team.franchiseIdentity ?? createDefaultFranchiseIdentity(team);
  const positionNeed = team.roster
    .filter((candidate) => candidate.pos === player.pos)
    .reduce((lowest, candidate) => Math.min(lowest, candidate.ovr), 99);
  const needBoost = Math.max(0, 78 - positionNeed);
  const difficultyMult = DIFF_SETTINGS[difficulty].aiBidMod;
  const salary = Math.round((ask.salary * (0.88 + needBoost / 100) * difficultyMult) * 10) / 10;
  const signingBonus = Math.round((ask.signingBonus * (0.8 + needBoost / 120)) * 10) / 10;
  const guaranteed = Math.round((ask.guaranteed * (0.82 + needBoost / 150)) * 10) / 10;
  const franchiseAppeal = 1 + getFanbaseEffect(identity).faInterestBonus;

  return {
    playerId: player.id,
    teamId: team.id,
    years: ask.years,
    salary,
    signingBonus,
    guaranteed,
    round,
    score: scoreOffer({ years: ask.years, salary, signingBonus, guaranteed }, ask) * franchiseAppeal,
    status: 'pending',
  };
}

function resolveFreeAgencyRound(game: GameState, offseason: OffseasonState): void {
  const userTeam = findUserTeam(game);

  for (const playerId of [...game.freeAgents]) {
    const player = getPlayer(game, playerId);
    if (!player) continue;

    const ask = buildAgentDemandForPlayer(game, player);
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
    assignJerseyNumber(team, signedPlayer);
    refreshRosterState(team);
    team.txLog.push({
      type: 'SIGN_FA',
      year: game.year,
      week: game.week,
      playerId: signedPlayer.id,
      toTeamId: team.id,
    });
    recordNewsItem(game, {
      id: `fa-signing-${signedPlayer.id}-${team.id}-${game.year}`,
      year: game.year,
      week: game.week,
      type: 'signing',
      headline: `${team.city} lands ${signedPlayer.name}`,
      body: `${team.city} ${team.name} wins the free-agent sweepstakes for ${signedPlayer.name}.`,
      teamIds: [team.id],
      playerIds: [signedPlayer.id],
      importance: signedPlayer.ovr >= 85 ? 'breaking' : signedPlayer.ovr >= 78 ? 'major' : 'minor',
    });
    if (team.isUser) {
      game.socialFeed = appendToSocialFeed(game.socialFeed, generateTransactionPosts('signing', {
        playerNames: [signedPlayer.name],
        teamNames: [team.name],
        context: `Free-agency agreement for ${signedPlayer.name}.`,
      }, RNG.ai));
    }
    game.freeAgents = game.freeAgents.filter((id) => id !== playerId);

    for (const bid of bids) {
      bid.status = bid.teamId === winner.teamId ? 'won' : 'lost';
    }
  }
}

function currentSeasonYear(game: GameState): number {
  return game.year - 1;
}

function findSeasonHistoryEntry(game: GameState, seasonYear: number, teamId: string): FranchiseHistoryEntry | null {
  return game.franchiseHistory.find((entry) => entry.year === seasonYear && entry.teamId === teamId) ?? null;
}

function isPlayoffAppearance(playoffFinish: string): boolean {
  return playoffFinish !== 'missed_playoffs' && playoffFinish !== 'regular_season';
}

function payStadiumNamingRights(team: Team): void {
  const identity = team.franchiseIdentity ?? createDefaultFranchiseIdentity(team);
  if (!identity.stadiumDeal) return;
  const revenueMultiplier = getFanbaseEffect(identity).revenueMultiplier;
  adjustCapSpace(team, roundMoney(identity.stadiumDeal.revenuePerYear * revenueMultiplier));
}

function refreshFranchiseIdentity(
  game: GameState,
  seasonYear: number,
  hofClass: NonNullable<GameState['hallOfFame']>,
): void {
  for (const team of Object.values(game.teams)) {
    const historyEntry = findSeasonHistoryEntry(game, seasonYear, team.id);
    if (!historyEntry) continue;
    const currentIdentity = team.franchiseIdentity ?? createDefaultFranchiseIdentity(team);

    payStadiumNamingRights(team);

    let identity = updateFanbase(currentIdentity, team, {
      wins: team.wins,
      losses: team.losses,
      playoffFinish: historyEntry.playoffFinish,
    });
    identity = updatePrestige(identity, team, {
      championships: historyEntry.playoffFinish === 'champion' ? 1 : 0,
      playoffAppearances: isPlayoffAppearance(historyEntry.playoffFinish) ? 1 : 0,
      hallOfFamers: hofClass.filter((entry) => entry.teams.includes(team.id) && entry.inductionYear === seasonYear).length,
    });
    identity = tickStadiumDeal(identity, team.city);
    identity = {
      ...identity,
      attendance: updateAttendance(identity, team),
    };

    team.franchiseIdentity = identity;
    historyEntry.fanbase = identity.fanbase;
    historyEntry.prestige = identity.prestige;
    historyEntry.attendance = identity.attendance;
    historyEntry.stadiumName = identity.stadiumName;
  }
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

function refreshMedicalStaffPool(game: GameState): void {
  const rand = mulberry32((game.seed ^ (game.year * 6151)) >>> 0);
  game.availableMedicalStaff = generateMedicalStaffPool(rand, game.year);
}

function resetPhysicalState(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    team.fatigueState = {};
    replenishFacilityBudget(team);
  }
  game.playoffMomentum = {};
}

function resetSpecialTeams(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    team.specialTeams = buildSpecialTeamsState(team);
  }
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

function recordUserEndorsementPosts(game: GameState, team: Team, summary: ReturnType<typeof tickEndorsements>): void {
  if (!team.isUser) return;
  const posts = [
    ...summary.lostDeals.map((deal) => {
      const player = game.players[deal.playerId];
      return player
        ? {
          id: `endorsement-lost-${deal.id}`,
          source: 'reporter' as const,
          authorName: 'MFSN Business',
          content: getEndorsementNarrative(deal, player, 'lost'),
          trigger: 'milestone' as const,
          sentiment: 'negative' as const,
          likes: 140,
          timestamp: game.week,
        }
        : null;
    }),
    ...summary.renewedDeals.map((deal) => {
      const player = game.players[deal.playerId];
      return player
        ? {
          id: `endorsement-renewed-${deal.id}`,
          source: 'reporter' as const,
          authorName: 'MFSN Business',
          content: getEndorsementNarrative(deal, player, 'renewed'),
          trigger: 'milestone' as const,
          sentiment: 'positive' as const,
          likes: 180,
          timestamp: game.week,
        }
        : null;
    }),
  ].filter((post): post is NonNullable<typeof post> => Boolean(post));
  game.socialFeed = appendToSocialFeed(game.socialFeed, posts);
}

function processJerseyRetirement(game: GameState, playerId: string, teamId: string, isHallOfFamer = false): void {
  const team = game.teams[teamId];
  const archiveEntry = game.playerArchive.find((entry) => entry.playerId === playerId);
  if (!team || !archiveEntry || archiveEntry.jerseyNumber === null) return;
  team.retiredJerseys = team.retiredJerseys ?? [];
  if (team.retiredJerseys.some((retired) => retired.jerseyNumber === archiveEntry.jerseyNumber)) return;
  if (!shouldRetireJersey(archiveEntry, team, game.franchiseHistory, { isHallOfFamer })) return;

  const retirement = generateJerseyRetirement(archiveEntry, team, game.year, RNG.ai, game.franchiseHistory, { isHallOfFamer });
  team.retiredJerseys = [...(team.retiredJerseys ?? []), retirement];
  recordCeremony(game, {
    id: `ceremony-${retirement.id}`,
    type: 'jersey_retirement',
    year: retirement.year,
    headline: retirement.headline,
    description: retirement.ceremony,
    highlights: [
      { label: 'Number', value: `#${retirement.jerseyNumber}`, playerIds: [retirement.playerId] },
      { label: 'Peak OVR', value: String(retirement.peakOvr), playerIds: [retirement.playerId] },
      { label: 'Championships', value: String(retirement.championships), playerIds: [retirement.playerId] },
    ],
    mvp: retirement.playerId,
  });
}

export function initializeOffseasonState(game: GameState): OffseasonState {
  refreshScoutPool(game);
  game.scoutingDepartment.privateWorkoutsRemaining = 3;
  refreshMedicalStaffPool(game);
  resetPhysicalState(game);
  const expiringPlayers = Object.values(game.teams)
    .flatMap((team) => team.roster)
    .filter((player) => (player.contract?.years ?? 0) <= 1);
  ensureAgentsInitialized(game);

  const reSignDecisions = expiringPlayers.reduce<Record<string, ReSignDecision>>((acc, player) => {
    const askingPrice = buildAskingPrice(player);
    const adjustedDemand = buildAgentDemandForPlayer(game, player, askingPrice);
    acc[player.id] = {
      playerId: player.id,
      teamId: player.teamId ?? '',
      askingPrice,
      agentDemand: adjustedDemand,
      lastOffer: null,
      counterOffer: null,
      agentResponse: '',
      patienceWeeksRemaining: getAgentPatienceWeeks(getPlayerAgent(game, player.id) ?? {
        id: '',
        name: 'Agent',
        style: 'old_school',
        demandMultiplier: 1,
        patienceModifier: 0,
        clients: [],
      }),
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
    scoutingWatchlist: [],
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
    negotiateOffer(nextState, decision.teamId, playerId, offer);
  }

  return { nextState, events: [], consequences: [] };
}

export function submitFreeAgentBid(game: GameState, playerId: string, offer: ContractOffer): EngineOutput {
  const nextState = cloneGame(game);
  if (getScenarioConstraints(nextState)?.blockFreeAgency) {
    return { nextState, events: [], consequences: [] };
  }
  const userTeam = findUserTeam(nextState);
  if (nextState.offseasonState && userTeam) {
    const identity = userTeam.franchiseIdentity ?? createDefaultFranchiseIdentity(userTeam);
    const bids = nextState.offseasonState.freeAgencyBids[playerId] ?? [];
    const currentRound = nextState.offseasonState.round;
    const filtered = bids.filter((bid) => !(bid.teamId === userTeam.id && bid.round === currentRound));
    filtered.push({
      ...offer,
      playerId,
      teamId: userTeam.id,
      round: currentRound,
      score: scoreOffer(offer, buildAskingPrice(nextState.players[playerId]!)) * (1 + getFanbaseEffect(identity).faInterestBonus),
      status: 'pending',
    });
    nextState.offseasonState.freeAgencyBids[playerId] = filtered;
  }

  return { nextState, events: [], consequences: [] };
}

export function advanceOffseason(game: GameState): void {
  ensureGovernanceState(game);
  if (!game.offseasonState) {
    ensureDraftClass(game);
    game.offseasonState = initializeOffseasonState(game);
  }
  game.cbaState.status = checkCBAStatus(game.cbaState, game.year);
  if (game.cbaState.currentDeal && game.cbaState.currentDeal.startYear === game.year) {
    applyCBADealToRules(game, game.cbaState.currentDeal);
  }
  if (game.cbaState.status === 'expiring' || game.cbaState.status === 'expired') {
    startCBANegotiation(game);
    maybeGenerateOffseasonLaborEvent(game);
    return;
  }
  if (isCBAInterruptStatus(game.cbaState.status)) {
    maybeGenerateOffseasonLaborEvent(game);
    return;
  }
  if (game.scoutingDepartment.availableScouts.length === 0) {
    refreshScoutPool(game);
  }
  if (game.availableMedicalStaff.length === 0) {
    refreshMedicalStaffPool(game);
  }

  const seasonYear = currentSeasonYear(game);
  for (const team of Object.values(game.teams)) {
    const endorsementSummary = tickEndorsements(team, { wins: team.wins, losses: team.losses }, RNG.ai);
    recordUserEndorsementPosts(game, team, endorsementSummary);
  }
  markCompletedSeason(game, seasonYear);
  archivePlayerSeasonHistory(game, seasonYear);
  clearSeasonLivingWorldState(game);
  stampChampionCareers(game, seasonYear);
  ensureAgentsInitialized(game);
  const awards = generateAwards(game, seasonYear);
  if (game.playoffBracket?.championTeamId) {
    const championship = generateChampionshipCeremony(game, game.playoffBracket.championTeamId);
    recordCeremony(game, championship);
    recordDynastyEvent(game, {
      id: `${championship.id}-dynasty`,
      year: game.year,
      week: null,
      type: 'championship',
      headline: championship.headline,
      importance: 'landmark',
      playerIds: championship.mvp ? [championship.mvp] : [],
      teamIds: [game.playoffBracket.championTeamId],
    });
    recordBeat(game, { week: game.week, type: 'positive', intensity: 90, source: 'championship' });
  }
  const awardsNight = generateAwardsNight(game);
  recordCeremony(game, awardsNight);
  recordBeat(game, { week: game.week, type: 'positive', intensity: 65, source: 'awards_night' });
  for (const award of awards.awards.filter((entry) =>
    ['mvp', 'opoy', 'dpoy', 'oroy', 'droy', 'coach_of_year', 'comeback_player'].includes(entry.awardId))) {
    recordDynastyEvent(game, {
      id: `award-${award.awardId}-${award.winnerId ?? award.winnerTeamId}-${seasonYear}`,
      year: seasonYear,
      week: null,
      type: 'award',
      headline: `${award.winnerName} wins ${award.label}`,
      importance: award.awardId === 'mvp' ? 'landmark' : 'major',
      playerIds: award.winnerId ? [award.winnerId] : [],
      teamIds: award.winnerTeamId ? [award.winnerTeamId] : [],
    });
  }
  resolveConditions(game);
  evaluateHandshakes(game);
  updateSeasonRecords(game, seasonYear);
  updateCareerRecords(game, seasonYear);
  patchSeasonHistory(game, seasonYear, awards.awards);
  const existingReports = game.seasonReports ?? [];
  game.seasonReports = Object.values(game.teams).reduce<NonNullable<GameState['seasonReports']>>((reports, team) => {
    const report = generateSeasonReport(game, team.id);
    const withoutCurrent = reports.filter((entry) => !(entry.teamId === team.id && entry.year === report.year));
    return [...withoutCurrent, report];
  }, existingReports);
  decrementCarryoverContracts(game, game.offseasonState);
  resolveUserReSigns(game, game.offseasonState);
  resolveAiReSigns(game, game.offseasonState);
  finalizeUnsignedExpiringPlayers(game, game.offseasonState);
  const hofClass = inductHallOfFame(game, seasonYear);
  if (hofClass.length > 0) {
    recordCeremony(game, generateHOFInduction(game, hofClass));
    for (const inductee of hofClass) {
      recordDynastyEvent(game, {
        id: `hof-${inductee.playerId}-${inductee.inductionYear}`,
        year: inductee.inductionYear,
        week: null,
        type: 'hof',
        headline: `${inductee.name} enters the Hall of Fame`,
        importance: 'landmark',
        playerIds: [inductee.playerId],
        teamIds: inductee.teams,
      });
      for (const teamId of inductee.teams) {
        processJerseyRetirement(game, inductee.playerId, teamId, true);
      }
    }
  }
  refreshFranchiseIdentity(game, seasonYear, hofClass);
  const userTeam = findUserTeam(game);
  game.stadiumDealOffers = userTeam ? generateStadiumDeals(RNG.ai) : [];
  if (shouldGenerateAllDecadeTeam(game)) {
    for (const team of Object.values(game.teams)) {
      game.allDecadeTeams.push(generateAllDecadeTeam(game, team.id));
    }
  }
  decayLeagueRivalries(game);
  game.playerRivalries = decayRivalries(game.playerRivalries ?? [], game.year);
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
    recordDynastyEvent(game, {
      id: `coach-hire-${team.id}-${seasonYear}`,
      year: seasonYear,
      week: 1,
      type: 'firing',
      headline: `${team.city} makes a coaching change`,
      importance: team.isUser ? 'major' : 'minor',
      playerIds: [],
      teamIds: [team.id],
    });
  }
  const mentoringPairs = formMentoringPairs(game, game.year);
  for (const team of Object.values(game.teams)) {
    patchMentoringHistory(game, seasonYear, team, team.mentoringPairs);
  }
  const mentoringBonuses = applyMentoringBonuses(game, mentoringPairs);
  const trainingBonuses = buildTrainingProgressionBonuses(game);
  const progression = progressPlayers(game, { mentoringBonuses, trainingBonuses });
  for (const retiredPlayerId of progression.retiredPlayerIds) {
    const archiveEntry = game.playerArchive.find((entry) => entry.playerId === retiredPlayerId);
    const lastTeamId = archiveEntry?.teamHistory.at(-1)?.teamId ?? null;
    if (lastTeamId) {
      processJerseyRetirement(game, retiredPlayerId, lastTeamId, false);
    }
  }
  game.eventLog.push(...progression.events);
  clearTrainingAssignments(game);
  resetPhysicalState(game);
  resetPracticeSquads(game);
  resetSpecialTeams(game);
  for (const team of Object.values(game.teams)) {
    for (const player of team.roster) {
      assignJerseyNumber(team, player);
    }
    team.lockerRoom = initializeLockerRoom(team, RNG.ai);
  }
  game.farewellTours = [];
  const narrativeAdds = [
    awardsNight.headline,
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
  const previousCommissionerName = game.commissionerState.name;
  const previousProposalIds = game.commissionerState.activeProposals.map((proposal) => proposal.id);
  game.commissionerState = advanceCommissioner(game.commissionerState, game);
  maybeGenerateGovernanceNarrative(game, previousCommissionerName, previousProposalIds);
  generateOffseasonNews(game);
  game.offseasonState.tradeOffers = generateTradeOffers(game);
  game.endorsementOffers = userTeam ? generateEndorsementOffers(userTeam, userTeam.roster, RNG.ai) : [];
  game.teamNeedsCache = {};
  game.warRoomState = null;
  checkAchievements(game);
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
    generateOffseasonNews(game);
    rebuildDraftBoard(game);
    game.teamNeedsCache = {};
    game.warRoomState = null;
    game.phase = 'draft';
    game.week = 1;
    return;
  }

  generateOffseasonNews(game);
  game.offseasonState.round += 1;
  game.week = game.offseasonState.round;
}
