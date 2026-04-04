import { useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  selectFarewellTours,
  selectRetiredJerseys,
  useGameStore,
} from '../../app/store/game-store';
import { display, monoSm, pixelSm, autoGrid } from '../shared/pixelUi';

export function JerseyRetirementViewer() {
  const retiredJerseys = useGameStore(selectRetiredJerseys);
  const farewellTours = useGameStore(selectFarewellTours);
  const [expandedId, setExpandedId] = useState<string | null>(retiredJerseys[0]?.id ?? null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {retiredJerseys.length === 0 ? (
        <PixelPanel title="Retired Jerseys" accent="cyan">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No numbers are in the rafters yet. Legendary careers will start filling this wing.
          </div>
        </PixelPanel>
      ) : (
        <div style={autoGrid(260)}>
          {retiredJerseys.map((entry) => {
            const expanded = expandedId === entry.id;
            return (
              <PixelPanel key={entry.id} title={entry.playerName} accent="gold">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ ...display, fontSize: '42px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
                      #{entry.jerseyNumber}
                    </span>
                    <PixelBadge variant="gold">{entry.pos}</PixelBadge>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="cyan">{entry.seasonsWithTeam} seasons</PixelBadge>
                    <PixelBadge variant="green">{entry.peakOvr} peak OVR</PixelBadge>
                    <PixelBadge variant={entry.championships > 0 ? 'gold' : 'default'}>
                      {entry.championships} titles
                    </PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.headline}</div>
                  {expanded ? (
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {entry.ceremony}
                    </div>
                  ) : null}
                  <PixelButton accent={expanded ? 'default' : 'gold'} onClick={() => setExpandedId(expanded ? null : entry.id)}>
                    {expanded ? 'Hide Ceremony' : 'Read Ceremony'}
                  </PixelButton>
                </div>
              </PixelPanel>
            );
          })}
        </div>
      )}

      <PixelPanel title="Active Farewell Tours" accent={farewellTours.length > 0 ? 'cyan' : 'default'}>
        {farewellTours.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {farewellTours.map((tour) => (
              <div key={tour.playerId} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                border: '2px solid var(--mfd-cyan)',
                background: 'var(--mfd-bg-2)',
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    {tour.playerName.toUpperCase()}
                  </span>
                  <PixelBadge variant="cyan">Announced week {tour.announcedWeek}</PixelBadge>
                </div>
                <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>UPCOMING MOMENTS</div>
                {tour.moments.map((moment) => (
                  <div key={`${tour.playerId}-${moment.week}-${moment.type}`} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    Week {moment.week}: {moment.type.replace(/_/g, ' ')} vs {moment.opponent}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No farewell tours are active right now.</div>
        )}
      </PixelPanel>
    </div>
  );
}
