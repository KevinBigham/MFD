import { useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelModal,
  PixelPanel,
  PixelSelect,
} from '@mfd/design-system/components';
import { AlertTriangle } from 'lucide-react';
import type { Player, Position } from '@mfd/engine';
import { detectPositionBattles } from '@mfd/engine';
import {
  useGameStore, selectRoster, selectSpecialTeams, selectUserTeamId,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  display,
  monoSm,
  pixel,
  screenStackStyle,
} from '../shared/pixelUi';

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
  const specialTeams = useGameStore(selectSpecialTeams);
  const { setStarter, assignKickReturner, assignPuntReturner } = useGameStore((state) => state.actions);

  const [side, setSide] = useState<'OFF' | 'DEF'>('OFF');
  const [selectedSlot, setSelectedSlot] = useState<PositionSlot | null>(null);

  const slots = side === 'OFF' ? OFFENSE_SLOTS : DEFENSE_SLOTS;
  const battles = useMemo(() => detectPositionBattles(roster), [roster]);
  const starters = roster.filter((player) => player.isStarter).length;
  const injuryCount = roster.filter((player) => player.injury).length;

  const slotPlayers = useMemo(() => {
    const map = new Map<string, Player[]>();
    for (const slot of [...OFFENSE_SLOTS, ...DEFENSE_SLOTS]) {
      const players = roster
        .filter((player) => slot.positions.includes(player.pos))
        .sort((a, b) => {
          if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
          return b.ovr - a.ovr;
        });
      map.set(slot.label, players);
    }
    return map;
  }, [roster]);

  const selectedPlayers = selectedSlot ? slotPlayers.get(selectedSlot.label) ?? [] : [];
  const eligibleReturners = roster
    .filter((player) => (player.pos === 'RB' || player.pos === 'WR') && (player.ratings.speed ?? player.ovr) > 75)
    .sort((a, b) => (b.ratings.speed ?? b.ovr) - (a.ratings.speed ?? a.ovr) || b.ovr - a.ovr);
  const kickReturner = roster.find((player) => player.id === specialTeams.kickReturner) ?? null;
  const puntReturner = roster.find((player) => player.id === specialTeams.puntReturner) ?? null;
  const longSnapper = roster.find((player) => player.id === specialTeams.longSnapper) ?? null;
  const kicker = roster.find((player) => player.pos === 'K') ?? null;
  const punter = roster.find((player) => player.pos === 'P') ?? null;
  const kickerAccuracy = kicker
    ? `SR ${Math.round(kicker.ratings.shortRange ?? kicker.ovr)} // MR ${Math.round(kicker.ratings.medRange ?? kicker.ovr - 5)} // LR ${Math.round(kicker.ratings.longRange ?? kicker.ovr - 10)}`
    : 'No kicker on roster';
  const punterNetAverage = punter ? (35 + ((punter.ovr ?? 70) - 60) * 0.25).toFixed(1) : '--';

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Depth Chart"
        subtitle="Set starters, monitor competition, and keep every position room broadcast-ready."
        badges={(
          <>
            <PixelBadge variant="gold">{starters} starters</PixelBadge>
            <PixelBadge variant={injuryCount > 0 ? 'red' : 'green'}>{injuryCount} injuries</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Open Battles" value={battles.length} accent={battles.length > 0 ? 'gold' : 'green'} detail="Roster spots still up for grabs" />
        <PixelMetricCard label="Offense Rooms" value={OFFENSE_SLOTS.length} accent="cyan" detail="Skill groups and trench depth" />
        <PixelMetricCard label="Defense Rooms" value={DEFENSE_SLOTS.length} accent="red" detail="Front seven plus back-end rotation" />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <PixelButton type="button" accent={side === 'OFF' ? 'cyan' : 'default'} onClick={() => setSide('OFF')}>
          Offense
        </PixelButton>
        <PixelButton type="button" accent={side === 'DEF' ? 'red' : 'default'} onClick={() => setSide('DEF')}>
          Defense
        </PixelButton>
      </div>

      {battles.length > 0 ? (
        <PixelPanel title="Position Battles" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {battles.map((battle) => (
              <div
                key={battle.pos}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #1a1a1a',
                }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--mfd-gold)', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="gold">{battle.pos}</PixelBadge>
                    <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                      {battle.incumbent.name} ({battle.incumbent.ovr}) vs {battle.challenger.name} ({battle.challenger.ovr})
                    </span>
                  </div>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    Tight overall range. Practice reps and preseason usage should decide it.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

      <div style={autoGrid(220)}>
        {slots.map((slot) => {
          const players = slotPlayers.get(slot.label) ?? [];
          const starter = players[0] ?? null;
          const injuryInRoom = players.some((player) => player.injury);
          return (
            <button
              key={slot.label}
              type="button"
              data-mfd-focusable="depth-slot"
              onClick={() => setSelectedSlot(slot)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '100%',
                padding: '14px',
                border: `3px solid ${injuryInRoom ? 'var(--mfd-red)' : slot.side === 'OFF' ? 'var(--mfd-cyan)' : 'var(--mfd-green)'}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.3) 100%)',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: 'var(--mfd-shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <PixelBadge variant={slot.side === 'OFF' ? 'cyan' : 'green'}>{slot.label}</PixelBadge>
                <span style={{ ...pixel, color: 'var(--mfd-text-faint)' }}>{players.length} DEEP</span>
              </div>
              <div>
                <div style={{ ...display, fontSize: '24px', color: '#fff', lineHeight: 1 }}>
                  {starter ? (
                    <PlayerNameLink playerId={starter.id} name={starter.name} ovr={starter.ovr} style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', lineHeight: 1 }} />
                  ) : 'OPEN'}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                  {starter ? `${starter.ovr} OVR // ${starter.pot} POT // AGE ${starter.age}` : 'No eligible players'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant={starter?.isStarter ? 'gold' : 'default'}>{starter?.isStarter ? 'Starter Locked' : 'Rotation'}</PixelBadge>
                {injuryInRoom ? <PixelBadge variant="red">Injury Watch</PixelBadge> : null}
              </div>
            </button>
          );
        })}
      </div>

      <PixelPanel title="Special Teams" accent="gold">
        <div style={autoGrid(260)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: '#fff' }}>Kick Returner</div>
            <PixelSelect
              aria-label="Kick returner"
              value={specialTeams.kickReturner ?? ''}
              onChange={(event) => {
                if (!teamId || !event.target.value) return;
                void assignKickReturner(teamId, event.target.value);
              }}
              options={eligibleReturners.length > 0
                ? eligibleReturners.map((player) => ({
                  value: player.id,
                  label: `${player.name} // SPD ${Math.round(player.ratings.speed ?? player.ovr)}`,
                }))
                : [{ value: '', label: 'No eligible returners', disabled: true }]}
              accent="gold"
            />
            <div style={{ ...monoSm, color: '#999' }}>
              {kickReturner
                ? `${kickReturner.name} // speed ${Math.round(kickReturner.ratings.speed ?? kickReturner.ovr)}`
                : 'Assign your best burst threat.'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: '#fff' }}>Punt Returner</div>
            <PixelSelect
              aria-label="Punt returner"
              value={specialTeams.puntReturner ?? ''}
              onChange={(event) => {
                if (!teamId || !event.target.value) return;
                void assignPuntReturner(teamId, event.target.value);
              }}
              options={eligibleReturners.length > 0
                ? eligibleReturners.map((player) => ({
                  value: player.id,
                  label: `${player.name} // SPD ${Math.round(player.ratings.speed ?? player.ovr)}`,
                }))
                : [{ value: '', label: 'No eligible returners', disabled: true }]}
              accent="gold"
            />
            <div style={{ ...monoSm, color: '#999' }}>
              {puntReturner
                ? `${puntReturner.name} // speed ${Math.round(puntReturner.ratings.speed ?? puntReturner.ovr)}`
                : 'Punt return role is still open.'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: '#fff' }}>Long Snapper</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="cyan">{longSnapper?.name ?? 'Unassigned'}</PixelBadge>
              {longSnapper ? <PixelBadge variant="default">{longSnapper.pos}</PixelBadge> : null}
            </div>
            <div style={{ ...monoSm, color: '#999' }}>Auto-assigned from the best OL/TE awareness profile.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: '#fff' }}>Kicking Battery</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="green">{kicker ? `${kicker.name} // OVR ${kicker.ovr}` : 'No kicker'}</PixelBadge>
              <PixelBadge variant="cyan">{punter ? `${punter.name} // OVR ${punter.ovr}` : 'No punter'}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              FG accuracy: {kickerAccuracy}
            </div>
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              Net punt average: {punterNetAverage} yards
            </div>
          </div>
        </div>
      </PixelPanel>

      <PixelModal
        open={!!selectedSlot}
        onOpenChange={(open) => { if (!open) setSelectedSlot(null); }}
        title={selectedSlot ? `${selectedSlot.label} Room` : 'Position Room'}
        description={selectedSlot ? `${selectedPlayers.length} players available in the ${selectedSlot.side === 'OFF' ? 'offense' : 'defense'} rotation.` : undefined}
        accent={selectedSlot?.side === 'OFF' ? 'cyan' : 'green'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {selectedPlayers.map((player, index) => (
            <PixelPanel key={player.id} title={`${index + 1}. ${player.name}`} accent={player.isStarter ? 'gold' : 'default'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <PlayerNameLink playerId={player.id} name={player.name} ovr={player.ovr} style={{ ...monoSm, fontSize: '14px' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="cyan">{player.ovr} OVR</PixelBadge>
                  <PixelBadge variant="green">{player.pot} POT</PixelBadge>
                  <PixelBadge variant="default">AGE {player.age}</PixelBadge>
                  {player.injury ? <PixelBadge variant="red">{player.injury.type}</PixelBadge> : null}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  System fit: {player.systemFit} // Current role: {player.isStarter ? 'Starter' : 'Backup'}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!player.isStarter ? (
                    <PixelButton
                      type="button"
                      accent="green"
                      onClick={() => {
                        if (!teamId) return;
                        setStarter(teamId, player.id, true);
                      }}
                    >
                      Promote To Starter
                    </PixelButton>
                  ) : (
                    <PixelButton
                      type="button"
                      accent="red"
                      onClick={() => {
                        if (!teamId) return;
                        setStarter(teamId, player.id, false);
                      }}
                    >
                      Move To Backup
                    </PixelButton>
                  )}
                </div>
              </div>
            </PixelPanel>
          ))}
        </div>
      </PixelModal>
    </div>
  );
}
