/**
 * Sprint 48 "The Reunion" — RelationshipGraph screen at
 * `/coaching/relationships`.
 *
 * Renders the league's `state.relationships` edge list (populated by
 * Sprint 45's `relationship-graph.ts`) as a lightweight force-directed
 * SVG visualization. Node positions are pre-computed by a small
 * deterministic layout pass so the component itself uses zero RNG —
 * same edge list always lays out the same way across machines.
 *
 * Filters:
 *   - Edge-type checkboxes (mentor, coach_tree, family, rival, teammate)
 *   - "User team only" toggle — narrows to edges that touch a coach
 *     currently on the user's staff
 *   - Year window slider — from (currentYear - 20) to currentYear
 *
 * Mobile (≤768px): graph canvas collapses to a sortable edge list,
 * same filter controls, no layout math.
 */
import { useMemo, useState } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type {
  GameState,
  RelationshipEdge,
  RelationshipEdgeType,
  StaffMember,
  Team,
} from '@mfd/engine';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  mono,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

// ── Visual constants ────────────────────────────────────

const EDGE_COLORS: Record<RelationshipEdgeType, string> = {
  mentor: 'var(--mfd-gold, #ffd700)',
  coach_tree: 'var(--mfd-cyan, #00e5ff)',
  family: 'var(--mfd-green, #4ade80)',
  rival: 'var(--mfd-red, #f87171)',
  teammate: '#9ca3af',
};

const EDGE_BADGE: Record<RelationshipEdgeType, 'gold' | 'cyan' | 'green' | 'red' | 'default'> = {
  mentor: 'gold',
  coach_tree: 'cyan',
  family: 'green',
  rival: 'red',
  teammate: 'default',
};

const CANVAS_W = 720;
const CANVAS_H = 480;
const NODE_R = 8;
const NODE_R_ACTIVE = 11;

// ── Types ───────────────────────────────────────────────

interface NodeMeta {
  id: string;
  label: string;
  kind: 'coach' | 'player' | 'unknown';
  isUser: boolean;
}

interface LaidOutNode extends NodeMeta {
  x: number;
  y: number;
}

interface GraphData {
  edges: RelationshipEdge[];
  nodes: NodeMeta[];
}

// ── Helpers ─────────────────────────────────────────────

/**
 * Deterministic hash → value in [0, 1). Used for node placement so the
 * graph lays out identically across sessions. Explicitly avoids RNG.
 */
function seededUnit(key: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967296;
}

/** Compute polar layout for a set of nodes — stable, no RNG. */
function layoutNodes(nodes: readonly NodeMeta[]): LaidOutNode[] {
  // Deterministically sort so rendering order (and id-based angle) is stable.
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const count = sorted.length;
  if (count === 0) return [];

  // Two-ring layout: primary ring (kind-weighted) + jitter from hash.
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const ringBase = Math.min(CANVAS_W, CANVAS_H) * 0.38;

  return sorted.map((node, idx) => {
    const angle = (idx / count) * Math.PI * 2;
    const radiusOffset = (seededUnit(node.id, 1) - 0.5) * 60;
    const angleJitter = (seededUnit(node.id, 2) - 0.5) * 0.12;
    const radius = ringBase + radiusOffset;
    const a = angle + angleJitter;
    return {
      ...node,
      x: cx + Math.cos(a) * radius,
      y: cy + Math.sin(a) * radius,
    };
  });
}

function collectStaff(teams: Record<string, Team>): Map<string, { coach: StaffMember; teamAbbr: string }> {
  const byId = new Map<string, { coach: StaffMember; teamAbbr: string }>();
  for (const team of Object.values(teams)) {
    for (const coach of [team.staff?.hc, team.staff?.oc, team.staff?.dc]) {
      if (coach && !byId.has(coach.id)) {
        byId.set(coach.id, { coach, teamAbbr: team.abbr });
      }
    }
  }
  return byId;
}

function collectPlayers(teams: Record<string, Team>): Map<string, string> {
  const byId = new Map<string, string>();
  for (const team of Object.values(teams)) {
    for (const p of team.roster ?? []) {
      byId.set(p.id, p.name);
    }
  }
  return byId;
}

function buildGraphData(
  game: Pick<GameState, 'teams' | 'relationships'>,
): GraphData {
  const edges = game.relationships ?? [];
  const staff = collectStaff(game.teams);
  const players = collectPlayers(game.teams);
  const userTeamId = Object.values(game.teams).find((t) => t.isUser)?.id ?? null;
  const userCoachIds = new Set<string>();
  if (userTeamId) {
    const team = game.teams[userTeamId];
    if (team?.staff) {
      for (const c of [team.staff.hc, team.staff.oc, team.staff.dc]) {
        if (c) userCoachIds.add(c.id);
      }
    }
  }

  const nodeIds = new Set<string>();
  for (const edge of edges) {
    nodeIds.add(edge.fromId);
    nodeIds.add(edge.toId);
  }

  const nodes: NodeMeta[] = [];
  for (const id of nodeIds) {
    if (staff.has(id)) {
      const entry = staff.get(id)!;
      nodes.push({
        id,
        label: `${entry.coach.role} ${entry.coach.name} (${entry.teamAbbr})`,
        kind: 'coach',
        isUser: userCoachIds.has(id),
      });
    } else if (players.has(id)) {
      nodes.push({
        id,
        label: players.get(id) ?? id,
        kind: 'player',
        isUser: false,
      });
    } else {
      nodes.push({ id, label: id, kind: 'unknown', isUser: false });
    }
  }

  return { edges, nodes };
}

// ── Filter state helpers ────────────────────────────────

const ALL_EDGE_TYPES: readonly RelationshipEdgeType[] = [
  'mentor',
  'coach_tree',
  'family',
  'rival',
  'teammate',
];

interface Filters {
  enabledTypes: Set<RelationshipEdgeType>;
  userTeamOnly: boolean;
  yearMin: number;
}

function useFilterState(currentYear: number): [Filters, {
  toggleType: (t: RelationshipEdgeType) => void;
  toggleUserTeam: () => void;
  setYearMin: (y: number) => void;
}] {
  const [enabledTypes, setEnabledTypes] = useState<Set<RelationshipEdgeType>>(
    () => new Set(ALL_EDGE_TYPES),
  );
  const [userTeamOnly, setUserTeamOnly] = useState(false);
  const [yearMin, setYearMin] = useState<number>(currentYear - 20);

  return [
    { enabledTypes, userTeamOnly, yearMin },
    {
      toggleType: (t) => {
        setEnabledTypes((prev) => {
          const next = new Set(prev);
          if (next.has(t)) next.delete(t);
          else next.add(t);
          return next;
        });
      },
      toggleUserTeam: () => setUserTeamOnly((v) => !v),
      setYearMin: (y) => setYearMin(y),
    },
  ];
}

function applyFilters(
  data: GraphData,
  filters: Filters,
  userCoachIds: ReadonlySet<string>,
): GraphData {
  const { enabledTypes, userTeamOnly, yearMin } = filters;
  const filteredEdges = data.edges.filter((edge) => {
    if (!enabledTypes.has(edge.type)) return false;
    if (edge.year < yearMin) return false;
    if (userTeamOnly && !userCoachIds.has(edge.fromId) && !userCoachIds.has(edge.toId)) return false;
    return true;
  });
  const nodeIds = new Set<string>();
  for (const edge of filteredEdges) {
    nodeIds.add(edge.fromId);
    nodeIds.add(edge.toId);
  }
  const filteredNodes = data.nodes.filter((n) => nodeIds.has(n.id));
  return { edges: filteredEdges, nodes: filteredNodes };
}

// ── Render bits ─────────────────────────────────────────

function GraphCanvas({ data }: { data: GraphData }) {
  const laidOut = useMemo(() => layoutNodes(data.nodes), [data.nodes]);
  const nodeIndex = useMemo(() => {
    const m = new Map<string, LaidOutNode>();
    for (const n of laidOut) m.set(n.id, n);
    return m;
  }, [laidOut]);

  if (data.edges.length === 0) {
    return (
      <PixelPanel title="NO EDGES MATCH" accent="default">
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Widen the year window or re-enable an edge type to see relationships.
        </div>
      </PixelPanel>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        role="img"
        aria-label="relationship graph"
        style={{
          background: 'var(--mfd-bg-deep, #000)',
          border: '2px solid var(--mfd-gold, #ffd700)',
        }}
      >
        {data.edges.map((edge) => {
          const a = nodeIndex.get(edge.fromId);
          const b = nodeIndex.get(edge.toId);
          if (!a || !b) return null;
          const opacity = Math.max(0.25, Math.min(1, edge.strength / 100));
          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={EDGE_COLORS[edge.type]}
              strokeWidth={edge.strength >= 75 ? 2 : 1}
              opacity={opacity}
            />
          );
        })}
        {laidOut.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.isUser ? NODE_R_ACTIVE : NODE_R}
              fill={node.kind === 'coach' ? '#ffd700' : node.kind === 'player' ? '#00e5ff' : '#6b7280'}
              stroke="var(--mfd-bg-deep, #000)"
              strokeWidth={1.5}
            />
            <title>{node.label}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

function EdgeList({ data }: { data: GraphData }) {
  const sorted = useMemo(
    () => [...data.edges].sort((a, b) => b.strength - a.strength || b.year - a.year),
    [data.edges],
  );
  const nodeIndex = useMemo(() => {
    const m = new Map<string, NodeMeta>();
    for (const n of data.nodes) m.set(n.id, n);
    return m;
  }, [data.nodes]);

  if (sorted.length === 0) {
    return (
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
        No edges match the current filters.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {sorted.map((edge) => {
        const from = nodeIndex.get(edge.fromId);
        const to = nodeIndex.get(edge.toId);
        return (
          <div
            key={edge.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '6px 8px',
              border: '1px solid var(--mfd-border-dim, #333)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                {(from?.label ?? edge.fromId)}
                <span style={{ color: 'var(--mfd-text-dim)' }}> → </span>
                {(to?.label ?? edge.toId)}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Year {edge.year} | Strength {edge.strength}
                {edge.note ? ` | ${edge.note}` : ''}
              </div>
            </div>
            <PixelBadge variant={EDGE_BADGE[edge.type]}>{edge.type.replace('_', ' ')}</PixelBadge>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {ALL_EDGE_TYPES.map((t) => (
        <PixelBadge key={t} variant={EDGE_BADGE[t]}>
          {t.replace('_', ' ')}
        </PixelBadge>
      ))}
    </div>
  );
}

// ── Root component ──────────────────────────────────────

export function RelationshipGraph() {
  const userTeam = useGameStore(selectUserTeam);
  const teams = useGameStore((s) => s.game?.teams ?? {});
  const relationships = useGameStore((s) => s.game?.relationships ?? []);
  const currentYear = useGameStore((s) => s.game?.year ?? 2026);

  const [filters, actions] = useFilterState(currentYear);

  const userCoachIds = useMemo(() => {
    const ids = new Set<string>();
    if (userTeam?.staff) {
      for (const c of [userTeam.staff.hc, userTeam.staff.oc, userTeam.staff.dc]) {
        if (c) ids.add(c.id);
      }
    }
    return ids;
  }, [userTeam]);

  const baseGraph = useMemo<GraphData>(
    () => buildGraphData({ teams, relationships }),
    [teams, relationships],
  );

  const filteredGraph = useMemo(
    () => applyFilters(baseGraph, filters, userCoachIds),
    [baseGraph, filters, userCoachIds],
  );

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const e of filteredGraph.edges) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
    }
    return byType;
  }, [filteredGraph.edges]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="RELATIONSHIP GRAPH"
        subtitle="League-wide lineage, rivalries, and family ties"
        kicker="THE REUNION"
      />

      {baseGraph.edges.length === 0 ? (
        <PixelPanel title="NO RELATIONSHIPS RECORDED" accent="default">
          <div style={{ ...mono, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No relationship edges in this save yet. Hire a coach with prior
            experience, draft a bloodline prospect, or advance a few seasons
            to seed the graph.
          </div>
        </PixelPanel>
      ) : (
        <>
          <PixelPanel title="FILTERS" accent="default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ALL_EDGE_TYPES.map((t) => {
                  const on = filters.enabledTypes.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => actions.toggleType(t)}
                      aria-pressed={on}
                      style={{
                        ...pixelSm,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        background: on ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                        color: on ? EDGE_COLORS[t] : 'var(--mfd-text-dim)',
                        border: `2px solid ${on ? EDGE_COLORS[t] : '#333'}`,
                      }}
                    >
                      {t.replace('_', ' ')} ({counts[t] ?? 0})
                    </button>
                  );
                })}
              </div>

              <label style={{ ...monoSm, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={filters.userTeamOnly}
                  onChange={actions.toggleUserTeam}
                />
                User team only
              </label>

              <div style={{ ...monoSm, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--mfd-text-dim)' }}>
                  From year {filters.yearMin} → {currentYear}
                </span>
                <input
                  type="range"
                  min={Math.max(1, currentYear - 40)}
                  max={currentYear}
                  value={filters.yearMin}
                  onChange={(e) => actions.setYearMin(Number(e.target.value))}
                  aria-label="minimum year"
                />
              </div>

              <Legend />
            </div>
          </PixelPanel>

          <PixelPanel title={`GRAPH — ${filteredGraph.edges.length} EDGES`} accent="gold">
            <div className="mfd-relgraph-canvas">
              <GraphCanvas data={filteredGraph} />
            </div>
            <div className="mfd-relgraph-list">
              <EdgeList data={filteredGraph} />
            </div>
          </PixelPanel>
        </>
      )}

      {/**
       * Graph canvas is the default desktop view; the list is the
       * default mobile view. A tiny inline styletag flips visibility
       * at the 768px breakpoint without pulling in a CSS module.
       */}
      <style>{`
        .mfd-relgraph-canvas { display: block; }
        .mfd-relgraph-list { display: none; margin-top: 12px; }
        @media (max-width: 768px) {
          .mfd-relgraph-canvas { display: none; }
          .mfd-relgraph-list { display: block; }
        }
      `}</style>
    </div>
  );
}

export default RelationshipGraph;
