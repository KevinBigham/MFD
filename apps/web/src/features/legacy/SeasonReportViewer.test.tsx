import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { SeasonReport } from '@mfd/engine';
import {
  SeasonReportViewer,
  buildSeasonReportSourceRows,
} from './SeasonReportViewer';

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: { game: { teams: Record<string, { city: string; name: string }> } }) => unknown) =>
    selector({
      game: {
        teams: {
          user: { city: 'Chicago', name: 'Blaze' },
        },
      },
    }),
}));

function makeReport(overrides: Partial<SeasonReport> = {}): SeasonReport {
  return {
    year: 2031,
    teamId: 'user',
    overallGrade: 'A',
    sections: [
      {
        title: 'Season Overview',
        grade: 'A',
        summary: 'Won the division and hosted a playoff game.',
        highlights: ['12-5 record', 'Top-five point differential'],
        stats: { record: '12-5', pointDifferential: 88 },
      },
      {
        title: 'Roster Health',
        grade: 'B+',
        summary: 'Managed injuries without losing the locker room.',
        highlights: ['Two starters returned by playoffs'],
        stats: { gamesMissed: 14 },
      },
    ],
    ...overrides,
  };
}

describe('SeasonReportViewer', () => {
  it('builds source rows from saved report metadata without inventing a write path', () => {
    expect(buildSeasonReportSourceRows(makeReport())).toEqual([
      expect.objectContaining({
        id: 'saved-report',
        status: 'Year 2031',
        detail: expect.stringContaining('game.seasonReports'),
      }),
      expect.objectContaining({
        id: 'writer-path',
        status: 'offseason',
        detail: expect.stringContaining('generateSeasonReport'),
      }),
      expect.objectContaining({
        id: 'saved-sections',
        status: '2 sections',
        detail: expect.stringContaining('saved report.sections'),
      }),
      expect.objectContaining({
        id: 'modal-state',
        status: 'route-local',
        detail: expect.stringContaining('does not write saves'),
      }),
    ]);
  });

  it('renders season report source ownership inside the modal', () => {
    const markup = renderToStaticMarkup(
      <SeasonReportViewer report={makeReport()} open onOpenChange={vi.fn()} />,
    );

    expect(markup).toContain('SEASON REPORT SOURCES');
    expect(markup).toContain('Saved report');
    expect(markup).toContain('Writer path');
    expect(markup).toContain('Saved sections');
    expect(markup).toContain('Modal state');
    expect(markup).toContain('game.seasonReports');
    expect(markup).toContain('selectSeasonReports');
    expect(markup).toContain('advanceOffseason');
    expect(markup).toContain('generateSeasonReport');
    expect(markup).toContain('does not write saves');
  });
});
