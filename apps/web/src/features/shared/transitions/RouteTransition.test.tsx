import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RouteTransitionFrame, getRouteTransitionStyle } from './RouteTransition';

describe('RouteTransition', () => {
  it('includes the route enter animation when motion is allowed', () => {
    const style = getRouteTransitionStyle(false);
    expect(style.animation).toContain('mfdRouteEnter');
  });

  it('disables animation when reduced motion is requested', () => {
    const style = getRouteTransitionStyle(true);
    expect(style.animation).toBe('none');
    expect(style.transform).toBe('none');
  });

  it('renders a keyed route wrapper', () => {
    const markup = renderToStaticMarkup(
      <RouteTransitionFrame pathname="/broadcast" reducedMotion={false}>
        <div>Broadcast</div>
      </RouteTransitionFrame>,
    );

    expect(markup).toContain('data-route-transition="/broadcast"');
    expect(markup).toContain('Broadcast');
    expect(markup).toContain('mfdRouteEnter');
  });
});
