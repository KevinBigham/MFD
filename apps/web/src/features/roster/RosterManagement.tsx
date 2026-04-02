import { useState, useMemo, useCallback } from 'react';
import {
  PixelPanel, PixelTable, PixelBadge, PixelModal, PixelNav, PixelButton,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { Player } from '@mfd/engine';
import { calcCapHit } from '@mfd/engine';
import {
  useGameStore, selectRoster, selectUserTeam, selectUserTeamId,
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
];

export function RosterManagement() {
  const roster = useGameStore(selectRoster);
  const teamId = useGameStore(selectUserTeamId);
  const team = useGameStore(selectUserTeam);
  const { cutPlayer, toggleTradeBlock, restructure } = useGameStore((s) => s.actions);

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

  const handleCut = useCallback((player: Player) => {
    if (!teamId) return;
    cutPlayer(teamId, player.id);
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
    </div>
  );
}
