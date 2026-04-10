import { getNamePool, type NameFrequencyTier } from '../content-loader';
import type { PrngFn } from '../rng';

const NAME_TIERS: readonly NameFrequencyTier[] = ['common', 'uncommon', 'rare'];
const RETRY_LIMIT = 32;

function pickTier(rng: PrngFn): NameFrequencyTier {
  const roll = rng();
  if (roll < 0.6) return 'common';
  if (roll < 0.9) return 'uncommon';
  return 'rare';
}

function pickFromPool(pool: readonly string[], rng: PrngFn): string {
  return pool[Math.floor(rng() * pool.length)] ?? pool[0] ?? 'Player';
}

export function generatePlayerName(rng: PrngFn): { first: string; last: string } {
  const firstTier = pickTier(rng);
  const lastTier = pickTier(rng);
  return {
    first: pickFromPool(getNamePool('first', firstTier), rng),
    last: pickFromPool(getNamePool('last', lastTier), rng),
  };
}

export function generateUniquePlayerName(rng: PrngFn, usedFullNames: Set<string>): { first: string; last: string } {
  for (let attempt = 0; attempt < RETRY_LIMIT; attempt += 1) {
    const generated = generatePlayerName(rng);
    const fullName = `${generated.first} ${generated.last}`;
    if (!usedFullNames.has(fullName)) {
      usedFullNames.add(fullName);
      return generated;
    }
  }

  for (const firstTier of NAME_TIERS) {
    for (const lastTier of NAME_TIERS) {
      const firstPool = getNamePool('first', firstTier);
      const lastPool = getNamePool('last', lastTier);
      for (const first of firstPool) {
        for (const last of lastPool) {
          const fullName = `${first} ${last}`;
          if (usedFullNames.has(fullName)) continue;
          usedFullNames.add(fullName);
          return { first, last };
        }
      }
    }
  }

  const fallback = generatePlayerName(() => 0);
  const suffixed = {
    first: fallback.first,
    last: `${fallback.last}${usedFullNames.size + 1}`,
  };
  usedFullNames.add(`${suffixed.first} ${suffixed.last}`);
  return suffixed;
}
