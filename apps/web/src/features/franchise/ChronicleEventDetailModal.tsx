import { PixelBadge, PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import type { ChronicleEvent } from '../../lib/dynasty-chronicle';
import {
  chronicleAccent,
  chronicleBody,
  chronicleFacts,
  chronicleTitle,
  titleCase,
} from '../../lib/dynasty-chronicle-presenter';
import { PixelMetricCard, autoGrid, display, monoSm, teamThemeVars } from '../shared/pixelUi';

interface ChronicleEventDetailModalProps {
  event: ChronicleEvent | null;
  open: boolean;
  onClose: () => void;
  teamId?: string | null;
}

export function ChronicleEventDetailModal({
  event,
  open,
  onClose,
  teamId = null,
}: ChronicleEventDetailModalProps) {
  if (!open || !event) return null;

  const accent = chronicleAccent(event);
  const facts = chronicleFacts(event);

  return (
    <PixelModal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="Chronicle Event"
      accent={accent}
      width={620}
    >
      <div
        data-testid="chronicle-event-detail"
        data-chronicle-kind={event.type}
        data-chronicle-accent={accent}
        style={{ ...teamThemeVars(teamId ?? undefined), display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ ...display, fontSize: '28px', color: 'var(--mfd-text)', lineHeight: 1 }}>
            {chronicleTitle(event).toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelBadge variant="gold">{event.year}</PixelBadge>
            <PixelBadge variant={accent}>{titleCase(event.type)}</PixelBadge>
          </div>
        </div>

        <div style={autoGrid(140)}>
          {facts.map((fact) => (
            <PixelMetricCard key={fact.label} label={fact.label} value={fact.value} accent={accent} />
          ))}
        </div>

        <PixelPanel title="Context" accent={accent}>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
            {chronicleBody(event)}
          </div>
        </PixelPanel>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <PixelButton accent="default" onClick={onClose}>
            Close
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
