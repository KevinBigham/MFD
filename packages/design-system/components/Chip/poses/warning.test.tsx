import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('WarningPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="warning" />);

    expect(markup).toContain('data-chip-pose="warning"');
    expect(markup).toContain('data-chip-pose-art="warning"');
  });

  it('contains a pointing hand and pixel watch cluster', () => {
    const markup = renderToStaticMarkup(<Chip pose="warning" />);

    expect(markup).toContain('data-chip-warning-pointer="camera"');
    expect(markup).toContain('mfd-chip-svg__watch-pixel--warning');
  });

  it('furrows the warning brow through pose CSS', () => {
    expect(css()).toContain(".mfd-chip[data-chip-pose='warning'] .mfd-chip-svg__brow--left");
    expect(css()).toContain(".mfd-chip[data-chip-pose='warning'] .mfd-chip-svg__brow--right");
  });

  it('marks reduced motion without dropping the warning pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="warning" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="warning"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="warning" ariaLabel="Chip warns about the cap" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip warns about the cap"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="warning" size="lg" />);

    expect(markup).toContain('width="176"');
    expect(markup).toContain('height="176"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
