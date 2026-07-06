import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
    getScoutCandidates: () => [
      {
        id: 'zoe_wilcox',
        name: 'Zoe Wilcox',
        age: 39,
        background: 'Cross-checker.',
        specialty: 'medical_cross_check',
        philosophy: 'Role and medical checks first',
        strengths: ['Medical checks'],
        weaknesses: ['Small-school lag'],
        interviewQuote: 'Every pick needs a role.',
      },
    ],
    getAGMScoutReaction: () => ({
      recommendation: 'consider',
      analysis: 'Hire her before picks are spent.',
      oneLiner: 'Medical checks protect picks.',
    }),
  };
});

import { HireScoutPhase } from './HireScoutPhase';

describe('HireScoutPhase', () => {
  it('explains the scouting director decision with role, medical, and pick consequences', () => {
    const html = renderToStaticMarkup(
      <HireScoutPhase
        agmId="marcus_webb"
        selectedScoutId={null}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('names medical warnings, assigned-role warnings, and uncovered positions before picks are spent');
    expect(html).toContain('WHAT CAN GO WRONG');
    expect(html).toContain('HAS COST');
    expect(html).not.toContain('CONSIDER');
    expect(html).not.toContain('RISKS');
    expect(html).not.toContain('TRADEOFF');
    expect(html).not.toContain('WATCH-OUTS');
    expect(html).not.toContain('role risk');
    expect(html).not.toMatch(/\bverifies\b|thin positions/i);
    expect(html).not.toContain('determines which positions get clearer grades before draft day');
    expect(html).not.toMatch(/role grades|grades lock|medical flags/i);
  });
});
