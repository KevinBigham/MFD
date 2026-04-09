import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { RosterOverview } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm } from '../../shared/pixelUi';

function PlayerRow({ name, pos, ovr, age, accent }: { name: string; pos: string; ovr: number; age: number; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
      <PixelBadge variant="gold">{pos}</PixelBadge>
      <span style={{ ...monoSm, color: '#ddd', flex: 1 }}>{name}</span>
      <span style={{ ...monoSm, color: accent, fontWeight: 'bold' }}>{ovr} OVR</span>
      <span style={{ ...monoSm, color: '#888' }}>Age {age}</span>
    </div>
  );
}

export function MeetRosterPhase({ data }: { data: RosterOverview }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={autoGrid(160)}>
        <PixelMetricCard label="Roster Size" value={data.rosterSize} accent="cyan" detail="Active players" />
        <PixelMetricCard label="Stars" value={data.starPlayers.length} accent="gold" detail="85+ OVR players" />
        <PixelMetricCard label="Rising" value={data.risingStars.length} accent="green" detail="Breakout candidates" />
        <PixelMetricCard label="Injured" value={data.injuredPlayers.length} accent="red" detail="Currently out" />
      </div>

      <PixelPanel title="Star Players" accent="gold">
        {data.starPlayers.length === 0 ? (
          <div style={{ ...monoSm, color: '#666' }}>No players rated 85+ OVR on this roster.</div>
        ) : (
          data.starPlayers.map((p) => <PlayerRow key={p.playerId} name={p.name} pos={p.pos} ovr={p.ovr} age={p.age} accent="var(--mfd-gold)" />)
        )}
      </PixelPanel>

      {data.risingStars.length > 0 ? (
        <PixelPanel title="Breakout Candidates" accent="green">
          {data.risingStars.map((p) => (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
              <PixelBadge variant="green">{p.pos}</PixelBadge>
              <span style={{ ...monoSm, color: '#ddd', flex: 1 }}>{p.playerName}</span>
              <span style={{ ...monoSm, color: 'var(--mfd-green)' }}>+{p.ovrDelta} OVR</span>
              <span style={{ ...monoSm, color: '#888' }}>Age {p.age}</span>
            </div>
          ))}
        </PixelPanel>
      ) : null}

      <PixelPanel title="Weakest Starters" accent="red">
        {data.weakestStarters.map((p) => <PlayerRow key={p.playerId} name={p.name} pos={p.pos} ovr={p.ovr} age={p.age} accent="var(--mfd-red, #ff4444)" />)}
      </PixelPanel>

      {data.injuredPlayers.length > 0 ? (
        <PixelPanel title="Injured Reserve" accent="red">
          {data.injuredPlayers.map((p) => (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
              <PixelBadge variant="red">{p.pos}</PixelBadge>
              <span style={{ ...monoSm, color: '#ddd', flex: 1 }}>{p.name}</span>
              <span style={{ ...monoSm, color: 'var(--mfd-red, #ff4444)' }}>{p.gamesOut}G out</span>
              <PixelBadge variant="red">{p.severity}</PixelBadge>
            </div>
          ))}
        </PixelPanel>
      ) : null}
    </div>
  );
}
