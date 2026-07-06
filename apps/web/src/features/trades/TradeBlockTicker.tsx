import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { Team } from '@mfd/engine';
import {
  selectLeagueTradeBlock,
  selectScenarioState,
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
export type LeagueTradeBlockIntentFilter = 'all' | 'buyer' | 'seller' | 'neutral';
export type LeagueTradeBlockSort = 'team' | 'ovr';
type TradeBlockSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';
type TradeBlockIntent = Exclude<LeagueTradeBlockIntentFilter, 'all'>;

type TeamAlignment = Pick<Team, 'id' | 'city' | 'name' | 'conference' | 'division'> | null;

interface LeagueTradeBlockGroup {
  teamId: string;
  teamName: string;
  conference: Team['conference'];
  division: string;
  gmStrategy: LeagueTradeBlockEntry['teamGmStrategy'];
  philosophy: LeagueTradeBlockEntry['teamPhilosophy'];
  intent: TradeBlockIntent;
  entries: LeagueTradeBlockEntry[];
}

interface TradeBlockSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: TradeBlockSourceAccent;
}

interface TradeBlockMarketReason {
  label: string;
  detail: string;
  accent: TradeBlockSourceAccent;
}

const FILTERS: Array<{ id: LeagueTradeBlockFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'conference', label: 'My Conference' },
  { id: 'division', label: 'Division Rivals' },
];

const INTENT_FILTERS: Array<{ id: LeagueTradeBlockIntentFilter; label: string }> = [
  { id: 'all', label: 'Any Intent' },
  { id: 'seller', label: 'Sellers' },
  { id: 'buyer', label: 'Buyers' },
  { id: 'neutral', label: 'Neutral' },
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

function labelFromId(value: string): string {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function classifyTradeBlockIntent(entry: Pick<LeagueTradeBlockEntry, 'teamGmStrategy' | 'teamPhilosophy'>): {
  id: TradeBlockIntent;
  label: string;
  accent: TradeBlockSourceAccent;
} {
  if (entry.teamPhilosophy === 'fire_sale' || entry.teamPhilosophy === 'rebuild' || entry.teamGmStrategy === 'rebuild') {
    return { id: 'seller', label: 'Seller', accent: 'green' };
  }
  if (entry.teamPhilosophy === 'contend' || entry.teamGmStrategy === 'contend') {
    return { id: 'buyer', label: 'Buyer', accent: 'gold' };
  }
  return { id: 'neutral', label: 'Neutral', accent: 'cyan' };
}

export function filterLeagueTradeBlockEntries(
  entries: LeagueTradeBlockEntry[],
  userTeam: TeamAlignment,
  filter: LeagueTradeBlockFilter,
  intentFilter: LeagueTradeBlockIntentFilter = 'all',
): LeagueTradeBlockEntry[] {
  const aligned = !userTeam || filter === 'all'
    ? entries
    : filter === 'conference'
      ? entries.filter((entry) => entry.teamId !== userTeam.id && entry.teamConference === userTeam.conference)
      : entries.filter((entry) =>
        entry.teamId !== userTeam.id
        && entry.teamConference === userTeam.conference
        && entry.teamDivision === userTeam.division);

  if (intentFilter === 'all') return aligned;
  return aligned.filter((entry) => classifyTradeBlockIntent(entry).id === intentFilter);
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
      gmStrategy: entry.teamGmStrategy,
      philosophy: entry.teamPhilosophy,
      intent: classifyTradeBlockIntent(entry).id,
      entries: [],
    };
    if (group.entries.length < topCount) {
      group.entries.push(entry);
    }
    grouped.set(entry.teamId, group);
  }
  return [...grouped.values()];
}

export function buildTradeBlockSourceRows({
  totalTargets,
  visibleTargets,
  teamCount,
  filter,
  intentFilter,
  sort,
}: {
  totalTargets: number;
  visibleTargets: number;
  teamCount: number;
  filter: LeagueTradeBlockFilter;
  intentFilter: LeagueTradeBlockIntentFilter;
  sort: LeagueTradeBlockSort;
}): TradeBlockSourceRow[] {
  return [
    {
      id: 'selector-source',
      label: 'Selector source',
      value: `${totalTargets} targets`,
      detail: 'selectLeagueTradeBlock builds this ticker from CPU-team findTradeTargets output, trade-block player flags, team needs, cap compatibility, and trade valuation.',
      accent: totalTargets > 0 ? 'cyan' : 'default',
    },
    {
      id: 'route-projection',
      label: 'Route projection',
      value: `${visibleTargets} shown / ${teamCount} teams`,
      detail: 'Route filters are local to this screen. Conference, division, CPU intent, team sort, and OVR sort choices are not saved dynasty state.',
      accent: visibleTargets > 0 ? 'gold' : 'default',
    },
    {
      id: 'advisory-only',
      label: 'Advisory only',
      value: 'No proposals',
      detail: 'Opening /trade-block does not create proposals, accept offers, move players or picks, write trade suggestions, or change player trade-block flags.',
      accent: 'green',
    },
    {
      id: 'commit-path',
      label: 'Action used',
      value: 'Trade Center',
      detail: 'Use /trades to build user-team packages. Direct proposals still expose players and current-year picks only; conditional-pick assets remain generated-market only.',
      accent: 'gold',
    },
    {
      id: 'active-view',
      label: 'Active view',
      value: `${filter} / ${intentFilter} / ${sort}`,
      detail: 'This route is market radar. CPU intent reads saved team.gmStrategy and team.philosophy before you decide whether to open the real trade workflow.',
      accent: 'cyan',
    },
  ];
}

export function buildTradeBlockMarketReason(entry: LeagueTradeBlockEntry): TradeBlockMarketReason {
  const intent = classifyTradeBlockIntent(entry);
  const seekerFit = entry.seekerNeed
    ? `${entry.seekerTeamName} needs ${entry.seekerNeed}`
    : `${entry.seekerTeamName} has a roster fit`;
  const valuation = `${formatPercent(entry.acceptanceLikelihood)} acceptance, ${formatValueGap(entry.valueGap)}`;

  if (entry.teamPhilosophy === 'fire_sale') {
    return {
      label: 'Fire-sale market',
      detail: `${seekerFit}; saved fire-sale philosophy keeps future-asset conversations open. ${valuation}.`,
      accent: 'red',
    };
  }
  if (intent.id === 'seller') {
    return {
      label: 'Seller market',
      detail: `${seekerFit}; saved rebuild posture favors picks, youth, and flexibility over this listed player. ${valuation}.`,
      accent: intent.accent,
    };
  }
  if (intent.id === 'buyer') {
    return {
      label: 'Buyer trim',
      detail: `${seekerFit}; saved contend posture can still shop depth when another team values the role. ${valuation}.`,
      accent: intent.accent,
    };
  }
  return {
    label: 'Listening post',
    detail: `${seekerFit}; neutral saved posture means this is an advisory findTradeTargets match, not a forced sale. ${valuation}.`,
    accent: intent.accent,
  };
}

function TradeBlockSourcePanel({ rows }: { rows: TradeBlockSourceRow[] }) {
  return (
    <PixelPanel title="Trade Block Source" accent="cyan">
      <div style={autoGrid(220)}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
              <span style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{row.label}</span>
              <PixelBadge variant={row.accent}>{row.value}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

function TradeBlockScenarioLockPanel({ scenarioName }: { scenarioName: string }) {
  return (
    <PixelPanel title="Scenario Lock" accent="red">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="red">TRADE COMMITS BLOCKED</PixelBadge>
          <PixelBadge variant="gold">{scenarioName}</PixelBadge>
          <PixelBadge variant="green">SCANNING AVAILABLE</PixelBadge>
        </div>
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Source: saved scenarioState.activeScenario.constraints.blockTrades. Trade-block scouting
          remains available for planning, but generated-offer accepts, direct proposal submits,
          counter accepts, deadline accepts, and draft-night trade accepts are blocked by the active
          scenario before they can commit.
        </span>
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          This route still does not create proposals, move assets, write trade suggestions, or mutate
          player trade-block flags. Use Trade Center only when the scenario allows a real package.
        </span>
      </div>
    </PixelPanel>
  );
}

export function TradeBlockTicker() {
  const entries = useGameStore(selectLeagueTradeBlock);
  const scenarioState = useGameStore(selectScenarioState);
  const userTeam = useGameStore(selectUserTeam);
  const [filter, setFilter] = useState<LeagueTradeBlockFilter>('all');
  const [intentFilter, setIntentFilter] = useState<LeagueTradeBlockIntentFilter>('all');
  const [sort, setSort] = useState<LeagueTradeBlockSort>('team');

  const visibleEntries = useMemo(() => (
    sortLeagueTradeBlockEntries(
      filterLeagueTradeBlockEntries(entries, userTeam, filter, intentFilter),
      sort,
    )
  ), [entries, filter, intentFilter, sort, userTeam]);

  const groups = useMemo(() => groupLeagueTradeBlockEntries(visibleEntries, 3), [visibleEntries]);
  const sourceRows = useMemo(
    () => buildTradeBlockSourceRows({
      totalTargets: entries.length,
      visibleTargets: visibleEntries.length,
      teamCount: groups.length,
      filter,
      intentFilter,
      sort,
    }),
    [entries.length, filter, groups.length, intentFilter, sort, visibleEntries.length],
  );
  const userLabel = userTeam ? `${userTeam.city} ${userTeam.name}` : 'No user team';
  const tradesLockedByScenario = Boolean(scenarioState?.activeScenario?.constraints.blockTrades);
  const activeScenarioName = scenarioState?.activeScenario?.name ?? 'Active scenario';

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
            {tradesLockedByScenario ? <PixelBadge variant="red">TRADES LOCKED</PixelBadge> : null}
          </>
        )}
      />

      <TradeBlockSourcePanel rows={sourceRows} />
      {tradesLockedByScenario ? <TradeBlockScenarioLockPanel scenarioName={activeScenarioName} /> : null}

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
              {INTENT_FILTERS.map((item) => (
                <PixelButton
                  key={item.id}
                  accent={intentFilter === item.id ? 'gold' : 'default'}
                  aria-pressed={intentFilter === item.id}
                  onClick={() => setIntentFilter(item.id)}
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
                      <PixelBadge variant={classifyTradeBlockIntent({
                        teamGmStrategy: group.gmStrategy,
                        teamPhilosophy: group.philosophy,
                      }).accent}>
                        {classifyTradeBlockIntent({
                          teamGmStrategy: group.gmStrategy,
                          teamPhilosophy: group.philosophy,
                        }).label}
                      </PixelBadge>
                      <PixelBadge variant="default">{labelFromId(group.gmStrategy)}</PixelBadge>
                      <PixelBadge variant="default">{labelFromId(group.philosophy)}</PixelBadge>
                      {rivalBadge ? <PixelBadge variant={rivalBadge === 'DIVISION RIVAL' ? 'red' : 'gold'}>{rivalBadge}</PixelBadge> : null}
                    </div>

                    {group.entries.map((entry) => {
                      const marketReason = buildTradeBlockMarketReason(entry);
                      return (
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <PixelBadge variant={marketReason.accent}>Market Receipt</PixelBadge>
                            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6, flex: '1 1 220px' }}>
                              {marketReason.label}: {marketReason.detail}
                            </span>
                          </div>
                          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                            {entry.reasoning}
                          </span>
                        </div>
                      );
                    })}
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
