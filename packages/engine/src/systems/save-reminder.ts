const SAVE_REMINDER_INTERVAL = 5;

export function shouldShowSaveReminder(year: number, lastManualSaveYear: number | null): boolean {
  return year > 0
    && year % SAVE_REMINDER_INTERVAL === 0
    && (lastManualSaveYear === null || year - lastManualSaveYear >= SAVE_REMINDER_INTERVAL);
}

export function getSaveReminderMessage(year: number): string {
  return `Season ${year} complete. Your dynasty is ${year} seasons deep — consider creating a manual save to protect your progress.`;
}
