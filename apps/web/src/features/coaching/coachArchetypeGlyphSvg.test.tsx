import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { COACH_ARCHETYPE_GLYPHS, CoachArchetypeGlyphSvg } from './coachArchetypeGlyphSvg';

describe('CoachArchetypeGlyphSvg', () => {
  it('renders the offensive_mind variant with route path data', () => {
    const markup = renderToStaticMarkup(<CoachArchetypeGlyphSvg archetype="offensive_mind" label="Offense" />);

    expect(markup).toContain('data-coach-archetype-glyph="offensive_mind"');
    expect(markup).toContain('data-glyph-routes="true"');
  });

  it('renders all 6 glyph variants without error', () => {
    for (const archetype of COACH_ARCHETYPE_GLYPHS) {
      const markup = renderToStaticMarkup(<CoachArchetypeGlyphSvg archetype={archetype} label={archetype} />);

      expect(markup).toContain(`data-coach-archetype-glyph="${archetype}"`);
    }
  });

  it('renders a shield for defensive_mind', () => {
    const markup = renderToStaticMarkup(<CoachArchetypeGlyphSvg archetype="defensive_mind" label="Defense" />);

    expect(markup).toContain('data-glyph-shield="true"');
  });

  it('renders a handshake for players_coach', () => {
    const markup = renderToStaticMarkup(<CoachArchetypeGlyphSvg archetype="players_coach" label="Players" />);

    expect(markup).toContain('data-glyph-handshake="true"');
  });

  it('renders a flame for fire_starter', () => {
    const markup = renderToStaticMarkup(<CoachArchetypeGlyphSvg archetype="fire_starter" label="Fire" />);

    expect(markup).toContain('data-glyph-flame="true"');
  });

  it('renders distinct SVG path data across every glyph', () => {
    const signatures = COACH_ARCHETYPE_GLYPHS.map((archetype) =>
      renderToStaticMarkup(<CoachArchetypeGlyphSvg archetype={archetype} label={archetype} />).match(/d="[^"]+"/g)?.join('|') ?? '',
    );

    expect(new Set(signatures)).toHaveLength(COACH_ARCHETYPE_GLYPHS.length);
  });
});
