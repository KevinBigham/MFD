import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelNav, PixelPanel, PixelSelect, PixelTable } from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import {
  selectClaimResults,
  selectScenarioState,
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
type ReceiptAccent = 'cyan' | 'gold' | 'green' | 'red';

export type WaiverClaimReceipt = {
  id: string;
  title: string;
  accent: ReceiptAccent;
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
};

const boardColumns: ColumnDef<WaiverBoardRow>[] = [
  { accessorKey: 'name', header: 'Player' },
  { accessorKey: 'pos', header: 'Pos', cell: ({ getValue }) => <PixelBadge variant="default">{String(getValue())}</PixelBadge> },
  { accessorKey: 'ovr', header: 'OVR' },
  { accessorKey: 'age', header: 'Age' },
  { accessorKey: 'salaryLabel', header: 'Contract' },
  { accessorKey: 'releasedByName', header: 'Released By' },
  { accessorKey: 'countdown', header: 'Clearance' },
  {
    accessorKey: 'statusLabel',
    header: 'State',
    cell: ({ row }) => (
      <PixelBadge variant={row.original.claimPending ? 'gold' : 'cyan'}>{row.original.statusLabel}</PixelBadge>
    ),
  },
];

const transactionColumns: ColumnDef<TransactionRow>[] = [
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'year', header: 'Year' },
  { accessorKey: 'week', header: 'Week' },
  { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => String(getValue() ?? '--') },
];

export function buildWaiverClaimReceipt(args: {
  playerId: string;
  playerName: string;
  playerPos: string;
  teamName: string;
  priorityLabel: string;
  salaryLabel: string;
  contractStatus: string;
  releasedByName: string;
  countdown: string;
  lifecycleNote: string;
}): WaiverClaimReceipt {
  const contractNote = args.contractStatus === 'no_active_contract'
    ? 'If awarded, the existing waiver-award path creates a one-year minimum deal.'
    : 'If awarded, the current contract data shown on the board travels with the claim.';

  return {
    id: `waiver-claim:${args.playerId}`,
    title: 'Waiver Claim Submitted',
    accent: 'green',
    target: `${args.playerName} // ${args.playerPos} // released by ${args.releasedByName} // priority ${args.priorityLabel}`,
    result: `${args.teamName} submitted claim intent for ${args.playerName} with board contract ${args.salaryLabel}. ${args.countdown}; award, loss, or clearance resolves during the next waiver run, not when this receipt renders. ${contractNote}`,
    stateTouched: 'waiverClaims intent queue, undo snapshot, and autosave through the existing store commit.',
    source: 'actions.submitWaiverClaim -> submitWaiverClaimEngine -> commitGame',
    boundary: `This confirmation does not award the player, change waiver priority, move roster/free-agent pools, create or modify a contract, process a waiver run, advance the week, reroll saved outcomes, or save a separate confirmation log. Board source note: ${args.lifecycleNote}`,
  };
}

export function WaiverClaimReceiptPanel({ receipt }: { receipt: WaiverClaimReceipt }) {
  return (
    <PixelPanel title="Waiver Claim Receipt" accent={receipt.accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={receipt.accent}>{receipt.title}</PixelBadge>
          <PixelBadge variant="default">On-screen confirmation</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{receipt.target}</div>
        <div style={autoGrid(220)}>
          {[
            { label: 'Result', detail: receipt.result, accent: receipt.accent },
            { label: 'Changed now', detail: receipt.stateTouched, accent: 'gold' as const },
            { label: 'Action used', detail: receipt.source, accent: 'cyan' as const },
            { label: 'Did not also', detail: receipt.boundary, accent: 'green' as const },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                border: '1px solid var(--mfd-border)',
                background: 'var(--mfd-bg-elevated)',
              }}
            >
              <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

export function WaiverWire() {
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const board = useGameStore(selectWaiverWireBoard);
  const priority = useGameStore(selectWaiverPriority);
  const claimResults = useGameStore(selectClaimResults);
  const scenarioState = useGameStore(selectScenarioState);
  const transactionLog = useGameStore(selectTransactionLog);
  const submitWaiverClaim = useGameStore((state) => state.actions.submitWaiverClaim);
  const [tab, setTab] = useState<'board' | 'results' | 'transactions'>('board');
  const [position, setPosition] = useState('ALL');
  const [sortBy, setSortBy] = useState<'ovr' | 'age' | 'salary'>('ovr');
  const [claimReceipt, setClaimReceipt] = useState<WaiverClaimReceipt | null>(null);

  const filteredBoard = useMemo(() => {
    const rows = position === 'ALL' ? board : board.filter((entry) => entry.pos === position);
    return [...rows].sort((a, b) => {
      if (sortBy === 'age') return a.age - b.age || b.ovr - a.ovr;
      if (sortBy === 'salary') return a.salary - b.salary || b.ovr - a.ovr;
      return b.ovr - a.ovr || a.name.localeCompare(b.name);
    });
  }, [board, position, sortBy]);
  const freeAgencyLockedByScenario = Boolean(scenarioState?.activeScenario?.constraints.blockFreeAgency);
  const userPriority = priority.find((entry) => entry.isUser);
  const teamName = team ? `${team.city} ${team.name}` : 'Franchise';

  const handleSubmitClaim = async (row: WaiverBoardRow) => {
    if (!teamId || freeAgencyLockedByScenario || !row.canSubmitClaim) return;
    await submitWaiverClaim(teamId, row.playerId);
    setClaimReceipt(buildWaiverClaimReceipt({
      playerId: row.playerId,
      playerName: row.name,
      playerPos: row.pos,
      teamName,
      priorityLabel: userPriority ? `#${userPriority.priority}` : '#--',
      salaryLabel: row.salaryLabel,
      contractStatus: row.contractStatus,
      releasedByName: row.releasedByName,
      countdown: row.countdown,
      lifecycleNote: row.lifecycleNote,
    }));
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Waiver Wire"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} // personnel board // waiver priority and transaction history`}
        badges={(
          <>
            <PixelBadge variant="cyan">{filteredBoard.length} on board</PixelBadge>
            <PixelBadge variant={freeAgencyLockedByScenario ? 'red' : 'green'}>
              {freeAgencyLockedByScenario ? 'Claims locked' : `${filteredBoard.filter((entry) => entry.canSubmitClaim).length} open`}
            </PixelBadge>
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

      {freeAgencyLockedByScenario ? (
        <PixelPanel title="Scenario Lock" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{scenarioState?.activeScenario?.name ?? 'Active Scenario'}</PixelBadge>
              <PixelBadge variant="red">WAIVER CLAIMS BLOCKED</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              Submit Claim buttons are disabled here because the active scenario blocks external free-agent acquisitions. Waiver priority, pending results, and transaction history remain readable.
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
              Source: saved scenarioState.activeScenario.constraints.blockFreeAgency. The store action already returns without committing blocked waiver claims.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {claimReceipt ? <WaiverClaimReceiptPanel receipt={claimReceipt} /> : null}

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
          responsive="cards"
          data={filteredBoard}
          columns={[
            ...boardColumns,
            {
              id: 'claim',
              header: 'Claim',
              cell: ({ row }) => (
                <PixelButton
                  accent={freeAgencyLockedByScenario ? 'red' : row.original.claimPending ? 'gold' : 'green'}
                  disabled={freeAgencyLockedByScenario || !row.original.canSubmitClaim}
                  title={row.original.lifecycleNote}
                  onClick={() => {
                    void handleSubmitClaim(row.original);
                  }}
                >
                  {freeAgencyLockedByScenario && row.original.canSubmitClaim ? 'Scenario Locked' : row.original.actionLabel}
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
                      {entry.playerName} cleared to free agency // {entry.scopeLabel}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Transaction Log" accent={tab === 'transactions' ? 'green' : 'default'}>
          <PixelTable
            responsive="cards"
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
