import { PLAYTEST_PERSONAS, getPlaytestPersona } from './personas';

describe('playtest personas', () => {
  it('exposes the five built-in personas in stable order', () => {
    expect(PLAYTEST_PERSONAS.map((persona) => persona.id)).toEqual([
      'SPEEDRUNNER',
      'GLUTTON',
      'CHEAPSKATE',
      'CHURN_ARTIST',
      'INJURY_MAGNET',
    ]);
  });

  it('keeps built-in ids uppercase and unique', () => {
    const ids = PLAYTEST_PERSONAS.map((persona) => persona.id);
    expect(ids.every((id) => id === id.toUpperCase())).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks speedrunner as the default advance-only persona', () => {
    expect(PLAYTEST_PERSONAS[0]?.id).toBe('SPEEDRUNNER');
    expect(PLAYTEST_PERSONAS[0]?.aiBias.advanceOnly).toBe(true);
  });

  it('freezes built-in bias configs', () => {
    const glutton = getPlaytestPersona('GLUTTON');
    expect(glutton).toBeDefined();
    expect(Object.isFrozen(glutton?.aiBias)).toBe(true);
  });

  it('looks up personas by id and returns undefined for unknown ids', () => {
    expect(getPlaytestPersona('CHEAPSKATE')?.id).toBe('CHEAPSKATE');
    expect(getPlaytestPersona('UNKNOWN')).toBeUndefined();
  });
});
