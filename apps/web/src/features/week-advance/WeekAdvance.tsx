import { useState, useMemo, useCallback } from 'react';
import {
  PixelPanel, PixelBadge, PixelButton,
} from '@mfd/design-system/components';
import { FastForward, Play } from 'lucide-react';
import type { SimAheadFrame, SimAheadStopReason, SimAheadTarget } from '@mfd/engine';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectCurrentGamePlan,
  selectWeek, selectYear, selectSchedule, selectLatestSummary, selectOffseasonState, selectPhase, selectTeams,
  selectLeagueRivalries, selectPowerRankings,
} from '../../app/store/game-store';
import { buildDecisionImpactExplanation, decisionImpactToConsequenceItems } from '../companion/decisionImpact';
import {
  PixelConsequenceList,
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

function phaseLabel(phase: string) {
  return phase.replace(/_/g, ' ').toUpperCase();
}

export function WeekAdvance() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const schedule = useGameStore(selectSchedule);
  const latestSummary = useGameStore(selectLatestSummary);
  const offseasonState = useGameStore(selectOffseasonState);
  const phase = useGameStore(selectPhase);
  const difficulty = useGameStore((state) => state.game?.difficulty ?? 'pro');
  const currentGamePlan = useGameStore(selectCurrentGamePlan);
  const { advanceWeek, simAhead } = useGameStore((s) => s.actions);

  const [advancing, setAdvancing] = useState(false);
  const [simAheadStatus, setSimAheadStatus] = useState<{
    label: string;
    frame: SimAheadFrame | null;
    running: boolean;
    stopReason: SimAheadStopReason | null;
  } | null>(null);

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
  const starters = roster.filter((p) => p.isStarter).length;
  const injuredCount = roster.filter((p) => p.injury).length;
  const advanceImpact = useMemo(
    () => buildDecisionImpactExplanation({
      surface: 'week-advance',
      label: 'Week advance',
      issueCount,
      ownerDelta: allClear ? 0 : -1,
      chemistryDelta: injuredCount > 0 ? -1 : 0,
      difficulty,
    }),
    [allClear, difficulty, injuredCount, issueCount],
  );

  const teams = useGameStore(selectTeams);
  const leagueRivalries = useGameStore(selectLeagueRivalries);
  const powerRankings = useGameStore(selectPowerRankings);
  const opponent = matchup?.opponentId && teams ? teams[matchup.opponentId] : null;
  const radar = useMemo(() => {
    if (!team || !opponent || !matchup) return null;
    const rivalry = leagueRivalries.find((entry) =>
      (entry.teamA === team.id && entry.teamB === opponent.id)
      || (entry.teamB === team.id && entry.teamA === opponent.id),
    ) ?? null;
    const opponentRank = powerRankings.find((entry) => entry.teamId === opponent.id) ?? null;
    const majorUserInjuries = roster.filter((player) =>
      player.isStarter
      && player.injury
      && (player.injury.severityTier === 'severe' || player.injury.severityTier === 'season_ending' || player.injury.severity === 'out' || player.injury.severity === 'ir'),
    );
    const weather = matchup.game.weather ?? (opponent.stadiumType === 'dome' ? 'dome' : null);
    const primetime = matchup.game.primetime ? 'PRIMETIME' : matchup.game.broadcastNetwork ?? null;
    const revenge = rivalry?.lastMetYear === year && rivalry.lastMetWeek !== null && rivalry.lastMetWeek < week;
    const why = rivalry && rivalry.intensity >= 70
      ? `${opponent.city} brings a rivalry heat index of ${rivalry.intensity}.`
      : opponentRank && opponentRank.rank <= 8
        ? `${opponent.city} enters as a top-${opponentRank.rank} measuring stick.`
        : majorUserInjuries.length > 0
          ? `${majorUserInjuries.length} starter injury ${majorUserInjuries.length === 1 ? 'changes' : 'change'} the margin.`
          : matchup.game.primetime
            ? 'The lights are brighter than the standings.'
            : 'A clean week keeps the season plan on schedule.';

    return {
      rivalry,
      opponentRank,
      majorUserInjuries,
      weather,
      primetime,
      revenge,
      why,
    };
  }, [leagueRivalries, matchup, opponent, powerRankings, roster, team, week, year]);
  const isSimAheadRunning = Boolean(simAheadStatus?.running);
  const isBusy = advancing || isSimAheadRunning;

  const handleAdvance = useCallback(async () => {
    if (isBusy) return;
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
  }, [advanceWeek, isBusy, needsGamePlan, phase, week]);

  const handleSimAhead = useCallback(async (target: SimAheadTarget, label: string) => {
    if (isBusy) return;
    setSimAheadStatus({ label, frame: null, running: true, stopReason: null });
    try {
      playSound('week_advance_start', { debounceMs: 0, debounceKey: `sim-ahead:${label}:${phase}:${week}` });
      const result = await simAhead(target, (frame) => {
        setSimAheadStatus({ label, frame, running: true, stopReason: frame.stopReason ?? null });
      });
      setSimAheadStatus((current) => ({
        label,
        frame: current?.frame ?? result?.frames.at(-1) ?? null,
        running: false,
        stopReason: result?.stopReason ?? current?.stopReason ?? null,
      }));
    } catch {
      setSimAheadStatus({
        label,
        frame: null,
        running: false,
        stopReason: 'safety_guard',
      });
    }
  }, [isBusy, phase, simAhead, week]);

  const simAheadControls: Array<{ label: string; target: SimAheadTarget }> = [
    { label: 'My Next Game', target: 'next_user_game' },
    { label: 'Trade Deadline', target: 'trade_deadline' },
    { label: 'End Regular Season', target: 'end_regular_season' },
    { label: 'Playoffs', target: 'playoffs' },
    { label: '4 Weeks', target: { weeks: 4 } },
  ];

  const stopReasonLabel = simAheadStatus?.stopReason
    ? simAheadStatus.stopReason.replace(/_/g, ' ').toUpperCase()
    : null;

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
        subtitle={`${phaseLabel(phase)} // ${allClear ? 'ALL CLEAR' : `${issueCount} ISSUE(S)`} // ${year}`}
        badges={(
          <>
            <PixelBadge variant="cyan">WK {String(week).padStart(2, '0')}</PixelBadge>
            <PixelBadge variant={allClear ? 'green' : 'red'}>{allClear ? 'READY' : `${issueCount} FLAGS`}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard
          label="Readiness"
          value={allClear ? 'READY' : 'CHECK'}
          accent={allClear ? 'green' : needsGamePlan ? 'red' : 'gold'}
          detail={allClear ? 'No blocking roster issues' : needsGamePlan ? 'Game plan still needs a final call' : `${issueCount} review item(s) before sim`}
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
                {radar?.opponentRank ? <PixelBadge variant="gold">#{radar.opponentRank.rank}</PixelBadge> : null}
                {radar?.rivalry ? <PixelBadge variant={radar.rivalry.intensity >= 70 ? 'red' : 'gold'}>RIVALRY {radar.rivalry.intensity}</PixelBadge> : null}
                {radar?.revenge ? <PixelBadge variant="red">REVENGE</PixelBadge> : null}
                {radar?.weather ? <PixelBadge variant="default">{String(radar.weather).toUpperCase()}</PixelBadge> : null}
                {radar?.primetime ? <PixelBadge variant="cyan">{radar.primetime}</PixelBadge> : null}
              </div>
              {radar?.majorUserInjuries.length ? (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {radar.majorUserInjuries.slice(0, 3).map((player) => (
                    <PixelBadge key={player.id} variant="red">{player.pos} {player.name}</PixelBadge>
                  ))}
                </div>
              ) : null}
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                {radar?.why ?? 'This game will define the next owner pulse and chemistry swing.'}
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

      <PixelPanel title="Decision Impact" accent={advanceImpact.severity === 'high' ? 'red' : 'gold'}>
        <PixelConsequenceList items={decisionImpactToConsequenceItems(advanceImpact)} />
      </PixelPanel>

      <PixelPanel title="Sim Ahead" accent="cyan">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {simAheadControls.map((control) => (
            <PixelButton
              key={control.label}
              accent="cyan"
              disabled={isBusy}
              onClick={() => void handleSimAhead(control.target, control.label)}
            >
              <FastForward size={14} />
              {control.label}
            </PixelButton>
          ))}
        </div>
        <div style={{ ...monoSm, color: '#999', marginTop: '10px', lineHeight: 1.6 }}>
          {simAheadStatus?.frame
            ? `${simAheadStatus.label}: S${simAheadStatus.frame.year} W${simAheadStatus.frame.week} // ${phaseLabel(simAheadStatus.frame.phase)} // ${simAheadStatus.frame.record ?? 'NO RECORD'}${stopReasonLabel ? ` // ${stopReasonLabel}` : ''}`
            : 'READY // STANDBY'}
        </div>
      </PixelPanel>

      {advancing || isSimAheadRunning ? (
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
            {isSimAheadRunning ? `SIM AHEAD ${simAheadStatus?.label.toUpperCase() ?? ''}...` : `SIMULATING ${phaseLabel(phase)}...`}
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
            {isSimAheadRunning && simAheadStatus?.frame
              ? `Processed ${simAheadStatus.frame.weeksSimmed} week(s).`
              : 'Processing league-wide results...'}
          </div>
        </div>
      ) : (
        <PixelButton
          onClick={() => void handleAdvance()}
          disabled={isBusy}
          accent={needsGamePlan ? 'gold' : allClear ? 'green' : 'gold'}
          style={{ width: '100%', justifyContent: 'center', minHeight: '42px' }}
        >
          <Play size={14} />
          {needsGamePlan ? advanceLabel : allClear ? advanceLabel : `Advance Anyway (${issueCount})`}
        </PixelButton>
      )}

      <PixelPanel title="Latest Summary" accent={latestSummary?.result === 'win' ? 'green' : latestSummary?.result === 'loss' ? 'red' : 'default'}>
        {latestSummary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
              {latestSummary.headline.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{latestSummary.record}</PixelBadge>
              <PixelBadge variant={latestSummary.result === 'win' ? 'green' : latestSummary.result === 'loss' ? 'red' : 'default'}>
                {latestSummary.result}
              </PixelBadge>
              <PixelBadge variant="default">{latestSummary.phase}</PixelBadge>
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
