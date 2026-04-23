import type { PlaytestPersona } from './types';

function createPersona(
  id: PlaytestPersona['id'],
  label: PlaytestPersona['label'],
  description: PlaytestPersona['description'],
  aiBias: PlaytestPersona['aiBias'],
): PlaytestPersona {
  return {
    id,
    label,
    description,
    aiBias: Object.freeze({ ...aiBias }),
  };
}

export const PLAYTEST_PERSONAS = Object.freeze([
  createPersona(
    'SPEEDRUNNER',
    'Speedrunner',
    'Advance-only baseline that validates full phase turnover across repeated seasons.',
    { advanceOnly: true },
  ),
  createPersona(
    'GLUTTON',
    'Glutton',
    'Spends aggressively on free agency and extensions to stress long-run cap math.',
    { faAggression: 1, extensionAggression: 1, tradeWillingness: 0.95 },
  ),
  createPersona(
    'CHEAPSKATE',
    'Cheapskate',
    'Avoids veteran spending and leans on draft or low-cost fallback pathways.',
    { faAggression: 0, extensionAggression: 0.1, udfaReliance: 1, tradeWillingness: 0.1 },
  ),
  createPersona(
    'CHURN_ARTIST',
    'Churn Artist',
    'Forces constant coaching turnover and aggressive deadline behavior.',
    { fireCoachEverySeason: true, tradeWillingness: 1 },
  ),
  createPersona(
    'INJURY_MAGNET',
    'Injury Magnet',
    'Runs starters into the ground by riding stars and ignoring fatigue penalties.',
    { snapManagement: 'ride_stars', fatigueIgnore: true },
  ),
] as const satisfies readonly PlaytestPersona[]);

export function getPlaytestPersona(id: string): PlaytestPersona | undefined {
  return PLAYTEST_PERSONAS.find((persona) => persona.id === id);
}
