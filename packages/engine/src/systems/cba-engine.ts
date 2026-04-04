import { RNG } from '../rng';
import type {
  CBADeal,
  CBAEvaluation,
  CBANegotiationResult,
  CBAProposal,
  CBAState,
  CBAStatus,
  CBATerms,
  FranchiseTagType,
  GameState,
  LeagueRuleSource,
  LockoutResolution,
  NegotiationState,
  RuleChange,
} from '../types';
import { applyRuleChange, getActiveRule, initLeagueRules } from './league-rules';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nextInt(min: number, max: number): number {
  return Math.floor(RNG.event() * (max - min + 1)) + min;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rulesTerms(game: GameState): CBATerms {
  const rules = game.leagueRules ?? initLeagueRules(game.year);
  return {
    revenueSplit: Number(getActiveRule(rules, 'revenue_split', game.year)),
    capGrowthRate: Number(getActiveRule(rules, 'salary_cap_growth', game.year)),
    capFloorPct: Number(getActiveRule(rules, 'cap_floor_pct', game.year)),
    minSalaryScale: [...(getActiveRule(rules, 'min_salary_scale', game.year) as number[])],
    franchiseTagLimit: Number(getActiveRule(rules, 'franchise_tag_limit', game.year)),
    tagTypesAllowed: [...(getActiveRule(rules, 'tag_types_allowed', game.year) as FranchiseTagType[])],
    rosterLimit: Number(getActiveRule(rules, 'roster_limit', game.year)),
    practiceSquadSize: Number(getActiveRule(rules, 'practice_squad_size', game.year)),
    irReturnLimit: Number(getActiveRule(rules, 'ir_return_limit', game.year)),
    playoffSeeds: Number(getActiveRule(rules, 'playoff_seeds_per_conf', game.year)),
    draftRounds: Number(getActiveRule(rules, 'draft_rounds', game.year)),
  };
}

function copyTerms(terms: CBATerms): CBATerms {
  return {
    ...terms,
    minSalaryScale: [...terms.minSalaryScale],
    tagTypesAllowed: [...terms.tagTypesAllowed],
  };
}

function durationForYear(year: number): number {
  const roll = ((year * 17) ^ 0x9e3779b9) >>> 0;
  return 7 + (roll % 4);
}

function simpleMajority(teamCount: number): number {
  return Math.floor(teamCount / 2) + 1;
}

function capNumber(value: number, min: number, max: number, digits = 3): number {
  return Number(clamp(value, min, max).toFixed(digits));
}

function financialHealth(game: GameState): number {
  const attendance = average(Object.values(game.teams).map((team) => team.franchiseIdentity?.attendance ?? 75));
  const prestige = average(Object.values(game.teams).map((team) => team.franchiseIdentity?.prestige ?? 60));
  return clamp((attendance + prestige) / 2, 0, 100);
}

function proposalId(side: CBAProposal['side'], year: number, round: number): string {
  return `cba-${side}-${year}-${round}`;
}

function agreementId(year: number): string {
  return `cba-deal-${year}`;
}

function arrayOverlapScore<T extends string | number>(left: T[], right: T[]): number {
  const leftSet = new Set(left);
  const overlap = right.filter((entry) => leftSet.has(entry)).length;
  return right.length === 0 ? 1 : overlap / right.length;
}

function proposalGap(ownersProposal: CBAProposal, playersProposal: CBAProposal): number {
  const owners = ownersProposal.terms;
  const players = playersProposal.terms;
  const gapScore = (
    Math.abs(owners.revenueSplit - players.revenueSplit) * 200
    + Math.abs(owners.capGrowthRate - players.capGrowthRate) * 800
    + Math.abs(owners.capFloorPct - players.capFloorPct) * 600
    + Math.abs(owners.franchiseTagLimit - players.franchiseTagLimit) * 10
    + Math.abs(owners.rosterLimit - players.rosterLimit) * 2.5
    + Math.abs(owners.practiceSquadSize - players.practiceSquadSize) * 2
    + Math.abs(owners.irReturnLimit - players.irReturnLimit) * 2
    + Math.abs(owners.playoffSeeds - players.playoffSeeds) * 10
    + Math.abs(owners.draftRounds - players.draftRounds) * 6
    + Math.abs(arrayOverlapScore(owners.tagTypesAllowed, players.tagTypesAllowed) - 1) * 20
  );
  return clamp(Math.round(gapScore), 0, 100);
}

function compromiseTerms(owners: CBATerms, players: CBATerms): CBATerms {
  const tagTypesAllowed = owners.tagTypesAllowed.filter((entry) => players.tagTypesAllowed.includes(entry));
  return {
    revenueSplit: capNumber((owners.revenueSplit + players.revenueSplit) / 2, 0.45, 0.55, 2),
    capGrowthRate: capNumber((owners.capGrowthRate + players.capGrowthRate) / 2, 0.03, 0.08, 3),
    capFloorPct: capNumber((owners.capFloorPct + players.capFloorPct) / 2, 0.85, 0.95, 2),
    minSalaryScale: owners.minSalaryScale.map((value, index) => Number(((value + players.minSalaryScale[index]!) / 2).toFixed(3))),
    franchiseTagLimit: Math.round((owners.franchiseTagLimit + players.franchiseTagLimit) / 2),
    tagTypesAllowed: tagTypesAllowed.length > 0 ? tagTypesAllowed : [...owners.tagTypesAllowed],
    rosterLimit: Math.round((owners.rosterLimit + players.rosterLimit) / 2),
    practiceSquadSize: Math.round((owners.practiceSquadSize + players.practiceSquadSize) / 2),
    irReturnLimit: Math.round((owners.irReturnLimit + players.irReturnLimit) / 2),
    playoffSeeds: Math.round((owners.playoffSeeds + players.playoffSeeds) / 2),
    draftRounds: Math.round((owners.draftRounds + players.draftRounds) / 2),
  };
}

function baseDealTerms(cba: CBAState, game?: GameState): CBATerms {
  if (cba.currentDeal) return copyTerms(cba.currentDeal.terms);
  if (game) return rulesTerms(game);
  return rulesTerms({
    ...({ year: 2026, teams: {}, leagueRules: initLeagueRules(2026) }) as GameState,
  });
}

function emergencyDeal(cba: CBAState, year: number): CBADeal {
  const terms = cba.currentDeal ? copyTerms(cba.currentDeal.terms) : rulesTerms({ ...({ year, teams: {}, leagueRules: initLeagueRules(year) }) as GameState });
  const duration = 5;
  return {
    id: agreementId(year),
    startYear: year,
    endYear: year + duration,
    duration,
    terms,
    ratifiedBy: 'both',
    amendments: [],
  };
}

export function cbaTermsToRuleChanges(
  terms: CBATerms,
  year: number,
  source: LeagueRuleSource,
  proposedBy: string,
  rationale: string,
): RuleChange[] {
  return [
    { key: 'revenue_split', newValue: terms.revenueSplit, source, proposedBy, effectiveYear: year, rationale },
    { key: 'salary_cap_growth', newValue: terms.capGrowthRate, source, proposedBy, effectiveYear: year, rationale },
    { key: 'cap_floor_pct', newValue: terms.capFloorPct, source, proposedBy, effectiveYear: year, rationale },
    { key: 'min_salary_scale', newValue: [...terms.minSalaryScale], source, proposedBy, effectiveYear: year, rationale },
    { key: 'franchise_tag_limit', newValue: terms.franchiseTagLimit, source, proposedBy, effectiveYear: year, rationale },
    { key: 'tag_types_allowed', newValue: [...terms.tagTypesAllowed], source, proposedBy, effectiveYear: year, rationale },
    { key: 'roster_limit', newValue: terms.rosterLimit, source, proposedBy, effectiveYear: year, rationale },
    { key: 'practice_squad_size', newValue: terms.practiceSquadSize, source, proposedBy, effectiveYear: year, rationale },
    { key: 'ir_return_limit', newValue: terms.irReturnLimit, source, proposedBy, effectiveYear: year, rationale },
    { key: 'playoff_seeds_per_conf', newValue: terms.playoffSeeds, source, proposedBy, effectiveYear: year, rationale },
    { key: 'draft_rounds', newValue: terms.draftRounds, source, proposedBy, effectiveYear: year, rationale },
  ];
}

export function applyCBADealToRules(game: GameState, deal: CBADeal): GameState {
  let rules = game.leagueRules ?? initLeagueRules(game.year);
  for (const change of cbaTermsToRuleChanges(deal.terms, deal.startYear, 'cba', 'cba', 'Ratified CBA terms')) {
    rules = applyRuleChange(rules, change);
  }
  game.leagueRules = rules;
  return game;
}

export function initCBA(year: number): CBAState {
  const duration = durationForYear(year);
  const terms = rulesTerms({
    ...({ year, teams: {}, leagueRules: initLeagueRules(year) }) as GameState,
  });
  const initialDeal: CBADeal = {
    id: agreementId(year),
    startYear: year,
    endYear: year + duration,
    duration,
    terms,
    ratifiedBy: 'both',
    amendments: [],
  };

  return {
    status: 'active',
    currentDeal: initialDeal,
    negotiationState: null,
    history: [initialDeal],
    lockoutRisk: 0,
    lastNegotiationYear: null,
  };
}

export function checkCBAStatus(cba: CBAState, year: number): CBAStatus {
  if (cba.status === 'negotiating' || cba.status === 'awaiting_owner_vote' || cba.status === 'lockout') {
    return cba.status;
  }
  if (!cba.currentDeal) return 'expired';
  if (year > cba.currentDeal.endYear) return 'expired';
  if (year === cba.currentDeal.endYear) return 'expiring';
  return 'active';
}

export function generateCBAProposal(cba: CBAState, side: 'owners' | 'players', game: GameState): CBAProposal {
  const base = baseDealTerms(cba, game);
  const pulse = financialHealth(game) / 100;
  const round = (cba.negotiationState?.round ?? 0) + 1;

  const revenueSplit = side === 'players'
    ? capNumber(base.revenueSplit + 0.01 + pulse * 0.02, 0.45, 0.55, 2)
    : capNumber(base.revenueSplit - 0.01 + pulse * 0.005, 0.45, 0.55, 2);
  const capGrowthRate = side === 'players'
    ? capNumber(base.capGrowthRate + 0.005 + pulse * 0.005, 0.03, 0.08, 3)
    : capNumber(base.capGrowthRate - 0.005, 0.03, 0.08, 3);
  const capFloorPct = side === 'players'
    ? capNumber(base.capFloorPct + 0.02, 0.85, 0.95, 2)
    : capNumber(base.capFloorPct - 0.01, 0.85, 0.95, 2);
  const franchiseTagLimit = clamp(base.franchiseTagLimit + (side === 'players' ? 1 : 0), 1, 3);
  const rosterLimit = clamp(base.rosterLimit + (side === 'players' ? 1 : 0), 48, 56);
  const practiceSquadSize = clamp(base.practiceSquadSize + (side === 'players' ? 2 : 0), 8, 16);
  const irReturnLimit = clamp(base.irReturnLimit + (side === 'players' ? 1 : 0), 2, 8);
  const playoffSeeds = clamp(base.playoffSeeds + (side === 'players' && pulse > 0.65 ? 1 : 0), 6, 8);
  const draftRounds = clamp(base.draftRounds + (side === 'owners' ? -1 : 0), 5, 9);
  const tagTypesAllowed = side === 'players' && base.tagTypesAllowed.includes('transition')
    ? base.tagTypesAllowed.filter((entry) => entry !== 'transition')
    : [...base.tagTypesAllowed];

  return {
    id: proposalId(side, game.year, round),
    side,
    year: game.year,
    round,
    rationale: side === 'players'
      ? 'Players push for stronger salaries, floors, and roster protection.'
      : 'Owners prioritize cost control and structural stability.',
    terms: {
      revenueSplit,
      capGrowthRate,
      capFloorPct,
      minSalaryScale: base.minSalaryScale.map((value, index) =>
        Number((value * (side === 'players' ? 1.02 + index * 0.01 : 0.99 + index * 0.005)).toFixed(3))),
      franchiseTagLimit,
      tagTypesAllowed,
      rosterLimit,
      practiceSquadSize,
      irReturnLimit,
      playoffSeeds,
      draftRounds,
    },
  };
}

export function evaluateCBAProposal(proposal: CBAProposal, side: 'owners' | 'players', game: GameState): CBAEvaluation {
  const currentTerms = game.cbaState?.currentDeal?.terms ?? rulesTerms(game);
  const terms = proposal.terms;
  const score = side === 'players'
    ? 50
      + (terms.revenueSplit - currentTerms.revenueSplit) * 300
      + (terms.capFloorPct - currentTerms.capFloorPct) * 240
      + (terms.practiceSquadSize - currentTerms.practiceSquadSize) * 2
      + (terms.playoffSeeds - currentTerms.playoffSeeds) * 6
      - (terms.franchiseTagLimit - currentTerms.franchiseTagLimit) * 7
    : 50
      - (terms.revenueSplit - currentTerms.revenueSplit) * 280
      - (terms.capFloorPct - currentTerms.capFloorPct) * 220
      - (terms.rosterLimit - currentTerms.rosterLimit) * 2
      - (terms.practiceSquadSize - currentTerms.practiceSquadSize) * 2
      + (terms.franchiseTagLimit - currentTerms.franchiseTagLimit) * 8;

  const concessions: string[] = [];
  const painPoints: string[] = [];

  if (terms.revenueSplit !== currentTerms.revenueSplit) {
    (side === 'players' ? terms.revenueSplit > currentTerms.revenueSplit : terms.revenueSplit < currentTerms.revenueSplit)
      ? concessions.push('Revenue split moved in our favor.')
      : painPoints.push('Revenue split moved away from our side.');
  }
  if (terms.practiceSquadSize !== currentTerms.practiceSquadSize) {
    (side === 'players' ? terms.practiceSquadSize > currentTerms.practiceSquadSize : terms.practiceSquadSize < currentTerms.practiceSquadSize)
      ? concessions.push('Practice squad rules improved.')
      : painPoints.push('Practice squad size worsened.');
  }

  return {
    side,
    score: clamp(Math.round(score), 0, 100),
    concessions,
    painPoints,
  };
}

export function negotiateCBA(cba: CBAState, game: GameState): CBANegotiationResult {
  const state: NegotiationState = cba.negotiationState ?? {
    round: 0,
    ownersProposal: null,
    playersProposal: null,
    currentProposal: null,
    gap: 60,
    mediator: false,
    publicPressure: 15,
    ownerVotes: {},
    userVote: null,
  };
  const round = clamp(state.round + 1, 1, 5);
  const ownersProposal = generateCBAProposal({ ...cba, negotiationState: state }, 'owners', game);
  const playersProposal = generateCBAProposal({ ...cba, negotiationState: state }, 'players', game);
  const rawGap = proposalGap(ownersProposal, playersProposal);
  const carriedGap = state.gap > 0 ? Math.min(state.gap, rawGap) : rawGap;
  const narrowedGap = clamp(carriedGap - nextInt(10, 20), 0, 100);
  const publicPressure = clamp(state.publicPressure + nextInt(10, 20), 0, 100);
  const currentProposal = narrowedGap < 15 ? {
    id: proposalId('owners', game.year, round) + '-compromise',
    side: 'owners' as const,
    year: game.year,
    round,
    rationale: 'A mediator-backed compromise takes shape.',
    terms: compromiseTerms(ownersProposal.terms, playersProposal.terms),
  } : null;

  const nextCba: CBAState = {
    ...cba,
    status: currentProposal ? 'awaiting_owner_vote' : round >= 5 ? 'lockout' : 'negotiating',
    negotiationState: {
      round,
      ownersProposal,
      playersProposal,
      currentProposal,
      gap: narrowedGap,
      mediator: publicPressure >= 55,
      publicPressure,
      ownerVotes: {},
      userVote: null,
    },
    lockoutRisk: currentProposal ? Math.max(0, cba.lockoutRisk - 10) : clamp(cba.lockoutRisk + publicPressure / 6, 0, 100),
    lastNegotiationYear: game.year,
  };

  return {
    cba: nextCba,
    proposal: currentProposal,
    dealReached: Boolean(currentProposal),
    lockout: nextCba.status === 'lockout',
    ownerApprovalThreshold: simpleMajority(Object.keys(game.teams).length),
    ownerYesVotes: 0,
    summary: currentProposal
      ? `Round ${round}: the sides have a tentative agreement.`
      : nextCba.status === 'lockout'
        ? 'Negotiations collapsed and the league entered a lockout.'
        : `Round ${round}: negotiations continue.`,
  };
}

export function ratifyCBA(cba: CBAState, proposal: CBAProposal, year: number): CBAState {
  const duration = clamp(durationForYear(year) - 1, 5, 10);
  const nextDeal: CBADeal = {
    id: agreementId(year),
    startYear: year,
    endYear: year + duration,
    duration,
    terms: copyTerms(proposal.terms),
    ratifiedBy: 'both',
    amendments: [],
  };

  return {
    status: 'active',
    currentDeal: nextDeal,
    negotiationState: null,
    history: [...cba.history, nextDeal],
    lockoutRisk: 0,
    lastNegotiationYear: year,
  };
}

export function getLockoutRisk(cba: CBAState, year: number): number {
  if (cba.status === 'lockout') return 100;
  if (!cba.currentDeal) return 80;
  if (year > cba.currentDeal.endYear) return clamp(60 + cba.lockoutRisk, 0, 100);
  if (year === cba.currentDeal.endYear) return clamp(25 + cba.lockoutRisk, 0, 100);
  return clamp(cba.lockoutRisk, 0, 100);
}

export function resolveLockout(cba: CBAState, game: GameState): LockoutResolution {
  if (cba.status !== 'lockout') {
    return {
      cba,
      resolved: false,
      summary: 'No lockout is active.',
    };
  }

  const deal = emergencyDeal(cba, game.year);
  const nextCba: CBAState = {
    status: 'active',
    currentDeal: deal,
    negotiationState: null,
    history: [...cba.history, deal],
    lockoutRisk: 0,
    lastNegotiationYear: game.year,
  };

  return {
    cba: nextCba,
    resolved: true,
    summary: 'A short-term agreement ends the lockout and league business resumes.',
  };
}
