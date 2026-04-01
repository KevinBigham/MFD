import { type CSSProperties } from 'react';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  description?: string;
}

interface MfdStepperProps {
  steps: Step[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: CSSProperties;
}

export function MfdStepper({
  steps,
  activeStep,
  orientation = 'horizontal',
  className,
  style,
}: MfdStepperProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        gap: isVertical ? 'var(--mfd-sp-sm)' : '0',
        alignItems: isVertical ? 'flex-start' : 'center',
        ...style,
      }}
    >
      {steps.map((step, i) => {
        const isComplete = i < activeStep;
        const isActive = i === activeStep;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--mfd-sp-sm)',
              flex: isVertical ? undefined : 1,
            }}
          >
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontFamily: 'var(--mfd-font-mono)',
              fontWeight: 600,
              flexShrink: 0,
              border: `1.5px solid ${
                isComplete ? 'var(--mfd-green)'
                : isActive ? 'var(--mfd-gold)'
                : 'var(--mfd-border)'
              }`,
              background: isComplete ? 'rgba(0,184,122,0.12)' : 'transparent',
              color: isComplete ? 'var(--mfd-green)'
                : isActive ? 'var(--mfd-gold)'
                : 'var(--mfd-text-faint)',
            }}>
              {isComplete ? <Check size={12} /> : i + 1}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--mfd-font-sans)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--mfd-text)' : 'var(--mfd-text-dim)',
              }}>
                {step.label}
              </span>
              {step.description && (
                <span style={{
                  fontSize: '0.6875rem',
                  color: 'var(--mfd-text-faint)',
                }}>
                  {step.description}
                </span>
              )}
            </div>

            {!isVertical && i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 1,
                marginLeft: 'var(--mfd-sp-sm)',
                background: isComplete ? 'var(--mfd-green)' : 'var(--mfd-border)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
