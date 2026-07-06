import { useState, useMemo, useCallback } from 'react';
import {
  PixelPanel, PixelBadge, PixelButton, PixelPlayerLink,
} from '@mfd/design-system/components';
import { Play } from 'lucide-react';
import { buildPostWeekMoment, type DraftRecap, type PostWeekMomentTone } from '@mfd/engine';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectCurrentGamePlan, selectLatestGameDayPackage,
  selectWeek, selectYear, selectSchedule, selectLatestSummary, selectOffseasonState, selectPhase, selectTeams,
  selectOffseasonCalendar, selectDraftRecaps,
  type OffseasonCalendarReadModel,
  type OffseasonCalendarStep,
} from '../../app/store/game-store';
import {
  PixelConsequenceList,
  CommandCallout,
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  mono,
  monoSm,
  navigateTo,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { playSound } from '../audio/AudioManager';
import { buildDecisionImpactExplanation, decisionImpactToConsequenceItems } from '../companion/decisionImpact';

interface ChecklistItem {
  id: string;
  label: string;
  status: 'done' | 'warn' | 'pending';
  detail: string;
  fixRoute?: string;
  fixLabel?: string;
}

function statusAccent(status: ChecklistItem['status']): 'green' | 'gold' | 'red' {
  return status === 'done' ? 'green' : status === 'warn' ? 'gold' : 'red';
}

function calendarStatusAccent(status: OffseasonCalendarStep['status']): 'green' | 'gold' | 'red' | 'default' {
  if (status === 'complete') return 'green';
  if (status === 'active') return 'gold';
  if (status === 'blocked') return 'red';
  return 'default';
}

function calendarButtonAccent(status: OffseasonCalendarStep['status']): 'gold' | 'cyan' | 'red' {
  if (status === 'blocked') return 'red';
  if (status === 'active') return 'gold';
  return 'cyan';
}

function phaseLabel(phase: string) {
  return phase.replace(/_/g, ' ').toUpperCase();
}

function toneAccent(tone: PostWeekMomentTone): 'green' | 'red' | 'gold' | 'default' {
  if (tone === 'positive') return 'green';
  if (tone === 'negative') return 'red';
  if (tone === 'warning') return 'gold';
  return 'default';
}

type AdvanceSourceAccent = 'cyan' | 'gold' | 'green' | 'red';

interface AdvanceSourceRow {
  id: string;
  label: string;
  status: string;
  detail: string;
  accent: AdvanceSourceAccent;
}

function AdvanceSourcesPanel({
  calendarVisible,
  hasPostWeekMoment,
  needsGamePlan,
}: {
  calendarVisible: boolean;
  hasPostWeekMoment: boolean;
  needsGamePlan: boolean;
}) {
  const rows: AdvanceSourceRow[] = [
    {
      id: 'readiness',
      label: 'Lineup and matchup',
      status: 'checked',
      detail: 'Advance Week uses your saved roster, starters, schedule, current week, and Game Plan. Fix lineup or matchup concerns before pressing the button.',
      accent: 'cyan',
    },
    {
      id: 'calendar',
      label: 'League calendar',
      status: calendarVisible ? 'required step' : 'clear',
      detail: 'If the offseason, CBA, or expansion calendar has a required step, its button sends you there before the league moves.',
      accent: calendarVisible ? 'gold' : 'cyan',
    },
    {
      id: 'post-week',
      label: 'Last game notes',
      status: hasPostWeekMoment ? 'ready' : 'waiting',
      detail: 'If a recap exists, this screen shows injury, morale, and matchup notes that send you to Roster, Depth Chart, or Game Plan when a fix is still open.',
      accent: hasPostWeekMoment ? 'green' : 'cyan',
    },
    {
      id: 'gate',
      label: 'Game Plan requirement',
      status: needsGamePlan ? 'needs plan' : 'plan saved',
      detail: 'If this matchup has no saved Game Plan, the button opens Game Plan instead of advancing.',
      accent: needsGamePlan ? 'red' : 'green',
    },
    {
      id: 'commit',
      label: 'Advance button',
      status: 'locks results',
      detail: 'Only this button advances the league. It saves the result, injuries, standings, and any halftime, trade-deadline, expansion, or CBA pause that follows.',
      accent: 'gold',
    },
  ];

  return (
    <PixelPanel title="Advance Week Uses" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: '118px',
              padding: '10px',
              border: '1px solid #1f1f1f',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ ...mono, color: '#fff' }}>{row.label}</span>
              <PixelBadge variant={row.accent}>{row.status}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

type OffseasonCommandSnapshotAccent = 'cyan' | 'gold' | 'green' | 'red' | 'default';
type RookieClassFollowUpAccent = 'cyan' | 'gold' | 'green' | 'red';

export interface OffseasonCommandSnapshotRow {
  id: 'calendar' | 'expiring' | 'cap' | 'market';
  label: string;
  value: string;
  detail: string;
  route: string;
  ctaLabel: string;
  accent: OffseasonCommandSnapshotAccent;
}

interface RookieClassFollowUpRow {
  id: string;
  label: string;
  playerId: string;
  playerName: string;
  ovr: number;
  detail: string;
  accent: RookieClassFollowUpAccent;
}

interface RookieClassFollowUp {
  year: number;
  classGrade: string;
  rows: RookieClassFollowUpRow[];
}

interface OffseasonSnapshotPlayer {
  id: string;
  name?: string;
  pos?: string;
  ovr?: number;
  contract?: { years?: number } | null;
}

interface OffseasonSnapshotTeam {
  capSpace?: number;
  capUsed?: number;
}

interface OffseasonSnapshotState {
  round?: number;
  expiringPlayerIds?: string[];
  reSignDecisions?: Record<string, { status?: string }>;
  freeAgencyBids?: Record<string, Array<{ round?: number; status?: string }>>;
}

function money(value: number | undefined): string {
  return Number.isFinite(value) ? `$${Math.round(value ?? 0)}M` : '$0M';
}

function playerLabel(player: OffseasonSnapshotPlayer): string {
  const name = player.name ?? player.id;
  return `${name}${player.pos ? ` (${player.pos})` : ''}`;
}

function recapPickDetail(pick: DraftRecap['picks'][number]): string {
  const valueDelta = pick.valueDelta === 0 ? 'even value' : `${pick.valueDelta > 0 ? '+' : ''}${pick.valueDelta} value`;
  return `${pick.position} // Round ${pick.round}, pick ${pick.pick}; projected #${pick.projectedPick}; ${valueDelta}; ${pick.verdict}.`;
}

export function buildRookieClassFollowUp({
  draftRecaps,
  phase,
  year,
  week,
}: {
  draftRecaps: DraftRecap[];
  phase: string;
  year: number;
  week: number;
}): RookieClassFollowUp | null {
  const openingWindow = phase === 'training_camp' || phase === 'preseason' || (phase === 'regular_season' && week <= 4);
  if (!openingWindow) return null;

  const recap = draftRecaps.find((entry) => entry.year === year)
    ?? draftRecaps.find((entry) => entry.year === year - 1)
    ?? null;
  if (!recap) return null;

  const rows: RookieClassFollowUpRow[] = [];
  const seen = new Set<string>();
  const addRow = (label: string, pick: DraftRecap['picks'][number] | undefined, accent: RookieClassFollowUpAccent) => {
    if (!pick || seen.has(pick.playerId)) return;
    seen.add(pick.playerId);
    rows.push({
      id: `${label.toLowerCase().replace(/\s+/g, '-')}-${pick.playerId}`,
      label,
      playerId: pick.playerId,
      playerName: pick.playerName,
      ovr: pick.ovr,
      detail: recapPickDetail(pick),
      accent,
    });
  };

  const topPick = [...recap.picks].sort((a, b) => a.pick - b.pick || a.playerId.localeCompare(b.playerId))[0];
  addRow('Top pick', topPick, 'cyan');
  addRow('Best value', recap.bestValue, recap.bestValue.verdict === 'steal' ? 'green' : 'gold');
  addRow('Reach watch', recap.biggestReach, recap.biggestReach.verdict === 'reach' ? 'red' : 'gold');
  addRow('Steal follow-up', recap.steals[0], 'green');

  return rows.length > 0 ? { year: recap.year, classGrade: recap.classGrade, rows: rows.slice(0, 3) } : null;
}

export function buildOffseasonCommandSnapshot({
  calendar,
  team,
  roster,
  offseasonState,
}: {
  calendar: OffseasonCalendarReadModel;
  team: OffseasonSnapshotTeam | null;
  roster: OffseasonSnapshotPlayer[];
  offseasonState: OffseasonSnapshotState | null;
}): OffseasonCommandSnapshotRow[] {
  if (!calendar.visible) return [];

  const activeStep = calendar.steps.find((step) => step.id === calendar.activeStepId)
    ?? calendar.steps.find((step) => step.status === 'blocked' || step.status === 'active')
    ?? null;
  const expiringSourceIds = offseasonState?.expiringPlayerIds;
  const expiringIds = new Set(expiringSourceIds ?? []);
  const expiringPlayers = roster
    .filter((player) => expiringSourceIds ? expiringIds.has(player.id) : player.contract?.years === 1)
    .sort((a, b) => (b.ovr ?? 0) - (a.ovr ?? 0));
  const unresolvedReSigns = Object.values(offseasonState?.reSignDecisions ?? {})
    .filter((decision) => decision.status === 'pending' || decision.status === 'countered').length;
  const round = Math.min(3, Math.max(1, offseasonState?.round ?? 1));
  const pendingBids = Object.values(offseasonState?.freeAgencyBids ?? {}).reduce((total, bids) => (
    total + bids.filter((bid) => (bid.round ?? round) === round && bid.status === 'pending').length
  ), 0);
  const capSpace = team?.capSpace ?? 0;

  return [
    {
      id: 'calendar',
      label: 'Calendar Owner',
      value: activeStep?.label ?? calendar.headline,
      detail: `${calendar.summary} Next route: ${activeStep?.route ?? '/week-advance'}.`,
      route: activeStep?.route ?? '/week-advance',
      ctaLabel: activeStep?.ctaLabel ?? 'Stay Here',
      accent: calendar.blocked ? 'red' : activeStep?.status === 'active' ? 'gold' : 'cyan',
    },
    {
      id: 'expiring',
      label: 'Expiring Core',
      value: `${expiringPlayers.length} player(s)`,
      detail: expiringPlayers.length > 0
        ? `Top expiring: ${expiringPlayers.slice(0, 3).map(playerLabel).join(' / ')}. ${unresolvedReSigns} unresolved re-sign decision(s).`
        : 'No saved expiring core is queued; Contracts remains the owner for extension and tag checks.',
      route: '/contracts',
      ctaLabel: 'Manage Contracts',
      accent: unresolvedReSigns > 0 ? 'gold' : expiringPlayers.length > 0 ? 'cyan' : 'green',
    },
    {
      id: 'cap',
      label: 'Cap Room',
      value: money(capSpace),
      detail: `Saved team.capSpace with ${money(team?.capUsed)} used. Contracts and Cap Lab own cap changes.`,
      route: '/contracts',
      ctaLabel: 'Open Cap',
      accent: capSpace < 0 ? 'red' : capSpace < 10 ? 'gold' : 'green',
    },
    {
      id: 'market',
      label: 'Market Load',
      value: `${pendingBids} pending bid(s)`,
      detail: `Round ${round} reads saved offseasonState.freeAgencyBids; Free Agency owns bid submit and round resolution.`,
      route: '/free-agency',
      ctaLabel: 'Open Market',
      accent: pendingBids > 0 ? 'gold' : 'cyan',
    },
  ];
}

export function WeekAdvance() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const schedule = useGameStore(selectSchedule);
  const latestSummary = useGameStore(selectLatestSummary);
  const latestPackage = useGameStore(selectLatestGameDayPackage);
  const offseasonState = useGameStore(selectOffseasonState);
  const phase = useGameStore(selectPhase);
  const offseasonCalendar = useGameStore(selectOffseasonCalendar);
  const currentGamePlan = useGameStore(selectCurrentGamePlan);
  const draftRecaps = useGameStore(selectDraftRecaps);
  const { advanceWeek } = useGameStore((s) => s.actions);

  const [advancing, setAdvancing] = useState(false);

  const matchup = useMemo(() => {
    if (!team || !schedule.length || (phase !== 'regular_season' && phase !== 'playoffs')) return null;
    const weekSchedule = schedule.find((w) => w.week === week);
    if (!weekSchedule) return null;
    const game = weekSchedule.games.find(
      (g) => g.homeTeamId === team.id || g.awayTeamId === team.id,
    );
    if (!game) return null;
    const opponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
    return { game, opponentId };
  }, [phase, team, schedule, week]);

  const needsGamePlan = Boolean(matchup) && (phase === 'regular_season' || phase === 'playoffs') && !currentGamePlan;

  const checklist = useMemo((): ChecklistItem[] => {
    if (!team) return [];
    const starters = roster.filter((p) => p.isStarter);
    const injured = roster.filter((p) => p.injury);
    const injuredStarters = starters.filter((p) => p.injury);

    return [
      {
        id: 'depth',
        label: 'Depth Chart Set',
        status: starters.length >= 22 ? 'done' : 'warn',
        detail: starters.length >= 22 ? 'All positions have starters' : `Only ${starters.length}/22 starters set`,
        fixRoute: '/depth-chart',
        fixLabel: 'Fix Depth Chart',
      },
      {
        id: 'injuries',
        label: 'Injury Review',
        status: injuredStarters.length > 0 ? 'warn' : injured.length > 0 ? 'warn' : 'done',
        detail: injuredStarters.length > 0
          ? `${injuredStarters.length} injured starter(s)`
          : injured.length > 0
            ? `${injured.length} injured player(s), no starters affected`
            : 'All healthy',
        fixRoute: '/roster',
        fixLabel: 'View Roster',
      },
      {
        id: 'cap',
        label: 'Cap Compliant',
        status: team.capSpace >= 0 ? 'done' : 'pending',
        detail: team.capSpace >= 0 ? `$${Math.round(team.capSpace)}M free` : `$${Math.round(-team.capSpace)}M over cap`,
        fixRoute: '/contracts',
        fixLabel: 'Manage Cap',
      },
      {
        id: 'gameplan',
        label: 'Game Plan',
        status: needsGamePlan ? 'pending' : 'done',
        detail: needsGamePlan
          ? 'Plan Needed'
          : currentGamePlan
            ? `OFF: ${currentGamePlan.offensiveScheme} / DEF: ${currentGamePlan.defensiveScheme}`
            : matchup
              ? 'AI plan ready if you skip setup'
              : 'Bye week',
        fixRoute: '/game-plan',
        fixLabel: 'Open Game Plan',
      },
    ];
  }, [currentGamePlan, matchup, needsGamePlan, team, roster]);

  const allClear = checklist.every((c) => c.status === 'done');
  const issueCount = checklist.filter((c) => c.status !== 'done').length;
  const listedItemCopy = `${issueCount} listed item${issueCount === 1 ? '' : 's'}`;
  const listedItemVerb = issueCount === 1 ? 'remains' : 'remain';
  const starters = roster.filter((p) => p.isStarter).length;
  const injuredCount = roster.filter((p) => p.injury).length;
  const advanceImpact = useMemo(
    () => buildDecisionImpactExplanation({
      surface: 'week-advance',
      label: 'Week advance',
      issueCount,
      difficulty: 'standard',
    }),
    [issueCount],
  );

  const teams = useGameStore(selectTeams);
  const opponent = matchup?.opponentId && teams ? teams[matchup.opponentId] : null;
  const postWeekMoment = useMemo(
    () => buildPostWeekMoment(latestSummary, latestPackage),
    [latestPackage, latestSummary],
  );
  const offseasonCommandRows = useMemo(
    () => buildOffseasonCommandSnapshot({
      calendar: offseasonCalendar,
      team,
      roster,
      offseasonState,
    }),
    [offseasonCalendar, offseasonState, roster, team],
  );
  const rookieClassFollowUp = useMemo(
    () => buildRookieClassFollowUp({ draftRecaps, phase, year, week }),
    [draftRecaps, phase, week, year],
  );

  const handleAdvance = useCallback(async () => {
    if (needsGamePlan) {
      navigateTo('/game-plan');
      return;
    }
    setAdvancing(true);
    try {
      playSound('week_advance_start', { debounceMs: 0, debounceKey: `week-advance:${phase}:${week}` });
      await advanceWeek();
    } finally {
      setAdvancing(false);
    }
  }, [advanceWeek, needsGamePlan, phase, week]);

  const advanceLabel = needsGamePlan
    ? 'Prepare Game Plan'
    : phase === 'preseason'
      ? 'Begin Regular Season'
      : phase === 'playoffs'
        ? 'Advance Playoffs'
        : phase === 'offseason'
          ? 'Open Free Agency'
          : phase === 'free_agency'
            ? `Resolve FA Round ${offseasonState?.round ?? 1}`
            : phase === 'draft'
              ? 'Advance To Next Draft Pick'
              : phase === 'post_draft'
                ? 'Finalize Preseason'
                : `Advance To Week ${week + 1}`;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title={advanceLabel}
        subtitle={`${phaseLabel(phase)} // ${allClear ? 'ALL CLEAR' : `${issueCount} ITEM(S)`} // ${year}`}
        badges={(
          <>
            <PixelBadge variant="cyan">WK {String(week).padStart(2, '0')}</PixelBadge>
            <PixelBadge variant={allClear ? 'green' : 'red'}>{allClear ? 'READY' : `${issueCount} FLAGS`}</PixelBadge>
          </>
        )}
      />

      <CommandCallout
        title={needsGamePlan ? 'Game Plan before Advance Week' : allClear ? 'Ready to advance the week' : 'Resolve or accept the listed items'}
        body={needsGamePlan
          ? "Weekly prep is required here. Open Game Plan, save this week's plan, then return to Advance Week."
          : allClear
            ? 'No blockers remain. This click saves the game result, injury updates, standings, and the next media cycle.'
            : `${listedItemCopy} ${listedItemVerb}. Fix the injury flag, first-backup choice, cap move, or matchup call, or advance knowing those saved choices become the next result.`}
        accent={needsGamePlan ? 'red' : allClear ? 'green' : 'gold'}
        meta={(
          <>
            <PixelBadge variant={needsGamePlan ? 'red' : 'green'}>
              {needsGamePlan ? 'Plan missing' : 'Plan ready'}
            </PixelBadge>
            <PixelBadge variant={allClear ? 'green' : 'gold'}>{issueCount} flags</PixelBadge>
          </>
        )}
        actions={[
          needsGamePlan
            ? { label: 'Open Plan', accent: 'gold' as const, onClick: () => navigateTo('/game-plan') }
            : { label: advanceLabel, accent: allClear ? 'green' as const : 'gold' as const, onClick: () => void handleAdvance() },
        ]}
      />

      <AdvanceSourcesPanel
        calendarVisible={offseasonCalendar.visible}
        hasPostWeekMoment={Boolean(postWeekMoment)}
        needsGamePlan={needsGamePlan}
      />

      {rookieClassFollowUp ? (
        <PixelPanel title="Rookie Class Follow-Up" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{rookieClassFollowUp.year} draft</PixelBadge>
              <PixelBadge variant="green">Class {rookieClassFollowUp.classGrade}</PixelBadge>
              <PixelBadge variant="cyan">selectDraftRecaps</PixelBadge>
              <PixelBadge variant="default">Read-only</PixelBadge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '10px' }}>
              {rookieClassFollowUp.rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minHeight: '132px',
                    padding: '10px',
                    border: '1px solid #1f1f1f',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...mono, color: '#fff' }}>{row.label}</span>
                    <PixelBadge variant={row.accent}>{row.ovr} OVR</PixelBadge>
                  </div>
                  <PixelPlayerLink playerId={row.playerId} name={row.playerName} ovr={row.ovr} title={`Open ${row.playerName} rookie profile`} />
                  <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5, flex: 1 }}>{row.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelButton accent="cyan" onClick={() => navigateTo('/player-development')}>Open Development</PixelButton>
              <PixelButton accent="gold" onClick={() => navigateTo('/training-camp')}>Open Training Camp</PixelButton>
              <PixelButton accent="green" onClick={() => navigateTo('/draft-recap')}>Review Draft Recap</PixelButton>
            </div>
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              Source: saved user-team draftRecaps. This follow-up does not generate recaps, change rookie ratings, assign training,
              alter depth charts, create profile history, start the next week, autosave, or reroll outcomes.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {offseasonCalendar.visible ? (
        <PixelPanel title="Offseason Calendar" accent={offseasonCalendar.blocked ? 'red' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ ...pixelSm, color: offseasonCalendar.blocked ? 'var(--mfd-red)' : 'var(--mfd-cyan)', marginBottom: '4px' }}>
                {offseasonCalendar.headline.toUpperCase()}
              </div>
              <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.6 }}>
                {offseasonCalendar.summary}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '10px' }}>
              {offseasonCalendar.steps.map((step) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    minHeight: '72px',
                    padding: '10px',
                    border: `1px solid ${step.id === offseasonCalendar.activeStepId ? 'var(--mfd-gold)' : '#1f1f1f'}`,
                    background: step.status === 'blocked' ? 'rgba(255, 77, 79, 0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                      <PixelBadge variant={calendarStatusAccent(step.status)}>{step.status}</PixelBadge>
                      <div style={{ ...mono, color: '#fff' }}>{step.label}</div>
                    </div>
                    <div style={{ ...monoSm, color: '#888', lineHeight: 1.45 }}>{step.detail}</div>
                  </div>
                  <PixelButton
                    accent={calendarButtonAccent(step.status)}
                    onClick={() => navigateTo(step.route)}
                    style={{ flexShrink: 0 }}
                  >
                    {step.ctaLabel}
                  </PixelButton>
                </div>
              ))}
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {offseasonCommandRows.length > 0 ? (
        <PixelPanel title="Offseason Command Snapshot" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="cyan">selectOffseasonCalendar</PixelBadge>
              <PixelBadge variant="gold">Saved offseasonState</PixelBadge>
              <PixelBadge variant="green">Saved roster/cap</PixelBadge>
              <PixelBadge variant="default">Read-only</PixelBadge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '10px' }}>
              {offseasonCommandRows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minHeight: '142px',
                    padding: '10px',
                    border: '1px solid #1f1f1f',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...mono, color: '#fff' }}>{row.label}</span>
                    <PixelBadge variant={row.accent}>{row.value}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5, flex: 1 }}>{row.detail}</div>
                  <PixelButton accent={row.accent === 'red' ? 'red' : row.accent === 'green' ? 'green' : 'gold'} onClick={() => navigateTo(row.route)}>
                    {row.ctaLabel}
                  </PixelButton>
                </div>
              ))}
            </div>
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              Source: saved offseason calendar, offseasonState, user-team roster contracts, and team cap fields. This snapshot does not
              advance the offseason, submit bids, resolve rounds, re-sign players, move roster assets, change cap totals, autosave, or resolve market outcomes.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      <div style={autoGrid(210)}>
        <PixelMetricCard
          label="Advance Check"
          value={allClear ? 'READY' : 'CHECK'}
          accent={allClear ? 'green' : needsGamePlan ? 'red' : 'gold'}
          detail={allClear ? 'No required lineup or Game Plan items' : needsGamePlan ? 'Game Plan still needs a saved weekly plan' : `${listedItemCopy} before Advance Week`}
        />
        <PixelMetricCard
          label="Starters"
          value={`${starters}/22`}
          accent={starters >= 22 ? 'green' : 'gold'}
          detail="Projected opening lineup"
        />
        <PixelMetricCard
          label="Injury Load"
          value={injuredCount}
          accent={injuredCount === 0 ? 'green' : injuredCount < 3 ? 'gold' : 'red'}
          detail={injuredCount === 0 ? 'Clean report' : 'Training room active'}
        />
        <PixelMetricCard
          label="Cap Status"
          value={team ? `$${Math.round(team.capSpace)}M` : '$0M'}
          accent={team && team.capSpace >= 0 ? 'cyan' : 'red'}
          detail={team && team.capSpace >= 0 ? 'Compliant' : 'Need relief now'}
        />
      </div>

      <div style={autoGrid(320)}>
        <div data-spotlight-target="chip.route.week-advance.beat-1">
          <PixelPanel title="Pre-Advance Checklist" accent={allClear ? 'green' : 'gold'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {checklist.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #1a1a1a',
                }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{item.label}</div>
                    <div style={{ ...monoSm, color: '#888', marginTop: '4px' }}>{item.detail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.status !== 'done' && item.fixRoute && (
                      <PixelButton accent="gold" onClick={() => navigateTo(item.fixRoute!)}>
                        {item.fixLabel}
                      </PixelButton>
                    )}
                    <PixelBadge variant={statusAccent(item.status)}>
                      {item.status}
                    </PixelBadge>
                  </div>
                </div>
              ))}
            </div>
          </PixelPanel>
        </div>

        <PixelPanel title="Matchup Radar" accent="cyan">
          {opponent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ ...display, fontSize: '24px', color: '#fff', lineHeight: 1 }}>
                {`VS ${opponent.city} ${opponent.name}`.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="default">{opponent.wins}-{opponent.losses}</PixelBadge>
                <PixelBadge variant="cyan">{opponent.schemeOff}</PixelBadge>
                <PixelBadge variant="red">{opponent.schemeDef}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                Broadcast note: this game will define the next owner pulse and chemistry swing.
              </div>
            </div>
          ) : (
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              {phase === 'offseason' && 'Re-sign window is active.'}
              {phase === 'free_agency' && `Round ${offseasonState?.round ?? 1} market resolution.`}
              {phase === 'draft' && 'Advance until your next draft slot.'}
              {phase === 'post_draft' && 'League reset into preseason mode.'}
              {phase !== 'offseason' && phase !== 'free_agency' && phase !== 'draft' && phase !== 'post_draft' && 'Bye week on deck.'}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title="Stakes" accent="red">
        <PixelConsequenceList
          items={[
            { id: 'c1', label: 'Owner Patience', delta: '-4 on loss', accent: 'red' },
            { id: 'c2', label: 'Chemistry', delta: '+2 on win', accent: 'green' },
            { id: 'c3', label: 'System Fit', delta: '+1 weekly reps', accent: 'cyan' },
          ]}
        />
      </PixelPanel>

      <div data-spotlight-target="chip.route.week-advance.beat-2">
        <PixelPanel title="Decision Impact" accent={advanceImpact.severity === 'high' ? 'red' : 'gold'}>
          <PixelConsequenceList items={decisionImpactToConsequenceItems(advanceImpact)} />
        </PixelPanel>
      </div>

      {advancing ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '24px',
          border: '3px solid var(--mfd-gold)',
          background: 'rgba(255, 215, 0, 0.04)',
        }}>
          <style>{`
            @keyframes mfdSimPulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }
          `}</style>
          <div style={{
            ...pixelSm,
            color: 'var(--mfd-gold)',
            animation: 'mfdSimPulse 1.2s ease-in-out infinite',
            fontSize: '10px',
            letterSpacing: '2px',
          }}>
            SIMULATING {phaseLabel(phase)}...
          </div>
          <div style={{
            width: '100%',
            maxWidth: '300px',
            height: '6px',
            background: '#111',
            border: '1px solid var(--mfd-border)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '40%',
              height: '100%',
              background: 'var(--mfd-gold)',
              animation: 'mfdSimSlide 1.5s ease-in-out infinite',
            }} />
            <style>{`
              @keyframes mfdSimSlide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(350%); }
              }
            `}</style>
          </div>
          <div style={{ ...monoSm, color: '#666' }}>
            Processing league-wide results...
          </div>
        </div>
      ) : (
        <PixelButton
          data-mfd-week-advance-action="true"
          onClick={() => void handleAdvance()}
          disabled={advancing}
          accent={needsGamePlan ? 'gold' : allClear ? 'green' : 'gold'}
          style={{ width: '100%', justifyContent: 'center', minHeight: '42px' }}
        >
          <Play size={14} />
          {needsGamePlan ? advanceLabel : allClear ? advanceLabel : `Advance Anyway (${issueCount})`}
        </PixelButton>
      )}

      <PixelPanel title="Post-Week Command Deck" accent={postWeekMoment?.result === 'win' ? 'green' : postWeekMoment?.result === 'loss' ? 'red' : 'default'}>
        {postWeekMoment ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
              {postWeekMoment.headline.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {postWeekMoment.record ? <PixelBadge variant="gold">{postWeekMoment.record}</PixelBadge> : null}
              {postWeekMoment.scoreLine ? <PixelBadge variant="cyan">{postWeekMoment.scoreLine}</PixelBadge> : null}
              <PixelBadge variant={postWeekMoment.result === 'win' ? 'green' : postWeekMoment.result === 'loss' ? 'red' : 'default'}>
                {postWeekMoment.result}
              </PixelBadge>
              <PixelBadge variant="default">{postWeekMoment.source === 'game-day-package' ? 'game-day package' : 'weekly summary'}</PixelBadge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '8px' }}>
              {[
                ['WHY IT HAPPENED', postWeekMoment.whyItHappened],
                ['WHAT CHANGED', postWeekMoment.whatChanged],
                ['WHAT NOW', postWeekMoment.whatNow],
              ].map(([title, items]) => (
                <div key={title as string} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ ...pixelSm, color: '#666', letterSpacing: '1px' }}>{title as string}</div>
                  {(items as typeof postWeekMoment.whyItHappened).map((item) => (
                    <div key={item.id} style={{
                      padding: '8px',
                      border: '1px solid #1f1f1f',
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <PixelBadge variant={toneAccent(item.tone)}>{item.label}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5 }}>{item.detail}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ ...monoSm, color: '#999' }}>
            No simulated results yet.
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
