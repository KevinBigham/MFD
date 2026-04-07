import { describe, expect, it } from 'vitest';

import { PRESS_CONFERENCE_993 } from '../src/data/press-conference-expanded.js';

describe('press-conference-expanded.js', () => {
  it('has aligned topic keys between questions and answers', () => {
    const questionKeys = Object.keys(PRESS_CONFERENCE_993.questions);
    const answerKeys = Object.keys(PRESS_CONFERENCE_993.answers);

    expect(questionKeys.length).toBe(13);
    expect(answerKeys.length).toBe(13);
    expect(answerKeys.sort()).toEqual(questionKeys.sort());
  });

  it('stores structured questions and answers with tone/effect fields', () => {
    Object.values(PRESS_CONFERENCE_993.questions).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(0);
      pool.forEach((q) => {
        expect(typeof q.text).toBe('string');
        expect(typeof q.tone).toBe('string');
      });
    });

    Object.values(PRESS_CONFERENCE_993.answers).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(0);
      pool.forEach((a) => {
        expect(typeof a.text).toBe('string');
        expect(typeof a.tone).toBe('string');
        expect(typeof a.moraleEffect).toBe('number');
        expect(typeof a.ownerEffect).toBe('number');
        expect(typeof a.mediaEffect).toBe('number');
      });
    });
  });

  it('includes media reaction templates with coach placeholder token', () => {
    expect(PRESS_CONFERENCE_993.mediaReaction.length).toBeGreaterThan(10);
    expect(PRESS_CONFERENCE_993.mediaReaction.some((line) => line.includes('[COACH]'))).toBe(true);
  });
});
