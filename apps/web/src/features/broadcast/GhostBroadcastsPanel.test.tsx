import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GhostBroadcastsPanel,
  type GhostBroadcastLineSummary,
} from './GhostBroadcastsPanel';

const HOF_LINE: GhostBroadcastLineSummary = {
  commentatorName: 'Jet Stream',
  commentary: 'I scored a touchdown just like that back in 2031.',
  trigger: 'touchdown',
  source: 'hof',
};

const CALLOUT_LINE: GhostBroadcastLineSummary = {
  commentatorName: 'Booth Alert',
  commentary: 'They hit the panic button and never looked back.',
  trigger: 'quarter_break',
  source: 'callout',
};

describe('GhostBroadcastsPanel', () => {
  it('renders the toggle ON by default and surfaces both HOF + callout sections when lines are present', () => {
    const markup = renderToStaticMarkup(
      <GhostBroadcastsPanel
        lines={[HOF_LINE, CALLOUT_LINE]}
        storage={null}
      />,
    );

    expect(markup).toContain('Commentary: ON');
    expect(markup).toContain('HALL OF FAME VOICES');
    expect(markup).toContain('JET STREAM');
    expect(markup).toContain('I scored a touchdown just like that back in 2031.');
    expect(markup).toContain('BOOTH ALERTS');
    expect(markup).toContain('They hit the panic button and never looked back.');
  });

  it('honors initialPrefs.enabled = false and hides every line panel', () => {
    const markup = renderToStaticMarkup(
      <GhostBroadcastsPanel
        lines={[HOF_LINE, CALLOUT_LINE]}
        storage={null}
        initialPrefs={{ enabled: false, lastUpdated: '' }}
      />,
    );

    expect(markup).toContain('Commentary: OFF');
    expect(markup).toContain('Ghost commentary is hidden on this device.');
    expect(markup).not.toContain('HALL OF FAME VOICES');
    expect(markup).not.toContain('BOOTH ALERTS');
    expect(markup).not.toContain('Jet Stream');
  });

  it('renders an empty-state message when enabled but no lines were emitted', () => {
    const markup = renderToStaticMarkup(
      <GhostBroadcastsPanel lines={[]} storage={null} />,
    );

    expect(markup).toContain('Commentary: ON');
    expect(markup).toContain('No ghost commentary in the latest broadcast.');
  });

  it('treats Booth Alert without a source flag as a callout (legacy compatibility)', () => {
    const legacyCallout: GhostBroadcastLineSummary = {
      commentatorName: 'Booth Alert',
      commentary: 'Watch the protection scheme break down here.',
      trigger: 'big_play',
    };
    const markup = renderToStaticMarkup(
      <GhostBroadcastsPanel lines={[legacyCallout]} storage={null} />,
    );

    expect(markup).toContain('BOOTH ALERTS');
    expect(markup).toContain('Watch the protection scheme break down here.');
    expect(markup).not.toContain('HALL OF FAME VOICES');
  });

  it('treats unsourced non-Booth-Alert lines as HOF (legacy compatibility)', () => {
    const legacyHof: GhostBroadcastLineSummary = {
      commentatorName: 'Echo Marx',
      commentary: 'That throw windowed in like a vintage 2024 strike.',
      trigger: 'touchdown',
    };
    const markup = renderToStaticMarkup(
      <GhostBroadcastsPanel lines={[legacyHof]} storage={null} />,
    );

    expect(markup).toContain('HALL OF FAME VOICES');
    expect(markup).toContain('ECHO MARX');
    expect(markup).not.toContain('BOOTH ALERTS');
  });

  it('humanizes trigger names so no internal snake_case leaks into the panel', () => {
    const lines: GhostBroadcastLineSummary[] = [
      { ...HOF_LINE, trigger: 'quarter_break' },
      { ...CALLOUT_LINE, trigger: 'game_end' },
    ];
    const markup = renderToStaticMarkup(<GhostBroadcastsPanel lines={lines} storage={null} />);

    expect(markup).toContain('quarter break');
    expect(markup).toContain('game end');
    expect(markup).not.toContain('>quarter_break<');
    expect(markup).not.toContain('>game_end<');
  });

  it('caps each section at six lines and surfaces a "+N more" hint when truncated', () => {
    const lines: GhostBroadcastLineSummary[] = Array.from({ length: 9 }, (_, idx) => ({
      ...HOF_LINE,
      commentatorName: `Hofer ${idx}`,
      commentary: `Line ${idx}`,
    }));
    const markup = renderToStaticMarkup(<GhostBroadcastsPanel lines={lines} storage={null} />);

    expect(markup).toContain('+3 more in the broadcast.');
    expect(markup).toContain('HOFER 0');
    expect(markup).toContain('HOFER 5');
    expect(markup).not.toContain('HOFER 6');
  });
});
