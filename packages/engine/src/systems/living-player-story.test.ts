import { describe, expect, it } from 'vitest';
import type { StorylineThread } from '../storyline-threads/types';
import { makeLeagueState } from './test-helpers';
import { buildLivingPlayerStories, buildLivingPlayerStory } from './living-player-story';

function rookieThread(playerId: string, teamId: string): StorylineThread {
  return {
    id: `storyline|rookie-of-year-chase|2026|${playerId}`,
    key: `rookie-of-year-chase|2026|${playerId}`,
    archetype: 'rookie-of-year-chase',
    title: 'The rookie has entered the ROY chase',
    summary: 'The rookie is now a league-wide name.',
    teamIds: [teamId],
    playerIds: [playerId],
    startWeek: 6,
    startYear: 2026,
    weeksActive: 4,
    status: 'active',
    beats: [
      {
        label: 'rookie of the week',
        summary: 'The first breakout landed.',
        weekNumber: 6,
        year: 2026,
      },
      {
        label: 'power ranking spotlight',
        summary: 'The breakout became a league story.',
        weekNumber: 9,
        year: 2026,
      },
    ],
    heat: 78,
    nextBeatHint: 'Next beat: mid-season ROY favorite.',
    beatIndex: 1,
    updatedWeek: 9,
    updatedYear: 2026,
    closeReason: null,
    metadata: {},
  };
}

describe('living player story', () => {
  it('connects mentorship, storyline, breakout game, and award facts into one ordered story', () => {
    const game = makeLeagueState('regular_season', 10);
    const team = game.teams.afce1!;
    const player = team.roster.find((entry) => entry.pos === 'WR')!;
    const mentor = team.roster.find((entry) => entry.id !== player.id && entry.pos === player.pos)
      ?? team.roster.find((entry) => entry.id !== player.id)!;

    team.mentoringPairs = [{
      mentorId: mentor.id,
      mentorName: mentor.name,
      menteeId: player.id,
      menteeName: player.name,
      teamId: team.id,
      positionGroup: player.pos,
      year: 2026,
      bonus: 3,
    }];
    game.storylineThreads = [rookieThread(player.id, team.id)];
    game.gameCapsules = [{
      id: 'capsule:breakout',
      gameId: 'breakout',
      year: 2026,
      week: 8,
      teamIds: [team.id, 'afce2'],
      score: [31, 17],
      turningPoint: 'A fourth-quarter touchdown made it real.',
      keyPlayEventIds: ['snap:breakout:88'],
      receiptIds: [],
      starPlayerIds: [player.id],
      summary: `${player.name} authored the defining score in a 31-17 win.`,
    }];
    game.awardsHistory = [{
      year: 2026,
      awards: [{
        awardId: 'oroy',
        label: 'Offensive Rookie of the Year',
        winnerId: player.id,
        winnerName: player.name,
        winnerTeamId: team.id,
        winnerTeam: team.name,
        winnerPosition: player.pos,
        winnerStats: { recYds: 1_180 },
        score: 96,
        runnersUp: [],
        narrative: `${player.name} completed the climb from prospect to award winner.`,
      }],
      ceremony: { headline: 'Awards Night', intro: 'The ballots are in.', blurbs: [] },
    }];

    const story = buildLivingPlayerStory(game, player.id);

    expect(story).toMatchObject({
      playerId: player.id,
      stage: 'legacy',
      status: 'active',
      heat: 90,
      activeThreadId: game.storylineThreads[0]!.id,
      mentor: {
        playerId: mentor.id,
        name: mentor.name,
        bonus: 3,
      },
    });
    expect(story?.chapters.map((chapter) => chapter.source)).toEqual([
      'mentorship',
      'storyline',
      'game',
      'storyline',
      'award',
    ]);
    expect(story?.sourceRefs).toHaveLength(5);
    expect(story?.nextBeatHint).toContain('mid-season ROY favorite');
  });

  it('is deterministic, team-filtered, bounded, and does not mutate the save', () => {
    const game = makeLeagueState('regular_season', 8);
    const userTeam = game.teams.afce1!;
    const player = userTeam.roster[0]!;
    const mentor = userTeam.roster[1]!;
    userTeam.mentoringPairs = [{
      mentorId: mentor.id,
      mentorName: mentor.name,
      menteeId: player.id,
      menteeName: player.name,
      teamId: userTeam.id,
      positionGroup: player.pos,
      year: game.year,
      bonus: 2,
    }];
    const expectedName = `${player.firstName} ${player.lastName}`.trim();
    delete (player as Partial<typeof player>).name;
    const before = structuredClone(game);

    const first = buildLivingPlayerStories(game, userTeam.id);
    const second = buildLivingPlayerStories(game, userTeam.id);

    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      playerId: player.id,
      playerName: expectedName,
      stage: 'mentored',
    });
    expect(first.every((story) => story.teamId === userTeam.id)).toBe(true);
    expect(first[0]!.chapters.length).toBeLessThanOrEqual(12);
    expect(game).toEqual(before);
    expect(buildLivingPlayerStory(game, 'missing-player')).toBeNull();
  });

  it('uses the saved thread summary when a normalized thread has no beat rows', () => {
    const game = makeLeagueState('regular_season', 8);
    const player = game.teams.afce1!.roster[0]!;
    game.storylineThreads = [{
      ...rookieThread(player.id, 'afce1'),
      beats: [],
    }];

    const story = buildLivingPlayerStory(game, player.id);

    expect(story?.chapters).toEqual([
      expect.objectContaining({
        source: 'storyline',
        label: 'The rookie has entered the ROY chase',
        summary: 'The rookie is now a league-wide name.',
      }),
    ]);
  });
});
