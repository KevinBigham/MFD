import { describe, expect, it } from 'vitest';

import { resolveModeRouting } from '../src/app/mode-routing.js';
import { listSlots, saveSlot } from '../src/app/save-slots-store.js';

function createMemoryStorage() {
  var data = {};
  return {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); },
  };
}

describe('mode-routing + save-slots regression', () => {
  it('mode resolution does not alter slot ordering semantics', () => {
    var storage = createMemoryStorage();
    saveSlot('a', { season: 1 }, {}, { storage: storage, now: 10 });
    saveSlot('b', { season: 1 }, {}, { storage: storage, now: 20 });
    var routing = resolveModeRouting({
      query: '?mode=play',
      hash: '#status',
      storageValue: 'status',
      defaultMode: 'status',
    });

    expect(routing.mode).toBe('play');
    expect(listSlots({ storage: storage }).map(function (slot) { return slot.slotId; })).toEqual(['b', 'a']);
  });
});
