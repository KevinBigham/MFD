import { afterEach, describe, expect, it, vi } from 'vitest';
import { RNG, setSeed } from '../rng';
import type { Player, SeasonContext, Team } from '../types';
import {
  checkNemesisResolved,
  checkNemesisTrigger,
  generateDraftCrush,
  generateHooks,
} from './hooks-engine';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    firstName: 'Test',
    lastName: 'Player',
    name: 'Test Player',
    pos: 'QB',
    age: 25,
    ovr: 75,
    pot: 80,
    ratings: {},
    devTrait: 'normal',
    personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [],
    archetype: null,
    contract: null,
    teamId: 't1',
    draftYear: 2024,
    draftRound: 1,
    draftPick: 1,
    college: 'Test U',
    yearsExp: 1,
    careerStats: { seasons: 0, gp: 0, snaps: 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 60,
    chemistry: 60,
    systemFit: 50,
    isStarter: true,
    role: null,
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    stats: {},
    ...overrides,
  } as Player;
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 't1',
    city: 'Test',
    name: 'Testers',
    abbr: 'TST',
    icon: 'T',
    conference: 'AFC',
    division: 'North',
    roster: [makePlayer()],
    wins: 6,
    losses: 4,
    ties: 0,
    streak: 0,
    ownerMood: 60,
    ownerPatience80: 60,
    draftPicks: [],
    rivals: {},
    isUser: true,
    ...overrides,
  } as Team;
}

function regularSeason(overrides: Partial<SeasonContext> = {}): SeasonContext {
  return { year: 2026, week: 10, phase: 'regular_season', ...overrides };
}

describe('hooks-engine hook generation', () => {
  it('returns the top three hooks by priority across generated categories', () => {
    const team = makeTeam({
      ownerMood: 20,
      rivals: { t2: { heat: 9 } },
      roster: [
        makePlayer({ id: 'holdout', name: 'Holdout Star', holdout: true, ovr: 88 }),
        makePlayer({ id: 'hurt1', name: 'Hurt One', pos: 'WR', ovr: 82, injury: { type: 'ankle_sprain' }, isStarter: true }),
        makePlayer({ id: 'hurt2', name: 'Hurt Two', pos: 'CB', ovr: 79, injury: { type: 'hamstring' }, isStarter: true }),
        makePlayer({ id: 'young', name: 'Young Breakout', age: 23, ovr: 74, pot: 88 }),
      ],
    });
    const rival = makeTeam({ id: 't2', name: 'Rivals' });

    const hooks = generateHooks({
      my: team,
      myId: 't1',
      teams: [team, rival],
      season: regularSeason(),
      sched: [{ home: 't1', away: 't2', week: 12, played: false }],
    });

    expect(hooks.map((hook) => hook.cat)).toEqual(['contract', 'owner', 'rivalry']);
    expect(hooks).toHaveLength(3);
    expect(hooks[0]!.text).toContain('Holdout Star');
    expect(hooks[1]!.text).toContain('Owner mood');
    expect(hooks[2]!.text).toContain('Blood Feud');
  });

  it('penalizes recently shown categories before sorting the top-three list', () => {
    const team = makeTeam({
      ownerMood: 20,
      streak: -4,
      rivals: { t2: { heat: 9 } },
      roster: [
        makePlayer({ id: 'holdout', name: 'Holdout Star', holdout: true, ovr: 88 }),
        makePlayer({ id: 'hurt1', name: 'Hurt One', pos: 'WR', ovr: 82, injury: { type: 'ankle_sprain' }, isStarter: true }),
        makePlayer({ id: 'hurt2', name: 'Hurt Two', pos: 'CB', ovr: 79, injury: { type: 'hamstring' }, isStarter: true }),
        makePlayer({ id: 'young', name: 'Young Breakout', age: 23, ovr: 74, pot: 88 }),
      ],
    });
    const rival = makeTeam({ id: 't2', name: 'Rivals' });

    const hooks = generateHooks({
      my: team,
      myId: 't1',
      teams: [team, rival],
      season: regularSeason(),
      sched: [{ home: 't1', away: 't2', week: 12, played: false }],
    }, ['contract', 'owner']);

    expect(hooks.map((hook) => `${hook.cat}:${hook.priority}`)).toEqual([
      'rivalry:90',
      'playoff:80',
      'streak:78',
    ]);
  });

  it('uses only unplayed upcoming games in the next four user matchups for rivalry hooks', () => {
    const team = makeTeam({ rivals: { future: { heat: 5 }, fifth: { heat: 10 } } });
    const future = makeTeam({ id: 'future', name: 'Future Foes' });
    const fifth = makeTeam({ id: 'fifth', name: 'Too Far Away' });

    const hooks = generateHooks({
      my: team,
      myId: 't1',
      teams: [team, future, fifth],
      season: regularSeason({ week: 4 }),
      sched: [
        { home: 't1', away: 'past', week: 3, played: false },
        { home: 't1', away: 'played', week: 5, played: true },
        { home: 't1', away: 'unknown', week: 6, played: false },
        { home: 't1', away: 'future', week: 7, played: false },
        { home: 'other', away: 'future', week: 8, played: false },
        { home: 't1', away: 'another', week: 9, played: false },
        { home: 't1', away: 'fifth', week: 10, played: false },
      ],
    });

    expect(hooks.some((hook) => hook.cat === 'rivalry')).toBe(true);
    expect(hooks.find((hook) => hook.cat === 'rivalry')!.text).toContain('Future Foes');
    expect(hooks.find((hook) => hook.cat === 'rivalry')!.text).not.toContain('Too Far Away');
  });

  it('emits contract, playoff, development, owner, injury, draft, and streak variants at their source thresholds', () => {
    expect(generateHooks({
      my: makeTeam({
        roster: [makePlayer({
          name: 'Starter Deal',
          ovr: 80,
          isStarter: true,
          contract: { years: 1 },
        })],
      }),
      myId: 't1',
      teams: [],
      season: regularSeason(),
    }).find((hook) => hook.cat === 'contract')!.text).toContain('final contract year');

    expect(generateHooks({
      my: makeTeam({ wins: 10, losses: 4 }),
      myId: 't1',
      teams: [],
      season: regularSeason({ week: 14 }),
    })[0]).toMatchObject({ cat: 'playoff', priority: 85 });

    expect(generateHooks({
      my: makeTeam({ roster: [makePlayer({ age: 24, ovr: 72, pot: 80 })] }),
      myId: 't1',
      teams: [],
      season: regularSeason({ phase: 'preseason' }),
    })[0]).toMatchObject({ cat: 'dev', priority: 65 });

    expect(generateHooks({
      my: makeTeam({ ownerPatience80: 39 }),
      myId: 't1',
      teams: [],
      season: regularSeason({ phase: 'preseason' }),
    })[0]).toMatchObject({ cat: 'owner', priority: 82 });

    expect(generateHooks({
      my: makeTeam({ roster: [makePlayer({ name: 'Injured Starter', ovr: 75, injury: { type: 'ribs' }, isStarter: true })] }),
      myId: 't1',
      teams: [],
      season: regularSeason({ phase: 'preseason' }),
    })[0]!.text).toContain('ribs');

    expect(generateHooks({
      my: makeTeam({ draftPicks: [{ round: 1 }, { round: 1 }, { round: 2 }] as Team['draftPicks'] }),
      myId: 't1',
      teams: [],
      season: regularSeason({ phase: 'draft' }),
    })[0]).toMatchObject({ cat: 'draft', priority: 75 });

    expect(generateHooks({
      my: makeTeam({ streak: 4 }),
      myId: 't1',
      teams: [],
      season: regularSeason({ phase: 'preseason' }),
    })[0]).toMatchObject({ cat: 'streak', priority: 68 });
  });

  it('returns no hooks when no generator condition is met', () => {
    expect(generateHooks({
      my: makeTeam({ wins: 2, losses: 1, streak: 0 }),
      myId: 't1',
      teams: [],
      season: regularSeason({ phase: 'preseason' }),
    })).toEqual([]);
  });
});

describe('hooks-engine nemesis tracking', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps nemesis trigger events to public reasons with wall-clock metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-05-06T12:00:00Z'));

    expect(checkNemesisTrigger({
      type: 'playoff_loss',
      oppId: 't2',
      oppName: 'Rivals',
      detail: 'Lost the conference title game.',
    })).toEqual({
      oppId: 't2',
      oppName: 'Rivals',
      reason: 'Eliminated you from the playoffs',
      detail: 'Lost the conference title game.',
      setAt: Date.now(),
    });

    expect(checkNemesisTrigger({ type: 'injury', oppId: 't3', oppName: 'Bruisers' })!.reason)
      .toBe('Injured your star player');
    expect(checkNemesisTrigger({ type: 'fa_steal', oppId: 't4', oppName: 'Poachers' })!.reason)
      .toBe('Stole your free agent target');
  });

  it('ignores events without an opponent id and resolves only consequential wins against the nemesis', () => {
    expect(checkNemesisTrigger({ type: 'playoff_loss', oppId: '', oppName: 'Nobody' })).toBeNull();

    const nemesis = {
      oppId: 't2',
      oppName: 'Rivals',
      reason: 'Eliminated you from the playoffs',
      detail: '',
      setAt: 123,
    };

    expect(checkNemesisResolved(nemesis, 't2', true)).toBe(true);
    expect(checkNemesisResolved(nemesis, 't2', false)).toBe(false);
    expect(checkNemesisResolved(nemesis, 'other', true)).toBe(false);
  });
});

describe('hooks-engine draft crush preview', () => {
  it('returns null when the draft RNG gate misses', () => {
    setSeed(0);

    expect(generateDraftCrush(2026)).toBeNull();
  });

  it('builds a deterministic three-year prospect preview from the draft RNG channel', () => {
    setSeed(4);

    expect(generateDraftCrush(2026)).toEqual({
      name: 'Jaylen Johnson',
      pos: 'CB',
      state: 'Alabama',
      draftYear: 2029,
      yearN3: 'MFSN PROSPECT WATCH: Jaylen Johnson, a HS junior from Alabama, turned heads at a showcase. Remember this name.',
      yearN2: 'Jaylen Johnson committed to a powerhouse program. Scouts calling him a potential franchise-changer at CB.',
      yearN1: 'Jaylen Johnson declared for the draft. Expected top-5 pick. Multiple teams reportedly adjusting their strategy.',
    });
  });

  it('does not consume the play RNG channel while building draft crush previews', () => {
    setSeed(4);
    const nextPlayWithoutDraftCrush = RNG.play();

    setSeed(4);
    generateDraftCrush(2026);

    expect(RNG.play()).toBe(nextPlayWithoutDraftCrush);
  });
});
