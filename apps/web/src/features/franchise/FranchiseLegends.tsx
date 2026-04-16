import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelTable } from '@mfd/design-system/components';
import { getDecadeNarrative, type FranchiseLegend } from '@mfd/engine';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useGameStore,
  selectAllDecadeTeams,
  selectFranchiseLegends,
  selectRetiredJerseys,
  selectUserTeam,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, display, monoSm, screenStackStyle } from '../shared/pixelUi';
import { JerseyRetirementViewer } from './JerseyRetirementViewer';
import { LegendCard } from './franchiseUi';

export function FranchiseLegends() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const legends = useGameStore(selectFranchiseLegends);
  const allDecadeTeams = useGameStore(selectAllDecadeTeams);
  const retiredJerseys = useGameStore(selectRetiredJerseys);
  const [focusedLegendId, setFocusedLegendId] = useState<string | null>(null);
  const [selectedDecadeId, setSelectedDecadeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'legends' | 'decades' | 'retired_jerseys'>('legends');

  useEffect(() => {
    if (legends.length > 0 && !focusedLegendId) {
      setFocusedLegendId(legends[0]!.playerId);
    }
  }, [focusedLegendId, legends]);

  useEffect(() => {
    if (allDecadeTeams.length > 0 && !selectedDecadeId) {
      setSelectedDecadeId(allDecadeTeams[0]!.id);
    }
  }, [allDecadeTeams, selectedDecadeId]);

  const focusedLegend = legends.find((legend) => legend.playerId === focusedLegendId) ?? legends[0] ?? null;
  const selectedDecade = allDecadeTeams.find((entry) => entry.id === selectedDecadeId) ?? allDecadeTeams[0] ?? null;
  const decadeNarrative = game && selectedDecade
    ? getDecadeNarrative(selectedDecade, game.franchiseHistory.filter((entry) => entry.teamId === selectedDecade.teamId))
    : null;

  const columns = useMemo<ColumnDef<FranchiseLegend, unknown>[]>(() => [
    {
      id: 'rank',
      header: 'Rank',
      cell: ({ row }) => <PixelBadge variant="gold">#{row.index + 1}</PixelBadge>,
    },
    {
      accessorKey: 'playerName',
      header: 'Name',
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>
            {row.original.playerName.toUpperCase()}
          </span>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{row.original.pos}</span>
        </div>
      ),
    },
    { accessorKey: 'peakOvr', header: 'Peak' },
    { accessorKey: 'tenureYears', header: 'Tenure' },
    { accessorKey: 'championships', header: 'Titles' },
    { accessorKey: 'mvps', header: 'MVP' },
    { accessorKey: 'allPros', header: 'All-Pro' },
    {
      id: 'legacy',
      header: 'Legacy',
      cell: ({ row }) => <PixelBadge variant={row.original.hallOfFame ? 'gold' : 'cyan'}>{row.original.legacyScore.toFixed(1)}</PixelBadge>,
    },
    {
      id: 'hof',
      header: 'HOF',
      cell: ({ row }) => row.original.hallOfFame ? <PixelBadge variant="gold">HOF</PixelBadge> : <PixelBadge variant="default">NO</PixelBadge>,
    },
    {
      id: 'focus',
      header: 'Detail',
      cell: ({ row }) => (
        <PixelButton accent="cyan" onClick={() => setFocusedLegendId(row.original.playerId)}>
          Focus
        </PixelButton>
      ),
    },
  ], []);

  if (!team) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Franchise Legends" subtitle="No franchise is loaded." />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Franchise Legends"
        subtitle={`${team.city} ${team.name} // top 25 legacy scores`}
        badges={(
          <>
            <PixelBadge variant="gold">{legends.length} LEGENDS</PixelBadge>
            <PixelBadge variant="cyan">{allDecadeTeams.length} DECADE TEAMS</PixelBadge>
            <PixelBadge variant="green">{retiredJerseys.length} RETIRED JERSEYS</PixelBadge>
          </>
        )}
      />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <PixelButton accent={activeTab === 'legends' ? 'gold' : 'default'} onClick={() => setActiveTab('legends')}>
          Legends
        </PixelButton>
        <PixelButton accent={activeTab === 'decades' ? 'cyan' : 'default'} onClick={() => setActiveTab('decades')}>
          All-Decade
        </PixelButton>
        <PixelButton accent={activeTab === 'retired_jerseys' ? 'green' : 'default'} onClick={() => setActiveTab('retired_jerseys')}>
          Retired Jerseys
        </PixelButton>
      </div>

      {activeTab === 'legends' ? (
        <div style={autoGrid(320)}>
          <PixelPanel title="Legend Board" accent="gold">
            <PixelTable responsive="cards" data={legends} columns={columns} accent="gold" emptyMessage="No franchise legends yet." />
          </PixelPanel>

          <PixelPanel title="Focused Legend" accent={focusedLegend?.hallOfFame ? 'gold' : 'cyan'}>
            {focusedLegend ? (
              <LegendCard legend={focusedLegend} index={legends.findIndex((legend) => legend.playerId === focusedLegend.playerId)} />
            ) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No legend selected.</div>
            )}
          </PixelPanel>
        </div>
      ) : null}

      {activeTab === 'decades' ? (
        <PixelPanel title="All-Decade Team" accent="cyan">
          {allDecadeTeams.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Play 10 seasons to unlock your first All-Decade Team.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {allDecadeTeams.map((entry) => (
                  <PixelButton
                    key={entry.id}
                    accent={selectedDecade?.id === entry.id ? 'gold' : 'default'}
                    onClick={() => setSelectedDecadeId(entry.id)}
                  >
                    {entry.decade}
                  </PixelButton>
                ))}
              </div>
              {selectedDecade ? (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="gold">{selectedDecade.headline}</PixelBadge>
                    <PixelBadge variant="cyan">{selectedDecade.roster.length} selections</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                    {decadeNarrative}
                  </div>
                  <div style={autoGrid(220)}>
                    {selectedDecade.roster.map((entry, index) => (
                      <div key={`${entry.playerId}-${index}`} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '10px',
                        border: '2px solid var(--mfd-cyan)',
                        background: 'var(--mfd-bg-2)',
                      }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                          <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                            {entry.playerName.toUpperCase()}
                          </div>
                          <PixelBadge variant={index < 22 ? 'green' : 'default'}>{index < 22 ? 'STARTER' : 'HON'}</PixelBadge>
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                          {entry.pos} // peak {entry.peakOvr} // {entry.seasonsWithTeam} season(s)
                        </div>
                        {entry.highlights.slice(0, 2).map((highlight) => (
                          <div key={highlight} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                            {highlight}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </PixelPanel>
      ) : null}

      {activeTab === 'retired_jerseys' ? <JerseyRetirementViewer /> : null}
    </div>
  );
}
