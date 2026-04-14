import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContingencyBuilder } from './ContingencyBuilder';

describe('ContingencyBuilder', () => {
  it('renders the sprint trigger and response controls', () => {
    const markup = renderToStaticMarkup(
      <ContingencyBuilder
        teamId="team-1"
        year={2029}
        week={11}
        rules={[]}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Down by X+');
    expect(markup).toContain('Go Air Raid');
    expect(markup).toContain('Add Contingency Rule');
  });

  it('renders legacy rules as preserved but removable', () => {
    const markup = renderToStaticMarkup(
      <ContingencyBuilder
        teamId="team-1"
        year={2029}
        week={11}
        rules={[{
          id: 'legacy-1',
          trigger: 'wind_over_15',
          action: { type: 'switch_offense', scheme: 'run_heavy' },
          label: 'IF WINDY -> RUN HEAVY',
          description: 'Legacy rule',
          legacy: true,
        }]}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('LEGACY');
    expect(markup).toContain('Legacy rules are preserved but not editable here.');
  });
});
