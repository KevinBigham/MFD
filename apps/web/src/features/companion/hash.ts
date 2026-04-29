export interface VariantSeed {
  eventId: string;
  dynastySeed: number;
  weekIndex: number;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a(input: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index) & 0xff;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }

  return hash >>> 0;
}

export function serializeVariantSeed(seed: VariantSeed): string {
  return `eventId=${seed.eventId}|dynastySeed=${seed.dynastySeed}|weekIndex=${seed.weekIndex}`;
}

export function selectVariant<T>(variants: readonly T[], seed: VariantSeed): T {
  if (variants.length === 0) {
    throw new Error('selectVariant requires at least one variant.');
  }
  const index = fnv1a(serializeVariantSeed(seed)) % variants.length;
  return variants[index] as T;
}
