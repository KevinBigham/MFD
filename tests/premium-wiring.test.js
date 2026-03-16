import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { saveSlot } from '../src/app/save-slots-store.js';
import { PREMIUM } from '../src/systems/premium.js';

function createMemoryStorage() {
  var data = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: function (key, value) {
      data[key] = String(value);
    },
    removeItem: function (key) {
      delete data[key];
    },
  };
}

function installPremiumStorage() {
  var premiumData = {};
  globalThis.localStorage = {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(premiumData, k) ? premiumData[k] : null;
    },
    setItem: function (k, v) {
      premiumData[k] = String(v);
    },
    removeItem: function (k) {
      delete premiumData[k];
    },
  };
}

describe('premium wiring', () => {
  var originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    installPremiumStorage();
    PREMIUM.reset();
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  it('enforces 3 base save slots without premium unlock', () => {
    var slotStorage = createMemoryStorage();
    expect(saveSlot('s1', { season: 1 }, {}, { storage: slotStorage }).ok).toBe(true);
    expect(saveSlot('s2', { season: 2 }, {}, { storage: slotStorage }).ok).toBe(true);
    expect(saveSlot('s3', { season: 3 }, {}, { storage: slotStorage }).ok).toBe(true);

    var blocked = saveSlot('s4', { season: 4 }, {}, { storage: slotStorage });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain('slot limit');
    expect(blocked.limit).toBe(3);
  });

  it('enforces 8 save slots when extraSaves premium is unlocked', () => {
    PREMIUM.unlock('extraSaves');
    var slotStorage = createMemoryStorage();
    for (var i = 1; i <= 8; i += 1) {
      var out = saveSlot('slot' + i, { season: i }, {}, { storage: slotStorage });
      expect(out.ok).toBe(true);
    }
    var blocked = saveSlot('slot9', { season: 9 }, {}, { storage: slotStorage });
    expect(blocked.ok).toBe(false);
    expect(blocked.limit).toBe(8);
  });

  it('monolith uses premium godMode + scouting bonus hooks', () => {
    var monolithPath = path.resolve(__dirname, '../mr-football-v100.jsx');
    var src = fs.readFileSync(monolithPath, 'utf8');

    expect(src.includes("useState(PREMIUM.isUnlocked('godMode'))")).toBe(true);
    expect(src.includes('PREMIUM.getScoutingBonus()')).toBe(true);
  });

  it('monolith gates quickSim theater state behind premium unlock', () => {
    var monolithPath = path.resolve(__dirname, '../mr-football-v100.jsx');
    var src = fs.readFileSync(monolithPath, 'utf8');

    expect(src.includes("skipPresentation972=PREMIUM.isUnlocked('quickSim')")).toBe(true);
    expect(src.includes('buildTheaterState({result:res')).toBe(true);
  });

  it('monolith gates advancedAnalytics dashboard behind premium unlock', () => {
    var monolithPath = path.resolve(__dirname, '../mr-football-v100.jsx');
    var src = fs.readFileSync(monolithPath, 'utf8');

    expect(src.includes("PREMIUM.isUnlocked('advancedAnalytics')")).toBe(true);
  });
});
