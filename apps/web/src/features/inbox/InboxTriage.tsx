import { useState, useMemo } from 'react';
import {
  PixelBadge, PixelButton, PixelModal, PixelNav, PixelPanel,
} from '@mfd/design-system/components';
import {
  useGameStore, selectUserTeam, selectRoster, selectWeek, selectNarrative, selectLatestSummary, selectPhase, selectLatestGameDayPackage, selectActiveStoryArcs,
  selectOffFieldEvents, selectRecentPressConferences, selectUpcomingRivalry, selectCoachingCarouselNews, selectCoachingMarket,
  selectConditionalPicks, selectHandshakes, selectWaiverWire, selectWeather,
  selectActiveProposals, selectApologyTourThreads, selectCeremonies, selectClaimResults, selectContractExtensions, selectCurrentWeeklyPrepPlan, selectDifficultyState, selectDraftRecaps, selectFATargetBoard, selectLatestFilmRoomReport, selectLeagueNews, selectMedicalStaff, selectNewlyUnlocked, selectOffseasonState, selectPlayoffMomentum, selectSeasonReports, selectTeamSchedule, selectTradeSuggestions, selectTrainingAssignments, selectTransactionLog, selectUserTeamNeeds, selectWarRoomState,
} from '../../app/store/game-store';
import { getActiveRule, type ApologyTourThread } from '@mfd/engine';
import { buildInboxMessages, type InboxMessage, type MessageType } from './buildInboxMessages';
import { ApologyTourModal } from './ApologyTourModal';
import {
  PixelConsequenceList,
  PixelScreenHeader,
  monoSm,
  navigateTo,
  screenStackStyle,
} from '../shared/pixelUi';

const TYPE_CONFIG: Record<MessageType, { accent: 'red' | 'gold' | 'cyan'; label: string; badge: 'red' | 'gold' | 'cyan' }> = {
  URGENT: { accent: 'red', label: 'URGENT', badge: 'red' },
  DECISION: { accent: 'gold', label: 'DECISION', badge: 'gold' },
  INTEL: { accent: 'cyan', label: 'INTEL', badge: 'cyan' },
};

type SourceAccent = 'cyan' | 'gold' | 'green' | 'red';

interface InboxSourceRow {
  label: string;
  badge: string;
  detail: string;
  accent: SourceAccent;
}

export function buildInboxSourceRows(
  messages: InboxMessage[],
  urgentCount: number,
  decisionCount: number,
  ownerPersonalityCount: number,
): InboxSourceRow[] {
  return [
    {
      label: 'Generated queue',
      badge: `${messages.length} messages`,
      detail: 'buildInboxMessages projects selector inputs into regenerated message rows in insertion order. The rows are not saved mailbox records.',
      accent: 'cyan',
    },
    {
      label: 'Route inputs',
      badge: `${urgentCount} urgent / ${decisionCount} decisions`,
      detail: 'InboxTriage gathers team, roster, week, summaries, game-day packages, news, trades, waivers, weather, prep, achievements, and apology threads through selectors.',
      accent: urgentCount > 0 ? 'red' : decisionCount > 0 ? 'gold' : 'green',
    },
    {
      label: 'Shell badge boundary',
      badge: 'no /inbox badge',
      detail: 'App-shell computeNavBadges badges trades, depth chart, game plan, and handshakes only. Inbox urgent and decision counts are route-local header/filter counts, not a top-nav or mobile-tab badge.',
      accent: 'cyan',
    },
    {
      label: 'Display state',
      badge: 'local only',
      detail: 'selectedMsg, filter, and apology-tour replay modal state live in React only; opening or filtering messages does not write read receipts, browser storage, or GameState.',
      accent: 'green',
    },
    {
      label: 'CTA routing',
      badge: 'links only',
      detail: 'The modal navigates only with explicit message.link or Film Room, Prep Desk, and Ownership sender fallbacks; Inbox does not perform the target action.',
      accent: 'gold',
    },
    {
      label: 'Owner mailbox',
      badge: `${ownerPersonalityCount} saved notes`,
      detail: 'Saved ownerPersonalityInbox events join the generated queue as Ownership messages with owner-room CTAs. Durable read receipts remain outside this route until GameState exposes a saved receipt field.',
      accent: ownerPersonalityCount > 0 ? 'gold' : 'cyan',
    },
    {
      label: 'Just viewing',
      badge: 'display only',
      detail: 'Opening Inbox does not click Advance Week, resolve actions, change proposals, clear waivers, write news or social posts, mark messages read, or play games or reroll saved outcomes.',
      accent: 'red',
    },
  ];
}

export function InboxTriage() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const week = useGameStore(selectWeek);
  const narrative = useGameStore(selectNarrative);
  const latestSummary = useGameStore(selectLatestSummary);
  const phase = useGameStore(selectPhase);
  const latestPackage = useGameStore(selectLatestGameDayPackage);
  const activeArcs = useGameStore(selectActiveStoryArcs);
  const offFieldEvents = useGameStore(selectOffFieldEvents);
  const offseasonState = useGameStore(selectOffseasonState);
  const recentPressConferences = useGameStore(selectRecentPressConferences);
  const upcomingRivalry = useGameStore(selectUpcomingRivalry);
  const coachingNews = useGameStore(selectCoachingCarouselNews);
  const coachingMarket = useGameStore(selectCoachingMarket);
  const handshakes = useGameStore(selectHandshakes);
  const conditionalPicks = useGameStore(selectConditionalPicks);
  const waiverWire = useGameStore(selectWaiverWire);
  const weather = useGameStore(selectWeather);
  const leagueNews = useGameStore(selectLeagueNews);
  const activeProposals = useGameStore(selectActiveProposals);
  const trainingAssignments = useGameStore(selectTrainingAssignments);
  const difficultyState = useGameStore(selectDifficultyState);
  const medicalStaff = useGameStore(selectMedicalStaff);
  const playoffMomentum = useGameStore(selectPlayoffMomentum);
  const ceremonies = useGameStore(selectCeremonies);
  const newlyUnlockedAchievements = useGameStore(selectNewlyUnlocked);
  const seasonReports = useGameStore(selectSeasonReports);
  const teamSchedule = useGameStore(selectTeamSchedule);
  const currentWeeklyPrepPlan = useGameStore(selectCurrentWeeklyPrepPlan);
  const draftRecaps = useGameStore(selectDraftRecaps);
  const latestFilmRoomReport = useGameStore(selectLatestFilmRoomReport);
  const claimResults = useGameStore(selectClaimResults);
  const transactionLog = useGameStore(selectTransactionLog);
  const tradeSuggestions = useGameStore(selectTradeSuggestions);
  const faTargetBoard = useGameStore(selectFATargetBoard);
  const teamNeedsReport = useGameStore(selectUserTeamNeeds);
  const warRoomState = useGameStore(selectWarRoomState);
  const contractExtensions = useGameStore(selectContractExtensions);
  const apologyTourThreads = useGameStore(selectApologyTourThreads);
  const ownerPersonalityInbox = game?.ownerPersonalityInbox ?? [];

  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [filter, setFilter] = useState<MessageType | 'ALL'>('ALL');
  const [tourThread, setTourThread] = useState<ApologyTourThread | null>(null);

  const userApologyThreads = useMemo(
    () => (team ? apologyTourThreads.filter((thread) => thread.teamId === team.id) : []),
    [apologyTourThreads, team],
  );
  const tourTeamName = team ? `${team.city} ${team.name}`.trim() : '';
  const tradeDeadlineWeek = game?.leagueRules
    ? Number(getActiveRule(game.leagueRules, 'trade_deadline_week', game.year))
    : 9;
  const compPickLimit = game?.leagueRules
    ? Number(getActiveRule(game.leagueRules, 'comp_pick_limit', game.year))
    : 4;

  const messages = useMemo(() => buildInboxMessages({
    team,
    roster,
    week,
    narrative,
    latestSummary,
    phase,
    latestPackage,
    activeArcs,
    offFieldEvents,
    offseasonState,
    recentPressConferences,
    coachingNews,
    upcomingRivalry,
    handshakes,
    conditionalPicks,
    waiverWire,
    weather,
    leagueNews,
    activeProposals,
    trainingAssignments,
    difficultyState,
    availableMedicalStaff: medicalStaff.available,
    playoffMomentum,
    ceremonies,
    newlyUnlockedAchievements,
    latestSeasonReport: seasonReports[0] ?? null,
    latestDraftRecap: draftRecaps[0] ?? null,
    claimResults,
    transactionLog,
    tradeSuggestions,
    faTargetBoard,
    teamNeedsReport,
    warRoomState,
    contractExtensions,
    coachingMarket,
    currentWeeklyPrepPlan,
    latestFilmRoomReport,
    apologyTourThreads,
    ownerPersonalityInbox,
    tradeDeadlineWeek,
    compPickLimit,
    upcomingGame: teamSchedule.find((entry) => entry.week === week) ?? null,
  }), [activeArcs, activeProposals, apologyTourThreads, ceremonies, claimResults, coachingMarket, coachingNews, compPickLimit, conditionalPicks, contractExtensions, currentWeeklyPrepPlan, difficultyState, draftRecaps, faTargetBoard, handshakes, latestFilmRoomReport, latestPackage, latestSummary, leagueNews, medicalStaff.available, narrative, newlyUnlockedAchievements, offFieldEvents, offseasonState, ownerPersonalityInbox, phase, playoffMomentum, recentPressConferences, roster, seasonReports, team, teamNeedsReport, teamSchedule, tradeDeadlineWeek, tradeSuggestions, trainingAssignments, transactionLog, upcomingRivalry, waiverWire, warRoomState, weather, week]);

  const filtered = filter === 'ALL' ? messages : messages.filter((m) => m.type === filter);
  const urgentCount = messages.filter((m) => m.type === 'URGENT' && !m.read).length;
  const decisionCount = messages.filter((m) => m.type === 'DECISION' && m.actionRequired).length;
  const selectedRoute = selectedMsg?.link
    ?? (selectedMsg?.from === 'Film Room'
      ? '/film-room'
      : selectedMsg?.from === 'Prep Desk'
        ? '/game-plan'
        : selectedMsg?.from === 'Ownership'
          ? '/coaching'
          : null);
  const selectedRouteLabel = selectedMsg?.linkLabel ?? 'Open Related Screen';
  const sourceRows = buildInboxSourceRows(messages, urgentCount, decisionCount, ownerPersonalityInbox.length);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Inbox"
        subtitle={`${messages.length} messages // ${urgentCount} urgent // ${decisionCount} decisions pending`}
        badges={(
          <>
            <PixelBadge variant="red">{urgentCount} urgent</PixelBadge>
            <PixelBadge variant="gold">{decisionCount} decisions</PixelBadge>
          </>
        )}
      />

      <PixelPanel title="Inbox Sources" accent="cyan">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
        >
          {sourceRows.map((row) => (
            <div key={row.label} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-faint)', textTransform: 'uppercase' }}>{row.label}</span>
                <PixelBadge variant={row.accent}>{row.badge}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>{row.detail}</div>
            </div>
          ))}
        </div>
      </PixelPanel>

      <PixelNav
        activeKey={filter}
        wrap
        items={[
          { key: 'ALL', label: `All ${messages.length}` },
          { key: 'URGENT', label: `Urgent ${urgentCount}` },
          { key: 'DECISION', label: `Decision ${decisionCount}` },
          { key: 'INTEL', label: 'Intel' },
        ]}
        onSelect={(key) => setFilter(key as MessageType | 'ALL')}
      />

      {userApologyThreads.length > 0 ? (
        <PixelPanel title="Active Apology Tours" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {userApologyThreads.map((thread) => {
              const statusAccent = thread.status === 'escalated'
                ? 'red'
                : thread.status === 'resolved'
                  ? 'green'
                  : 'gold';
              return (
                <div
                  key={thread.id}
                  data-testid={`apology-thread-${thread.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '10px',
                    border: '3px solid var(--mfd-gold)',
                    background: 'var(--mfd-bg-2)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{thread.namedGameName}</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <PixelBadge variant={statusAccent}>{thread.status.toUpperCase()}</PixelBadge>
                      <PixelBadge variant="default">{thread.beatsDelivered.length}/4 beats</PixelBadge>
                      <PixelBadge variant="default">Started Y{thread.startedYear} W{thread.startedWeek}</PixelBadge>
                    </div>
                  </div>
                  <PixelButton
                    accent="gold"
                    onClick={() => setTourThread(thread)}
                    data-testid={`apology-thread-${thread.id}-replay`}
                  >
                    Replay Tour
                  </PixelButton>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      ) : null}

      <PixelPanel title="Message Queue" accent={urgentCount > 0 ? 'red' : 'cyan'}>
        {filtered.length === 0 ? (
          <div style={{ ...monoSm, color: '#999', textAlign: 'center', padding: '16px 0' }}>
            No messages in this channel.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((msg) => {
              const cfg = TYPE_CONFIG[msg.type];
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => setSelectedMsg(msg)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '10px',
                    background: msg.read ? 'var(--mfd-bg-2)' : 'var(--mfd-bg-3)',
                    border: `3px solid ${cfg.accent === 'red' ? 'var(--mfd-red)' : cfg.accent === 'gold' ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}`,
                    color: 'var(--mfd-text)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <PixelBadge variant={cfg.badge}>{cfg.label}</PixelBadge>
                      {msg.actionRequired ? <PixelBadge variant="gold">Action Required</PixelBadge> : null}
                      {!msg.read ? <PixelBadge variant="green">New</PixelBadge> : null}
                    </div>
                    <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                      {msg.title.toUpperCase()}
                    </div>
                    <div style={{ ...monoSm, color: '#999' }}>
                      From: {msg.from} // Week {msg.week}
                    </div>
                  </div>
                  <span style={{ ...monoSm, color: '#666' }}>OPEN</span>
                </button>
              );
            })}
          </div>
        )}
      </PixelPanel>

      <PixelModal
        open={!!selectedMsg}
        onOpenChange={(open) => { if (!open) setSelectedMsg(null); }}
        title={selectedMsg?.title ?? 'Message Detail'}
        description={selectedMsg ? `${selectedMsg.from} // Week ${selectedMsg.week}` : undefined}
        accent={selectedMsg ? TYPE_CONFIG[selectedMsg.type].accent : 'default'}
      >
        {selectedMsg ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant={TYPE_CONFIG[selectedMsg.type].badge}>{TYPE_CONFIG[selectedMsg.type].label}</PixelBadge>
              <PixelBadge variant="default">From: {selectedMsg.from}</PixelBadge>
            </div>
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', color: '#ddd', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {selectedMsg.body}
            </div>
            {selectedMsg.consequences ? (
              <PixelConsequenceList
                items={selectedMsg.consequences.map((item) => ({
                  id: item.id,
                  label: item.label,
                  delta: item.delta,
                  accent: item.direction === 'positive'
                    ? 'green'
                    : item.direction === 'warning'
                      ? 'gold'
                      : item.direction === 'negative'
                        ? 'red'
                        : 'default',
                }))}
              />
            ) : null}
            {selectedRoute ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <PixelButton
                  accent="cyan"
                  onClick={() => navigateTo(selectedRoute)}
                >
                  {selectedRouteLabel}
                </PixelButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </PixelModal>

      <ApologyTourModal
        thread={tourThread}
        teamName={tourTeamName}
        open={tourThread !== null}
        onOpenChange={(open) => {
          if (!open) setTourThread(null);
        }}
      />
    </div>
  );
}
