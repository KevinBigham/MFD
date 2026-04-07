import { describe, expect, it } from 'vitest';

import { getFuzzyGrade, getFuzzyRating, gradeL } from '../src/systems/fuzzy-grades.js';

describe('fuzzy-grades.js', () => {
  it('gradeL maps key boundaries correctly', () => {
    expect(gradeL(92)).toBe('A+');
    expect(gradeL(80)).toBe('A-');
    expect(gradeL(60)).toBe('C');
    expect(gradeL(44)).toBe('F');
  });

  it('getFuzzyRating returns exact value at scout level 3 and ranges otherwise', () => {
    expect(getFuzzyRating(77, 3)).toBe('77');
    expect(getFuzzyRating(77, 2)).toBe('74–80');
    expect(getFuzzyRating(77, 1)).toBe('71–83');
    expect(getFuzzyRating(undefined, 2)).toBe('?');
  });

  it('getFuzzyGrade returns exact grade at scout level 3 and fuzzy grade ranges otherwise', () => {
    expect(getFuzzyGrade(86, 3)).toBe('A');
    expect(getFuzzyGrade(86, 2)).toBe('A-–A');
    expect(getFuzzyGrade(86, 0)).toBe('B–A+');
  });
});
