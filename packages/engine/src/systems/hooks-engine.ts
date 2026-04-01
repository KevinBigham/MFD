/**
 * MFD Hooks Engine
 *
 * Generates narrative tension hooks from game state.
 * Returns top-3 hooks prioritized with repetition avoidance.
 */

import { RNG } from '../rng';
import type { Team, Player, SeasonContext } from '../types';

// ── Hook Types ─────────────────────────────────────────

export type HookCategory =
  | 'contract' | 'rivalry' | 'playoff' | 'dev'
  | 'owner' | 'injury' | 'draft' | 'streak';

export interface Hook {
  cat: HookCategory;
  icon: string;
  text: string;
  priority: number;
}

// ── Minimal State Shape ────────────────────────────────

export interface HookState {
  my: Team;
  myId: string;
  teams: readonly Team[];
  season: SeasonContext;
  sched?: readonly ScheduleEntry[];
}

interface ScheduleEntry {
  home: string;
  away: string;
  week: number;
  played: boolean;
}

// ── Hook Generators ────────────────────────────────────

type HookGen = (state: HookState) => Hook | null;

const generators: HookGen[] = [
  // Contract pressure
  (s) => {
    const holdouts = s.my.roster.filter((p) => p.holdout && p.ovr >= 70);
    if (holdouts.length > 0) {
      const h = holdouts[0]!;
      return { cat: 'contract', icon: 'file-text', text: `${h.name}'s holdout deadline is approaching. ${h.ovr} OVR — can you afford to lose him?`, priority: 95 };
    }
    const expiring = s.my.roster.filter((p) => p.contract && p.contract.years <= 1 && p.ovr >= 78 && p.isStarter);
    if (expiring.length > 0) {
      const e = expiring[0]!;
      return { cat: 'contract', icon: 'file-text', text: `${e.name} (${e.pos}, ${e.ovr} OVR) enters final contract year. Extension talks loom.`, priority: 70 };
    }
    return null;
  },

  // Rivalry
  (s) => {
    if (!s.sched || !s.season) return null;
    const upcoming = s.sched
      .filter((g) => !g.played && g.week > s.season.week && (g.home === s.myId || g.away === s.myId))
      .slice(0, 4);

    for (const g of upcoming) {
      const oppId = g.home === s.myId ? g.away : g.home;
      const opp = s.teams.find((t) => t.id === oppId);
      if (!opp) continue;
      const riv = s.my.rivals?.[oppId];
      if (riv && riv.heat >= 8) {
        return { cat: 'rivalry', icon: 'flame', text: `Blood Feud with ${opp.name} — Week ${g.week}. The locker room is already circling the date.`, priority: 90 };
      }
      if (riv && riv.heat >= 5) {
        return { cat: 'rivalry', icon: 'swords', text: `Rivalry clash vs ${opp.name} coming in Week ${g.week}.`, priority: 75 };
      }
    }
    return null;
  },

  // Playoff race
  (s) => {
    if (s.season.phase !== 'regular_season') return null;
    const gp = s.my.wins + s.my.losses;
    if (gp < 6) return null;
    const wp = s.my.wins / gp;
    if (wp >= 0.55 && wp <= 0.65) {
      return { cat: 'playoff', icon: 'trophy', text: `Bubble team — ${s.my.wins}-${s.my.losses}. Every game matters now.`, priority: 80 };
    }
    if (s.my.wins >= 10 && s.season.week >= 14) {
      return { cat: 'playoff', icon: 'trophy', text: 'Playoff berth within reach. Time to clinch.', priority: 85 };
    }
    return null;
  },

  // Player development
  (s) => {
    const breakout = s.my.roster.find((p) => p.age <= 24 && p.pot >= 80 && p.ovr >= 72 && p.ovr < p.pot);
    if (breakout) {
      return { cat: 'dev', icon: 'trending-up', text: `${breakout.name} (${breakout.age}, ${breakout.ovr} OVR) is developing fast. Potential: ${breakout.pot}.`, priority: 65 };
    }
    return null;
  },

  // Owner mood
  (s) => {
    if (s.my.ownerMood < 35) {
      return { cat: 'owner', icon: 'alert-triangle', text: 'Owner mood is dangerously low. Your job is on the line.', priority: 92 };
    }
    if (s.my.ownerPatience80 < 40) {
      return { cat: 'owner', icon: 'clock', text: 'Owner patience is running thin. Results needed soon.', priority: 82 };
    }
    return null;
  },

  // Injuries
  (s) => {
    const injured = s.my.roster.filter((p) => p.injury && p.isStarter && p.ovr >= 75);
    if (injured.length >= 2) {
      return { cat: 'injury', icon: 'heart-pulse', text: `${injured.length} starters on the injury report. Depth will be tested.`, priority: 72 };
    }
    if (injured.length === 1) {
      const p = injured[0]!;
      return { cat: 'injury', icon: 'heart-pulse', text: `${p.name} (${p.pos}, ${p.ovr} OVR) dealing with ${p.injury!.type}. Next man up.`, priority: 60 };
    }
    return null;
  },

  // Draft picks
  (s) => {
    if (s.season.phase !== 'offseason' && s.season.phase !== 'draft') return null;
    const picks = s.my.draftPicks.filter((dp) => dp.round === 1);
    if (picks.length >= 2) {
      return { cat: 'draft', icon: 'list-ordered', text: `${picks.length} first-round picks. The draft is your stage.`, priority: 75 };
    }
    return null;
  },

  // Streaks
  (s) => {
    const streak = s.my.streak ?? 0;
    if (streak >= 4) {
      return { cat: 'streak', icon: 'flame', text: `${streak}-game win streak. The team is rolling.`, priority: 68 };
    }
    if (streak <= -4) {
      return { cat: 'streak', icon: 'alert-circle', text: `${Math.abs(streak)}-game losing streak. Something has to change.`, priority: 78 };
    }
    return null;
  },
];

// ── Hook Generation ────────────────────────────────────

export function generateHooks(state: HookState, lastShownCats: readonly string[] = []): Hook[] {
  const hooks: Hook[] = [];

  for (const gen of generators) {
    try {
      const hook = gen(state);
      if (hook) {
        if (lastShownCats.includes(hook.cat)) hook.priority -= 20;
        hooks.push(hook);
      }
    } catch { /* skip broken generator */ }
  }

  hooks.sort((a, b) => b.priority - a.priority);
  return hooks.slice(0, 3);
}

// ── Nemesis Tracking ───────────────────────────────────

export interface Nemesis {
  oppId: string;
  oppName: string;
  reason: string;
  detail: string;
  setAt: number;
}

export function checkNemesisTrigger(event: {
  type: 'playoff_loss' | 'injury' | 'fa_steal';
  oppId: string;
  oppName: string;
  detail?: string;
}): Nemesis | null {
  if (!event?.oppId) return null;

  const reason = event.type === 'playoff_loss' ? 'Eliminated you from the playoffs'
    : event.type === 'injury' ? 'Injured your star player'
    : event.type === 'fa_steal' ? 'Stole your free agent target'
    : 'Wronged your franchise';

  return {
    oppId: event.oppId,
    oppName: event.oppName,
    reason,
    detail: event.detail ?? '',
    setAt: Date.now(),
  };
}

export function checkNemesisResolved(
  nemesis: Nemesis,
  oppId: string,
  isConsequentialWin: boolean,
): boolean {
  return nemesis.oppId === oppId && isConsequentialWin;
}

// ── Draft Crush (3-Year Prospect Preview) ──────────────

export interface DraftCrush {
  name: string;
  pos: string;
  state: string;
  draftYear: number;
  yearN3: string;
  yearN2: string;
  yearN1: string;
}

const FIRST_NAMES = ['Marcus', 'Jaylen', 'DeVon', 'Caleb', 'Trey', 'Bryce', 'Jalen', 'Malik', 'Chase', 'Trevor'];
const LAST_NAMES = ['Williams', 'Johnson', 'Carter', 'Thompson', 'Davis', 'Mitchell', 'Robinson', 'Jackson', 'Harris', 'Clark'];
const PROSPECT_POS = ['QB', 'WR', 'EDGE', 'CB', 'OT'];
const STATES = ['Texas', 'Georgia', 'Florida', 'California', 'Alabama', 'Ohio', 'Louisiana', 'Tennessee'];

export function generateDraftCrush(year: number): DraftCrush | null {
  if (RNG.draft() > 0.33) return null;

  const first = FIRST_NAMES[Math.floor(RNG.draft() * FIRST_NAMES.length)] ?? 'Marcus';
  const last = LAST_NAMES[Math.floor(RNG.draft() * LAST_NAMES.length)] ?? 'Williams';
  const pos = PROSPECT_POS[Math.floor(RNG.draft() * PROSPECT_POS.length)] ?? 'QB';
  const state = STATES[Math.floor(RNG.draft() * STATES.length)] ?? 'Texas';
  const name = `${first} ${last}`;

  return {
    name, pos, state,
    draftYear: year + 3,
    yearN3: `MFSN PROSPECT WATCH: ${name}, a HS junior from ${state}, turned heads at a showcase. Remember this name.`,
    yearN2: `${name} committed to a powerhouse program. Scouts calling him a potential franchise-changer at ${pos}.`,
    yearN1: `${name} declared for the draft. Expected top-5 pick. Multiple teams reportedly adjusting their strategy.`,
  };
}
