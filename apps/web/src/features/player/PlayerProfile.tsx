import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { PixelBadge, PixelButton, PixelPanel, PixelTable } from '@mfd/design-system/components';
import type { DraftRecap, PlayerArchiveEntry, PlayerCareerStatLine, PlayerProfile as EnginePlayerProfile, PlayerRivalry, RecordBook, RecordEntry } from '@mfd/engine';
import {
  selectFarewellCandidates,
  selectFarewellTours,
  selectDraftRecaps,
  selectLivingPlayerStory,
  selectPlayerProfileBundle,
  selectPlayerRivalries,
  selectTeamById,
  selectTransactionLog,
  useGameStore,
} from '../../app/store/game-store';
import { useUiStore } from '../../app/store/ui-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { buildPlayerTransactionMemoryRows, type PlayerTransactionMemoryRow } from '../shared/playerTransactionMemory';
import { LivingPlayerStoryPanel } from '../shared/LivingPlayerStoryPanel';

function chartPoints(entries: Array<{ age: number; ovr: number }>) {
  if (entries.length <= 1) {
    return '0,100 100,0';
  }

  const minAge = Math.min(...entries.map((entry) => entry.age));
  const maxAge = Math.max(...entries.map((entry) => entry.age));
  const ageRange = Math.max(1, maxAge - minAge);
  const minOvr = Math.min(...entries.map((entry) => entry.ovr), 50);
  const maxOvr = Math.max(...entries.map((entry) => entry.ovr), 99);
  const ovrRange = Math.max(1, maxOvr - minOvr);

  return entries.map((entry, index) => {
    const x = (index / Math.max(1, entries.length - 1)) * 100;
    const y = 100 - (((entry.ovr - minOvr) / ovrRange) * 100);
    return `${x},${y}`;
  }).join(' ');
}

const statColumns: ColumnDef<PlayerCareerStatLine, unknown>[] = [
  {
    accessorKey: 'season',
    header: 'Season',
  },
  {
    accessorKey: 'team',
    header: 'Team',
    cell: ({ getValue }) => <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{getValue() as string}</span>,
  },
  {
    accessorKey: 'gamesPlayed',
    header: 'GP',
  },
  {
    accessorKey: 'gamesStarted',
    header: 'GS',
  },
  {
    id: 'stats',
    header: 'Key Stats',
    cell: ({ row }) => (
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
        {Object.entries(row.original.keyStats).map(([key, value]) => `${key}: ${value}`).join(' // ')}
      </span>
    ),
  },
];

interface ContractYearRow {
  year: number;
  baseSalary: number;
  capHit: number;
  deadCap: number;
}

const contractColumns: ColumnDef<ContractYearRow, unknown>[] = [
  { accessorKey: 'year', header: 'Year' },
  { accessorKey: 'baseSalary', header: 'Base', cell: ({ getValue }) => `$${getValue() as number}M` },
  { accessorKey: 'capHit', header: 'Cap Hit', cell: ({ getValue }) => `$${getValue() as number}M` },
  { accessorKey: 'deadCap', header: 'Dead Cap', cell: ({ getValue }) => `$${getValue() as number}M` },
];

const EMPTY_ARCHIVE: PlayerArchiveEntry[] = [];

interface PlayerMemoryCard {
  id: string;
  label: string;
  value: string | number;
  detail: string;
  accent: 'cyan' | 'gold' | 'green' | 'red';
}

interface PlayerSignatureMomentRow {
  id: string;
  sourceLabel: string;
  headline: string;
  badge: string;
  timeLabel: string;
  detail: string;
  accent: 'cyan' | 'gold' | 'green' | 'red' | 'default';
}

interface FarewellTourStartReceipt {
  id: string;
  title: string;
  actionLabel: string;
  playerLabel: string;
  context: string;
  result: string;
  source: string;
}

function playerDisplayName(player: {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}): string {
  const savedName = player.name?.trim();
  if (savedName) return savedName;

  const composedName = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();
  return composedName || player.id;
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function formatStatKey(stat: string): string {
  return stat.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatRecordCategory(category: RecordEntry['category']): string {
  const labels: Record<RecordEntry['category'], string> = {
    singleGame: 'Single-Game',
    singleSeason: 'Single-Season',
    career: 'Career',
    franchise: 'Franchise',
  };
  return labels[category];
}

function summarizeKeyStats(line: PlayerCareerStatLine): string {
  const stats = Object.entries(line.keyStats)
    .filter(([, value]) => Number.isFinite(value) && value !== 0)
    .sort(([, left], [, right]) => Math.abs(right) - Math.abs(left))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`);
  return stats.length > 0
    ? `${line.gamesStarted} GS // ${stats.join(' // ')}`
    : `${line.gamesPlayed} GP // ${line.gamesStarted} GS`;
}

function careerLineScore(line: PlayerCareerStatLine): number {
  return line.gamesStarted * 10 + Object.values(line.keyStats).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

function playerRecordEntries(recordBook: RecordBook | null, playerId: string): RecordEntry[] {
  if (!recordBook) return [];
  return (Object.values(recordBook) as Array<Record<string, RecordEntry[]>>)
    .flatMap((bucket) => Object.values(bucket).flat())
    .filter((entry) => entry.playerId === playerId)
    .sort((a, b) => b.year - a.year || (b.week ?? 0) - (a.week ?? 0) || b.value - a.value)
    .slice(0, 2);
}

function draftRecapMomentForPlayer(draftRecaps: DraftRecap[], playerId: string): PlayerSignatureMomentRow | null {
  for (const recap of draftRecaps) {
    const pick = recap.picks.find((entry) => entry.playerId === playerId) ?? null;
    if (!pick) continue;
    const valueDelta = pick.valueDelta === 0 ? 'even value' : `${pick.valueDelta > 0 ? '+' : ''}${pick.valueDelta} value`;
    return {
      id: `draft-recap-${recap.year}-${pick.playerId}`,
      sourceLabel: 'draftRecaps',
      headline: 'Draft Class Memory',
      badge: `${pick.verdict.toUpperCase()} // Class ${recap.classGrade}`,
      timeLabel: `${recap.year} R${pick.round} P${pick.pick}`,
      detail: `Saved draft recap: projected #${pick.projectedPick}, selected #${pick.pick}, ${valueDelta}.`,
      accent: pick.verdict === 'steal' ? 'green' : pick.verdict === 'reach' ? 'red' : 'cyan',
    };
  }
  return null;
}

function buildPlayerMemoryCards(profile: EnginePlayerProfile, rivalries: PlayerRivalry[]): PlayerMemoryCard[] {
  const seasons = profile.careerStats.map((entry) => entry.season).sort((a, b) => a - b);
  const firstSeason = seasons[0] ?? null;
  const lastSeason = seasons.at(-1) ?? null;
  const peakArc = profile.developmentArc.reduce(
    (best, entry) => (entry.ovr > best.ovr ? entry : best),
    profile.developmentArc[0] ?? { age: profile.player.age, ovr: profile.player.ovr },
  );
  const topRivalry = [...rivalries].sort((a, b) => b.intensity - a.intensity)[0] ?? null;
  const storyThreads = [
    profile.awardsWon.length > 0 ? pluralize(profile.awardsWon.length, 'award') : null,
    rivalries.length > 0 ? pluralize(rivalries.length, 'rivalry') : null,
    profile.player.bloodline ? 'bloodline' : null,
    profile.injuryHistory.length > 0 ? pluralize(profile.injuryHistory.length, 'injury') : null,
  ].filter(Boolean) as string[];
  const topRivalName = topRivalry
    ? topRivalry.playerAId === profile.player.id ? topRivalry.playerBName : topRivalry.playerAName
    : null;

  return [
    {
      id: 'recorded-seasons',
      label: 'Recorded Seasons',
      value: seasons.length,
      detail: firstSeason && lastSeason
        ? `${firstSeason === lastSeason ? firstSeason : `${firstSeason}-${lastSeason}`}${profile.legacyHistoryPartial ? ' // partial legacy snapshot' : ''}`
        : 'No archived seasons yet',
      accent: profile.legacyHistoryPartial ? 'gold' : 'cyan',
    },
    {
      id: 'peak-arc',
      label: 'Peak Arc',
      value: `${peakArc.ovr} OVR`,
      detail: `Age ${peakArc.age}`,
      accent: peakArc.ovr >= 90 ? 'gold' : 'green',
    },
    {
      id: 'story-threads',
      label: 'Story Threads',
      value: storyThreads.length,
      detail: storyThreads.length > 0 ? storyThreads.join(' // ') : 'No saved legacy hooks yet',
      accent: storyThreads.length > 0 ? 'green' : 'cyan',
    },
    {
      id: 'rivalry-heat',
      label: 'Rivalry Heat',
      value: topRivalry ? `${topRivalry.tier.toUpperCase()} ${topRivalry.intensity}` : 'None',
      detail: topRivalName ? `vs ${topRivalName}` : 'No active player rivalries',
      accent: topRivalry?.tier === 'nemesis' ? 'red' : topRivalry ? 'gold' : 'cyan',
    },
  ];
}

function buildPlayerSignatureMomentRows(
  profile: EnginePlayerProfile,
  rivalries: PlayerRivalry[],
  transactionRows: PlayerTransactionMemoryRow[],
  parentEntry: PlayerArchiveEntry | null,
  recordBook: RecordBook | null,
  draftRecaps: DraftRecap[],
): PlayerSignatureMomentRow[] {
  const rows: PlayerSignatureMomentRow[] = [];
  const playerId = profile.player.id;

  for (const [index, award] of [...profile.awardsWon].reverse().slice(0, 2).entries()) {
    const parsed = award.match(/^(\d{4})\s+(.+)$/);
    rows.push({
      id: `award-${award}-${index}`,
      sourceLabel: 'awardsHistory',
      headline: award,
      badge: parsed?.[2] ?? 'Award',
      timeLabel: parsed?.[1] ?? 'Award',
      detail: 'Saved awardsHistory winner row.',
      accent: 'gold',
    });
  }

  const draftRecapMoment = draftRecapMomentForPlayer(draftRecaps, playerId);
  if (draftRecapMoment) {
    rows.push(draftRecapMoment);
  }

  for (const [index, record] of playerRecordEntries(recordBook, playerId).entries()) {
    rows.push({
      id: `record-${record.category}-${record.stat}-${record.year}-${record.week ?? 0}-${index}`,
      sourceLabel: 'records',
      headline: `${formatRecordCategory(record.category)} Record`,
      badge: `${formatStatKey(record.stat)} ${record.value}`,
      timeLabel: record.week ? `${record.year} W${record.week}` : `${record.year}`,
      detail: record.note ?? `${record.teamName} record book entry.`,
      accent: record.category === 'career' || record.category === 'franchise' ? 'gold' : 'cyan',
    });
  }

  const bestCareerLine = [...profile.careerStats].sort((a, b) => careerLineScore(b) - careerLineScore(a) || b.season - a.season)[0] ?? null;
  if (bestCareerLine) {
    rows.push({
      id: `career-line-${bestCareerLine.season}`,
      sourceLabel: profile.legacyHistoryPartial ? 'playerArchive fallback' : 'playerSeasonHistory',
      headline: 'Peak Ledger Season',
      badge: `${bestCareerLine.season}`,
      timeLabel: bestCareerLine.team,
      detail: summarizeKeyStats(bestCareerLine),
      accent: profile.legacyHistoryPartial ? 'cyan' : 'green',
    });
  }

  const topRivalry = [...rivalries].sort((a, b) => b.intensity - a.intensity)[0] ?? null;
  if (topRivalry) {
    const opponentName = topRivalry.playerAId === playerId ? topRivalry.playerBName : topRivalry.playerAName;
    const rivalryMoment = [...(topRivalry.history ?? [])].sort((a, b) => b.year - a.year || b.week - a.week)[0] ?? null;
    rows.push({
      id: `rivalry-${topRivalry.id}`,
      sourceLabel: 'playerRivalries',
      headline: `Rivalry Memory vs ${opponentName}`,
      badge: `${topRivalry.tier.toUpperCase()} ${topRivalry.intensity}`,
      timeLabel: rivalryMoment ? `${rivalryMoment.year} W${rivalryMoment.week}` : `Since ${topRivalry.seasonStarted}`,
      detail: rivalryMoment?.description ?? topRivalry.origin,
      accent: topRivalry.tier === 'nemesis' ? 'red' : topRivalry.tier === 'heated' ? 'gold' : 'cyan',
    });
  }

  const latestTransaction = transactionRows[0] ?? null;
  if (latestTransaction) {
    rows.push({
      id: `transaction-${latestTransaction.id}`,
      sourceLabel: 'txLog',
      headline: 'Movement Receipt',
      badge: latestTransaction.typeLabel,
      timeLabel: latestTransaction.yearWeek,
      detail: latestTransaction.detail,
      accent: latestTransaction.accent,
    });
  }

  if (profile.player.bloodline && parentEntry) {
    rows.push({
      id: `lineage-${parentEntry.playerId}`,
      sourceLabel: 'playerArchive',
      headline: 'Lineage Link',
      badge: parentEntry.name,
      timeLabel: `Peak ${parentEntry.peakYear}`,
      detail: `Bloodline archive links ${playerDisplayName(profile.player)} to ${parentEntry.positions.join('/')} legacy context.`,
      accent: 'gold',
    });
  }

  return rows.slice(0, 8);
}

export function buildFarewellTourStartReceipt({
  playerId,
  playerName,
  position,
  ovr,
  teamName,
  year,
  week,
}: {
  playerId: string;
  playerName: string;
  position: string;
  ovr: number;
  teamName: string;
  year: number | null;
  week: number | null;
}): FarewellTourStartReceipt {
  const timeLabel = year && week ? `${year} W${week}` : 'Current week';

  return {
    id: `farewell-tour:${playerId}`,
    title: 'Farewell Tour Started',
    actionLabel: 'Started',
    playerLabel: `${playerName} // ${position} // ${ovr} OVR`,
    context: `${teamName} // ${timeLabel}`,
    result: 'The existing action clones the current save, removes any prior tour row for this player, schedules new tour moments from the saved season schedule, writes game.farewellTours, and commits the save.',
    source: 'Action used: actions.startFarewellTour -> startFarewellTourEngine -> commitGame. This confirmation appears here only.',
  };
}

export function FarewellTourStartReceiptPanel({ receipt }: { receipt: FarewellTourStartReceipt }) {
  return (
    <PixelPanel title="Farewell Tour Receipt" accent="gold">
      <div style={autoGrid(220)}>
        <PixelMetricCard label="Action" value={receipt.actionLabel} accent="gold" detail={receipt.playerLabel} />
        <PixelMetricCard label="Context" value="Saved tour path" accent="cyan" detail={receipt.context} />
        <PixelMetricCard label="Receipt" value="Route-local" accent="green" detail="The durable row is game.farewellTours; this panel is acknowledgement copy only." />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">On-screen confirmation</PixelBadge>
          <PixelBadge variant="default">Saved tour path</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{receipt.result}</div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          {receipt.source} This confirmation does not reschedule moments, write another tour, change retirement logic, alter the save schema, play games, reroll saved outcomes, or move players.
        </div>
      </div>
    </PixelPanel>
  );
}

export function PlayerProfile() {
  const { playerId } = useParams({ from: '/player/$playerId' });
  const bundle = useGameStore(selectPlayerProfileBundle(playerId));
  const livingPlayerStory = useGameStore(selectLivingPlayerStory(playerId));
  const team = useGameStore(selectTeamById(bundle?.profile.player.teamId ?? ''));
  const rivalries = useGameStore(selectPlayerRivalries(playerId));
  const farewellCandidates = useGameStore(selectFarewellCandidates);
  const farewellTours = useGameStore(selectFarewellTours);
  const draftRecaps = useGameStore(selectDraftRecaps);
  const transactionLog = useGameStore(selectTransactionLog);
  const playerArchive = useGameStore((state) => state.game?.playerArchive ?? EMPTY_ARCHIVE);
  const recordBook = useGameStore((state) => state.game?.records ?? null);
  const teamsById = useGameStore((state) => state.game?.teams ?? null);
  const currentYear = useGameStore((state) => state.game?.year ?? null);
  const currentWeek = useGameStore((state) => state.game?.week ?? null);
  const navigate = useNavigate();
  const setFocusedPlayerContext = useUiStore((state) => state.setFocusedPlayerContext);
  const startFarewellTour = useGameStore((state) => state.actions.startFarewellTour);
  const [farewellTourPending, setFarewellTourPending] = useState(false);
  const [farewellTourReceipt, setFarewellTourReceipt] = useState<FarewellTourStartReceipt | null>(null);

  const chartData = useMemo(() => bundle ? chartPoints(bundle.profile.developmentArc) : '', [bundle]);

  if (!bundle) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Player Profile" subtitle="Player not found." />
      </div>
    );
  }

  const { profile, value, comparables, projection } = bundle;
  const player = profile.player;
  const playerName = playerDisplayName(player);
  const memoryCards = buildPlayerMemoryCards(profile, rivalries);
  const transactionMemoryRows = buildPlayerTransactionMemoryRows(transactionLog, player.id, teamsById);
  const hasFarewellTour = farewellTours.some((tour) => tour.playerId === player.id);
  const isFarewellCandidate = farewellCandidates.some((candidate) => candidate.id === player.id);

  const parentEntry: PlayerArchiveEntry | null = player.bloodline
    ? playerArchive.find((entry) => entry.playerId === player.bloodline?.parentPlayerId) ?? null
    : null;
  const parentPrimaryTeamId = parentEntry?.teamHistory[0]?.teamId ?? null;
  const parentPrimaryTeam = parentEntry && teamsById
    ? (parentPrimaryTeamId ? teamsById[parentPrimaryTeamId] ?? null : null)
    : null;
  const signatureMomentRows = buildPlayerSignatureMomentRows(profile, rivalries, transactionMemoryRows, parentEntry, recordBook, draftRecaps);
  const visibleFarewellTourReceipt = farewellTourReceipt?.id === `farewell-tour:${player.id}` ? farewellTourReceipt : null;

  async function handleStartFarewellTour() {
    setFarewellTourPending(true);
    try {
      await startFarewellTour(player.id);
      setFarewellTourReceipt(buildFarewellTourStartReceipt({
        playerId: player.id,
        playerName,
        position: player.pos,
        ovr: player.ovr,
        teamName: team ? `${team.city} ${team.name}` : 'Current team',
        year: currentYear,
        week: currentWeek,
      }));
    } finally {
      setFarewellTourPending(false);
    }
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title={playerName}
        subtitle={`${player.pos} // ${team ? `${team.city} ${team.name}` : 'Free Agent'} // age ${player.age} // jersey #${player.jerseyNumber || '--'}`}
        badges={(
          <>
            <PixelBadge variant={player.ovr >= 90 ? 'gold' : player.ovr >= 80 ? 'green' : 'cyan'}>{player.ovr} OVR</PixelBadge>
            <PixelBadge variant="default">{player.pos}</PixelBadge>
            {profile.legacyHistoryPartial ? <PixelBadge variant="gold">Legacy history partial</PixelBadge> : null}
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Age" value={player.age} accent="cyan" detail={`Dev trait: ${player.devTrait}`} />
        <PixelMetricCard label="Trade Value" value={value.tradeValue} accent="gold" detail="Relative trade market score" />
        <PixelMetricCard label="Market Value" value={`$${value.marketValue}M`} accent="green" detail="Expected annual FA ask" />
        <PixelMetricCard label="Surplus" value={`$${value.surplus}M`} accent={value.surplus >= 0 ? 'green' : 'red'} detail="Value minus current annual cap hit" />
      </div>

      <PixelPanel title="Career Memory" accent="gold">
        <div style={autoGrid(190)}>
          {memoryCards.map((card) => (
            <PixelMetricCard
              key={card.id}
              label={card.label}
              value={card.value}
              accent={card.accent}
              detail={card.detail}
            />
          ))}
        </div>
      </PixelPanel>

      {livingPlayerStory ? (
        <LivingPlayerStoryPanel
          story={livingPlayerStory}
          onOpenTimeline={() => { void navigate({ to: `/player/${player.id}/timeline` }); }}
        />
      ) : null}

      <PixelPanel title="Signature Moments" accent={signatureMomentRows.length > 0 ? 'gold' : 'cyan'}>
        {signatureMomentRows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {signatureMomentRows.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--mfd-border)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px', flex: '1 1 260px' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{entry.sourceLabel}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.headline}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.detail}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <PixelBadge variant={entry.accent}>{entry.timeLabel}</PixelBadge>
                  <PixelBadge variant="default">{entry.badge}</PixelBadge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No saved awards, draft recaps, records, season history, rivalries, movements, or lineage receipts for this player yet.
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Transaction Memory" accent={transactionMemoryRows.length > 0 ? 'green' : 'cyan'}>
        {transactionMemoryRows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transactionMemoryRows.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--mfd-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.yearWeek}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.detail}</span>
                </div>
                <PixelBadge variant={entry.accent}>{entry.typeLabel}</PixelBadge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No saved user-team transaction rows for this player yet.
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Profile Sources" accent="cyan">
        <div style={autoGrid(190)}>
          <PixelMetricCard
            label="Active Player"
            value="Profile Bundle"
            accent="cyan"
            detail="selectPlayerProfileBundle joins the active player, value, contract, development, awards, mentor, and injury read models."
          />
          <PixelMetricCard
            label="Season Ledger"
            value={profile.careerStats.length}
            accent={profile.legacyHistoryPartial ? 'gold' : 'green'}
            detail={profile.legacyHistoryPartial ? 'Career rows include a partial legacy fallback.' : 'Career rows come from saved season/profile history.'}
          />
          <PixelMetricCard
            label="Archive Link"
            value={parentEntry ? 'Bloodline archive' : `${playerArchive.length} archived`}
            accent={parentEntry ? 'gold' : 'default'}
            detail="playerArchive is read-only lineage and retired-player context for this route."
          />
          <PixelMetricCard
            label="Rivalry Feed"
            value={rivalries.length}
            accent={rivalries.length > 0 ? 'gold' : 'default'}
            detail="selectPlayerRivalries reads saved playerRivalries; opening this profile does not create rivalry receipts."
          />
          <PixelMetricCard
            label="Transactions"
            value={transactionMemoryRows.length}
            accent={transactionMemoryRows.length > 0 ? 'green' : 'default'}
            detail="selectTransactionLog reads saved user-team txLog rows; this profile filters them for the current player."
          />
          <PixelMetricCard
            label="Draft Recaps"
            value={draftRecaps.length}
            accent={draftRecaps.some((recap) => recap.picks.some((pick) => pick.playerId === player.id)) ? 'gold' : 'default'}
            detail="selectDraftRecaps reads saved user-team draftRecaps; matching picks appear as Signature Moments without generating recaps."
          />
          <PixelMetricCard
            label="Farewell Tours"
            value={hasFarewellTour ? 'Saved tour' : isFarewellCandidate ? 'Eligible' : 'Read only'}
            accent={hasFarewellTour || isFarewellCandidate ? 'gold' : 'default'}
            detail="selectFarewellCandidates and selectFarewellTours are read-only here; only the Start Farewell Tour button calls actions.startFarewellTour."
          />
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5, marginTop: '10px' }}>
          Display-only route: no profile render writes playerSeasonHistory, playerArchive, draftRecaps, txLog, awards, records, endorsements, rivalries, farewell tours, or timeline rows.
        </div>
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title="Development Arc" accent={player.ovr >= 90 ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <svg viewBox="0 0 100 100" role="img" aria-label="OVR development arc" style={{ width: '100%', height: '180px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
              <polyline
                fill="none"
                stroke={player.ovr >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}
                strokeWidth="3"
                points={chartData}
              />
              {profile.developmentArc.map((entry, index) => {
                const [x, y] = chartData.split(' ')[index]?.split(',') ?? ['0', '0'];
                return (
                  <circle
                    key={`${entry.age}-${entry.ovr}`}
                    cx={x}
                    cy={y}
                    r="3.4"
                    fill={player.ovr >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}
                  />
                );
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              {profile.developmentArc.map((entry) => (
                <div key={`arc-${entry.age}-${entry.ovr}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>AGE {entry.age}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.ovr} OVR</span>
                </div>
              ))}
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Projection" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Next Year</span>
              <PixelBadge variant="cyan">{projection.nextYearOvr} OVR</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Peak</span>
              <PixelBadge variant="green">{projection.peakOvr} OVR @ {projection.peakAge}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Retirement Age</span>
              <PixelBadge variant="gold">{projection.retirementAge}</PixelBadge>
            </div>
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Contract" accent="gold">
          {profile.contractDetails.yearByYear.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={autoGrid(160)}>
                <PixelMetricCard label="Total Value" value={`$${profile.contractDetails.totalValue}M`} accent="gold" />
                <PixelMetricCard label="Guaranteed" value={`$${profile.contractDetails.guaranteedRemaining}M`} accent="red" />
              </div>
              <PixelTable data={profile.contractDetails.yearByYear} columns={contractColumns} accent="gold" density="compact" />
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active contract on file.</div>
          )}
        </PixelPanel>

        <PixelPanel title="Personality Report" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile.personalityReport.traits.length > 0
                ? profile.personalityReport.traits.map((trait) => <PixelBadge key={trait} variant="cyan">{trait}</PixelBadge>)
                : <PixelBadge variant="default">No flagged traits</PixelBadge>}
              {player.bloodline ? <PixelBadge variant="gold">BLOODLINE</PixelBadge> : null}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Agent style: {profile.personalityReport.agentStyle}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Media presence: {profile.personalityReport.mediaPresence}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Locker room: {profile.personalityReport.lockerRoomImpact}</div>
          </div>
        </PixelPanel>

        <PixelPanel title="Endorsements" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {player.endorsements.filter((deal) => deal.active).length > 0 ? player.endorsements.filter((deal) => deal.active).map((deal) => (
              <div key={deal.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{deal.brandName}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{deal.yearsRemaining} year(s) left</span>
                </div>
                <PixelBadge variant={deal.tier === 'global' ? 'gold' : deal.tier === 'national' ? 'green' : 'cyan'}>
                  ${deal.revenuePerYear.toFixed(1)}M
                </PixelBadge>
              </div>
            )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active endorsement deals.</div>}
            <PixelButton accent="green" onClick={() => { void navigate({ to: '/endorsements' }); }}>
              Open Endorsements
            </PixelButton>
          </div>
        </PixelPanel>

        {player.bloodline ? (
          <PixelPanel title="Lineage" accent="gold">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="gold">BLOODLINE</PixelBadge>
                <PixelBadge variant="cyan">{player.bloodline.relationship.toUpperCase()}</PixelBadge>
                <PixelBadge variant="default">{player.bloodline.legacyTag.replace(/_/g, ' ').toUpperCase()}</PixelBadge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>PARENT</span>
                {parentEntry ? (
                  <PlayerNameLink
                    playerId={parentEntry.playerId}
                    name={player.bloodline.parentName}
                    ovr={parentEntry.peakOvr}
                    style={{ ...monoSm, color: 'var(--mfd-gold)' }}
                  />
                ) : (
                  <span style={{ ...monoSm, color: 'var(--mfd-gold)' }}>{player.bloodline.parentName}</span>
                )}
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {player.bloodline.parentPosition}
                  {parentPrimaryTeam ? ` // ${parentPrimaryTeam.city} ${parentPrimaryTeam.name}` : ''}
                </span>
              </div>
              {parentEntry ? (
                <div style={autoGrid(110)}>
                  <PixelMetricCard label="Peak OVR" value={parentEntry.peakOvr} accent={parentEntry.peakOvr >= 90 ? 'gold' : 'cyan'} detail={`Peak ${parentEntry.peakYear}`} />
                  <PixelMetricCard label="Career" value={`${parentEntry.firstYear}-${parentEntry.retirementYear ?? parentEntry.lastYear}`} accent="cyan" detail={`${Math.max(1, (parentEntry.retirementYear ?? parentEntry.lastYear) - parentEntry.firstYear + 1)} yr`} />
                  <PixelMetricCard label="Teams" value={parentEntry.teamHistory.length} accent="green" detail={parentEntry.teamHistory.length === 1 ? 'One-franchise career' : 'Multi-team career'} />
                </div>
              ) : (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Career archive not yet indexed for this era.
                </div>
              )}
              <PixelButton
                accent="gold"
                onClick={() => {
                  void navigate({ to: '/legacy' });
                }}
              >
                Open Dynasty Legacy
              </PixelButton>
            </div>
          </PixelPanel>
        ) : null}
      </div>

      <PixelPanel title="Career Stats" accent="cyan">
        <PixelTable data={profile.careerStats} columns={statColumns} accent="cyan" density="compact" />
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title="Awards" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {profile.awardsWon.length > 0
              ? profile.awardsWon.map((award) => <PixelBadge key={award} variant="gold">{award}</PixelBadge>)
              : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No awards recorded yet.</div>}
          </div>
        </PixelPanel>

        <PixelPanel title="Mentor & Injury History" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.mentorHistory.length > 0 ? profile.mentorHistory.map((entry) => (
              <div key={`${entry.mentorName}-${entry.bonus}`} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                {entry.mentorName}: +{entry.bonus} OVR
              </div>
            )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No mentor notes.</div>}
            {profile.injuryHistory.length > 0 ? profile.injuryHistory.map((entry) => (
              <div key={`${entry.type}-${entry.season}`} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                {entry.season}: {entry.type} ({entry.weeksOut} weeks)
              </div>
            )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No major injuries logged.</div>}
          </div>
        </PixelPanel>

        <PixelPanel title="Active Rivalries" accent={rivalries.some((rivalry) => rivalry.tier === 'nemesis') ? 'red' : rivalries.length > 0 ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rivalries.length > 0 ? rivalries.map((rivalry) => {
              const opponentName = rivalry.playerAId === player.id ? rivalry.playerBName : rivalry.playerAName;
              return (
                <div key={rivalry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{opponentName}</span>
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{rivalry.origin}</span>
                  </div>
                  <PixelBadge variant={rivalry.tier === 'nemesis' ? 'red' : rivalry.tier === 'heated' ? 'gold' : 'cyan'}>
                    {rivalry.tier.toUpperCase()} {rivalry.intensity}
                  </PixelBadge>
                </div>
              );
            }) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active player rivalries.</div>}
            <PixelButton accent="cyan" onClick={() => { void navigate({ to: '/rivalries' }); }}>
              View Rivalries
            </PixelButton>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Comparable Players" accent="green">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {comparables.map((comparable) => (
            <div key={comparable.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <PlayerNameLink playerId={comparable.id} name={comparable.name} ovr={comparable.ovr} style={{ ...monoSm }} />
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{comparable.pos} // age {comparable.age}</span>
              </div>
              <PixelBadge variant={comparable.ovr >= 90 ? 'gold' : 'cyan'}>{comparable.ovr} OVR</PixelBadge>
            </div>
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="Actions" accent="gold">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelButton
            accent="gold"
            onClick={() => {
              void navigate({ to: `/player/${player.id}/timeline` });
            }}
          >
            View Career Timeline
          </PixelButton>
          <PixelButton
            accent="cyan"
            onClick={() => {
              setFocusedPlayerContext(player.id, 'trades');
              void navigate({ to: '/trades' });
            }}
          >
            Trade
          </PixelButton>
          <PixelButton
            accent="red"
            onClick={() => {
              setFocusedPlayerContext(player.id, 'contracts');
              void navigate({ to: '/contracts' });
            }}
          >
            Cut
          </PixelButton>
          <PixelButton
            accent="green"
            onClick={() => {
              setFocusedPlayerContext(player.id, 'contracts');
              void navigate({ to: '/contracts' });
            }}
          >
            Extend
          </PixelButton>
          {team?.isUser && isFarewellCandidate && !hasFarewellTour ? (
            <PixelButton
              accent="gold"
              disabled={farewellTourPending}
              onClick={() => { void handleStartFarewellTour(); }}
            >
              {farewellTourPending ? 'Starting Tour...' : 'Start Farewell Tour'}
            </PixelButton>
          ) : null}
        </div>
      </PixelPanel>

      {visibleFarewellTourReceipt ? <FarewellTourStartReceiptPanel receipt={visibleFarewellTourReceipt} /> : null}
    </div>
  );
}
