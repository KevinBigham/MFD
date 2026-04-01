import { useState, useMemo, useCallback } from 'react';
import {
  MfdPanel, MfdBadge, MfdDialog,
} from '@mfd/design-system/components';
import {
  Users, ChevronDown, ChevronUp, AlertTriangle,
  Shield, Zap,
} from 'lucide-react';
import type { Player, Position } from '@mfd/engine';
import { detectPositionBattles } from '@mfd/engine';
import {
  useGameStore, selectRoster, selectUserTeamId,
} from '../../app/store/game-store';

// ── Position slot groupings ────────────────────────────────

interface PositionSlot {
  label: string;
  positions: Position[];
  side: 'OFF' | 'DEF';
}

const OFFENSE_SLOTS: PositionSlot[] = [
  { label: 'QB', positions: ['QB'], side: 'OFF' },
  { label: 'RB', positions: ['RB'], side: 'OFF' },
  { label: 'WR', positions: ['WR'], side: 'OFF' },
  { label: 'TE', positions: ['TE'], side: 'OFF' },
  { label: 'OL', positions: ['OL'], side: 'OFF' },
];

const DEFENSE_SLOTS: PositionSlot[] = [
  { label: 'DL', positions: ['DL'], side: 'DEF' },
  { label: 'LB', positions: ['LB'], side: 'DEF' },
  { label: 'CB', positions: ['CB'], side: 'DEF' },
  { label: 'S', positions: ['S'], side: 'DEF' },
];

export function DepthChart() {
  const roster = useGameStore(selectRoster);
  const teamId = useGameStore(selectUserTeamId);
  const { setStarter } = useGameStore((s) => s.actions);

  const [side, setSide] = useState<'OFF' | 'DEF'>('OFF');
  const [selectedSlot, setSelectedSlot] = useState<PositionSlot | null>(null);

  const slots = side === 'OFF' ? OFFENSE_SLOTS : DEFENSE_SLOTS;

  // Group roster by position slots
  const slotPlayers = useMemo(() => {
    const map = new Map<string, Player[]>();
    for (const slot of [...OFFENSE_SLOTS, ...DEFENSE_SLOTS]) {
      const players = roster
        .filter((p) => slot.positions.includes(p.pos))
        .sort((a, b) => {
          if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
          return b.ovr - a.ovr;
        });
      map.set(slot.label, players);
    }
    return map;
  }, [roster]);

  // Position battles from engine
  const battles = useMemo(() => detectPositionBattles(roster), [roster]);

  const handlePromote = useCallback((player: Player) => {
    if (!teamId) return;
    setStarter(teamId, player.id, true);
  }, [teamId, setStarter]);

  const handleDemote = useCallback((player: Player) => {
    if (!teamId) return;
    setStarter(teamId, player.id, false);
  }, [teamId, setStarter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>Depth Chart</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          Set starters, manage position battles, review depth
        </p>
      </div>

      {/* Side Toggle */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['OFF', 'DEF'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', fontSize: '0.75rem',
              fontFamily: 'var(--mfd-font-mono)',
              color: side === s ? 'var(--mfd-bg)' : 'var(--mfd-text-dim)',
              background: side === s ? (s === 'OFF' ? 'var(--mfd-cyan)' : 'var(--mfd-red)') : 'var(--mfd-bg-2)',
              border: '1px solid var(--mfd-border)',
              borderRadius: 'var(--mfd-rad-md)',
              cursor: 'pointer',
            }}
          >
            {s === 'OFF' ? <Zap size={12} /> : <Shield size={12} />}
            {s === 'OFF' ? 'Offense' : 'Defense'}
          </button>
        ))}
      </div>

      {/* Position Battles */}
      {battles.length > 0 && (
        <MfdPanel title="Position Battles" icon={<AlertTriangle size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {battles.map((b) => (
              <div key={b.pos} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-xs)',
                borderBottom: '1px solid var(--mfd-border)',
              }}>
                <MfdBadge variant="warning">{b.pos}</MfdBadge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem' }}>
                    {b.incumbent.name} ({b.incumbent.ovr} OVR) vs {b.challenger.name} ({b.challenger.ovr} OVR)
                  </div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)',
                  }}>Close overall gap — position battle active</div>
                </div>
              </div>
            ))}
          </div>
        </MfdPanel>
      )}

      {/* Depth Slots Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--mfd-sp-md)',
      }}>
        {slots.map((slot) => {
          const players = slotPlayers.get(slot.label) ?? [];
          const starter = players[0];
          const hasInjury = players.some((p) => p.injury);
          return (
            <button
              key={slot.label}
              onClick={() => setSelectedSlot(slot)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-xs)',
                padding: 'var(--mfd-sp-md)',
                background: 'var(--mfd-bg-2)',
                border: `1px solid ${hasInjury ? 'var(--mfd-amber)' : 'var(--mfd-border)'}`,
                borderRadius: 'var(--mfd-rad-md)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <MfdBadge variant={side === 'OFF' ? 'info' : 'danger'}>{slot.label}</MfdBadge>
                <span style={{
                  fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                  color: 'var(--mfd-text-dim)',
                }}>{players.length} deep</span>
              </div>
              {starter && (
                <div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                    fontWeight: 600, color: 'var(--mfd-text)',
                  }}>
                    {starter.name}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', marginTop: 2 }}>
                    <span style={{
                      fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                      color: starter.ovr >= 85 ? 'var(--mfd-green)' : 'var(--mfd-text-dim)',
                      fontWeight: 600,
                    }}>{starter.ovr} OVR</span>
                    <span style={{
                      fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                      color: 'var(--mfd-text-dim)',
                    }}>Fit: {starter.systemFit >= 80 ? 'A' : starter.systemFit >= 60 ? 'B' : 'C'}</span>
                  </div>
                </div>
              )}
              {hasInjury && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <AlertTriangle size={10} style={{ color: 'var(--mfd-amber)' }} />
                  <span style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem',
                    color: 'var(--mfd-amber)',
                  }}>Injury in depth</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Position Detail Dialog */}
      <MfdDialog
        open={!!selectedSlot}
        onOpenChange={(open) => { if (!open) setSelectedSlot(null); }}
        title={selectedSlot ? `${selectedSlot.label} Depth` : 'Position'}
      >
        {selectedSlot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {(slotPlayers.get(selectedSlot.label) ?? []).map((p, idx) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-sm)',
                background: p.isStarter ? 'var(--mfd-bg-3)' : 'var(--mfd-bg-2)',
                border: '1px solid var(--mfd-border)',
                borderRadius: 'var(--mfd-rad-md)',
              }}>
                <span style={{
                  fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                  color: 'var(--mfd-text-dim)', width: 20,
                }}>#{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                    fontWeight: p.isStarter ? 600 : 400,
                  }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', marginTop: 2 }}>
                    <MfdBadge variant={p.ovr >= 85 ? 'success' : 'default'}>{p.ovr} OVR</MfdBadge>
                    <MfdBadge variant="info">{p.pot} POT</MfdBadge>
                    <MfdBadge variant="default">Age {p.age}</MfdBadge>
                    {p.injury && <MfdBadge variant="danger">{p.injury.type}</MfdBadge>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {!p.isStarter && (
                    <button
                      onClick={() => handlePromote(p)}
                      style={{
                        padding: '4px', background: 'var(--mfd-bg-3)',
                        border: '1px solid var(--mfd-border)',
                        borderRadius: 'var(--mfd-rad-sm)', cursor: 'pointer',
                        color: 'var(--mfd-text-dim)',
                      }}
                    >
                      <ChevronUp size={12} />
                    </button>
                  )}
                  {p.isStarter && (
                    <button
                      onClick={() => handleDemote(p)}
                      style={{
                        padding: '4px', background: 'var(--mfd-bg-3)',
                        border: '1px solid var(--mfd-border)',
                        borderRadius: 'var(--mfd-rad-sm)', cursor: 'pointer',
                        color: 'var(--mfd-text-dim)',
                      }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </MfdDialog>
    </div>
  );
}
