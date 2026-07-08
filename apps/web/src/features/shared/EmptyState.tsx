import { PixelPanel, PixelButton } from '@mfd/design-system/components';
import { monoSm, screenStackStyle, navigateTo, PixelScreenHeader } from '../shared/pixelUi';

interface EmptyStateProps {
  title: string;
  reason: string;
  nextStep: string;
  actionLabel?: string;
  actionRoute?: string;
}

export function EmptyState({ title, reason, nextStep, actionLabel, actionRoute }: EmptyStateProps) {
  return (
    <div style={screenStackStyle} role="status" aria-live="polite">
      <PixelScreenHeader
        title={title}
        subtitle="This screen will populate once data is available."
      />
      <PixelPanel title="Status" accent="default">
        <p style={monoSm}>WHY: {reason}</p>
        <p style={monoSm}>NEXT STEP: {nextStep}</p>
        {actionLabel && actionRoute && (
          <PixelButton accent="gold" onClick={() => navigateTo(actionRoute)}>
            {actionLabel}
          </PixelButton>
        )}
      </PixelPanel>
    </div>
  );
}
