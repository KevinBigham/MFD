import { describe, expect, it } from 'vitest';
import {
  CHIP_FIRST_TEN_BEATS,
  CHIP_ONBOARDING_PROGRESS_KEY,
  applyChipOnboardingTrigger,
  createInitialChipProgress,
  readChipOnboardingProgress,
  requestChipOnboardingReplay,
  resetChipOnboardingProgress,
  snoozeChipOnboarding,
  writeChipOnboardingProgress,
} from './onboardingMachine';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

describe('Chip onboarding state machine', () => {
  it('advances first-ten beats through explicit states without duplicate recommendations', () => {
    let progress = createInitialChipProgress('2026-05-05T12:00:00.000Z');

    const intro = applyChipOnboardingTrigger(progress, {
      type: 'app_opened',
      id: 'load-1',
      context: { route: '/', currentWeek: 1, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:01:00.000Z',
    });
    expect(intro.recommendation?.id).toBe('chip.first10.welcome');
    expect(intro.progress.status).toBe('intro_seen');
    progress = intro.progress;

    const duplicateIntro = applyChipOnboardingTrigger(progress, {
      type: 'app_opened',
      id: 'load-1',
      context: { route: '/', currentWeek: 1, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:01:10.000Z',
    });
    expect(duplicateIntro.recommendation).toBeNull();
    expect(duplicateIntro.progress).toBe(progress);

    const briefing = applyChipOnboardingTrigger(progress, {
      type: 'route_entered',
      id: 'route-briefing',
      context: { route: '/', currentWeek: 1, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:02:00.000Z',
    });
    expect(briefing.recommendation?.id).toBe('chip.first10.briefing');
    expect(briefing.progress.status).toBe('briefing_explained');
    progress = briefing.progress;

    const roster = applyChipOnboardingTrigger(progress, {
      type: 'route_entered',
      id: 'route-roster',
      context: { route: '/roster', currentWeek: 1, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:03:00.000Z',
    });
    expect(roster.recommendation?.id).toBe('chip.first10.roster');
    expect(roster.progress.status).toBe('roster_explained');
    progress = roster.progress;

    const gamePlan = applyChipOnboardingTrigger(progress, {
      type: 'route_entered',
      id: 'route-game-plan',
      context: { route: '/game-plan', currentWeek: 1, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:04:00.000Z',
    });
    expect(gamePlan.recommendation?.id).toBe('chip.first10.gameplan');
    expect(gamePlan.progress.status).toBe('gameplan_explained');
    progress = gamePlan.progress;

    const advance = applyChipOnboardingTrigger(progress, {
      type: 'route_entered',
      id: 'route-week-advance',
      context: { route: '/week-advance', currentWeek: 1, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:05:00.000Z',
    });
    expect(advance.recommendation?.id).toBe('chip.first10.advance-week');
    expect(advance.progress.status).toBe('advance_week_explained');
    progress = advance.progress;

    const postAdvance = applyChipOnboardingTrigger(progress, {
      type: 'week_advanced',
      id: 'advance-week-2',
      context: { route: '/', currentWeek: 2, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:06:00.000Z',
    });
    expect(postAdvance.recommendation?.id).toBe('chip.first10.post-advance');
    expect(postAdvance.progress.status).toBe('post_advance_debrief_seen');
    progress = postAdvance.progress;

    const impact = applyChipOnboardingTrigger(progress, {
      type: 'decision_previewed',
      id: 'trade-impact',
      context: { route: '/trades', currentWeek: 2, currentSeason: 2026, surface: 'trade' },
      occurredAt: '2026-05-05T12:07:00.000Z',
    });
    expect(impact.recommendation?.id).toBe('chip.first10.decision-impact');
    expect(impact.progress.status).toBe('decision_impact_explained');
    progress = impact.progress;

    const advanced = applyChipOnboardingTrigger(progress, {
      type: 'what_now_requested',
      id: 'what-now-1',
      context: { route: '/franchise', currentWeek: 2, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:08:00.000Z',
    });
    expect(advanced.recommendation?.id).toBe('chip.first10.advanced-systems');
    expect(advanced.progress.status).toBe('complete');
  });

  it('snoozes onboarding triggers until the requested week has passed', () => {
    const progress = snoozeChipOnboarding(createInitialChipProgress(), {
      currentWeek: 2,
      untilWeek: 4,
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const duringSnooze = applyChipOnboardingTrigger(progress, {
      type: 'route_entered',
      id: 'route-roster',
      context: { route: '/roster', currentWeek: 4, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:05:00.000Z',
    });
    expect(duringSnooze.recommendation).toBeNull();
    expect(duringSnooze.progress.status).toBe('snoozed');

    const afterSnooze = applyChipOnboardingTrigger(progress, {
      type: 'route_entered',
      id: 'route-roster-later',
      context: { route: '/roster', currentWeek: 5, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:10:00.000Z',
    });
    expect(afterSnooze.recommendation?.id).toBe('chip.first10.roster');
    expect(afterSnooze.progress.status).toBe('roster_explained');
  });

  it('persists, resumes, and resets progress from browser-local storage', () => {
    const storage = new MemoryStorage();
    const progress = {
      ...createInitialChipProgress('2026-05-05T12:00:00.000Z'),
      status: 'briefing_explained' as const,
      shownBeatIds: ['chip.first10.welcome', 'chip.first10.briefing'],
      lastTriggerId: 'route-briefing',
      updatedAt: '2026-05-05T12:02:00.000Z',
    };

    writeChipOnboardingProgress(storage, progress);

    expect(storage.getItem(CHIP_ONBOARDING_PROGRESS_KEY)).toBe(JSON.stringify(progress));
    expect(readChipOnboardingProgress(storage)).toEqual(progress);

    resetChipOnboardingProgress(storage);

    expect(storage.getItem(CHIP_ONBOARDING_PROGRESS_KEY)).toBeNull();
    expect(readChipOnboardingProgress(storage).shownBeatIds).toEqual([]);
  });

  it('can replay the first-ten arc after completion without mutating the catalog', () => {
    const completed = {
      ...createInitialChipProgress('2026-05-05T12:00:00.000Z'),
      status: 'complete' as const,
      shownBeatIds: CHIP_FIRST_TEN_BEATS.map((beat) => beat.id),
      completedAt: '2026-05-05T12:10:00.000Z',
      updatedAt: '2026-05-05T12:10:00.000Z',
    };

    const replay = requestChipOnboardingReplay(completed, '2026-05-05T12:20:00.000Z');
    const result = applyChipOnboardingTrigger(replay, {
      type: 'replay_requested',
      id: 'replay-1',
      context: { route: '/', currentWeek: 2, currentSeason: 2026 },
      occurredAt: '2026-05-05T12:20:00.000Z',
    });

    expect(result.recommendation?.id).toBe('chip.first10.welcome');
    expect(result.progress.status).toBe('intro_seen');
    expect(CHIP_FIRST_TEN_BEATS).toHaveLength(9);
  });
});
