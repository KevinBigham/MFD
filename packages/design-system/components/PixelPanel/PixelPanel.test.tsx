import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PixelPanel } from './PixelPanel';

describe('PixelPanel', () => {
  it('renders a plain title with no disclosure by default', () => {
    const markup = renderToStaticMarkup(<PixelPanel title="Roster Sources"><p>Body copy</p></PixelPanel>);

    expect(markup).toContain('ROSTER SOURCES');
    expect(markup).toContain('Body copy');
    expect(markup).not.toContain('<details');
    expect(markup).not.toContain('data-mfd-panel-toggle');
  });

  it('can start collapsed: a native disclosure whose title stays visible and whose body stays in the DOM', () => {
    const markup = renderToStaticMarkup(
      <PixelPanel title="Roster Sources" collapsible defaultCollapsed><p>Body copy</p></PixelPanel>,
    );

    expect(markup).toContain('<details data-mfd-panel-details="true">');
    expect(markup).not.toContain('<details data-mfd-panel-details="true" open');
    expect(markup).toContain('<summary data-mfd-panel-toggle="true"');
    expect(markup).toContain('ROSTER SOURCES');
    expect(markup).toContain('Body copy');
  });

  it('collapsible without defaultCollapsed starts open', () => {
    const markup = renderToStaticMarkup(<PixelPanel title="Roster Sources" collapsible><p>Body copy</p></PixelPanel>);

    expect(markup).toContain('<details data-mfd-panel-details="true" open="">');
    expect(markup).toContain('Body copy');
  });

  it('ignores collapsible when there is no title', () => {
    const markup = renderToStaticMarkup(<PixelPanel collapsible defaultCollapsed><p>Body copy</p></PixelPanel>);

    expect(markup).not.toContain('<details');
    expect(markup).toContain('Body copy');
  });

  it('has no hooks, so tests and tools can call it as a plain function', () => {
    expect(() => PixelPanel({ title: 'Roster Sources', collapsible: true, defaultCollapsed: true, children: null })).not.toThrow();
  });
});
