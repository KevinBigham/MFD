import type { SetupColdOpen as SetupColdOpenModel } from '@mfd/engine';
import { PixelButton, PixelPanel } from '@mfd/design-system/components';
import { monoSm, pixelSm } from '../shared/pixelUi';

const COLD_OPEN_BEATS: Array<{ label: string; key: keyof SetupColdOpenModel; accent: string }> = [
  { label: 'OWNER EXPECTATION', key: 'ownerExpectation', accent: 'var(--mfd-gold)' },
  { label: 'MEDIA NARRATIVE', key: 'mediaNarrative', accent: 'var(--mfd-cyan)' },
  { label: 'LAST SEASON SCAR', key: 'lastSeasonScar', accent: 'var(--mfd-red)' },
  { label: 'CRISIS HEADLINE', key: 'crisisHeadline', accent: 'var(--mfd-gold)' },
  { label: 'WEEK 1 THREAT', key: 'weekOneThreat', accent: 'var(--mfd-red)' },
];

export function SetupColdOpen({
  coldOpen,
  beatIndex = 0,
  reducedMotion = false,
  onSkip,
}: {
  coldOpen: SetupColdOpenModel;
  beatIndex?: number;
  reducedMotion?: boolean;
  onSkip?: () => void;
}) {
  const clampedBeatIndex = Math.max(0, Math.min(beatIndex, COLD_OPEN_BEATS.length - 1));
  const activeBeat = COLD_OPEN_BEATS[clampedBeatIndex]!;
  const showRecap = reducedMotion || clampedBeatIndex === COLD_OPEN_BEATS.length - 1;

  if (showRecap) {
    return (
      <div className="mfd-setup-cold-open mfd-setup-cold-open--recap">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <PixelPanel accent="gold" padding="lg" style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>COMMAND CENTER CRISIS ROOM</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
                {coldOpen.openerLabel}
              </div>
            </div>
          </PixelPanel>
          {onSkip ? <PixelButton accent="default" onClick={onSkip}>Skip Intro</PixelButton> : null}
        </div>

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {COLD_OPEN_BEATS.map((beat) => (
            <PixelPanel key={beat.label} accent="default" padding="md">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...pixelSm, color: beat.accent }}>{beat.label}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                  {coldOpen[beat.key]}
                </div>
              </div>
            </PixelPanel>
          ))}
        </div>

        <PixelPanel accent="cyan" padding="md">
          <div className="mfd-setup-cold-open__next">
            <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>DECISION UP NEXT</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.55 }}>
              Hire the Assistant GM who best matches the first fire in the room.
            </div>
          </div>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div className="mfd-setup-cold-open">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>COMMAND CENTER CRISIS ROOM</div>
        {onSkip ? <PixelButton accent="default" onClick={onSkip}>Skip Intro</PixelButton> : null}
      </div>

      <PixelPanel accent="gold" padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...pixelSm, color: activeBeat.accent }}>{activeBeat.label}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
            {coldOpen[activeBeat.key]}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            {coldOpen.openerLabel}
          </div>
        </div>
      </PixelPanel>

      <PixelPanel accent="cyan" padding="md">
        <div className="mfd-setup-cold-open__next">
          <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>DECISION UP NEXT</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.55 }}>
            The AGM hire comes next; every beat is pressure you will assign to that room.
          </div>
        </div>
      </PixelPanel>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {COLD_OPEN_BEATS.map((beat, index) => (
          <div
            key={beat.label}
            style={{
              width: index === clampedBeatIndex ? '36px' : '12px',
              height: '12px',
              border: '2px solid var(--mfd-border)',
              background: index <= clampedBeatIndex ? 'var(--mfd-gold)' : 'var(--mfd-bg-3)',
              transition: 'width 0.15s ease-out',
            }}
          />
        ))}
      </div>

      <div style={{ ...pixelSm, color: activeBeat.accent }}>{`Beat ${clampedBeatIndex + 1} of ${COLD_OPEN_BEATS.length}`}</div>
    </div>
  );
}
