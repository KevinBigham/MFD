import { describe, expect, it } from 'vitest';

import { CEREMONY_986 } from '../src/systems/ceremony.js';
import { CEREMONY_986 as GAME_FEATURES_CEREMONY_986 } from '../src/systems/game-features.js';

describe('ceremony.js', () => {
  it('exports the adapter directly and through game-features with matching behavior', () => {
    expect(GAME_FEATURES_CEREMONY_986).toBe(CEREMONY_986);

    const retirement = CEREMONY_986.generateRetirementSpeech(
      { name: 'Joe Star', pos: 'QB' },
      { city: 'Philly', name: 'Eagles' },
      { seasons: 11, proBowls: 4, passYds: 22000 }
    );
    expect(retirement.lines[0]).toBe("\"It's been an incredible journey with the Philly Eagles.\"");
    expect(retirement.lines).toContain("\"4 Pro Bowls — each one a reminder of the team behind me.\"");
    expect(retirement.isHoFWorthy).toBe(true);

    const hof = CEREMONY_986.generateHoFSpeech(
      { college: { school: 'State U' } },
      { allPros: 2 }
    );
    expect(hof[1]).toContain('State U');
    expect(hof).toContain("\"2 All-Pro selections. That's the one I'm most proud of.\"");
  });
});
