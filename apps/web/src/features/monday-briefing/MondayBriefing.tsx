import { useEffect, useMemo, useState } from 'react';
import {
  buildTeamOpsImpactReceipt,
  buildDynastyMemoryDigest,
  calculateTrainingXP,
  getAchievementProgress,
  calculateDynastyWindow,
  getAlumniUpdates,
  windowPhaseLabel,
  windowPhaseColor,
  type Achievement,
  type DashboardWidget,
  type GameState,
  type TeamOpsImpactTone,
} from '@mfd/engine';
import {
  ChipDialogueBubble,
  PixelBadge,
  PixelButton,
  PixelModal,
  PixelPanel,
  PixelProgressBar,
  PixelSelect,
  PixelSwitch,
} from '@mfd/design-system/components';
import {
  useGameStore,
  selectAchievements,
  selectActiveStoryArcs,
  selectCoachingCarouselNews,
  selectCoachingMarket,
  selectConditionalPicks,
  selectCurrentWeeklyPrepPlan,
  selectDashboardState,
  selectDynastyScore,
  selectFacilities,
  selectFatigueReport,
  selectHandshakes,
  selectLatestGameDayPackage,
  selectLatestFilmRoomReport,
  selectLatestSummary,
  selectLeagueNews,
  selectUserLivingPlayerStories,
  selectNarrativeIntensity,
  selectOwnerState,
  selectOwnerMandates,
  selectPhase,
  selectPlayoffMomentum,
  selectPlayoffPicture,
  selectRoster,
  selectStatLeaders,
  selectTeamSchedule,
  selectTeams,
  selectTrainingAssignments,
  selectUpcomingRivalry,
  selectUserPowerRanking,
  selectUserRecordWatch,
  selectWaiverWirePlayers,
  selectWeather,
  selectWeek,
  selectYear,
  selectUserTeam,
} from '../../app/store/game-store';
import { ActionCenter } from './ActionCenter';
import { AlumniTicker } from './AlumniTicker';
import { PhaseIndicator } from './PhaseIndicator';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  mono,
  monoSm,
  pixelSm,
  navigateTo,
  screenStackStyle,
} from '../shared/pixelUi';
import { TeamLogo } from '../shared/TeamLogo';
import { LivingPlayerStoryPanel } from '../shared/LivingPlayerStoryPanel';
import { isChipFeatureEnabled } from '../companion';
import { selectWeeklyDialogue, type WeeklyDialogueVariant } from '../companion/dialogue/weekly';
import { resolveResultOutcome } from '../companion/outcomeResolver';
import type { DialogueCatalogEntry } from '../companion/dialogue/types';
import { countPendingDecisions } from '../companion/decisionsPending';
import { buildWeeklyGuidance, weeklyGuidanceToDialogueEntry } from '../companion/weeklyGuidance';
import { deriveDynastyId } from '../../lib/career-meta';
import { buildWeeklyCallbacks, type CallbackCard } from '../../lib/dynasty-callbacks';
import { readScrapbookForDynasty } from '../../lib/scrapbook-store';
import { selectTaskLedgerInput } from '../../ui/tasks/task-ledger-input';
import {
  SESSION_RECAP_STORAGE_KEY,
  buildSessionRecap,
  dismissSessionRecapForSession,
  markSessionRecapDisplayed,
  shouldShowSessionRecap,
  type SessionRecap,
  type SessionRecapPendingItem,
} from '../../lib/session-recap';

const facilityLabels: Record<string, string> = {
  training_complex: 'Training Complex',
  medical_center: 'Medical Center',
  film_room: 'Film Room',
  weight_room: 'Weight Room',
  recovery_suite: 'Recovery Suite',
};

const WIDGET_OPTIONS: Array<{ value: DashboardWidget; label: string; description: string }> = [
  { value: 'team_record', label: 'Team Record', description: 'Record, point differential, and owner patience.' },
  { value: 'next_game', label: 'Next Game', description: 'Upcoming opponent, broadcast, weather, and matchup calls.' },
  { value: 'injury_report', label: 'Injury Report', description: 'Current injuries and recovery windows.' },
  { value: 'fatigue_watch', label: 'Fatigue Watch', description: 'Workload alerts before kickoff.' },
  { value: 'cap_snapshot', label: 'Cap Snapshot', description: 'Cap space, payroll, and facility budget.' },
  { value: 'dynasty_window', label: 'Dynasty Window', description: 'Core age, contract timing, and whether to add veterans or save cap.' },
  { value: 'power_ranking', label: 'Power Ranking', description: 'Rank change, why it moved, and who the league is chasing.' },
  { value: 'promise_tracker', label: 'Promise Tracker', description: 'Owner and player promises on the clock.' },
  { value: 'training_report', label: 'Training Report', description: 'Who is stacking the best weekly gains.' },
  { value: 'league_headlines', label: 'League Headlines', description: 'Breaking stories around the league.' },
  { value: 'record_watch', label: 'Record Watch', description: 'Players pacing above the book.' },
  { value: 'rivalry_watch', label: 'Rivalry Watch', description: 'Heat level for the next grudge match.' },
  { value: 'coaching_news', label: 'Coaching News', description: 'League staffing movement.' },
  { value: 'waiver_wire', label: 'Waiver Wire', description: 'Claimable talent and roster churn.' },
  { value: 'weather_forecast', label: 'Weather Forecast', description: 'Conditions for the next stage.' },
  { value: 'achievement_progress', label: 'Achievement Progress', description: 'Closest unlocks and what action moves each one.' },
  { value: 'dynasty_score', label: 'Dynasty Score', description: 'Titles, playoff trips, awards, and records in one score.' },
  { value: 'playoff_picture', label: 'Playoff Picture', description: 'Current conference bracket track.' },
  { value: 'stat_leaders', label: 'Stat Leaders', description: 'League leaders in core categories.' },
];

type SourceAccent = 'cyan' | 'gold' | 'green' | 'red';

interface BriefingSourceRowsInput {
  phase: string;
  week: number;
  year: number;
  layoutName: string;
  widgetCount: number;
  pinnedCount: number;
}

interface BriefingSourceRow {
  label: string;
  badge: string;
  detail: string;
  accent: SourceAccent;
}

export function buildBriefingSourceRows(input: BriefingSourceRowsInput): BriefingSourceRow[] {
  return [
    {
      label: 'Saved week inputs',
      badge: `${input.phase} W${input.week}`,
      detail: 'Monday Briefing reads the saved team, roster, phase, week, schedule, weather, headlines, standings, stats, and open decisions for the current week.',
      accent: 'cyan',
    },
    {
      label: 'Dashboard layout',
      badge: input.layoutName,
      detail: 'Saved dashboard layout controls which cards are pinned. Only Save Layout, Switch Layout, Pin, or Unpin changes that layout.',
      accent: 'gold',
    },
    {
      label: 'Weekly cards',
      badge: `${input.widgetCount} widgets`,
      detail: 'Cards summarize dynasty window, training progress, achievements, rankings, playoff race, records, schedule, and stat leaders so weekly risks are visible before decisions lock.',
      accent: 'green',
    },
    {
      label: 'Action Center',
      badge: 'ActionCenter',
      detail: 'Action Center reads phase, prep, starters, trade offers, owner approval, injuries, and scenario locks. Must Do items stop or redirect Advance Week; recommendations explain what to fix or accept.',
      accent: 'cyan',
    },
    {
      label: 'Screen controls',
      badge: `${input.pinnedCount} pinned`,
      detail: 'Customize, draft names, card columns, draft cards, and reduced-motion display choices stay on this screen until a dashboard button saves them.',
      accent: 'gold',
    },
    {
      label: 'What opening does not do',
      badge: 'no lock-in',
      detail: `Opening Monday Briefing for ${input.year} does not click Advance Week, play scheduled games, create new weather or news, update power rankings, save layouts, pin widgets, write achievements, or reroll saved outcomes.`,
      accent: 'red',
    },
  ];
}

function resultAccent(result?: string): 'default' | 'green' | 'red' {
  return result === 'win' ? 'green' : result === 'loss' ? 'red' : 'default';
}

function rankingDeltaAccent(delta: number): 'default' | 'green' | 'red' {
  return delta > 0 ? 'green' : delta < 0 ? 'red' : 'default';
}

function callbackKindAccent(kind: CallbackCard['kind']): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (kind === 'ANNIVERSARY') return 'gold';
  if (kind === 'FOLLOW_THROUGH') return 'green';
  return 'cyan';
}

function callbackKindLabel(kind: CallbackCard['kind']): string {
  if (kind === 'ANNIVERSARY') return 'Anniversary';
  if (kind === 'FOLLOW_THROUGH') return 'Follow-through';
  return 'Milestone echo';
}

function callbackSeasonLabel(seasonsAgo: number): string {
  return `${seasonsAgo} ${seasonsAgo === 1 ? 'season' : 'seasons'} ago`;
}

function callbackSourceLabel(card: CallbackCard): string {
  const primaryRef = card.sourceRefs[0] ?? '';
  const weekRef = card.sourceRefs.find((ref) => ref.startsWith('Week '));
  const suffix = weekRef ? `, ${weekRef}` : '';

  if (primaryRef.startsWith('gameDayPackage:') || primaryRef.startsWith('namedGame:')) {
    return `From your saved game-day package and named game${suffix}.`;
  }
  if (primaryRef.startsWith('leagueNews:')) {
    return `From your saved league news${suffix}.`;
  }
  if (primaryRef.startsWith('draftRecap:')) {
    return 'From your saved draft recap and current player table.';
  }
  if (primaryRef.startsWith('records:')) {
    return `From your saved record book${suffix}.`;
  }
  if (primaryRef.startsWith('hallOfFame:')) {
    return `From your saved Hall of Fame archive${suffix}.`;
  }
  if (primaryRef.startsWith('scrapbook:')) {
    return `From your saved dynasty scrapbook${suffix}.`;
  }
  return `From your saved dynasty receipts${suffix}.`;
}

function readDynastyScrapbookEntries(game: GameState) {
  try {
    return readScrapbookForDynasty(deriveDynastyId(game));
  } catch {
    return [];
  }
}

export function DynastyHistoryPanel({ cards }: { cards: CallbackCard[] }) {
  if (cards.length === 0) return null;

  return (
    <PixelPanel title="This Week in Dynasty History" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">Read-only</PixelBadge>
          <PixelBadge variant="cyan">Saved receipts</PixelBadge>
          <PixelBadge variant="green">{`${cards.length} callback${cards.length === 1 ? '' : 's'}`}</PixelBadge>
        </div>
        <div style={autoGrid(260)}>
          {cards.map((card) => (
            <div
              key={card.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '12px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <PixelBadge variant={callbackKindAccent(card.kind)}>{callbackKindLabel(card.kind)}</PixelBadge>
                <PixelBadge variant="default">{callbackSeasonLabel(card.seasonsAgo)}</PixelBadge>
              </div>
              <div style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1.15 }}>
                {card.headline}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                {card.body}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.6 }}>
                {callbackSourceLabel(card)}
              </div>
              <div>
                <PixelButton accent={callbackKindAccent(card.kind)} onClick={() => navigateTo(card.ctaRoute)}>
                  {card.ctaLabel}
                </PixelButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

function sessionRecapChipText(recap: SessionRecap): string {
  const copy = `Previously on your dynasty: ${recap.stakesLine} Open Action Center or the highlighted screen before Advance Week locks this week.`;
  return copy.length <= 236 ? copy : `${copy.slice(0, 233).trimEnd()}...`;
}

function sessionRecapSourceLine(): string {
  return `Browser-local convenience state: ${SESSION_RECAP_STORAGE_KEY} stores only this dynasty's last-seen timestamp; it is outside the dynasty archive.`;
}

export function SessionRecapSurface({
  recap,
  visible,
  chipEnabled,
  reducedMotion = false,
  onDismiss,
}: {
  recap: SessionRecap | null;
  visible: boolean;
  chipEnabled: boolean;
  reducedMotion?: boolean;
  onDismiss: () => void;
}) {
  if (!visible || !recap) return null;

  const beatList = (
    <div style={{ display: 'grid', gap: '10px' }}>
      {recap.beats.map((beat) => (
        <div
          key={beat.id}
          style={{
            display: 'grid',
            gap: '6px',
            padding: '10px',
            border: '2px solid var(--mfd-border)',
            background: 'var(--mfd-bg-2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{beat.label.toUpperCase()}</span>
            <PixelBadge variant={beat.kind === 'THIS_WEEK' ? 'gold' : beat.kind === 'JUST_HAPPENED' ? 'cyan' : 'green'}>
              {beat.kind.replaceAll('_', ' ')}
            </PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.65 }}>{beat.text}</div>
        </div>
      ))}
    </div>
  );

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.6 }}>
        {sessionRecapSourceLine()}
      </div>
      <PixelButton accent="cyan" data-session-recap-dismiss="true" onClick={onDismiss}>
        Dismiss Recap
      </PixelButton>
    </div>
  );

  if (chipEnabled) {
    return (
      <div
        data-session-recap-surface="chip"
        style={{ display: 'grid', gap: '10px', maxWidth: '900px' }}
      >
        <ChipDialogueBubble
          text={sessionRecapChipText(recap)}
          pose="reviewing-tablet"
          pointer="right"
          reducedMotion={reducedMotion}
        />
        <div
          style={{
            display: 'grid',
            gap: '10px',
            padding: '12px',
            border: '2px solid rgba(255, 215, 0, 0.36)',
            borderLeft: '5px solid var(--mfd-gold)',
            background: 'rgba(255, 215, 0, 0.06)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="gold">Previously on</PixelBadge>
            <PixelBadge variant="cyan">Chip opener</PixelBadge>
            <PixelBadge variant="default">browser-local</PixelBadge>
          </div>
          {beatList}
          {footer}
        </div>
      </div>
    );
  }

  return (
    <PixelPanel title="Previously on your dynasty" accent="gold">
      <div data-session-recap-surface="fallback" style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">Session recap</PixelBadge>
          <PixelBadge variant="default">browser-local</PixelBadge>
        </div>
        <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1.2 }}>
          {recap.stakesLine}
        </div>
        {beatList}
        {footer}
      </div>
    </PixelPanel>
  );
}

function opsToneAccent(tone: TeamOpsImpactTone): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (tone === 'positive') return 'green';
  if (tone === 'warning') return 'gold';
  if (tone === 'negative') return 'red';
  return 'cyan';
}

function rankingDeltaLabel(delta: number): string {
  if (delta > 0) return `UP ${delta}`;
  if (delta < 0) return `DOWN ${Math.abs(delta)}`;
  return 'EVEN';
}

export interface MondayBriefingChipInput {
  phase: string;
  week: number;
  dynastySeed: number;
  record?: string;
  opponentName?: string | null;
  injuryCount?: number;
  pendingDecisionCount?: number;
  capSpace?: number;
  difficulty?: string;
  latestResult?: 'win' | 'loss' | 'tie' | 'pending' | string | null;
  latestTeamScore?: number | null;
  latestOpponentScore?: number | null;
  recentResults?: ReadonlyArray<'win' | 'loss' | 'tie' | 'pending' | string | null | undefined>;
}

function selectMondayBriefingVariant(input: MondayBriefingChipInput): WeeklyDialogueVariant {
  if (input.phase === 'preseason' || input.phase === 'training_camp') return 'preseason';
  if (input.phase === 'playoffs') return 'playoffs';

  // I2: the win/loss margin + streak core lives in outcomeResolver; only the
  // phase and no-result fallbacks stay here.
  const outcome = resolveResultOutcome({
    result: input.latestResult,
    teamScore: input.latestTeamScore,
    opponentScore: input.latestOpponentScore,
    recentResults: input.recentResults,
  });
  if (outcome) return outcome;

  if (input.week >= 8 && input.phase === 'regular_season') return 'midseason';
  return 'preseason';
}

export function selectMondayBriefingChipDialogue(input: MondayBriefingChipInput): DialogueCatalogEntry {
  const outcome = selectMondayBriefingVariant(input);
  const base = selectWeeklyDialogue({
    gameOutcome: outcome,
    currentWeek: input.week,
    dynastySeed: input.dynastySeed,
  });
  const guidance = weeklyGuidanceToDialogueEntry(buildWeeklyGuidance({
    outcome,
    currentWeek: input.week,
    record: input.record,
    opponentName: input.opponentName ?? undefined,
    injuryCount: input.injuryCount,
    pendingDecisionCount: input.pendingDecisionCount,
    capSpace: input.capSpace,
    difficulty: input.difficulty,
    dynastySeed: input.dynastySeed,
  }));

  return {
    ...base,
    pose: guidance.pose,
    text: guidance.text,
    contextDetails: guidance.contextDetails,
    priority: guidance.priority,
  };
}

function chipDetail(entry: DialogueCatalogEntry, label: string): string | null {
  const prefix = `${label}: `;
  return entry.contextDetails?.find((detail) => detail.startsWith(prefix))?.slice(prefix.length) ?? null;
}

const MONDAY_CHIP_DETAIL_PREFIXES = ['Must Do:', 'Recommended:', 'Optional:', 'Consequence:', 'Where:', 'Continuity:', 'Sideline note:'] as const;

export function chipBriefingDetails(entry: DialogueCatalogEntry): string[] {
  return entry.contextDetails?.filter((detail) => (
    MONDAY_CHIP_DETAIL_PREFIXES.some((prefix) => detail.startsWith(prefix))
  )) ?? [];
}

function chipMustDoSummary(mustDo: string | null): string | null {
  if (!mustDo) return null;
  if (mustDo.startsWith('Roster and depth chart')) return 'Set roster and Depth Chart before Game Plan.';
  if (
    mustDo.startsWith('open Roster, set first backups')
    || mustDo.startsWith('set injury status')
    || mustDo.startsWith('cover injuries, first backups')
    || mustDo.startsWith('cover injury flags')
  ) {
    return 'Cover injuries before Game Plan.';
  }
  if (
    mustDo.startsWith('Pending decisions')
    || mustDo.startsWith('answer pending decisions')
    || mustDo.startsWith('open Inbox, Action Center')
    || mustDo.startsWith('choose or defer')
  ) {
    return 'Choose or defer pending decisions before Advance Week.';
  }
  if (mustDo.startsWith('Open Monday Briefing') || mustDo.startsWith('open Monday Briefing') || mustDo.startsWith('Read Monday Briefing') || mustDo.startsWith('read Monday Briefing')) {
    return 'Open Action Center; fix or accept named items.';
  }
  if (mustDo.startsWith('open Postgame Recap') || mustDo.startsWith('Postgame recap')) {
    return 'Open Recap for named injury, morale, or matchup fixes.';
  }
  if (
    mustDo.startsWith('Season Recap')
    || mustDo.startsWith('open Recap')
    || mustDo.startsWith('open Season Recap')
  ) {
    return 'Open Season Recap, Contracts, Staff, and Cap Lab before bidding.';
  }
  return mustDo;
}

function chipRecommendedSummary(recommended: string | null): string | null {
  if (!recommended) return null;
  if (recommended.startsWith('Set injured roles')) return 'Set first backups or legal replacement.';
  if (
    recommended.startsWith('Resolve or deliberately defer')
    || recommended.startsWith('Take action or defer')
    || recommended.startsWith('Choose or defer')
  ) {
    return 'Use Inbox, Action Center, or highlighted badges for pending choices.';
  }
  if (recommended.startsWith('Open Action Center for current notes')) {
    return 'Open Action Center; roster, cap, staff, and matchup moves stay open before Advance Week.';
  }
  if (
    recommended.startsWith('Open Monday Briefing notes first')
    || recommended.startsWith('Scan Action Center')
  ) {
    // B3 seeded alternates for the generic recommended line condense to the
    // same summary as the canonical line.
    return 'Open Action Center; roster, cap, staff, and matchup moves stay open before Advance Week.';
  }
  if (recommended.includes('backup order') && recommended.includes('cap space')) {
    return 'Scout opponent injuries, backup order, cap space, and matchup calls.';
  }
  if (recommended.startsWith('Open Recap notes')) {
    return 'Adjust only the injury, morale, or matchup fix named by Recap.';
  }
  if (recommended.startsWith('Open Contracts') || recommended.startsWith('Open Contracts and Staff')) {
    return 'Open Contracts, Staff, Cap Lab, and Free Agency.';
  }
  return recommended;
}

function chipOptionalSummary(optional: string | null): string | null {
  if (!optional) return null;
  if (
    optional.startsWith('Roster, depth chart, training')
    || optional.startsWith('Make any legal roster')
    || optional.startsWith('After the priority work')
    || optional.startsWith('If the Must Do and Recommended are done')
  ) {
    return 'Roster, depth, cap, market, staff, and matchup moves stay open before Advance Week.';
  }
  if (
    optional.startsWith('Awards, records, and history')
    || optional.startsWith('Open awards, records, and history')
  ) {
    return "Open awards/history after this week's lineup, cap, and matchup choices.";
  }
  return optional;
}

function chipConsequenceSummary(consequence: string | null): string | null {
  if (!consequence) return null;
  if (consequence.startsWith('Uncovered injuries')) {
    return 'Unassigned first backup starts.';
  }
  if (consequence.startsWith('Unanswered decisions') || consequence.startsWith('Ignored decisions')) {
    return 'Ignored decisions expire, remove offers, or lock weaker choices.';
  }
  if (consequence.startsWith('Another unprepared week cuts owner patience')) {
    return 'Another unprepared week cuts owner patience and hurts morale recovery.';
  }
  if (consequence.startsWith('Skipping Recap leaves injuries')) {
    return 'Skipping Recap leaves injuries, morale swings, and matchup notes unseen before Game Plan locks.';
  }
  if (consequence.startsWith('Skipping Monday Briefing')) {
    return 'Skipping Briefing locks a named injury, unassigned first backup, tight cap choice, or uncovered matchup call.';
  }
  if (consequence.startsWith('Cap space is tight')) {
    return 'Tight cap space blocks later fixes.';
  }
  return consequence;
}

function chipWhereSummary(where: string | null): string | null {
  if (!where) return null;
  if (where.startsWith('Open Inbox, Action Center') || where.startsWith('Inbox, Action Center')) return 'Inbox, Action Center, or highlighted screen badges.';
  if (where.startsWith('Open Roster')) return 'Roster then Depth Chart; Game Plan if calls change.';
  if (where.startsWith('Roster, Depth Chart')) return 'Roster, Depth Chart, Game Plan.';
  if (where.startsWith('Post-Week Command Deck')) return 'Postgame Recap, then roster, depth, or Game Plan fix.';
  if (where.startsWith('Season Recap')) return 'Season Recap, Contracts, Staff, Cap Lab, Free Agency.';
  if (where.startsWith('Action Center, then')) return 'Action Center, then legal football-ops screens.';
  if (where.startsWith('Open Monday Briefing') || where.startsWith('Monday Briefing')) return 'Briefing, Action Center, then flagged action screens.';
  return where;
}

function chipStructuredOutro(entry: DialogueCatalogEntry): string | null {
  const mustDo = chipMustDoSummary(chipDetail(entry, 'Must Do'));
  const recommended = chipRecommendedSummary(chipDetail(entry, 'Recommended'));
  const optional = chipOptionalSummary(chipDetail(entry, 'Optional'));
  const where = chipWhereSummary(chipDetail(entry, 'Where'));
  const consequence = chipConsequenceSummary(chipDetail(entry, 'Consequence'));
  if (!mustDo || !recommended || !optional || !where || !consequence) return null;
  return `Must Do: ${mustDo} Recommended: ${recommended} Where: ${where} Optional: ${optional} Consequence: ${consequence}`;
}

function parseFinalScore(finalScore: string | null | undefined): { teamScore: number | null; opponentScore: number | null } {
  if (!finalScore) return { teamScore: null, opponentScore: null };
  const [teamRaw, opponentRaw] = finalScore.split('-');
  const teamScore = Number(teamRaw?.trim());
  const opponentScore = Number(opponentRaw?.trim());
  return {
    teamScore: Number.isFinite(teamScore) ? teamScore : null,
    opponentScore: Number.isFinite(opponentScore) ? opponentScore : null,
  };
}

export function chipBriefingOutro(entry: DialogueCatalogEntry): string {
  const structured = chipStructuredOutro(entry);
  if (structured) return structured;
  if (entry.id === 'chip.weekly.threeLossStreak') {
    return 'Next: fix one root cause before Advance Week. Ignoring it lets the streak cut prep quality and owner patience.';
  }
  if (entry.id === 'chip.weekly.uglyWin') {
    return 'Next: fix the missed assignment that almost cost the game. If you skip Roster, Medical, or Game Plan changes, the same mistake decides next week.';
  }
  if (entry.id === 'chip.weekly.cleanWin') {
    return 'Next: keep what worked. Optional moves stay open before Advance Week; prioritize depth, cap, scouting, or staff changes that improve the next matchup.';
  }
  if (entry.id === 'chip.weekly.blowoutLoss' || entry.id === 'chip.weekly.darkMoment') {
    return 'Next: stabilize injuries, starters, and game plan before Advance Week; major roster moves first make the loss worse.';
  }
  return 'Next: clear Must Do first, resolve or accept Recommended items, then prioritize Optional moves that affect lineup, cap, market, staff, or matchup before Advance Week.';
}

// Chip bubbles cap at 240 characters, while a fully structured outro may
// legitimately run longer (the integration contract allows up to 310). Fit
// the rendered bubble at sentence boundaries so the dev-mode length guard
// never trips; every clipped clause still appears in the guidance details
// panel under the intro bubble.
export function fitChipBubbleText(text: string, maxLength = 240): string {
  if (text.length <= maxLength) return text;
  const sentences = text.match(/[^.]+\.\s*/g) ?? [];
  let fitted = '';
  for (const sentence of sentences) {
    const candidate = fitted ? `${fitted} ${sentence.trim()}` : sentence.trim();
    if (candidate.length > maxLength - 2) break;
    fitted = candidate;
  }
  if (!fitted) return `${text.slice(0, maxLength - 3).trimEnd()}...`;
  return `${fitted} …`;
}

function tierAccent(tier: Achievement['tier']): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (tier === 'platinum') return 'gold';
  if (tier === 'gold') return 'gold';
  if (tier === 'silver') return 'cyan';
  return 'green';
}

function widgetOption(widget: DashboardWidget) {
  return WIDGET_OPTIONS.find((entry) => entry.value === widget) ?? WIDGET_OPTIONS[0]!;
}

function moveWidget(widgets: DashboardWidget[], index: number, direction: -1 | 1): DashboardWidget[] {
  const target = index + direction;
  if (target < 0 || target >= widgets.length) return widgets;
  const next = [...widgets];
  const [item] = next.splice(index, 1);
  if (!item) return widgets;
  next.splice(target, 0, item);
  return next;
}

function metricGrid(columns: 2 | 3) {
  return {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: columns === 2
      ? 'repeat(auto-fit, minmax(320px, 1fr))'
      : 'repeat(auto-fit, minmax(260px, 1fr))',
  } as const;
}

export function MondayBriefing() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const phase = useGameStore(selectPhase);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const ownerState = useGameStore(selectOwnerState);
  const ownerMandates = useGameStore(selectOwnerMandates);
  const latestSummary = useGameStore(selectLatestSummary);
  const latestPackage = useGameStore(selectLatestGameDayPackage);
  const latestFilmRoomReport = useGameStore(selectLatestFilmRoomReport);
  const activeArcs = useGameStore(selectActiveStoryArcs);
  const teams = useGameStore(selectTeams);
  const userPowerRanking = useGameStore(selectUserPowerRanking);
  const recordWatch = useGameStore(selectUserRecordWatch);
  const achievements = useGameStore(selectAchievements);
  const upcomingRivalry = useGameStore(selectUpcomingRivalry);
  const coachingNews = useGameStore(selectCoachingCarouselNews);
  const coachingMarket = useGameStore(selectCoachingMarket);
  const currentWeeklyPrepPlan = useGameStore(selectCurrentWeeklyPrepPlan);
  const handshakes = useGameStore(selectHandshakes);
  const waiverPlayers = useGameStore(selectWaiverWirePlayers);
  const weather = useGameStore(selectWeather);
  const conditionalPicks = useGameStore(selectConditionalPicks);
  const leagueNews = useGameStore(selectLeagueNews);
  const livingPlayerStories = useGameStore(selectUserLivingPlayerStories);
  const trainingAssignments = useGameStore(selectTrainingAssignments);
  const playoffPicture = useGameStore(selectPlayoffPicture);
  const fatigueReport = useGameStore(selectFatigueReport);
  const facilities = useGameStore(selectFacilities);
  const playoffMomentum = useGameStore(selectPlayoffMomentum);
  const narrativeIntensity = useGameStore(selectNarrativeIntensity);
  const dynastyScore = useGameStore(selectDynastyScore);
  const dashboardState = useGameStore(selectDashboardState);
  const teamSchedule = useGameStore(selectTeamSchedule);
  const statLeaders = useGameStore(selectStatLeaders);
  const recentDecisionReceipts = (game?.decisionReceipts ?? []).slice(-3).reverse();
  const {
    pinWidget,
    unpinWidget,
    saveLayout,
    switchLayout,
    closeActionCenterCard,
  } = useGameStore((state) => state.actions);

  const activeLayout = dashboardState.layouts.find((layout) => layout.id === dashboardState.activeLayoutId) ?? dashboardState.layouts[0];
  const pinnedWidgets = dashboardState.pinnedWidgets;

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [reducedMotion] = useState<boolean>(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ));
  const [draftName, setDraftName] = useState(activeLayout?.name ?? 'Command Center');
  const [draftColumns, setDraftColumns] = useState<2 | 3>(activeLayout?.columns ?? 3);
  const [draftWidgets, setDraftWidgets] = useState<DashboardWidget[]>(activeLayout?.widgets ?? []);
  const [sessionRecapVisible, setSessionRecapVisible] = useState(false);
  const [sessionRecapDismissedDynastyId, setSessionRecapDismissedDynastyId] = useState<string | null>(null);

  const nextGame = teamSchedule.find((entry) => entry.week === week) ?? null;
  const opponent = nextGame?.opponentTeamId && teams ? teams[nextGame.opponentTeamId] : null;
  const opponentName = nextGame?.opponentName ?? 'BYE';
  const teamName = team ? `${team.city} ${team.name}` : 'No Team';
  const teamOpsReceipt = game && team ? buildTeamOpsImpactReceipt(game, team.id) : null;
  const alumniUpdates = game ? getAlumniUpdates(game, year) : [];
  const record = team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : '0-0';
  const latestResult = latestPackage?.result ?? latestSummary?.result;
  const packageScore = parseFinalScore(latestPackage?.finalScore);
  const injuredCount = roster.filter((p) => p.injury).length;
  const pendingDecisionCount = game ? countPendingDecisions({ game }).total : 0;
  const chipBriefingEnabled = isChipFeatureEnabled();
  const chipBriefingEntry = chipBriefingEnabled
    ? selectMondayBriefingChipDialogue({
      phase,
      week,
      dynastySeed: game?.seed ?? year,
      record,
      opponentName: opponent ? opponentName : null,
      injuryCount: injuredCount,
      pendingDecisionCount,
      capSpace: team?.capSpace,
      difficulty: game?.difficulty,
      latestResult,
      latestTeamScore: latestSummary?.teamScore ?? packageScore.teamScore,
      latestOpponentScore: latestSummary?.opponentScore ?? packageScore.opponentScore,
      recentResults: (game?.weekSummaries ?? []).map((summary) => summary.result),
    })
    : null;
  const chipGuidanceDetails = chipBriefingEntry ? chipBriefingDetails(chipBriefingEntry) : [];
  const ownerMood = ownerState?.approval ?? 0;
  const ownerLabel = ownerMood >= 70 ? 'Pleased' : ownerMood >= 50 ? 'Neutral' : ownerMood >= 30 ? 'Unhappy' : 'Furious';
  const injuries = roster
    .filter((player) => player.injury)
    .map((player) => ({
      player: `${player.firstName.charAt(0)}. ${player.lastName}`,
      position: player.pos,
      type: player.injury!.type,
      status: player.injury!.severity,
      severityTier: player.injury!.severityTier,
      weeks: player.injury!.gamesOut,
      onIR: player.injury!.onIR,
    }));
  const fatigueWatch = fatigueReport
    .map((entry) => ({
      ...entry,
      player: roster.find((candidate) => candidate.id === entry.playerId) ?? null,
    }))
    .filter((entry): entry is typeof entry & { player: NonNullable<typeof entry.player> } => Boolean(entry.player) && entry.status !== 'fresh')
    .slice(0, 4);
  const activePromises = handshakes.filter((handshake) => handshake.teamId === team?.id && handshake.status === 'active').slice(0, 3);
  const headlineItems = leagueNews.filter((item) => item.importance !== 'minor').slice(0, 3);
  const facilityStatus = [...facilities.facilities]
    .sort((a, b) => b.level - a.level || a.type.localeCompare(b.type))
    .slice(0, 4);
  const trainingLeaders = roster
    .map((player) => {
      const assignment = trainingAssignments[player.id];
      if (!assignment) return null;
      return {
        player,
        assignment,
        weeklyXp: calculateTrainingXP(
          player,
          assignment.focus,
          team?.staff?.hc?.ratings?.development ?? 70,
          player.devTrait,
        ).totalXp,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.weeklyXp - a.weeklyXp || b.assignment.xpGained - a.assignment.xpGained)
    .slice(0, 3);
  const userConditionalPicks = conditionalPicks.filter((pick) => pick.toTeamId === team?.id).slice(0, 2);
  const conferencePlayoffPicture = team?.conference === 'NFC' ? playoffPicture.nfc : playoffPicture.afc;
  const userPlayoffSeed = conferencePlayoffPicture.find((entry) => entry.teamId === team?.id) ?? null;
  const standingsPosition = userPlayoffSeed
    ? `#${userPlayoffSeed.seed} ${team?.conference ?? 'conference'} playoff seed`
    : userPowerRanking
      ? `#${userPowerRanking.rank} power ranking`
      : null;
  const recentAchievements = achievements
    .filter((achievement) => achievement.unlockedYear !== null)
    .sort((a, b) => (b.unlockedYear ?? 0) - (a.unlockedYear ?? 0) || (b.unlockedWeek ?? 0) - (a.unlockedWeek ?? 0))
    .slice(0, 2);
  const pinnedRenderList = pinnedWidgets;
  const layoutRenderList = (activeLayout?.widgets ?? []).filter((widget) => !pinnedWidgets.includes(widget));
  const needsAchievementProgress = [...pinnedRenderList, ...layoutRenderList].includes('achievement_progress');
  const achievementProgress = game && needsAchievementProgress
    ? achievements
      .filter((achievement) => achievement.unlockedYear === null)
      .map((achievement) => ({
        achievement,
        progress: getAchievementProgress(game, achievement.id),
      }))
      .filter((entry) => !entry.progress.hidden)
      .sort((a, b) => b.progress.percentage - a.progress.percentage || a.achievement.title.localeCompare(b.achievement.title))
      .slice(0, 3)
    : [];

  const beginCustomize = () => {
    setDraftName(activeLayout?.name ?? 'Command Center');
    setDraftColumns(activeLayout?.columns ?? 3);
    setDraftWidgets(activeLayout?.widgets ?? []);
    setCustomizeOpen(true);
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (widget === 'team_record') {
      return (
        <PixelPanel key={widget} title="Team Record" accent={resultAccent(latestResult)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {team && <TeamLogo icon={team.icon} size={48} alt={teamName} />}
                <div>
                  <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>CURRENT MARK</div>
                  <div style={{ ...display, fontSize: '28px', color: '#fff', lineHeight: 1 }}>{record}</div>
                </div>
              </div>
              <PixelBadge variant={resultAccent(latestResult)}>{latestResult ? latestResult.toUpperCase() : 'PENDING'}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              {latestPackage?.headline ?? latestSummary?.headline ?? 'The next result will define the current pulse.'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant={team && team.seasonStats.pointDifferential >= 0 ? 'green' : 'red'}>
                {`PD ${team?.seasonStats.pointDifferential ?? 0}`}
              </PixelBadge>
              <PixelBadge variant={ownerMood >= 60 ? 'green' : ownerMood >= 40 ? 'cyan' : 'red'}>
                {`Owner ${ownerLabel}`}
              </PixelBadge>
            </div>
          </div>
        </PixelPanel>
      );
    }

    if (widget === 'next_game') {
      return (
        <PixelPanel key={widget} title="Next Game" accent={nextGame?.primetime ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {opponent && <TeamLogo icon={opponent.icon} size={40} alt={opponentName} />}
                <div>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                    {opponentName.toUpperCase()}
                  </div>
                  <div style={{ ...monoSm, color: '#999', marginTop: '6px' }}>
                    {nextGame?.bye
                      ? 'Bye week on deck.'
                      : `${nextGame?.home ? 'Home' : 'Away'} // Week ${nextGame?.week ?? week}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {nextGame?.broadcastNetwork ? <PixelBadge variant={nextGame.primetime ? 'gold' : 'cyan'}>{nextGame.broadcastNetwork}</PixelBadge> : null}
                {nextGame?.primetime ? <PixelBadge variant="gold">Primetime</PixelBadge> : null}
                {nextGame?.flexed ? <PixelBadge variant="gold">Flexed</PixelBadge> : null}
              </div>
            </div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
              {nextGame?.bye
                ? 'Use the idle week to recover fatigue and plan the next strike.'
                : opponent
                  ? `${opponent.city} ${opponent.name} enters at ${opponent.wins}-${opponent.losses}${opponent.ties ? `-${opponent.ties}` : ''}.`
                  : 'Opponent scouting packet is loading.'}
            </div>
          </div>
        </PixelPanel>
      );
    }

    if (widget === 'injury_report') {
      return (
        <PixelPanel key={widget} title="Injury Report" accent={injuries.length > 0 ? 'red' : 'green'}>
          {injuries.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No fresh injuries. Verify fatigue and backup order before the next broadcast.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {injuries.map((injury) => (
                <div key={injury.player} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>
                      {injury.player} <span style={{ color: '#777' }}>{injury.position}</span>
                    </div>
                    <div style={{ ...monoSm, color: '#888' }}>
                      {injury.type.replaceAll('_', ' ')} // {injury.severityTier.replaceAll('_', ' ')} // recovery {injury.weeks} week(s)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {injury.onIR ? <PixelBadge variant="red">IR</PixelBadge> : null}
                    <PixelBadge variant="red">{injury.status}</PixelBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'fatigue_watch') {
      return (
        <PixelPanel key={widget} title="Fatigue Watch" accent={fatigueWatch.some((entry) => entry.status === 'exhausted') ? 'red' : fatigueWatch.length > 0 ? 'gold' : 'green'}>
          {fatigueWatch.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No workload alerts. The roster is entering the next week with fresh legs.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {fatigueWatch.map((entry) => (
                <div key={entry.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{entry.player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>{entry.player.pos} // fatigue {entry.fatigue.toFixed(1)}</div>
                  </div>
                  <PixelBadge variant={entry.status === 'exhausted' ? 'red' : 'gold'}>{entry.status}</PixelBadge>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'cap_snapshot') {
      return (
        <PixelPanel key={widget} title="Cap Snapshot" accent={team && team.capSpace >= 0 ? 'cyan' : 'red'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div>
                <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>CAP SPACE</div>
                <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                  ${Math.round((team?.capSpace ?? 0) * 10) / 10}M
                </div>
              </div>
              <PixelBadge variant={team && team.capSpace >= 0 ? 'cyan' : 'red'}>
                {`USED ${Math.round((team?.capUsed ?? 0) * 10) / 10}M`}
              </PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              {facilityStatus.length > 0
                ? `${facilityLabels[facilityStatus[0]!.type] ?? facilityStatus[0]!.type} leads the facility board at level ${facilityStatus[0]!.level}.`
                : 'Facility board is waiting on budget decisions.'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant={facilities.budget >= 6 ? 'green' : facilities.budget >= 3 ? 'gold' : 'red'}>
                {`Facility $${facilities.budget}`}
              </PixelBadge>
              <PixelBadge variant="default">{`Dead ${Math.round((team?.deadCap ?? 0) * 10) / 10}M`}</PixelBadge>
            </div>
          </div>
        </PixelPanel>
      );
    }

    if (widget === 'dynasty_window') {
      const windowResult = team ? calculateDynastyWindow(team, game?.year ?? 2026, team.draftPicks?.length, game) : null;
      const phaseLabel = windowResult ? windowPhaseLabel(windowResult.phase) : 'UNKNOWN';
      const phaseColor = windowResult ? windowPhaseColor(windowResult.phase) : 'var(--mfd-text-dim)';
      return (
        <PixelPanel key={widget} title="Dynasty Window" accent={windowResult?.phase === 'peaking' ? 'gold' : windowResult?.phase === 'closing' ? 'red' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>WINDOW PHASE</div>
                <div style={{ ...display, fontSize: '20px', color: phaseColor, lineHeight: 1 }}>
                  {phaseLabel}
                </div>
              </div>
              <PixelBadge variant={windowResult?.score && windowResult.score >= 70 ? 'gold' : windowResult?.score && windowResult.score >= 40 ? 'cyan' : 'red'}>
                {`Score: ${windowResult?.score ?? 0}`}
              </PixelBadge>
            </div>
            {windowResult && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="default">{`Roster ${windowResult.factors.rosterStrength}`}</PixelBadge>
                <PixelBadge variant="default">{`Youth ${windowResult.factors.youthFactor}`}</PixelBadge>
                <PixelBadge variant="default">{`Cap ${windowResult.factors.capHealth}`}</PixelBadge>
                <PixelBadge variant="default">{`Draft ${windowResult.factors.draftCapital}`}</PixelBadge>
              </div>
            )}
          </div>
        </PixelPanel>
      );
    }

    if (widget === 'power_ranking') {
      return (
        <PixelPanel key={widget} title="Power Rankings" accent={userPowerRanking ? rankingDeltaAccent(userPowerRanking.delta) : 'default'}>
          {!userPowerRanking ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              Rankings publish after each regular-season advance. The first table will drop once the season starts moving.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>LEAGUE SLOT</div>
                  <div style={{ ...display, fontSize: '28px', color: '#fff', lineHeight: 1 }}>#{userPowerRanking.rank}</div>
                </div>
                <PixelBadge variant={rankingDeltaAccent(userPowerRanking.delta)}>{rankingDeltaLabel(userPowerRanking.delta)}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>{userPowerRanking.blurb}</div>
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'promise_tracker') {
      return (
        <PixelPanel key={widget} title="Promise Tracker" accent={activePromises.length > 0 ? 'gold' : 'default'}>
          {activePromises.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No active promises on the clock. Owner demands and player assurances will post here when they exist.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activePromises.map((handshake) => (
                <div key={handshake.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ ...mono, color: '#fff' }}>{handshake.promiseText}</div>
                    <PixelBadge variant="gold">{handshake.type}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.5 }}>
                    Due {handshake.deadline.year}-W{handshake.deadline.week}. {handshake.consequence ?? 'Trust impact pending.'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'training_report') {
      return (
        <PixelPanel key={widget} title="Training Report" accent={trainingLeaders.length > 0 ? 'green' : 'default'}>
          {trainingLeaders.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No weekly training plans are locked in yet. Assign focuses from the roster table.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {trainingLeaders.map((entry) => (
                <div key={entry.player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{entry.player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>
                      {entry.assignment.focus.replaceAll('_', ' ')} // {entry.assignment.xpGained.toFixed(1)} total XP
                    </div>
                  </div>
                  <PixelBadge variant="green">{`+${entry.weeklyXp.toFixed(1)} XP`}</PixelBadge>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'league_headlines') {
      return (
        <PixelPanel key={widget} title="League Headlines" accent={headlineItems[0]?.importance === 'breaking' ? 'gold' : 'cyan'}>
          {headlineItems.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No breaking league stories are changing this week's priorities right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {headlineItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ ...mono, color: '#fff' }}>{item.headline}</div>
                    <PixelBadge variant={item.importance === 'breaking' ? 'gold' : 'cyan'}>{item.importance}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.5 }}>{item.body}</div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'record_watch') {
      return (
        <PixelPanel key={widget} title="Record Watch" accent={recordWatch.length > 0 ? 'gold' : 'default'}>
          {recordWatch.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No user-team player is pacing above the current season record board right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recordWatch.map((entry) => (
                <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ ...mono, color: '#fff' }}>{entry.playerName}</div>
                    <PixelBadge variant="gold">{entry.label}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.5 }}>
                    Pace {entry.projectedValue} vs {entry.recordHolder}&apos;s {entry.recordValue}.
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'rivalry_watch') {
      return (
        <PixelPanel key={widget} title="Rivalry Watch" accent={upcomingRivalry ? 'red' : 'default'}>
          {!upcomingRivalry ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No heated matchup is on the immediate radar. Broadcast prep stays standard for now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                  {upcomingRivalry.tier.replace('_', ' ').toUpperCase()}
                </div>
                <PixelBadge variant="red">INT {upcomingRivalry.intensity}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>{upcomingRivalry.headline}</div>
              {upcomingRivalry.ovrBoost > 0 ? (
                <div style={{ ...monoSm, color: '#fca5a5' }}>
                  Rivalry adrenaline active: +{upcomingRivalry.ovrBoost} OVR in-game.
                </div>
              ) : null}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'coaching_news') {
      return (
        <PixelPanel key={widget} title="Coaching News" accent={coachingNews.length > 0 ? 'cyan' : 'default'}>
          {coachingNews.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No sideline shakeups this week. League staff boards are holding steady.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {coachingNews.slice(0, 3).map((event) => (
                <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div style={{ ...mono, color: '#fff' }}>{event.description}</div>
                  <PixelBadge variant={event.type === 'coach_fired' ? 'red' : 'cyan'}>
                    {event.type === 'coach_fired' ? 'FIRED' : 'HIRED'}
                  </PixelBadge>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'waiver_wire') {
      return (
        <PixelPanel key={widget} title="Waiver Wire" accent={waiverPlayers.length > 0 ? 'cyan' : 'default'}>
          {waiverPlayers.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No active waiver decisions this week.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {waiverPlayers.slice(0, 3).map((player) => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>{player.pos} // OVR {player.ovr}</div>
                  </div>
                  <PixelBadge variant="cyan">Claimable</PixelBadge>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'weather_forecast') {
      return (
        <PixelPanel key={widget} title="Weather Forecast" accent={weather === 'snow' || weather === 'wind' ? 'red' : weather === 'rain' ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                {(weather ?? 'clear').toUpperCase()}
              </div>
              <PixelBadge variant={weather === 'snow' || weather === 'wind' ? 'red' : weather === 'rain' ? 'gold' : 'cyan'}>
                {opponentName}
              </PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              {weather === 'snow'
                ? 'Snow is in the forecast. Passing volume and ball security will tighten.'
                : weather === 'wind'
                  ? 'Wind will destabilize long kicks and vertical shots.'
                  : weather === 'rain'
                    ? 'Rain favors ball-control offense and sharper handling.'
                    : 'Standard conditions. Call the full game plan.'}
            </div>
            {userConditionalPicks.length > 0 ? (
              <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                Conditional assets: {userConditionalPicks.map((pick) => pick.description).join(' | ')}
              </div>
            ) : null}
          </div>
        </PixelPanel>
      );
    }

    if (widget === 'achievement_progress') {
      return (
        <PixelPanel key={widget} title="Achievement Progress" accent={achievementProgress[0] ? tierAccent(achievementProgress[0].achievement.tier) : 'default'}>
          {achievementProgress.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentAchievements.length === 0 ? (
                <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
                  No achievement milestone is close yet. Win games, develop players, and chase records to open the next target.
                </div>
              ) : recentAchievements.map((achievement) => (
                <div key={achievement.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{achievement.title}</div>
                    <div style={{ ...monoSm, color: '#999' }}>{achievement.description}</div>
                  </div>
                  <PixelBadge variant={tierAccent(achievement.tier)}>{achievement.tier}</PixelBadge>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {achievementProgress.map(({ achievement, progress }) => (
                <div key={achievement.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...mono, color: '#fff' }}>{achievement.title}</div>
                      <div style={{ ...monoSm, color: '#999' }}>{progress.label}</div>
                    </div>
                    <PixelBadge variant={tierAccent(achievement.tier)}>{achievement.tier}</PixelBadge>
                  </div>
                  <PixelProgressBar
                    value={progress.percentage}
                    accent={tierAccent(achievement.tier)}
                    label={achievement.category}
                    valueLabel={`${progress.percentage}%`}
                  />
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    if (widget === 'dynasty_score') {
      return (
        <PixelPanel key={widget} title="Dynasty Score" accent={dynastyScore >= 25 ? 'gold' : dynastyScore >= 12 ? 'cyan' : 'green'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ ...display, fontSize: '28px', color: '#fff', lineHeight: 1 }}>{dynastyScore}</div>
              <PixelBadge variant={dynastyScore >= 25 ? 'gold' : dynastyScore >= 12 ? 'cyan' : 'green'}>
                {dynastyScore >= 25 ? 'Elite Arc' : dynastyScore >= 12 ? 'Contender Arc' : 'Building Arc'}
              </PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              {playoffMomentum
                ? `Playoff score: ${playoffMomentum.momentum}; ${playoffMomentum.winStreak} straight wins. Another win improves seeding.`
                : 'Legacy score blends championships, playoff appearances, awards, and record moments.'}
            </div>
          </div>
        </PixelPanel>
      );
    }

    if (widget === 'playoff_picture') {
      return (
        <PixelPanel key={widget} title="Playoff Picture" accent={week > 8 ? 'gold' : 'default'}>
          {week <= 8 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              The playoff picture firms up after Week 8. Standings matter more once the field separates.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {conferencePlayoffPicture.slice(0, 4).map((seed) => (
                <div key={seed.teamId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...mono, color: seed.teamId === team?.id ? 'var(--mfd-gold)' : '#fff' }}>
                      #{seed.seed} {seed.teamName}
                    </div>
                    <div style={{ ...monoSm, color: '#999' }}>
                      {seed.divisionWinner ? 'Division leader' : 'Wildcard track'}
                    </div>
                  </div>
                  {seed.indicator ? <PixelBadge variant="gold">{seed.indicator}</PixelBadge> : null}
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      );
    }

    return (
      <PixelPanel key={widget} title="Stat Leaders" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Passing', leader: statLeaders.passYds[0] },
            { label: 'Rushing', leader: statLeaders.rushYds[0] },
            { label: 'Sacks', leader: statLeaders.sacks[0] },
          ].map((entry) => (
            <div key={entry.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div>
                <div style={{ ...mono, color: '#fff' }}>{entry.label}</div>
                <div style={{ ...monoSm, color: '#999' }}>{entry.leader?.playerName ?? 'Waiting on data'}</div>
              </div>
              <PixelBadge variant="cyan">{entry.leader?.value ?? '--'}</PixelBadge>
            </div>
          ))}
        </div>
      </PixelPanel>
    );
  };

  const sourceRows = buildBriefingSourceRows({
    phase,
    week,
    year,
    layoutName: activeLayout?.name ?? 'Command Center',
    widgetCount: pinnedRenderList.length + layoutRenderList.length,
    pinnedCount: pinnedRenderList.length,
  });
  const dynastyCallbacks = game
    ? buildWeeklyCallbacks({
      year,
      week,
      userTeamId: team?.id ?? null,
      players: game.players,
      teams: game.teams,
      leagueNews: game.leagueNews,
      gameDayPackages: game.gameDayState.recentPackages,
      draftRecaps: game.draftRecaps,
      scrapbookEntries: readDynastyScrapbookEntries(game),
      hallOfFame: game.hallOfFame,
      records: game.records,
      franchiseHistory: game.franchiseHistory,
    })
    : [];
  const memoryDigest = game && team ? buildDynastyMemoryDigest(game, team.id) : null;
  const featuredPlayerStory = livingPlayerStories[0] ?? null;
  const sessionRecapDynastyId = useMemo(() => {
    if (!game) return null;
    try {
      return deriveDynastyId(game);
    } catch {
      return null;
    }
  }, [game]);
  const sessionRecapPendingItems = useMemo<SessionRecapPendingItem[]>(() => {
    const promiseItems = activePromises.map((handshake) => ({
      id: handshake.id,
      label: handshake.promiseText,
      detail: handshake.consequence ?? `Due ${handshake.deadline.year}-W${handshake.deadline.week}.`,
      sourceRef: `handshake:${handshake.id}`,
      priority: 'high' as const,
    }));
    const mandateItems = ownerMandates
      .filter((mandate) => mandate.status === 'active')
      .map((mandate) => ({
        id: mandate.id,
        label: mandate.label,
        detail: mandate.progress.detail,
        sourceRef: `ownerMandate:${mandate.id}`,
        priority: mandate.progress.status === 'at_risk' ? 'high' as const : 'medium' as const,
      }));

    return [...promiseItems, ...mandateItems];
  }, [activePromises, ownerMandates]);
  const sessionRecap = useMemo(() => game ? buildSessionRecap({
    year,
    week,
    phase,
    teamName,
    teamRecord: record,
    weekSummaries: game.weekSummaries.slice(-4),
    leagueNews: game.leagueNews,
    standingsPosition,
    nextOpponent: nextGame ? {
      week: nextGame.week,
      opponentTeamId: nextGame.opponentTeamId,
      opponentName,
      home: nextGame.home,
      bye: nextGame.bye,
      primetime: nextGame.primetime,
    } : null,
    pendingItems: sessionRecapPendingItems,
  }) : null, [
    game,
    year,
    week,
    phase,
    teamName,
    record,
    standingsPosition,
    nextGame,
    opponentName,
    sessionRecapPendingItems,
  ]);
  const sessionRecapKey = sessionRecap
    ? `${sessionRecap.stakesLine}|${sessionRecap.sourceRefs.join('|')}`
    : 'none';
  const sessionRecapDismissed = Boolean(
    sessionRecapDynastyId && sessionRecapDismissedDynastyId === sessionRecapDynastyId,
  );

  useEffect(() => {
    if (!sessionRecap || !sessionRecapDynastyId || sessionRecapDismissed) {
      setSessionRecapVisible(false);
      return;
    }

    if (shouldShowSessionRecap({ dynastyId: sessionRecapDynastyId })) {
      markSessionRecapDisplayed(sessionRecapDynastyId);
      setSessionRecapVisible(true);
      return;
    }

    setSessionRecapVisible(false);
  }, [sessionRecap, sessionRecapKey, sessionRecapDynastyId, sessionRecapDismissed]);

  const dismissSessionRecap = () => {
    if (sessionRecapDynastyId) dismissSessionRecapForSession(sessionRecapDynastyId);
    setSessionRecapDismissedDynastyId(sessionRecapDynastyId);
    setSessionRecapVisible(false);
  };

  return (
    <div style={screenStackStyle}>
      <PhaseIndicator phase={phase} week={week} year={year} />
      <PixelScreenHeader
        title="Monday Briefing"
        subtitle={`${teamName} // Season ${year}, Week ${week}`}
        badges={(
          <>
            <PixelBadge variant="gold">{record}</PixelBadge>
            <PixelBadge variant="cyan">WK {String(week).padStart(2, '0')}</PixelBadge>
            <PixelBadge variant="default">YR {year}</PixelBadge>
            <PixelBadge
              variant={narrativeIntensity.status === 'hot' ? 'red' : narrativeIntensity.status === 'warm' ? 'gold' : 'cyan'}
            >
              {`Narrative ${narrativeIntensity.status}`}
            </PixelBadge>
            <PixelBadge variant="green">{`Dynasty ${dynastyScore}`}</PixelBadge>
          </>
        )}
      />

      <AlumniTicker updates={alumniUpdates} reducedMotion={reducedMotion} />

      <SessionRecapSurface
        recap={sessionRecap}
        visible={sessionRecapVisible}
        chipEnabled={chipBriefingEnabled}
        reducedMotion={reducedMotion}
        onDismiss={dismissSessionRecap}
      />

      <PixelPanel title="Briefing Sources" accent="cyan">
        <div style={autoGrid(220)}>
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
                <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{row.label.toUpperCase()}</span>
                <PixelBadge variant={row.accent}>{row.badge}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>{row.detail}</div>
            </div>
          ))}
        </div>
      </PixelPanel>

      <div data-spotlight-target="chip.route.monday-briefing.beat-1">
        <ActionCenter
          {...selectTaskLedgerInput({ game })}
          game={game}
          onCloseAction={closeActionCenterCard}
        />
      </div>

      {recentDecisionReceipts.length > 0 ? (
        <PixelPanel title="Why It Happened" accent="gold">
          <div style={{ display: 'grid', gap: '10px' }}>
            {recentDecisionReceipts.map((receipt) => (
              <div key={receipt.id} style={{ padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>{receipt.decision.toUpperCase()}</span>
                  <PixelBadge variant="cyan">{`Y${receipt.seasonWeek.year} W${receipt.seasonWeek.week}`}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', marginTop: '8px', lineHeight: 1.6 }}>{receipt.outcome}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px', lineHeight: 1.6 }}>
                  {receipt.drivers.slice(0, 3).map((driver) => `${driver.label}: ${driver.value}`).join(' / ')}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', marginTop: '6px', lineHeight: 1.6 }}>{`Counterfactual: ${receipt.counterfactual}`}</div>
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

      <DynastyHistoryPanel cards={dynastyCallbacks} />

      {memoryDigest?.previouslyOn ? (
        <PixelPanel title="Previously On" accent="cyan">
          <div style={{ display: 'grid', gap: '8px' }}>
            {[memoryDigest.previouslyOn, memoryDigest.anniversary, memoryDigest.retrospective, memoryDigest.seasonDocumentary]
              .filter((line): line is string => Boolean(line))
              .map((line) => <div key={line} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{line}</div>)}
            <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>{`${memoryDigest.sourceNodeIds.length} memory graph source${memoryDigest.sourceNodeIds.length === 1 ? '' : 's'}`}</div>
          </div>
        </PixelPanel>
      ) : null}

      {featuredPlayerStory ? (
        <LivingPlayerStoryPanel
          story={featuredPlayerStory}
          title="Chip's Living Player Story"
          chipLine={`Chip: Open ${featuredPlayerStory.playerName}'s Profile or Timeline to follow the whole climb. ${featuredPlayerStory.nextBeatHint ?? 'This chapter is now part of the franchise legacy.'}`}
          onOpenProfile={() => navigateTo(`/player/${featuredPlayerStory.playerId}`)}
          onOpenTimeline={() => navigateTo(`/player/${featuredPlayerStory.playerId}/timeline`)}
        />
      ) : null}

      {teamOpsReceipt ? (
        <PixelPanel title="Team Ops Carryover" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={autoGrid(180)}>
              {teamOpsReceipt.summaryItems.map((item) => (
                <PixelMetricCard
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  accent={opsToneAccent(item.tone)}
                  detail={item.detail}
                />
              ))}
            </div>
            <div style={{
              display: 'grid',
              gap: '10px',
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="cyan">buildTeamOpsImpactReceipt</PixelBadge>
                <PixelBadge variant="gold">{`Facility $${teamOpsReceipt.facilityBudget.toFixed(1)}M`}</PixelBadge>
                <PixelBadge variant="green">{`${teamOpsReceipt.mentors.activeMentors} mentors`}</PixelBadge>
                <PixelBadge variant={teamOpsReceipt.camp.available ? 'green' : 'default'}>
                  {teamOpsReceipt.camp.available ? 'Camp stored' : 'Camp pending'}
                </PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                Reads saved team.facilityState, team.medicalStaff, game.activeMentors, mentorBudget, and trainingCampResults. Settings, Training Camp, and Alumni Mentors are the places that save those changes; Monday Briefing does not upgrade facilities, hire staff, resolve camp, move players, play scheduled games, or reroll saved outcomes.
              </div>
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {chipBriefingEntry ? (
        <div
          data-chip-monday-briefing="intro"
          style={{
            display: 'grid',
            gap: '10px',
            maxWidth: '860px',
          }}
        >
          <ChipDialogueBubble
            text={chipBriefingEntry.text}
            pose={chipBriefingEntry.pose}
            pointer="right"
            reducedMotion={reducedMotion}
          />
          {chipGuidanceDetails.length > 0 ? (
            <section
              data-chip-monday-guidance-details="true"
              style={{
                display: 'grid',
                gap: '8px',
                padding: '12px',
                border: '1px solid rgba(0, 229, 255, 0.34)',
                borderLeft: '5px solid var(--mfd-cyan)',
                background: 'rgba(0, 229, 255, 0.06)',
                color: 'var(--mfd-text)',
                fontFamily: 'var(--mfd-font-mono)',
                fontSize: '12px',
                lineHeight: 1.55,
              }}
            >
              <div
                style={{
                  color: 'var(--mfd-gold)',
                  fontFamily: 'var(--mfd-font-pixel)',
                  fontSize: '8px',
                  lineHeight: 1.3,
                  textTransform: 'uppercase',
                }}
              >
                Chip Week Plan
              </div>
              {chipGuidanceDetails.map((detail) => (
                <div key={detail}>{detail}</div>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Active Layout"
          value={activeLayout?.name ?? 'Command Center'}
          accent="cyan"
          detail={`${activeLayout?.columns ?? 3}-column dashboard`}
        />
        <PixelMetricCard
          label="Pinned Widgets"
          value={pinnedWidgets.length}
          accent={pinnedWidgets.length > 0 ? 'gold' : 'default'}
          detail="Always visible on the command deck"
        />
        <PixelMetricCard
          label="Achievement Board"
          value={`${achievements.filter((achievement) => achievement.unlockedYear !== null).length}/${achievements.length}`}
          accent="gold"
          detail="Unlocked Hall of Champions milestones"
        />
        <PixelMetricCard
          label="Broadcast Track"
          value={nextGame?.broadcastNetwork ?? 'TBD'}
          accent={nextGame?.primetime ? 'gold' : 'cyan'}
          detail={nextGame?.primetime ? 'Primetime slot active' : 'Standard network window'}
        />
        <PixelMetricCard
          label="Weekly Prep"
          value={currentWeeklyPrepPlan ? 'LOCKED' : 'MISSING'}
          accent={currentWeeklyPrepPlan ? 'green' : 'red'}
          detail={currentWeeklyPrepPlan ? `${currentWeeklyPrepPlan.offensiveFocus} / ${currentWeeklyPrepPlan.defensiveFocus}` : 'Open Game Plan to save the prep plan'}
        />
        <PixelMetricCard
          label="Film Room"
          value={latestFilmRoomReport?.grade ?? '--'}
          accent={latestFilmRoomReport?.grade === 'A' || latestFilmRoomReport?.grade === 'B' ? 'green' : latestFilmRoomReport?.grade === 'C' ? 'gold' : 'red'}
          detail={latestFilmRoomReport?.headline ?? 'No postgame coaching note yet'}
        />
        <PixelMetricCard
          label="Sideline Heat"
          value={coachingMarket.hotSeat ? 'HOT' : 'STABLE'}
          accent={coachingMarket.hotSeat ? 'red' : 'green'}
          detail={coachingMarket.hotSeat ? 'Owner approval and patience are both strained' : 'Staff stability is intact'}
        />
      </div>

      <div data-spotlight-target="chip.route.monday-briefing.beat-2">
        <PixelPanel title="Coaching Loop" accent="cyan">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Move straight from Monday Briefing into weekly prep, coaching decisions, or the latest Film Room report.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelButton
                accent={currentWeeklyPrepPlan ? 'green' : 'gold'}
                onClick={() => navigateTo('/game-plan')}
              >
                Open Game Plan
              </PixelButton>
              <PixelButton
                accent={latestFilmRoomReport ? 'cyan' : 'default'}
                onClick={() => navigateTo('/film-room')}
              >
                Open Film Room
              </PixelButton>
              <PixelButton
                accent={coachingMarket.hotSeat ? 'red' : 'gold'}
                onClick={() => navigateTo('/coaching')}
              >
                Open Coaching
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Dashboard Control" accent="cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelSelect
              aria-label="Dashboard layout"
              value={activeLayout?.id ?? ''}
              onChange={(event) => {
                void switchLayout(event.target.value);
              }}
              options={dashboardState.layouts.map((layout) => ({
                value: layout.id,
                label: `${layout.name} (${layout.columns}C)`,
              }))}
              accent="cyan"
            />
            <PixelBadge variant="default">{`${layoutRenderList.length} active widgets`}</PixelBadge>
          </div>
          <PixelButton accent="gold" onClick={beginCustomize}>Customize</PixelButton>
        </div>
      </PixelPanel>

      {pinnedRenderList.length > 0 ? (
        <div style={metricGrid(activeLayout?.columns ?? 3)}>
          {pinnedRenderList.map((widget) => renderWidget(widget))}
        </div>
      ) : null}

      <div style={metricGrid(activeLayout?.columns ?? 3)}>
        {layoutRenderList.map((widget) => renderWidget(widget))}
      </div>

      <PixelPanel title="Season Signals" accent="gold">
        <div style={autoGrid(320)}>
          <div>
            <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>SAVED ARC</div>
            <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
              {(activeArcs[0]?.title ?? 'No active arc').toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: '#999', marginTop: '8px', lineHeight: 1.6 }}>
              {activeArcs[0]?.summary ?? 'Next saved arc appears after a result, injury, rivalry, owner demand, or record event.'}
            </div>
          </div>
          <div>
            <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>LATEST RECAP</div>
            <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
              {(latestPackage?.headline ?? latestSummary?.headline ?? 'No package yet').toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: '#999', marginTop: '8px', lineHeight: 1.6 }}>
              {latestPackage?.autopsy.diagnosis ?? 'The first postgame package will appear once the season begins.'}
            </div>
          </div>
        </div>
      </PixelPanel>

      {chipBriefingEntry ? (
        <div
          data-chip-monday-briefing="outro"
          style={{
            display: 'grid',
            maxWidth: '760px',
            justifySelf: 'end',
          }}
        >
          <ChipDialogueBubble
            text={fitChipBubbleText(chipBriefingOutro(chipBriefingEntry))}
            pose={chipBriefingEntry.reducedMotionPose ?? chipBriefingEntry.pose}
            pointer="right"
            reducedMotion={reducedMotion}
          />
        </div>
      ) : null}

      <PixelModal
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        title="Customize Dashboard"
        description="Toggle widgets, reorder the active layout, pin always-on panels, and save the layout."
        accent="gold"
        width={760}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={autoGrid(220)}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ ...pixelSm, color: '#888' }}>LAYOUT NAME</span>
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                style={{
                  minHeight: '34px',
                  padding: '8px 10px',
                  border: '3px solid var(--mfd-gold)',
                  background: 'var(--mfd-bg-2)',
                  color: 'var(--mfd-text)',
                  fontFamily: 'var(--mfd-font-mono)',
                  fontSize: '12px',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ ...pixelSm, color: '#888' }}>COLUMNS</span>
              <PixelSelect
                value={String(draftColumns)}
                onChange={(event) => setDraftColumns(Number(event.target.value) as 2 | 3)}
                options={[
                  { value: '2', label: '2 Columns' },
                  { value: '3', label: '3 Columns' },
                ]}
                accent="gold"
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {WIDGET_OPTIONS.map((option) => {
              const enabled = draftWidgets.includes(option.value);
              const pinned = pinnedWidgets.includes(option.value);
              return (
                <div key={option.value} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                  gap: '10px',
                  alignItems: 'center',
                }}
                >
                  <PixelSwitch
                    checked={enabled}
                    onChange={(checked) => {
                      if (checked) {
                        setDraftWidgets((current) => [...current, option.value]);
                      } else {
                        setDraftWidgets((current) => current.filter((widget) => widget !== option.value));
                      }
                    }}
                    label={option.label}
                    description={option.description}
                    accent={enabled ? 'gold' : 'default'}
                  />
                  <PixelButton
                    accent={pinned ? 'gold' : 'default'}
                    onClick={() => {
                      if (pinned) {
                        void unpinWidget(option.value);
                      } else {
                        void pinWidget(option.value);
                      }
                    }}
                  >
                    {pinned ? 'Unpin' : 'Pin'}
                  </PixelButton>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <PixelButton
                      accent="default"
                      disabled={!enabled || draftWidgets.indexOf(option.value) <= 0}
                      onClick={() => {
                        const index = draftWidgets.indexOf(option.value);
                        setDraftWidgets((current) => moveWidget(current, index, -1));
                      }}
                    >
                      Up
                    </PixelButton>
                    <PixelButton
                      accent="default"
                      disabled={!enabled || draftWidgets.indexOf(option.value) === -1 || draftWidgets.indexOf(option.value) >= draftWidgets.length - 1}
                      onClick={() => {
                        const index = draftWidgets.indexOf(option.value);
                        setDraftWidgets((current) => moveWidget(current, index, 1));
                      }}
                    >
                      Down
                    </PixelButton>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton
              accent="cyan"
              onClick={() => {
                void saveLayout(draftName.trim() || activeLayout?.name || 'Command Center', draftWidgets, draftColumns, activeLayout?.id);
                setCustomizeOpen(false);
              }}
            >
              Save Layout
            </PixelButton>
            <PixelButton
              accent="gold"
              onClick={() => {
                void saveLayout(draftName.trim() || `Layout ${dashboardState.layouts.length + 1}`, draftWidgets, draftColumns);
                setCustomizeOpen(false);
              }}
            >
              Save New Layout
            </PixelButton>
          </div>
        </div>
      </PixelModal>
    </div>
  );
}
