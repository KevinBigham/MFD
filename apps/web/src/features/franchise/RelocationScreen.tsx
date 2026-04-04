import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import {
  useGameStore,
  selectCanRelocate,
  selectRelocationDestinations,
  selectUserTeam,
  selectYear,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, display, monoSm, screenStackStyle } from '../shared/pixelUi';
import { DetailStripe } from './franchiseUi';

function navigateTo(path: string) {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function RelocationScreen() {
  const team = useGameStore(selectUserTeam);
  const year = useGameStore(selectYear);
  const canRelocate = useGameStore(selectCanRelocate);
  const destinations = useGameStore(selectRelocationDestinations);
  const { relocateTeam } = useGameStore((state) => state.actions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selected = useMemo(() => {
    if (destinations.length === 0) return null;
    return destinations.find((destination) => destination.abbr === selectedId) ?? destinations[0] ?? null;
  }, [destinations, selectedId]);

  if (!team) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Franchise Relocation" subtitle="No active franchise is loaded." />
      </div>
    );
  }

  const cheapest = destinations.reduce((min, destination) => Math.min(min, destination.cost), Number.POSITIVE_INFINITY);
  const reason = canRelocate
    ? 'Relocation is available.'
    : team.capSpace < cheapest
      ? `Need at least $${cheapest}M in cap space to fund the move.`
      : 'You need 3 seasons played and 5 quiet years since the last relocation.';

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Franchise Relocation"
        subtitle={`${team.city} ${team.name} // ${reason}`}
        badges={(
          <>
            <PixelBadge variant={canRelocate ? 'green' : 'red'}>{canRelocate ? 'ELIGIBLE' : 'BLOCKED'}</PixelBadge>
            <PixelBadge variant="gold">${team.capSpace.toFixed(1)}M CAP</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(260)}>
        {destinations.map((destination) => {
          const active = selected?.abbr === destination.abbr;
          return (
            <button
              key={destination.abbr}
              type="button"
              onClick={() => setSelectedId(destination.abbr)}
              style={{
                textAlign: 'left',
                background: active ? 'var(--mfd-bg-3)' : 'var(--mfd-bg-2)',
                border: `3px solid ${active ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)'}`,
                color: 'var(--mfd-text)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    {destination.city.toUpperCase()}
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                    {destination.teamName} // {destination.abbr}
                  </div>
                </div>
                <PixelBadge variant="gold">${destination.cost}M</PixelBadge>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <PixelBadge variant="cyan">{destination.marketSize.toUpperCase()}</PixelBadge>
                <PixelBadge variant="green">Fanbase {destination.fanbaseStart}</PixelBadge>
                <PixelBadge variant="gold">Prestige +{destination.prestigeBonus}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>{destination.description}</div>
            </button>
          );
        })}
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Impact Preview" accent={canRelocate ? 'gold' : 'red'}>
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <DetailStripe label="Current Brand" value={`${team.city} ${team.name}`} accent="cyan" />
              <DetailStripe label="Destination" value={`${selected.city} ${selected.teamName}`} accent="gold" />
              <DetailStripe label="Chemistry Hit" value="-3 to -8 per player" accent="red" />
              <DetailStripe label="Morale Hit" value="-2 to -5 per player" accent="red" />
              <DetailStripe label="Stadium Reset" value="Level 1 / generic venue" accent="cyan" />
              <DetailStripe label="Prestige Shift" value={`+${selected.prestigeBonus}`} accent="green" />
              <DetailStripe label="Fresh Fanbase" value={`${selected.fanbaseStart} starting support`} accent="green" />
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Select a destination to preview the move.</div>
          )}
        </PixelPanel>

        <PixelPanel title="Relocation Decision" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              League year {year}. This move rewrites the franchise identity, resets the stadium, and tests locker-room loyalty immediately.
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <PixelButton accent="green" disabled={!canRelocate || !selected} onClick={() => setConfirmOpen(true)}>
                Confirm Relocation
              </PixelButton>
              <PixelButton accent="default" onClick={() => navigateTo('/franchise')}>
                Cancel
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      </div>

      <PixelModal open={confirmOpen} onOpenChange={setConfirmOpen} title="Confirm Franchise Move">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            {selected
              ? `Relocate ${team.city} ${team.name} to ${selected.city} ${selected.teamName}? The locker room will take an immediate morale and chemistry hit.`
              : 'Select a relocation destination first.'}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <PixelButton
              accent="red"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                setConfirmOpen(false);
                void relocateTeam(selected.abbr);
              }}
            >
              Move Franchise
            </PixelButton>
            <PixelButton accent="default" onClick={() => setConfirmOpen(false)}>
              Back Out
            </PixelButton>
          </div>
        </div>
      </PixelModal>
    </div>
  );
}
