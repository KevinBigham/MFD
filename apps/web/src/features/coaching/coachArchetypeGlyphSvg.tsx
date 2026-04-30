export const COACH_ARCHETYPE_GLYPHS = [
  'offensive_mind',
  'defensive_mind',
  'players_coach',
  'gm_track',
  'cerebral',
  'fire_starter',
] as const;

export type CoachArchetypeGlyph = typeof COACH_ARCHETYPE_GLYPHS[number];

function normalizeArchetype(archetype: string): CoachArchetypeGlyph {
  const normalized = archetype.trim().toLowerCase();
  if (normalized.includes('offensive') || normalized.includes('air') || normalized.includes('west_coast')) return 'offensive_mind';
  if (normalized.includes('defensive') || normalized.includes('coverage') || normalized.includes('aggressive')) return 'defensive_mind';
  if (normalized.includes('player') || normalized.includes('motivator')) return 'players_coach';
  if (normalized.includes('gm') || normalized.includes('front_office')) return 'gm_track';
  if (normalized.includes('disciplinarian') || normalized.includes('fire')) return 'fire_starter';
  return 'cerebral';
}

export function CoachArchetypeGlyphSvg({
  archetype,
  label,
}: {
  archetype: CoachArchetypeGlyph | string;
  label: string;
}) {
  const glyph = normalizeArchetype(archetype);

  return (
    <svg
      viewBox="0 0 32 32"
      width="24"
      height="24"
      role="img"
      aria-label={label}
      data-coach-archetype-glyph={glyph}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {glyph === 'offensive_mind' ? (
        <g data-glyph-routes="true" fill="none" stroke="var(--mfd-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 6h22v20H5z" fill="var(--mfd-bg-2)" />
          <path d="M10 21c5-8 9-8 14-13" />
          <path d="M10 11l4 4" />
          <path d="M14 11l-4 4" />
          <path d="M22 20h4" />
          <path d="M24 18v4" />
        </g>
      ) : null}
      {glyph === 'defensive_mind' ? (
        <g data-glyph-shield="true" fill="none" stroke="var(--mfd-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3l10 5v8c0 7-4 11-10 14-6-3-10-7-10-14V8z" fill="var(--mfd-bg-2)" />
          <path d="M10 13l12 8" />
          <path d="M22 13l-12 8" />
          <path d="M9 10h14" />
        </g>
      ) : null}
      {glyph === 'players_coach' ? (
        <g data-glyph-handshake="true" fill="none" stroke="var(--mfd-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17l6-6 5 5" />
          <path d="M28 17l-6-6-8 8" />
          <path d="M12 19l4 4 4-4" />
          <path d="M8 20l5 5" />
          <path d="M24 20l-5 5" />
        </g>
      ) : null}
      {glyph === 'gm_track' ? (
        <g data-glyph-briefcase="true" fill="none" stroke="var(--mfd-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12h20v14H6z" fill="var(--mfd-bg-2)" />
          <path d="M12 12V8h8v4" />
          <path d="M6 17h20" />
          <path d="M12 21h8" />
          <path d="M12 24h6" />
        </g>
      ) : null}
      {glyph === 'cerebral' ? (
        <g data-glyph-brain="true" fill="none" stroke="var(--mfd-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 25c-4 0-6-3-6-6 0-2 1-4 3-5-1-5 3-9 8-7 5-2 9 2 8 7 2 1 3 3 3 5 0 3-2 6-6 6" />
          <path d="M16 7v18" />
          <path d="M11 12c2 1 3 2 3 4" />
          <path d="M21 12c-2 1-3 2-3 4" />
          <path d="M25 5l2-3" stroke="var(--mfd-gold)" />
          <path d="M28 9l3-1" stroke="var(--mfd-gold)" />
        </g>
      ) : null}
      {glyph === 'fire_starter' ? (
        <g data-glyph-flame="true" fill="none" stroke="var(--mfd-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 29c-6 0-10-4-10-10 0-5 4-8 7-11 1 4 4 6 7 8 0-5-2-8-4-12 6 3 10 8 10 15 0 6-4 10-10 10z" fill="var(--mfd-bg-2)" />
          <path d="M16 25c-3 0-5-2-5-5 0-2 2-4 4-6 0 3 2 4 4 6 1 3 0 5-3 5z" stroke="var(--mfd-gold)" />
        </g>
      ) : null}
    </svg>
  );
}
