import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getTeamOptions } from '../../app/store/seed';
import { TeamLogo } from './TeamLogo';

describe('TeamLogo', () => {
  const source = readFileSync(new URL('./TeamLogo.tsx', import.meta.url), 'utf-8');
  const logoRoot = new URL('../../../public/logos/', import.meta.url);

  it('renders the route-relative logo path with derived aspect dimensions', () => {
    const markup = renderToStaticMarkup(<TeamLogo icon="kc" size={58} alt="Kansas City" />);

    expect(markup).toContain('src="logos/kc.png"');
    expect(markup).toContain('alt="Kansas City"');
    expect(markup).toContain('width="106"');
    expect(markup).toContain('height="58"');
    expect(markup).toContain('object-fit:contain');
  });

  it('defaults the alt text to the uppercase icon code', () => {
    const markup = renderToStaticMarkup(<TeamLogo icon="chi" />);

    expect(markup).toContain('alt="CHI"');
    expect(markup).toContain('width="59"');
    expect(markup).toContain('height="32"');
  });

  it('normalizes uppercase team abbreviations before requesting a shipped logo', () => {
    const markup = renderToStaticMarkup(<TeamLogo icon="KC" />);

    expect(markup).toContain('src="logos/kc.png"');
    expect(source).toContain('src={`logos/${normalizedIcon}.png`}');
    expect(source).toContain('onError={handleError}');
    expect(source).toContain("el.style.display = 'none'");
  });

  it('does not request missing conference-placeholder logo files', () => {
    expect(renderToStaticMarkup(<TeamLogo icon="AFC" />)).toBe('');
    expect(renderToStaticMarkup(<TeamLogo icon="NFC" />)).toBe('');
    expect(renderToStaticMarkup(<TeamLogo icon={undefined as unknown as string} />)).toBe('');
  });

  it('keeps every selectable franchise icon backed by a shipped logo file', () => {
    const missingLogoFiles = getTeamOptions()
      .map((team) => {
        const logoPath = `logos/${team.icon}.png`;

        return {
          team: team.abbr,
          logoPath,
          exists: existsSync(fileURLToPath(new URL(`${team.icon}.png`, logoRoot))),
        };
      })
      .filter((entry) => !entry.exists)
      .map((entry) => `${entry.team}:${entry.logoPath}`);

    expect(missingLogoFiles).toEqual([]);
  });
});
