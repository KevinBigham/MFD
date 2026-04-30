import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ApologyTourThread } from '@mfd/engine';
import { ApologyTourModalView } from './ApologyTourModal';

function makeThread(overrides: Partial<ApologyTourThread> = {}): ApologyTourThread {
  return {
    id: 'thread-1',
    gameId: 'game-1',
    teamId: 'team-1',
    opponentTeamId: 'team-2',
    namedGameName: 'The Collapse',
    archetype: 'collapse',
    startedYear: 2031,
    startedWeek: 12,
    status: 'active',
    beatsDelivered: ['fan_letter'],
    ...overrides,
  };
}

describe('ApologyTourModalView', () => {
  it('returns null when no thread is provided', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={null}
        teamName="Chicago Blaze"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toBe('');
  });

  it('returns nothing when not open even with a thread', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread()}
        teamName="Chicago Blaze"
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toBe('');
  });

  it('renders the fan letter beat first by default with Day +1 badge and namedGame name interpolated', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread()}
        teamName="Chicago Blaze"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('The Collapse');
    expect(markup).toContain('Fan Letter');
    expect(markup).toContain('Day +1');
    // The fan_letter beat content should resolve from real engine content;
    // check the modal title path interpolated correctly.
    expect(markup).toContain('A four-beat narrative thread following The Collapse.');
  });

  it('honors initialBeatIndex to deep-link into a later beat (Day +3 owner email)', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread()}
        teamName="Chicago Blaze"
        open
        initialBeatIndex={2}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Owner Email');
    expect(markup).toContain('Day +3');
  });

  it('renders the resolution-resolved variant for resolved threads with a green RESOLVED badge', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread({ status: 'resolved', beatsDelivered: ['fan_letter', 'beat_column', 'owner_email', 'resolution'] })}
        teamName="Chicago Blaze"
        open
        initialBeatIndex={3}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Resolution');
    expect(markup).toContain('Day +7');
    expect(markup).toContain('RESOLVED');
    expect(markup).not.toContain('ESCALATED');
  });

  it('renders the resolution-escalated variant for escalated threads with a red ESCALATED badge', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread({ status: 'escalated', beatsDelivered: ['fan_letter', 'beat_column', 'owner_email', 'resolution'] })}
        teamName="Chicago Blaze"
        open
        initialBeatIndex={3}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('ESCALATED');
    expect(markup).not.toContain('>RESOLVED<');
  });

  it('renders four progress dots with the correct one marked active', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread()}
        teamName="Chicago Blaze"
        open
        initialBeatIndex={1}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('apology-tour-progress-fan_letter');
    expect(markup).toContain('apology-tour-progress-beat_column-active');
    expect(markup).toContain('apology-tour-progress-owner_email');
    expect(markup).toContain('apology-tour-progress-resolution');
  });

  it('disables Back on the first beat and shows a Next CTA pointing at the next beat', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread()}
        teamName="Chicago Blaze"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('apology-tour-back');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Next (Beat Writer Column)');
    expect(markup).not.toContain('apology-tour-close');
  });

  it('shows a Close Tour CTA on the final resolution beat instead of Next', () => {
    const markup = renderToStaticMarkup(
      <ApologyTourModalView
        thread={makeThread({ status: 'resolved', beatsDelivered: ['fan_letter', 'beat_column', 'owner_email', 'resolution'] })}
        teamName="Chicago Blaze"
        open
        initialBeatIndex={3}
        onOpenChange={vi.fn()}
      />,
    );

    expect(markup).toContain('apology-tour-close');
    expect(markup).toContain('Close Tour');
    expect(markup).not.toContain('apology-tour-next');
  });
});
