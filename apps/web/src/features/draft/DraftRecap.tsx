import { useMemo, useState } from 'react';
import { PixelBadge, PixelPanel, PixelSelect, PixelTable } from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { DraftRecap as DraftRecapRecord } from '@mfd/engine';
import { selectDraftRecaps, selectUserTeam, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

const pickColumns: ColumnDef<DraftRecapRecord['picks'][number]>[] = [
  { accessorKey: 'round', header: 'Round' },
  { accessorKey: 'pick', header: 'Pick' },
  { accessorKey: 'playerName', header: 'Player' },
  { accessorKey: 'position', header: 'Pos' },
  { accessorKey: 'ovr', header: 'OVR' },
  { accessorKey: 'projectedPick', header: 'Projected' },
  { accessorKey: 'valueDelta', header: 'Value' },
  { accessorKey: 'verdict', header: 'Verdict', cell: ({ getValue }) => <PixelBadge variant={String(getValue()) === 'steal' ? 'green' : String(getValue()) === 'reach' ? 'red' : 'default'}>{String(getValue()).toUpperCase()}</PixelBadge> },
];

export function DraftRecap() {
  const team = useGameStore(selectUserTeam);
  const recaps = useGameStore(selectDraftRecaps);
  const [selectedYear, setSelectedYear] = useState(recaps[0]?.year ?? 0);

  const activeRecap = useMemo(
    () => recaps.find((entry) => entry.year === selectedYear) ?? recaps[0] ?? null,
    [recaps, selectedYear],
  );

  if (!activeRecap) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Draft Recap" subtitle="No draft recap is archived yet." />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Draft Recap"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} // class review and league board context`}
        badges={(
          <>
            <PixelBadge variant="gold">Class Grade {activeRecap.classGrade}</PixelBadge>
            <PixelSelect
              value={String(activeRecap.year)}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              options={recaps.map((entry) => ({ value: String(entry.year), label: String(entry.year) }))}
              accent="cyan"
            />
          </>
        )}
      />

      <div style={autoGrid(240)}>
        <PixelPanel title="Class Grade" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '40px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
              {activeRecap.classGrade}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Best value: {activeRecap.bestValue.playerName}</div>
          </div>
        </PixelPanel>

        <PixelPanel title="Highlights" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>Best Value // {activeRecap.bestValue.playerName}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>Biggest Reach // {activeRecap.biggestReach.playerName}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              Steals // {activeRecap.steals.map((entry) => entry.playerName).join(' | ') || 'None'}
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="League Highlights" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeRecap.leagueHighlights.map((entry) => (
              <div key={entry.playerId} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                #{entry.pick} {entry.playerName} // {entry.position}
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Pick By Pick" accent="cyan">
        <PixelTable
          data={activeRecap.picks}
          columns={pickColumns}
          accent="cyan"
          emptyMessage="No draft picks found"
        />
      </PixelPanel>
    </div>
  );
}
