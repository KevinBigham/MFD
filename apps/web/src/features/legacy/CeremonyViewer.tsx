import { PixelBadge, PixelModal, PixelPanel } from '@mfd/design-system/components';
import type { Ceremony } from '@mfd/engine';
import { display, monoSm, pixelSm, type PixelAccent } from '../shared/pixelUi';

interface CeremonySourceRow {
  id: string;
  label: string;
  status: string;
  detail: string;
  accent: PixelAccent;
}

function accentForCeremony(type: Ceremony['type']): 'gold' | 'cyan' | 'green' | 'red' | 'default' {
  if (type === 'championship' || type === 'ring_ceremony') return 'gold';
  if (type === 'awards_night') return 'cyan';
  if (type === 'hall_of_fame_induction') return 'green';
  return 'default';
}

function labelForType(type: Ceremony['type']): string {
  return type.replaceAll('_', ' ');
}

export function buildCeremonySourceRows(ceremony: Ceremony): CeremonySourceRow[] {
  return [
    {
      id: 'saved-ceremony',
      label: 'Saved ceremony',
      status: `Year ${ceremony.year}`,
      detail: 'Source: game.ceremonies rows selected by selectCeremonies and opened by App or the Legacy route.',
      accent: 'cyan',
    },
    {
      id: 'writer-path',
      label: 'Writer path',
      status: 'recordCeremony',
      detail: 'Engine generators build championship, awards, Hall of Fame, ring, and jersey ceremonies; recordCeremony appends the saved row.',
      accent: 'gold',
    },
    {
      id: 'saved-highlights',
      label: 'Saved highlights',
      status: `${ceremony.highlights.length} highlight${ceremony.highlights.length === 1 ? '' : 's'}`,
      detail: 'Headline, description, highlight labels, values, player ids, and MVP spotlight all come from the saved ceremony payload.',
      accent: ceremony.highlights.length > 0 ? 'green' : 'default',
    },
    {
      id: 'modal-state',
      label: 'Modal state',
      status: 'route-local',
      detail: 'Opening or closing the modal only changes React state. It does not write ceremonies, awards, HOF rows, records, sidecars, or saves.',
      accent: 'cyan',
    },
  ];
}

function CeremonySourcesPanel({ ceremony }: { ceremony: Ceremony }) {
  return (
    <PixelPanel title="Ceremony Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
        {buildCeremonySourceRows(ceremony).map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: '116px',
              padding: '10px',
              border: '1px solid #1f1f1f',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
              <PixelBadge variant={row.accent}>{row.status}</PixelBadge>
            </div>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function CeremonyViewer({
  ceremony,
  open,
  onOpenChange,
}: {
  ceremony: Ceremony | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const accent = ceremony ? accentForCeremony(ceremony.type) : 'default';
  const mvpHighlight = ceremony?.highlights.find((highlight) => highlight.label.toLowerCase().includes('mvp')) ?? null;

  return (
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title={ceremony?.headline ?? 'Ceremony'}
      description={ceremony ? `${ceremony.year} // ${labelForType(ceremony.type)}` : undefined}
      accent={accent}
    >
      {ceremony ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            padding: '14px',
            border: accent === 'gold' ? '3px solid var(--mfd-gold)' : '3px solid var(--mfd-cyan)',
            background: accent === 'gold'
              ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(255, 255, 255, 0.02))'
              : 'linear-gradient(135deg, rgba(0, 229, 255, 0.14), rgba(255, 255, 255, 0.02))',
          }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...display, fontSize: '24px', color: '#fff', lineHeight: 1 }}>
                {ceremony.headline.toUpperCase()}
              </div>
              <PixelBadge variant={accent === 'default' ? 'default' : accent}>{labelForType(ceremony.type)}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7, marginTop: '10px' }}>
              {ceremony.description}
            </div>
          </div>

          {mvpHighlight ? (
            <PixelPanel title="MVP Spotlight" accent="gold">
              <div style={{ ...pixelSm, color: '#fff' }}>{mvpHighlight.value}</div>
            </PixelPanel>
          ) : null}

          <CeremonySourcesPanel ceremony={ceremony} />

          <PixelPanel title="Highlights" accent={accent === 'default' ? 'cyan' : accent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ceremony.highlights.map((highlight) => (
                <div key={`${ceremony.id}-${highlight.label}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingLeft: '10px',
                  borderLeft: accent === 'gold' ? '3px solid var(--mfd-gold)' : accent === 'green' ? '3px solid var(--mfd-green)' : '3px solid var(--mfd-cyan)',
                }}
                >
                  <div style={{ ...pixelSm, color: '#fff' }}>{highlight.label.toUpperCase()}</div>
                  <div style={{ ...monoSm, color: '#bbb', lineHeight: 1.6 }}>{highlight.value}</div>
                </div>
              ))}
            </div>
          </PixelPanel>
        </div>
      ) : null}
    </PixelModal>
  );
}
