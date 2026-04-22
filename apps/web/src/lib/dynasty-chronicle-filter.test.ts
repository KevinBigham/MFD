import { describe, expect, it } from 'vitest';
import type { ChronicleEvent, ChronicleEventType } from './dynasty-chronicle';
import {
  countEventsByType,
  createDefaultActiveTypes,
  filterChronicleEvents,
  isAllTypesActive,
  listChronicleEventTypes,
  toggleActiveType,
} from './dynasty-chronicle-filter';

function fixtureEvents(): ChronicleEvent[] {
  return [
    { id: 'c1', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4' },
    { id: 'c2', type: 'championship_win', year: 2030, teamAbbr: 'CHI', record: '12-5' },
    { id: 'h1', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB' },
    {
      id: 'p1',
      type: 'playoff_round',
      year: 2032,
      round: 'super_bowl',
      outcome: 'win',
      headline: 'Crown',
      finalScore: '27-20',
    },
    { id: 's1', type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6', playoffFinish: 'conference' },
    { id: 'ch1', type: 'coach_championship', year: 2032, coachName: 'Terry Vale' },
    { id: 'ch2', type: 'coach_hire', year: 2030, coachName: 'Terry Vale' },
    { id: 'ch3', type: 'coach_retire', year: 2033, coachName: 'Terry Vale' },
    { id: 'sb1', type: 'scrapbook_note', year: 2031, headline: 'Crowd goes wild' },
  ];
}

describe('listChronicleEventTypes', () => {
  it('returns all 8 chronicle event types', () => {
    const types = listChronicleEventTypes();
    expect(types).toHaveLength(8);
    expect(new Set(types)).toEqual(
      new Set<ChronicleEventType>([
        'championship_win',
        'hof_induction',
        'playoff_round',
        'season_end',
        'coach_championship',
        'coach_hire',
        'coach_retire',
        'scrapbook_note',
      ]),
    );
  });
});

describe('countEventsByType', () => {
  it('tallies events by type', () => {
    const counts = countEventsByType(fixtureEvents());
    expect(counts.championship_win).toBe(2);
    expect(counts.hof_induction).toBe(1);
    expect(counts.playoff_round).toBe(1);
    expect(counts.season_end).toBe(1);
    expect(counts.coach_championship).toBe(1);
    expect(counts.coach_hire).toBe(1);
    expect(counts.coach_retire).toBe(1);
    expect(counts.scrapbook_note).toBe(1);
  });

  it('zero-fills types with no events', () => {
    const counts = countEventsByType([]);
    for (const type of listChronicleEventTypes()) {
      expect(counts[type]).toBe(0);
    }
  });
});

describe('filterChronicleEvents', () => {
  it('returns only events whose type is active', () => {
    const active = new Set<ChronicleEventType>(['championship_win', 'hof_induction']);
    const filtered = filterChronicleEvents(fixtureEvents(), active);
    expect(filtered).toHaveLength(3);
    expect(filtered.every((event) => active.has(event.type))).toBe(true);
  });

  it('returns an empty array when no types are active', () => {
    const filtered = filterChronicleEvents(fixtureEvents(), new Set());
    expect(filtered).toEqual([]);
  });

  it('preserves input order', () => {
    const active = new Set<ChronicleEventType>(['championship_win', 'coach_hire']);
    const events = fixtureEvents();
    const filtered = filterChronicleEvents(events, active);
    const filteredIds = filtered.map((event) => event.id);
    const expectedOrder = events
      .filter((event) => active.has(event.type))
      .map((event) => event.id);
    expect(filteredIds).toEqual(expectedOrder);
  });
});

describe('createDefaultActiveTypes', () => {
  it('returns a set containing every chronicle event type', () => {
    const defaults = createDefaultActiveTypes();
    expect(defaults.size).toBe(8);
    for (const type of listChronicleEventTypes()) {
      expect(defaults.has(type)).toBe(true);
    }
  });

  it('returns an independent set each call', () => {
    const first = createDefaultActiveTypes();
    first.delete('championship_win');
    const second = createDefaultActiveTypes();
    expect(second.has('championship_win')).toBe(true);
  });
});

describe('toggleActiveType', () => {
  it('adds a type that is missing', () => {
    const next = toggleActiveType(new Set(['championship_win']), 'hof_induction');
    expect(next.has('championship_win')).toBe(true);
    expect(next.has('hof_induction')).toBe(true);
  });

  it('removes a type that is present', () => {
    const next = toggleActiveType(
      new Set<ChronicleEventType>(['championship_win', 'hof_induction']),
      'hof_induction',
    );
    expect(next.has('hof_induction')).toBe(false);
    expect(next.has('championship_win')).toBe(true);
  });

  it('does not mutate the input set', () => {
    const input = new Set<ChronicleEventType>(['championship_win']);
    toggleActiveType(input, 'championship_win');
    expect(input.has('championship_win')).toBe(true);
  });
});

describe('isAllTypesActive', () => {
  it('returns true for the default set', () => {
    expect(isAllTypesActive(createDefaultActiveTypes())).toBe(true);
  });

  it('returns false when any type is missing', () => {
    const partial = createDefaultActiveTypes();
    partial.delete('scrapbook_note');
    expect(isAllTypesActive(partial)).toBe(false);
  });

  it('returns false for an empty set', () => {
    expect(isAllTypesActive(new Set())).toBe(false);
  });
});
