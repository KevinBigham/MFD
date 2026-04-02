import { useState, useMemo, useCallback } from 'react';
import {
  PixelPanel, PixelTable, PixelBadge, PixelModal, PixelButton, PixelProgressBar,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { Player } from '@mfd/engine';
import { calcCapHit, calcDeadMoney, getSalaryCap } from '@mfd/engine';
import {
  useGameStore, selectRoster, selectUserTeam, selectUserTeamId, selectYear,
} from '../../app/store/game-store';
import {
  PixelConsequenceList,
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

interface ContractRow {
  id: string;
  name: string;
  pos: string;
  ovr: number;
  age: number;
  capHit: number;
  deadCap: number;
  years: number;
  guaranteed: number;
  totalValue: number;
  restructured: boolean;
  player: Player;
}

function toContractRows(roster: Player[]): ContractRow[] {
  return roster
    .filter((player) => player.contract)
    .map((player) => {
      const contract = player.contract!;
      return {
        id: player.id,
        name: player.name,
        pos: player.pos,
        ovr: player.ovr,
        age: player.age,
        capHit: Math.round(calcCapHit(contract) * 10) / 10,
        deadCap: Math.round(calcDeadMoney(contract) * 10) / 10,
        years: contract.years,
        guaranteed: Math.round(contract.guaranteed * 10) / 10,
        totalValue: Math.round(contract.totalValue * 10) / 10,
        restructured: contract.restructured,
        player,
      };
    })
    .sort((a, b) => b.capHit - a.capHit);
}

const columns: ColumnDef<ContractRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span style={{ fontWeight: 500 }}>{row.original.name}</span>,
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
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', lineHeight: 1 }}>{getValue() as number}</span>
    ),
    size: 50,
  },
  {
    accessorKey: 'capHit',
    header: 'Cap Hit',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>${getValue() as number}M</span>
    ),
    size: 84,
  },
  {
    accessorKey: 'deadCap',
    header: 'Dead Cap',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-red)' }}>
        ${getValue() as number}M
      </span>
    ),
    size: 84,
  },
  {
    accessorKey: 'years',
    header: 'Years',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>{getValue() as number}yr</span>
    ),
    size: 60,
  },
  {
    id: 'value',
    header: 'Value',
    cell: ({ row }) => {
      const contract = row.original;
      const ratio = contract.capHit / Math.max(contract.ovr - 50, 1);
      const label = ratio < 0.3 ? 'Fair' : ratio < 0.5 ? 'Watch' : 'Overpay';
      const variant = label === 'Fair' ? 'green' : label === 'Watch' ? 'gold' : 'red';
      return <PixelBadge variant={variant}>{label}</PixelBadge>;
    },
    size: 74,
  },
  {
    accessorKey: 'restructured',
    header: 'Status',
    cell: ({ getValue }) => (
      getValue() ? <PixelBadge variant="cyan">Restructured</PixelBadge> : null
    ),
    size: 94,
  },
];

export function ContractsCap() {
  const roster = useGameStore(selectRoster);
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const year = useGameStore(selectYear);
  const { restructure, backload, cutPlayer } = useGameStore((s) => s.actions);

  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null);

  const contractRows = useMemo(() => toContractRows(roster), [roster]);

  const salaryCap = getSalaryCap(year);
  const capUsed = team ? Math.round(team.capUsed * 10) / 10 : 0;
  const capSpace = team ? Math.round(team.capSpace * 10) / 10 : 0;
  const deadCap = team ? Math.round(team.deadCap * 10) / 10 : 0;
  const capPct = salaryCap > 0 ? Math.round((capUsed / salaryCap) * 100) : 0;

  const handleRestructure = useCallback(() => {
    if (!teamId || !selectedContract) return;
    restructure(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [teamId, selectedContract, restructure]);

  const handleBackload = useCallback(() => {
    if (!teamId || !selectedContract) return;
    backload(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [teamId, selectedContract, backload]);

  const handleCut = useCallback(() => {
    if (!teamId || !selectedContract) return;
    cutPlayer(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [teamId, selectedContract, cutPlayer]);

  const projections = useMemo(() => {
    return [1, 2, 3].map((offset) => {
      const projYear = year + offset;
      const projCap = getSalaryCap(projYear);
      const committed = contractRows
        .filter((row) => row.years > offset)
        .reduce((sum, row) => sum + row.capHit, 0);
      return {
        year: projYear,
        committed: Math.round(committed * 10) / 10,
        space: Math.round((projCap - committed) * 10) / 10,
      };
    });
  }, [contractRows, year]);

  const posBreakdown = useMemo(() => {
    const byPos: Record<string, number> = {};
    for (const row of contractRows) {
      byPos[row.pos] = (byPos[row.pos] ?? 0) + row.capHit;
    }
    return Object.entries(byPos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pos, total]) => ({ pos, total, pct: salaryCap > 0 ? (total / salaryCap) * 100 : 0 }));
  }, [contractRows, salaryCap]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Contracts & Salary Cap"
        subtitle={`Cap $${salaryCap}M // Used $${capUsed}M // Space $${capSpace}M`}
        badges={(
          <>
            <PixelBadge variant={capSpace >= 0 ? 'green' : 'red'}>${capSpace}M</PixelBadge>
            <PixelBadge variant="gold">{capPct}% used</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Salary Cap" value={`$${salaryCap}M`} accent="cyan" detail="League cap ceiling" />
        <PixelMetricCard label="Cap Used" value={`$${capUsed}M`} accent={capPct > 90 ? 'red' : 'gold'} detail={`${capPct}% committed`} />
        <PixelMetricCard label="Dead Cap" value={`$${deadCap}M`} accent={deadCap > 20 ? 'red' : 'gold'} detail="Sunk contract cost" />
        <PixelMetricCard label="Cap Space" value={`$${capSpace}M`} accent={capSpace >= 0 ? 'green' : 'red'} detail={capSpace >= 0 ? 'Flexible' : 'Over the limit'} />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Cap Breakdown" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelProgressBar value={capPct} accent={capPct > 90 ? 'red' : 'cyan'} label="Cap Usage" valueLabel={`${capPct}%`} />
            {posBreakdown.map((entry) => (
              <div key={entry.pos} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <PixelBadge variant="default">{entry.pos}</PixelBadge>
                  <span style={{ ...monoSm, color: '#999' }}>${Math.round(entry.total)}M</span>
                </div>
                <PixelProgressBar value={entry.pct} accent="gold" label="Share" valueLabel={`${Math.round(entry.pct)}%`} />
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Cap Projections" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projections.map((proj) => (
              <div key={proj.year} style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                alignItems: 'center',
                paddingBottom: '8px',
                borderBottom: '1px solid #1a1a1a',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                    {proj.year}
                  </div>
                  <div style={{ ...monoSm, color: '#888', marginTop: '4px' }}>
                    ${proj.committed}M committed
                  </div>
                </div>
                <PixelBadge variant={proj.space >= 0 ? 'green' : 'red'}>${proj.space}M free</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelTable
        data={contractRows}
        columns={columns}
        density="compact"
        accent="gold"
        onRowClick={(row) => setSelectedContract(row)}
      />

      <PixelModal
        open={!!selectedContract}
        onOpenChange={(open) => { if (!open) setSelectedContract(null); }}
        title={selectedContract ? `${selectedContract.name} Contract` : 'Contract Details'}
        description={selectedContract ? `${selectedContract.pos} // ${selectedContract.ovr} OVR` : undefined}
        accent="red"
      >
        {selectedContract ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={autoGrid(180)}>
              <PixelMetricCard label="Cap Hit" value={`$${selectedContract.capHit}M`} accent="gold" />
              <PixelMetricCard label="Dead Cap" value={`$${selectedContract.deadCap}M`} accent="red" />
              <PixelMetricCard label="Years Left" value={selectedContract.years} accent="cyan" />
            </div>

            <PixelPanel title="Actions" accent="red">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelButton accent="cyan" onClick={handleRestructure}>
                  Restructure
                </PixelButton>
                <PixelButton accent="gold" onClick={handleBackload}>
                  Add Void Years
                </PixelButton>
                <PixelButton accent="red" onClick={handleCut}>
                  Cut Player
                </PixelButton>
              </div>
              <div style={{ marginTop: '12px' }}>
                <PixelConsequenceList
                  items={[
                    { id: 'c1', label: 'Cap Savings', delta: `+$${Math.round(selectedContract.capHit * 0.3 * 10) / 10}M/yr`, accent: 'green' },
                    { id: 'c2', label: 'Dead Cap', delta: `+$${selectedContract.deadCap}M`, accent: 'red' },
                    { id: 'c3', label: 'Guaranteed', delta: `$${selectedContract.guaranteed}M`, accent: 'gold' },
                  ]}
                />
              </div>
            </PixelPanel>
          </div>
        ) : null}
      </PixelModal>
    </div>
  );
}
