/**
 * MFD Difficulty Settings
 *
 * Four difficulty tiers that modify trade fairness, injury rates,
 * owner patience, and starting resources.
 */

import type { DifficultyLevel } from '../types';

export interface DifficultyConfig {
  name: string;
  desc: string;
  tradeMod: number;
  injMod: number;
  ownerMod: number;
  clutchSwing: number;
  moraleMod: number;
  aiBidMod: number;
  staffBudget: number;
  startCash: number;
  foBudget: number;
}

export const DIFF_SETTINGS: Record<DifficultyLevel, DifficultyConfig> = {
  rookie: {
    name: 'Rookie',
    desc: 'Forgiving trades, fewer injuries, patient owner. Learn the ropes.',
    tradeMod: 1.15,
    injMod: 0.6,
    ownerMod: 0.7,
    clutchSwing: 0.3,
    moraleMod: 0.7,
    aiBidMod: 0.75,
    staffBudget: 28,
    startCash: 100,
    foBudget: 30,
  },
  pro: {
    name: 'Pro',
    desc: 'Standard simulation. Fair trades, normal injury rates, balanced AI.',
    tradeMod: 1.0,
    injMod: 1.0,
    ownerMod: 1.0,
    clutchSwing: 0.5,
    moraleMod: 1.0,
    aiBidMod: 1.0,
    staffBudget: 23,
    startCash: 75,
    foBudget: 25,
  },
  allpro: {
    name: 'All-Pro',
    desc: 'AI drives harder bargains, injuries pile up, owner expects results.',
    tradeMod: 1.2,
    injMod: 1.25,
    ownerMod: 1.3,
    clutchSwing: 0.65,
    moraleMod: 1.2,
    aiBidMod: 1.15,
    staffBudget: 19,
    startCash: 50,
    foBudget: 22,
  },
  legend: {
    name: 'Legend',
    desc: 'Ruthless AI, devastating injuries, owner on a hair trigger. Glory or bust.',
    tradeMod: 1.45,
    injMod: 1.5,
    ownerMod: 1.6,
    clutchSwing: 0.8,
    moraleMod: 1.4,
    aiBidMod: 1.3,
    staffBudget: 16,
    startCash: 25,
    foBudget: 20,
  },
};

export const SAVE_VERSION = 4;
