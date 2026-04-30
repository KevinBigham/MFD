import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('SadPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="sad" />);

    expect(markup).toContain('data-chip-pose="sad"');
    expect(markup).toContain('data-chip-pose-art="sad"');
  });

  it('adds the sad head variant class to the base head group', () => {
    const markup = renderToStaticMarkup(<Chip pose="sad" />);

    expect(markup).toContain('mfd-chip-svg__head--sad');
  });

  it('renders and styles the red mic-tip glow', () => {
    const markup = renderToStaticMarkup(<Chip pose="sad" />);

    expect(markup).toContain('mfd-chip-svg__mic-tip--sad');
    expect(css()).toContain(".mfd-chip[data-chip-pose='sad'] .mfd-chip-svg__mic-tip");
    expect(css()).toContain('fill: var(--mfd-red)');
  });

  it('marks reduced motion without dropping the sad pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="sad" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="sad"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="sad" ariaLabel="Chip reacts to a loss" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip reacts to a loss"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="sad" size="lg" />);

    expect(markup).toContain('width="144"');
    expect(markup).toContain('height="144"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
