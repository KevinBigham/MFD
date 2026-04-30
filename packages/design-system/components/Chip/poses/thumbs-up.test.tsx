import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('ThumbsUpPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="thumbs-up" />);

    expect(markup).toContain('data-chip-pose="thumbs-up"');
    expect(markup).toContain('data-chip-pose-art="thumbs-up"');
  });

  it('contains the chunky thumb pixel cluster', () => {
    const markup = renderToStaticMarkup(<Chip pose="thumbs-up" />);

    expect(markup).toContain('mfd-chip-svg__thumb-pixel--thumbs-up');
    expect(markup).toContain('shape-rendering="crispEdges"');
  });

  it('uses the gold token for the thumb accent', () => {
    expect(css()).toContain('.mfd-chip-svg__thumb-pixel--thumbs-up');
    expect(css()).toContain('fill: var(--mfd-gold)');
  });

  it('marks reduced motion without dropping the thumbs-up pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="thumbs-up" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="thumbs-up"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="thumbs-up" ariaLabel="Chip gives a thumbs up" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip gives a thumbs up"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="thumbs-up" size="lg" />);

    expect(markup).toContain('width="144"');
    expect(markup).toContain('height="144"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
