export const WEATHER_GLYPH_VARIANTS = [
  'SUNNY',
  'PARTLY_CLOUDY',
  'CLOUDY',
  'RAIN',
  'SNOW',
  'WIND',
  'DOME',
  'HEAT_WAVE',
] as const;

export type WeatherGlyphVariant = typeof WEATHER_GLYPH_VARIANTS[number];

export function WeatherGlyphSvg({
  variant,
  label,
}: {
  variant: WeatherGlyphVariant;
  label: string;
}) {
  const sun = (
    <g data-sun-rays="true" stroke="var(--mfd-gold)" strokeWidth="4" strokeLinecap="round">
      <circle cx="40" cy="40" r="14" fill="var(--mfd-gold)" stroke="none" />
      <path d="M40 8v10" />
      <path d="M40 62v10" />
      <path d="M8 40h10" />
      <path d="M62 40h10" />
      <path d="M18 18l8 8" />
      <path d="M54 54l8 8" />
      <path d="M62 18l-8 8" />
      <path d="M26 54l-8 8" />
    </g>
  );
  const cloud = (
    <path
      data-cloud-puff="true"
      d="M18 51c-5 0-9-4-9-9s4-9 9-9h3c2-9 9-15 18-15 8 0 15 5 18 12h4c6 0 11 5 11 11s-5 10-11 10z"
      fill="var(--mfd-bg-2)"
      stroke="var(--mfd-cyan)"
      strokeWidth="4"
      strokeLinejoin="round"
    />
  );

  return (
    <svg
      viewBox="0 0 80 80"
      width="80"
      height="80"
      role="img"
      aria-label={label}
      data-weather-glyph={variant}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {variant === 'SUNNY' ? sun : null}
      {variant === 'PARTLY_CLOUDY' ? (
        <>
          <g transform="translate(-14 -12) scale(0.82)">{sun}</g>
          <g transform="translate(4 9) scale(0.9)">{cloud}</g>
        </>
      ) : null}
      {variant === 'CLOUDY' ? (
        <>
          <g transform="translate(-8 -2) scale(0.82)" opacity="0.72">{cloud}</g>
          <g transform="translate(4 7) scale(0.96)">{cloud}</g>
        </>
      ) : null}
      {variant === 'RAIN' ? (
        <>
          <g transform="translate(0 -6)">{cloud}</g>
          <g data-raindrops="true" stroke="var(--mfd-cyan)" strokeWidth="4" strokeLinecap="round">
            <path d="M27 57l-5 10" />
            <path d="M42 57l-5 10" />
            <path d="M57 57l-5 10" />
          </g>
        </>
      ) : null}
      {variant === 'SNOW' ? (
        <>
          <g transform="translate(0 -8)">{cloud}</g>
          <g data-snowflakes="true" stroke="var(--mfd-text)" strokeWidth="3" strokeLinecap="round">
            <path d="M25 60v12" />
            <path d="M19 66h12" />
            <path d="M21 62l8 8" />
            <path d="M29 62l-8 8" />
            <path d="M43 58v12" />
            <path d="M37 64h12" />
            <path d="M39 60l8 8" />
            <path d="M47 60l-8 8" />
            <path d="M59 61v12" />
            <path d="M53 67h12" />
          </g>
        </>
      ) : null}
      {variant === 'WIND' ? (
        <g stroke="var(--mfd-cyan)" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M12 28h40c8 0 8-10 1-10" />
          <path d="M8 42h58c8 0 8 12-2 12" />
          <path d="M18 57h25" />
        </g>
      ) : null}
      {variant === 'DOME' ? (
        <g data-dome-shield="true" fill="none" stroke="var(--mfd-cyan)" strokeWidth="4" strokeLinejoin="round">
          <path d="M12 52c4-20 14-30 28-30s24 10 28 30z" fill="var(--mfd-bg-2)" />
          <path d="M18 52h44v12H18z" />
          <path d="M40 30v22" />
          <path d="M26 38c8-5 20-5 28 0" />
          <path d="M40 11l13 7v11c0 11-5 18-13 23-8-5-13-12-13-23V18z" stroke="var(--mfd-gold)" />
        </g>
      ) : null}
      {variant === 'HEAT_WAVE' ? (
        <>
          <g transform="translate(-8 -12) scale(0.74)">{sun}</g>
          <g stroke="var(--mfd-red)" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M26 52c-6 5-6 10 0 15" />
            <path d="M40 49c-6 6-6 12 0 18" />
            <path d="M54 52c-6 5-6 10 0 15" />
          </g>
        </>
      ) : null}
    </svg>
  );
}
