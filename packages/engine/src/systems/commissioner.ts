import { RNG } from '../rng';
import type {
  CommissionerRuling,
  CommissionerState,
  GameState,
  LeagueRuleKey,
  LeagueRuleValue,
  RuleProposal,
  RuleProposalVote,
  VoteResult,
} from '../types';
import { LEAGUE_RULE_DEFINITIONS, getActiveRule } from './league-rules';

const FIRST_NAMES = ['Elena', 'Marcus', 'Diane', 'Victor', 'Tessa', 'Calvin'] as const;
const LAST_NAMES = ['Morrow', 'Bishop', 'Hale', 'Delaney', 'Pryce', 'Sullivan'] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function simpleMajority(teamCount: number): number {
  return Math.floor(teamCount / 2) + 1;
}

function deterministicIndex(seed: number, salt: number, length: number): number {
  return (((seed * 1103515245) ^ (salt * 12345)) >>> 0) % length;
}

function nextIndex(length: number): number {
  return Math.floor(RNG.event() * length);
}

function averageAttendance(game: GameState): number {
  const teams = Object.values(game.teams);
  if (teams.length === 0) return 75;
  return teams.reduce((sum, team) => sum + (team.franchiseIdentity?.attendance ?? 75), 0) / teams.length;
}

function selectProposalRule(state: CommissionerState, game: GameState): LeagueRuleKey {
  const pool: LeagueRuleKey[] = state.personality === 'progressive'
    ? ['playoff_seeds_per_conf', 'practice_squad_size', 'roster_limit']
    : state.personality === 'traditionalist'
      ? ['schedule_weeks', 'draft_rounds', 'trade_deadline_week']
      : averageAttendance(game) >= 82
        ? ['playoff_seeds_per_conf', 'roster_limit', 'practice_squad_size']
        : ['revenue_split', 'practice_squad_size', 'cap_floor_pct'];
  return pool[nextIndex(pool.length)] ?? 'practice_squad_size';
}

function proposedValueForRule(key: LeagueRuleKey, currentValue: LeagueRuleValue): LeagueRuleValue {
  if (key === 'playoff_seeds_per_conf') {
    return Number(currentValue) >= 8 ? 7 : 8;
  }
  if (key === 'practice_squad_size') {
    return clamp(Number(currentValue) + 2, 8, 16);
  }
  if (key === 'roster_limit') {
    return clamp(Number(currentValue) + 1, 48, 56);
  }
  if (key === 'schedule_weeks') {
    return Number(currentValue) >= 19 ? 18 : 19;
  }
  if (key === 'draft_rounds') {
    return clamp(Number(currentValue) + (Number(currentValue) >= 7 ? -1 : 1), 5, 9);
  }
  if (key === 'trade_deadline_week') {
    return clamp(Number(currentValue) + 1, 7, 12);
  }
  if (key === 'revenue_split') {
    return Number((clamp(Number(currentValue) + 0.01, 0.45, 0.55)).toFixed(2));
  }
  if (key === 'cap_floor_pct') {
    return Number((clamp(Number(currentValue) + 0.01, 0.85, 0.95)).toFixed(2));
  }
  return currentValue;
}

function rationaleFor(key: LeagueRuleKey, personality: CommissionerState['personality']): string {
  const label = LEAGUE_RULE_DEFINITIONS[key].label.toLowerCase();
  if (personality === 'progressive') {
    return `The commissioner believes ${label} should evolve with the modern league.`;
  }
  if (personality === 'traditionalist') {
    return `The commissioner wants a careful adjustment to ${label} without overhauling the game.`;
  }
  return `The commissioner is responding to the league's current public mood around ${label}.`;
}

function createProposal(state: CommissionerState, game: GameState, source: RuleProposal['source']): RuleProposal {
  const rules = game.leagueRules;
  const ruleKey = selectProposalRule(state, game);
  const currentValue = getActiveRule(rules, ruleKey, game.year);
  const proposedValue = proposedValueForRule(ruleKey, currentValue);
  return {
    id: `rule-proposal-${game.year}-${ruleKey}-${state.history.length + state.activeProposals.length}`,
    ruleKey,
    currentValue,
    proposedValue,
    rationale: rationaleFor(ruleKey, state.personality),
    source,
    votes: {},
    requiredMajority: simpleMajority(Object.keys(game.teams).length),
    deadline: game.year,
    effectiveYear: game.year + 1,
    proposedByTeamId: null,
  };
}

function teamWouldLikeProposal(proposal: RuleProposal, team: GameState['teams'][string]): boolean {
  if (proposal.ruleKey === 'revenue_split') {
    return team.franchiseIdentity.marketSize === 'small' || team.franchiseIdentity.marketSize === 'medium';
  }
  if (proposal.ruleKey === 'practice_squad_size' || proposal.ruleKey === 'roster_limit') {
    return team.gmStrategy !== 'contend' || team.wins < team.losses;
  }
  if (proposal.ruleKey === 'playoff_seeds_per_conf') {
    return team.wins <= team.losses;
  }
  if (proposal.ruleKey === 'schedule_weeks') {
    return team.wins < team.losses;
  }
  return true;
}

function replacementCommissioner(year: number): CommissionerState {
  const next = initCommissioner(year);
  return {
    ...next,
    tenure: 0,
    approval: 55,
    lowApprovalYears: 0,
    activeProposals: [],
    history: [],
    rulings: [],
  };
}

export function initCommissioner(year: number): CommissionerState {
  const first = FIRST_NAMES[deterministicIndex(year, 1, FIRST_NAMES.length)] ?? 'Alex';
  const last = LAST_NAMES[deterministicIndex(year, 2, LAST_NAMES.length)] ?? 'Parker';
  const personalities: CommissionerState['personality'][] = ['progressive', 'traditionalist', 'populist'];
  return {
    name: `${first} ${last}`,
    personality: personalities[deterministicIndex(year, 3, personalities.length)] ?? 'progressive',
    tenure: 1,
    approval: 60,
    activeProposals: [],
    history: [],
    rulings: [],
    lowApprovalYears: 0,
  };
}

export function generateRuleProposal(state: CommissionerState, game: GameState): RuleProposal | null {
  return createProposal(state, game, 'commissioner');
}

export function castVote(proposal: RuleProposal, teamId: string, vote: 'yes' | 'no'): RuleProposal {
  return {
    ...proposal,
    votes: {
      ...proposal.votes,
      [teamId]: vote,
    },
  };
}

export function simulateAIVotes(proposal: RuleProposal, game: GameState): RuleProposal {
  const votes: Record<string, RuleProposalVote> = { ...proposal.votes };
  for (const team of Object.values(game.teams)) {
    if (votes[team.id]) continue;
    votes[team.id] = teamWouldLikeProposal(proposal, team) ? 'yes' : 'no';
  }

  return {
    ...proposal,
    votes,
  };
}

export function resolveVote(proposal: RuleProposal): VoteResult {
  const counts = Object.values(proposal.votes).reduce((acc, vote) => {
    if (vote === 'yes') acc.yes += 1;
    else if (vote === 'no') acc.no += 1;
    else acc.abstain += 1;
    return acc;
  }, { yes: 0, no: 0, abstain: 0 });

  return {
    proposalId: proposal.id,
    passed: counts.yes >= proposal.requiredMajority,
    yesVotes: counts.yes,
    noVotes: counts.no,
    abstains: counts.abstain,
    effectiveYear: proposal.effectiveYear,
    ruleKey: proposal.ruleKey,
    proposedValue: proposal.proposedValue,
  };
}

export function getCommissionerAgenda(state: CommissionerState, game: GameState): RuleProposal[] {
  if (state.activeProposals.length > 0) return state.activeProposals;
  const proposal = generateRuleProposal(state, game);
  return proposal ? [proposal] : [];
}

export function issueRuling(state: CommissionerState, ruling: CommissionerRuling): CommissionerState {
  return {
    ...state,
    rulings: [ruling, ...state.rulings].slice(0, 24),
  };
}

export function advanceCommissioner(state: CommissionerState, game: GameState): CommissionerState {
  let nextState: CommissionerState = {
    ...state,
    tenure: state.tenure + 1,
    activeProposals: [...state.activeProposals],
    history: [...state.history],
    rulings: [...state.rulings],
  };

  const recentVotes = nextState.history.slice(-2);
  const voteDelta = recentVotes.reduce((sum, vote) => sum + (vote.passed ? 2 : -4), 0);
  const unionSatisfaction = game.laborState?.unionSatisfaction ?? 60;
  const laborDelta = unionSatisfaction < 40 ? -6 : unionSatisfaction > 70 ? 3 : 0;
  nextState.approval = clamp(nextState.approval + voteDelta + laborDelta, 0, 100);

  if (nextState.approval < 20) {
    nextState.lowApprovalYears += 1;
  } else {
    nextState.lowApprovalYears = 0;
  }

  if (nextState.lowApprovalYears >= 3) {
    return replacementCommissioner(game.year);
  }

  if (nextState.activeProposals.length === 0 && RNG.event() < 0.3) {
    const generated = generateRuleProposal(nextState, game);
    if (generated) {
      nextState.activeProposals = [generated];
    }
  }

  return nextState;
}
