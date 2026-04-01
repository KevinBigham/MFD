import { useState } from 'react';
import {
  MfdPanel, MfdBadge, MfdDialog,
} from '@mfd/design-system/components';
import {
  Users, ChevronDown, ChevronUp, AlertTriangle,
  Shield, Zap,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────

interface DepthPlayer {
  id: string;
  name: string;
  ovr: number;
  pot: number;
  age: number;
  dev: string;
  fit: string;
  injury?: string;
}

interface PositionSlot {
  pos: string;
  side: 'OFF' | 'DEF' | 'ST';
  starters: number;
  players: DepthPlayer[];
}

// ── Mock Depth Data ───────────────────────────────────

function mockPlayers(pos: string, count: number): DepthPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${pos}-${i}`,
    name: `${pos} Player ${i + 1}`,
    ovr: 88 - i * 6 - Math.floor(Math.random() * 4),
    pot: 85 - i * 3,
    age: 24 + i * 2,
    dev: i === 0 ? 'Superstar' : i === 1 ? 'Star' : 'Normal',
    fit: i < 2 ? 'A' : 'B',
    injury: i === 2 && pos === 'CB' ? 'Hamstring (2 weeks)' : undefined,
  }));
}

const OFFENSE_SLOTS: PositionSlot[] = [
  { pos: 'QB', side: 'OFF', starters: 1, players: mockPlayers('QB', 3) },
  { pos: 'RB', side: 'OFF', starters: 1, players: mockPlayers('RB', 4) },
  { pos: 'WR1', side: 'OFF', starters: 1, players: mockPlayers('WR1', 3) },
  { pos: 'WR2', side: 'OFF', starters: 1, players: mockPlayers('WR2', 3) },
  { pos: 'WR3', side: 'OFF', starters: 1, players: mockPlayers('WR3', 2) },
  { pos: 'TE', side: 'OFF', starters: 1, players: mockPlayers('TE', 3) },
  { pos: 'LT', side: 'OFF', starters: 1, players: mockPlayers('LT', 2) },
  { pos: 'LG', side: 'OFF', starters: 1, players: mockPlayers('LG', 2) },
  { pos: 'C', side: 'OFF', starters: 1, players: mockPlayers('C', 2) },
  { pos: 'RG', side: 'OFF', starters: 1, players: mockPlayers('RG', 2) },
  { pos: 'RT', side: 'OFF', starters: 1, players: mockPlayers('RT', 2) },
];

const DEFENSE_SLOTS: PositionSlot[] = [
  { pos: 'EDGE1', side: 'DEF', starters: 1, players: mockPlayers('EDGE1', 3) },
  { pos: 'EDGE2', side: 'DEF', starters: 1, players: mockPlayers('EDGE2', 3) },
  { pos: 'DT1', side: 'DEF', starters: 1, players: mockPlayers('DT1', 3) },
  { pos: 'DT2', side: 'DEF', starters: 1, players: mockPlayers('DT2', 2) },
  { pos: 'MLB', side: 'DEF', starters: 1, players: mockPlayers('MLB', 3) },
  { pos: 'OLB1', side: 'DEF', starters: 1, players: mockPlayers('OLB1', 2) },
  { pos: 'OLB2', side: 'DEF', starters: 1, players: mockPlayers('OLB2', 2) },
  { pos: 'CB1', side: 'DEF', starters: 1, players: mockPlayers('CB1', 3) },
  { pos: 'CB2', side: 'DEF', starters: 1, players: mockPlayers('CB2', 3) },
  { pos: 'FS', side: 'DEF', starters: 1, players: mockPlayers('FS', 2) },
  { pos: 'SS', side: 'DEF', starters: 1, players: mockPlayers('SS', 2) },
];

const BATTLES = [
  { pos: 'RB', p1: 'RB Player 1 (84 OVR)', p2: 'RB Player 2 (80 OVR)', reason: 'Close overall gap, younger challenger' },
  { pos: 'WR3', p1: 'WR3 Player 1 (76 OVR)', p2: 'WR3 Player 2 (73 OVR)', reason: 'High-potential backup pushing for snaps' },
];

export function DepthChart() {
  const [side, setSide] = useState<'OFF' | 'DEF'>('OFF');
  const [selectedSlot, setSelectedSlot] = useState<PositionSlot | null>(null);

  const slots = side === 'OFF' ? OFFENSE_SLOTS : DEFENSE_SLOTS;

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
      {BATTLES.length > 0 && (
        <MfdPanel title="Position Battles" icon={<AlertTriangle size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {BATTLES.map((b) => (
              <div key={b.pos} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-xs)',
                borderBottom: '1px solid var(--mfd-border)',
              }}>
                <MfdBadge variant="warning">{b.pos}</MfdBadge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem' }}>
                    {b.p1} vs {b.p2}
                  </div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)',
                  }}>{b.reason}</div>
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
          const starter = slot.players[0];
          const hasInjury = slot.players.some((p) => p.injury);
          return (
            <button
              key={slot.pos}
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
                <MfdBadge variant={side === 'OFF' ? 'info' : 'danger'}>{slot.pos}</MfdBadge>
                <span style={{
                  fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                  color: 'var(--mfd-text-dim)',
                }}>{slot.players.length} deep</span>
              </div>
              {starter && (
                <div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                    fontWeight: 600, color: 'var(--mfd-text)',
                  }}>
                    {starter.name}
                  </div>
                  <div style={{
                    display: 'flex', gap: 'var(--mfd-sp-xs)', marginTop: 2,
                  }}>
                    <span style={{
                      fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                      color: starter.ovr >= 85 ? 'var(--mfd-green)' : 'var(--mfd-text-dim)',
                      fontWeight: 600,
                    }}>{starter.ovr} OVR</span>
                    <span style={{
                      fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                      color: 'var(--mfd-text-dim)',
                    }}>Fit: {starter.fit}</span>
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
        title={selectedSlot ? `${selectedSlot.pos} Depth` : 'Position'}
      >
        {selectedSlot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {selectedSlot.players.map((p, idx) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-sm)',
                background: idx === 0 ? 'var(--mfd-bg-3)' : 'var(--mfd-bg-2)',
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
                    fontWeight: idx === 0 ? 600 : 400,
                  }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', marginTop: 2 }}>
                    <MfdBadge variant={p.ovr >= 85 ? 'success' : 'default'}>{p.ovr} OVR</MfdBadge>
                    <MfdBadge variant="info">{p.pot} POT</MfdBadge>
                    <MfdBadge variant="default">Age {p.age}</MfdBadge>
                    {p.injury && <MfdBadge variant="danger">{p.injury}</MfdBadge>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {idx > 0 && (
                    <button style={{
                      padding: '4px', background: 'var(--mfd-bg-3)',
                      border: '1px solid var(--mfd-border)',
                      borderRadius: 'var(--mfd-rad-sm)', cursor: 'pointer',
                      color: 'var(--mfd-text-dim)',
                    }}>
                      <ChevronUp size={12} />
                    </button>
                  )}
                  {idx < selectedSlot.players.length - 1 && (
                    <button style={{
                      padding: '4px', background: 'var(--mfd-bg-3)',
                      border: '1px solid var(--mfd-border)',
                      borderRadius: 'var(--mfd-rad-sm)', cursor: 'pointer',
                      color: 'var(--mfd-text-dim)',
                    }}>
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
