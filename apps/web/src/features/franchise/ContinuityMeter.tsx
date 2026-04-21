import type { GameState } from '@mfd/engine';
import { PixelPanel } from '@mfd/design-system/components';
import { deriveDynastyId } from '../../lib/career-meta';
import { computeRosterContinuity } from '../../lib/roster-continuity';
import { readDynastyStarters } from '../../lib/roster-continuity-store';
import { PixelMetricCard, autoGrid, display, monoSm } from '../shared/pixelUi';

export function ContinuityMeter({
  game,
}: {
  game: GameState | null | undefined;
}) {
  if (!game) return null;

  const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
  if (!userTeam) return null;

  const lastSeason = readDynastyStarters(deriveDynastyId(game));
  if (!lastSeason || lastSeason.starterIds.length === 0) return null;

  const continuity = computeRosterContinuity(game, lastSeason.starterIds);
  const departedWidth = Math.max(0, 100 - continuity.retentionPct);

  return (
    <PixelPanel title="Continuity" accent="green">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ ...display, fontSize: '34px', color: 'var(--mfd-text)', lineHeight: 1 }}>
            {continuity.retentionPct}%
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-green)', letterSpacing: '0.8px' }}>
            RETENTION
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            height: '16px',
            border: '2px solid var(--mfd-green)',
            background: 'var(--mfd-bg-elevated)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${continuity.retentionPct}%`,
              background: 'var(--mfd-green)',
            }}
          />
          <div
            style={{
              height: '100%',
              width: `${departedWidth}%`,
              background: 'var(--mfd-red)',
            }}
          />
        </div>

        <div style={autoGrid(140)}>
          <PixelMetricCard label="Retained" value={continuity.retained} accent="green" />
          <PixelMetricCard label="New Starters" value={continuity.newlyStarting} accent="cyan" />
          <PixelMetricCard label="Departed" value={continuity.departed} accent="red" />
          <PixelMetricCard label="Total Starters" value={continuity.total} accent="gold" />
        </div>
      </div>
    </PixelPanel>
  );
}
