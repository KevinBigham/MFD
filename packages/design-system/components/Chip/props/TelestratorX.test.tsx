import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TelestratorX } from './TelestratorX';

const css = () => readFileSync(join(__dirname, '../Chip.css'), 'utf8');

describe('TelestratorX', () => {
  it('renders five chunky X segments by default', () => {
    const markup = renderToStaticMarkup(<TelestratorX />);

    expect(markup.match(/data-chip-telestrator-segment=/g)).toHaveLength(5);
    expect(markup).toContain('shape-rendering="crispEdges"');
  });

  it('uses the cyan token for the default fill', () => {
    expect(css()).toContain('.mfd-chip-svg__telestrator-x-segment');
    expect(css()).toContain('fill: var(--mfd-cyan)');
  });

  it('marks drawing mode for staggered animation', () => {
    const markup = renderToStaticMarkup(<TelestratorX drawing />);

    expect(markup).toContain('data-chip-telestrator-drawing="true"');
    expect(markup).toContain('mfd-chip-svg__telestrator-x--drawing');
  });

  it('renders without drawing mode by default', () => {
    const markup = renderToStaticMarkup(<TelestratorX />);

    expect(markup).toContain('data-chip-telestrator-drawing="false"');
    expect(markup).not.toContain('mfd-chip-svg__telestrator-x--drawing');
  });

  it('supports a caller-provided className and origin', () => {
    const markup = renderToStaticMarkup(<TelestratorX className="custom-x" x={10} y={20} />);

    expect(markup).toContain('custom-x');
    expect(markup).toContain('x="10"');
    expect(markup).toContain('y="20"');
  });
});
