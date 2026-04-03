import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelNav, PixelPanel, PixelTable } from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import {
  selectPracticeSquad,
  selectPracticeSquadCandidates,
  selectRoster,
  selectUserTeam,
  selectUserTeamId,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

type CandidateRow = ReturnType<typeof selectPracticeSquadCandidates>[number];

interface PracticeSquadRow {
  playerId: string;
  name: string;
  pos: string;
  ovr: number;
  age: number;
  elevationsUsed: number;
  maxElevations: number;
}

const candidateColumns: ColumnDef<CandidateRow>[] = [
  { accessorKey: 'name', header: 'Player' },
  { accessorKey: 'pos', header: 'Pos' },
  { accessorKey: 'ovr', header: 'OVR' },
  { accessorKey: 'age', header: 'Age' },
];

export function PracticeSquad() {
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const practiceSquad = useGameStore(selectPracticeSquad);
  const roster = useGameStore(selectRoster);
  const candidates = useGameStore(selectPracticeSquadCandidates);
  const { addToPracticeSquad, elevatePSPlayer, releasePSPlayer } = useGameStore((state) => state.actions);
  const [tab, setTab] = useState<'offense' | 'defense' | 'special'>('offense');

  const rows = useMemo<PracticeSquadRow[]>(() => practiceSquad.map((entry) => {
    const player = roster.find((candidate) => candidate.id === entry.playerId);
    return {
      playerId: entry.playerId,
      name: player?.name ?? entry.playerId,
      pos: player?.pos ?? '--',
      ovr: player?.ovr ?? 0,
      age: player?.age ?? 0,
      elevationsUsed: entry.elevationsUsed,
      maxElevations: entry.maxElevations,
    };
  }), [practiceSquad, roster]);

  const filteredRows = rows.filter((entry) => (
    tab === 'offense'
      ? ['QB', 'RB', 'WR', 'TE', 'OL'].includes(entry.pos)
      : tab === 'defense'
        ? ['DL', 'LB', 'CB', 'S'].includes(entry.pos)
        : ['K', 'P'].includes(entry.pos)
  ));

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Practice Squad"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} // 16 slot grid // elevations and emergency depth`}
        badges={(
          <>
            <PixelBadge variant="cyan">{practiceSquad.length}/16</PixelBadge>
            <PixelBadge variant="gold">16 SLOT GRID</PixelBadge>
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

      <div style={autoGrid(320)}>
        <PixelPanel title="Practice Squad Slots" accent="cyan">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {Array.from({ length: 16 }, (_, index) => {
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
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelButton
                          accent={entry.elevationsUsed >= entry.maxElevations ? 'gold' : 'green'}
                          onClick={() => {
                            if (!teamId) return;
                            void elevatePSPlayer(teamId, entry.playerId);
                          }}
                        >
                          {entry.elevationsUsed >= entry.maxElevations ? 'Elevation Maxed' : 'Elevate'}
                        </PixelButton>
                        <PixelButton
                          accent="red"
                          onClick={() => {
                            if (!teamId) return;
                            void releasePSPlayer(teamId, entry.playerId);
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
          data={candidates}
          columns={[
            ...candidateColumns,
            {
              id: 'add',
              header: 'Action',
              cell: ({ row }) => (
                <PixelButton
                  accent="green"
                  onClick={() => {
                    if (!teamId) return;
                    void addToPracticeSquad(teamId, row.original.id);
                  }}
                >
                  Add
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
