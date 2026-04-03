import { useState, useMemo, useCallback } from 'react';
import {
  PixelPanel, PixelTable, PixelBadge, PixelModal, PixelNav, PixelButton, PixelSelect,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { Player } from '@mfd/engine';
import { calcCapHit, calculateTrainingXP } from '@mfd/engine';
import {
  useGameStore, selectFreeAgentPlayers, selectPracticeSquad, selectRoster, selectTrainingAssignments, selectUserTeam, selectUserTeamId, selectWaiverWirePlayers,
} from '../../app/store/game-store';
import {
  PixelConsequenceList,
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  mono,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

const trainingFocusOptions = [
  { value: 'film_study', label: 'Film Study' },
  { value: 'position_drills', label: 'Position Drills' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'rest', label: 'Rest' },
];

function TrainingCell({ player }: { player: Player }) {
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const assignments = useGameStore(selectTrainingAssignments);
  const assignTraining = useGameStore((s) => s.actions.assignTraining);

  const assignment = assignments[player.id];
  const focus = assignment?.focus ?? 'film_study';
  const xp = team
    ? calculateTrainingXP(player, focus, team.staff.hc?.ratings?.development ?? 70, player.devTrait)
    : null;
  const mentorshipBonus = focus === 'mentorship' && team?.mentoringPairs.some((pair) => pair.menteeId === player.id || pair.mentorId === player.id);

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}
    >
      <PixelSelect
        value={focus}
        accent={mentorshipBonus ? 'gold' : 'cyan'}
        options={trainingFocusOptions}
        onChange={(event) => {
          if (!teamId) return;
          void assignTraining(teamId, player.id, event.target.value as typeof focus);
        }}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: '#999' }}>
          {xp ? `+${xp.totalXp.toFixed(1)} XP/wk` : '--'}
        </span>
        {mentorshipBonus ? <PixelBadge variant="gold">Mentor Bonus</PixelBadge> : null}
      </div>
    </div>
  );
}

const columns: ColumnDef<Player, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span style={{ fontWeight: 500, color: 'var(--mfd-text)' }}>
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: 'pos',
    header: 'Pos',
    cell: ({ getValue }) => <PixelBadge variant="default">{getValue() as string}</PixelBadge>,
    size: 60,
  },
  {
    accessorKey: 'ovr',
    header: 'OVR',
    cell: ({ getValue }) => {
      const value = getValue() as number;
      const color = value >= 85 ? 'var(--mfd-green)' : value >= 70 ? 'var(--mfd-text)' : 'var(--mfd-text-dim)';
      return <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', color, lineHeight: 1 }}>{value}</span>;
    },
    size: 56,
  },
  {
    accessorKey: 'pot',
    header: 'POT',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', color: 'var(--mfd-cyan)', lineHeight: 1 }}>
        {getValue() as number}
      </span>
    ),
    size: 56,
  },
  {
    accessorKey: 'age',
    header: 'Age',
    size: 44,
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>{getValue() as number}</span>
    ),
  },
  {
    id: 'capHit',
    header: 'Cap Hit',
    cell: ({ row }) => {
      const contract = row.original.contract;
      const hit = contract ? Math.round(calcCapHit(contract) * 10) / 10 : 0;
      return <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>${hit}M</span>;
    },
    size: 78,
  },
  {
    id: 'contract',
    header: 'Contract',
    cell: ({ row }) => {
      const contract = row.original.contract;
      return <span>{contract ? `${contract.years}yr` : 'FA'}</span>;
    },
    size: 74,
  },
  {
    id: 'fit',
    header: 'Fit',
    cell: ({ row }) => {
      const score = row.original.systemFit;
      const tier = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
      const variant = tier === 'A' ? 'green' : tier === 'B' ? 'cyan' : tier === 'C' ? 'gold' : 'red';
      return <PixelBadge variant={variant}>{tier}</PixelBadge>;
    },
    size: 44,
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const value = row.original.isStarter ? 'Starter' : 'Backup';
      return <PixelBadge variant={row.original.isStarter ? 'gold' : 'default'}>{value}</PixelBadge>;
    },
    size: 76,
  },
  {
    accessorKey: 'devTrait',
    header: 'Dev',
    cell: ({ getValue }) => {
      const value = getValue() as string;
      const variant = value === 'x-factor' ? 'red' : value === 'superstar' ? 'gold' : value === 'star' ? 'cyan' : 'default';
      const label = value === 'x-factor' ? 'X-Factor' : value === 'superstar' ? 'Superstar' : value === 'star' ? 'Star' : 'Normal';
      return <PixelBadge variant={variant}>{label}</PixelBadge>;
    },
    size: 90,
  },
  {
    id: 'training',
    header: 'Training',
    cell: ({ row }) => <TrainingCell player={row.original} />,
    size: 190,
  },
];

export function RosterManagement() {
  const roster = useGameStore(selectRoster);
  const practiceSquad = useGameStore(selectPracticeSquad);
  const freeAgents = useGameStore(selectFreeAgentPlayers);
  const teamId = useGameStore(selectUserTeamId);
  const team = useGameStore(selectUserTeam);
  const waiverPlayers = useGameStore(selectWaiverWirePlayers);
  const trainingAssignments = useGameStore(selectTrainingAssignments);
  const playersById = useGameStore((s) => s.game?.players ?? {});
  const {
    addToPracticeSquad,
    assignTraining,
    cutPlayer,
    elevatePracticeSquadPlayer,
    removeFromPracticeSquad,
    restructure,
    submitWaiverClaim,
    toggleTradeBlock,
  } = useGameStore((s) => s.actions);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [posFilter, setPosFilter] = useState<string>('ALL');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];

  const filtered = useMemo(() => {
    if (posFilter === 'ALL') return roster;
    return roster.filter((player) => player.pos === posFilter);
  }, [roster, posFilter]);

  const avgOvr = roster.length > 0
    ? Math.round(roster.reduce((sum, player) => sum + player.ovr, 0) / roster.length)
    : 0;
  const starters = roster.filter((player) => player.isStarter).length;
  const avgAge = roster.length > 0
    ? Math.round(roster.reduce((sum, player) => sum + player.age, 0) / roster.length * 10) / 10
    : 0;
  const playersInTraining = Object.keys(trainingAssignments).length;
  const practiceSquadRows = practiceSquad
    .map((entry) => ({ entry, player: playersById[entry.playerId] }))
    .filter((item): item is { entry: typeof practiceSquad[number]; player: Player } => Boolean(item.player));
  const practiceTargets = freeAgents
    .filter((player) => !waiverPlayers.some((waiverPlayer) => waiverPlayer.id === player.id))
    .slice(0, 8);

  const handleCut = useCallback((player: Player) => {
    if (!teamId) return;
    void cutPlayer(teamId, player.id);
    setSelectedPlayer(null);
  }, [teamId, cutPlayer]);

  const handleTradeBlock = useCallback((player: Player) => {
    if (!teamId) return;
    toggleTradeBlock(teamId, player.id);
  }, [teamId, toggleTradeBlock]);

  const handleRestructure = useCallback((player: Player) => {
    if (!teamId) return;
    restructure(teamId, player.id);
  }, [teamId, restructure]);

  const consequences = useMemo(() => {
    if (!selectedPlayer?.contract || !team) return [];
    const capHit = calcCapHit(selectedPlayer.contract);
    return [
      { id: 'c1', label: 'Cap Hit', delta: `$${Math.round(capHit * 10) / 10}M`, accent: 'red' as const },
      { id: 'c2', label: 'Cap Space', delta: `$${Math.round(team.capSpace * 10) / 10}M`, accent: 'green' as const },
    ];
  }, [selectedPlayer, team]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Roster Management"
        subtitle={`${team ? `${team.city} ${team.name}` : 'No Team'} // ${roster.length} players active`}
        badges={(
          <>
            <PixelBadge variant="gold">{roster.length}/53</PixelBadge>
            <PixelBadge variant="cyan">{starters} starters</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Roster Size" value={`${roster.length}/53`} accent={roster.length > 53 ? 'red' : 'green'} detail="League roster limit" />
        <PixelMetricCard label="Avg OVR" value={avgOvr} accent={avgOvr >= 80 ? 'green' : avgOvr >= 72 ? 'cyan' : 'gold'} detail="Overall team strength" />
        <PixelMetricCard label="Starters" value={starters} accent={starters >= 22 ? 'green' : 'gold'} detail="Projected first unit" />
        <PixelMetricCard label="Avg Age" value={avgAge} accent="cyan" detail="Current roster age curve" />
        <PixelMetricCard label="Training Plans" value={playersInTraining} accent="gold" detail="Players with an active weekly focus" />
      </div>

      <PixelNav
        activeKey={posFilter}
        wrap
        items={positions.map((pos) => ({ key: pos, label: pos }))}
        onSelect={setPosFilter}
      />

      <PixelTable
        data={filtered}
        columns={columns}
        density="compact"
        accent="cyan"
        onRowClick={(row) => setSelectedPlayer(row)}
      />

      <PixelModal
        open={!!selectedPlayer}
        onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}
        title={selectedPlayer?.name ?? 'Player Details'}
        description={selectedPlayer ? `${selectedPlayer.pos} // ${selectedPlayer.age} years old` : undefined}
        accent="gold"
      >
        {selectedPlayer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{selectedPlayer.pos}</PixelBadge>
              <PixelBadge variant="cyan">OVR {selectedPlayer.ovr}</PixelBadge>
              <PixelBadge variant="green">POT {selectedPlayer.pot}</PixelBadge>
              <PixelBadge variant="default">Age {selectedPlayer.age}</PixelBadge>
              {selectedPlayer.tradeBlock ? <PixelBadge variant="red">Trade Block</PixelBadge> : null}
              {team?.mentoringPairs.some((pair) => pair.menteeId === selectedPlayer.id || pair.mentorId === selectedPlayer.id)
                ? <PixelBadge variant="gold">Mentoring Pair</PixelBadge>
                : null}
            </div>

            <div style={autoGrid(260)}>
              <PixelPanel title="Contract" accent="cyan">
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>
                  {selectedPlayer.contract ? (
                    <>
                      <div>Cap Hit: ${Math.round(calcCapHit(selectedPlayer.contract) * 10) / 10}M</div>
                      <div>Duration: {selectedPlayer.contract.years} year(s)</div>
                      <div>Total Value: ${Math.round(selectedPlayer.contract.totalValue * 10) / 10}M</div>
                      <div>Guaranteed: ${Math.round(selectedPlayer.contract.guaranteed * 10) / 10}M</div>
                    </>
                  ) : (
                    <div>No contract on file.</div>
                  )}
                </div>
              </PixelPanel>

              <PixelPanel title="Vitals" accent="green">
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>
                  <div>Morale: {selectedPlayer.morale}</div>
                  <div>Chemistry: {selectedPlayer.chemistry}</div>
                  <div>System Fit: {selectedPlayer.systemFit}</div>
                  <div>Dev Trait: {selectedPlayer.devTrait}</div>
                  <div>Experience: {selectedPlayer.yearsExp} year(s)</div>
                  <div>Training Focus: {trainingAssignments[selectedPlayer.id]?.focus?.replaceAll('_', ' ') ?? 'unassigned'}</div>
                </div>
              </PixelPanel>
            </div>

            <PixelPanel title="Actions" accent="red">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelButton accent="cyan" onClick={() => handleRestructure(selectedPlayer)}>
                  Restructure
                </PixelButton>
                <PixelButton accent="gold" onClick={() => handleTradeBlock(selectedPlayer)}>
                  {selectedPlayer.tradeBlock ? 'Remove Block' : 'Trade Block'}
                </PixelButton>
                <PixelButton accent="red" onClick={() => handleCut(selectedPlayer)}>
                  Cut Player
                </PixelButton>
              </div>
              <div style={{ marginTop: '12px' }}>
                <PixelConsequenceList items={consequences} />
              </div>
            </PixelPanel>
          </div>
        ) : null}
      </PixelModal>

      <div style={autoGrid(320)}>
        <PixelPanel title={`Practice Squad (${practiceSquad.length}/16)`} accent="green">
          {practiceSquadRows.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No players on the practice squad. Add depth from free agency after roster cuts clear.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {practiceSquadRows.map(({ entry, player }) => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-green)', background: 'rgba(74, 222, 128, 0.08)' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>
                      {player.pos} // Elevations {entry.elevationsUsed}/{entry.maxElevations}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton accent="green" onClick={() => teamId && void elevatePracticeSquadPlayer(teamId, player.id)}>
                      Elevate
                    </PixelButton>
                    <PixelButton accent="red" onClick={() => teamId && void removeFromPracticeSquad(teamId, player.id)}>
                      Release
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Practice Squad Targets" accent="cyan">
          {practiceTargets.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No free agents are clear to stash right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {practiceTargets.map((player) => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-cyan)', background: 'rgba(34, 211, 238, 0.08)' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>{player.pos} // OVR {player.ovr} // Age {player.age}</div>
                  </div>
                  <PixelButton accent="cyan" onClick={() => teamId && void addToPracticeSquad(teamId, player.id)}>
                    Add to PS
                  </PixelButton>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title={`Waiver Claims (${waiverPlayers.length})`} accent={waiverPlayers.length > 0 ? 'gold' : 'default'}>
          {waiverPlayers.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No active waiver-wire players this week.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {waiverPlayers.slice(0, 6).map((player) => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-gold)', background: 'rgba(250, 204, 21, 0.08)' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>{player.pos} // OVR {player.ovr}</div>
                  </div>
                  <PixelButton accent="gold" onClick={() => teamId && void submitWaiverClaim(teamId, player.id)}>
                    Claim
                  </PixelButton>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}
