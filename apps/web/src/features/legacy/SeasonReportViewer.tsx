import { useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelModal,
  PixelPanel,
} from '@mfd/design-system/components';
import type { SeasonReport } from '@mfd/engine';
import { useGameStore } from '../../app/store/game-store';
import { autoGrid, display, monoSm } from '../shared/pixelUi';

function gradeAccent(grade: string): 'gold' | 'cyan' | 'default' | 'red' {
  if (grade.startsWith('A')) return 'gold';
  if (grade.startsWith('B')) return 'cyan';
  if (grade.startsWith('D') || grade.startsWith('F')) return 'red';
  return 'default';
}

export function SeasonReportViewer({
  report,
  open,
  onOpenChange,
}: {
  report: SeasonReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const team = useGameStore((state) => (report ? state.game?.teams[report.teamId] ?? null : null));
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  if (!report) {
    return null;
  }

  return (
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title="Season Report Card"
      description={`${report.year} // ${team ? `${team.city} ${team.name}` : report.teamId}`}
      accent={gradeAccent(report.overallGrade)}
      width={920}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          alignItems: 'center',
          padding: '12px',
          border: `3px solid ${report.overallGrade.startsWith('A') ? 'var(--mfd-gold)' : report.overallGrade.startsWith('B') ? 'var(--mfd-cyan)' : report.overallGrade.startsWith('D') || report.overallGrade.startsWith('F') ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.26) 100%)',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ ...monoSm, color: '#888', marginBottom: '6px' }}>SEASON REPORT</div>
            <div style={{ ...display, fontSize: '28px', color: '#fff', lineHeight: 1 }}>
              {team ? `${team.city} ${team.name}`.toUpperCase() : report.teamId.toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: '#ddd', marginTop: '8px' }}>Year {report.year}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              minWidth: '86px',
              minHeight: '86px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid currentColor',
              color: report.overallGrade.startsWith('A')
                ? 'var(--mfd-gold)'
                : report.overallGrade.startsWith('B')
                  ? 'var(--mfd-cyan)'
                  : report.overallGrade.startsWith('D') || report.overallGrade.startsWith('F')
                    ? 'var(--mfd-red)'
                    : 'var(--mfd-text)',
              fontFamily: 'var(--mfd-font-display)',
              fontSize: '36px',
              lineHeight: 1,
            }}
            >
              {report.overallGrade}
            </div>
            <PixelBadge variant={gradeAccent(report.overallGrade)}>Overall Grade</PixelBadge>
          </div>
        </div>

        <div style={autoGrid(300)}>
          {report.sections.map((section) => {
            const expanded = expandedSections.includes(section.title);
            return (
              <PixelPanel key={section.title} title={section.title} accent={gradeAccent(section.grade)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <PixelBadge variant={gradeAccent(section.grade)}>{section.grade}</PixelBadge>
                    <PixelButton
                      accent="default"
                      onClick={() => {
                        setExpandedSections((current) =>
                          current.includes(section.title)
                            ? current.filter((entry) => entry !== section.title)
                            : [...current, section.title]);
                      }}
                    >
                      {expanded ? 'Hide Stats' : 'Show Stats'}
                    </PixelButton>
                  </div>
                  <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>{section.summary}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {section.highlights.map((highlight) => (
                      <div key={highlight} style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                        {highlight}
                      </div>
                    ))}
                  </div>
                  {expanded ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid #202020' }}>
                      {Object.entries(section.stats).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                          <span style={{ ...monoSm, color: '#888' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}</span>
                          <span style={{ ...monoSm, color: '#fff' }}>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </PixelPanel>
            );
          })}
        </div>
      </div>
    </PixelModal>
  );
}
