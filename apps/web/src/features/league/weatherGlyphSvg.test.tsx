import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WEATHER_GLYPH_VARIANTS, WeatherGlyphSvg } from './weatherGlyphSvg';

describe('WeatherGlyphSvg', () => {
  it('renders all 8 weather glyph variants', () => {
    for (const variant of WEATHER_GLYPH_VARIANTS) {
      const markup = renderToStaticMarkup(<WeatherGlyphSvg variant={variant} label={variant} />);

      expect(markup).toContain(`data-weather-glyph="${variant}"`);
    }
  });

  it('renders sun rays for SUNNY', () => {
    const markup = renderToStaticMarkup(<WeatherGlyphSvg variant="SUNNY" label="Sunny" />);

    expect(markup).toContain('data-sun-rays="true"');
  });

  it('renders raindrops for RAIN', () => {
    const markup = renderToStaticMarkup(<WeatherGlyphSvg variant="RAIN" label="Rain" />);

    expect(markup).toContain('data-raindrops="true"');
  });

  it('renders snowflakes for SNOW', () => {
    const markup = renderToStaticMarkup(<WeatherGlyphSvg variant="SNOW" label="Snow" />);

    expect(markup).toContain('data-snowflakes="true"');
  });

  it('renders the dome shield for DOME', () => {
    const markup = renderToStaticMarkup(<WeatherGlyphSvg variant="DOME" label="Dome" />);

    expect(markup).toContain('data-dome-shield="true"');
  });

  it('renders distinct SVG path data across every variant', () => {
    const signatures = WEATHER_GLYPH_VARIANTS.map((variant) =>
      renderToStaticMarkup(<WeatherGlyphSvg variant={variant} label={variant} />).match(/d="[^"]+"/g)?.join('|') ?? '',
    );

    expect(new Set(signatures)).toHaveLength(WEATHER_GLYPH_VARIANTS.length);
  });
});
