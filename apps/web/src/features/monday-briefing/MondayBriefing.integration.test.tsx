// @ts-nocheck - source-level integration guards follow the existing App test pattern.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import {
  selectMondayBriefingChipDialogue,
  type MondayBriefingChipInput,
} from './MondayBriefing';

const source = readFileSync(new URL('./MondayBriefing.tsx', import.meta.url), 'utf-8');

function input(overrides: Partial<MondayBriefingChipInput> = {}): MondayBriefingChipInput {
  return {
    phase: 'regular_season',
    week: 8,
    dynastySeed: 42,
    latestResult: 'win',
    latestTeamScore: 31,
    latestOpponentScore: 17,
    recentResults: ['win'],
    ...overrides,
  };
}

describe('MondayBriefing Chip integration', () => {
  it('selects the clean-win weekly catalog line deterministically', { timeout: 15_000 }, () => {
    const entry = selectMondayBriefingChipDialogue(input());

    expect(entry.id).toBe('chip.weekly.cleanWin');
    expect(entry.text).toContain(
      'That was a grown-up win. Not perfect. Better than perfect, actually — repeatable.',
    );
  });

  it('selects ugly-win and losing-streak variants from briefing context', { timeout: 15_000 }, () => {
    expect(
      selectMondayBriefingChipDialogue(input({
        latestResult: 'win',
        latestTeamScore: 17,
        latestOpponentScore: 16,
      })).id,
    ).toBe('chip.weekly.uglyWin');

    expect(
      selectMondayBriefingChipDialogue(input({
        latestResult: 'loss',
        latestTeamScore: 13,
        latestOpponentScore: 20,
        recentResults: ['loss', 'loss', 'loss'],
      })).id,
    ).toBe('chip.weekly.threeLossStreak');
  });

  it('renders Chip intro and outro slots without replacing briefing panels', { timeout: 15_000 }, () => {
    expect(source).toContain('data-chip-monday-briefing="intro"');
    expect(source).toContain('data-chip-monday-briefing="outro"');
    expect(source).toContain('<ActionCenter');
    expect(source).toContain('title="Team Record"');
    expect(source).toContain('title="Narrative Pulse"');
  });

  it('guards Chip briefing commentary behind the existing feature flag', { timeout: 15_000 }, () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'false');

    expect(source).toContain('isChipFeatureEnabled()');
    expect(source).toContain('chipBriefingEnabled');
  });
});
