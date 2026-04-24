import { PixelBadge } from '@mfd/design-system/components';
import { PixelMetricCard, PixelScreenHeader, autoGrid, screenStackStyle } from '../shared/pixelUi';

const creditSections = [
  {
    label: 'Design + Dev',
    value: 'Kevin Bigham',
    detail: 'Game direction, systems design, implementation, and release ownership.',
    accent: 'gold' as const,
  },
  {
    label: 'AI Agents',
    value: 'Studio Crew',
    detail: 'ChatGPT Architect, Codex Builder, Claude Code Reviewer, Claude Opus Ops, Muse Spark Content.',
    accent: 'cyan' as const,
  },
  {
    label: 'Tech',
    value: 'React + Vite',
    detail: 'React 19, Vite 6, Zustand, Vitest, lucide-react.',
    accent: 'green' as const,
  },
  {
    label: 'Fonts',
    value: 'Pixel Stack',
    detail: 'Press Start 2P, Bebas Neue, JetBrains Mono.',
    accent: 'default' as const,
  },
];

export function CreditsScreen() {
  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Credits"
        subtitle="The launch build crew and technical foundation."
        badges={<PixelBadge variant="gold">LAUNCH</PixelBadge>}
      />

      <div style={autoGrid(240)}>
        {creditSections.map((section) => (
          <PixelMetricCard
            key={section.label}
            label={section.label}
            value={section.value}
            accent={section.accent}
            detail={section.detail}
          />
        ))}
      </div>
    </div>
  );
}
