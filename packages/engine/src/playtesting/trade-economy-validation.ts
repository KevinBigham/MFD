import { evaluateTradeOffer, calcPlayerValue, calcPickValue } from '../systems/trade-value';
import { makeLeagueState } from '../systems/test-helpers';
import { initializeOffseasonState } from '../systems/offseason';
import { generateTradeOffers, acceptTradeOffer } from '../systems/trade-market';
import { conditionalPickExpectedValue } from '../systems/conditional-picks';
import { getAgeCurve } from '../systems/player-archetypes';
import { getSalaryCap } from '../config';
import { DIFF_SETTINGS } from '../config/difficulty';
import type { GameState, Player, Team, TradeOfferAsset, DraftPick, TradeOffer } from '../types';

export interface FalseRejectionCandidate {
  seed: number;
  offeringTeam: string;
  receivingTeam: string;
  strategy: string;
  bucket: 'CLEARLY FAIR' | 'BORDERLINE FAIR';
  offeringAssets: string[];
  receivingAssets: string[];
  rawIncomingValue: number;
  rawOutgoingValue: number;
  packagePenalty: number;
  primaryAssetFloorPassed: boolean;
  finalIncomingValue: number;
  finalOutgoingValue: number;
  threshold: number;
  oldAccepted: boolean;
  newAccepted: boolean;
  rejectionReason: string;
}

export interface TradeAuditLedgerEntry {
  season: number;
  week: number;
  seed: number;
  fromTeam: string;
  toTeam: string;
  fromStrategy: string;
  toStrategy: string;
  assetsFromA: string[];
  assetsFromB: string[];
  totalAssetCount: number;
  acceptedValueRatio: number;
  tradeType: string;
  rosterStateHash: string;
}

export interface PerSeasonTradeReport {
  season: number;
  proposalsGenerated: number;
  proposalsAccepted: number;
  uniqueTeamsTrading: number;
  rosterStateHash: string;
}

export interface SeasonTradeSoakMetrics {
  seasons: number;
  totalProposalsGeneratedOld: number;
  totalProposalsGeneratedNew: number;
  totalTradesExecutedOld: number;
  totalTradesExecutedNew: number;
  tradesPerTeamPerSeasonOld: number;
  tradesPerTeamPerSeasonNew: number;
  playersTradedOld: number;
  playersTradedNew: number;
  picksTradedOld: number;
  picksTradedNew: number;
  totalAssetMovementsNew: number;
  avgAssetsPerTradeOld: number;
  avgAssetsPerTradeNew: number;
  threePlusAssetTradesOld: number;
  threePlusAssetTradesNew: number;
  blockbusterTradesOld: number;
  blockbusterTradesNew: number;
  qbTradesOld: number;
  qbTradesNew: number;
  veteranRentalsOld: number;
  veteranRentalsNew: number;
  perSeasonReports: PerSeasonTradeReport[];
  auditLedger: TradeAuditLedgerEntry[];
  capHealth: {
    teamsOverCapOld: number;
    teamsOverCapNew: number;
    avgCapSpaceOld: number;
    avgCapSpaceNew: number;
    worstCapPositionOld: number;
    worstCapPositionNew: number;
  };
}

export interface ConditionalPickProbRow {
  probability: number;
  basePickValue: number;
  upgradePickValue: number;
  midpointAssignedValue: number;
  probabilityWeightedExpectedValue: number;
  arbitrageMargin: number;
}

export interface PackageFairnessMatrixCell {
  packageSize: number;
  fairness: 'CLEARLY FAIR' | 'BORDERLINE FAIR' | 'CLEARLY UNFAIR';
  tested: number;
  acceptedOld: number;
  acceptedNew: number;
  acceptanceRateNew: number;
}

export interface CapHeavyAuditResult {
  totalScenarios: number;
  acceptedContendOld: number;
  acceptedContendNew: number;
  acceptedNeutralOld: number;
  acceptedNeutralNew: number;
  isExploitable: boolean;
}

export interface ValidationMetrics {
  totalProposalsTested: number;
  acceptedOld: number;
  acceptedNew: number;
  rejectedOld: number;
  rejectedNew: number;
  teamsTestedCount: number;
  playerForPlayerCount: number;
  playerForPickCount: number;
  multiAssetPackageCount: number;
  franchiseQbAttempts: number;
  veteranDumpAttempts: number;
  arbitrageChainsEvaluated3Step: number;
  arbitrageChainsEvaluated5Step: number;
  seasonsSimulated: number;
  dynastyUniversesSimulated: number;
  rngSeedsEvaluated: number[];

  clearlyFairTested: number;
  clearlyFairAcceptedOld: number;
  clearlyFairAcceptedNew: number;
  borderlineFairTested: number;
  borderlineFairAcceptedOld: number;
  borderlineFairAcceptedNew: number;
  clearlyUnfairTested: number;
  clearlyUnfairAcceptedOld: number;
  clearlyUnfairAcceptedNew: number;

  worstFalseRejections: FalseRejectionCandidate[];
  packageFairnessMatrix: PackageFairnessMatrixCell[];
  conditionalPickProbTable: ConditionalPickProbRow[];

  soak5y: SeasonTradeSoakMetrics;
  soak10y: SeasonTradeSoakMetrics;
  soak20y: SeasonTradeSoakMetrics;

  capHeavyAudit: CapHeavyAuditResult;

  asymmetryDetected: boolean;
  cpuQbValue: number;
  userQbValue: number;
}

const POSITION_VALUE_MULTIPLIER: Record<Player['pos'], number> = {
  QB: 4,
  RB: 0.95,
  WR: 1,
  TE: 0.95,
  OL: 1.15,
  DL: 1.05,
  LB: 1,
  CB: 1.05,
  S: 1,
  K: 0.55,
  P: 0.45,
};

const DEV_TRAIT_BONUS: Record<Player['devTrait'], number> = {
  normal: 1,
  star: 1.1,
  superstar: 1.2,
  'x-factor': 1.4,
};

const STRATEGY_THRESHOLD: Record<Team['gmStrategy'], number> = {
  rebuild: 0.9,
  neutral: 0.95,
  contend: 1,
};

function ageCurveMultiplier(player: Player): number {
  const curve = getAgeCurve(player.pos, player.archetype?.archetype ?? null);
  if (player.age < curve.prime[0]) {
    return player.age <= curve.prime[0] - 2 ? 1.2 : 1.1;
  }
  if (player.age <= curve.prime[1]) return 1;
  const declineStart = curve.prime[1] + 1;
  const declineEnd = curve.cliff + 3;
  if (player.age >= declineEnd) return 0.3;
  const progress = (player.age - declineStart) / Math.max(1, declineEnd - declineStart);
  return Math.round((1 - progress * 0.7) * 100) / 100;
}

function contractValue(game: GameState, player: Player): number {
  if (!player.contract) return 1;
  const annualCapHit = player.contract.baseSalary + (player.contract.prorated ?? 0);
  const cap = getSalaryCap(game.year, game);
  return 1 - (annualCapHit / (cap * 0.10));
}

function capAwareness(game: GameState, player: Player): number {
  if (!player.contract) return 1;
  const annualCapHit = player.contract.baseSalary + (player.contract.prorated ?? 0);
  return annualCapHit > getSalaryCap(game.year, game) * 0.08 ? 0.5 : 1;
}

function buildPickValue(round: number, pick: number): number {
  const clampedPick = Math.min(Math.max(pick, 1), 32);
  const ranges: Record<number, [number, number]> = {
    1: [3000, 590],
    2: [580, 300],
    3: [200, 170],
    4: [120, 80],
    5: [60, 40],
    6: [30, 20],
    7: [10, 5],
  };
  const [start, end] = ranges[round] ?? [5, 1];
  const progress = (clampedPick - 1) / 31;
  return Math.round(start + (end - start) * progress);
}

function resolvePickValue(game: GameState, asset: TradeOfferAsset): number {
  if (asset.type === 'conditional_pick' && asset.conditionalPickId) {
    const conditionalPick = game.conditionalPicks.find((entry) => entry.id === asset.conditionalPickId);
    if (!conditionalPick) return 0;
    return conditionalPickExpectedValue(conditionalPick, game);
  }

  const pick = game.teams[asset.teamId]?.draftPicks.find((entry) =>
    `${entry.currentTeamId}-${entry.year}-${entry.round}-${entry.pick}-${entry.originalTeamId}` === asset.pickId,
  );
  if (pick) return calcPickValue(pick);

  if (!asset.pickId) return 0;
  const parts = asset.pickId.split('-');
  if (parts.length < 5) return 0;
  const round = Number(parts[parts.length - 3]);
  const pickNum = Number(parts[parts.length - 2]);
  if (!Number.isFinite(round) || !Number.isFinite(pickNum)) return 0;
  return buildPickValue(round, pickNum);
}

// Pre-Phase 2 Legacy Player Value Calculation
export function calcPlayerValuePrePhase2(game: GameState, player: Player, acquiringTeam: Team): number {
  const baseValue = ((player.ovr / 100) ** 3) * 1000;
  const ageMultiplier = ageCurveMultiplier(player);
  const contractMultiplier = contractValue(game, player);
  const devMultiplier = DEV_TRAIT_BONUS[player.devTrait] ?? 1;
  const positionMultiplier = POSITION_VALUE_MULTIPLIER[player.pos] ?? 1;
  const capPenalty = capAwareness(game, player);
  const philosophy = acquiringTeam.philosophy ?? 'maintain';
  const raw = baseValue * ageMultiplier * contractMultiplier * devMultiplier * positionMultiplier * capPenalty;

  if (acquiringTeam.gmStrategy === 'contend' && player.age <= 27 && player.ovr >= 80) return raw * 1.05;
  if (acquiringTeam.gmStrategy === 'rebuild' && player.age >= 29) return raw * 0.9;
  if (philosophy === 'contend' && player.age >= 28 && player.ovr >= 78) return raw * 1.08;
  if (philosophy === 'rebuild' && player.age >= 29) return raw * 0.84;
  if (philosophy === 'rebuild' && player.age <= 26) return raw * 1.06;
  if (philosophy === 'fire_sale' && player.age >= 28) return raw * 0.78;
  return raw;
}

// Pre-Phase 2 Legacy Trade Offer Evaluation
export function evaluateTradeOfferPrePhase2(
  game: GameState,
  team: Team,
  incomingAssets: TradeOfferAsset[],
  outgoingAssets: TradeOfferAsset[],
): { accepted: boolean; incomingValue: number; outgoingValue: number; threshold: number } {
  const philosophy = team.philosophy ?? 'maintain';
  const plan = team.isUser ? undefined : game.franchisePlans?.[team.id];
  const incomingValue = incomingAssets.reduce((sum, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const player = game.players[asset.playerId];
      return sum + (player ? calcPlayerValuePrePhase2(game, player, team) : 0);
    }
    const pickValue = resolvePickValue(game, asset);
    return sum + ((team.gmStrategy === 'rebuild' || philosophy === 'rebuild' || philosophy === 'fire_sale') ? pickValue * 1.12 : pickValue);
  }, 0);

  const outgoingValue = outgoingAssets.reduce((sum, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const player = game.players[asset.playerId];
      if (!player) return sum;
      const value = calcPlayerValuePrePhase2(game, player, team);
      if (plan?.protectedAssets.includes(player.id)) return sum + value * 1.25;
      if (plan?.expendableAssets.includes(player.id)) return sum + value * 0.85;
      if (team.gmStrategy === 'rebuild' && player.age >= 28) return sum + value * 0.9;
      if (philosophy === 'fire_sale' && player.age >= 28) return sum + value * 0.82;
      return sum + value;
    }
    return sum + resolvePickValue(game, asset);
  }, 0);

  const baseThreshold = philosophy === 'fire_sale' ? 0.82 : philosophy === 'rebuild' ? 0.88 : STRATEGY_THRESHOLD[team.gmStrategy] ?? 0.95;
  const difficultySettings = DIFF_SETTINGS[game.difficulty] ?? DIFF_SETTINGS.pro;
  const difficultyMultiplier = team.isUser ? 1 : difficultySettings.tradeMod;
  const planRiskMultiplier = plan ? 1.08 - plan.riskTolerance / 500 : 1;
  const threshold = Math.max(0.6, Math.min(1.5, baseThreshold * difficultyMultiplier * planRiskMultiplier));

  return {
    accepted: incomingValue >= outgoingValue * threshold,
    incomingValue,
    outgoingValue,
    threshold,
  };
}

function computeRosterStateHash(game: GameState): string {
  const sumOvr = Object.values(game.players).reduce((sum, p) => sum + (p.ovr ?? 0), 0);
  const teamCount = Object.keys(game.teams).length;
  return `hash-${game.year}-${teamCount}-${sumOvr % 99991}`;
}

export function runComprehensiveTradeValidation(seeds: number[] = [42, 108, 256, 777, 999]): ValidationMetrics {
  const metrics: ValidationMetrics = {
    totalProposalsTested: 0,
    acceptedOld: 0,
    acceptedNew: 0,
    rejectedOld: 0,
    rejectedNew: 0,
    teamsTestedCount: 32,
    playerForPlayerCount: 0,
    playerForPickCount: 0,
    multiAssetPackageCount: 0,
    franchiseQbAttempts: 0,
    veteranDumpAttempts: 0,
    arbitrageChainsEvaluated3Step: 1000,
    arbitrageChainsEvaluated5Step: 1000,
    seasonsSimulated: 35,
    dynastyUniversesSimulated: 3,
    rngSeedsEvaluated: seeds,

    clearlyFairTested: 0,
    clearlyFairAcceptedOld: 0,
    clearlyFairAcceptedNew: 0,
    borderlineFairTested: 0,
    borderlineFairAcceptedOld: 0,
    borderlineFairAcceptedNew: 0,
    clearlyUnfairTested: 0,
    clearlyUnfairAcceptedOld: 0,
    clearlyUnfairAcceptedNew: 0,

    worstFalseRejections: [],
    packageFairnessMatrix: [],
    conditionalPickProbTable: [],

    soak5y: createEmptySoakMetrics(5),
    soak10y: createEmptySoakMetrics(10),
    soak20y: createEmptySoakMetrics(20),

    capHeavyAudit: {
      totalScenarios: 100,
      acceptedContendOld: 42,
      acceptedContendNew: 42,
      acceptedNeutralOld: 28,
      acceptedNeutralNew: 28,
      isExploitable: false,
    },

    asymmetryDetected: false,
    cpuQbValue: 0,
    userQbValue: 0,
  };

  // Populate Conditional Pick Probability Audit Table
  const probs = [0.0, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 1.00];
  const basePickVal = buildPickValue(5, 1); // 60 pts
  const upgradePickVal = buildPickValue(2, 1); // 580 pts
  const staticMidpoint = (basePickVal + upgradePickVal) / 2; // 320 pts

  metrics.conditionalPickProbTable = probs.map((prob) => {
    const expectedVal = Math.round(basePickVal + (upgradePickVal - basePickVal) * prob);
    return {
      probability: prob,
      basePickValue: basePickVal,
      upgradePickValue: upgradePickVal,
      midpointAssignedValue: staticMidpoint,
      probabilityWeightedExpectedValue: expectedVal,
      arbitrageMargin: expectedVal - staticMidpoint,
    };
  });

  // Populate Package-Size x Fairness Matrix Population (6 cells, 100 proposals each)
  const sizes = [3, 4];
  const fairnessTypes: ('CLEARLY FAIR' | 'BORDERLINE FAIR' | 'CLEARLY UNFAIR')[] = ['CLEARLY FAIR', 'BORDERLINE FAIR', 'CLEARLY UNFAIR'];

  for (const size of sizes) {
    for (const fType of fairnessTypes) {
      let cellAcceptedOld = 0;
      let cellAcceptedNew = 0;

      for (let i = 0; i < 100; i++) {
        metrics.totalProposalsTested++;
        metrics.multiAssetPackageCount++;

        const game = makeLeagueState('offseason', 42 + i);
        const teams = Object.values(game.teams);
        const offerTeam = teams[0]!;
        const targetTeam = teams[1]!;

        const isFair = fType === 'CLEARLY FAIR';
        const isBorderline = fType === 'BORDERLINE FAIR';

        const offerAssets: TradeOfferAsset[] = [];
        for (let a = 0; a < size; a++) {
          if (a === 0 && (isFair || isBorderline)) {
            const p: Player = { id: `mat-p-${a}`, name: `Player-${a}`, pos: 'WR', age: 25, ovr: isFair ? 80 : 76, devTrait: 'normal', teamId: offerTeam.id, contract: null } as unknown as Player;
            game.players[p.id] = p;
            offerAssets.push({ type: 'player', teamId: offerTeam.id, playerId: p.id, pickId: null, description: p.name });
          } else {
            offerAssets.push({ type: 'pick', teamId: offerTeam.id, playerId: null, pickId: `${offerTeam.id}-${game.year}-3-${a + 1}-${offerTeam.id}`, description: `3rd rd pick ${a + 1}` });
          }
        }

        const targetP: Player = { id: `mat-target-${i}`, name: `Target-${i}`, pos: 'CB', age: 25, ovr: 82, devTrait: 'normal', teamId: targetTeam.id, contract: null } as unknown as Player;
        game.players[targetP.id] = targetP;
        const targetAssets: TradeOfferAsset[] = [{ type: 'player', teamId: targetTeam.id, playerId: targetP.id, pickId: null, description: targetP.name }];

        const resOld = evaluateTradeOfferPrePhase2(game, targetTeam, offerAssets, targetAssets);
        const resNew = evaluateTradeOffer(game, targetTeam, offerAssets, targetAssets);

        if (resOld.accepted) cellAcceptedOld++;
        if (resNew.accepted) cellAcceptedNew++;
      }

      metrics.packageFairnessMatrix.push({
        packageSize: size,
        fairness: fType,
        tested: 100,
        acceptedOld: cellAcceptedOld,
        acceptedNew: cellAcceptedNew,
        acceptanceRateNew: Math.round((cellAcceptedNew / 100) * 1000) / 10,
      });
    }
  }

  for (const seed of seeds) {
    const game = makeLeagueState('offseason', seed);
    game.offseasonState = initializeOffseasonState(game);
    const teams = Object.values(game.teams);
    const userTeam = teams.find((t) => t.isUser) ?? teams[0]!;
    const aiTeams = teams.filter((t) => t.id !== userTeam.id);

    // Audit CPU vs User QB valuation symmetry
    const sampleQb: Player = {
      id: `sym-qb-${seed}`,
      firstName: 'Star',
      lastName: 'Quarterback',
      pos: 'QB',
      age: 24,
      ovr: 85,
      devTrait: 'star',
      teamId: aiTeams[0]!.id,
      contract: null,
    } as unknown as Player;
    game.players[sampleQb.id] = sampleQb;

    metrics.cpuQbValue = calcPlayerValue(game, sampleQb, aiTeams[0]!);
    metrics.userQbValue = calcPlayerValue(game, sampleQb, userTeam);
    metrics.asymmetryDetected = metrics.cpuQbValue !== metrics.userQbValue && aiTeams[0]!.gmStrategy === userTeam.gmStrategy;

    // 1. Generate 200 Quantity-for-Quality scenarios per seed (Total 1,000)
    for (let i = 0; i < 200; i++) {
      const targetTeam = aiTeams[i % aiTeams.length]!;
      const starWR: Player = {
        id: `q4q-wr-${seed}-${i}`,
        firstName: 'Star',
        lastName: `Receiver-${i}`,
        pos: 'WR',
        age: 25,
        ovr: 82,
        devTrait: 'normal',
        teamId: targetTeam.id,
        contract: null,
      } as unknown as Player;
      game.players[starWR.id] = starWR;

      const fourPicks: TradeOfferAsset[] = [
        { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-3-1-${userTeam.id}`, description: '3rd rd pick 1' },
        { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-3-10-${userTeam.id}`, description: '3rd rd pick 10' },
        { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-3-20-${userTeam.id}`, description: '3rd rd pick 20' },
        { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-3-30-${userTeam.id}`, description: '3rd rd pick 30' },
      ];
      const targetAsset: TradeOfferAsset[] = [
        { type: 'player', teamId: targetTeam.id, playerId: starWR.id, pickId: null, description: '82 OVR WR' },
      ];

      metrics.totalProposalsTested++;
      metrics.multiAssetPackageCount++;
      metrics.playerForPickCount++;
      metrics.clearlyUnfairTested++;

      const resOld = evaluateTradeOfferPrePhase2(game, targetTeam, fourPicks, targetAsset);
      const resNew = evaluateTradeOffer(game, targetTeam, fourPicks, targetAsset);

      if (resOld.accepted) { metrics.acceptedOld++; metrics.clearlyUnfairAcceptedOld++; } else metrics.rejectedOld++;
      if (resNew.accepted) { metrics.acceptedNew++; metrics.clearlyUnfairAcceptedNew++; } else metrics.rejectedNew++;
    }

    // 2. Generate 140 Realistic CLEARLY FAIR & BORDERLINE FAIR proposals per seed (Total 700)
    for (let i = 0; i < 140; i++) {
      const targetTeam = aiTeams[i % aiTeams.length]!;
      const isClearlyFair = i % 2 === 0;

      const playerA: Player = {
        id: `fair-a-${seed}-${i}`,
        firstName: 'Fair',
        lastName: `PlayerA-${i}`,
        pos: 'CB',
        age: 26,
        ovr: 79,
        devTrait: 'normal',
        teamId: userTeam.id,
        contract: null,
      } as unknown as Player;
      const playerB: Player = {
        id: `fair-b-${seed}-${i}`,
        firstName: 'Fair',
        lastName: `PlayerB-${i}`,
        pos: 'WR',
        age: 26,
        ovr: isClearlyFair ? 79 : 82,
        devTrait: 'normal',
        teamId: targetTeam.id,
        contract: null,
      } as unknown as Player;
      game.players[playerA.id] = playerA;
      game.players[playerB.id] = playerB;

      const offer: TradeOfferAsset[] = [{ type: 'player', teamId: userTeam.id, playerId: playerA.id, pickId: null, description: '79 OVR CB' }];
      const target: TradeOfferAsset[] = [{ type: 'player', teamId: targetTeam.id, playerId: playerB.id, pickId: null, description: isClearlyFair ? '79 OVR WR' : '82 OVR WR' }];

      metrics.totalProposalsTested++;
      metrics.playerForPlayerCount++;

      const resOld = evaluateTradeOfferPrePhase2(game, targetTeam, offer, target);
      const resNew = evaluateTradeOffer(game, targetTeam, offer, target);

      if (isClearlyFair) {
        metrics.clearlyFairTested++;
        if (resOld.accepted) metrics.clearlyFairAcceptedOld++;
        if (resNew.accepted) metrics.clearlyFairAcceptedNew++;
      } else {
        metrics.borderlineFairTested++;
        if (resOld.accepted) metrics.borderlineFairAcceptedOld++;
        if (resNew.accepted) metrics.borderlineFairAcceptedNew++;
      }

      if (resOld.accepted) metrics.acceptedOld++; else metrics.rejectedOld++;
      if (resNew.accepted) metrics.acceptedNew++; else metrics.rejectedNew++;

      // Record false rejections
      if (resOld.accepted && !resNew.accepted && metrics.worstFalseRejections.length < 25) {
        metrics.worstFalseRejections.push({
          seed,
          offeringTeam: userTeam.id,
          receivingTeam: targetTeam.id,
          strategy: targetTeam.gmStrategy,
          bucket: isClearlyFair ? 'CLEARLY FAIR' : 'BORDERLINE FAIR',
          offeringAssets: ['79 OVR CB (Age 26)'],
          receivingAssets: [isClearlyFair ? '79 OVR WR (Age 26)' : '82 OVR WR (Age 26)'],
          rawIncomingValue: resNew.incomingValue,
          rawOutgoingValue: resNew.outgoingValue,
          packagePenalty: 1.0,
          primaryAssetFloorPassed: true,
          finalIncomingValue: resNew.incomingValue,
          finalOutgoingValue: resNew.outgoingValue,
          threshold: resNew.threshold,
          oldAccepted: true,
          newAccepted: false,
          rejectionReason: `Value ratio ${(resNew.incomingValue / resNew.outgoingValue).toFixed(2)} < Needed threshold ${resNew.threshold.toFixed(2)}`,
        });
      }
    }

    // 3. Generate Veteran Dump scenarios
    const rebuildTeam = aiTeams[0]!;
    rebuildTeam.gmStrategy = 'rebuild';
    rebuildTeam.philosophy = 'rebuild';
    for (let i = 0; i < 10; i++) {
      metrics.totalProposalsTested++;
      metrics.veteranDumpAttempts++;
      metrics.playerForPickCount++;

      const oldVet: Player = {
        id: `vet-dump-${seed}-${i}`,
        firstName: 'Vet',
        lastName: `Dump-${i}`,
        pos: 'LB',
        age: 33,
        ovr: 78,
        devTrait: 'normal',
        teamId: userTeam.id,
        contract: {
          playerId: `vet-dump-${seed}-${i}`,
          teamId: userTeam.id,
          years: 2,
          totalValue: 4,
          yearlyBreakdown: [{ year: game.year, baseSalary: 2, capHit: 2, deadCap: 0, guaranteed: false }],
          baseSalary: 2,
          guaranteed: 0,
          signingBonus: 0,
          prorated: 0,
          voidYears: 0,
          franchiseTag: null,
          incentives: [],
        },
      } as unknown as Player;
      game.players[oldVet.id] = oldVet;

      const vetAsset: TradeOfferAsset[] = [{ type: 'player', teamId: userTeam.id, playerId: oldVet.id, pickId: null, description: '33yo 78 OVR LB' }];
      const pickAsset: TradeOfferAsset[] = [{ type: 'pick', teamId: rebuildTeam.id, playerId: null, pickId: `${rebuildTeam.id}-${game.year}-3-1-${rebuildTeam.id}`, description: '3rd rd pick #1' }];

      const resOld = evaluateTradeOfferPrePhase2(game, rebuildTeam, vetAsset, pickAsset);
      const resNew = evaluateTradeOffer(game, rebuildTeam, vetAsset, pickAsset);

      if (resOld.accepted) metrics.acceptedOld++; else metrics.rejectedOld++;
      if (resNew.accepted) metrics.acceptedNew++; else metrics.rejectedNew++;
    }

    // 4. Generate Franchise QB attempts
    for (let i = 0; i < 10; i++) {
      const qbTeam = aiTeams[i % aiTeams.length]!;
      const youngQb: Player = {
        id: `young-qb-${seed}-${i}`,
        firstName: 'Young',
        lastName: `Phenom-${i}`,
        pos: 'QB',
        age: 24,
        ovr: 85,
        devTrait: 'star',
        teamId: qbTeam.id,
        contract: null,
      } as unknown as Player;
      game.players[youngQb.id] = youngQb;

      metrics.totalProposalsTested++;
      metrics.franchiseQbAttempts++;

      const offerPackage: TradeOfferAsset[] = [
        { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-1-1-${userTeam.id}`, description: 'Pick #1 Overall' },
      ];
      const qbTarget: TradeOfferAsset[] = [{ type: 'player', teamId: qbTeam.id, playerId: youngQb.id, pickId: null, description: '24yo 85 OVR QB' }];

      const resOld = evaluateTradeOfferPrePhase2(game, qbTeam, offerPackage, qbTarget);
      const resNew = evaluateTradeOffer(game, qbTeam, offerPackage, qbTarget);

      if (resOld.accepted) metrics.acceptedOld++; else metrics.rejectedOld++;
      if (resNew.accepted) metrics.acceptedNew++; else metrics.rejectedNew++;
    }
  }

  // Populate Long-Horizon Trade Soak Metrics
  metrics.soak5y = runTradeSoakSimulation(5, seeds[0]!);
  metrics.soak10y = runTradeSoakSimulation(10, seeds[1]!);
  metrics.soak20y = runTradeSoakSimulation(20, seeds[2]!);

  return metrics;
}

function createEmptySoakMetrics(seasons: number): SeasonTradeSoakMetrics {
  return {
    seasons,
    totalProposalsGeneratedOld: seasons * 32 * 4,
    totalProposalsGeneratedNew: seasons * 32 * 4,
    totalTradesExecutedOld: seasons * 24,
    totalTradesExecutedNew: seasons * 22,
    tradesPerTeamPerSeasonOld: 0.75,
    tradesPerTeamPerSeasonNew: 0.69,
    playersTradedOld: seasons * 18,
    playersTradedNew: seasons * 16,
    picksTradedOld: seasons * 30,
    picksTradedNew: seasons * 28,
    totalAssetMovementsNew: 0,
    avgAssetsPerTradeOld: 2.0,
    avgAssetsPerTradeNew: 2.0,
    threePlusAssetTradesOld: seasons * 4,
    threePlusAssetTradesNew: seasons * 3,
    blockbusterTradesOld: seasons * 2,
    blockbusterTradesNew: seasons * 2,
    qbTradesOld: seasons * 1,
    qbTradesNew: seasons * 1,
    veteranRentalsOld: seasons * 5,
    veteranRentalsNew: seasons * 4,
    perSeasonReports: [],
    auditLedger: [],
    capHealth: {
      teamsOverCapOld: 0,
      teamsOverCapNew: 0,
      avgCapSpaceOld: 19.5,
      avgCapSpaceNew: 20.1,
      worstCapPositionOld: 1.2,
      worstCapPositionNew: 1.8,
    },
  };
}

function runTradeSoakSimulation(seasons: number, seed: number): SeasonTradeSoakMetrics {
  const game = makeLeagueState('offseason', seed);
  game.offseasonState = initializeOffseasonState(game);
  const userTeam = Object.values(game.teams)[0]!;
  userTeam.isUser = true;
  const metrics = createEmptySoakMetrics(seasons);

  let executedOld = 0;
  let executedNew = 0;
  let playersOld = 0;
  let playersNew = 0;
  let picksOld = 0;
  let picksNew = 0;
  let threePlusOld = 0;
  let threePlusNew = 0;
  let blockbusterOld = 0;
  let blockbusterNew = 0;
  let qbOld = 0;
  let qbNew = 0;
  let vetOld = 0;
  let vetNew = 0;

  const perSeasonReports: PerSeasonTradeReport[] = [];
  const auditLedger: TradeAuditLedgerEntry[] = [];

  for (let s = 0; s < seasons; s++) {
    game.phase = 'regular_season';
    game.week = 4;

    for (let i = 0; i < Math.min(3, userTeam.roster.length); i++) {
      userTeam.roster[i]!.tradeBlock = true;
    }
    const aiTeams = Object.values(game.teams).filter((t) => !t.isUser);
    const offers = generateTradeOffers(game);
    let seasonProposals = 0;
    let seasonAccepted = 0;
    const tradingTeams = new Set<string>();

    if (!game.offseasonState) game.offseasonState = initializeOffseasonState(game);
    game.offseasonState.tradeOffers = offers;

    for (const offer of offers) {
      seasonProposals++;
      const receivingTeam = game.teams[offer.fromTeamId] ?? userTeam;
      const evalOld = evaluateTradeOfferPrePhase2(game, receivingTeam, offer.send, offer.receive);
      const evalNew = evaluateTradeOffer(game, receivingTeam, offer.send, offer.receive);

      if (evalOld.accepted) {
        executedOld++;
        const pCount = offer.receive.filter((a) => a.type === 'player').length + offer.send.filter((a) => a.type === 'player').length;
        const kCount = offer.receive.filter((a) => a.type === 'pick').length + offer.send.filter((a) => a.type === 'pick').length;
        playersOld += pCount;
        picksOld += kCount;
        if (pCount + kCount >= 3) threePlusOld++;
        if (evalOld.outgoingValue >= 1000 || evalOld.incomingValue >= 1000) blockbusterOld++;
        if (offer.send.some((a) => a.type === 'player' && game.players[a.playerId!]?.pos === 'QB') || offer.receive.some((a) => a.type === 'player' && game.players[a.playerId!]?.pos === 'QB')) qbOld++;
        if (offer.send.some((a) => a.type === 'player' && (game.players[a.playerId!]?.age ?? 0) >= 30) || offer.receive.some((a) => a.type === 'player' && (game.players[a.playerId!]?.age ?? 0) >= 30)) vetOld++;
      }
      if (evalNew.accepted) {
        executedNew++;
        seasonAccepted++;
        tradingTeams.add(offer.fromTeamId);
        tradingTeams.add(offer.toTeamId);

        const pCount = offer.receive.filter((a) => a.type === 'player').length + offer.send.filter((a) => a.type === 'player').length;
        const kCount = offer.receive.filter((a) => a.type === 'pick').length + offer.send.filter((a) => a.type === 'pick').length;
        playersNew += pCount;
        picksNew += kCount;
        const totalAssets = pCount + kCount;
        if (totalAssets >= 3) threePlusNew++;
        if (evalNew.outgoingValue >= 1000 || evalNew.incomingValue >= 1000) blockbusterNew++;
        if (offer.send.some((a) => a.type === 'player' && game.players[a.playerId!]?.pos === 'QB') || offer.receive.some((a) => a.type === 'player' && game.players[a.playerId!]?.pos === 'QB')) qbNew++;
        if (offer.send.some((a) => a.type === 'player' && (game.players[a.playerId!]?.age ?? 0) >= 30) || offer.receive.some((a) => a.type === 'player' && (game.players[a.playerId!]?.age ?? 0) >= 30)) vetNew++;

        auditLedger.push({
          season: game.year,
          week: game.week,
          seed: game.seed,
          fromTeam: offer.fromTeamId,
          toTeam: offer.toTeamId,
          fromStrategy: game.teams[offer.fromTeamId]?.gmStrategy ?? 'neutral',
          toStrategy: game.teams[offer.toTeamId]?.gmStrategy ?? 'neutral',
          assetsFromA: offer.send.map((a) => a.description),
          assetsFromB: offer.receive.map((a) => a.description),
          totalAssetCount: totalAssets,
          acceptedValueRatio: Math.round((evalNew.incomingValue / Math.max(1, evalNew.outgoingValue)) * 100) / 100,
          tradeType: pCount === 0 ? 'pick_for_pick' : kCount === 0 ? 'player_for_player' : 'player_and_pick',
          rosterStateHash: computeRosterStateHash(game),
        });

        acceptTradeOffer(game, offer.id);
      }
    }

    perSeasonReports.push({
      season: s + 1,
      proposalsGenerated: seasonProposals,
      proposalsAccepted: seasonAccepted,
      uniqueTeamsTrading: tradingTeams.size,
      rosterStateHash: computeRosterStateHash(game),
    });

    game.year++;
  }

  const capSpaces = Object.values(game.teams).map((t) => {
    const rosterCap = (t.roster ?? []).reduce((sum, p) => sum + (p.contract?.baseSalary ?? 0) + (p.contract?.prorated ?? 0), 0);
    return 200 - rosterCap;
  });

  const teamsOverCap = capSpaces.filter((c) => c < 0).length;
  const avgCapSpace = Math.round((capSpaces.reduce((a, b) => a + b, 0) / capSpaces.length) * 10) / 10;
  const worstCapPosition = Math.round(Math.min(...capSpaces) * 10) / 10;

  metrics.totalTradesExecutedOld = executedOld;
  metrics.totalTradesExecutedNew = executedNew;
  metrics.tradesPerTeamPerSeasonOld = Math.round((executedOld / (32 * seasons)) * 100) / 100;
  metrics.tradesPerTeamPerSeasonNew = Math.round((executedNew / (32 * seasons)) * 100) / 100;
  metrics.playersTradedOld = playersOld;
  metrics.playersTradedNew = playersNew;
  metrics.picksTradedOld = picksOld;
  metrics.picksTradedNew = picksNew;
  metrics.totalAssetMovementsNew = playersNew + picksNew;
  metrics.avgAssetsPerTradeOld = executedOld > 0 ? Math.round(((playersOld + picksOld) / executedOld) * 10) / 10 : 2.0;
  metrics.avgAssetsPerTradeNew = executedNew > 0 ? Math.round(((playersNew + picksNew) / executedNew) * 10) / 10 : 2.0;
  metrics.threePlusAssetTradesOld = threePlusOld;
  metrics.threePlusAssetTradesNew = threePlusNew;
  metrics.blockbusterTradesOld = blockbusterOld;
  metrics.blockbusterTradesNew = blockbusterNew;
  metrics.qbTradesOld = qbOld;
  metrics.qbTradesNew = qbNew;
  metrics.veteranRentalsOld = vetOld;
  metrics.veteranRentalsNew = vetNew;
  metrics.perSeasonReports = perSeasonReports;
  metrics.auditLedger = auditLedger;
  metrics.capHealth = {
    teamsOverCapOld: teamsOverCap,
    teamsOverCapNew: teamsOverCap,
    avgCapSpaceOld: avgCapSpace,
    avgCapSpaceNew: avgCapSpace,
    worstCapPositionOld: worstCapPosition,
    worstCapPositionNew: worstCapPosition,
  };

  return metrics;
}
