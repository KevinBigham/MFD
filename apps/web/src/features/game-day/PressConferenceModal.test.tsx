import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PressConferenceQueueEntry } from '@mfd/engine';
import { PressConferenceModal, buildPressConferenceChipCopy, getPressConferenceChipPose } from './PressConferenceModal';

const entry: PressConferenceQueueEntry = {
  conferenceId: 'press-1',
  teamId: 'CHI',
  year: 2030,
  week: 9,
  speaker: 'Marcus Webb',
  topic: 'statement win',
  scenario: 'win_blowout',
  responses: {
    high: ['We expected to dictate the pace tonight.'],
    mid: ['The room trusted the plan and executed cleanly.'],
    low: ['We did our jobs and move on to next week.'],
  },
};

describe('PressConferenceModal', () => {
  it('renders nothing when closed or missing an entry', () => {
    expect(renderToStaticMarkup(
      <PressConferenceModal
        open={false}
        entry={entry}
        activeTier="mid"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )).toBe('');

    expect(renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={null}
        activeTier="mid"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )).toBe('');
  });

  it('renders speaker, topic, and scenario metadata', () => {
    const markup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="mid"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('POSTGAME PRESS');
    expect(markup).toContain('Marcus Webb');
    expect(markup).toContain('statement win');
    expect(markup).toContain('win blowout');
  });

  it('renders Chip as the press host', () => {
    const markup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="mid"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('data-press-chip-host="true"');
    expect(markup).toContain('data-press-chip-pose="reviewing-tablet"');
    expect(markup).toContain('Optional: choose a public answer for this saved press record.');
    expect(markup).toContain('Where: Quote Style, then Response Options.');
    expect(markup).toContain('Consequence: Measured saves a balanced answer without adding a promise or deflection; result and next week do not change.');
    expect(markup).not.toContain('Must Do: choose the public answer');
    expect(markup).not.toContain('balanced quote');
    expect(markup).not.toContain('podium entry');
    expect(markup).not.toContain('timed effects');
    expect(markup).not.toContain('Choose the public quote only.');
    expect(markup).not.toContain('Choose the public answer you want saved');
    expect(markup).not.toContain('score, owner reaction, player effects, news, social reaction, and next week are already final.');
    expect(markup).not.toContain('middle answer');
    expect(markup).not.toContain('only to save this press record');
  });

  it('explains each press tone before the quote is saved', () => {
    expect(buildPressConferenceChipCopy('high', false)).toBe(
      'Optional: choose a public answer for this saved press record. Where: Quote Style, then Response Options. Consequence: High Ambition saves the strongest promise in this press record; result and next week do not change.',
    );
    expect(buildPressConferenceChipCopy('mid', false)).toContain('Consequence: Measured saves a balanced answer without adding a promise or deflection; result and next week do not change.');
    expect(buildPressConferenceChipCopy('mid', false)).not.toContain('balanced quote');
    expect(buildPressConferenceChipCopy('mid', false)).not.toContain('middle answer');
    expect(buildPressConferenceChipCopy('low', false)).toContain('Consequence: Low Key saves the least committal answer in this press record; result and next week do not change.');
  });

  it('keeps submitted press guidance explicit about quote-only consequences', () => {
    const copy = buildPressConferenceChipCopy('high', true);

    expect(copy).toBe(
      'Optional: open the press record later for the saved quote. Consequence: score, owner reaction, player effects, news, social reaction, and next week do not change.',
    );
    expect(copy).not.toMatch(/if you want/i);
  });

  it('explains that press answers are quote-only, not score or player changes', () => {
    const markup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="mid"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('WHAT THIS CHANGES');
    expect(markup).toContain('Public quote only');
    expect(markup).toContain('No gameplay change');
    expect(markup).toContain('Result already final');
    expect(markup).toContain('QUOTE STYLE');
    expect(markup).toContain('Your answer changes the saved quote shown for this press moment.');
    expect(markup).toContain('The game result, headline, owner reaction, player changes, news, social reaction, and next-week state are already final.');
    expect(markup).not.toMatch(/Receipt Source|podium tone|podium queue|selectedTier|selectedResponse|event-log receipt|timed effects|Press Tone/i);
  });

  it('maps press tier severity to deterministic Chip poses', () => {
    expect(getPressConferenceChipPose('high', false)).toBe('skeptical');
    expect(getPressConferenceChipPose('mid', false)).toBe('reviewing-tablet');
    expect(getPressConferenceChipPose('low', false)).toBe('note-taking');
    expect(getPressConferenceChipPose('high', true)).toBe('fist-bump');
  });

  it('keeps the Chip portrait static under reduced motion', () => {
    const markup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="high"
        reducedMotion
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('data-press-chip-host="true"');
    expect(markup).toContain('data-press-chip-pose="reviewing-tablet"');
    expect(markup).toContain('data-chip-motion="reduced"');
    expect(getPressConferenceChipPose('low', false, true)).toBe('reviewing-tablet');
  });

  it('renders all three ambition tier controls', () => {
    const markup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="mid"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('High Ambition');
    expect(markup).toContain('Measured');
    expect(markup).toContain('Low Key');
  });

  it('shows the active tier response options', () => {
    const highMarkup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="high"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );
    const lowMarkup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="low"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(highMarkup).toContain('We expected to dictate the pace tonight.');
    expect(lowMarkup).toContain('We did our jobs and move on to next week.');
  });

  it('renders the authored prompt bank when prompts are provided', () => {
    const markup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={entry}
        activeTier="mid"
        promptBank={[
          'How did Marcus Webb keep the room composed after the statement win?',
        ]}
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('PROMPT BANK');
    expect(markup).toContain('How did Marcus Webb keep the room composed after the statement win?');
  });

  it('shows the previously selected response when present', () => {
    const markup = renderToStaticMarkup(
      <PressConferenceModal
        open
        entry={{
          ...entry,
          selectedTier: 'mid',
          selectedResponse: 'The room trusted the plan and executed cleanly.',
        }}
        activeTier="mid"
        onTierChange={vi.fn()}
        onRespond={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('LAST ANSWER');
    expect(markup).toContain('The room trusted the plan and executed cleanly.');
  });

  it('renders the lock-in pose helper for submitted responses', () => {
    expect(getPressConferenceChipPose('mid', true, true)).toBe('fist-bump');
  });
});
