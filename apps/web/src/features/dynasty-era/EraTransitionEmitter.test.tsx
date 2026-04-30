import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EraTransitionEmitterView,
  resolveEraTransitionEvent,
  type EraTransitionSnapshot,
} from './EraTransitionEmitter';

const ERA_ONE: EraTransitionSnapshot = {
  id: 'era-1',
  name: 'Foundation Years',
  summary: 'The first chapter.',
  startYear: 2026,
  endYear: 2029,
};

const ERA_TWO: EraTransitionSnapshot = {
  id: 'era-2',
  name: 'Banner Standard',
  summary: 'The second chapter.',
  startYear: 2030,
  endYear: 2033,
};

describe('EraTransitionEmitter', () => {
  it('renders nothing initially while hidden', () => {
    const markup = renderToStaticMarkup(<EraTransitionEmitterView transition={null} reducedMotion={false} onDismiss={() => undefined} />);

    expect(markup).toBe('');
  });

  it('opens a reveal when the current era changes', () => {
    const event = resolveEraTransitionEvent({
      currentEra: ERA_TWO,
      previousEraId: ERA_ONE.id,
      firedEraIds: new Set(),
    });
    const markup = renderToStaticMarkup(<EraTransitionEmitterView transition={event} reducedMotion={false} onDismiss={() => undefined} />);

    expect(markup).toContain('data-era-transition-reveal="true"');
    expect(markup).toContain('Banner Standard');
  });

  it('does not re-fire for repeated identical era values', () => {
    const event = resolveEraTransitionEvent({
      currentEra: ERA_TWO,
      previousEraId: ERA_TWO.id,
      firedEraIds: new Set(),
    });

    expect(event).toBeNull();
  });

  it('does not re-fire for an era already fired this session', () => {
    const event = resolveEraTransitionEvent({
      currentEra: ERA_TWO,
      previousEraId: ERA_ONE.id,
      firedEraIds: new Set([ERA_TWO.id]),
    });

    expect(event).toBeNull();
  });

  it('passes reduced motion through to the reveal surface', () => {
    const markup = renderToStaticMarkup(
      <EraTransitionEmitterView
        transition={ERA_TWO}
        reducedMotion
        onDismiss={() => undefined}
      />,
    );

    expect(markup).toContain('data-reduced-motion="true"');
  });
});
