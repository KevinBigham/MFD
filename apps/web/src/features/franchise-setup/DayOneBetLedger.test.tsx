import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DayOneDecisionLedger } from './DayOneBetLedger';

describe('DayOneDecisionLedger', () => {
  it('names the first setup commitment when no Day 1 decisions are locked', () => {
    const html = renderToStaticMarkup(<DayOneDecisionLedger entries={[]} />);

    expect(html).toContain('SETUP DECISION IMPACT');
    expect(html).toContain('Next action: hire the Assistant GM first.');
    expect(html).toContain('hire the Assistant GM first');
    expect(html).toContain("sets Chip&#x27;s first setup priority: cap space, starter and backup jobs, the Week 1 game plan, or owner patience");
    expect(html).toContain('Consequence: choosing cap guidance while roster jobs or the plan are unsettled keeps money up front; unassigned players and no coach owning the plan still need fixing before Week 1.');
    expect(html).not.toContain('whether Chip watches cap space');
    expect(html).not.toContain('can leave Week 1');
    expect(html).not.toMatch(/coach play calls|play-call owner/i);
    expect(html).not.toMatch(/staff authority|staff-authority/i);
    expect(html).not.toContain('No setup decision is locked yet');
    expect(html).not.toContain('which setup screen he points you to');
    expect(html).not.toContain('setup choices are locked');
    expect(html).not.toContain('room still needs');
    expect(html).not.toContain('risks Chip highlights');
    expect(html).not.toMatch(/first Week 1 consequence to control|bigger consequence|carry the bigger consequence/i);
  });

  it('renders locked setup decisions with Week 1, risk, and consequence framing', () => {
    const html = renderToStaticMarkup(
      <DayOneDecisionLedger
        entries={[
          {
            id: 'agm',
            label: 'AGM',
            choice: 'Marcus Webb',
            readinessDelta: 0,
            volatilityDelta: 0,
            summaryLine: 'Use cap discipline before Week 1; panic spending blocks later fixes.',
          },
          {
            id: 'cap',
            label: 'Cap Package',
            choice: 'Restructure Multiple Contracts',
            readinessDelta: 4,
            volatilityDelta: 3,
            summaryLine: 'Choose multiple restructures when Week 1 needs a roster upgrade now; future cap hits limit injury, trade, and extension fixes.',
          },
        ]}
      />,
    );

    expect(html).toContain('SETUP DECISION IMPACT');
    expect(html).toContain('Marcus Webb');
    expect(html).toContain('Restructure Multiple Contracts');
    expect(html).toContain('WEEK 1 +4');
    expect(html).toContain('MISTAKE CHANCE +3');
    expect(html).toContain('future cap hits limit injury, trade, and extension fixes');
    expect(html).not.toContain('RISK +3');
    expect(html).not.toMatch(/DAY 1 DECISION LEDGER|owner heat|room still needs|\bfirst bet\b|real bite|push chips|day 1 bet|\bvol\b|Aggressive Cap Push|cap posture/i);
    expect(html).not.toMatch(/DAY 1 BET LEDGER|LEDGER SOURCES|generateDayOneNarrativePack|previewSetupForecastChange|setupState|does not autosave|finalize the franchise/i);
  });
});
