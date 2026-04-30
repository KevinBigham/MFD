import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('DisappointedPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="disappointed" />);

    expect(markup).toContain('data-chip-pose="disappointed"');
    expect(markup).toContain('data-chip-pose-art="disappointed"');
  });

  it('contains wincing eyes and a flat mouth overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="disappointed" />);

    expect(markup).toContain('mfd-chip-svg__disappointed-eye--left');
    expect(markup).toContain('mfd-chip-svg__flat-mouth--disappointed');
  });

  it('turns the head away through pose CSS', () => {
    expect(css()).toContain(".mfd-chip[data-chip-pose='disappointed'] .mfd-chip-svg__head");
    expect(css()).toContain('transform-origin: 50% 80%');
  });

  it('marks reduced motion without dropping the disappointed pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="disappointed" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="disappointed"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="disappointed" ariaLabel="Chip winces after a decision" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip winces after a decision"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="disappointed" size="lg" />);

    expect(markup).toContain('width="144"');
    expect(markup).toContain('height="144"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
