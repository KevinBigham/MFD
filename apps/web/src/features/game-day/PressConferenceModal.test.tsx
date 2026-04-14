import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PressConferenceQueueEntry } from '@mfd/engine';
import { PressConferenceModal } from './PressConferenceModal';

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
});
