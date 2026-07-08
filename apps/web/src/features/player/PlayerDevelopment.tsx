/**
 * Player Development Screen
 *
 * Archetype alignment, rating growth, position coach impact,
 * development projection, and breakout candidates.
 */

import type {
  DevelopmentReport,
  DevelopmentProjection,
  BreakoutCandidate,
} from '@mfd/engine';
import { PixelPanel, PixelBadge } from '@mfd/design-system/components';

/* ── Shared styles ──────────────────────────────────────── */
const pixel = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px' } as const;
const display = { fontFamily: 'var(--mfd-font-display)' } as const;
const mono = { fontFamily: 'var(--mfd-font-mono)', fontSize: '12px' } as const;
const monoSm = { fontFamily: 'var(--mfd-font-mono)', fontSize: '11px' } as const;

/* ── Helpers ────────────────────────────────────────────── */

function alignmentColor(value: number): string {
  if (value >= 75) return 'var(--mfd-gold)';
  if (value >= 50) return 'var(--mfd-green)';
  if (value >= 30) return 'var(--mfd-cyan)';
  return '#999';
}

function evolutionVariant(risk: string): 'gold' | 'red' | 'cyan' | 'default' {
  if (risk === 'likely') return 'red';
  if (risk === 'possible') return 'gold';
  return 'default';
}

/* ── Sub-components ─────────────────────────────────────── */

function ArchetypeCard({ report }: { report: DevelopmentReport }) {
  return (
    <PixelPanel title="Archetype Profile" accent="cyan">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...display, fontSize: '18px', color: '#fff' }}>
            {report.archetypeLabel}
          </div>
          <PixelBadge variant={report.archetypeAlignment >= 60 ? 'green' : 'default'}>
            {report.archetypeAlignment}% ALIGNED
          </PixelBadge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ ...pixel, color: '#999', width: '60px' }}>ALIGNMENT</span>
          <div style={{ flex: 1, height: '6px', background: '#222', border: '1px solid #333' }}>
            <div style={{ width: `${report.archetypeAlignment}%`, height: '100%', background: alignmentColor(report.archetypeAlignment) }} />
          </div>
        </div>

        {report.evolutionRisk !== 'none' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <PixelBadge variant={evolutionVariant(report.evolutionRisk)}>
              EVOLUTION {report.evolutionRisk.toUpperCase()}
            </PixelBadge>
            <span style={{ ...monoSm, color: '#999' }}>
              Development may shift archetype
            </span>
          </div>
        )}
      </div>
    </PixelPanel>
  );
}

function RatingGrowthCard({ report }: { report: DevelopmentReport }) {
  if (report.topGrowthRatings.length === 0) {
    return (
      <PixelPanel title="Rating Growth" accent="default">
        <div style={{ ...monoSm, color: '#666', padding: '12px' }}>
          No rating growth data yet. Complete a season to see development trends.
        </div>
      </PixelPanel>
    );
  }

  return (
    <PixelPanel title="Rating Growth" accent="green">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {report.topGrowthRatings.map((r) => (
          <div key={r.rating} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: '#ccc' }}>{r.rating}</span>
            <PixelBadge variant={r.delta > 0 ? 'green' : 'red'}>
              {r.delta > 0 ? '+' : ''}{r.delta}
            </PixelBadge>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

function ProjectionCard({ projections, currentOvr }: { projections: DevelopmentProjection[]; currentOvr: number }) {
  return (
    <PixelPanel title="OVR Projection" accent="cyan">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...monoSm, color: '#999' }}>Current</span>
          <span style={{ ...mono, color: '#fff' }}>{currentOvr}</span>
        </div>
        {projections.map((p) => (
          <div key={p.year} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...monoSm, color: '#999' }}>+{p.year} yr</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ ...mono, color: p.projectedOvr >= currentOvr ? 'var(--mfd-green)' : 'var(--mfd-red)' }}>
                {p.projectedOvr}
              </span>
              <span style={{ ...pixel, color: '#666' }}>{p.confidence}% conf</span>
            </div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

function BreakoutPanel({ candidates }: { candidates: BreakoutCandidate[] }) {
  if (candidates.length === 0) return null;

  return (
    <PixelPanel title="Breakout Candidates" accent="gold">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {candidates.map((c) => (
          <div key={c.playerId} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...mono, color: '#fff' }}>{c.playerName}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <PixelBadge variant="default">{c.pos}</PixelBadge>
                <PixelBadge variant="green">+{c.ovrDelta} OVR</PixelBadge>
              </div>
            </div>
            <span style={{ ...monoSm, color: '#999' }}>{c.reason}</span>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

/* ── Exported View ──────────────────────────────────────── */

export interface PlayerDevelopmentViewProps {
  report: DevelopmentReport | null;
  projections: DevelopmentProjection[];
  breakoutCandidates: BreakoutCandidate[];
  coachImpact: string | null;
  playerOptions?: PlayerDevelopmentPlayerOption[];
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string) => void;
}

export interface PlayerDevelopmentPlayerOption {
  id: string;
  name: string;
  pos: string;
  age: number;
  ovr: number;
}

export function PlayerDevelopmentView({
  report,
  projections,
  breakoutCandidates,
  coachImpact,
  playerOptions = [],
  selectedPlayerId,
  onSelectPlayer,
}: PlayerDevelopmentViewProps) {
  if (!report) {
    return (
      <PixelPanel title="Player Development" accent="cyan">
        <div style={{ ...pixel, color: '#999', padding: '12px', lineHeight: 2 }}>
          No development data available. Select a player to view their progression profile.
        </div>
      </PixelPanel>
    );
  }

  const selectedId = selectedPlayerId ?? report.playerId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Player header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', padding: '4px 0', borderBottom: '3px solid var(--mfd-cyan)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ ...display, fontSize: '20px', color: '#fff' }}>
            {report.playerName}
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">{report.pos}</PixelBadge>
            <PixelBadge variant="default">AGE {report.age}</PixelBadge>
            <PixelBadge variant="gold">OVR {report.ovr}</PixelBadge>
          </div>
        </div>

        {playerOptions.length > 0 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
            <span style={{ ...pixel, color: '#999' }}>DEVELOPMENT PLAYER</span>
            <select
              aria-label="Development player"
              value={selectedId}
              onChange={(event) => onSelectPlayer?.(event.currentTarget.value)}
              style={{
                ...monoSm,
                width: '100%',
                minHeight: '32px',
                color: '#fff',
                background: '#111',
                border: '1px solid var(--mfd-cyan)',
                padding: '6px 8px',
              }}
            >
              {playerOptions.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} - {player.pos} {player.ovr} OVR
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <ArchetypeCard report={report} />
      <RatingGrowthCard report={report} />
      <ProjectionCard projections={projections} currentOvr={report.ovr} />

      <PixelPanel title="Development Sources" accent="gold">
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">Selected roster player</PixelBadge>
            <PixelBadge variant="gold">Pure engine helpers</PixelBadge>
            <PixelBadge variant="default">No progression write</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
            This screen renders the generated development report, projected curve, breakout candidates,
            and optional position-coach narrative for the selected roster player. Opening it does not run progression,
            alter archetypes, spend training-camp work, mutate coach effects, or write player history.
          </div>
        </div>
      </PixelPanel>

      {coachImpact && (
        <PixelPanel title="Position Coach Impact" accent="default">
          <div style={{ ...monoSm, color: '#ccc', padding: '12px', lineHeight: 1.5 }}>
            {coachImpact}
          </div>
        </PixelPanel>
      )}

      <BreakoutPanel candidates={breakoutCandidates} />
    </div>
  );
}
