import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionCenter } from './ActionCenter';

describe('ActionCenter', () => {
  it('renders game plan needed action during regular season', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('Set your game plan');
  });

  it('renders ready to advance when all clear', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('Ready to advance');
  });

  it('renders trade offer action', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={3}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('3 pending trade offers');
  });

  it('renders depth chart warning when starters < 22', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={15}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('15/22 starters');
  });
});
