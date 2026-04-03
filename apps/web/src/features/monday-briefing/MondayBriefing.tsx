import { useMemo } from 'react';
import { calculateTrainingXP } from '@mfd/engine';
import { PixelPanel, PixelBadge, PixelProgressBar } from '@mfd/design-system/components';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectDynastyScore, selectFacilities, selectFatigueReport, selectNarrativeIntensity, selectPhase, selectPlayoffMomentum, selectWeek, selectYear, selectSchedule, selectOwnerState, selectLatestSummary, selectLatestGameDayPackage, selectActiveStoryArcs, selectTeams,
  selectUserPowerRanking, selectUserRecordWatch, selectUserMentoringPairs,
  selectOffFieldEvents, selectUpcomingRivalry, selectCoachingCarouselNews,
  selectConditionalPicks, selectHandshakes, selectLeagueNews, selectPlayoffPicture, selectTrainingAssignments, selectWaiverWirePlayers, selectWeather,
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

const facilityLabels: Record<string, string> = {
  training_complex: 'Training Complex',
  medical_center: 'Medical Center',
  film_room: 'Film Room',
  weight_room: 'Weight Room',
  recovery_suite: 'Recovery Suite',
};

function resultAccent(result?: string): 'default' | 'green' | 'red' {
  return result === 'win' ? 'green' : result === 'loss' ? 'red' : 'default';
}

export function MondayBriefing() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const phase = useGameStore(selectPhase);
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
  const leagueNews = useGameStore(selectLeagueNews);
  const trainingAssignments = useGameStore(selectTrainingAssignments);
  const playoffPicture = useGameStore(selectPlayoffPicture);
  const fatigueReport = useGameStore(selectFatigueReport);
  const facilities = useGameStore(selectFacilities);
  const playoffMomentum = useGameStore(selectPlayoffMomentum);
  const narrativeIntensity = useGameStore(selectNarrativeIntensity);
  const dynastyScore = useGameStore(selectDynastyScore);

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
        type: p.injury!.type,
        status: p.injury!.severity,
        severityTier: p.injury!.severityTier,
        weeks: p.injury!.gamesOut,
        reinjuryRisk: p.injury!.reinjuryRisk,
        onIR: p.injury!.onIR,
      })),
  [roster]);

  const fatigueWatch = useMemo(() =>
    fatigueReport
      .map((entry) => ({
        ...entry,
        player: roster.find((candidate) => candidate.id === entry.playerId),
      }))
      .filter((entry): entry is typeof entry & { player: NonNullable<typeof entry.player> } => Boolean(entry.player) && entry.status !== 'fresh')
      .slice(0, 4),
  [fatigueReport, roster]);

  const facilityStatus = useMemo(() =>
    [...facilities.facilities]
      .sort((a, b) => b.level - a.level || a.type.localeCompare(b.type))
      .slice(0, 5),
  [facilities]);

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
  const headlineItems = leagueNews.filter((item) => item.importance !== 'minor').slice(0, 3);
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
  const conferencePlayoffPicture = team?.conference === 'NFC' ? playoffPicture.nfc : playoffPicture.afc;

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
            <PixelBadge
              variant={narrativeIntensity.status === 'hot' ? 'red' : narrativeIntensity.status === 'warm' ? 'gold' : 'cyan'}
            >
              {`Narrative ${narrativeIntensity.status}`}
            </PixelBadge>
            <PixelBadge variant="green">{`Dynasty ${dynastyScore}`}</PixelBadge>
            {phase === 'playoffs' && playoffMomentum ? (
              <PixelBadge variant={playoffMomentum.momentum > 85 ? 'gold' : playoffMomentum.momentum > 70 ? 'cyan' : 'default'}>
                {playoffMomentum.narrativeTag ? playoffMomentum.narrativeTag.replaceAll('_', ' ') : 'playoff push'}
              </PixelBadge>
            ) : null}
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
        <PixelMetricCard
          label="Narrative Intensity"
          value={narrativeIntensity.status.toUpperCase()}
          accent={narrativeIntensity.status === 'hot' ? 'red' : narrativeIntensity.status === 'warm' ? 'gold' : 'cyan'}
          detail={`Current pulse ${Math.round(narrativeIntensity.current)}`}
        />
        <PixelMetricCard
          label="Dynasty Score"
          value={dynastyScore}
          accent={dynastyScore >= 25 ? 'gold' : dynastyScore >= 12 ? 'cyan' : 'green'}
          detail="Legacy index across titles, playoffs, awards, and records"
        />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="League Headlines" accent={headlineItems[0]?.importance === 'breaking' ? 'gold' : 'cyan'}>
          {headlineItems.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No breaking league stories are crowding the wire right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {headlineItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ ...mono, color: '#fff' }}>{item.headline}</div>
                    <PixelBadge variant={item.importance === 'breaking' ? 'gold' : 'cyan'}>
                      {item.importance}
                    </PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.5 }}>{item.body}</div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Training Report" accent={trainingLeaders.length > 0 ? 'green' : 'default'}>
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

        <PixelPanel title="Playoff Race" accent={week > 8 ? 'gold' : 'default'}>
          {week <= 8 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              The playoff picture firms up after Week 8. The race board will light up once the field separates.
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
                      {inj.type.replaceAll('_', ' ')} // {inj.severityTier.replaceAll('_', ' ')} // recovery {inj.weeks} week(s)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {inj.onIR ? <PixelBadge variant="red">IR</PixelBadge> : null}
                    <PixelBadge variant="red">{inj.status}</PixelBadge>
                  </div>
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
        <PixelPanel title="Fatigue Watch" accent={fatigueWatch.some((entry) => entry.status === 'exhausted') ? 'red' : fatigueWatch.length > 0 ? 'gold' : 'green'}>
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
                  <PixelBadge variant={entry.status === 'exhausted' ? 'red' : 'gold'}>
                    {entry.status}
                  </PixelBadge>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Facility Status" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ ...mono, color: '#fff' }}>Budget Remaining</div>
              <PixelBadge variant={facilities.budget >= 6 ? 'green' : facilities.budget >= 3 ? 'gold' : 'red'}>
                ${facilities.budget}
              </PixelBadge>
            </div>
            {facilityStatus.map((facility) => (
              <div key={facility.type} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ ...monoSm, color: '#fff' }}>{facilityLabels[facility.type] ?? facility.type}</div>
                  <div style={{ ...monoSm, color: '#999' }}>
                    {facility.type === 'training_complex' ? 'Player development boost' : facility.type === 'medical_center' ? 'Faster recovery cycle' : facility.type === 'film_room' ? 'Cleaner scouting reads' : facility.type === 'weight_room' ? 'Lower fatigue gain' : 'Lower injury exposure'}
                  </div>
                </div>
                <PixelBadge variant={facility.level === 3 ? 'gold' : facility.level === 2 ? 'cyan' : 'default'}>
                  L{facility.level}
                </PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Playoff Momentum" accent={phase === 'playoffs' && playoffMomentum ? 'gold' : 'default'}>
          {phase !== 'playoffs' || !playoffMomentum ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              Narrative momentum activates once the postseason bracket is live.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                  {playoffMomentum.momentum}
                </div>
                {playoffMomentum.narrativeTag ? (
                  <PixelBadge variant={playoffMomentum.momentum > 85 ? 'gold' : 'cyan'}>
                    {playoffMomentum.narrativeTag.replaceAll('_', ' ')}
                  </PixelBadge>
                ) : null}
              </div>
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                {playoffMomentum.winStreak > 0
                  ? `${playoffMomentum.winStreak}-game streak carries into this matchup.`
                  : 'No active streak edge entering the playoff round.'}
              </div>
              <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                {playoffMomentum.momentum > 85
                  ? 'The room is carrying a full postseason surge into kickoff.'
                  : playoffMomentum.momentum > 70
                    ? 'There is a measurable playoff bump behind the current run.'
                    : 'Narrative pressure is real, but the edge is modest right now.'}
              </div>
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
