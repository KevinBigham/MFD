import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar, PixelSelect } from '@mfd/design-system/components';
import type { GameEvent, NewsItem, Team, TeamNeedsReport } from '@mfd/engine';
import {
  selectGameEventLog,
  selectLeagueNews,
  selectScenarioState,
  selectTeamNeedsById,
  selectTeamNeedsComparison,
  selectTeams,
  selectUserTeam,
  selectUserTeamNeeds,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

function gradeAccent(grade: string): 'green' | 'cyan' | 'gold' | 'red' {
  if (grade.startsWith('A')) return 'green';
  if (grade.startsWith('B')) return 'cyan';
  if (grade.startsWith('C')) return 'gold';
  return 'red';
}

function riskAccent(risk: 'low' | 'medium' | 'high'): 'green' | 'gold' | 'red' {
  return risk === 'high' ? 'red' : risk === 'medium' ? 'gold' : 'green';
}

function actionLabel(position: string, capFlexibility: 'tight' | 'moderate' | 'abundant'): string {
  if (capFlexibility === 'tight') return `${position}: draft now`;
  if (position === 'QB' || position === 'CB' || position === 'OL') return `${position}: trade / FA`;
  return `${position}: FA depth`;
}

type TeamNeedsIntentFilter = 'all' | 'seller' | 'buyer' | 'neutral';
type TeamNeedsIntent = Exclude<TeamNeedsIntentFilter, 'all'>;
type TeamNeedsIntentAccent = 'green' | 'cyan' | 'gold';
type CpuIntentLedgerAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

export interface CpuIntentLedgerRow {
  id: 'market' | 'strategy' | 'cap' | 'positions' | 'tradeBlock';
  label: string;
  value: string;
  detail: string;
  accent: CpuIntentLedgerAccent;
}

export interface CpuStrategyHistoryRow {
  id: string;
  label: 'GM Strategy Shift' | 'Philosophy Signal';
  value: string;
  detail: string;
  source: 'game.eventLog' | 'game.leagueNews';
  accent: CpuIntentLedgerAccent;
}

type StrategyHistorySortRow = CpuStrategyHistoryRow & { sortKey: number };

const INTENT_FILTERS: Array<{ id: TeamNeedsIntentFilter; label: string }> = [
  { id: 'all', label: 'Any Intent' },
  { id: 'seller', label: 'Sellers' },
  { id: 'buyer', label: 'Buyers' },
  { id: 'neutral', label: 'Neutral' },
];

export function classifyTeamNeedsIntent(team: Pick<Team, 'philosophy' | 'gmStrategy'>): {
  id: TeamNeedsIntent;
  label: string;
  accent: TeamNeedsIntentAccent;
} {
  const philosophy = String(team.philosophy ?? 'maintain');
  const strategy = String(team.gmStrategy ?? 'neutral');
  if (philosophy === 'fire_sale' || philosophy === 'rebuild' || strategy === 'rebuild') {
    return { id: 'seller', label: 'Seller', accent: 'green' };
  }
  if (philosophy === 'contend' || strategy === 'contend') {
    return { id: 'buyer', label: 'Buyer', accent: 'gold' };
  }
  return { id: 'neutral', label: 'Neutral', accent: 'cyan' };
}

export function filterTeamNeedsCompareOptions<T extends { intent: { id: TeamNeedsIntent } }>(
  options: T[],
  intentFilter: TeamNeedsIntentFilter,
): T[] {
  if (intentFilter === 'all') return options;
  return options.filter((option) => option.intent.id === intentFilter);
}

function labelFromId(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function strategyAccent(value: string | null | undefined): 'green' | 'cyan' | 'gold' | 'red' {
  if (value === 'contend') return 'gold';
  if (value === 'rebuild') return 'cyan';
  if (value === 'neutral') return 'green';
  return 'red';
}

function philosophyAccent(value: string | null | undefined): 'green' | 'cyan' | 'gold' | 'red' {
  if (value === 'fire_sale') return 'red';
  if (value === 'contend') return 'gold';
  if (value === 'rebuild') return 'cyan';
  return 'green';
}

function buildCpuIntentSummary(team: Team, report: TeamNeedsReport): string {
  const philosophy = String(team.philosophy ?? 'maintain');
  const strategy = String(team.gmStrategy ?? 'neutral');
  if (philosophy === 'fire_sale') return 'Cap-clearing seller';
  if (philosophy === 'contend' || strategy === 'contend') return 'Win-now buyer';
  if (philosophy === 'rebuild' || strategy === 'rebuild') return 'Pick-driven builder';
  if (report.capFlexibility === 'tight') return 'Balanced but cap-tight';
  return 'Balanced evaluator';
}

function marketLedgerRow(team: Team): CpuIntentLedgerRow {
  const philosophy = String(team.philosophy ?? 'maintain');
  const strategy = String(team.gmStrategy ?? 'neutral');
  if (philosophy === 'fire_sale') {
    return {
      id: 'market',
      label: 'Market Posture',
      value: 'Selling veterans',
      detail: 'Fire-sale posture points toward cap relief and future assets.',
      accent: 'red',
    };
  }
  if (philosophy === 'rebuild' || strategy === 'rebuild') {
    return {
      id: 'market',
      label: 'Market Posture',
      value: 'Building through picks',
      detail: 'Rebuild posture favors youth, picks, and patience.',
      accent: 'green',
    };
  }
  if (philosophy === 'contend' || strategy === 'contend') {
    return {
      id: 'market',
      label: 'Market Posture',
      value: 'Buying starters',
      detail: 'Contend posture favors immediate upgrades at weak rooms.',
      accent: 'gold',
    };
  }
  return {
    id: 'market',
    label: 'Market Posture',
    value: 'Holding options',
    detail: 'Maintain or neutral posture keeps scouting open without forcing a market push.',
    accent: 'cyan',
  };
}

function strategyLedgerDetail(strategy: string): string {
  if (strategy === 'contend') return 'The front office is leaning into the window and checking weak rooms first.';
  if (strategy === 'rebuild') return 'The front office is protecting picks, youth, and cap room before splash moves.';
  if (strategy === 'neutral') return 'The front office is keeping both the buyer and seller doors open.';
  return 'The booth cannot read a clear lane yet, so the board holds a balanced posture.';
}

function capLedgerDetail(flexibility: TeamNeedsReport['capFlexibility']): string {
  if (flexibility === 'tight') return 'Tight cap points planning toward draft picks or low-cost depth.';
  if (flexibility === 'abundant') return 'Abundant cap can absorb premium veterans when strategy supports it.';
  return 'Moderate cap supports targeted FA or trade checks before offers.';
}

function positionLedgerDetail(intent: TeamNeedsIntent): string {
  if (intent === 'buyer') return 'First rooms a buyer would compare before offers.';
  if (intent === 'seller') return 'Roster holes to protect picks, youth, and cap planning around.';
  return 'Priority rooms to scout while the club stays flexible.';
}

export function buildCpuIntentLedger(team: Team, report: TeamNeedsReport): CpuIntentLedgerRow[] {
  const strategy = String(team.gmStrategy ?? 'neutral');
  const intent = classifyTeamNeedsIntent(team);
  const criticalNeeds = report.criticalNeeds.join(' / ') || 'none';
  const tradeBlockPlayers = team.roster
    .filter((player) => player.tradeBlock)
    .sort((a, b) => b.ovr - a.ovr || a.age - b.age || a.id.localeCompare(b.id));
  const tradeBlockNames = tradeBlockPlayers
    .slice(0, 3)
    .map((player) => player.name)
    .join(' / ');

  return [
    marketLedgerRow(team),
    {
      id: 'strategy',
      label: 'GM Strategy',
      value: labelFromId(strategy),
      detail: strategyLedgerDetail(strategy),
      accent: strategyAccent(strategy),
    },
    {
      id: 'cap',
      label: 'Cap Plan',
      value: `$${team.capSpace.toFixed(1)}M // ${report.capFlexibility}`,
      detail: capLedgerDetail(report.capFlexibility),
      accent: report.capFlexibility === 'abundant' ? 'green' : report.capFlexibility === 'moderate' ? 'cyan' : 'red',
    },
    {
      id: 'positions',
      label: 'Position Chase',
      value: criticalNeeds,
      detail: positionLedgerDetail(intent.id),
      accent: report.criticalNeeds.length > 0 ? 'gold' : 'green',
    },
    {
      id: 'tradeBlock',
      label: 'Trade Block',
      value: `${tradeBlockPlayers.length} listed`,
      detail: tradeBlockPlayers.length > 0
        ? `The visible trade board starts with ${tradeBlockNames}.`
        : 'Nobody is publicly on this roster trade board.',
      accent: tradeBlockPlayers.length > 0 ? 'gold' : 'default',
    },
  ];
}

function strategyHistoryLabel(value: unknown): string {
  return labelFromId(typeof value === 'string' ? value : 'unknown');
}

function philosophyFromNewsHeadline(headline: string): string {
  const normalized = headline.toLowerCase();
  if (normalized.includes('fire sale')) return 'fire_sale';
  if (normalized.includes('contend')) return 'contend';
  if (normalized.includes('rebuild')) return 'rebuild';
  if (normalized.includes('maintain')) return 'maintain';
  return 'maintain';
}

export function buildCpuStrategyHistory(
  team: Team | null,
  eventLog: GameEvent[],
  leagueNews: NewsItem[],
): CpuStrategyHistoryRow[] {
  if (!team) return [];

  const eventRows: StrategyHistorySortRow[] = eventLog
    .filter((event) => event.type === 'gm_strategy_shift' && event.data?.['teamId'] === team.id)
    .map((event) => {
      const from = strategyHistoryLabel(event.data?.['from']);
      const to = strategyHistoryLabel(event.data?.['to']);
      const toRaw = typeof event.data?.['to'] === 'string' ? event.data['to'] : 'neutral';
      return {
        id: `event:${event.id}`,
        label: 'GM Strategy Shift',
        value: `${from} to ${to}`,
        detail: `Front office wire: ${event.description}`,
        source: 'game.eventLog',
        accent: strategyAccent(toRaw),
        sortKey: event.timestamp,
      };
    });

  const newsRows: StrategyHistorySortRow[] = leagueNews
    .filter((item) => item.teamIds.includes(team.id) && item.id.startsWith(`team-philosophy-${team.id}-`))
    .map((item) => {
      const philosophy = philosophyFromNewsHeadline(item.headline);
      return {
        id: `news:${item.id}`,
        label: 'Philosophy Signal',
        value: item.headline,
        detail: `${item.year} Week ${item.week} // League desk: ${item.body}`,
        source: 'game.leagueNews',
        accent: philosophyAccent(philosophy),
        sortKey: item.year * 1000 + item.week,
      };
    });

  return [...eventRows, ...newsRows]
    .sort((a, b) => b.sortKey - a.sortKey || a.id.localeCompare(b.id))
    .slice(0, 4)
    .map(({ sortKey: _sortKey, ...row }) => row);
}

function CpuIntentPanel({
  compareTeam,
  report,
  strategyHistory,
}: {
  compareTeam: Team | null;
  report: TeamNeedsReport;
  strategyHistory: CpuStrategyHistoryRow[];
}) {
  if (!compareTeam) return null;

  const philosophy = String(compareTeam.philosophy ?? 'maintain');
  const strategy = String(compareTeam.gmStrategy ?? 'neutral');
  const tradeBlockCount = compareTeam.roster.filter((player) => player.tradeBlock).length;
  const summary = buildCpuIntentSummary(compareTeam, report);
  const intent = classifyTeamNeedsIntent(compareTeam);
  const ledgerRows = buildCpuIntentLedger(compareTeam, report);

  return (
    <PixelPanel title="CPU Intent" accent="gold">
      <div style={autoGrid(180)}>
        <PixelMetricCard
          label="Intent"
          value={summary}
          accent={intent.accent}
          detail={`${compareTeam.city} ${compareTeam.name}`}
        />
        <PixelMetricCard
          label="Philosophy"
          value={labelFromId(philosophy)}
          accent={philosophyAccent(philosophy)}
          detail="Club identity read"
        />
        <PixelMetricCard
          label="GM Strategy"
          value={labelFromId(strategy)}
          accent={strategyAccent(strategy)}
          detail="Front-office lane"
        />
        <PixelMetricCard
          label="Cap Posture"
          value={`$${compareTeam.capSpace.toFixed(1)}M`}
          accent={report.capFlexibility === 'abundant' ? 'green' : report.capFlexibility === 'moderate' ? 'cyan' : 'red'}
          detail={`${report.capFlexibility} // needs ${report.criticalNeeds.join(' / ') || 'none'}`}
        />
        <PixelMetricCard
          label="Trade Block"
          value={tradeBlockCount}
          accent={tradeBlockCount > 0 ? 'gold' : 'default'}
          detail="Visible market board"
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>INTENT LEDGER</div>
        {ledgerRows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
              alignItems: 'start',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--mfd-border)',
            }}
          >
            <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
            <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{row.value}</span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
          </div>
        ))}
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6, marginTop: '10px' }}>
        The booth is reading club posture, cap room, roster holes, and public trade-board smoke.
        Refresh Compare can rebuild the scouting board, but offers and asset movement still happen on the real commit screens.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--mfd-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>STRATEGY HISTORY</span>
          <PixelBadge variant="cyan">Front office wire</PixelBadge>
          <PixelBadge variant="gold">League desk</PixelBadge>
          <PixelBadge variant="default">No live reroll</PixelBadge>
        </div>
        {strategyHistory.length > 0 ? (
          strategyHistory.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '10px',
                alignItems: 'start',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--mfd-border)',
              }}
            >
              <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
              <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{row.value}</span>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
            </div>
          ))
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No recent front-office wire or league-desk signal exists for this CPU club yet.
            The board falls back to its current posture and roster shape.
          </div>
        )}
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          This timeline is a scouting replay. It does not invent new strategy beats, write news, generate offers,
          move assets, autosave, or reroll outcomes.
        </div>
      </div>
    </PixelPanel>
  );
}

function ScenarioPlanningPanel({
  blockDraft,
  blockFreeAgency,
  blockTrades,
  scenarioName,
}: {
  blockDraft: boolean;
  blockFreeAgency: boolean;
  blockTrades: boolean;
  scenarioName: string;
}) {
  return (
    <PixelPanel title="Scenario Lock" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">{scenarioName}</PixelBadge>
          {blockDraft ? <PixelBadge variant="red">DRAFT PICKS LOCKED</PixelBadge> : null}
          {blockFreeAgency ? <PixelBadge variant="red">ACQUISITIONS LOCKED</PixelBadge> : null}
          {blockTrades ? <PixelBadge variant="red">TRADES LOCKED</PixelBadge> : null}
          <PixelBadge variant="green">REPORT OPEN</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          Scenario rules are active. Team-needs scouting stays available for roster planning,
          but active blockers still apply on the real commit routes before
          draft picks, bids, signings, claims, practice-squad additions, or trade proposals can move assets.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          Refreshing this board only rebuilds the report. It does not submit bids, sign players,
          draft players, create trade proposals, or move roster entries.
        </div>
      </div>
    </PixelPanel>
  );
}

export function TeamNeeds() {
  const team = useGameStore(selectUserTeam);
  const report = useGameStore(selectUserTeamNeeds);
  const scenarioState = useGameStore(selectScenarioState);
  const teams = useGameStore(selectTeams);
  const eventLog = useGameStore(selectGameEventLog);
  const leagueNews = useGameStore(selectLeagueNews);
  const { refreshTeamNeedsReport } = useGameStore((state) => state.actions);
  const allCompareOptions = useMemo(() => (
    Object.values(teams ?? {})
      .filter((entry) => !entry.isUser)
      .sort((a, b) => a.city.localeCompare(b.city))
      .map((entry) => {
        const intent = classifyTeamNeedsIntent(entry);
        return {
          value: entry.id,
          label: `${entry.city} ${entry.name}`,
          intent,
        };
      })
  ), [teams]);
  const [intentFilter, setIntentFilter] = useState<TeamNeedsIntentFilter>('all');
  const compareOptions = useMemo(
    () => filterTeamNeedsCompareOptions(allCompareOptions, intentFilter),
    [allCompareOptions, intentFilter],
  );
  const [compareTeamId, setCompareTeamId] = useState(compareOptions[0]?.value ?? '');
  const [refreshingTeamId, setRefreshingTeamId] = useState<string | null>(null);
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string | null>(null);
  const activeCompareTeamId = compareOptions.some((option) => option.value === compareTeamId)
    ? compareTeamId
    : compareOptions[0]?.value ?? '';
  const compareTeam = teams?.[activeCompareTeamId] ?? null;
  const compareIntent = compareTeam ? classifyTeamNeedsIntent(compareTeam) : null;
  const strategyHistory = useMemo(
    () => buildCpuStrategyHistory(compareTeam, eventLog, leagueNews),
    [compareTeam, eventLog, leagueNews],
  );
  const compareReport = useGameStore(selectTeamNeedsById(activeCompareTeamId || ''));
  const comparison = useGameStore(selectTeamNeedsComparison(activeCompareTeamId || null));
  const topStrengthCards = report.positionGrades
    .filter((entry) => report.strengths.includes(entry.group))
    .sort((a, b) => report.strengths.indexOf(a.group) - report.strengths.indexOf(b.group));
  const activeConstraints = scenarioState?.activeScenario?.constraints;
  const blockDraft = Boolean(activeConstraints?.blockDraft);
  const blockFreeAgency = Boolean(activeConstraints?.blockFreeAgency);
  const blockTrades = Boolean(activeConstraints?.blockTrades);
  const hasScenarioPlanningLock = blockDraft || blockFreeAgency || blockTrades;
  const activeScenarioName = scenarioState?.activeScenario?.name ?? 'Active scenario';
  const refreshBoard = async (teamId: string, label: string) => {
    setRefreshingTeamId(teamId);
    try {
      await refreshTeamNeedsReport(teamId);
      setLastRefreshLabel(`${label} board rebuilt from the current roster.`);
    } finally {
      setRefreshingTeamId(null);
    }
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Team Needs"
        subtitle={`${team ? `${team.city} ${team.name}` : 'User Team'} // ${report.overall}`}
        badges={(
          <>
            <PixelBadge variant="gold">{report.capFlexibility}</PixelBadge>
            <PixelBadge variant="cyan">{report.criticalNeeds.length} priority rooms</PixelBadge>
            {hasScenarioPlanningLock ? <PixelBadge variant="red">SCENARIO LIMITS</PixelBadge> : null}
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Overall" value={report.overall.split(' ')[0] ?? 'Report'} accent="gold" detail={report.overall} />
        <PixelMetricCard label="Critical Needs" value={report.criticalNeeds.length} accent="red" detail={report.criticalNeeds.join(' / ') || 'No urgent holes'} />
        <PixelMetricCard label="Strengths" value={report.strengths.length} accent="green" detail={report.strengths.join(' / ') || 'Balanced roster'} />
        <PixelMetricCard label="Cap Flex" value={report.capFlexibility} accent={report.capFlexibility === 'abundant' ? 'green' : report.capFlexibility === 'moderate' ? 'cyan' : 'red'} detail="How aggressive you can be" />
      </div>

      <PixelPanel title="Board Controls" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">Live board</PixelBadge>
            <PixelBadge variant="gold">Refreshable</PixelBadge>
            <PixelBadge variant="default">Planning only</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            This board shows the current scouting report for roster rooms, cap posture, draft targets, and market targets.
            Refresh Board rebuilds the report from the current roster. Bids, signings, draft picks, and roster moves
            still live on their commit screens.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {team ? (
              <PixelButton
                type="button"
                accent="gold"
                disabled={refreshingTeamId !== null}
                onClick={() => { void refreshBoard(team.id, `${team.city} ${team.name}`); }}
              >
                {refreshingTeamId === team.id ? 'Refreshing...' : 'Refresh Board'}
              </PixelButton>
            ) : null}
            {compareTeam ? (
              <PixelButton
                type="button"
                accent="cyan"
                disabled={refreshingTeamId !== null}
                onClick={() => { void refreshBoard(compareTeam.id, `${compareTeam.city} ${compareTeam.name}`); }}
              >
                {refreshingTeamId === compareTeam.id ? 'Refreshing Compare...' : 'Refresh Compare'}
              </PixelButton>
            ) : null}
            {lastRefreshLabel ? (
              <span style={{ ...monoSm, color: 'var(--mfd-green)' }}>{lastRefreshLabel}</span>
            ) : null}
          </div>
        </div>
      </PixelPanel>

      {hasScenarioPlanningLock ? (
        <ScenarioPlanningPanel
          blockDraft={blockDraft}
          blockFreeAgency={blockFreeAgency}
          blockTrades={blockTrades}
          scenarioName={activeScenarioName}
        />
      ) : null}

      <CpuIntentPanel compareTeam={compareTeam} report={compareReport} strategyHistory={strategyHistory} />

      <div style={autoGrid(300)}>
        <PixelPanel title="Critical Needs" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {report.criticalNeeds.map((position, index) => (
              <div key={position} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
                <div>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>PRIORITY {index + 1}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{actionLabel(position, report.capFlexibility)}</div>
                </div>
                <PixelBadge variant="red">{position}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Strengths" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topStrengthCards.map((entry) => (
              <div key={entry.group} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.group} room</div>
                  {entry.topPlayer ? (
                    <PlayerNameLink
                      playerId={entry.topPlayer.id}
                      name={entry.topPlayer.name}
                      ovr={entry.topPlayer.ovr}
                      style={{ ...monoSm }}
                    />
                  ) : null}
                </div>
                <PixelBadge variant="green">{entry.grade}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(220)}>
        {report.positionGrades.map((entry) => (
          <PixelPanel key={entry.group} title={entry.group} accent={gradeAccent(entry.grade)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Grade</span>
                <PixelBadge variant={gradeAccent(entry.grade)}>{entry.grade}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Starter OVR</span>
                <PixelBadge variant="cyan">{entry.starterOvr}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Room Avg</span>
                <PixelBadge variant="default">{entry.avgOvr}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Depth</span>
                <PixelBadge variant="gold">{entry.depth}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Age Risk</span>
                <PixelBadge variant={riskAccent(entry.ageRisk)}>{entry.ageRisk}</PixelBadge>
              </div>
              {entry.topPlayer ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>Top player</span>
                  <PlayerNameLink playerId={entry.topPlayer.id} name={entry.topPlayer.name} ovr={entry.topPlayer.ovr} style={{ ...monoSm }} />
                </div>
              ) : null}
              {entry.weakestStarter ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>Weakest starter</span>
                  <PlayerNameLink playerId={entry.weakestStarter.id} name={entry.weakestStarter.name} ovr={entry.weakestStarter.ovr} style={{ ...monoSm }} />
                </div>
              ) : null}
            </div>
          </PixelPanel>
        ))}
      </div>

      <div style={autoGrid(300)}>
        <PixelPanel title="Draft Targets" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {report.draftTargets.map((target) => (
              <div key={`draft-${target}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{target}</span>
                <PixelBadge variant="gold">board first</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="FA Targets" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {report.faTargets.map((target) => (
              <div key={`fa-${target}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{target}</span>
                <PixelBadge variant="cyan">market help</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Compare Rooms" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
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
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Showing {compareOptions.length} of {allCompareOptions.length} CPU clubs
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">
              {intentFilter === 'all' ? 'ALL CPU INTENTS' : `${labelFromId(intentFilter)} ONLY`}
            </PixelBadge>
            {compareIntent ? <PixelBadge variant={compareIntent.accent}>{compareIntent.label}</PixelBadge> : null}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            These filters are a local scouting lens over club posture. The room comparison uses the current
            board report, and Refresh Compare rebuilds that report before you decide whether to open a real offer path.
          </div>
          <PixelSelect
            aria-label="Compare team"
            value={activeCompareTeamId}
            onChange={(event) => setCompareTeamId(event.target.value)}
            options={compareOptions.length > 0 ? compareOptions : [{ value: '', label: 'No comparison teams', disabled: true }]}
            accent="cyan"
          />
          {comparison.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comparison.map((entry) => (
                <div key={entry.group} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 90px 1fr', gap: '8px', alignItems: 'center' }}>
                  <PixelBadge variant="default">{entry.group}</PixelBadge>
                  <PixelProgressBar value={Math.max(0, Math.min(100, ((entry.differential + 20) / 40) * 100))} accent={entry.edge === 'teamA' ? 'green' : entry.edge === 'teamB' ? 'red' : 'gold'} label={entry.teamAGrade} valueLabel={`${entry.differential > 0 ? '+' : ''}${entry.differential}`} />
                  <PixelBadge variant={entry.edge === 'teamA' ? 'green' : entry.edge === 'teamB' ? 'red' : 'gold'}>{entry.edge}</PixelBadge>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.teamBGrade}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Pick another club to compare strengths and weaknesses room by room.
            </div>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}
