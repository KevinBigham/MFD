import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { SAVE_VERSION } from '@mfd/engine';
import { PixelMetricCard, PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

const REPO_URL = 'https://github.com/KevinBigham/MFD';
const PLAY_GUIDE_URL = 'https://github.com/KevinBigham/MFD/blob/main/ACTIVE/MFD_CREATION_GUIDE.md';

const linkStyle = {
  color: 'var(--mfd-cyan)',
  fontFamily: 'var(--mfd-font-mono)',
  fontSize: '11px',
} as const;

export function AboutScreen() {
  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="About MFD"
        subtitle="Browser-based football franchise dynasty simulation."
        badges={<PixelBadge variant="green">v{__MFD_VERSION__}</PixelBadge>}
      />

      <PixelPanel title="Identity" accent="gold">
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
          Mr. Football Dynasty is a deterministic franchise sim built around long-term roster economics,
          weekly strategy, media pressure, rivalry heat, and multi-season legacy tracking.
        </div>
      </PixelPanel>

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Version"
          value={`v${__MFD_VERSION__}`}
          accent="green"
          detail="Web package build version exposed by Vite."
        />
        <PixelMetricCard
          label="Saves"
          value={`v${SAVE_VERSION}`}
          accent="cyan"
          detail="Current engine save schema."
        />
        <PixelMetricCard
          label="Mode"
          value="Dynasty"
          accent="gold"
          detail="Single-player, multi-season franchise control."
        />
      </div>

      <PixelPanel title="Links" accent="cyan">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href={REPO_URL} target="_blank" rel="noreferrer" style={linkStyle}>
            Repository
          </a>
          <a href={PLAY_GUIDE_URL} target="_blank" rel="noreferrer" style={linkStyle}>
            Play Guide
          </a>
        </div>
      </PixelPanel>
    </div>
  );
}
