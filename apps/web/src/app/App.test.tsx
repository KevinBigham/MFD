// @ts-nocheck - test-only file, vitest provides node APIs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('App Chip setup wiring', () => {
  const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');

  it('defines the 9 Chip onboarding stages in beat order', () => {
    const ids = Array.from(content.matchAll(/id: '(chip\.onboarding\.beat-\d)'/g), (match) => match[1]);

    expect(ids).toEqual([
      'chip.onboarding.beat-1',
      'chip.onboarding.beat-2',
      'chip.onboarding.beat-3',
      'chip.onboarding.beat-4',
      'chip.onboarding.beat-5',
      'chip.onboarding.beat-6',
      'chip.onboarding.beat-7',
      'chip.onboarding.beat-8',
      'chip.onboarding.beat-9',
    ]);
  });

  it('maps Chip stage labels to the Slice A setup beats', () => {
    const labels = Array.from(content.matchAll(/label: '([^']+)', content: null/g), (match) => match[1]);

    expect(labels).toEqual([
      'Cold Open',
      'Team Select',
      'AGM Hire',
      'Depth Philosophy',
      'Season Goals',
      'Culture Mandate',
      'Blueprint Reveal',
      'Kickoff',
      'Dashboard Handoff',
    ]);
  });

  it('uses the existing first-ten localStorage marker for new-game detection', () => {
    expect(content).toContain("import { readFirstTenMinutesCompleted } from '../features/franchise-setup/setupPersistence'");
    expect(content).toContain('export function isChipNewGameSetup(storage: ChipSetupStorage = resolveChipSetupStorage()): boolean');
    expect(content).toContain('return !readFirstTenMinutesCompleted(storage);');
  });

  it('memoizes the localStorage read and passes the result as ChipHost newGame', () => {
    expect(content).toContain('const chipSetupStorage = useMemo(() => resolveChipSetupStorage(), []);');
    expect(content).toContain('const chipNewGame = useMemo(() => isChipNewGameSetup(chipSetupStorage), [chipSetupStorage]);');
    expect(content).toContain('<ChipHost newGame={chipNewGame} stages={CHIP_FRANCHISE_SETUP_STAGES}>');
  });

  it('wraps FranchiseSetupWizard in ChipHost at the setup gate', () => {
    expect(content).toContain("import { ChipHost, type ChipHostStage } from '../features/companion'");
    expect(content).toContain('<ChipHost newGame={chipNewGame} stages={CHIP_FRANCHISE_SETUP_STAGES}>');
    expect(content).toContain('<FranchiseSetupWizard />');
    expect(content).toContain('</ChipHost>');
  });
});
