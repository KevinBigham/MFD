/**
 * MFD Owner Personality Events
 *
 * Random archetype-triggered events that affect team morale
 * and owner mood during the season.
 */

import { RNG } from '../rng';
import { cl } from '../utils';
import type { OwnerArchetypeId, Team } from '../types';

// ── Event Definitions ──────────────────────────────────

export interface OwnerPersonalityEvent {
  archetypeId: OwnerArchetypeId;
  label: string;
  desc: string;
  moodDelta: number;
  moraleDelta: number;
}

const PERSONALITY_EVENTS: readonly OwnerPersonalityEvent[] = [
  { archetypeId: 'win_now', label: 'Owner demands trades', desc: 'Owner publicly pushes for blockbuster moves.', moodDelta: -5, moraleDelta: -3 },
  { archetypeId: 'win_now', label: 'Owner praises effort', desc: 'Owner lauds team hustle after a hard-fought win.', moodDelta: 5, moraleDelta: 3 },
  { archetypeId: 'patient_builder', label: 'Owner extends coach', desc: 'Owner announces long-term commitment to coaching staff.', moodDelta: 3, moraleDelta: 5 },
  { archetypeId: 'patient_builder', label: 'Owner invests in facilities', desc: 'Owner approves new training facility upgrades.', moodDelta: 2, moraleDelta: 4 },
  { archetypeId: 'profit_first', label: 'Owner cuts budget', desc: 'Owner tightens team budget, reducing scouting resources.', moodDelta: -3, moraleDelta: -4 },
  { archetypeId: 'profit_first', label: 'Revenue boost', desc: 'Strong ticket sales put owner in a generous mood.', moodDelta: 5, moraleDelta: 2 },
  { archetypeId: 'fan_favorite', label: 'Owner hosts fan event', desc: 'Owner organizes community event, boosting team image.', moodDelta: 3, moraleDelta: 3 },
  { archetypeId: 'fan_favorite', label: 'Fan backlash', desc: 'Fans boo poor performance; owner feels the heat.', moodDelta: -6, moraleDelta: -5 },
  { archetypeId: 'legacy_builder', label: 'Owner honors franchise legend', desc: 'Owner dedicates ceremony to franchise history.', moodDelta: 4, moraleDelta: 3 },
  { archetypeId: 'legacy_builder', label: 'Legacy pressure', desc: 'Owner compares current team unfavorably to past dynasties.', moodDelta: -4, moraleDelta: -3 },
] as const;

// ── Event Check ────────────────────────────────────────

export interface OwnerEventResult {
  triggered: boolean;
  event: OwnerPersonalityEvent | null;
}

export function checkOwnerPersonality(
  archetypeId: OwnerArchetypeId,
  team: Team,
): OwnerEventResult {
  if (RNG.ai() > 0.4) {
    return { triggered: false, event: null };
  }

  const candidates = PERSONALITY_EVENTS.filter((e) => e.archetypeId === archetypeId);
  if (candidates.length === 0) {
    return { triggered: false, event: null };
  }

  const event = candidates[Math.floor(RNG.ai() * candidates.length)] ?? null;
  if (!event) return { triggered: false, event: null };

  team.ownerMood = cl((team.ownerMood ?? 60) + event.moodDelta, 5, 99);

  for (const p of team.roster) {
    p.morale = cl((p.morale ?? 60) + event.moraleDelta, 0, 100);
  }

  return { triggered: true, event };
}
