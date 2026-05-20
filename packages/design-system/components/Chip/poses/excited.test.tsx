import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('ExcitedPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="excited" />);

    expect(markup).toContain('data-chip-pose="excited"');
    expect(markup).toContain('data-chip-pose-art="excited"');
  });

  it('contains both raised fists', () => {
    const markup = renderToStaticMarkup(<Chip pose="excited" />);

    expect(markup).toContain('mfd-chip-svg__fist--excited-left');
    expect(markup).toContain('mfd-chip-svg__fist--excited-right');
  });

  it('uses a distinct excited bounce keyframe', () => {
    expect(css()).toContain('@keyframes mfd-chip-excited-bounce');
    expect(css()).toContain(".mfd-chip[data-chip-motion='animated'][data-chip-pose='excited'] .mfd-chip-svg__figure");
  });

  it('marks reduced motion without dropping the excited pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="excited" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="excited"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="excited" ariaLabel="Chip pumps both fists" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip pumps both fists"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="excited" size="lg" />);

    expect(markup).toContain('width="176"');
    expect(markup).toContain('height="176"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
