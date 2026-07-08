import type { SetupColdOpen as SetupColdOpenModel } from '@mfd/engine';
import { PixelButton, PixelPanel } from '@mfd/design-system/components';
import { monoSm, pixelSm } from '../shared/pixelUi';

export function SetupColdOpen({
  coldOpen,
  onSkip,
}: {
  coldOpen: SetupColdOpenModel;
  beatIndex?: number;
  reducedMotion?: boolean;
  onSkip?: () => void;
}) {
  return (
    <div className="mfd-setup-cold-open">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>FIRST FRONT OFFICE CALL</div>
        {onSkip ? <PixelButton accent="default" onClick={onSkip}>Skip Intro</PixelButton> : null}
      </div>

      <PixelPanel accent="gold" padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>ASSISTANT GM HIRE</div>
          <div style={{ color: 'var(--mfd-text)', fontFamily: 'var(--mfd-font-display)', fontSize: 'clamp(28px, 5vw, 54px)', lineHeight: 0.95, textTransform: 'uppercase' }}>
            Hire your Assistant GM
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            The next decision is hiring an Assistant GM. Chip will summarize the owner expectation, Week 1 opponent,
            cap-space, roster-depth, Week 1 game-plan, and owner-patience consequences; the hire decides which consequence
            Chip names first while you set staff, scouting, scheme, lineup, cap plan, and goals.
          </div>
        </div>
      </PixelPanel>

      <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{coldOpen.openerLabel}</div>
    </div>
  );
}
