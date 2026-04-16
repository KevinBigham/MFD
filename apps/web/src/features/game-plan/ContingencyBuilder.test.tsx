import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MAX_CONTINGENCIES, createContingencyRule } from '@mfd/engine';
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

  it('renders empty-state guidance before a rule is created', () => {
    const markup = renderToStaticMarkup(
      <ContingencyBuilder
        teamId="team-1"
        year={2029}
        week={11}
        rules={[]}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Build up to three if/then calls.');
    expect(markup).toContain(`Rules 0/${MAX_CONTINGENCIES}`);
  });

  it('renders live rule threshold and remove control', () => {
    const rule = createContingencyRule('down_by', 'go_air_raid', {
      id: 'live-1',
      threshold: 21,
    });
    const markup = renderToStaticMarkup(
      <ContingencyBuilder
        teamId="team-1"
        year={2029}
        week={11}
        rules={[rule]}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('LIVE');
    expect(markup).toContain('21+');
    expect(markup).toContain('Remove');
  });

  it('disables adding rules at the max contingency limit', () => {
    const rules = Array.from({ length: MAX_CONTINGENCIES }, (_, index) => (
      createContingencyRule('down_by', 'go_air_raid', {
        id: `max-${index}`,
        threshold: 14,
      })
    ));
    const markup = renderToStaticMarkup(
      <ContingencyBuilder
        teamId="team-1"
        year={2029}
        week={11}
        rules={rules}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain(`Rules ${MAX_CONTINGENCIES}/${MAX_CONTINGENCIES}`);
    expect(markup).toMatch(/disabled=""/);
  });
});
