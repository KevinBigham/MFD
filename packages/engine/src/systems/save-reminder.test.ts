import { describe, expect, it } from 'vitest';
import { getSaveReminderMessage, shouldShowSaveReminder } from './save-reminder';

describe('save reminder system', () => {
  it('shows a reminder at year five with no previous portable export', () => {
    expect(shouldShowSaveReminder(5, null)).toBe(true);
  });

  it('does not show a reminder at year three', () => {
    expect(shouldShowSaveReminder(3, null)).toBe(false);
  });

  it('suppresses the reminder when a portable backup happened this season window', () => {
    expect(shouldShowSaveReminder(10, 8)).toBe(false);
  });

  it('shows a reminder again at year ten when the last portable backup was year five', () => {
    expect(shouldShowSaveReminder(10, 5)).toBe(true);
  });

  it('does not show a reminder at year zero', () => {
    expect(shouldShowSaveReminder(0, null)).toBe(false);
  });

  it('builds a themed reminder message for the current season', () => {
    expect(getSaveReminderMessage(10)).toContain('Season 10 complete');
    expect(getSaveReminderMessage(10)).toContain('10 seasons deep');
    expect(getSaveReminderMessage(10)).toContain('.mfd');
    expect(getSaveReminderMessage(10)).toContain('portable backup');
  });
});
