import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TutorialOverlay } from './TutorialOverlay';

describe('TutorialOverlay', () => {
  it('renders the step counter, prompt, and skip control', () => {
    const markup = renderToStaticMarkup(
      <TutorialOverlay
        step={{
          id: 'assign_training',
          title: 'Assign Training',
          description: 'Back on the roster, give a player a weekly training focus.',
          targetScreen: '/roster',
          targetElement: null,
          action: 'training:assign',
          completed: false,
        }}
        stepIndex={5}
        totalSteps={12}
        onNext={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(markup).toContain('TUTORIAL');
    expect(markup).toContain('5/12');
    expect(markup).toContain('ASSIGN TRAINING');
    expect(markup).toContain('Assign a weekly training focus');
    expect(markup).toContain('Skip Tutorial');
  });
});
