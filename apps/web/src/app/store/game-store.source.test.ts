import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./game-store.ts', import.meta.url), 'utf8');

function lineNumberForIndex(index: number): number {
  return source.slice(0, index).split('\n').length;
}

function findBlockEnd(openBraceIndex: number): number {
  let depth = 0;
  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error(`Could not find matching brace for index ${openBraceIndex}`);
}

function blockRange(marker: string): [number, number] {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Could not find source marker: ${marker}`);
  }

  const openBraceIndex = source.indexOf('{', markerIndex);
  if (openBraceIndex < 0) {
    throw new Error(`Could not find opening brace for source marker: ${marker}`);
  }

  return [markerIndex, findBlockEnd(openBraceIndex)];
}

function findSetBlocks(): Array<{ index: number; body: string }> {
  const setBlockPattern = /set\(\(s\)\s*=>\s*\{/g;

  return Array.from(source.matchAll(setBlockPattern), (match) => {
    const index = match.index ?? 0;
    const openBraceIndex = source.indexOf('{', index);
    const endIndex = findBlockEnd(openBraceIndex);
    return {
      index,
      body: source.slice(index, endIndex + 1),
    };
  });
}

const allowedGameSetOwners = [
  'const commitGame = async (nextGame: GameState) => {',
  'newGame: async (initial) => {',
  'loadGame: (loaded) => {',
  'loadLatestAutosave: async () => {',
  'undo: async () => {',
].map(blockRange);

function isAllowedGameSetOwner(index: number): boolean {
  return allowedGameSetOwners.some(([start, end]) => index >= start && index <= end);
}

describe('game store source contracts', () => {
  it('keeps direct saved-game writes behind hydration, commit, and undo owners', () => {
    const violations = findSetBlocks()
      .filter((block) => /\bs\.game\b/.test(block.body))
      .filter((block) => !isAllowedGameSetOwner(block.index))
      .map((block) => `game-store.ts:${lineNumberForIndex(block.index)} writes saved game state directly`);

    expect(violations).toEqual([]);
  });
});
