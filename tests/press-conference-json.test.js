import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const pressConferenceJson = JSON.parse(
  readFileSync(new URL('../src/data/press-conference.json', import.meta.url), 'utf8')
);

describe('press-conference.json', () => {
  it('aligns question and answer topic sets', () => {
    const questionKeys = Object.keys(pressConferenceJson.questions).sort();
    const answerKeys = Object.keys(pressConferenceJson.answers).sort();
    expect(questionKeys).toEqual(answerKeys);
    expect(questionKeys.length).toBe(13);
  });

  it('stores structured prompt/answer entries and media reactions', () => {
    Object.values(pressConferenceJson.questions).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      pool.forEach((q) => {
        expect(typeof q.text).toBe('string');
        expect(typeof q.tone).toBe('string');
      });
    });
    Object.values(pressConferenceJson.answers).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      pool.forEach((a) => {
        expect(typeof a.text).toBe('string');
        expect(typeof a.tone).toBe('string');
        expect(typeof a.moraleEffect).toBe('number');
      });
    });
    expect(pressConferenceJson.mediaReaction.length).toBeGreaterThan(10);
  });
});
