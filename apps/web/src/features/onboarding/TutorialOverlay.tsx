import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { TutorialStep } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';

function actionPrompt(step: TutorialStep): string {
  if (!step.action) {
    return step.id === 'you_are_ready'
      ? 'Close this guide and start running the dynasty your way.'
      : 'Read the setup, then move to the next step when you are ready.';
  }

  if (step.action.startsWith('screen:')) {
    return `Navigate to ${step.targetScreen} to clear this step.`;
  }

  if (step.action === 'depth_chart:update') return 'Set one starter on the depth chart.';
  if (step.action === 'training:assign') return 'Assign a weekly training focus from the roster screen.';
  if (step.action === 'week:advance') return 'Advance the week to trigger your first game cycle.';
  if (step.action === 'handshake:create') return 'Make one promise in the handshake ledger.';
  if (step.action === 'scouting:action') return 'Run one scouting action on a prospect.';
  return 'Complete the requested action to continue.';
}

export function TutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}: {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div style={{
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      width: 'min(360px, calc(100vw - 28px))',
      zIndex: 60,
    }}
    >
      <PixelPanel title="Tutorial" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{`${stepIndex}/${totalSteps}`}</PixelBadge>
              <PixelBadge variant="cyan">{step.targetScreen}</PixelBadge>
            </div>
            {step.action ? <PixelBadge variant="default">Auto</PixelBadge> : <PixelBadge variant="green">Manual</PixelBadge>}
          </div>

          <div>
            <div style={{ ...pixelSm, color: 'var(--mfd-gold)', marginBottom: '8px' }}>{step.title.toUpperCase()}</div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.65 }}>{step.description}</div>
          </div>

          <div style={{
            padding: '10px',
            border: '2px solid rgba(255, 215, 0, 0.35)',
            background: 'rgba(255, 215, 0, 0.06)',
          }}
          >
            <div style={{ ...pixelSm, color: '#f4d35e', marginBottom: '6px' }}>ACTION PROMPT</div>
            <div style={{ ...monoSm, color: '#cfcfcf', lineHeight: 1.6 }}>{actionPrompt(step)}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onSkip}
              style={{
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: '#9a9a9a',
                fontFamily: 'var(--mfd-font-mono)',
                fontSize: '11px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Skip Tutorial
            </button>

            {!step.action ? (
              <PixelButton accent={step.id === 'you_are_ready' ? 'green' : 'gold'} onClick={onNext}>
                {step.id === 'you_are_ready' ? 'Finish' : 'Next'}
              </PixelButton>
            ) : null}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
