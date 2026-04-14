import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { ChoiceForecastPreview, DepthChartContext, DepthChartPhilosophy } from '@mfd/engine';
import { autoGrid, monoSm, pixelSm } from '../../shared/pixelUi';
import { ChoiceDeltaBadges } from '../ChoiceDeltaBadges';

const PHILOSOPHY_COPY: Record<DepthChartPhilosophy, { label: string; desc: string }> = {
  best_players: {
    label: 'Best Players',
    desc: 'Start the highest-floor lineup now, even if it slows a young player’s runway.',
  },
  veterans_first: {
    label: 'Veterans First',
    desc: 'Trust experience and stability while the system install settles in.',
  },
  youth_bet: {
    label: 'Youth Bet',
    desc: 'Let young upside hit the field early and live with the volatility.',
  },
};

export function DepthChartPhase({
  data,
  selectedPhilosophy,
  previewByPhilosophy,
  onSelectPhilosophy,
}: {
  data: DepthChartContext;
  selectedPhilosophy: DepthChartPhilosophy | null;
  previewByPhilosophy?: Partial<Record<DepthChartPhilosophy, ChoiceForecastPreview>>;
  onSelectPhilosophy: (philosophy: DepthChartPhilosophy) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...monoSm, color: '#bbb', lineHeight: 1.6 }}>
        Decide how the opener gets built. Your philosophy changes which players win the last few Week 1 calls.
      </div>

      <PixelPanel title="Depth Chart Philosophy" accent="gold">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {(Object.keys(PHILOSOPHY_COPY) as DepthChartPhilosophy[]).map((philosophy) => {
            const selected = philosophy === selectedPhilosophy;
            return (
              <div
                key={philosophy}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPhilosophy(philosophy)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectPhilosophy(philosophy);
                }}
                style={{
                  cursor: 'pointer',
                  border: `3px solid ${selected ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                  background: selected ? 'rgba(255, 215, 0, 0.08)' : 'var(--mfd-bg-3)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <span style={{ ...pixelSm, color: selected ? 'var(--mfd-gold)' : 'var(--mfd-text)' }}>
                    {PHILOSOPHY_COPY[philosophy].label}
                  </span>
                  {selected ? <PixelBadge variant="green">SELECTED</PixelBadge> : null}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  {PHILOSOPHY_COPY[philosophy].desc}
                </div>
                <ChoiceDeltaBadges preview={previewByPhilosophy?.[philosophy]} />
              </div>
            );
          })}
        </div>
      </PixelPanel>

      <div style={autoGrid(260)}>
        {data.positionGroups.map((group) => (
          <PixelPanel key={group.position} title={group.position} accent="default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.players.slice(0, 4).map((player, idx) => {
                const isStarter = idx < (data.autoSetRecommendation[group.position]?.length ?? 1);
                return (
                  <div key={player.playerId} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0',
                    borderBottom: '1px solid #1a1a1a', opacity: isStarter ? 1 : 0.6,
                  }}>
                    <PixelBadge variant={isStarter ? 'green' : 'default'}>{isStarter ? 'STR' : 'BKP'}</PixelBadge>
                    <span style={{ ...monoSm, color: '#ddd', flex: 1 }}>{player.name}</span>
                    <span style={{ ...monoSm, color: isStarter ? 'var(--mfd-green)' : '#888' }}>{player.ovr}</span>
                    {typeof player.fitScore === 'number' && (
                      <span style={{ ...monoSm, color: player.fitScore >= 70 ? 'var(--mfd-cyan)' : 'var(--mfd-gold)' }}>
                        {Math.round(player.fitScore)}F
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </PixelPanel>
        ))}
      </div>

      {data.activeBattles.length > 0 ? (
        <PixelPanel title="Active Position Battles" accent="gold">
          {data.activeBattles.map((battle) => (
            <div key={`${battle.pos}-${battle.incumbent.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1a1a1a',
            }}>
              <PixelBadge variant="gold">{battle.slotLabel}</PixelBadge>
              <span style={{ ...monoSm, color: '#ddd' }}>
                {battle.incumbent.name} ({battle.incumbent.ovr}) vs {battle.challenger.name} ({battle.challenger.ovr})
              </span>
            </div>
          ))}
        </PixelPanel>
      ) : null}
    </div>
  );
}
