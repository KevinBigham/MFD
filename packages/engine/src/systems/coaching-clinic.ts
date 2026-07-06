/**
 * MFD Coaching Clinic System
 *
 * XP-based coaching skill tree with 5 tracks and
 * unlockable perks that modify game simulation.
 */

import type { ClinicState } from '../types';

// ── Track & Perk Definitions ───────────────────────────

export interface ClinicPerk {
  id: string;
  name: string;
  desc: string;
  xpReq: number;
  fx: Record<string, number | boolean>;
}

export interface ClinicTrack {
  id: string;
  label: string;
  desc: string;
  perks: readonly ClinicPerk[];
}

export const CLINIC_TRACKS: readonly ClinicTrack[] = [
  {
    id: 'offense', label: 'Offensive Mind', desc: 'Gameplan diversity',
    perks: [
      { id: 'off1', name: 'Play Variety', desc: '+2% scoring on non-balanced OFF plans', xpReq: 30, fx: { scoringBoost: 0.02 } },
      { id: 'off2', name: 'Audible Master', desc: '+3% halftime adjustment effectiveness', xpReq: 80, fx: { halftimeBoost: 0.03 } },
    ],
  },
  {
    id: 'defense', label: 'Defensive Architect', desc: 'Defensive mastery',
    perks: [
      { id: 'def1', name: 'Pressure Schemes', desc: '+2% sack rate on non-balanced DEF plans', xpReq: 30, fx: { sackBoost: 0.02 } },
      { id: 'def2', name: 'Situational D', desc: '+3% stop rate in clutch drives', xpReq: 80, fx: { clutchDefBoost: 0.03 } },
    ],
  },
  {
    id: 'analytics', label: 'Analytics', desc: 'Scouting & intelligence',
    perks: [
      { id: 'anl1', name: 'Film Junkie', desc: '+3 confidence on dossier scouting', xpReq: 30, fx: { scoutConfBonus: 3 } },
      { id: 'anl2', name: 'Data Driven', desc: 'Scout report shows counter suggestions', xpReq: 80, fx: { counterSuggest: true } },
    ],
  },
  {
    id: 'leadership', label: 'Leadership', desc: 'Media & locker room',
    perks: [
      { id: 'ldr1', name: 'Media Savvy', desc: '+1 credibility from all press answers', xpReq: 30, fx: { credBonus: 1 } },
      { id: 'ldr2', name: 'Locker Room Voice', desc: '+1 morale from captain moments', xpReq: 80, fx: { captainMoraleBonus: 1 } },
    ],
  },
  {
    id: 'development', label: 'Player Dev', desc: 'Growth & recovery',
    perks: [
      { id: 'dev1', name: 'Practice Guru', desc: '+15% dev camp progression chance', xpReq: 30, fx: { devBoost: 0.15 } },
      { id: 'dev2', name: 'Iron Man', desc: '-10% injury-report chance from Full Pads', xpReq: 80, fx: { padsInjReduction: 0.10 } },
    ],
  },
] as const;

// ── Action→Track Mapping ───────────────────────────────

const ACTION_TRACK: Record<string, string> = {
  offense: 'offense', defense: 'defense', analytics: 'analytics',
  leadership: 'leadership', development: 'development',
  gameplan_change: 'offense', halftime_pick: 'offense',
  def_plan_change: 'defense',
  scout_practice: 'analytics', dossier_scout: 'analytics', prospect_scout: 'analytics',
  press_answer: 'leadership', captain_moment: 'leadership',
  dev_camp: 'development', recovery: 'development', full_pads: 'development',
};

// ── XP & Perk Methods ──────────────────────────────────

export function earnXP(clinic: ClinicState, action: string, amount = 5): ClinicState {
  const track = ACTION_TRACK[action];
  if (!track) return clinic;

  const xp = { ...clinic.xp };
  xp[track] = (xp[track] ?? 0) + amount;

  const perks = [...clinic.perks];
  const trackDef = CLINIC_TRACKS.find((t) => t.id === track);
  if (trackDef) {
    for (const perk of trackDef.perks) {
      if (!perks.includes(perk.id) && (xp[track] ?? 0) >= perk.xpReq) {
        perks.push(perk.id);
      }
    }
  }

  return { xp, perks };
}

export function hasPerk(clinic: ClinicState, perkId: string): boolean {
  return clinic.perks.includes(perkId);
}

export function getTrackXP(clinic: ClinicState, trackId: string): number {
  return clinic.xp[trackId] ?? 0;
}

// ── Active Modifier Aggregation ────────────────────────

export interface ClinicMods {
  scoringBoost: number;
  halftimeBoost: number;
  sackBoost: number;
  clutchDefBoost: number;
  scoutConfBonus: number;
  counterSuggest: boolean;
  credBonus: number;
  captainMoraleBonus: number;
  devBoost: number;
  padsInjReduction: number;
}

export function getClinicMods(clinic: ClinicState): ClinicMods {
  const mods: ClinicMods = {
    scoringBoost: 0, halftimeBoost: 0, sackBoost: 0, clutchDefBoost: 0,
    scoutConfBonus: 0, counterSuggest: false, credBonus: 0, captainMoraleBonus: 0,
    devBoost: 0, padsInjReduction: 0,
  };

  if (!clinic.perks) return mods;

  if (clinic.perks.includes('off1')) mods.scoringBoost = 0.02;
  if (clinic.perks.includes('off2')) mods.halftimeBoost = 0.03;
  if (clinic.perks.includes('def1')) mods.sackBoost = 0.02;
  if (clinic.perks.includes('def2')) mods.clutchDefBoost = 0.03;
  if (clinic.perks.includes('anl1')) mods.scoutConfBonus = 3;
  if (clinic.perks.includes('anl2')) mods.counterSuggest = true;
  if (clinic.perks.includes('ldr1')) mods.credBonus = 1;
  if (clinic.perks.includes('ldr2')) mods.captainMoraleBonus = 1;
  if (clinic.perks.includes('dev1')) mods.devBoost = 0.15;
  if (clinic.perks.includes('dev2')) mods.padsInjReduction = 0.10;

  return mods;
}
