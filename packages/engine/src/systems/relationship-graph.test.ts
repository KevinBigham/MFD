import { describe, it, expect } from 'vitest';
import {
  addEdge,
  edgeId,
  findPath,
  getEdgesFor,
  pruneDeadEdges,
  type RelationshipEdge,
} from './relationship-graph';

describe('relationship-graph addEdge', () => {
  it('appends a new edge with a deterministic id and leaves the input array untouched', () => {
    const edges: RelationshipEdge[] = [];
    const next = addEdge(edges, {
      fromId: 'coach-a',
      toId: 'coach-b',
      type: 'mentor',
      year: 2020,
      strength: 50,
    });
    expect(edges).toHaveLength(0);
    expect(next).toHaveLength(1);
    expect(next[0]!.id).toBe('coach-a:coach-b:mentor:2020');
    expect(edgeId({ fromId: 'coach-a', toId: 'coach-b', type: 'mentor', year: 2020, strength: 99 }))
      .toBe('coach-a:coach-b:mentor:2020');
  });

  it('dedupes when an edge with the same id already exists', () => {
    const first = addEdge([], {
      fromId: 'a',
      toId: 'b',
      type: 'coach_tree',
      year: 2025,
      strength: 40,
    });
    const second = addEdge(first, {
      fromId: 'a',
      toId: 'b',
      type: 'coach_tree',
      year: 2025,
      strength: 99,
    });
    expect(second).toBe(first); // no-op returns reference
    expect(second).toHaveLength(1);
    expect(second[0]!.strength).toBe(40);
  });
});

describe('relationship-graph getEdgesFor', () => {
  it('returns every edge touching the entity on either side in insertion order', () => {
    let edges: RelationshipEdge[] = [];
    edges = addEdge(edges, { fromId: 'a', toId: 'b', type: 'mentor', year: 2020, strength: 10 });
    edges = addEdge(edges, { fromId: 'c', toId: 'a', type: 'rival', year: 2021, strength: 40 });
    edges = addEdge(edges, { fromId: 'b', toId: 'c', type: 'teammate', year: 2022, strength: 20 });
    const forA = getEdgesFor(edges, 'a');
    expect(forA.map((e) => e.id)).toEqual([
      'a:b:mentor:2020',
      'c:a:rival:2021',
    ]);
    expect(getEdgesFor(edges, 'zzz')).toEqual([]);
  });
});

describe('relationship-graph findPath', () => {
  it('returns null for self-paths, zero-depth, or when no chain exists', () => {
    const edges: RelationshipEdge[] = [
      { id: 'a:b:mentor:2020', fromId: 'a', toId: 'b', type: 'mentor', year: 2020, strength: 1 },
    ];
    expect(findPath(edges, 'a', 'a', 5)).toBeNull();
    expect(findPath(edges, 'a', 'b', 0)).toBeNull();
    expect(findPath(edges, 'a', 'zzz', 5)).toBeNull();
  });

  it('respects maxDepth and finds the shortest chain', () => {
    let edges: RelationshipEdge[] = [];
    edges = addEdge(edges, { fromId: 'a', toId: 'b', type: 'mentor', year: 2020, strength: 1 });
    edges = addEdge(edges, { fromId: 'b', toId: 'c', type: 'mentor', year: 2021, strength: 1 });
    edges = addEdge(edges, { fromId: 'c', toId: 'd', type: 'mentor', year: 2022, strength: 1 });
    // a→d requires 3 hops — cap at 2 → null
    expect(findPath(edges, 'a', 'd', 2)).toBeNull();
    const chain = findPath(edges, 'a', 'd', 3);
    expect(chain).not.toBeNull();
    expect(chain!.map((e) => e.id)).toEqual([
      'a:b:mentor:2020',
      'b:c:mentor:2021',
      'c:d:mentor:2022',
    ]);
  });

  it('produces a stable chain when multiple paths exist (deterministic by edge id)', () => {
    let edges: RelationshipEdge[] = [];
    edges = addEdge(edges, { fromId: 'a', toId: 'b', type: 'mentor', year: 2020, strength: 1 });
    edges = addEdge(edges, { fromId: 'a', toId: 'c', type: 'mentor', year: 2021, strength: 1 });
    edges = addEdge(edges, { fromId: 'b', toId: 'd', type: 'mentor', year: 2022, strength: 1 });
    edges = addEdge(edges, { fromId: 'c', toId: 'd', type: 'mentor', year: 2022, strength: 1 });
    const shuffled = [edges[2]!, edges[0]!, edges[3]!, edges[1]!];
    const chainA = findPath(edges, 'a', 'd', 3);
    const chainB = findPath(shuffled, 'a', 'd', 3);
    expect(chainA).not.toBeNull();
    expect(chainB).not.toBeNull();
    expect(chainA!.map((e) => e.id)).toEqual(chainB!.map((e) => e.id));
  });
});

describe('relationship-graph pruneDeadEdges', () => {
  it('keeps edges inside the 20-year window and drops stale edges whose endpoints are unknown', () => {
    const edges: RelationshipEdge[] = [
      { id: 'fresh:mentor', fromId: 'coach-1', toId: 'coach-2', type: 'mentor', year: 2024, strength: 20 },
      { id: 'stale-known', fromId: 'coach-3', toId: 'coach-1', type: 'mentor', year: 1990, strength: 20 },
      { id: 'stale-unknown', fromId: 'ghost-a', toId: 'ghost-b', type: 'rival', year: 1990, strength: 20 },
    ];
    const known = new Set(['coach-1', 'coach-2']);
    const pruned = pruneDeadEdges(edges, 2025, known);
    const ids = pruned.map((e) => e.id).sort();
    expect(ids).toEqual(['fresh:mentor', 'stale-known']);
  });

  it('is a no-op when every edge is inside the window', () => {
    const edges: RelationshipEdge[] = [
      { id: 'e1', fromId: 'a', toId: 'b', type: 'mentor', year: 2020, strength: 10 },
      { id: 'e2', fromId: 'c', toId: 'd', type: 'coach_tree', year: 2022, strength: 15 },
    ];
    const pruned = pruneDeadEdges(edges, 2025, new Set());
    expect(pruned).toHaveLength(2);
  });
});

describe('relationship-graph determinism', () => {
  it('same inputs → identical output arrays across repeated builds', () => {
    const build = () => {
      let edges: RelationshipEdge[] = [];
      edges = addEdge(edges, { fromId: 'a', toId: 'b', type: 'mentor', year: 2020, strength: 50 });
      edges = addEdge(edges, { fromId: 'b', toId: 'c', type: 'mentor', year: 2021, strength: 60 });
      edges = addEdge(edges, { fromId: 'a', toId: 'c', type: 'rival', year: 2022, strength: 30 });
      return edges;
    };
    const first = build();
    const second = build();
    expect(first.map((e) => e.id)).toEqual(second.map((e) => e.id));
    expect(first.map((e) => e.strength)).toEqual(second.map((e) => e.strength));
  });
});
