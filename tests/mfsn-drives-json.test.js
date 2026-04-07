import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mfsnDrivesJson = JSON.parse(
  readFileSync(new URL('../src/data/mfsn-drives.json', import.meta.url), 'utf8')
);

describe('mfsn-drives.json', () => {
  it('contains drives and momentum sections with expected keys', () => {
    expect(mfsnDrivesJson).toHaveProperty('drives');
    expect(mfsnDrivesJson).toHaveProperty('momentum');
    ['TD', 'TO', 'FG', 'PUNT', 'SAFETY'].forEach((k) => {
      expect(mfsnDrivesJson.drives).toHaveProperty(k);
      expect(Array.isArray(mfsnDrivesJson.drives[k])).toBe(true);
      expect(mfsnDrivesJson.drives[k].length).toBeGreaterThan(5);
    });
  });

  it('keeps momentum and clutch category pools populated', () => {
    expect(mfsnDrivesJson.momentum.takeLead.length).toBeGreaterThan(5);
    expect(mfsnDrivesJson.momentum.extendLead.length).toBeGreaterThan(5);
    expect(mfsnDrivesJson.momentum.comeback.length).toBeGreaterThan(5);
    expect(mfsnDrivesJson.clutch.twoMinute.length).toBeGreaterThan(5);
    expect(mfsnDrivesJson.clutch.goalLine.length).toBeGreaterThan(5);
  });
});
