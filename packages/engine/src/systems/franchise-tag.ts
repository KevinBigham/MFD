/**
 * MFD Franchise Tag System
 *
 * Tag types, salary calculation, and application with
 * personality-driven player reactions.
 */

import { makeContract } from './contracts';
import { v36CapHit } from './contract-helpers';
import { getActiveRule } from './league-rules';
import { getPersonality } from './personality';
import { cl, playerDisplayName } from '../utils';
import type { Contract, GameState, Player, Team, Position, FranchiseTagType, FranchiseTagState } from '../types';

// ── Tag Type Definitions ───────────────────────────────

export interface FranchiseTagDef {
  id: FranchiseTagType;
  label: string;
  desc: string;
  salaryMult: number;
}

export const FRANCHISE_TAG_TYPES: readonly FranchiseTagDef[] = [
  {
    id: 'exclusive',
    label: 'Exclusive',
    desc: 'Top-5 salary, cannot negotiate with others',
    salaryMult: 1.2,
  },
  {
    id: 'non-exclusive',
    label: 'Non-Exclusive',
    desc: 'Top-5 avg, others can make offers (you match or get 2 1sts)',
    salaryMult: 1.1,
  },
  {
    id: 'transition',
    label: 'Transition',
    desc: 'Top-10 avg, right of first refusal, no comp picks',
    salaryMult: 0.9,
  },
] as const;

// ── Position Multipliers ───────────────────────────────

const TAG_POS_MULT: Record<Position, number> = {
  QB: 2.8, WR: 1.5, RB: 1.2, TE: 1.2, OL: 1.3,
  DL: 1.5, LB: 1.3, CB: 1.5, S: 1.2, K: 0.6, P: 0.5,
};

// ── Salary Calculation ─────────────────────────────────

export function getFranchiseTagSalary(pos: Position, teams: readonly Team[]): number {
  const salaries: number[] = [];

  for (const t of teams) {
    for (const p of t.roster) {
      if (p.pos === pos && p.contract) {
        salaries.push(v36CapHit(p.contract));
      }
    }
  }

  salaries.sort((a, b) => b - a);
  const top5 = salaries.slice(0, 5);

  const avg = top5.length > 0
    ? top5.reduce((s, v) => s + v, 0) / top5.length
    : 0;

  const floor = (TAG_POS_MULT[pos] ?? 1) * 8;
  return Math.round(Math.max(avg, floor) * 100) / 100;
}

// ── Player Reaction ────────────────────────────────────

export type TagReaction = 'happy' | 'neutral' | 'unhappy' | 'holdout';

function getTagReaction(player: Player): TagReaction {
  const pers = getPersonality(player);

  if (pers.loyalty >= 8 && pers.greed <= 4) return 'happy';
  if (pers.greed >= 8 && pers.ambition >= 7) return 'holdout';
  if (pers.greed >= 6 || player.age >= 30) return 'unhappy';
  return 'neutral';
}

// ── Tag Application ────────────────────────────────────

export interface TagResult {
  ok: boolean;
  salary: number;
  reaction: TagReaction;
  msg: string;
}

export function applyFranchiseTag(
  team: Team,
  player: Player,
  teams: readonly Team[],
  year: number,
  tagType: FranchiseTagType = 'non-exclusive',
  gameState?: GameState | null,
): TagResult {
  const currentTags = team.franchiseTags ?? (team.franchiseTag973 ? [team.franchiseTag973] : []);
  const tagLimit = gameState?.leagueRules ? Number(getActiveRule(gameState.leagueRules, 'franchise_tag_limit', year)) : 1;
  const allowedTypes = gameState?.leagueRules
    ? getActiveRule(gameState.leagueRules, 'tag_types_allowed', year) as FranchiseTagType[]
    : FRANCHISE_TAG_TYPES.map((entry) => entry.id);

  if (currentTags.length >= tagLimit) {
    return { ok: false, salary: 0, reaction: 'neutral', msg: 'Already used franchise tag this year.' };
  }
  if (!allowedTypes.includes(tagType)) {
    return { ok: false, salary: 0, reaction: 'neutral', msg: 'That tag type is not allowed under current league rules.' };
  }

  const tagDef = FRANCHISE_TAG_TYPES.find((t) => t.id === tagType);
  if (!tagDef) {
    return { ok: false, salary: 0, reaction: 'neutral', msg: 'Invalid tag type.' };
  }

  const baseSal = getFranchiseTagSalary(player.pos, teams);
  const tagSal = Math.round(baseSal * tagDef.salaryMult * 100) / 100;
  const reaction = getTagReaction(player);

  player.contract = makeContract(tagSal, 1, 0, tagSal, player.id, team.id);
  player.contract.franchiseTag = tagType;

  const tagState: FranchiseTagState = {
    playerId: player.id,
    playerName: playerDisplayName(player),
    pos: player.pos,
    salary: tagSal,
    year,
    reaction,
  };
  team.franchiseTags = [...currentTags, tagState];
  team.franchiseTag973 = team.franchiseTags[0] ?? tagState;

  if (reaction === 'holdout') {
    player.holdout = true;
    player.chemistry = cl((player.chemistry ?? 60) - 10, 0, 100);
    player.morale = cl((player.morale ?? 60) - 10, 0, 100);
  } else if (reaction === 'unhappy') {
    player.morale = cl((player.morale ?? 60) - 5, 0, 100);
  }

  return { ok: true, salary: tagSal, reaction, msg: `${player.name} tagged (${tagDef.label}). Reaction: ${reaction}.` };
}
