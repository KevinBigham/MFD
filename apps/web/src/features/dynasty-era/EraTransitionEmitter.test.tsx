import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  buildEraTransitionNarrative,
  EraTransitionEmitterView,
  resolveEraTransitionVariant,
  resolveEraTransitionEvent,
  type EraTransitionSnapshot,
} from './EraTransitionEmitter';

const ERA_ONE: EraTransitionSnapshot = {
  id: 'era-1',
  name: 'Foundation Years',
  summary: 'The first chapter.',
  startYear: 2026,
  endYear: 2029,
  variant: 'rebuilding',
};

const ERA_TWO: EraTransitionSnapshot = {
  id: 'era-2',
  name: 'Banner Standard',
  summary: 'The second chapter.',
  startYear: 2030,
  endYear: 2033,
  variant: 'dynasty',
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
    const markup = renderToStaticMarkup(
      <EraTransitionEmitterView
        transition={event}
        reducedMotion={false}
        initialStage="idle"
        onDismiss={() => undefined}
      />,
    );

    expect(markup).toContain('data-era-transition-reveal="true"');
    expect(markup).toContain('data-era-transition-type="dynasty"');
    expect(markup).toContain('BANNER STANDARD');
    expect(markup).toContain('2030 - 2033: The second chapter.');
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
        initialStage="idle"
        onDismiss={() => undefined}
      />,
    );

    expect(markup).toContain('data-reduced-motion="true"');
  });

  it('maps detected era names onto staged reveal variants', () => {
    expect(resolveEraTransitionVariant('Dark Ages')).toBe('fall-from-grace');
    expect(resolveEraTransitionVariant('The Rebuild')).toBe('rebuilding');
    expect(resolveEraTransitionVariant('Golden Rebuild')).toBe('rebuilding');
    expect(resolveEraTransitionVariant('Dynasty Era')).toBe('dynasty');
    expect(resolveEraTransitionVariant('Golden Age')).toBe('golden-age');
    expect(resolveEraTransitionVariant('Playoff Window')).toBe('contender');
  });

  it('keeps the era year range in the staged narrative', () => {
    expect(buildEraTransitionNarrative({ ...ERA_TWO, endYear: null })).toBe('2030 - Present: The second chapter.');
  });
});
