import type { Hook } from './hooks-engine';
import type {
  GameDayPackage,
  GameDayTopPerformer,
  GameDayTurningPoint,
  GameResult,
  NarrativeHook,
  Player,
  StoryArc,
  Team,
  WeeklySummary,
} from '../types';

interface BuildGameDayPackageParams {
  team: Team;
  opponent: Team | null;
  result: GameResult;
  summary: WeeklySummary;
  hooks: Array<Hook | NarrativeHook>;
  activeArcs: StoryArc[];
}

function findPlayer(team: Team, playerId: string | null): Player | null {
  return playerId ? team.roster.find((player) => player.id === playerId) ?? null : null;
}

function formatPerformerLine(player: Player, teamStats: GameResult['stats'][string], opponentStats: GameResult['stats'][string]): string {
  switch (player.pos) {
    case 'QB':
      return `${teamStats.passingYards} pass yds, ${Math.max(1, Math.round(teamStats.passingYards / 110))} TD`;
    case 'RB':
      return `${Math.round(teamStats.rushingYards * 0.58)} rush yds, ${Math.max(1, Math.round(teamStats.rushingYards / 80))} explosive runs`;
    case 'WR':
    case 'TE':
      return `${Math.round(teamStats.passingYards * 0.38)} rec yds, ${Math.max(1, Math.round(teamStats.thirdDownConversions / 2))} chain-moving catches`;
    case 'DL':
    case 'LB':
      return `${Math.max(1, teamStats.sacks)} sacks, ${Math.max(2, teamStats.turnovers)} pressures created`;
    default:
      return `${Math.max(1, opponentStats.turnovers - 1)} takeaways, tone-setting coverage`;
  }
}

function buildTopPerformers(team: Team, result: GameResult): GameDayTopPerformer[] {
  const teamStats = result.stats[team.id];
  const opponentId = result.homeTeamId === team.id ? result.awayTeamId : result.homeTeamId;
  const opponentStats = result.stats[opponentId];
  if (!teamStats || !opponentStats) return [];

  const mvp = findPlayer(team, result.mvpPlayerId) ?? team.roster.find((player) => player.pos === 'QB') ?? null;
  const skill = team.roster.find((player) => player.pos === 'RB' || player.pos === 'WR' || player.pos === 'TE') ?? null;
  const defender = team.roster.find((player) => player.pos === 'DL' || player.pos === 'LB' || player.pos === 'CB' || player.pos === 'S') ?? null;
  const group = [mvp, skill, defender].filter((player, index, arr): player is Player =>
    !!player && arr.findIndex((candidate) => candidate?.id === player.id) === index);

  return group.map((player) => ({
    playerId: player.id,
    label: `${player.name} (${player.pos})`,
    statLine: formatPerformerLine(player, teamStats, opponentStats),
  }));
}

function buildTurningPoints(team: Team, result: GameResult, injuries: WeeklySummary['injuries']): GameDayTurningPoint[] {
  const teamStats = result.stats[team.id];
  const opponentId = result.homeTeamId === team.id ? result.awayTeamId : result.homeTeamId;
  const opponentStats = result.stats[opponentId];
  if (!teamStats || !opponentStats) return [];

  const points: GameDayTurningPoint[] = [];
  const turnoverMargin = opponentStats.turnovers - teamStats.turnovers;

  points.push({
    label: turnoverMargin >= 0 ? 'Turnover edge' : 'Turnover drag',
    detail: turnoverMargin >= 0
      ? `Finished +${turnoverMargin} in takeaways and protected the ball well enough to stay ahead.`
      : `Finished ${turnoverMargin} in turnover margin and handed away extra possessions.`,
    impact: turnoverMargin >= 0 ? 'positive' : 'negative',
  });
  points.push({
    label: 'Third-down rhythm',
    detail: `${teamStats.thirdDownConversions}/${teamStats.thirdDownAttempts} on third down versus ${opponentStats.thirdDownConversions}/${opponentStats.thirdDownAttempts} for the opponent.`,
    impact: teamStats.thirdDownConversions >= opponentStats.thirdDownConversions ? 'positive' : 'negative',
  });
  points.push({
    label: 'Pocket pressure',
    detail: `${teamStats.sacks} sacks generated while allowing ${opponentStats.sacks}. Pressure dictated the tempo in key spots.`,
    impact: teamStats.sacks >= opponentStats.sacks ? 'positive' : 'negative',
  });
  if (injuries.length > 0) {
    points.push({
      label: 'Injury toll',
      detail: `${injuries.length} rotation piece${injuries.length > 1 ? 's' : ''} left the day on the report.`,
      impact: 'neutral',
    });
  }

  return points.slice(0, 4);
}

function hookLabel(hook: Hook | NarrativeHook): string {
  return 'cat' in hook ? hook.cat.toUpperCase() : hook.type.toUpperCase();
}

function hookText(hook: Hook | NarrativeHook): string {
  return 'cat' in hook ? hook.text : hook.description;
}

function buildStakes(team: Team, summary: WeeklySummary, hooks: Array<Hook | NarrativeHook>, activeArcs: StoryArc[]) {
  const stakes = [];
  stakes.push({
    label: summary.phase === 'playoffs' ? 'Playoff leverage' : 'Season pressure',
    detail: summary.phase === 'playoffs'
      ? 'Every snap now shapes whether the season survives.'
      : `Current record ${summary.record} keeps the weekly margin for error thin.`,
  });
  if (team.ownerMood < 45 || summary.ownerDelta < 0) {
    stakes.push({
      label: 'Owner patience',
      detail: `Approval sits at ${team.ownerMood}. Another stumble would intensify the front-office heat.`,
    });
  }
  const arc = activeArcs[0];
  if (arc) {
    stakes.push({ label: arc.title, detail: arc.summary });
  } else if (hooks[0]) {
    stakes.push({ label: hookLabel(hooks[0]), detail: hookText(hooks[0]) });
  }
  return stakes.slice(0, 3);
}

function buildCeremony(team: Team, summary: WeeklySummary, activeArcs: StoryArc[]) {
  if (summary.phase === 'playoffs' && summary.result === 'win') {
    return {
      title: 'Postgame podium',
      subtitle: `${team.city} kept its season alive and the stadium stayed loud long after the clock hit zero.`,
    };
  }
  if (team.streak >= 3) {
    return {
      title: 'Locker room pulse',
      subtitle: `${team.streak}-game momentum has the room believing something bigger is building.`,
    };
  }
  const arc = activeArcs.find((entry) => entry.template === 'breakout_player');
  return arc ? { title: arc.title, subtitle: arc.summary } : null;
}

function buildAutopsy(team: Team, summary: WeeklySummary, result: GameResult) {
  const teamStats = result.stats[team.id];
  const opponentId = result.homeTeamId === team.id ? result.awayTeamId : result.homeTeamId;
  const opponentStats = result.stats[opponentId];
  const diagnosis = !teamStats || !opponentStats
    ? 'The tape points to a flat, incomplete performance.'
    : teamStats.passingYards >= opponentStats.passingYards
      ? 'Controlled passing rhythm kept the offense ahead of schedule.'
      : 'The offense never fully solved down-to-down efficiency.';
  const leverage = !teamStats || !opponentStats
    ? 'Field position and sequencing will decide the rematch.'
    : opponentStats.turnovers > teamStats.turnovers
      ? 'Turnover margin plus situational stops tilted the leverage battle.'
      : 'Third-down execution and pocket integrity were the leverage points.';
  const nextFocus = [
    team.ownerMood < 40 ? 'Stabilize owner confidence with a cleaner follow-up week' : 'Carry the clean situational football forward',
    summary.injuries.length > 0 ? 'Protect the injured depth chart before the next kickoff' : 'Protect the current health advantage',
    teamStats && opponentStats && teamStats.sacks < opponentStats.sacks ? 'Firm up pass protection' : 'Keep the pass rush disruptive',
  ];

  return { diagnosis, leverage, nextFocus };
}

export function buildGameDayPackage(params: BuildGameDayPackageParams): GameDayPackage {
  const { team, opponent, result, summary, hooks, activeArcs } = params;
  const ceremony = buildCeremony(team, summary, activeArcs);
  const autopsy = buildAutopsy(team, summary, result);

  return {
    id: `gameday-${summary.year}-${summary.week}-${team.id}`,
    year: summary.year,
    week: summary.week,
    phase: summary.phase,
    teamId: team.id,
    opponentTeamId: opponent?.id ?? null,
    headline: summary.headline,
    result: summary.result,
    finalScore: `${summary.teamScore ?? 0}-${summary.opponentScore ?? 0}`,
    stakes: buildStakes(team, summary, hooks, activeArcs),
    turningPoints: buildTurningPoints(team, result, summary.injuries),
    topPerformers: buildTopPerformers(team, result),
    injuryNotes: summary.injuries.map((injury) => `${injury.playerName}: ${injury.type} (${injury.severity}, ${injury.gamesOut} games)`),
    ceremony,
    pressConference: {
      theme: summary.result === 'win' ? 'Statement win' : summary.result === 'loss' ? 'Hard truth' : 'Measured response',
      opener: summary.result === 'win'
        ? 'We played clean situational football and stayed aggressive without losing control.'
        : 'The margins got away from us, and the tape is going to demand cleaner answers.',
      quotes: [
        `The ${summary.result === 'win' ? 'locker room feels the momentum' : 'room knows the standard was missed'}.`,
        autopsy.leverage,
        ceremony ? ceremony.subtitle : 'Next week starts with sharper detail and better finishing.',
      ],
    },
    autopsy,
  };
}
