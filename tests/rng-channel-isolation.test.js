import { describe, expect, it } from 'vitest';

import { RNG, reseedSeason, reseedWeek, setSeed } from '../src/utils/rng.js';

describe('rng channel isolation', () => {
  it('heavy play-channel usage does not perturb draft/injury channels', () => {
    setSeed(20260301);
    var draftBaseline = [RNG.draft(), RNG.draft(), RNG.draft(), RNG.draft()];
    var injuryBaseline = [RNG.injury(), RNG.injury(), RNG.injury(), RNG.injury()];

    setSeed(20260301);
    for (var i = 0; i < 5000; i += 1) RNG.play();
    var draftAfterPlay = [RNG.draft(), RNG.draft(), RNG.draft(), RNG.draft()];
    var injuryAfterPlay = [RNG.injury(), RNG.injury(), RNG.injury(), RNG.injury()];

    expect(draftAfterPlay).toEqual(draftBaseline);
    expect(injuryAfterPlay).toEqual(injuryBaseline);
  });

  it('reseedWeek only changes week channels and keeps draft stream stable', () => {
    setSeed(9191);
    var draftBefore = [RNG.draft(), RNG.draft(), RNG.draft()];

    setSeed(9191);
    reseedWeek(2032, 14);
    var weekStreams = [RNG.play(), RNG.injury(), RNG.ai(), RNG.dev(), RNG.trade()];
    expect(weekStreams.every(function (v) { return Number.isFinite(v); })).toBe(true);

    setSeed(9191);
    reseedWeek(2032, 14);
    for (var i = 0; i < 5; i += 1) RNG.play();
    var draftAfter = [RNG.draft(), RNG.draft(), RNG.draft()];

    expect(draftAfter).toEqual(draftBefore);
  });

  it('reseedSeason affects draft channel deterministically only', () => {
    setSeed(5511);
    reseedSeason(2035);
    var seasonA = [RNG.draft(), RNG.draft(), RNG.draft(), RNG.draft()];

    setSeed(5511);
    reseedSeason(2035);
    var seasonB = [RNG.draft(), RNG.draft(), RNG.draft(), RNG.draft()];
    expect(seasonB).toEqual(seasonA);

    setSeed(5511);
    reseedSeason(2036);
    var seasonC = [RNG.draft(), RNG.draft(), RNG.draft(), RNG.draft()];
    expect(seasonC).not.toEqual(seasonA);
  });
});
