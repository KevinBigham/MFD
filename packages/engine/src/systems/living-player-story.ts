import type {
  AwardResult,
  GameCapsule,
  GameState,
  MentoringPair,
  Player,
} from '../types';
import type { StorylineThread } from '../storyline-threads/types';

export type LivingPlayerStoryStage = 'mentored' | 'breakout' | 'legacy';
export type LivingPlayerStoryStatus = 'active' | 'archived';
export type LivingPlayerStorySource = 'mentorship' | 'storyline' | 'game' | 'award';

export interface LivingPlayerStoryChapter {
  id: string;
  source: LivingPlayerStorySource;
  year: number;
  week: number | null;
  label: string;
  summary: string;
  sourceRef: string;
}

export interface LivingPlayerStoryMentor {
  playerId: string;
  name: string;
  positionGroup: string;
  year: number;
  bonus: number;
}

export interface LivingPlayerStory {
  playerId: string;
  playerName: string;
  teamId: string | null;
  stage: LivingPlayerStoryStage;
  status: LivingPlayerStoryStatus;
  headline: string;
  summary: string;
  heat: number;
  mentor: LivingPlayerStoryMentor | null;
  activeThreadId: string | null;
  nextBeatHint: string | null;
  chapters: LivingPlayerStoryChapter[];
  sourceRefs: string[];
}

interface AwardChapter {
  year: number;
  award: AwardResult;
}

function compareChapters(left: LivingPlayerStoryChapter, right: LivingPlayerStoryChapter): number {
  const leftWeek = left.week ?? (left.source === 'mentorship' ? 0 : 99);
  const rightWeek = right.week ?? (right.source === 'mentorship' ? 0 : 99);
  return left.year - right.year
    || leftWeek - rightWeek
    || left.id.localeCompare(right.id);
}

function compareMentoringPairs(left: MentoringPair, right: MentoringPair): number {
  return right.year - left.year
    || right.bonus - left.bonus
    || left.mentorId.localeCompare(right.mentorId);
}

function compareThreads(left: StorylineThread, right: StorylineThread): number {
  return Number(right.status === 'active') - Number(left.status === 'active')
    || right.updatedYear - left.updatedYear
    || right.updatedWeek - left.updatedWeek
    || right.heat - left.heat
    || left.id.localeCompare(right.id);
}

function compareCapsules(left: GameCapsule, right: GameCapsule): number {
  return left.year - right.year
    || left.week - right.week
    || left.id.localeCompare(right.id);
}

function playerDisplayName(player: Player): string {
  const savedName = player.name?.trim();
  if (savedName) return savedName;
  const composedName = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();
  return composedName || player.id;
}

function findMentoringPair(game: GameState, player: Player): MentoringPair | null {
  const pairs = Object.values(game.teams)
    .flatMap((team) => team.mentoringPairs ?? [])
    .filter((pair) => pair.menteeId === player.id)
    .sort(compareMentoringPairs);
  return pairs[0] ?? null;
}

function findAwards(game: GameState, playerId: string): AwardChapter[] {
  return (game.awardsHistory ?? [])
    .flatMap((entry) => entry.awards
      .filter((award) => award.winnerId === playerId)
      .map((award) => ({ year: entry.year, award })))
    .sort((left, right) =>
      left.year - right.year
      || left.award.awardId.localeCompare(right.award.awardId));
}

function mentoringChapter(pair: MentoringPair): LivingPlayerStoryChapter {
  return {
    id: `mentorship:${pair.year}:${pair.mentorId}:${pair.menteeId}`,
    source: 'mentorship',
    year: pair.year,
    week: null,
    label: 'The apprenticeship',
    summary: `${pair.mentorName} took ${pair.menteeName} under his wing in the ${pair.positionGroup} room.`,
    sourceRef: `mentoringPair:${pair.teamId}:${pair.year}:${pair.mentorId}:${pair.menteeId}`,
  };
}

function storylineChapters(threads: StorylineThread[]): LivingPlayerStoryChapter[] {
  return threads.flatMap((thread) => {
    if (thread.beats.length === 0) {
      const sourceRef = `storyline:${thread.id}:${thread.updatedYear}:${thread.updatedWeek}:summary`;
      return [{
        id: sourceRef,
        source: 'storyline' as const,
        year: thread.updatedYear,
        week: thread.updatedWeek,
        label: thread.title,
        summary: thread.summary,
        sourceRef,
      }];
    }

    return thread.beats.map((beat, index) => ({
      id: `storyline:${thread.id}:${beat.year}:${beat.weekNumber}:${index}`,
      source: 'storyline' as const,
      year: beat.year,
      week: beat.weekNumber,
      label: beat.label,
      summary: beat.summary,
      sourceRef: `storyline:${thread.id}:${beat.year}:${beat.weekNumber}:${index}`,
    }));
  });
}

function gameChapters(capsules: GameCapsule[]): LivingPlayerStoryChapter[] {
  return capsules.map((capsule) => ({
    id: `game:${capsule.gameId}`,
    source: 'game',
    year: capsule.year,
    week: capsule.week,
    label: 'Breakout game',
    summary: capsule.summary,
    sourceRef: `gameCapsule:${capsule.id}`,
  }));
}

function awardChapters(awards: AwardChapter[]): LivingPlayerStoryChapter[] {
  return awards.map(({ year, award }) => ({
    id: `award:${year}:${award.awardId}:${award.winnerId}`,
    source: 'award',
    year,
    week: null,
    label: award.label,
    summary: award.narrative.trim() || `${award.winnerName} won ${award.label}.`,
    sourceRef: `awardsHistory:${year}:${award.awardId}:${award.winnerId}`,
  }));
}

function storyStage(
  threads: StorylineThread[],
  capsules: GameCapsule[],
  awards: AwardChapter[],
): LivingPlayerStoryStage {
  if (awards.length > 0 || threads.some((thread) => thread.status === 'closed')) return 'legacy';
  if (threads.length > 0 || capsules.length > 0) return 'breakout';
  return 'mentored';
}

function storyHeat(
  stage: LivingPlayerStoryStage,
  threads: StorylineThread[],
  capsules: GameCapsule[],
): number {
  const threadHeat = threads.reduce((highest, thread) => Math.max(highest, thread.heat), 0);
  const stageFloor = stage === 'legacy' ? 90 : stage === 'breakout' ? 60 : 35;
  const gameHeat = capsules.length > 0 ? Math.min(85, 55 + capsules.length * 5) : 0;
  return Math.max(stageFloor, threadHeat, gameHeat);
}

export function buildLivingPlayerStory(game: GameState, playerId: string): LivingPlayerStory | null {
  const player = game.players[playerId];
  if (!player) return null;

  const mentorPair = findMentoringPair(game, player);
  const playerName = playerDisplayName(player);
  const threads = (game.storylineThreads ?? [])
    .filter((thread) => thread.playerIds.includes(playerId))
    .sort(compareThreads);
  const capsules = (game.gameCapsules ?? [])
    .filter((capsule) => capsule.starPlayerIds.includes(playerId))
    .sort(compareCapsules);
  const awards = findAwards(game, playerId);

  if (!mentorPair && threads.length === 0 && capsules.length === 0 && awards.length === 0) {
    return null;
  }

  const stage = storyStage(threads, capsules, awards);
  const activeThread = threads.find((thread) => thread.status === 'active') ?? null;
  const mentor = mentorPair ? {
    playerId: mentorPair.mentorId,
    name: mentorPair.mentorName,
    positionGroup: mentorPair.positionGroup,
    year: mentorPair.year,
    bonus: mentorPair.bonus,
  } : null;
  const chapters = [
    ...(mentorPair ? [mentoringChapter(mentorPair)] : []),
    ...storylineChapters(threads),
    ...gameChapters(capsules),
    ...awardChapters(awards),
  ]
    .sort(compareChapters)
    .slice(-12);
  const latestChapter = chapters.at(-1)!;
  const latestAward = awards.at(-1)?.award ?? null;
  const headline = activeThread?.title
    ?? (latestAward ? `${playerName}: ${latestAward.label}` : latestChapter.label);
  const summary = activeThread?.summary ?? latestChapter.summary;
  const nextBeatHint = activeThread?.nextBeatHint
    ?? (stage === 'mentored'
      ? `Next chapter: watch for ${playerName}'s first saved breakout game or league storyline.`
      : null);

  return {
    playerId,
    playerName,
    teamId: player.teamId,
    stage,
    status: activeThread || mentorPair ? 'active' : 'archived',
    headline,
    summary,
    heat: storyHeat(stage, threads, capsules),
    mentor,
    activeThreadId: activeThread?.id ?? null,
    nextBeatHint,
    chapters,
    sourceRefs: chapters.map((chapter) => chapter.sourceRef),
  };
}

export function buildLivingPlayerStories(game: GameState, teamId?: string | null): LivingPlayerStory[] {
  return Object.values(game.players)
    .filter((player) => !teamId || player.teamId === teamId)
    .map((player) => buildLivingPlayerStory(game, player.id))
    .filter((story): story is LivingPlayerStory => Boolean(story))
    .sort((left, right) =>
      Number(right.status === 'active') - Number(left.status === 'active')
      || right.heat - left.heat
      || right.chapters.at(-1)!.year - left.chapters.at(-1)!.year
      || (right.chapters.at(-1)!.week ?? 99) - (left.chapters.at(-1)!.week ?? 99)
      || left.playerName.localeCompare(right.playerName)
      || left.playerId.localeCompare(right.playerId));
}
