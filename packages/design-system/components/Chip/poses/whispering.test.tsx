import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('WhisperingPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="whispering" />);

    expect(markup).toContain('data-chip-pose="whispering"');
    expect(markup).toContain('data-chip-pose-art="whispering"');
  });

  it('contains the hand-over-mouth cluster', () => {
    const markup = renderToStaticMarkup(<Chip pose="whispering" />);

    expect(markup).toContain('mfd-chip-svg__hand-over-mouth--whispering');
    expect(markup).toContain('data-chip-whisper="covered-mouth"');
  });

  it('hides the tablet and leans forward through pose CSS', () => {
    expect(css()).toContain(".mfd-chip[data-chip-pose='whispering'] .mfd-chip-svg__tablet");
    expect(css()).toContain(".mfd-chip[data-chip-pose='whispering'] .mfd-chip-svg__figure");
  });

  it('marks reduced motion without dropping the whispering pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="whispering" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="whispering"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="whispering" ariaLabel="Chip whispers scouting context" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip whispers scouting context"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="whispering" size="lg" />);

    expect(markup).toContain('width="144"');
    expect(markup).toContain('height="144"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
