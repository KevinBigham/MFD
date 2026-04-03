import { useState } from 'react';
import { calculateTrainingXP, getAchievementProgress, type Achievement, type DashboardWidget } from '@mfd/engine';
import {
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
  selectNarrativeIntensity,
  selectOwnerState,
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

const WIDGET_OPTIONS: Array<{ value: DashboardWidget; label: string; description: string }> = [
  { value: 'team_record', label: 'Team Record', description: 'Record, point differential, and room temperature.' },
  { value: 'next_game', label: 'Next Game', description: 'Upcoming opponent, broadcast, and matchup context.' },
  { value: 'injury_report', label: 'Injury Report', description: 'Current injuries and recovery windows.' },
  { value: 'fatigue_watch', label: 'Fatigue Watch', description: 'Workload alerts before kickoff.' },
  { value: 'cap_snapshot', label: 'Cap Snapshot', description: 'Cap room, payroll, and facility budget.' },
  { value: 'power_ranking', label: 'Power Ranking', description: 'League positioning and movement.' },
  { value: 'promise_tracker', label: 'Promise Tracker', description: 'Owner and player promises on the clock.' },
  { value: 'training_report', label: 'Training Report', description: 'Who is stacking the best weekly gains.' },
  { value: 'league_headlines', label: 'League Headlines', description: 'Breaking stories around the league.' },
  { value: 'record_watch', label: 'Record Watch', description: 'Players pacing above the book.' },
  { value: 'rivalry_watch', label: 'Rivalry Watch', description: 'Heat level for the next grudge match.' },
  { value: 'coaching_news', label: 'Coaching News', description: 'League staffing movement.' },
  { value: 'waiver_wire', label: 'Waiver Wire', description: 'Claimable talent and roster churn.' },
  { value: 'weather_forecast', label: 'Weather Forecast', description: 'Conditions for the next stage.' },
  { value: 'achievement_progress', label: 'Achievement Progress', description: 'Closest milestones toward Hall of Champions.' },
  { value: 'dynasty_score', label: 'Dynasty Score', description: 'Legacy index and title posture.' },
  { value: 'playoff_picture', label: 'Playoff Picture', description: 'Current conference bracket track.' },
  { value: 'stat_leaders', label: 'Stat Leaders', description: 'League leaders in core categories.' },
];

function resultAccent(result?: string): 'default' | 'green' | 'red' {
  return result === 'win' ? 'green' : result === 'loss' ? 'red' : 'default';
}

function rankingDeltaAccent(delta: number): 'default' | 'green' | 'red' {
  return delta > 0 ? 'green' : delta < 0 ? 'red' : 'default';
}

function rankingDeltaLabel(delta: number): string {
  if (delta > 0) return `UP ${delta}`;
  if (delta < 0) return `DOWN ${Math.abs(delta)}`;
  return 'EVEN';
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
  const {
    pinWidget,
    unpinWidget,
    saveLayout,
    switchLayout,
  } = useGameStore((state) => state.actions);

  const activeLayout = dashboardState.layouts.find((layout) => layout.id === dashboardState.activeLayoutId) ?? dashboardState.layouts[0];
  const pinnedWidgets = dashboardState.pinnedWidgets;

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draftName, setDraftName] = useState(activeLayout?.name ?? 'Command Center');
  const [draftColumns, setDraftColumns] = useState<2 | 3>(activeLayout?.columns ?? 3);
  const [draftWidgets, setDraftWidgets] = useState<DashboardWidget[]>(activeLayout?.widgets ?? []);

  const nextGame = teamSchedule.find((entry) => entry.week === week) ?? null;
  const opponent = nextGame?.opponentTeamId && teams ? teams[nextGame.opponentTeamId] : null;
  const opponentName = nextGame?.opponentName ?? 'BYE';
  const teamName = team ? `${team.city} ${team.name}` : 'No Team';
  const record = team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : '0-0';
  const latestResult = latestPackage?.result ?? latestSummary?.result;
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
              <div>
                <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>CURRENT MARK</div>
                <div style={{ ...display, fontSize: '28px', color: '#fff', lineHeight: 1 }}>{record}</div>
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
              No fresh injuries. The training room is quiet heading into the next broadcast.
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
              No breaking league stories are crowding the wire right now.
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
                  No achievement momentum yet. Milestones will surface as the dynasty deepens.
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
                ? `Current playoff momentum sits at ${playoffMomentum.momentum} with ${playoffMomentum.winStreak} straight wins in the profile.`
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
          </>
        )}
      />

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
          detail={currentWeeklyPrepPlan ? `${currentWeeklyPrepPlan.offensiveFocus} / ${currentWeeklyPrepPlan.defensiveFocus}` : 'Open Game Plan to lock the prep board'}
        />
        <PixelMetricCard
          label="Film Room"
          value={latestFilmRoomReport?.grade ?? '--'}
          accent={latestFilmRoomReport?.grade === 'A' || latestFilmRoomReport?.grade === 'B' ? 'green' : latestFilmRoomReport?.grade === 'C' ? 'gold' : 'red'}
          detail={latestFilmRoomReport?.headline ?? 'No postgame coaching review yet'}
        />
        <PixelMetricCard
          label="Sideline Heat"
          value={coachingMarket.hotSeat ? 'HOT' : 'STABLE'}
          accent={coachingMarket.hotSeat ? 'red' : 'green'}
          detail={coachingMarket.hotSeat ? 'Owner approval and patience are both strained' : 'Staff stability is intact'}
        />
      </div>

      <PixelPanel title="Coaching Loop" accent="cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Move straight from the Monday board into weekly prep, coaching decisions, or the latest film review.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton
              accent={currentWeeklyPrepPlan ? 'green' : 'gold'}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/game-plan');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
            >
              Open Game Plan
            </PixelButton>
            <PixelButton
              accent={latestFilmRoomReport ? 'cyan' : 'default'}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/film-room');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
            >
              Open Film Room
            </PixelButton>
            <PixelButton
              accent={coachingMarket.hotSeat ? 'red' : 'gold'}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/coaching');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
            >
              Open Coaching
            </PixelButton>
          </div>
        </div>
      </PixelPanel>

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

      <PixelPanel title="Narrative Pulse" accent="gold">
        <div style={autoGrid(320)}>
          <div>
            <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>STORY ARC</div>
            <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
              {(activeArcs[0]?.title ?? 'No active arc').toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: '#999', marginTop: '8px', lineHeight: 1.6 }}>
              {activeArcs[0]?.summary ?? 'Your next big storyline will form after the next meaningful result.'}
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
