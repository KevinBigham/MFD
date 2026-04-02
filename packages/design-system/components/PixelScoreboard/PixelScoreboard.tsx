import type { CSSProperties } from 'react';

interface PixelScoreboardProps {
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  homeRecord?: string;
  awayRecord?: string;
  quarterScores?: { home: number[]; away: number[] };
  status?: string;
  className?: string;
  style?: CSSProperties;
}

export function PixelScoreboard({
  homeAbbr,
  awayAbbr,
  homeScore,
  awayScore,
  homeRecord,
  awayRecord,
  quarterScores,
  status = 'FINAL',
  className,
  style,
}: PixelScoreboardProps) {
  const hQ = quarterScores?.home ?? [];
  const aQ = quarterScores?.away ?? [];
  const quarters = Math.max(hQ.length, aQ.length, 4);

  return (
    <div className={className} style={{ border: '4px solid #444', background: '#0a0a0a', ...style }}>
      {/* Title bar */}
      <div style={{
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '8px',
        color: 'var(--mfd-gold)',
        textAlign: 'center',
        padding: '8px',
        borderBottom: '3px solid #333',
        background: '#0f0f0f',
        letterSpacing: '2px',
      }}>
        --- {status} ---
      </div>

      {/* Score display */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Away team */}
        <div style={{
          flex: 1,
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--mfd-away-bg)',
          borderRight: '2px solid #333',
        }}>
          <span style={{
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '12px',
            color: '#fff',
            padding: '4px 10px',
            border: '3px solid var(--mfd-away-color)',
          }}>
            {awayAbbr}
          </span>
          <span style={{
            fontFamily: 'var(--mfd-font-display)',
            fontSize: '52px',
            color: '#fff',
            lineHeight: 1,
            textShadow: '0 0 20px rgba(255,255,255,0.15)',
          }}>
            {awayScore}
          </span>
          {awayRecord && (
            <span style={{ fontFamily: 'var(--mfd-font-pixel)', fontSize: '7px', color: '#555' }}>
              {awayRecord}
            </span>
          )}
        </div>

        {/* Home team */}
        <div style={{
          flex: 1,
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--mfd-home-bg)',
        }}>
          <span style={{
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '12px',
            color: '#fff',
            padding: '4px 10px',
            border: '3px solid var(--mfd-home-color)',
          }}>
            {homeAbbr}
          </span>
          <span style={{
            fontFamily: 'var(--mfd-font-display)',
            fontSize: '52px',
            color: '#fff',
            lineHeight: 1,
            textShadow: '0 0 20px rgba(255,255,255,0.15)',
          }}>
            {homeScore}
          </span>
          {homeRecord && (
            <span style={{ fontFamily: 'var(--mfd-font-pixel)', fontSize: '7px', color: '#555' }}>
              {homeRecord}
            </span>
          )}
        </div>
      </div>

      {/* Quarter-by-quarter strip */}
      {quarterScores && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `2fr repeat(${quarters}, 1fr) 1.2fr`,
          borderTop: '3px solid #333',
        }}>
          {/* Header row */}
          <div style={qtrCell('#444', '#0c0c0c')} />
          {Array.from({ length: quarters }, (_, i) => (
            <div key={`h${i}`} style={qtrCell('#444', '#0c0c0c')}>
              {i < 4 ? `Q${i + 1}` : 'OT'}
            </div>
          ))}
          <div style={qtrCell('#444', '#0c0c0c')}>F</div>

          {/* Away row */}
          <div style={{ ...qtrCell('var(--mfd-away-color)'), textAlign: 'left' }}>{awayAbbr}</div>
          {Array.from({ length: quarters }, (_, i) => (
            <div key={`a${i}`} style={qtrCell('#aaa')}>{aQ[i] ?? 0}</div>
          ))}
          <div style={qtrCell('var(--mfd-green)', undefined, '8px')}>{awayScore}</div>

          {/* Home row */}
          <div style={{ ...qtrCell('var(--mfd-home-color)'), textAlign: 'left' }}>{homeAbbr}</div>
          {Array.from({ length: quarters }, (_, i) => (
            <div key={`h${i}`} style={qtrCell('#aaa')}>{hQ[i] ?? 0}</div>
          ))}
          <div style={qtrCell('var(--mfd-green)', undefined, '8px')}>{homeScore}</div>
        </div>
      )}
    </div>
  );
}

function qtrCell(color: string, bg?: string, fontSize?: string): CSSProperties {
  return {
    padding: '6px 8px',
    textAlign: 'center',
    fontFamily: 'var(--mfd-font-pixel)',
    fontSize: fontSize ?? '7px',
    color,
    background: bg,
    borderRight: '2px solid #222',
  };
}
