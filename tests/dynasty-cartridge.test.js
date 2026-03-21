import { describe, expect, it } from 'vitest';
import { DYNASTY_CARTRIDGE } from '../src/systems/dynasty-cartridge.js';

describe('dynasty-cartridge', function () {
  var mockSave = {
    teams: [{ id: 1, name: 'Eagles', wins: 10, losses: 3 }],
    season: { year: 2028, week: 14, phase: 'regular' },
    myId: 1,
  };

  it('builds a cartridge with base64 output', function () {
    var result = DYNASTY_CARTRIDGE.build(mockSave, { teamName: 'Eagles', season: 2028, week: 14 });
    expect(result.ok).toBe(true);
    expect(result.base64).toBeTruthy();
    expect(result.base64.length).toBeGreaterThan(0);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.compressedSize).toBeGreaterThan(0);
  });

  it('round-trips through build and parse', function () {
    var built = DYNASTY_CARTRIDGE.build(mockSave, { teamName: 'Eagles' });
    var parsed = DYNASTY_CARTRIDGE.parse(built.base64);
    expect(parsed.ok).toBe(true);
    expect(parsed.save.teams[0].name).toBe('Eagles');
    expect(parsed.save.season.year).toBe(2028);
  });

  it('rejects empty input', function () {
    var result = DYNASTY_CARTRIDGE.parse('');
    expect(result.ok).toBe(false);
  });

  it('rejects garbage input', function () {
    var result = DYNASTY_CARTRIDGE.parse('not-a-valid-cartridge!!');
    expect(result.ok).toBe(false);
  });

  it('parses raw JSON fallback', function () {
    var json = JSON.stringify({ save: mockSave, version: 986 });
    var result = DYNASTY_CARTRIDGE.parse(json);
    expect(result.ok).toBe(true);
    expect(result.version).toBe('legacy-json');
  });

  it('shouldPromptBackup returns true when never exported', function () {
    expect(DYNASTY_CARTRIDGE.shouldPromptBackup(0, 1)).toBe(true);
  });

  it('shouldPromptBackup returns false when recently exported', function () {
    expect(DYNASTY_CARTRIDGE.shouldPromptBackup(Date.now(), 5)).toBe(false);
  });

  it('returns error for null save', function () {
    var result = DYNASTY_CARTRIDGE.build(null);
    expect(result.ok).toBe(false);
  });
});
