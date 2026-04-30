import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from '../Chip';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('GreetingPose', () => {
  it('renders through Chip without throwing in animated mode', () => {
    const markup = renderToStaticMarkup(<Chip pose="greeting" />);

    expect(markup).toContain('data-chip-pose="greeting"');
    expect(markup).toContain('data-chip-pose-art="greeting"');
  });

  it('contains the greeting pose-specific class hook', () => {
    const markup = renderToStaticMarkup(<Chip pose="greeting" />);

    expect(markup).toContain('mfd-chip-svg__arm-overlay--greeting');
    expect(markup).toContain('data-chip-greeting-pointer="camera"');
  });

  it('makes the smile mouth visible through the pose CSS', () => {
    expect(css()).toContain(".mfd-chip[data-chip-pose='greeting'] .mfd-chip-svg__mouth--smile");
  });

  it('marks reduced motion without dropping the greeting pose', () => {
    const markup = renderToStaticMarkup(<Chip pose="greeting" reducedMotion />);

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).toContain('data-chip-pose="greeting"');
  });

  it('passes ariaLabel through to the outer image wrapper', () => {
    const markup = renderToStaticMarkup(<Chip pose="greeting" ariaLabel="Chip greets the player" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Chip greets the player"');
  });

  it('renders the large SVG contract while preserving the CRT overlay', () => {
    const markup = renderToStaticMarkup(<Chip pose="greeting" size="lg" />);

    expect(markup).toContain('width="144"');
    expect(markup).toContain('height="144"');
    expect(markup).toContain('viewBox="0 0 160 220"');
    expect(markup).toContain('data-chip-crt-overlay="true"');
  });
});
