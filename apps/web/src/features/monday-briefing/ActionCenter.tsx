import { PixelPanel, PixelButton, PixelBadge } from '@mfd/design-system/components';
import { monoSm, navigateTo } from '../shared/pixelUi';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

interface ActionCenterProps {
  phase: string;
  hasGamePlan: boolean;
  starterCount: number;
  tradeOfferCount: number;
  ownerApproval: number;
  injuredCount: number;
}

interface ActionItem {
  label: string;
  detail: string;
  route: string;
  accent: 'red' | 'gold' | 'green';
  buttonLabel: string;
}

const BUTTON_LABELS: Record<string, string> = {
  '/game-plan': 'Set Plan',
  '/depth-chart': 'Fix Depth',
  '/trades': 'Review',
  '/owner': 'Check',
  '/roster': 'View',
  '/week-advance': 'Advance',
};

function getButtonLabel(route: string): string {
  return BUTTON_LABELS[route] ?? 'Go';
}

function buildActions(props: ActionCenterProps): ActionItem[] {
  const { phase, hasGamePlan, starterCount, tradeOfferCount, ownerApproval, injuredCount } = props;
  const items: ActionItem[] = [];

  if (!hasGamePlan && (phase === 'regular_season' || phase === 'playoffs')) {
    items.push({
      label: 'Set your game plan',
      detail: 'No prep plan locked for this week',
      route: '/game-plan',
      accent: 'red',
      buttonLabel: getButtonLabel('/game-plan'),
    });
  }

  if (starterCount < 22) {
    items.push({
      label: `Review depth chart (${starterCount}/22 starters)`,
      detail: 'Starting lineup has gaps',
      route: '/depth-chart',
      accent: 'gold',
      buttonLabel: getButtonLabel('/depth-chart'),
    });
  }

  if (tradeOfferCount > 0) {
    items.push({
      label: `${tradeOfferCount} pending trade offer${tradeOfferCount > 1 ? 's' : ''}`,
      detail: 'Review before they expire',
      route: '/trades',
      accent: 'gold',
      buttonLabel: getButtonLabel('/trades'),
    });
  }

  if (ownerApproval < 50) {
    items.push({
      label: 'Owner patience is dropping',
      detail: `Approval at ${ownerApproval}%`,
      route: '/owner',
      accent: 'red',
      buttonLabel: getButtonLabel('/owner'),
    });
  }

  if (injuredCount > 0) {
    items.push({
      label: `${injuredCount} injured player${injuredCount > 1 ? 's' : ''}`,
      detail: 'Check roster for injury updates',
      route: '/roster',
      accent: 'gold',
      buttonLabel: getButtonLabel('/roster'),
    });
  }

  if (items.length === 0) {
    items.push({
      label: 'Ready to advance',
      detail: 'No blocking issues',
      route: '/week-advance',
      accent: 'green',
      buttonLabel: getButtonLabel('/week-advance'),
    });
  }

  return items;
}

function ActionCenter(props: ActionCenterProps) {
  const items = buildActions(props);

  const hasRed = items.some((item) => item.accent === 'red');
  const hasGold = items.some((item) => item.accent === 'gold');
  const panelAccent = hasRed ? 'red' : hasGold ? 'gold' : 'green';

  return (
    <PixelPanel title="YOUR NEXT MOVE" accent={panelAccent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #1a1a1a',
            }}
          >
            <div>
              <div style={{ ...monoSm, color: '#fff' }}>{item.label}</div>
              <div style={{ ...monoSm, color: '#888', marginTop: '2px' }}>{item.detail}</div>
            </div>
            <PixelButton accent={item.accent} onClick={() => navigateTo(item.route)}>
              <ArrowRight size={12} />
              {item.buttonLabel}
            </PixelButton>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

const ActionCenterView = ActionCenter;

export { ActionCenter, ActionCenterView };
