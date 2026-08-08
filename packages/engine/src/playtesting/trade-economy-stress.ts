import { evaluateTradeOffer, calcPlayerValue, calcPickValue } from '../systems/trade-value';
import { makeLeagueState } from '../systems/test-helpers';
import { initializeOffseasonState } from '../systems/offseason';
import { mulberry32 } from '../rng';
import type { GameState, Player, Team, TradeOfferAsset, DraftPick } from '../types';

export interface TradeStressFinding {
  severity: 'CRITICAL EXPLOIT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'WORKING AS INTENDED';
  category: string;
  seed: number;
  teams: { offering: string; receiving: string };
  assets: { offering: string[]; receiving: string[] };
  offeringValue: number;
  receivingValue: number;
  threshold: number;
  accepted: boolean;
  whyAccepted: string;
  expectedFootballLogic: string;
  proposedCorrection: string;
  expectedSideEffects: string;
}

export function runTradeEconomyStressAudit(seed: number = 42): TradeStressFinding[] {
  const findings: TradeStressFinding[] = [];
  const rng = mulberry32(seed);

  const game = makeLeagueState('offseason', seed);
  game.offseasonState = initializeOffseasonState(game);

  const teams = Object.values(game.teams);
  const userTeam = teams.find((t) => t.isUser) ?? teams[0]!;
  const aiTeams = teams.filter((t) => t.id !== userTeam.id);

  // Vector 1: Quantity for Quality (Late picks for 1st round pick or Star Player)
  for (const aiTeam of aiTeams) {
    const starPlayer = aiTeam.roster.find((p) => p.ovr >= 85);
    if (!starPlayer) continue;

    const latePicks: TradeOfferAsset[] = [
      { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-5-150-${userTeam.id}`, description: '5th round pick' },
      { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-6-182-${userTeam.id}`, description: '6th round pick' },
      { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-7-214-${userTeam.id}`, description: '7th round pick' },
    ];
    const targetAsset: TradeOfferAsset[] = [
      { type: 'player', teamId: aiTeam.id, playerId: starPlayer.id, pickId: null, description: `${starPlayer.firstName} ${starPlayer.lastName} (${starPlayer.pos} ${starPlayer.ovr} OVR)` },
    ];

    const evalResult = evaluateTradeOffer(game, aiTeam, latePicks, targetAsset);
    if (evalResult.accepted) {
      findings.push({
        severity: 'CRITICAL EXPLOIT',
        category: 'Quantity for Quality',
        seed,
        teams: { offering: userTeam.id, receiving: aiTeam.id },
        assets: { offering: latePicks.map((a) => a.description), receiving: targetAsset.map((a) => a.description) },
        offeringValue: evalResult.incomingValue,
        receivingValue: evalResult.outgoingValue,
        threshold: evalResult.threshold,
        accepted: true,
        whyAccepted: `Total incoming value (${evalResult.incomingValue.toFixed(1)}) met AI threshold (${(evalResult.outgoingValue * evalResult.threshold).toFixed(1)}).`,
        expectedFootballLogic: 'AI should reject 3 late-round picks for an elite 85+ OVR starter.',
        proposedCorrection: 'Apply diminishing marginal value to packages with >2 assets or enforce minimum individual asset value thresholds.',
        expectedSideEffects: 'Limits spamming low-tier pick bundles.',
      });
    } else {
      findings.push({
        severity: 'WORKING AS INTENDED',
        category: 'Quantity for Quality',
        seed,
        teams: { offering: userTeam.id, receiving: aiTeam.id },
        assets: { offering: latePicks.map((a) => a.description), receiving: targetAsset.map((a) => a.description) },
        offeringValue: evalResult.incomingValue,
        receivingValue: evalResult.outgoingValue,
        threshold: evalResult.threshold,
        accepted: false,
        whyAccepted: `AI rejected offer (Incoming ${evalResult.incomingValue.toFixed(1)} < Needed ${(evalResult.outgoingValue * evalResult.threshold).toFixed(1)}).`,
        expectedFootballLogic: 'AI rejects late pick bundles for star players.',
        proposedCorrection: 'None needed.',
        expectedSideEffects: 'None.',
      });
    }
    break;
  }

  // Vector 2: Aging Veteran Dump on Rebuild Team
  const rebuildTeam = aiTeams.find((t) => t.gmStrategy === 'rebuild') ?? aiTeams[0]!;
  const oldVet: Player = {
    id: 'old-vet-1',
    firstName: 'Old',
    lastName: 'Veteran',
    pos: 'LB',
    age: 33,
    ovr: 76,
    devTrait: 'normal',
    teamId: userTeam.id,
    contract: {
      playerId: 'old-vet-1',
      teamId: userTeam.id,
      years: 3,
      totalValue: 36,
      yearlyBreakdown: [{ year: game.year, baseSalary: 12, capHit: 12, deadCap: 0, guaranteed: false }],
      baseSalary: 12,
      guaranteed: 0,
      signingBonus: 0,
      prorated: 0,
      voidYears: 0,
      franchiseTag: null,
      incentives: [],
    },
  } as unknown as Player;
  game.players['old-vet-1'] = oldVet;
  userTeam.roster.push(oldVet);

  const vetAsset: TradeOfferAsset[] = [
    { type: 'player', teamId: userTeam.id, playerId: oldVet.id, pickId: null, description: 'Old Veteran (LB 33yo 76OVR $12M/yr)' },
  ];
  const aiPickAsset: TradeOfferAsset[] = [
    { type: 'pick', teamId: rebuildTeam.id, playerId: null, pickId: `${rebuildTeam.id}-${game.year}-2-35-${rebuildTeam.id}`, description: '2nd round pick' },
  ];

  const vetEval = evaluateTradeOffer(game, rebuildTeam, vetAsset, aiPickAsset);
  if (vetEval.accepted) {
    findings.push({
      severity: 'HIGH',
      category: 'Veteran Salary Dump',
      seed,
      teams: { offering: userTeam.id, receiving: rebuildTeam.id },
      assets: { offering: vetAsset.map((a) => a.description), receiving: aiPickAsset.map((a) => a.description) },
      offeringValue: vetEval.incomingValue,
      receivingValue: vetEval.outgoingValue,
      threshold: vetEval.threshold,
      accepted: true,
      whyAccepted: `Rebuild team valued 33yo veteran at ${vetEval.incomingValue.toFixed(1)} vs 2nd rd pick ${vetEval.outgoingValue.toFixed(1)}.`,
      expectedFootballLogic: 'Rebuilding teams should not give up 2nd-round picks for overpaid 33-year-old veterans.',
      proposedCorrection: 'Increase age decline penalty for rebuilders and penalize contracts taking up >8% cap space on non-prime players.',
      expectedSideEffects: 'Protects rebuilding AI cap space.',
    });
  } else {
    findings.push({
      severity: 'WORKING AS INTENDED',
      category: 'Veteran Salary Dump',
      seed,
      teams: { offering: userTeam.id, receiving: rebuildTeam.id },
      assets: { offering: vetAsset.map((a) => a.description), receiving: aiPickAsset.map((a) => a.description) },
      offeringValue: vetEval.incomingValue,
      receivingValue: vetEval.outgoingValue,
      threshold: vetEval.threshold,
      accepted: false,
      whyAccepted: `Rebuild team rejected 33yo expensive veteran for 2nd rd pick.`,
      expectedFootballLogic: 'Rebuilding teams reject expensive aging veterans.',
      proposedCorrection: 'None.',
      expectedSideEffects: 'None.',
    });
  }

  // Vector 3: Positional Valuation Contrast (QB vs RB vs K)
  const qbPlayer = { ...oldVet, id: 'test-qb-1', pos: 'QB' as const, age: 25, ovr: 80 };
  const rbPlayer = { ...oldVet, id: 'test-rb-1', pos: 'RB' as const, age: 25, ovr: 80 };
  const kPlayer = { ...oldVet, id: 'test-k-1', pos: 'K' as const, age: 25, ovr: 80 };
  game.players['test-qb-1'] = qbPlayer;
  game.players['test-rb-1'] = rbPlayer;
  game.players['test-k-1'] = kPlayer;

  const qbVal = calcPlayerValue(game, qbPlayer, rebuildTeam);
  const rbVal = calcPlayerValue(game, rbPlayer, rebuildTeam);
  const kVal = calcPlayerValue(game, kPlayer, rebuildTeam);

  if (qbVal <= rbVal) {
    findings.push({
      severity: 'HIGH',
      category: 'Positional Scarcity',
      seed,
      teams: { offering: userTeam.id, receiving: rebuildTeam.id },
      assets: { offering: ['QB 80 OVR'], receiving: ['RB 80 OVR'] },
      offeringValue: qbVal,
      receivingValue: rbVal,
      threshold: 1.0,
      accepted: false,
      whyAccepted: `QB value (${qbVal.toFixed(1)}) is not significantly higher than RB value (${rbVal.toFixed(1)}).`,
      expectedFootballLogic: 'Starting QBs must hold a significant premium over running backs of equal OVR.',
      proposedCorrection: 'Review positional value multiplier curve.',
      expectedSideEffects: 'Elevates QB trade currency.',
    });
  } else {
    findings.push({
      severity: 'WORKING AS INTENDED',
      category: 'Positional Scarcity',
      seed,
      teams: { offering: userTeam.id, receiving: rebuildTeam.id },
      assets: { offering: [`QB 80OVR (${qbVal.toFixed(1)})`], receiving: [`RB (${rbVal.toFixed(1)}) / K (${kVal.toFixed(1)})`] },
      offeringValue: qbVal,
      receivingValue: rbVal,
      threshold: 1.0,
      accepted: false,
      whyAccepted: `QB valued at ${qbVal.toFixed(1)} vs RB ${rbVal.toFixed(1)} vs K ${kVal.toFixed(1)}.`,
      expectedFootballLogic: 'QB holds substantial premium over lower-tier positions.',
      proposedCorrection: 'None.',
      expectedSideEffects: 'None.',
    });
  }

  // Vector 4: Pick #1 vs Pick #32 Valuation Curve
  const pick1Val = calcPickValue({ round: 1, pick: 1 });
  const pick32Val = calcPickValue({ round: 1, pick: 32 });
  const pick33Val = calcPickValue({ round: 2, pick: 1 });

  if (pick1Val / pick32Val < 3) {
    findings.push({
      severity: 'MEDIUM',
      category: 'Draft Pick Curve',
      seed,
      teams: { offering: userTeam.id, receiving: rebuildTeam.id },
      assets: { offering: ['Pick #1 (3000)'], receiving: ['Pick #32 (590)'] },
      offeringValue: pick1Val,
      receivingValue: pick32Val,
      threshold: 1.0,
      accepted: false,
      whyAccepted: `Pick #1 (${pick1Val}) is ${(pick1Val / pick32Val).toFixed(1)}x Pick #32 (${pick32Val}).`,
      expectedFootballLogic: 'Top 5 picks carry immense premium in NFL draft trade charts.',
      proposedCorrection: 'Ensure steep non-linear drop-off.',
      expectedSideEffects: 'Protects top 5 picks.',
    });
  } else {
    findings.push({
      severity: 'WORKING AS INTENDED',
      category: 'Draft Pick Curve',
      seed,
      teams: { offering: userTeam.id, receiving: rebuildTeam.id },
      assets: { offering: [`Pick #1 (${pick1Val})`], receiving: [`Pick #32 (${pick32Val}) / Pick #33 (${pick33Val})`] },
      offeringValue: pick1Val,
      receivingValue: pick32Val,
      threshold: 1.0,
      accepted: false,
      whyAccepted: `Pick #1 is ${(pick1Val / pick32Val).toFixed(1)}x Pick #32.`,
      expectedFootballLogic: 'Top picks carry appropriate draft chart premium.',
      proposedCorrection: 'None.',
      expectedSideEffects: 'None.',
    });
  }

  return findings;
}
