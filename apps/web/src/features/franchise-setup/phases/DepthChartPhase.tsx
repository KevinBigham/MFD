import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { DepthChartContext } from '@mfd/engine';
import { autoGrid, monoSm, pixelSm } from '../../shared/pixelUi';

export function DepthChartPhase({ data }: { data: DepthChartContext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...monoSm, color: '#bbb', lineHeight: 1.6 }}>
        Your depth chart has been auto-set based on your {data.selectedOffenseScheme ?? 'current'} offense
        and {data.selectedDefenseScheme ?? 'current'} defense. Review your starters below.
      </div>

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
