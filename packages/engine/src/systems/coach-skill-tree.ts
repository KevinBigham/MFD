/**
 * MFD Coach Skill Tree System
 *
 * Three trees (Strategist, Motivator, Disciplinarian) with
 * 3 branches each and 3 tiers per branch.
 */

import type { CoachSkillSelection } from '../types';

// ── Tree Data Structures ───────────────────────────────

export interface SkillTier {
  level: number;
  label: string;
  bonus: Record<string, number>;
  desc: string;
}

export interface SkillBranch {
  id: string;
  name: string;
  icon: string;
  tiers: readonly SkillTier[];
}

export interface SkillTree {
  branches: readonly SkillBranch[];
}

// ── Tree Definitions ───────────────────────────────────

export const SKILL_TREES: Record<string, SkillTree> = {
  Strategist: {
    branches: [
      { id: 'air_raid', name: 'Air Raid', icon: 'plane', tiers: [
        { level: 3, label: 'Quick Release', bonus: { passMod: 2 }, desc: '+2% pass efficiency' },
        { level: 6, label: 'Spread Master', bonus: { passMod: 3 }, desc: '+3% pass efficiency' },
        { level: 9, label: 'Aerial Dominance', bonus: { passMod: 5, rzBoost: 3 }, desc: '+5% pass, +3% red zone' },
      ]},
      { id: 'ground_pound', name: 'Ground & Pound', icon: 'footprints', tiers: [
        { level: 3, label: 'Power Run', bonus: { rushMod: 2 }, desc: '+2% rush efficiency' },
        { level: 6, label: 'Clock Killer', bonus: { rushMod: 3, drivesBonus: 1 }, desc: '+3% rush, +1 drive/game' },
        { level: 9, label: 'Steamroller', bonus: { rushMod: 5, stallReduction: 0.03 }, desc: '+5% rush, fewer stalls' },
      ]},
      { id: 'analytics', name: 'Analytics King', icon: 'bar-chart-2', tiers: [
        { level: 3, label: '4th Down Guru', bonus: { stallReduction: 0.02 }, desc: 'Better 4th down conversion' },
        { level: 6, label: 'Matchup Hunter', bonus: { counterBoost: 2 }, desc: '+2 scheme counter bonus' },
        { level: 9, label: 'Moneyball', bonus: { stallReduction: 0.04, counterBoost: 3 }, desc: 'Peak analytics edge' },
      ]},
    ],
  },
  Motivator: {
    branches: [
      { id: 'player_dev', name: 'Player Developer', icon: 'trending-up', tiers: [
        { level: 3, label: 'Growth Mindset', bonus: { devBoost: 1 }, desc: '+1 OVR growth/season' },
        { level: 6, label: 'Star Maker', bonus: { devBoost: 2 }, desc: '+2 OVR growth/season' },
        { level: 9, label: 'Legend Factory', bonus: { devBoost: 3, breakoutBoost: 15 }, desc: '+3 OVR, +15% breakout chance' },
      ]},
      { id: 'morale_king', name: 'Morale King', icon: 'heart', tiers: [
        { level: 3, label: 'Locker Room', bonus: { moraleMod: 0.8 }, desc: '-20% morale drain' },
        { level: 6, label: 'Unity', bonus: { moraleMod: 0.6, chemBoost: 5 }, desc: '-40% drain, +5 chemistry' },
        { level: 9, label: 'Brotherhood', bonus: { moraleMod: 0.4, chemBoost: 10 }, desc: '-60% drain, +10 chem' },
      ]},
      { id: 'clutch_coach', name: 'Clutch Coach', icon: 'target', tiers: [
        { level: 3, label: 'Ice Water', bonus: { clutchBoost: 3 }, desc: '+3 clutch rating boost' },
        { level: 6, label: 'Big Game', bonus: { clutchBoost: 5, playoffMod: 1.05 }, desc: '+5 clutch, +5% playoffs' },
        { level: 9, label: 'Mr. February', bonus: { clutchBoost: 8, playoffMod: 1.10 }, desc: '+8 clutch, +10% playoffs' },
      ]},
    ],
  },
  Disciplinarian: {
    branches: [
      { id: 'iron_d', name: 'Iron Defense', icon: 'shield', tiers: [
        { level: 3, label: 'Lockdown', bonus: { defMod: 2 }, desc: '+2% defensive efficiency' },
        { level: 6, label: 'Fortress', bonus: { defMod: 3, pressureBoost: 0.02 }, desc: '+3% def, +2% pressure' },
        { level: 9, label: 'Shutdown', bonus: { defMod: 5, intBoost: 0.02 }, desc: '+5% def, +2% INT rate' },
      ]},
      { id: 'special_teams', name: 'Special Teams Ace', icon: 'zap', tiers: [
        { level: 3, label: 'Coverage', bonus: { stMod: 2 }, desc: '+2% ST efficiency' },
        { level: 6, label: 'Return Game', bonus: { stMod: 3, fieldPosMod: 3 }, desc: '+3% ST, +3 field position' },
        { level: 9, label: 'Hidden Yards', bonus: { stMod: 5, fieldPosMod: 5 }, desc: '+5% ST, +5 field position' },
      ]},
      { id: 'conditioning', name: 'Conditioning', icon: 'dumbbell', tiers: [
        { level: 3, label: 'Iron Man', bonus: { injMod: 0.85 }, desc: '-15% injury-report chance' },
        { level: 6, label: 'Recovery', bonus: { injMod: 0.75, recoveryBoost: 1 }, desc: '-25% injury-report chance, +1wk recovery' },
        { level: 9, label: 'Machine', bonus: { injMod: 0.60, recoveryBoost: 2 }, desc: '-40% injury-report chance, +2wk recovery' },
      ]},
    ],
  },
};

// ── Archetype→Tree Mapping ─────────────────────────────

const ARCH_TO_TREE: Record<string, string> = {
  Strategist: 'Strategist', 'QB Guru': 'Strategist', 'Air Attack': 'Strategist', Innovator: 'Strategist',
  Motivator: 'Motivator', "Player's Coach": 'Motivator', 'DB Whisperer': 'Motivator',
  Disciplinarian: 'Disciplinarian', 'Run Stuffer': 'Disciplinarian', 'Blitz Master': 'Disciplinarian',
  'Run Coordinator': 'Disciplinarian',
};

export function getTreeKey(archetype: string): string {
  return ARCH_TO_TREE[archetype] ?? 'Disciplinarian';
}

// ── Active Bonus Calculation ───────────────────────────

export function getActiveBonus(
  selections: Record<string, CoachSkillSelection>,
  coachId: string,
  coachLevel: number,
  archetype: string,
): Record<string, number> {
  const sel = selections[coachId];
  if (!sel) return {};

  const treeKey = getTreeKey(archetype ?? sel.archForLookup ?? 'Disciplinarian');
  const tree = SKILL_TREES[treeKey];
  if (!tree) return {};

  const branch = tree.branches.find((b) => b.id === sel.branch);
  if (!branch) return {};

  const bonus: Record<string, number> = {};
  for (let i = 0; i < branch.tiers.length; i++) {
    const tier = branch.tiers[i]!;
    if (coachLevel >= tier.level && sel.tier > i) {
      for (const [k, v] of Object.entries(tier.bonus)) {
        bonus[k] = (bonus[k] ?? 0) + v;
      }
    }
  }

  return bonus;
}
