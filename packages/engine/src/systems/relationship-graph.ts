/**
 * MFD Relationship Graph (Sprint 45 — "The Family Tree")
 *
 * Pure, deterministic helpers over a flat array of relationship edges.
 * Edges connect coaches, players, and GMs across the league's history
 * and form the spine of the coaching tree, bloodline ties, and rivalry
 * threads surfaced in dynasty narrative.
 *
 * All helpers are non-mutating and avoid RNG entirely — the graph is
 * fully derived from inputs, so the same edge list always yields the
 * same query output across machines and saves.
 */

export type RelationshipEdgeType =
  | 'mentor'
  | 'rival'
  | 'teammate'
  | 'family'
  | 'coach_tree';

export interface RelationshipEdge {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipEdgeType;
  year: number;
  strength: number;
  note?: string;
}

/** Drop edges from a persisted save whose endpoints have aged out of the league. */
const DEAD_EDGE_WINDOW_YEARS = 20;

/**
 * Build the deterministic id for an edge from its fields.
 * Exposed for tests — consumers should go through `addEdge`.
 */
export function edgeId(input: Omit<RelationshipEdge, 'id'>): string {
  return `${input.fromId}:${input.toId}:${input.type}:${input.year}`;
}

/**
 * Append a new edge to an edge list.
 *
 * - Generates a deterministic id from `fromId`, `toId`, `type`, and `year`.
 * - Dedupes by id: if an edge with the same key already exists, returns the
 *   input array unchanged (preserves reference equality for the no-op case).
 * - Never mutates the input array.
 */
export function addEdge(
  edges: RelationshipEdge[],
  input: Omit<RelationshipEdge, 'id'>,
): RelationshipEdge[] {
  const id = edgeId(input);
  for (const existing of edges) {
    if (existing.id === id) return edges;
  }
  const edge: RelationshipEdge = { ...input, id };
  return [...edges, edge];
}

/**
 * Return every edge that touches `entityId` on either side, preserving input order.
 */
export function getEdgesFor(
  edges: RelationshipEdge[],
  entityId: string,
): RelationshipEdge[] {
  const out: RelationshipEdge[] = [];
  for (const edge of edges) {
    if (edge.fromId === entityId || edge.toId === entityId) {
      out.push(edge);
    }
  }
  return out;
}

/**
 * Find the shortest chain of edges connecting `aId` to `bId` via BFS.
 *
 * - `maxDepth` caps the number of edges in the returned chain. A `maxDepth`
 *   of 0 always returns null (even for a==b) since the return type is an
 *   edge chain, not a path of nodes.
 * - Traversal order is stabilised by sorting each node's outbound edges by
 *   edge id, so the returned chain is identical across runs.
 * - Returns null when no chain exists within `maxDepth` or when the two
 *   ids coincide (a self-path has no edges).
 */
export function findPath(
  edges: RelationshipEdge[],
  aId: string,
  bId: string,
  maxDepth: number,
): RelationshipEdge[] | null {
  if (maxDepth <= 0) return null;
  if (aId === bId) return null;

  // Adjacency list keyed by node id with sorted edge references for determinism.
  const adjacency = new Map<string, RelationshipEdge[]>();
  const sorted = [...edges].sort((left, right) => left.id.localeCompare(right.id));
  for (const edge of sorted) {
    const fromBucket = adjacency.get(edge.fromId) ?? [];
    fromBucket.push(edge);
    adjacency.set(edge.fromId, fromBucket);
    const toBucket = adjacency.get(edge.toId) ?? [];
    toBucket.push(edge);
    adjacency.set(edge.toId, toBucket);
  }

  interface Frontier {
    node: string;
    chain: RelationshipEdge[];
  }

  const queue: Frontier[] = [{ node: aId, chain: [] }];
  const visited = new Set<string>([aId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.chain.length >= maxDepth) continue;
    const outbound = adjacency.get(current.node) ?? [];
    for (const edge of outbound) {
      const nextNode = edge.fromId === current.node ? edge.toId : edge.fromId;
      if (visited.has(nextNode)) continue;
      const nextChain = [...current.chain, edge];
      if (nextNode === bId) return nextChain;
      visited.add(nextNode);
      queue.push({ node: nextNode, chain: nextChain });
    }
  }

  return null;
}

/**
 * Drop edges whose year is more than `DEAD_EDGE_WINDOW_YEARS` older than
 * `currentYear` AND whose endpoints no longer exist in `knownEntityIds`.
 *
 * An edge is kept if EITHER condition fails:
 *   - It is within the window (young enough to still surface narratively), OR
 *   - At least one endpoint is a currently-known entity (active coach/player).
 *
 * This preserves long-lived lineage chains while pruning edges that have
 * lost all relevance.
 */
export function pruneDeadEdges(
  edges: RelationshipEdge[],
  currentYear: number,
  knownEntityIds: Set<string>,
): RelationshipEdge[] {
  const cutoff = currentYear - DEAD_EDGE_WINDOW_YEARS;
  const kept: RelationshipEdge[] = [];
  for (const edge of edges) {
    const inWindow = edge.year >= cutoff;
    const anyKnown = knownEntityIds.has(edge.fromId) || knownEntityIds.has(edge.toId);
    if (inWindow || anyKnown) {
      kept.push(edge);
    }
  }
  return kept;
}
