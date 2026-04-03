import type { GameState, NarrativeBeat, NarrativeIntensity } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function beatTarget(beat: NarrativeBeat): number {
  if (beat.type === 'positive') return 50 + beat.intensity * 0.25;
  if (beat.type === 'negative') return 50 - beat.intensity * 0.25;
  return 50;
}

export function createDefaultNarrativeIntensity(): NarrativeIntensity {
  return {
    current: 50,
    recentBeats: [],
    cooldownWeeks: 0,
  };
}

export function calculateIntensity(recentBeats: NarrativeBeat[]): number {
  if (recentBeats.length === 0) return 50;
  const ordered = [...recentBeats].slice(-8);
  let weightedTotal = 0;
  let weightSum = 0;

  for (let index = 0; index < ordered.length; index += 1) {
    const distanceFromLatest = ordered.length - index - 1;
    const weight = Math.pow(0.72, distanceFromLatest);
    weightedTotal += beatTarget(ordered[index]!) * weight;
    weightSum += weight;
  }

  return clamp(Math.round((weightedTotal / Math.max(weightSum, 1)) * 100) / 100, 0, 100);
}

export function recordBeat(game: GameState, beat: NarrativeBeat): NarrativeIntensity {
  game.narrativeIntensity ??= createDefaultNarrativeIntensity();
  const intensity = game.narrativeIntensity;
  intensity.recentBeats = [...intensity.recentBeats, beat].slice(-8);
  intensity.current = calculateIntensity(intensity.recentBeats);
  intensity.cooldownWeeks = intensity.current > 70 ? 2 : intensity.current > 40 ? 1 : 0;
  return intensity;
}

export function shouldGenerateEvent(
  game: GameState,
  eventType: string,
  eventIntensity: number,
  rng: () => number,
  options?: { polarity?: NarrativeBeat['type']; mandatory?: boolean },
): boolean {
  game.narrativeIntensity ??= createDefaultNarrativeIntensity();
  if (options?.mandatory || eventType === 'breaking_news' || eventType === 'injury') {
    return true;
  }

  const polarity = options?.polarity ?? 'neutral';
  const current = game.narrativeIntensity.current;
  if (polarity === 'negative') {
    const suppressChance = current > 90 ? 0.6 : current > 70 ? 0.3 : 0;
    if (rng() < suppressChance) return false;
  }

  if (polarity === 'positive' && current < 20 && (eventIntensity >= 20 || rng() < 0.2)) {
    return true;
  }

  return true;
}

export function getCooldownStatus(game: GameState): 'hot' | 'warm' | 'cool' {
  game.narrativeIntensity ??= createDefaultNarrativeIntensity();
  if (game.narrativeIntensity.current > 70) return 'hot';
  if (game.narrativeIntensity.current >= 40) return 'warm';
  return 'cool';
}
