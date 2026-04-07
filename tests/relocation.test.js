import { describe, expect, it } from 'vitest';

import { RELOCATION976, RELOCATION_CITIES976 } from '../src/systems/relocation.js';

describe('relocation.js', () => {
  it('canRelocate enforces year, cash, and cooldown requirements', () => {
    const tooEarly = RELOCATION976.canRelocate({ cash: 100, ownerMood: 50 }, { year: 2027 }, []);
    expect(tooEarly.ok).toBe(false);

    const noCash = RELOCATION976.canRelocate({ cash: 20, ownerMood: 50 }, { year: 2029 }, []);
    expect(noCash.ok).toBe(false);

    const cooldown = RELOCATION976.canRelocate({ cash: 100, ownerMood: 30, _relocYear976: 2027 }, { year: 2030 }, []);
    expect(cooldown.ok).toBe(false);

    const ok = RELOCATION976.canRelocate({ cash: 100, ownerMood: 30 }, { year: 2030 }, []);
    expect(ok.ok).toBe(true);
  });

  it('relocate updates city/branding, finances, morale/chemistry, and facilities', () => {
    const destination = RELOCATION_CITIES976.find((c) => c.city === 'Austin');
    const team = {
      id: 'me',
      city: 'Old City',
      name: 'Old Name',
      abbr: 'OLD',
      icon: '🏈',
      prestige: 50,
      ownerMood: 60,
      cash: 200,
      deadCap: 0,
      facilities: { stad: 3 },
      roster: [
        { name: 'Player 1', chemistry: 70, morale: 75 },
        { name: 'Player 2', chemistry: 60, morale: 68 },
      ],
    };

    const out = RELOCATION976.relocate(team, destination, { year: 2030 }, { teamName: 'Austin Rockets', abbr: 'AUS' });
    expect(out.ok).toBe(true);
    expect(team.city).toBe('Austin');
    expect(team.name).toBe('Austin Rockets');
    expect(team.abbr).toBe('AUS');
    expect(team.cash).toBeLessThan(200);
    expect(team.facilities.stad).toBe(1);
    expect(team.roster[0].chemistry).toBeLessThanOrEqual(70);
    expect(team.roster[0].morale).toBeLessThanOrEqual(75);
  });

  it('relocate rejects move when cash is insufficient for destination cost', () => {
    const destination = RELOCATION_CITIES976.find((c) => c.city === 'London');
    const team = { cash: 10, roster: [] };
    const out = RELOCATION976.relocate(team, destination, { year: 2032 }, null);
    expect(out.ok).toBe(false);
  });
});
