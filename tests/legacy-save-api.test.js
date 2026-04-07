import { beforeAll, describe, expect, it } from 'vitest';

import {
  decodeAutosavePayload,
  ENCODED_PREFIX,
  encodeAutosavePayload,
  FALLBACK_SAVE_KEY,
  readAutosaveMeta,
  readAutosavePayload,
  verifyAutosavePayload,
  writeAutosavePayload,
} from '../src/app/legacy-save-api.js';

function createMemoryStorage() {
  var map = new Map();
  return {
    getItem: function (key) { return map.has(key) ? map.get(key) : null; },
    setItem: function (key, value) { map.set(key, String(value)); },
    removeItem: function (key) { map.delete(key); },
  };
}

beforeAll(() => {
  if (typeof btoa !== 'function') {
    globalThis.btoa = function (text) {
      return Buffer.from(text, 'binary').toString('base64');
    };
  }
  if (typeof atob !== 'function') {
    globalThis.atob = function (text) {
      return Buffer.from(text, 'base64').toString('binary');
    };
  }
});

describe('legacy-save-api', () => {
  it('verifies payload shape and roundtrip encodes/decodes with LZW1 prefix', () => {
    var payload = { season: 2, week: 7, teamId: 'BOS' };
    expect(verifyAutosavePayload(payload).ok).toBe(true);
    expect(verifyAutosavePayload(null).ok).toBe(false);

    var encoded = encodeAutosavePayload(payload);
    expect(encoded.indexOf(ENCODED_PREFIX)).toBe(0);
    var decoded = decodeAutosavePayload(encoded);
    expect(decoded.ok).toBe(true);
    expect(decoded.payload).toEqual(payload);
  });

  it('reads autosave payload from dbAdapter first', async () => {
    var payload = { season: 4, week: 3, teamId: 'NYC' };
    var encoded = encodeAutosavePayload(payload);
    var out = await readAutosavePayload({
      dbAdapter: {
        get: function () {
          return {
            payload: encoded,
            updatedAt: 123456,
            meta: { source: 'test-db' },
          };
        },
      },
      storage: createMemoryStorage(),
    });

    expect(out.ok).toBe(true);
    expect(out.source).toBe('indexeddb');
    expect(out.payload).toEqual(payload);
  });

  it('falls back to localStorage save key when db path is empty', async () => {
    var storage = createMemoryStorage();
    var payload = { season: 9, week: 1, teamId: 'SEA' };
    storage.setItem(FALLBACK_SAVE_KEY, encodeAutosavePayload(payload));

    var out = await readAutosavePayload({
      dbAdapter: { get: function () { return null; } },
      storage: storage,
    });
    expect(out.ok).toBe(true);
    expect(out.source).toBe('localStorage');
    expect(out.payload).toEqual(payload);
  });

  it('writeAutosavePayload writes db and storage targets and supports metadata read', async () => {
    var storage = createMemoryStorage();
    var written = [];
    var payload = { season: 10, week: 16, teamId: 'DAL' };
    var out = await writeAutosavePayload(payload, {
      storage: storage,
      dbAdapter: {
        set: function (key, value) {
          written.push({ key: key, value: value });
          return true;
        },
      },
    });
    expect(out.ok).toBe(true);
    expect(out.writtenTo).toContain('indexeddb');
    expect(out.writtenTo).toContain('localStorage');
    expect(written.length).toBe(1);

    var meta = await readAutosaveMeta({
      dbAdapter: {
        get: function () {
          return written[0].value;
        },
      },
      storage: storage,
    });
    expect(meta.ok).toBe(true);
    expect(typeof meta.checksum).toBe('string');
    expect(meta.checksum.length).toBeGreaterThanOrEqual(8);
  });

  it('fails write when no writable backend exists', async () => {
    var out = await writeAutosavePayload({ season: 1 }, {
      dbAdapter: { set: function () { return false; } },
      storage: null,
    });
    expect(out.ok).toBe(false);
    expect(out.errors.join(' ')).toContain('no writable save backends');
  });
});
