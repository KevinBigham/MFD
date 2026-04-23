import { describe, expect, it } from 'vitest';
import { makeLeagueState } from '../systems/test-helpers';
import { advanceStorylineThreads, closeCompletedThreads } from './thread-progression';
import type { StorylineThread } from './types';

function makeCoach(id: string, tenure: number) {
  return {
    id,
    firstName: id,
    lastName: 'Coach',
    role: 'HC' as const,
    archetype: 'ceo',
    traits: [],
    skillTree: {},
    xp: 0,
    reputation: 60,
    tenure,
  };
}

function thread(overrides: Partial<StorylineThread> = {}): StorylineThread {
  return {
    id: 'thread-1',
    key: 'story-key',
    archetype: 'hot-seat-coach',
    title: 'Story',
    summary: 'Summary',
    teamIds: ['afce1'],
    playerIds: [],
    startWeek: 6,
    startYear: 2026,
    weeksActive: 1,
    status: 'active',
    beats: [{ label: 'reported pressure', summary: 'Summary', weekNumber: 6, year: 2026 }],
    heat: 60,
    nextBeatHint: 'Next beat: GM meeting.',
    beatIndex: 0,
    updatedWeek: 6,
    updatedYear: 2026,
    closeReason: null,
    metadata: { coachId: 'hot-seat', coachName: 'Hot Seat Coach' },
    ...overrides,
  };
}

describe('storyline thread progression', () => {
  it('advances active threads one beat at a time', () => {
    const game = makeLeagueState('regular_season', 8);
    game.storylineThreads = [thread()];

    const advanced = advanceStorylineThreads(game, 8)[0]!;
    expect(advanced.beatIndex).toBe(1);
    expect(advanced.weeksActive).toBe(3);
  });

  it('does not re-advance threads already updated this week', () => {
    const game = makeLeagueState('regular_season', 8);
    game.storylineThreads = [thread({ updatedWeek: 8 })];

    const advanced = advanceStorylineThreads(game, 8)[0]!;
    expect(advanced.beatIndex).toBe(0);
  });

  it('updates heat and nextBeatHint while advancing', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce1!.streak = -4;
    game.storylineThreads = [thread()];

    const advanced = advanceStorylineThreads(game, 8)[0]!;
    expect(advanced.heat).toBeGreaterThan(60);
    expect(advanced.nextBeatHint).toContain('bye-week ultimatum');
  });

  it('closes hot-seat threads when the coach changes', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce1!.coachingStaff.hc = makeCoach('new-coach', 1);
    game.storylineThreads = [thread()];

    const closed = closeCompletedThreads(game)[0]!;
    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toContain('out');
  });

  it('closes quarterback controversy threads when the backup has held the job for two weeks', () => {
    const game = makeLeagueState('regular_season', 8);
    game.storylineThreads = [thread({
      archetype: 'qb-controversy',
      playerIds: ['starter', 'backup'],
      metadata: {
        starterId: 'starter',
        starterName: 'Starter',
        backupId: 'backup',
        backupName: 'Backup',
        backupStartedWeeks: 2,
      },
    })];
    const team = game.teams.afce1!;
    team.roster[0]!.id = 'backup';
    team.roster[0]!.name = 'Backup';
    team.roster[0]!.pos = 'QB';
    team.roster[0]!.isStarter = true;

    const closed = closeCompletedThreads(game)[0]!;
    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toContain('real switch');
  });

  it('closes season-long narrative threads when the regular season ends', () => {
    const game = makeLeagueState('playoffs', 19);
    game.storylineThreads = [thread({
      archetype: 'rookie-of-year-chase',
      playerIds: ['roy'],
      metadata: { playerName: 'Roy Rookie' },
    })];

    const closed = closeCompletedThreads(game)[0]!;
    expect(closed.status).toBe('closed');
    expect(closed.nextBeatHint).toBeNull();
  });

  it('leaves already closed threads unchanged', () => {
    const game = makeLeagueState('regular_season', 8);
    const closedThread = thread({ status: 'closed', closeReason: 'done', nextBeatHint: null });
    game.storylineThreads = [closedThread];

    expect(advanceStorylineThreads(game, 8)[0]).toEqual(closedThread);
    expect(closeCompletedThreads(game)[0]).toEqual(closedThread);
  });
});
