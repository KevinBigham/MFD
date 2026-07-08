import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('SurprisedPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="surprised" />);

    expect(markup).toContain('data-chip-pose="surprised"');
    expect(markup).toContain('data-chip-pose-art="surprised"');
  });

  it('contains hands framing the face', () => {
    const markup = renderToStaticMarkup(<Chip pose="surprised" />);

    expect(markup).toContain('mfd-chip-svg__surprise-hand--left');
    expect(markup).toContain('mfd-chip-svg__surprise-hand--right');
  });

  it('tilts the head and headset through pose CSS', () => {
    expect(css()).toContain(".mfd-chip[data-chip-pose='surprised'] .mfd-chip-svg__head");
    expect(css()).toContain(".mfd-chip[data-chip-pose='surprised'] .mfd-chip-svg__headset");
  });

  it('marks reduced motion without dropping the surprised pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="surprised" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="surprised"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="surprised" ariaLabel="Chip reacts to an upset" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip reacts to an upset"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="surprised" size="lg" />);

    expect(markup).toContain('width="176"');
    expect(markup).toContain('height="176"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
