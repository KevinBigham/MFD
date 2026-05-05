import { useState, useMemo, useCallback } from 'react';
import {
  PixelPanel, PixelBadge, PixelButton,
} from '@mfd/design-system/components';
import { Play } from 'lucide-react';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectCurrentGamePlan,
  selectWeek, selectYear, selectSchedule, selectLatestSummary, selectOffseasonState, selectPhase, selectTeams,
} from '../../app/store/game-store';
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
  const currentGamePlan = useGameStore(selectCurrentGamePlan);
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
  }, [advanceWeek, needsGamePlan]);

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
          onClick={() => void handleAdvance()}
          disabled={advancing}
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
