import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhaseIndicator } from './PhaseIndicator';

describe('PhaseIndicator', () => {
  it('renders regular season label and tip', () => {
    const html = renderToStaticMarkup(
      <PhaseIndicator phase="regular_season" week={5} year={2026} />,
    );
    expect(html).toContain('REGULAR SEASON');
    expect(html).toContain('Set injuries, depth, and Game Plan before Advance Week');
    expect(html).toContain('standings punish missed weekly choices');
    expect(html).not.toContain('chase the playoffs');
  });

  it('renders offseason label and tip', () => {
    const html = renderToStaticMarkup(
      <PhaseIndicator phase="offseason" week={1} year={2026} />,
    );
    expect(html).toContain('OFFSEASON');
    expect(html).toContain('Re-sign core players');
    expect(html).toContain('save room for Free Agency bids');
  });

  it('renders free agency guidance without weak roster shorthand', () => {
    const html = renderToStaticMarkup(
      <PhaseIndicator phase="free_agency" week={1} year={2026} />,
    );
    expect(html).toContain('open starter or backup jobs before the draft');
    expect(html).not.toContain('roster needs');
    expect(html).not.toContain('roster holes');
  });

  it('keeps playoff, draft, post-draft, and camp tips concrete', () => {
    const playoff = renderToStaticMarkup(<PhaseIndicator phase="playoffs" week={19} year={2026} />);
    const draft = renderToStaticMarkup(<PhaseIndicator phase="draft" week={1} year={2026} />);
    const postDraft = renderToStaticMarkup(<PhaseIndicator phase="post_draft" week={1} year={2026} />);
    const camp = renderToStaticMarkup(<PhaseIndicator phase="training_camp" week={1} year={2026} />);

    expect(playoff).toContain('one missed assignment ends the season');
    expect(draft).toContain('named starter, backup, or development jobs');
    expect(postDraft).toContain('rookie roles and roster cuts');
    expect(camp).toContain('injury backup plans before Week 1');
    expect(`${playoff} ${draft} ${postDraft} ${camp}`).not.toMatch(/Every decision is magnified|build your future|surprises emerge/i);
  });
});
