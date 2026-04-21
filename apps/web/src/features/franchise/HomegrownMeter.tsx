import type { GameState } from '@mfd/engine';
import { PixelPanel } from '@mfd/design-system/components';
import { computeRosterIdentity } from '../../lib/roster-identity';
import { PixelMetricCard, autoGrid, display, monoSm } from '../shared/pixelUi';

export function HomegrownMeter({
  game,
}: {
  game: GameState | null;
}) {
  const identity = computeRosterIdentity(game);

  return (
    <PixelPanel title="Franchise Identity" accent="cyan">
      {identity === null ? (
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Franchise identity unavailable - no active dynasty.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ ...display, fontSize: '34px', color: 'var(--mfd-text)', lineHeight: 1 }}>
              {identity.homegrownPercent}%
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-cyan)', letterSpacing: '0.8px' }}>
              HOMEGROWN
            </div>
          </div>

          <div
            style={{
              height: '16px',
              border: '2px solid var(--mfd-cyan)',
              background: 'var(--mfd-bg-elevated)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${identity.homegrownPercent}%`,
                background: 'var(--mfd-cyan)',
              }}
            />
          </div>

          <div style={autoGrid(140)}>
            <PixelMetricCard label="Total Players" value={identity.totalPlayers} accent="default" />
            <PixelMetricCard label="Homegrown" value={identity.homegrownCount} accent="cyan" />
            <PixelMetricCard label="Rookies" value={identity.rookieCount} accent="green" />
            <PixelMetricCard label="Mid-Career" value={identity.midCareerCount} accent="gold" />
            <PixelMetricCard label="Veterans" value={identity.veteranCount} accent="red" />
          </div>
        </div>
      )}
    </PixelPanel>
  );
}
