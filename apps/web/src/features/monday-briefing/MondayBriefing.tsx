import { useMemo } from 'react';
import { PixelPanel, PixelBadge, PixelProgressBar } from '@mfd/design-system/components';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectWeek, selectYear, selectSchedule, selectOwnerState, selectLatestSummary, selectLatestGameDayPackage, selectActiveStoryArcs, selectTeams,
  selectUserPowerRanking, selectUserRecordWatch, selectUserMentoringPairs,
  selectOffFieldEvents, selectUpcomingRivalry, selectCoachingCarouselNews,
  selectConditionalPicks, selectHandshakes, selectWaiverWirePlayers, selectWeather,
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
  const userPowerRanking = useGameStore(selectUserPowerRanking);
  const recordWatch = useGameStore(selectUserRecordWatch);
  const mentoringPairs = useGameStore(selectUserMentoringPairs);
  const offFieldEvents = useGameStore(selectOffFieldEvents);
  const upcomingRivalry = useGameStore(selectUpcomingRivalry);
  const coachingNews = useGameStore(selectCoachingCarouselNews);
  const handshakes = useGameStore(selectHandshakes);
  const waiverPlayers = useGameStore(selectWaiverWirePlayers);
  const weather = useGameStore(selectWeather);
  const conditionalPicks = useGameStore(selectConditionalPicks);

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
  const powerRankAccent = userPowerRanking
    ? userPowerRanking.rank <= 5 ? 'gold' : userPowerRanking.rank <= 10 ? 'cyan' : 'red'
    : 'default';
  const activePromises = handshakes.filter((handshake) => handshake.teamId === team?.id && handshake.status === 'active').slice(0, 3);
  const userConditionalPicks = conditionalPicks.filter((pick) => pick.toTeamId === team?.id).slice(0, 2);

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

      <div style={autoGrid(280)}>
        <PixelPanel title="Power Rankings" accent={powerRankAccent}>
          {!userPowerRanking ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              Rankings publish after each regular-season advance. The first table will drop once the season starts moving.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>LEAGUE SLOT</div>
                  <div style={{ ...display, fontSize: '28px', color: '#fff', lineHeight: 1 }}>
                    #{userPowerRanking.rank}
                  </div>
                </div>
                <PixelBadge variant={rankingDeltaAccent(userPowerRanking.delta)}>
                  {rankingDeltaLabel(userPowerRanking.delta)}
                </PixelBadge>
              </div>
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                {userPowerRanking.blurb}
              </div>
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Record Watch" accent={recordWatch.length > 0 ? 'gold' : 'default'}>
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

        <PixelPanel title="Mentoring Report" accent={mentoringPairs.length > 0 ? 'green' : 'default'}>
          {mentoringPairs.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No active mentoring chains are locked in yet. Veteran guidance will appear once the offseason pairs are formed.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mentoringPairs.map((pair) => (
                <div key={`${pair.mentorId}-${pair.menteeId}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ ...mono, color: '#fff' }}>
                      {pair.mentorName}{' -> '}{pair.menteeName}
                    </div>
                    <PixelBadge variant="green">{`+${pair.bonus} OVR`}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: '#999' }}>
                    {pair.positionGroup} room connection for {pair.year}.
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
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

      <div style={autoGrid(320)}>
        <PixelPanel title="Promise Tracker" accent={activePromises.length > 0 ? 'gold' : 'default'}>
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

        <PixelPanel title="Waiver Wire" accent={waiverPlayers.length > 0 ? 'cyan' : 'default'}>
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

        <PixelPanel title="Weather Forecast" accent={weather === 'snow' || weather === 'wind' ? 'red' : weather === 'rain' ? 'gold' : 'cyan'}>
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

        <PixelPanel title="Locker Room Pulse" accent={offFieldEvents.length > 0 ? 'gold' : 'default'}>
          {offFieldEvents.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              The room is quiet. No extra headlines have broken between kickoff windows.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {offFieldEvents.slice(-2).reverse().map((event) => (
                <div key={event.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ ...mono, color: '#fff' }}>{event.headline}</div>
                    <PixelBadge variant={event.category === 'media' ? 'cyan' : event.category === 'locker_room' ? 'gold' : 'green'}>
                      {event.category.replace('_', ' ')}
                    </PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.5 }}>{event.description}</div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Rivalry Watch" accent={upcomingRivalry ? 'red' : 'default'}>
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

        <PixelPanel title="Coaching News" accent={coachingNews.length > 0 ? 'cyan' : 'default'}>
          {coachingNews.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No sideline shakeups this week. League staff boards are holding steady.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {coachingNews.slice(0, 3).map((event) => (
                <div key={event.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ ...mono, color: '#fff' }}>{event.description}</div>
                    <PixelBadge variant={event.type === 'coach_fired' ? 'red' : 'cyan'}>
                      {event.type === 'coach_fired' ? 'FIRED' : 'HIRED'}
                    </PixelBadge>
                  </div>
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

function rankingDeltaAccent(delta: number): 'default' | 'green' | 'red' {
  return delta > 0 ? 'green' : delta < 0 ? 'red' : 'default';
}

function rankingDeltaLabel(delta: number): string {
  if (delta > 0) return `UP ${delta}`;
  if (delta < 0) return `DOWN ${Math.abs(delta)}`;
  return 'EVEN';
}
