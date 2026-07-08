import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('useBootSequence config', () => {
  const content = readFileSync(new URL('./useBootSequence.ts', import.meta.url), 'utf-8');

  it('does not contain old phase 1 version string', () => {
    expect(content).not.toContain('v0.1.0');
    expect(content).not.toContain('PHASE 1');
  });

  it('contains launch version string', () => {
    expect(content).toContain('v1.0.0 // LAUNCH BUILD');
    expect(content).not.toContain('v1.0.0-beta');
  });

  it('boot lines reflect current system counts', () => {
    expect(content).toContain('145+');
    expect(content).toContain('2,650+ tests');
    expect(content).toContain('8-BIT ESPN');
    expect(content).toContain('v36 migration chain');
  });

  it('has 14 boot lines including blanks', () => {
    const matches = content.match(/\{ text:/g);
    expect(matches?.length).toBe(14);
  });
});
