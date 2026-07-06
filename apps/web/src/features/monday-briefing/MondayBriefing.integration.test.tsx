import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import {
  chipBriefingDetails,
  chipBriefingOutro,
  selectMondayBriefingChipDialogue,
  type MondayBriefingChipInput,
} from './MondayBriefing';
import { buildWeeklyGuidance, weeklyGuidanceToDialogueEntry } from '../companion/weeklyGuidance';
import type { DialogueCatalogEntry } from '../companion/dialogue/types';

const source = readFileSync(new URL('./MondayBriefing.tsx', import.meta.url), 'utf-8');

function input(overrides: Partial<MondayBriefingChipInput> = {}): MondayBriefingChipInput {
  return {
    phase: 'regular_season',
    week: 8,
    dynastySeed: 42,
    record: '5-3',
    opponentName: 'Austin Armadillos',
    injuryCount: 1,
    pendingDecisionCount: 0,
    capSpace: 12,
    difficulty: 'pro',
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
    expect(entry.text).toContain('Must Do: set injury status, first backups, and safer calls before kickoff. Where: Roster, Depth Chart, Game Plan. Consequence: unassigned backups enter saved calls.');
    expect(entry.text).toContain('Scout Austin Armadillos now');
    expect(entry.text).toContain('choices affect depth, morale, cap space, and Game Plan');
    expect(entry.contextDetails).toEqual(expect.arrayContaining([
      expect.stringContaining('Must Do: set injury status, first backups'),
      expect.stringContaining('Recommended: Set injured roles, first backups'),
      expect.stringContaining('Optional: Make any legal roster, depth chart, training'),
      expect.stringContaining('prioritize moves that change lineup, cap space, market offer, staff plan, recovery, or matchup'),
      expect.stringContaining('Optional later: Open awards, records, and history after you fix or accept Monday Briefing and Action Center notes'),
      expect.stringContaining('Consequence: Uncovered injuries put an unassigned first backup on the field or break the saved Game Plan'),
    ]));
    expect(entry.text).not.toContain('only if injuries change calls');
    expect(chipBriefingDetails(entry)).toEqual(expect.arrayContaining([
      expect.stringContaining('Must Do:'),
      expect.stringContaining('Recommended:'),
      expect.stringContaining('Optional:'),
      expect.stringContaining('Consequence:'),
      expect.stringContaining('Where:'),
    ]));
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
    expect(source).toContain('data-chip-monday-guidance-details="true"');
    expect(source).toContain('data-chip-monday-briefing="outro"');
    expect(source).toContain('<ActionCenter');
    expect(source.indexOf('<ActionCenter')).toBeLessThan(source.indexOf('data-chip-monday-briefing="intro"'));
    expect(source).toContain('title="Team Record"');
    expect(source).toContain('title="Season Signals"');
    expect(source).toContain('selectNarrativeIntensity');
  });

  it('guards Chip briefing commentary behind the existing feature flag', { timeout: 15_000 }, () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'false');

    expect(source).toContain('isChipFeatureEnabled()');
    expect(source).toContain('chipBriefingEnabled');
  });

  it('keeps Chip outro copy focused on next steps and consequences', { timeout: 15_000 }, () => {
    const uglyWin = selectMondayBriefingChipDialogue(input({
      latestResult: 'win',
      latestTeamScore: 17,
      latestOpponentScore: 16,
    }));
    const cleanWin = selectMondayBriefingChipDialogue(input());
    const fallbackUglyWin: DialogueCatalogEntry = {
      id: 'chip.weekly.uglyWin',
      beat: 0,
      pose: 'pointing-at-tape',
      text: 'Must Do: open Postgame Recap before Advance Week. Where: Post-Week Command Deck, then Roster, Depth Chart, Game Plan. Consequence: next week uses unfixed injuries, morale, and matchup calls.',
      archetype: 'weekly',
    };
    const fallbackCleanWin: DialogueCatalogEntry = {
      id: 'chip.weekly.cleanWin',
      beat: 0,
      pose: 'pointing-at-tape',
      text: 'Must Do: set injury status, first backups, and safer calls before kickoff. Where: Roster, Depth Chart, Game Plan. Consequence: unassigned backups enter saved calls.',
      archetype: 'weekly',
    };
    const fallbackGeneric: DialogueCatalogEntry = {
      id: 'chip.weekly.default',
      beat: 0,
      pose: 'reviewing-tablet',
      text: 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.',
      archetype: 'weekly',
    };

    expect(chipBriefingOutro(uglyWin)).toContain('Must Do: Cover injuries before Game Plan.');
    expect(chipBriefingOutro(uglyWin)).toContain('Recommended: Set first backups or legal replacement.');
    expect(chipBriefingOutro(uglyWin)).toContain('Where: Roster then Depth Chart; Game Plan if calls change.');
    expect(chipBriefingOutro(fallbackUglyWin)).toContain('fix the missed assignment that almost cost the game');
    expect(chipBriefingOutro(fallbackUglyWin)).toContain('Roster, Medical, or Game Plan changes');
    expect(chipBriefingOutro(fallbackUglyWin)).toContain('same mistake decides next week');
    expect(chipBriefingOutro(fallbackUglyWin)).not.toContain('same weakness');
    expect(chipBriefingOutro(fallbackUglyWin)).not.toContain('game-plan verification');
    expect(chipBriefingOutro(fallbackCleanWin)).toBe('Next: keep what worked. Optional moves stay open before Advance Week; prioritize depth, cap, scouting, or staff changes that improve the next matchup.');
    expect(chipBriefingOutro(fallbackGeneric)).toBe('Next: clear Must Do first, resolve or accept Recommended items, then prioritize Optional moves that affect lineup, cap, market, staff, or matchup before Advance Week.');
    expect(chipBriefingOutro(fallbackCleanWin)).not.toMatch(/should only|only when/i);
    expect(chipBriefingOutro(fallbackGeneric)).not.toMatch(/should only|only when|Recommended risks/i);
    expect(chipBriefingOutro(cleanWin)).toContain('Where: Roster then Depth Chart; Game Plan if calls change.');
    expect(chipBriefingOutro(cleanWin)).toContain('Optional: Roster, depth, cap, market, staff, and matchup moves stay open before Advance Week.');
    expect(chipBriefingOutro(cleanWin)).toContain('Consequence: Unassigned first backup starts.');
    expect(chipBriefingOutro(cleanWin).length).toBeLessThanOrEqual(310);
    expect(chipBriefingOutro(cleanWin)).not.toContain('Desk note');
    expect(chipBriefingOutro(cleanWin)).not.toContain('Where: undefined');
    expect(chipBriefingOutro(cleanWin)).not.toContain('depth risk');
    expect(chipBriefingOutro(cleanWin)).not.toContain('roster/depth');
    expect(chipBriefingOutro(cleanWin)).not.toContain('Only lineup/cap/market/staff/matchup');
    expect(chipBriefingOutro(cleanWin)).not.toContain('Open only screens with named issues');
    expect(chipBriefingOutro(cleanWin)).not.toContain('Legal moves stay open.');
    expect(chipBriefingOutro(cleanWin)).not.toMatch(/named issues|named-issue|Recap-named issue|matchup problem|Game Plan issue|fix the issue/i);
    expect(source).not.toMatch(/Optional moves should only|Optional moves only when/i);
    expect(source).not.toMatch(/weekly work/i);
    expect(chipBriefingOutro(selectMondayBriefingChipDialogue(input({
      injuryCount: 0,
      capSpace: 4,
    })))).toContain('Recommended: Scout opponent injuries, backup order, cap space, and matchup calls.');
    expect(chipBriefingOutro(selectMondayBriefingChipDialogue(input({
      injuryCount: 0,
      capSpace: 4,
    })))).not.toContain('Use opponent/cap notes only if they change this week.');
    expect(chipBriefingOutro(selectMondayBriefingChipDialogue(input({
      injuryCount: 0,
      capSpace: 4,
    })))).not.toContain('Scout opponent/cap');
    expect(chipBriefingOutro(selectMondayBriefingChipDialogue(input({
      injuryCount: 0,
      capSpace: 4,
    })))).toContain('Consequence: Tight cap space blocks later fixes.');
    expect(chipBriefingOutro(selectMondayBriefingChipDialogue(input({
      pendingDecisionCount: 2,
    })))).toContain('Consequence: Ignored decisions expire, remove offers, or lock weaker choices.');
    expect(chipBriefingOutro(selectMondayBriefingChipDialogue(input({
      pendingDecisionCount: 2,
    })))).toContain('Where: Inbox, Action Center, or highlighted screen badges.');
    expect(chipBriefingOutro(weeklyGuidanceToDialogueEntry(buildWeeklyGuidance({
      outcome: 'cleanWin',
      currentWeek: 8,
      eventTrigger: 'gameComplete',
    })))).toContain('Consequence: Skipping Recap leaves injuries, morale swings, and matchup notes unseen before Game Plan locks.');
    expect(chipBriefingOutro(weeklyGuidanceToDialogueEntry(buildWeeklyGuidance({
      outcome: 'blowoutLoss',
      currentWeek: 8,
    })))).toContain('Consequence: Skipping Recap, Roster, or Game Plan repeats matchup, injury, or starter mistakes by kickoff.');
    expect(chipBriefingOutro(weeklyGuidanceToDialogueEntry(buildWeeklyGuidance({
      outcome: 'cleanWin',
      currentWeek: 8,
    })))).toContain('Consequence: Skipping Briefing locks a named injury, unassigned first backup, tight cap choice, or uncovered matchup call.');
    expect(source).not.toMatch(/stale prep|splash moves/i);
    expect(source).not.toMatch(/\bcap room\b/i);
    expect(source).not.toMatch(/Can wait:|Later:|Awards and history can wait|No required action is stopping Advance Week|screen deadline|screen's deadline|owner pressure|roster\/depth|injured roles\/backups/i);
    expect(source).not.toMatch(/review Season Recap|Skipping the weekly review|Skipping the review|Check cap|Flagged decision screen|bad call/i);
    expect(chipBriefingOutro(selectMondayBriefingChipDialogue(input({
      latestResult: 'loss',
      latestTeamScore: 13,
      latestOpponentScore: 28,
      recentResults: ['L', 'L', 'L'],
    })))).not.toContain('loose week');
  });

  it('keeps Monday Briefing copy out of vague room, board, wire, and heat shorthand', { timeout: 15_000 }, () => {
    const threeLoss = selectMondayBriefingChipDialogue(input({
      latestResult: 'loss',
      latestTeamScore: 13,
      latestOpponentScore: 20,
      recentResults: ['loss', 'loss', 'loss'],
      injuryCount: 0,
    }));

    expect(chipBriefingOutro(threeLoss)).toContain('owner patience');
    expect(chipBriefingOutro(threeLoss)).not.toContain('raises owner pressure');
    expect(source).not.toMatch(/owner heat|room temperature|training room is quiet|crowding the wire|race board|prep board|Monday board/i);
  });
});
