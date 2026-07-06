import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EraBadgeSvg, resolveEraBadgeVariant } from './eraBadgeSvg';
import { EraHallView, type EraHallEntry } from './EraHall';

const eras: EraHallEntry[] = [
  {
    id: 'era-dark',
    name: 'Dark Ages',
    type: 'fall-from-grace',
    startYear: 2024,
    endYear: 2026,
    description: 'Lean years tested the franchise foundation.',
    championships: [],
    topPlayers: ['Cole Stone', 'Mara Vale', 'Jace North'],
  },
  {
    id: 'era-dynasty',
    name: 'Dynasty Era',
    type: 'dynasty',
    startYear: 2029,
    endYear: null,
    description: 'A sustained title window is defining the club.',
    championships: [2030, 2032],
    topPlayers: ['Rex Holt', 'Ike Frost', 'Terry Moss'],
    current: true,
  },
];

function renderEraHall(overrides: Partial<Parameters<typeof EraHallView>[0]> = {}) {
  return renderToStaticMarkup(
    <EraHallView
      eras={eras}
      currentYear={2035}
      teamLabel="Chicago Blaze"
      {...overrides}
    />,
  );
}

describe('EraHall', () => {
  it('renders the Era Hall header', () => {
    const markup = renderEraHall();

    expect(markup).toContain('ERA HALL');
    expect(markup).toContain('Franchise chapters, title windows, and the roster faces that carried them.');
  });

  it('renders era source context and no-write boundaries', () => {
    const markup = renderEraHall();

    expect(markup).toContain('ERA SOURCES');
    expect(markup).toContain('DETECTED ERAS');
    expect(markup).toContain('selectFranchiseEras');
    expect(markup).toContain('game.franchiseHistory');
    expect(markup).toContain('buildEraHallEntries');
    expect(markup).toContain('selectUserTeam');
    expect(markup).toContain('actions.nameDynastyEra');
    expect(markup).toContain('startDynastyEra');
    expect(markup).toContain('Opening Era Hall does not name eras');
    expect(markup).toContain('change the live save');
    expect(markup).toContain('play scheduled games');
  });

  it('renders one era card per era in state', () => {
    const markup = renderEraHall();

    expect(markup.match(/data-era-card="true"/g)).toHaveLength(eras.length);
  });

  it('current era card has a CURRENT badge', () => {
    const markup = renderEraHall();

    expect(markup).toContain('CURRENT');
    expect(markup).toContain('Dynasty Era');
  });

  it('era badge SVG renders the correct variant by era type', () => {
    expect(resolveEraBadgeVariant('Dynasty Era')).toBe('dynasty');
    expect(resolveEraBadgeVariant('Golden Age')).toBe('golden-age');
    expect(resolveEraBadgeVariant('The Rebuild')).toBe('rebuilding');
    expect(resolveEraBadgeVariant('Dark Ages')).toBe('fall-from-grace');

    const markup = renderToStaticMarkup(<EraBadgeSvg variant="dynasty" title="Dynasty badge" />);
    expect(markup).toContain('data-era-badge-variant="dynasty"');
  });

  it('era card year range matches engine startYear and endYear fields', () => {
    const markup = renderEraHall();

    expect(markup).toContain('2024-2026');
    expect(markup).toContain('2029-NOW');
  });

  it('narrative blurb appears for non-current eras', () => {
    const markup = renderEraHall();

    expect(markup).toContain('Lean years tested the franchise foundation.');
  });

  it('renders the present-day empty state when only the rebuilding placeholder exists', () => {
    const markup = renderEraHall({
      eras: [{
        id: 'present-day',
        name: 'PRESENT DAY',
        type: 'rebuilding',
        startYear: 2035,
        endYear: null,
        description: 'Your story begins here.',
        championships: [],
        topPlayers: [],
        current: true,
      }],
    });

    expect(markup).toContain('PRESENT DAY');
    expect(markup).toContain('Your story begins here.');
    expect(markup).toContain('data-era-badge-variant="rebuilding"');
  });
});
