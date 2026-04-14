import { useEffect, useRef, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { TutorialStep } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';

const TUTORIAL_TIPS = [
  'Hotkeys: 1-9 jump to core screens, Cmd/Ctrl+K opens the Cmd Deck, and Shift+? opens the hotkey board.',
  'Save flow: Save/Load lives under SYSTEM. Autosave covers week advances and major state changes, but manual checkpoints are still the safest way to protect a long dynasty.',
  'New wiring: Game Plan holds contingency rules, trick plays, and the live playbook. Game Day now carries the podium response flow after games.',
];

const WHATS_NEW = [
  'Check Settings for the invariant debug readout when you launch with ?debug=1.',
  'Use the new postgame press modal to pick your public tone after big results.',
  'Look for story, intel, and breaking-news surfaces in Inbox, Social, and Game Day during the first week.',
];

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

/** Returns the bounding rect of the element matched by targetElement, or null. */
function useTargetRect(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(selector!);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
      rafRef.current = requestAnimationFrame(measure);
    }

    // Start polling (elements may mount after navigation)
    rafRef.current = requestAnimationFrame(measure);

    return () => cancelAnimationFrame(rafRef.current);
  }, [selector]);

  return rect;
}

/** Arrow pointing from the overlay toward the target element */
function TutorialArrow({ targetRect }: { targetRect: DOMRect }) {
  const arrowX = Math.min(targetRect.left + targetRect.width / 2, window.innerWidth - 40);
  const arrowY = targetRect.bottom + 8;

  return (
    <div style={{
      position: 'fixed',
      left: arrowX - 8,
      top: arrowY,
      zIndex: 61,
      width: 0,
      height: 0,
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderBottom: '12px solid var(--mfd-gold)',
      filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))',
      animation: 'mfdTutorialBounce 1s ease-in-out infinite',
      pointerEvents: 'none',
    }} />
  );
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
  const targetRect = useTargetRect(step.targetElement ?? null);
  const hasTarget = !!targetRect;

  return (
    <>
      {/* Bounce keyframe for arrow */}
      <style>{`
        @keyframes mfdTutorialBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>

      {/* Target highlight ring */}
      {hasTarget && (
        <div style={{
          position: 'fixed',
          left: targetRect.left - 4,
          top: targetRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          border: '2px solid var(--mfd-gold)',
          borderRadius: '4px',
          boxShadow: '0 0 12px rgba(255, 215, 0, 0.4)',
          zIndex: 59,
          pointerEvents: 'none',
          animation: 'mfdTutorialPulse 1.2s infinite',
        }} />
      )}

      {/* Arrow pointing to target */}
      {hasTarget && <TutorialArrow targetRect={targetRect} />}

      {/* Main overlay panel */}
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

            <div style={{
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
            >
              <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>TUTORIAL TIPS</div>
              {TUTORIAL_TIPS.map((tip) => (
                <div key={tip} style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{tip}</div>
              ))}
            </div>

            <div style={{
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
            >
              <div style={{ ...pixelSm, color: 'var(--mfd-green)' }}>WHAT&apos;S NEW</div>
              {WHATS_NEW.map((tip) => (
                <div key={tip} style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{tip}</div>
              ))}
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

              <PixelButton accent={step.id === 'you_are_ready' ? 'green' : 'gold'} onClick={onNext}>
                {step.id === 'you_are_ready' ? 'Finish' : 'Next'}
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      </div>
    </>
  );
}
