import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import type { Player } from '@mfd/engine';
import { getPlayerComparables, getPlayerProjection } from '@mfd/engine';
import { useGameStore } from '../../app/store/game-store';
import { monoSm, pixelSm } from '../shared/pixelUi';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

export interface ComparePlayersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftPlayerId: string | null;
  rightPlayerId?: string | null;
}

export function closeComparePlayers(onOpenChange: (open: boolean) => void): void {
  onOpenChange(false);
}

function traitLabel(trait: string): string {
  return trait.replaceAll('_', ' ');
}

function contractSummary(player: Player): { years: string; cap: string } {
  const years = player.contract?.years ?? 0;
  const capHit = Math.round(((player.contract?.baseSalary ?? 0) + (player.contract?.prorated ?? 0)) * 10) / 10;
  return {
    years: years > 0 ? `${years} yr` : 'FA',
    cap: `$${capHit.toLocaleString('en-US', { maximumFractionDigits: 1 })}M cap`,
  };
}

function playerName(player: Player): string {
  return player.name || `${player.firstName} ${player.lastName}`.trim() || player.id;
}

function traitDiff(left: Player, right: Player): Array<{ label: string; detail: string; accent: Accent }> {
  const leftTraits = new Set(left.traits ?? []);
  const rightTraits = new Set(right.traits ?? []);
  const allTraits = [...new Set([...leftTraits, ...rightTraits])].sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)));

  return allTraits.map((trait) => {
    const inLeft = leftTraits.has(trait);
    const inRight = rightTraits.has(trait);
    if (inLeft && inRight) {
      return { label: traitLabel(trait), detail: 'shared', accent: 'green' };
    }
    return {
      label: traitLabel(trait),
      detail: `${inLeft ? playerName(left) : playerName(right)} only`,
      accent: inLeft ? 'gold' : 'cyan',
    };
  });
}

function PlayerColumn({ player, accent }: { player: Player; accent: Accent }) {
  const contract = contractSummary(player);
  const projection = getPlayerProjection(player);

  return (
    <PixelPanel title={playerName(player)} accent={accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={accent}>OVR {player.ovr}</PixelBadge>
          <PixelBadge variant="cyan">{player.pos}</PixelBadge>
          <PixelBadge variant="default">age {player.age}</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          {player.archetype?.label ?? 'No archetype'} // {player.devTrait ?? 'normal'} dev
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="default">{contract.years}</PixelBadge>
          <PixelBadge variant="gold">{contract.cap}</PixelBadge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
          <div>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>NEXT</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{projection.nextYearOvr}</div>
          </div>
          <div>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>PEAK</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{projection.peakOvr}</div>
          </div>
          <div>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>AGE</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{projection.peakAge}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(player.traits ?? []).slice(0, 6).map((trait) => (
            <PixelBadge key={`${player.id}-${trait}`} variant="default">{traitLabel(trait)}</PixelBadge>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

function ComparePlayersModalContent({
  onOpenChange,
  leftPlayerId,
  rightPlayerId = null,
}: Omit<ComparePlayersModalProps, 'open'>) {
  const game = useGameStore((state) => state.game);
  const players = useMemo(() => Object.values(game?.players ?? {}), [game]);
  const leftPlayer = leftPlayerId ? game?.players[leftPlayerId] ?? null : null;
  const comparables = useMemo(() => (leftPlayer ? getPlayerComparables(leftPlayer, players) : []), [leftPlayer, players]);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(rightPlayerId);
  const activeRightId = selectedRightId ?? rightPlayerId ?? comparables[0]?.id ?? null;
  const rightPlayer = activeRightId ? game?.players[activeRightId] ?? null : null;

  useEffect(() => {
    setSelectedRightId(rightPlayerId);
  }, [leftPlayerId, rightPlayerId]);

  if (!leftPlayer) {
    return (
      <PixelModal
        open
        onOpenChange={onOpenChange}
        title="Compare Players"
        description="Roster comparison"
        accent="red"
        width={760}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PixelPanel title="Comparison unavailable" accent="red">
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Comparison unavailable. Player record not found for {leftPlayerId ?? 'unknown player'}.
            </div>
          </PixelPanel>
          <PixelButton accent="default" onClick={() => closeComparePlayers(onOpenChange)}>Close</PixelButton>
        </div>
      </PixelModal>
    );
  }

  return (
    <PixelModal
      open
      onOpenChange={onOpenChange}
      title="Compare Players"
      description={`${playerName(leftPlayer)} // side-by-side scouting`}
      accent="cyan"
      width={920}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          <PlayerColumn player={leftPlayer} accent="gold" />
          {rightPlayer ? (
            <PlayerColumn player={rightPlayer} accent="cyan" />
          ) : (
            <PixelPanel title="Select Comparison" accent="cyan">
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                Pick a comparable player below to fill the right column.
              </div>
            </PixelPanel>
          )}
        </div>

        {rightPlayer ? (
          <PixelPanel title="Trait Delta" accent="green">
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {traitDiff(leftPlayer, rightPlayer).map((entry) => (
                <PixelBadge key={`${entry.label}-${entry.detail}`} variant={entry.accent}>
                  {entry.label} // {entry.detail}
                </PixelBadge>
              ))}
            </div>
          </PixelPanel>
        ) : null}

        <PixelPanel title="Similar Players" accent="cyan">
          {comparables.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No same-position comparables found.</div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {comparables.map((player) => (
                <PixelButton
                  key={player.id}
                  accent={activeRightId === player.id ? 'gold' : 'cyan'}
                  onClick={() => setSelectedRightId(player.id)}
                >
                  {playerName(player)} // OVR {player.ovr}
                </PixelButton>
              ))}
            </div>
          )}
        </PixelPanel>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          <PixelButton accent="default" onClick={() => closeComparePlayers(onOpenChange)}>Close</PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}

export function ComparePlayersModal(props: ComparePlayersModalProps) {
  if (!props.open) return null;
  return <ComparePlayersModalContent {...props} />;
}
