const SAVE_REMINDER_INTERVAL = 5;

export function shouldShowSaveReminder(year: number, lastPortableExportYear: number | null): boolean {
  return year > 0
    && year % SAVE_REMINDER_INTERVAL === 0
    && (lastPortableExportYear === null || year - lastPortableExportYear >= SAVE_REMINDER_INTERVAL);
}

export function getSaveReminderMessage(year: number): string {
  return `Season ${year} complete. Your dynasty is ${year} seasons deep — export a portable backup to a .mfd file to protect your progress.`;
}
