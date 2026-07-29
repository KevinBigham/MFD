import { useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelModal,
  PixelPanel,
  PixelSelect,
} from '@mfd/design-system/components';
import { AlertTriangle } from 'lucide-react';
import type {
  Player,
  Position,
  PositionBattle,
  SpecialTeamsState,
} from '@mfd/engine';
import { STARTER_SLOTS, detectPositionBattles } from '@mfd/engine';
import {
  useGameStore, selectRoster, selectSpecialTeams, selectUserTeamId,
} from '../../app/store/game-store';
import {
  type DepthChartStarterReadout,
} from '../../lib/depth-chart-starters';
import {
  PixelMetricCard,
  PixelScreenHeader,
  CommandCallout,
  PlayerNameLink,
  autoGrid,
  display,
  monoSm,
  navigateTo,
  pixel,
  screenStackStyle,
} from '../shared/pixelUi';

interface PositionSlot {
  label: string;
  positions: Position[];
  side: 'OFF' | 'DEF';
}

type SourceAccent = 'default' | 'gold' | 'cyan' | 'green';

interface DepthChartSourceRow {
  id: string;
  label: string;
  badge: string;
  accent: SourceAccent;
  detail: string;
}

type FormationStarterRoom = {
  position: Position;
  marked: number;
  target: number;
  missing: number;
  extra: number;
};

interface FormationStarterReadout extends DepthChartStarterReadout {
  extra: number;
  openRooms: FormationStarterRoom[];
  overfilledRooms: FormationStarterRoom[];
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

export function getFormationStarterReadout(roster: Player[]): FormationStarterReadout {
  const rooms = (Object.entries(STARTER_SLOTS) as Array<[Position, number]>).map(([position, target]) => {
    const marked = roster.filter((player) => player.pos === position && player.isStarter).length;
    return {
      position,
      marked,
      target,
      missing: Math.max(0, target - marked),
      extra: Math.max(0, marked - target),
    };
  });
  const marked = rooms.reduce((sum, room) => sum + room.marked, 0);
  const target = rooms.reduce((sum, room) => sum + room.target, 0);
  const missing = rooms.reduce((sum, room) => sum + room.missing, 0);
  const extra = rooms.reduce((sum, room) => sum + room.extra, 0);

  return {
    marked,
    target,
    missing,
    extra,
    complete: missing === 0 && extra === 0,
    openRooms: rooms.filter((room) => room.missing > 0),
    overfilledRooms: rooms.filter((room) => room.extra > 0),
  };
}

function starterShapeSummary(readout: FormationStarterReadout): string {
  const open = readout.openRooms.slice(0, 3).map((room) => `${room.position} -${room.missing}`).join(' / ');
  const extra = readout.overfilledRooms.slice(0, 3).map((room) => `${room.position} +${room.extra}`).join(' / ');
  if (open && extra) return `${open}; trim ${extra}`;
  if (open) return `Open rooms: ${open}`;
  if (extra) return `Too many starters: ${extra}`;
  return 'All starter rooms match the engine formation shape.';
}

export function buildDepthChartSourceRows(
  roster: Player[],
  battles: PositionBattle[],
  specialTeams: SpecialTeamsState,
): DepthChartSourceRow[] {
  const starterReadout = getFormationStarterReadout(roster);
  const assignedReturners = Number(Boolean(specialTeams.kickReturner)) + Number(Boolean(specialTeams.puntReturner));

  return [
    {
      id: 'active-roster',
      label: 'Active roster',
      badge: `${roster.length} players`,
      accent: 'cyan',
      detail: 'Room cards show the active roster, putting current starters ahead of rating order so the board matches the saved lineup.',
    },
    {
      id: 'starter-flags',
      label: 'Starter shape',
      badge: starterReadout.complete
        ? `${starterReadout.target}/${starterReadout.target} legal`
        : `${starterReadout.missing} open / ${starterReadout.extra} extra`,
      accent: starterReadout.complete ? 'green' : 'gold',
      detail: `Promote and backup buttons update starter tags. The board checks the engine starter shape by position: ${starterShapeSummary(starterReadout)}.`,
    },
    {
      id: 'battle-model',
      label: 'Battle model',
      badge: `${battles.length} battles`,
      accent: battles.length > 0 ? 'gold' : 'green',
      detail: 'Battle rows are scouting guidance from ratings and starter tags. Opening the route does not save battle receipts.',
    },
    {
      id: 'special-teams',
      label: 'Special teams',
      badge: `${assignedReturners}/2 returners`,
      accent: assignedReturners >= 2 ? 'green' : 'gold',
      detail: 'Returner lanes show the current special-teams card. Dropdowns are the only returner commits here.',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      badge: 'display only',
      accent: 'default',
      detail: 'Opening Depth Chart does not change the lineup. Use Recommended is the explicit one-click commit for starters and special teams; it does not play games, distribute snaps, change contracts, or write player history.',
    },
  ];
}

function battleDescription(battle: PositionBattle): string {
  const { incumbent: inc, challenger: ch } = battle;
  if (battle.battleType === 'starter_boundary') {
    return `Competing for the ${battle.slotLabel}. ${ch.isStarter ? 'Both currently starting.' : `${ch.name} (backup) pushing for a starting role.`}`;
  }
  if (battle.battleType === 'backup_push') {
    return `${ch.name} (age ${ch.age}, ${ch.pot} pot) is a young backup threatening ${inc.name}'s starter job.`;
  }
  return `${inc.ovr - ch.ovr <= 2 ? 'Dead heat' : 'Tight race'} for the starting job. Preseason reps should decide it.`;
}

function BattleRow({ battle }: { battle: PositionBattle }) {
  const { incumbent: inc, challenger: ch } = battle;
  const typeColor = battle.battleType === 'starter_boundary' ? 'var(--mfd-gold)'
    : battle.battleType === 'backup_push' ? 'var(--mfd-cyan)' : 'var(--mfd-green)';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      paddingBottom: '10px', borderBottom: '1px solid #1a1a1a',
    }}>
      <AlertTriangle size={14} style={{ color: typeColor, flexShrink: 0, marginTop: '2px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">{battle.slotLabel}</PixelBadge>
          {battle.battleType === 'backup_push' && <PixelBadge variant="cyan">HIGH POT</PixelBadge>}
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
            {inc.name} ({inc.ovr}) <span style={{ color: inc.isStarter ? 'var(--mfd-green)' : 'var(--mfd-text-dim)' }}>{inc.isStarter ? 'STR' : 'BKP'}</span>
          </span>
          <span style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>vs</span>
          <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
            {ch.name} ({ch.ovr}) <span style={{ color: ch.isStarter ? 'var(--mfd-green)' : 'var(--mfd-text-dim)' }}>{ch.isStarter ? 'STR' : 'BKP'}</span>
          </span>
        </div>
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: '1.5' }}>
          {battleDescription(battle)}
        </span>
      </div>
    </div>
  );
}

export function DepthChart() {
  const roster = useGameStore(selectRoster);
  const teamId = useGameStore(selectUserTeamId);
  const specialTeams = useGameStore(selectSpecialTeams);
  const {
    setStarter,
    applyRecommendedDepthChart,
    assignKickReturner,
    assignPuntReturner,
  } = useGameStore((state) => state.actions);

  const [side, setSide] = useState<'OFF' | 'DEF'>('OFF');
  const [selectedSlot, setSelectedSlot] = useState<PositionSlot | null>(null);
  const [recommendationApplied, setRecommendationApplied] = useState(false);

  const slots = side === 'OFF' ? OFFENSE_SLOTS : DEFENSE_SLOTS;
  const battles = useMemo(() => detectPositionBattles(roster), [roster]);
  const starterReadout = getFormationStarterReadout(roster);
  const injuryCount = roster.filter((player) => player.injury).length;
  const sourceRows = buildDepthChartSourceRows(roster, battles, specialTeams);

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
  const handleUseRecommended = () => {
    if (!teamId) return;
    void (async () => {
      await applyRecommendedDepthChart(teamId);
      setRecommendationApplied(true);
    })();
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Depth Chart"
        subtitle="Set starters, monitor competition, and keep every position room broadcast-ready."
        badges={(
          <>
            <PixelBadge variant={starterReadout.complete ? 'green' : 'gold'}>{starterReadout.marked}/{starterReadout.target} starters</PixelBadge>
            <PixelBadge variant={injuryCount > 0 ? 'red' : 'green'}>{injuryCount} injuries</PixelBadge>
            {recommendationApplied ? <PixelBadge variant="green">Recommended applied</PixelBadge> : null}
          </>
        )}
      />

      <CommandCallout
        title={!starterReadout.complete ? 'Set legal starter shape' : battles.length > 0 ? 'Settle the live battles' : 'Confirm return roles'}
        body={!starterReadout.complete
          ? `${starterReadout.marked}/${starterReadout.target} starter tags are marked. ${starterShapeSummary(starterReadout)}. Use the room toggles to fit the engine formation before Advance Week.`
          : battles.length > 0
            ? `${battles.length} room${battles.length === 1 ? '' : 's'} still have a live competition. Pick the battle before changing the whole board.`
            : 'The first unit is set. Check special teams, then carry the lineup into weekly prep.'}
        accent={!starterReadout.complete ? 'red' : battles.length > 0 ? 'gold' : 'green'}
        meta={(
          <>
            <PixelBadge variant={starterReadout.complete ? 'green' : 'gold'}>{starterReadout.marked}/{starterReadout.target} starter shape</PixelBadge>
            {!starterReadout.complete ? <PixelBadge variant="red">{starterReadout.missing} open / {starterReadout.extra} extra</PixelBadge> : null}
            <PixelBadge variant={battles.length > 0 ? 'gold' : 'green'}>{battles.length} battles</PixelBadge>
          </>
        )}
        actions={[
          { label: 'Use Recommended', accent: 'green', onClick: handleUseRecommended },
          { label: 'Offense Rooms', accent: 'cyan', onClick: () => setSide('OFF') },
          { label: 'Defense Rooms', accent: 'green', onClick: () => setSide('DEF') },
          { label: 'Open Plan', accent: 'gold', onClick: () => navigateTo('/game-plan') },
        ]}
      />

      <PixelPanel title="Depth Chart Sources" accent="cyan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
          {sourceRows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
                <PixelBadge variant={row.accent}>{row.badge}</PixelBadge>
              </div>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {row.detail}
              </span>
            </div>
          ))}
        </div>
      </PixelPanel>

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
              <BattleRow key={`${battle.pos}-${battle.incumbent.id}-${battle.challenger.id}`} battle={battle} />
            ))}
          </div>
        </PixelPanel>
      ) : null}

      <div style={autoGrid(220)} data-spotlight-target="chip.route.depth-chart.beat-1">
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
                    <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', lineHeight: 1 }}>
                      {starter.name}
                    </span>
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

      <div data-spotlight-target="chip.route.depth-chart.beat-2">
        <PixelPanel title="Special Teams" accent="gold">
          <div style={autoGrid(260)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ ...monoSm, color: '#fff' }}>Kick Returner</div>
              <PixelSelect
                aria-label="Kick returner"
                value={specialTeams.kickReturner ?? ''}
                onChange={(event) => {
                  if (!teamId || !event.target.value) return;
                  setRecommendationApplied(false);
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
                  setRecommendationApplied(false);
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
      </div>

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
                        setRecommendationApplied(false);
                        void setStarter(teamId, player.id, true);
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
                        setRecommendationApplied(false);
                        void setStarter(teamId, player.id, false);
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
