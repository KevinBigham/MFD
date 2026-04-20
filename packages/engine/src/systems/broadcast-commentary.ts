import {
  getPACall,
  getTeamContent,
  getTeamFanCulture,
  getTeamRivalryContent,
} from '../content-loader';
import type { GameResult, GameState, Team } from '../types';
import type { RelationshipEdge } from './relationship-graph';
import {
  getRevengeFlavorForMatchup,
  hashMatchupSeed,
  pickRevengeLine,
} from './revenge-games';

export type BroadcastCommentaryGame = Pick<
  GameState,
  'year' | 'week' | 'teams' | 'players' | 'franchiseHistory' | 'relationships' | 'playerArchive'
>;

export interface BroadcastCommentaryInput {
  homeTeamId: string;
  awayTeamId: string;
  result?: Pick<GameResult, 'homeScore' | 'awayScore'> | null;
  seed?: number;
}

export interface BroadcastCommentaryOutput {
  pregame: string[];
  inGame: string[];
  recap: string[];
}

type CommentaryStage = keyof BroadcastCommentaryOutput;

function matchupSeed(game: BroadcastCommentaryGame, input: BroadcastCommentaryInput): number {
  return input.seed ?? hashMatchupSeed(`${game.year}:${game.week}:${input.homeTeamId}:${input.awayTeamId}`);
}

function seededUnit(seed: number, category: string): number {
  return (hashMatchupSeed(`${seed}:${category}`) % 10_000) / 10_000;
}

function pickTemplate(pool: readonly string[], seed: number, category: string): string | null {
  if (pool.length === 0) return null;
  const index = hashMatchupSeed(`${seed}:${category}`) % pool.length;
  return pool[index] ?? null;
}

function labelFor(team: Team | null): string {
  return team ? `${team.city} ${team.name}` : 'Unknown Team';
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function titleCount(game: BroadcastCommentaryGame, teamId: string): number {
  return game.franchiseHistory.filter((entry) => entry.teamId === teamId && entry.playoffFinish === 'champion').length;
}

function latestHistory(game: BroadcastCommentaryGame, teamId: string) {
  return [...game.franchiseHistory]
    .filter((entry) => entry.teamId === teamId)
    .sort((left, right) => right.year - left.year)[0] ?? null;
}

function formatFinish(finish: string): string {
  return finish.replaceAll('_', ' ');
}

function buildEntityLabels(homeTeam: Team, awayTeam: Team): Map<string, string> {
  const labels = new Map<string, string>();
  for (const player of [...homeTeam.roster, ...awayTeam.roster]) {
    labels.set(player.id, player.name);
  }
  for (const staffer of [
    homeTeam.staff.hc,
    homeTeam.staff.oc,
    homeTeam.staff.dc,
    awayTeam.staff.hc,
    awayTeam.staff.oc,
    awayTeam.staff.dc,
  ]) {
    if (staffer?.id) {
      labels.set(staffer.id, staffer.name);
    }
  }
  return labels;
}

function activeEntityIds(team: Team): Set<string> {
  const ids = new Set(team.roster.map((player) => player.id));
  for (const staffer of [team.staff.hc, team.staff.oc, team.staff.dc]) {
    if (staffer?.id) ids.add(staffer.id);
  }
  return ids;
}

function strongestCrossTeamRelationship(
  relationships: readonly RelationshipEdge[],
  homeTeam: Team,
  awayTeam: Team,
): RelationshipEdge | null {
  const homeIds = activeEntityIds(homeTeam);
  const awayIds = activeEntityIds(awayTeam);
  return [...relationships]
    .filter((edge) => {
      const homeToAway = homeIds.has(edge.fromId) && awayIds.has(edge.toId);
      const awayToHome = awayIds.has(edge.fromId) && homeIds.has(edge.toId);
      return homeToAway || awayToHome;
    })
    .sort((left, right) =>
      right.strength - left.strength
      || right.year - left.year
      || left.id.localeCompare(right.id))[0] ?? null;
}

function relationshipLine(
  edge: RelationshipEdge | null,
  labels: Map<string, string>,
  stage: CommentaryStage,
): string | null {
  if (!edge) return null;
  const fromName = labels.get(edge.fromId) ?? edge.fromId;
  const toName = labels.get(edge.toId) ?? edge.toId;
  const note = edge.note ? ` ${edge.note}.` : '';

  if (edge.type === 'family') {
    if (stage === 'pregame') return `There is family on both sidelines tonight: ${fromName} and ${toName}.${note}`;
    if (stage === 'inGame') return `That family thread never disappears in-game: ${fromName} and ${toName} know exactly who is across from them.${note}`;
    return `The family subplot traveled all night with ${fromName} and ${toName}.${note}`;
  }
  if (edge.type === 'mentor' || edge.type === 'coach_tree') {
    if (stage === 'pregame') return `You can trace a teaching line through this matchup: ${fromName} and ${toName} go back to ${edge.year}.${note}`;
    if (stage === 'inGame') return `That old mentor line is still part of the broadcast: ${fromName} and ${toName} share history from ${edge.year}.${note}`;
    return `The sideline story still carries that old coaching thread between ${fromName} and ${toName}.${note}`;
  }
  if (edge.type === 'teammate') {
    if (stage === 'pregame') return `${fromName} and ${toName} used to share a locker room. Tonight they meet on opposite sidelines.`;
    if (stage === 'inGame') return `Former teammates ${fromName} and ${toName} keep showing up in the same shots tonight.`;
    return `Former teammates ${fromName} and ${toName} added another chapter to a familiar matchup.`;
  }
  if (stage === 'pregame') return `${fromName} and ${toName} have been on a collision course since ${edge.year}.${note}`;
  if (stage === 'inGame') return `That rivalry edge is still live between ${fromName} and ${toName}.${note}`;
  return `${fromName} and ${toName} kept that rivalry thread burning right through the finish.${note}`;
}

function rivalryLine(homeTeam: Team, awayTeam: Team, seed: number): string | null {
  const rivalry = getTeamRivalryContent(homeTeam.id, awayTeam.id) ?? getTeamRivalryContent(awayTeam.id, homeTeam.id);
  if (!rivalry) return null;
  return pickTemplate([
    `${rivalry.name} is back on the calendar. ${rivalry.narrative}`,
    `Call this one ${rivalry.name}: ${rivalry.narrative}`,
  ], seed, 'pregame.rivalry');
}

function stadiumLine(homeTeam: Team): string | null {
  const teamContent = getTeamContent(homeTeam.id);
  if (!teamContent) return null;
  return `Tonight's backdrop is ${teamContent.stadium.name}: ${teamContent.stadium.tradition}`;
}

function historyLine(game: BroadcastCommentaryGame, homeTeam: Team, awayTeam: Team, seed: number): string | null {
  const homeTitles = titleCount(game, homeTeam.id);
  const awayTitles = titleCount(game, awayTeam.id);
  if (homeTitles > 0 || awayTitles > 0) {
    return pickTemplate([
      `${labelFor(homeTeam)} bring ${homeTitles} ${pluralize(homeTitles, 'title')} into tonight, ${labelFor(awayTeam)} have ${awayTitles}.`,
      `The history board reads ${homeTitles}-${awayTitles} in championships between ${labelFor(homeTeam)} and ${labelFor(awayTeam)}.`,
    ], seed, 'pregame.history.titles');
  }

  const homeRecent = latestHistory(game, homeTeam.id);
  const awayRecent = latestHistory(game, awayTeam.id);
  if (!homeRecent && !awayRecent) return null;
  return `${labelFor(homeTeam)} were ${formatFinish(homeRecent?.playoffFinish ?? 'off the board')} last year, ${labelFor(awayTeam)} were ${formatFinish(awayRecent?.playoffFinish ?? 'off the board')}.`;
}

function revengeLine(game: BroadcastCommentaryGame, homeTeam: Team, awayTeam: Team, seed: number, stage: CommentaryStage): string | null {
  const flavor = getRevengeFlavorForMatchup(
    game,
    { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id },
    game.week,
  );
  if (!flavor) return null;

  const formerTeam = game.teams[flavor.headline.formerTeamId] ?? null;
  const currentTeam = game.teams[flavor.headline.currentTeamId] ?? null;
  if (!formerTeam || !currentTeam) return null;

  const line = pickRevengeLine([
    `${flavor.headline.subjectName} is back against ${labelFor(formerTeam)} ${flavor.headline.yearsSinceDeparture} ${pluralize(flavor.headline.yearsSinceDeparture, 'year')} after leaving.`,
    `There is the reunion angle: ${flavor.headline.subjectName} now lines up for ${labelFor(currentTeam)} against the club he used to call home.`,
    `Keep the camera on ${flavor.headline.subjectName}; few subplots carry more edge than a return trip against ${labelFor(formerTeam)}.`,
  ], `${seed}:${flavor.matchupKey}`, `${stage}.revenge`);

  if (!line) return null;
  if (stage === 'pregame') return line;
  if (stage === 'inGame') return `The reunion thread is still part of the call tonight: ${line}`;
  return `That reunion story landed at the horn too: ${line}`;
}

function inGamePALine(homeTeam: Team, awayTeam: Team, seed: number): string | null {
  const leadPlayer = homeTeam.roster[0] ?? null;
  return `PA flavor: ${getPACall(
    'first_down',
    () => seededUnit(seed, 'ingame.pa'),
    {
      teamAbbr: homeTeam.id,
      teamName: homeTeam.name,
      playerName: leadPlayer?.name ?? homeTeam.name,
      yards: '12',
      position: leadPlayer?.pos ?? 'QB',
      stat: String(leadPlayer?.jerseyNumber ?? 1),
      opponentName: awayTeam.name,
    },
  )}`;
}

function fanCultureLine(homeTeam: Team): string | null {
  const fanCulture = getTeamFanCulture(homeTeam.id);
  if (!fanCulture) return null;
  return `The ${fanCulture.nickname} bring their own soundtrack: ${fanCulture.description}`;
}

function recapLine(
  game: BroadcastCommentaryGame,
  homeTeam: Team,
  awayTeam: Team,
  seed: number,
  result: Pick<GameResult, 'homeScore' | 'awayScore'> | null | undefined,
): string | null {
  if (!result) return null;
  if (result.homeScore === result.awayScore) {
    return `${labelFor(homeTeam)} and ${labelFor(awayTeam)} play it dead even at ${result.homeScore}-${result.awayScore}.`;
  }

  const winner = result.homeScore > result.awayScore ? homeTeam : awayTeam;
  const loser = winner.id === homeTeam.id ? awayTeam : homeTeam;
  const winnerScore = winner.id === homeTeam.id ? result.homeScore : result.awayScore;
  const loserScore = winner.id === homeTeam.id ? result.awayScore : result.homeScore;
  const score = `${winnerScore}-${loserScore}`;
  const rivalry = getTeamRivalryContent(homeTeam.id, awayTeam.id) ?? getTeamRivalryContent(awayTeam.id, homeTeam.id);
  const winnerTitles = titleCount(game, winner.id);

  if (rivalry) {
    return `${rivalry.name} gets another chapter, and ${labelFor(winner)} take this one ${score}.`;
  }

  return pickTemplate([
    `${labelFor(winner)} close it out ${score} over ${labelFor(loser)}.`,
    winnerTitles > 0
      ? `${labelFor(winner)} leave with the ${score} final, and that franchise ledger already reads ${winnerTitles} ${pluralize(winnerTitles, 'title')}.`
      : `${labelFor(winner)} walk out with the ${score} finish against ${labelFor(loser)}.`,
  ], seed, 'recap.result');
}

function dedupe(lines: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

export function buildBroadcastCommentary(
  game: BroadcastCommentaryGame,
  input: BroadcastCommentaryInput,
): BroadcastCommentaryOutput {
  const homeTeam = game.teams[input.homeTeamId] ?? null;
  const awayTeam = game.teams[input.awayTeamId] ?? null;
  if (!homeTeam || !awayTeam) {
    return { pregame: [], inGame: [], recap: [] };
  }

  const seed = matchupSeed(game, input);
  const relationship = strongestCrossTeamRelationship(game.relationships ?? [], homeTeam, awayTeam);
  const labels = buildEntityLabels(homeTeam, awayTeam);

  return {
    pregame: dedupe([
      rivalryLine(homeTeam, awayTeam, seed),
      stadiumLine(homeTeam),
      historyLine(game, homeTeam, awayTeam, seed),
      revengeLine(game, homeTeam, awayTeam, seed, 'pregame'),
      relationshipLine(relationship, labels, 'pregame'),
    ]),
    inGame: dedupe([
      inGamePALine(homeTeam, awayTeam, seed),
      fanCultureLine(homeTeam),
      relationshipLine(relationship, labels, 'inGame'),
      revengeLine(game, homeTeam, awayTeam, seed, 'inGame'),
    ]),
    recap: dedupe([
      recapLine(game, homeTeam, awayTeam, seed, input.result),
      revengeLine(game, homeTeam, awayTeam, seed, 'recap'),
      relationshipLine(relationship, labels, 'recap'),
    ]),
  };
}
