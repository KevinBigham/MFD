import { useMemo } from 'react';
import { PixelPanel, PixelBadge, PixelProgressBar } from '@mfd/design-system/components';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectWeek, selectYear, selectSchedule, selectOwnerState, selectLatestSummary, selectLatestGameDayPackage, selectActiveStoryArcs, selectTeams,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  mono,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

function resultAccent(result?: string): 'default' | 'green' | 'red' {
  return result === 'win' ? 'green' : result === 'loss' ? 'red' : 'default';
}

export function MondayBriefing() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const schedule = useGameStore(selectSchedule);
  const ownerState = useGameStore(selectOwnerState);
  const latestSummary = useGameStore(selectLatestSummary);
  const latestPackage = useGameStore(selectLatestGameDayPackage);
  const activeArcs = useGameStore(selectActiveStoryArcs);

  const teamName = team ? `${team.city} ${team.name}` : 'No Team';
  const record = team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : '0-0';

  const nextGame = useMemo(() => {
    if (!team || !schedule.length) return null;
    const weekSchedule = schedule.find((w) => w.week === week);
    if (!weekSchedule) return null;
    const game = weekSchedule.games.find(
      (g) => g.homeTeamId === team.id || g.awayTeamId === team.id,
    );
    return game ?? null;
  }, [team, schedule, week]);

  const teams = useGameStore(selectTeams);
  const opponentId = nextGame
    ? (nextGame.homeTeamId === team?.id ? nextGame.awayTeamId : nextGame.homeTeamId)
    : null;
  const opponent = opponentId && teams ? teams[opponentId] : null;
  const opponentName = opponent ? `${opponent.city} ${opponent.name}` : 'Bye Week';

  const injuries = useMemo(() =>
    roster
      .filter((p) => p.injury)
      .map((p) => ({
        player: `${p.firstName.charAt(0)}. ${p.lastName}`,
        position: p.pos,
        status: p.injury!.severity,
        weeks: p.injury!.gamesOut,
      })),
  [roster]);

  const devWatchlist = useMemo(() =>
    roster
      .filter((p) => p.pot - p.ovr >= 5 && (p.devTrait === 'star' || p.devTrait === 'superstar' || p.devTrait === 'x-factor'))
      .sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr))
      .slice(0, 3)
      .map((p) => ({
        player: `${p.firstName.charAt(0)}. ${p.lastName}`,
        position: p.pos,
        trait: p.devTrait === 'x-factor' ? 'X-Factor' : p.devTrait === 'superstar' ? 'Superstar' : 'Star',
        progress: Math.round((p.ovr / p.pot) * 100),
      })),
  [roster]);

  const capSpace = team ? `$${Math.round(team.capSpace * 10) / 10}M` : '$0M';
  const ownerMood = ownerState ? ownerState.approval : 0;
  const ownerLabel = ownerMood >= 70 ? 'Pleased' : ownerMood >= 50 ? 'Neutral' : ownerMood >= 30 ? 'Unhappy' : 'Furious';
  const leadArc = activeArcs[0] ?? null;
  const latestResult = latestPackage?.result ?? latestSummary?.result;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Monday Briefing"
        subtitle={`${teamName} // Season ${year}, Week ${week}`}
        badges={(
          <>
            <PixelBadge variant="gold">{record}</PixelBadge>
            <PixelBadge variant="cyan">WK {String(week).padStart(2, '0')}</PixelBadge>
            <PixelBadge variant="default">YR {year}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard
          label="Latest Result"
          value={latestResult ? latestResult.toUpperCase() : 'PENDING'}
          accent={resultAccent(latestResult)}
          detail={latestPackage?.headline ?? latestSummary?.headline ?? `Week ${week} loading...`}
          badge={latestResult ? <PixelBadge variant={resultAccent(latestResult)}>Live</PixelBadge> : null}
        />
        <PixelMetricCard
          label="Point Diff"
          value={team ? team.seasonStats.pointDifferential : 0}
          accent={team && team.seasonStats.pointDifferential >= 0 ? 'green' : 'red'}
          detail="Season scoring margin"
        />
        <PixelMetricCard
          label="Owner Mood"
          value={ownerLabel}
          accent={ownerMood >= 60 ? 'green' : ownerMood >= 40 ? 'cyan' : 'red'}
          detail={`Approval ${ownerMood}`}
        />
        <PixelMetricCard
          label="Cap Space"
          value={capSpace}
          accent={team && team.capSpace >= 0 ? 'cyan' : 'red'}
          detail={injuries.length > 0 ? `${injuries.length} injury alerts active` : 'Healthy enough to push'}
        />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Injury Report" accent={injuries.length > 0 ? 'red' : 'green'}>
          {injuries.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No fresh injuries. Training room is quiet heading into the next broadcast.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {injuries.map((inj) => (
                <div key={inj.player} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>
                      {inj.player} <span style={{ color: '#777' }}>{inj.position}</span>
                    </div>
                    <div style={{ ...monoSm, color: '#888' }}>
                      Recovery timeline: {inj.weeks} week(s)
                    </div>
                  </div>
                  <PixelBadge variant="red">{inj.status}</PixelBadge>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Dev Watch" accent="cyan">
          {devWatchlist.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No breakout candidates are flashing beyond expectation right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {devWatchlist.map((dev) => (
                <div key={dev.player} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>
                        {dev.player.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: '#888' }}>
                        {dev.position} // {dev.trait}
                      </div>
                    </div>
                    <PixelBadge variant="cyan">{dev.progress}%</PixelBadge>
                  </div>
                  <PixelProgressBar
                    value={dev.progress}
                    accent={dev.progress >= 70 ? 'green' : 'cyan'}
                    label="Development Track"
                    valueLabel={`${dev.progress}%`}
                  />
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title="Narrative Pulse" accent="gold">
        <div style={autoGrid(320)}>
          <div>
            <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>STORY ARC</div>
            <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
              {(leadArc?.title ?? 'No active arc').toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: '#999', marginTop: '8px', lineHeight: 1.6 }}>
              {leadArc?.summary ?? 'Your next big storyline will form after the next meaningful result.'}
            </div>
          </div>
          <div>
            <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>POSTGAME CINEMA</div>
            <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
              {(latestPackage?.headline ?? latestSummary?.headline ?? 'No package yet').toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: '#999', marginTop: '8px', lineHeight: 1.6 }}>
              {latestPackage?.autopsy.diagnosis ?? 'The first postgame package will appear once the season begins.'}
            </div>
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Next Broadcast" accent="cyan">
        <div style={autoGrid(260)}>
          <div>
            <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>LAST RESULT</div>
            <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
              {(latestPackage?.headline ?? latestSummary?.headline ?? 'No games simulated yet').toUpperCase()}
            </div>
          </div>
          <div>
            <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>UPCOMING</div>
            <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
              {opponentName.toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: '#999', marginTop: '8px' }}>
              Owner approval {ownerMood}. Cap room {capSpace}. Keep momentum before kickoff.
            </div>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
