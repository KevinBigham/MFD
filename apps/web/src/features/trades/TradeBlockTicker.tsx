import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { Team } from '@mfd/engine';
import {
  selectLeagueTradeBlock,
  selectUserTeam,
  useGameStore,
  type LeagueTradeBlockEntry,
} from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  monoSm,
  navigateTo,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

export type LeagueTradeBlockFilter = 'all' | 'conference' | 'division';
export type LeagueTradeBlockSort = 'team' | 'ovr';

type TeamAlignment = Pick<Team, 'id' | 'city' | 'name' | 'conference' | 'division'> | null;

interface LeagueTradeBlockGroup {
  teamId: string;
  teamName: string;
  conference: Team['conference'];
  division: string;
  entries: LeagueTradeBlockEntry[];
}

const FILTERS: Array<{ id: LeagueTradeBlockFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'conference', label: 'My Conference' },
  { id: 'division', label: 'Division Rivals' },
];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatValueGap(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `Gap +${rounded}`;
  if (rounded < 0) return `Gap ${rounded}`;
  return 'Gap 0';
}

function alignmentBadge(entry: LeagueTradeBlockEntry, userTeam: TeamAlignment): string | null {
  if (!userTeam || entry.teamId === userTeam.id) return null;
  if (entry.teamConference === userTeam.conference && entry.teamDivision === userTeam.division) return 'DIVISION RIVAL';
  if (entry.teamConference === userTeam.conference) return 'MY CONFERENCE';
  return null;
}

export function filterLeagueTradeBlockEntries(
  entries: LeagueTradeBlockEntry[],
  userTeam: TeamAlignment,
  filter: LeagueTradeBlockFilter,
): LeagueTradeBlockEntry[] {
  if (!userTeam || filter === 'all') return entries;
  if (filter === 'conference') {
    return entries.filter((entry) => entry.teamId !== userTeam.id && entry.teamConference === userTeam.conference);
  }
  return entries.filter((entry) =>
    entry.teamId !== userTeam.id
    && entry.teamConference === userTeam.conference
    && entry.teamDivision === userTeam.division);
}

export function sortLeagueTradeBlockEntries(
  entries: LeagueTradeBlockEntry[],
  sort: LeagueTradeBlockSort,
): LeagueTradeBlockEntry[] {
  return [...entries].sort((a, b) => {
    if (sort === 'ovr') {
      return b.ovr - a.ovr
        || a.playerName.localeCompare(b.playerName)
        || a.teamName.localeCompare(b.teamName)
        || a.seekerTeamName.localeCompare(b.seekerTeamName);
    }
    return a.teamName.localeCompare(b.teamName)
      || b.ovr - a.ovr
      || a.playerName.localeCompare(b.playerName)
      || a.seekerTeamName.localeCompare(b.seekerTeamName);
  });
}

export function groupLeagueTradeBlockEntries(
  entries: LeagueTradeBlockEntry[],
  topCount = 3,
): LeagueTradeBlockGroup[] {
  const grouped = new Map<string, LeagueTradeBlockGroup>();
  for (const entry of entries) {
    const group = grouped.get(entry.teamId) ?? {
      teamId: entry.teamId,
      teamName: entry.teamName,
      conference: entry.teamConference,
      division: entry.teamDivision,
      entries: [],
    };
    if (group.entries.length < topCount) {
      group.entries.push(entry);
    }
    grouped.set(entry.teamId, group);
  }
  return [...grouped.values()];
}

export function TradeBlockTicker() {
  const entries = useGameStore(selectLeagueTradeBlock);
  const userTeam = useGameStore(selectUserTeam);
  const [filter, setFilter] = useState<LeagueTradeBlockFilter>('all');
  const [sort, setSort] = useState<LeagueTradeBlockSort>('team');

  const visibleEntries = useMemo(() => (
    sortLeagueTradeBlockEntries(
      filterLeagueTradeBlockEntries(entries, userTeam, filter),
      sort,
    )
  ), [entries, filter, sort, userTeam]);

  const groups = useMemo(() => groupLeagueTradeBlockEntries(visibleEntries, 3), [visibleEntries]);
  const userLabel = userTeam ? `${userTeam.city} ${userTeam.name}` : 'No user team';

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="League Trade Block"
        subtitle="League-wide market radar built from existing trade-finder output."
        badges={(
          <>
            <PixelBadge variant="cyan">{entries.length} targets</PixelBadge>
            <PixelBadge variant="gold">{groups.length} teams</PixelBadge>
            <PixelBadge variant="green">User: {userLabel}</PixelBadge>
          </>
        )}
      />

      <PixelPanel title="Ticker Controls" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {FILTERS.map((item) => (
                <PixelButton
                  key={item.id}
                  accent={filter === item.id ? 'gold' : 'default'}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </PixelButton>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelButton
                accent={sort === 'team' ? 'gold' : 'default'}
                aria-pressed={sort === 'team'}
                onClick={() => setSort('team')}
              >
                Team
              </PixelButton>
              <PixelButton
                accent={sort === 'ovr' ? 'gold' : 'default'}
                aria-pressed={sort === 'ovr'}
                onClick={() => setSort('ovr')}
              >
                Player OVR
              </PixelButton>
            </div>
          </div>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Showing top trade-block targets per team. User-team availability is excluded from this league ticker.
          </span>
        </div>
      </PixelPanel>

      {groups.length === 0 ? (
        <PixelPanel title="Market Quiet" accent="default">
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No league-wide trade-block targets surfaced yet.
          </span>
        </PixelPanel>
      ) : (
        <div style={autoGrid(330)}>
          {groups.map((group) => {
            const firstEntry = group.entries[0] ?? null;
            const rivalBadge = firstEntry ? alignmentBadge(firstEntry, userTeam) : null;
            return (
              <div key={group.teamId} data-trade-block-team={group.teamId}>
                <PixelPanel title={group.teamName} accent={rivalBadge === 'DIVISION RIVAL' ? 'red' : 'cyan'}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="default">{group.conference}</PixelBadge>
                      <PixelBadge variant="cyan">{group.division}</PixelBadge>
                      {rivalBadge ? <PixelBadge variant={rivalBadge === 'DIVISION RIVAL' ? 'red' : 'gold'}>{rivalBadge}</PixelBadge> : null}
                    </div>

                    {group.entries.map((entry) => (
                      <div
                        key={`${entry.teamId}-${entry.playerId}-${entry.seekerTeamId}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          border: '2px solid var(--mfd-border)',
                          background: 'var(--mfd-bg-3)',
                          padding: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.playerName}</span>
                            <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>
                              Interest: {entry.seekerTeamName}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <PixelBadge variant="cyan">{entry.position}</PixelBadge>
                            <PixelBadge variant="gold">OVR {entry.ovr}</PixelBadge>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {entry.seekerNeed ? <PixelBadge variant="green">Need {entry.seekerNeed}</PixelBadge> : null}
                          <PixelBadge variant="cyan">{formatPercent(entry.acceptanceLikelihood)}</PixelBadge>
                          <PixelBadge variant={entry.valueGap >= 0 ? 'gold' : 'green'}>{formatValueGap(entry.valueGap)}</PixelBadge>
                        </div>
                        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                          {entry.reasoning}
                        </span>
                      </div>
                    ))}
                  </div>
                </PixelPanel>
              </div>
            );
          })}
        </div>
      )}

      <PixelPanel title="Trade Desk" accent="gold">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Build user-team packages from the Trade Center when a target looks actionable.
          </span>
          <PixelButton accent="gold" onClick={() => navigateTo('/trades')}>
            <ArrowLeftRight size={14} aria-hidden="true" />
            Trade Center
          </PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
