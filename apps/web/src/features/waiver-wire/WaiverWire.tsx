import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelNav, PixelPanel, PixelSelect, PixelTable } from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import {
  selectClaimResults,
  selectTransactionLog,
  selectUserTeam,
  selectUserTeamId,
  selectWaiverPriority,
  selectWaiverWireBoard,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

type WaiverBoardRow = ReturnType<typeof selectWaiverWireBoard>[number];
type ClaimResultRow = ReturnType<typeof selectClaimResults>[number];
type TransactionRow = ReturnType<typeof selectTransactionLog>[number];

const boardColumns: ColumnDef<WaiverBoardRow>[] = [
  { accessorKey: 'name', header: 'Player' },
  { accessorKey: 'pos', header: 'Pos', cell: ({ getValue }) => <PixelBadge variant="default">{String(getValue())}</PixelBadge> },
  { accessorKey: 'ovr', header: 'OVR' },
  { accessorKey: 'age', header: 'Age' },
  { accessorKey: 'salary', header: 'Salary', cell: ({ getValue }) => `$${Number(getValue()).toFixed(1)}M` },
  { accessorKey: 'releasedByName', header: 'Released By' },
  { accessorKey: 'countdown', header: 'Clearance' },
];

const transactionColumns: ColumnDef<TransactionRow>[] = [
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'year', header: 'Year' },
  { accessorKey: 'week', header: 'Week' },
  { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => String(getValue() ?? '--') },
];

export function WaiverWire() {
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const board = useGameStore(selectWaiverWireBoard);
  const priority = useGameStore(selectWaiverPriority);
  const claimResults = useGameStore(selectClaimResults);
  const transactionLog = useGameStore(selectTransactionLog);
  const submitWaiverClaim = useGameStore((state) => state.actions.submitWaiverClaim);
  const [tab, setTab] = useState<'board' | 'results' | 'transactions'>('board');
  const [position, setPosition] = useState('ALL');
  const [sortBy, setSortBy] = useState<'ovr' | 'age' | 'salary'>('ovr');

  const filteredBoard = useMemo(() => {
    const rows = position === 'ALL' ? board : board.filter((entry) => entry.pos === position);
    return [...rows].sort((a, b) => {
      if (sortBy === 'age') return a.age - b.age || b.ovr - a.ovr;
      if (sortBy === 'salary') return a.salary - b.salary || b.ovr - a.ovr;
      return b.ovr - a.ovr || a.name.localeCompare(b.name);
    });
  }, [board, position, sortBy]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Waiver Wire"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} // personnel board // waiver priority and transaction history`}
        badges={(
          <>
            <PixelBadge variant="cyan">{filteredBoard.length} claimable</PixelBadge>
            <PixelBadge variant="gold">Priority #{priority.find((entry) => entry.isUser)?.priority ?? '--'}</PixelBadge>
          </>
        )}
      />

      <PixelNav
        activeKey={tab}
        items={[
          { key: 'board', label: 'Board' },
          { key: 'results', label: 'Results' },
          { key: 'transactions', label: 'Transaction Log' },
        ]}
        onSelect={(key) => setTab(key as typeof tab)}
      />

      <div style={autoGrid(280)}>
        <PixelPanel title="Filters" accent="cyan">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <PixelSelect
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              options={['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'].map((value) => ({ value, label: value }))}
              accent="cyan"
            />
            <PixelSelect
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              options={[
                { value: 'ovr', label: 'Sort // OVR' },
                { value: 'age', label: 'Sort // Age' },
                { value: 'salary', label: 'Sort // Salary' },
              ]}
              accent="gold"
            />
          </div>
        </PixelPanel>

        <PixelPanel title="Waiver Priority" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {priority.map((entry) => (
              <div key={entry.teamId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.teamName}</span>
                <PixelBadge variant={entry.isUser ? 'green' : 'default'}>#{entry.priority}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Waiver Board" accent={tab === 'board' ? 'cyan' : 'default'}>
        <PixelTable
          data={filteredBoard}
          columns={[
            ...boardColumns,
            {
              id: 'claim',
              header: 'Claim',
              cell: ({ row }) => (
                <PixelButton
                  accent={row.original.claimPending ? 'gold' : 'green'}
                  onClick={() => {
                    if (!teamId) return;
                    void submitWaiverClaim(teamId, row.original.playerId);
                  }}
                >
                  {row.original.claimPending ? 'Claim Pending' : 'Submit Claim'}
                </PixelButton>
              ),
            } satisfies ColumnDef<WaiverBoardRow>,
          ]}
          accent="cyan"
          emptyMessage="No players currently on waivers"
        />
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title="Claim Results" accent={tab === 'results' ? 'gold' : 'default'}>
          {claimResults.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No waiver runs have resolved yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {claimResults.map((result: ClaimResultRow) => (
                <div key={result.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>Week {result.week} // Claim Results</div>
                  {result.successfulClaims.map((entry) => (
                    <div key={`${result.id}-win-${entry.playerId}`} style={{ ...monoSm, color: 'var(--mfd-green)' }}>
                      {entry.playerName} {'->'} {entry.winningTeamName}
                    </div>
                  ))}
                  {result.lostClaims.map((entry) => (
                    <div key={`${result.id}-loss-${entry.playerId}`} style={{ ...monoSm, color: 'var(--mfd-red)' }}>
                      {entry.playerName} lost to {entry.winningTeamName}
                    </div>
                  ))}
                  {result.clearedPlayers.map((entry) => (
                    <div key={`${result.id}-clear-${entry.playerId}`} style={{ ...monoSm, color: 'var(--mfd-cyan)' }}>
                      {entry.playerName} cleared to free agency
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Transaction Log" accent={tab === 'transactions' ? 'green' : 'default'}>
          <PixelTable
            data={transactionLog}
            columns={transactionColumns}
            accent="green"
            emptyMessage="No personnel moves logged yet"
          />
        </PixelPanel>
      </div>
    </div>
  );
}
