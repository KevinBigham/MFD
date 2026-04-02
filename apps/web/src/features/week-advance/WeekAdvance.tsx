import { useState, useMemo, useCallback } from 'react';
import {
  PixelPanel, PixelBadge, PixelButton,
} from '@mfd/design-system/components';
import { Play } from 'lucide-react';
import {
  useGameStore, selectUserTeam, selectRoster,
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
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

interface ChecklistItem {
  id: string;
  label: string;
  status: 'done' | 'warn' | 'pending';
  detail: string;
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
  const { advanceWeek } = useGameStore((s) => s.actions);

  const [advancing, setAdvancing] = useState(false);

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
      },
      {
        id: 'cap',
        label: 'Cap Compliant',
        status: team.capSpace >= 0 ? 'done' : 'pending',
        detail: team.capSpace >= 0 ? `$${Math.round(team.capSpace)}M free` : `$${Math.round(-team.capSpace)}M over cap`,
      },
      {
        id: 'gameplan',
        label: 'Schemes Set',
        status: 'done',
        detail: `OFF: ${team.schemeOff} / DEF: ${team.schemeDef}`,
      },
    ];
  }, [team, roster]);

  const allClear = checklist.every((c) => c.status === 'done');
  const issueCount = checklist.filter((c) => c.status !== 'done').length;
  const starters = roster.filter((p) => p.isStarter).length;
  const injuredCount = roster.filter((p) => p.injury).length;

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

  const teams = useGameStore(selectTeams);
  const opponent = matchup?.opponentId && teams ? teams[matchup.opponentId] : null;

  const handleAdvance = useCallback(async () => {
    setAdvancing(true);
    try {
      await advanceWeek();
    } finally {
      setAdvancing(false);
    }
  }, [advanceWeek]);

  const advanceLabel = phase === 'preseason'
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
          accent={allClear ? 'green' : 'gold'}
          detail={allClear ? 'No blocking roster issues' : `${issueCount} review item(s) before sim`}
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
                alignItems: 'flex-start',
                paddingBottom: '8px',
                borderBottom: '1px solid #1a1a1a',
              }}>
                <div>
                  <div style={{ ...mono, color: '#fff' }}>{item.label}</div>
                  <div style={{ ...monoSm, color: '#888', marginTop: '4px' }}>{item.detail}</div>
                </div>
                <PixelBadge variant={statusAccent(item.status)}>
                  {item.status}
                </PixelBadge>
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

      <PixelButton
        onClick={() => void handleAdvance()}
        disabled={advancing}
        accent={advancing ? 'default' : allClear ? 'green' : 'gold'}
        style={{ width: '100%', justifyContent: 'center', minHeight: '42px' }}
      >
        <Play size={14} />
        {advancing ? `Running ${phaseLabel(phase)}` : allClear ? advanceLabel : `Advance Anyway (${issueCount})`}
      </PixelButton>

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
