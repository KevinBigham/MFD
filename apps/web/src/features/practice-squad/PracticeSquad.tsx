import { useState } from 'react';
import { PixelBadge, PixelButton, PixelNav, PixelPanel, PixelTable } from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import {
  selectPracticeSquad,
  selectPracticeSquadCandidates,
  selectPracticeSquadLimit,
  selectPracticeSquadRows,
  selectScenarioState,
  selectUserTeam,
  selectUserTeamId,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

type CandidateRow = ReturnType<typeof selectPracticeSquadCandidates>[number];
type PracticeSquadRow = ReturnType<typeof selectPracticeSquadRows>[number];
type PracticeSquadReceiptAccent = 'cyan' | 'gold' | 'green' | 'red';
type PracticeSquadReceiptAction = 'add' | 'elevate' | 'release';

export type PracticeSquadActionReceipt = {
  id: string;
  title: string;
  accent: PracticeSquadReceiptAccent;
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
};

const candidateColumns: ColumnDef<CandidateRow>[] = [
  { accessorKey: 'name', header: 'Player' },
  { accessorKey: 'pos', header: 'Pos', cell: ({ getValue }) => <PixelBadge variant="default">{String(getValue())}</PixelBadge> },
  { accessorKey: 'ovr', header: 'OVR' },
  { accessorKey: 'age', header: 'Age' },
  {
    accessorKey: 'statusLabel',
    header: 'State',
    cell: ({ row }) => (
      <PixelBadge variant={row.original.canAdd ? 'green' : 'gold'}>{row.original.statusLabel}</PixelBadge>
    ),
  },
];

export function buildPracticeSquadActionReceipt(args: {
  action: PracticeSquadReceiptAction;
  playerId: string;
  playerName: string;
  playerPos: string;
  teamName: string;
  statusLabel?: string;
  helpText?: string;
  elevationsUsed?: number;
  maxElevations?: number;
  slotUsage?: string;
}): PracticeSquadActionReceipt {
  const target = `${args.playerName} // ${args.playerPos} // ${args.teamName}`;

  if (args.action === 'add') {
    return {
      id: `practice-squad:add:${args.playerId}`,
      title: 'Practice Squad Add Processed',
      accent: 'green',
      target,
      result: `${args.playerName} was added from the eligible free-agent pool. ${args.slotUsage ?? 'Practice-squad slot usage refreshed after commit.'} Candidate source: ${args.helpText ?? 'Available now from the free-agent pool.'}`,
      stateTouched: 'team.practiceSquad, game.freeAgents, GameState.players team/contract fields, team transaction log, and autosave through the existing store commit.',
      source: 'actions.addToPracticeSquad -> addToPracticeSquadEngine -> commitGame',
      boundary: 'This confirmation does not add another player, bypass scenario locks, claim a waiver-held player, create a contract, change practice-squad limits, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  if (args.action === 'elevate') {
    return {
      id: `practice-squad:elevate:${args.playerId}:${args.elevationsUsed ?? 0}`,
      title: 'Practice Squad Elevation Processed',
      accent: 'cyan',
      target,
      result: `${args.playerName} was elevated for active-roster depth. Elevation usage before commit: ${args.elevationsUsed ?? 0}/${args.maxElevations ?? 3}. Status before commit: ${args.statusLabel ?? 'Practice squad'}.`,
      stateTouched: 'active roster reference when needed, jersey assignment, practiceSquad elevationsUsed/isElevated/elevatedWeek, GameState.players team field, team transaction log, roster-state refresh, and autosave through the existing store commit.',
      source: 'actions.elevatePSPlayer -> elevateFromPracticeSquadEngine -> commitGame',
      boundary: 'This confirmation does not elevate another player, reset elevation limits, add a contract, release a player, click Advance Week, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  return {
    id: `practice-squad:release:${args.playerId}`,
    title: 'Practice Squad Release Processed',
    accent: 'red',
    target,
    result: `${args.playerName} was released from the practice squad and returned to the free-agent pool. Status before commit: ${args.statusLabel ?? 'Practice squad'}.`,
    stateTouched: 'team.practiceSquad, active-roster reference cleanup, game.freeAgents, GameState.players team field, team transaction log, roster-state refresh, and autosave through the existing store commit.',
    source: 'actions.releasePSPlayer -> removeFromPracticeSquadEngine -> commitGame',
    boundary: 'This confirmation does not release another player, create a waiver row, change contracts, change practice-squad limits, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
  };
}

export function PracticeSquadActionReceiptPanel({ receipt }: { receipt: PracticeSquadActionReceipt }) {
  return (
    <PixelPanel title="Practice Squad Action Receipt" accent={receipt.accent}>
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

export function PracticeSquad() {
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const practiceSquad = useGameStore(selectPracticeSquad);
  const practiceSquadLimit = useGameStore(selectPracticeSquadLimit);
  const rows = useGameStore(selectPracticeSquadRows);
  const candidates = useGameStore(selectPracticeSquadCandidates);
  const scenarioState = useGameStore(selectScenarioState);
  const { addToPracticeSquad, elevatePSPlayer, releasePSPlayer } = useGameStore((state) => state.actions);
  const [tab, setTab] = useState<'offense' | 'defense' | 'special'>('offense');
  const [actionReceipt, setActionReceipt] = useState<PracticeSquadActionReceipt | null>(null);
  const freeAgencyLockedByScenario = Boolean(scenarioState?.activeScenario?.constraints.blockFreeAgency);
  const teamName = team ? `${team.city} ${team.name}` : 'Franchise';

  const filteredRows = rows.filter((entry) => (
    tab === 'offense'
      ? ['QB', 'RB', 'WR', 'TE', 'OL'].includes(entry.pos)
      : tab === 'defense'
        ? ['DL', 'LB', 'CB', 'S'].includes(entry.pos)
        : ['K', 'P'].includes(entry.pos)
  ));

  const handleAddToPracticeSquad = async (row: CandidateRow) => {
    if (!teamId || freeAgencyLockedByScenario || !row.canAdd) return;
    await addToPracticeSquad(teamId, row.id);
    setActionReceipt(buildPracticeSquadActionReceipt({
      action: 'add',
      playerId: row.id,
      playerName: row.name,
      playerPos: row.pos,
      teamName,
      helpText: row.helpText,
      statusLabel: row.statusLabel,
      slotUsage: `${practiceSquad.length}/${practiceSquadLimit} slots before add`,
    }));
  };

  const handleElevatePracticeSquadPlayer = async (row: PracticeSquadRow) => {
    if (!teamId || !row.canElevate) return;
    await elevatePSPlayer(teamId, row.playerId);
    setActionReceipt(buildPracticeSquadActionReceipt({
      action: 'elevate',
      playerId: row.playerId,
      playerName: row.name,
      playerPos: row.pos,
      teamName,
      statusLabel: row.statusLabel,
      elevationsUsed: row.elevationsUsed,
      maxElevations: row.maxElevations,
    }));
  };

  const handleReleasePracticeSquadPlayer = async (row: PracticeSquadRow) => {
    if (!teamId) return;
    await releasePSPlayer(teamId, row.playerId);
    setActionReceipt(buildPracticeSquadActionReceipt({
      action: 'release',
      playerId: row.playerId,
      playerName: row.name,
      playerPos: row.pos,
      teamName,
      statusLabel: row.statusLabel,
      elevationsUsed: row.elevationsUsed,
      maxElevations: row.maxElevations,
    }));
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Practice Squad"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} // ${practiceSquadLimit} slot grid // elevations and emergency depth`}
        badges={(
          <>
            <PixelBadge variant="cyan">{practiceSquad.length}/{practiceSquadLimit}</PixelBadge>
            <PixelBadge variant="gold">{practiceSquadLimit} SLOT GRID</PixelBadge>
            {freeAgencyLockedByScenario ? <PixelBadge variant="red">ADDS LOCKED</PixelBadge> : null}
          </>
        )}
      />

      <PixelNav
        activeKey={tab}
        items={[
          { key: 'offense', label: 'Offense' },
          { key: 'defense', label: 'Defense' },
          { key: 'special', label: 'Special Teams' },
        ]}
        onSelect={(key) => setTab(key as typeof tab)}
      />

      {freeAgencyLockedByScenario ? (
        <PixelPanel title="Scenario Lock" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{scenarioState?.activeScenario?.name ?? 'Active Scenario'}</PixelBadge>
              <PixelBadge variant="red">PRACTICE-SQUAD ADDS BLOCKED</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              Add buttons are disabled here because the active scenario blocks external free-agent acquisitions. Existing practice-squad releases and elevations remain roster-management actions.
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
              Source: saved scenarioState.activeScenario.constraints.blockFreeAgency. The store action already returns without committing blocked practice-squad additions.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {actionReceipt ? <PracticeSquadActionReceiptPanel receipt={actionReceipt} /> : null}

      <div style={autoGrid(320)}>
        <PixelPanel title="Practice Squad Slots" accent="cyan">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {Array.from({ length: practiceSquadLimit }, (_, index) => {
              const entry = rows[index] ?? null;
              return (
                <div
                  key={`slot-${index + 1}`}
                  style={{
                    border: '3px solid var(--mfd-border)',
                    background: 'var(--mfd-bg-3)',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Slot {index + 1}</div>
                  {entry ? (
                    <>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.name}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant="default">{entry.pos}</PixelBadge>
                        <PixelBadge variant="cyan">{entry.ovr} OVR</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {entry.elevationsUsed} / {entry.maxElevations}
                      </div>
                      <PixelBadge variant={entry.isElevated ? 'green' : entry.canElevate ? 'cyan' : 'gold'}>
                        {entry.statusLabel}
                      </PixelBadge>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelButton
                          accent={entry.canElevate ? 'green' : 'gold'}
                          disabled={!entry.canElevate}
                          onClick={() => {
                            void handleElevatePracticeSquadPlayer(entry);
                          }}
                        >
                          {entry.canElevate ? 'Elevate' : entry.statusLabel}
                        </PixelButton>
                        <PixelButton
                          accent="red"
                          onClick={() => {
                            void handleReleasePracticeSquadPlayer(entry);
                          }}
                        >
                          Release
                        </PixelButton>
                      </div>
                    </>
                  ) : (
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Empty slot</div>
                  )}
                </div>
              );
            })}
          </div>
        </PixelPanel>

        <PixelPanel title="Active Unit" accent="gold">
          {filteredRows.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No players in this group.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredRows.map((entry) => (
                <div key={entry.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.name}</span>
                  <PixelBadge variant={entry.elevationsUsed >= entry.maxElevations ? 'gold' : 'cyan'}>
                    {entry.elevationsUsed} / {entry.maxElevations}
                  </PixelBadge>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title="Add To Practice Squad" accent="green">
        <PixelTable
          responsive="cards"
          data={candidates}
          columns={[
            ...candidateColumns,
            {
              id: 'add',
              header: 'Action',
              cell: ({ row }) => (
                <PixelButton
                  accent={freeAgencyLockedByScenario ? 'red' : row.original.canAdd ? 'green' : 'gold'}
                  disabled={freeAgencyLockedByScenario || !row.original.canAdd}
                  title={row.original.helpText}
                  onClick={() => {
                    void handleAddToPracticeSquad(row.original);
                  }}
                >
                  {freeAgencyLockedByScenario && row.original.canAdd ? 'Scenario Locked' : row.original.actionLabel}
                </PixelButton>
              ),
            } satisfies ColumnDef<CandidateRow>,
          ]}
          accent="green"
          emptyMessage="No eligible candidates right now"
        />
      </PixelPanel>
    </div>
  );
}
