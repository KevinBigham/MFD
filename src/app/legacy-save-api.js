import { LZW } from '../utils/lzw.js';

export var LEGACY_SAVE_DB = 'MrFootballDynasty';
export var LEGACY_SAVE_STORE = 'saves';
export var LEGACY_AUTOSAVE_KEY = 'autosave';
export var FALLBACK_SAVE_KEY = 'mr-football-save';
export var FALLBACK_BOXSCORES_KEY = 'mr-football-boxscores';
export var ENCODED_PREFIX = 'LZW1:';

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function';
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return '';
  }
}

function base64Encode(rawBinary) {
  if (typeof btoa === 'function') return btoa(rawBinary);
  if (typeof Buffer !== 'undefined') return Buffer.from(rawBinary, 'binary').toString('base64');
  throw new Error('No base64 encoder available');
}

function base64Decode(rawBase64) {
  if (typeof atob === 'function') return atob(rawBase64);
  if (typeof Buffer !== 'undefined') return Buffer.from(rawBase64, 'base64').toString('binary');
  throw new Error('No base64 decoder available');
}

function utf8ToBinary(input) {
  if (typeof unescape === 'function') return unescape(encodeURIComponent(input));
  if (typeof Buffer !== 'undefined') return Buffer.from(input, 'utf8').toString('binary');
  return input;
}

function binaryToUtf8(input) {
  if (typeof escape === 'function') return decodeURIComponent(escape(input));
  if (typeof Buffer !== 'undefined') return Buffer.from(input, 'binary').toString('utf8');
  return input;
}

function compressToEncodedPayload(json) {
  var compressed = LZW.compress(json);
  var safeBinary = utf8ToBinary(compressed);
  return ENCODED_PREFIX + base64Encode(safeBinary);
}

function decompressEncodedPayload(encoded) {
  var raw = String(encoded || '');
  var payload = raw.indexOf(ENCODED_PREFIX) === 0 ? raw.slice(ENCODED_PREFIX.length) : raw;
  var safeBinary = base64Decode(payload);
  var compressed = binaryToUtf8(safeBinary);
  return LZW.decompress(compressed);
}

function getStorage(options) {
  if (options && options.storage) return options.storage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

function openSaveDb(options) {
  var opts = options || {};
  if (opts.dbAdapter && typeof opts.dbAdapter.open === 'function') {
    return Promise.resolve(opts.dbAdapter.open());
  }
  if (!hasIndexedDb()) return Promise.resolve(null);
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(LEGACY_SAVE_DB, 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_SAVE_STORE)) {
        db.createObjectStore(LEGACY_SAVE_STORE);
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error || new Error('indexedDB open failed')); };
  });
}

function readIndexedDbRecord(options) {
  var opts = options || {};
  if (opts.dbAdapter && typeof opts.dbAdapter.get === 'function') {
    return Promise.resolve(opts.dbAdapter.get(LEGACY_AUTOSAVE_KEY));
  }
  return openSaveDb(opts).then(function (db) {
    if (!db) return null;
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(LEGACY_SAVE_STORE, 'readonly');
      var store = tx.objectStore(LEGACY_SAVE_STORE);
      var req = store.get(LEGACY_AUTOSAVE_KEY);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error || new Error('indexedDB read failed')); };
      tx.oncomplete = function () { if (db && typeof db.close === 'function') db.close(); };
    });
  });
}

function writeIndexedDbRecord(encodedPayload, payload, options) {
  var opts = options || {};
  var record = {
    id: LEGACY_AUTOSAVE_KEY,
    payload: encodedPayload,
    meta: {
      schema: 1,
      checksum: checksumString(encodedPayload),
      size: encodedPayload.length,
    },
    updatedAt: Date.now(),
  };
  if (opts.dbAdapter && typeof opts.dbAdapter.set === 'function') {
    return Promise.resolve(opts.dbAdapter.set(LEGACY_AUTOSAVE_KEY, record));
  }
  return openSaveDb(opts).then(function (db) {
    if (!db) return false;
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(LEGACY_SAVE_STORE, 'readwrite');
      var store = tx.objectStore(LEGACY_SAVE_STORE);
      var req = store.put(record, LEGACY_AUTOSAVE_KEY);
      req.onsuccess = function () { resolve(true); };
      req.onerror = function () { reject(req.error || new Error('indexedDB write failed')); };
      tx.oncomplete = function () { if (db && typeof db.close === 'function') db.close(); };
    });
  });
}

function normalizeRecord(record) {
  if (!record) return { encoded: '', updatedAt: 0, meta: {} };
  if (typeof record === 'string') {
    return { encoded: record, updatedAt: 0, meta: {} };
  }
  if (typeof record === 'object') {
    return {
      encoded: String(record.payload || record.data || record.raw || ''),
      updatedAt: Number(record.updatedAt || record.ts || 0) || 0,
      meta: record.meta && typeof record.meta === 'object' ? record.meta : {},
    };
  }
  return { encoded: '', updatedAt: 0, meta: {} };
}

export function checksumString(input) {
  var text = String(input || '');
  var hash = 2166136261;
  for (var i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function verifyAutosavePayload(payload) {
  var errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push('payload must be a plain object');
  } else {
    var json = safeStringify(payload);
    if (!json) {
      errors.push('payload must be JSON serializable');
    } else if (json.length < 2) {
      errors.push('payload JSON is empty');
    }
  }
  return { ok: errors.length === 0, errors: errors };
}

export function encodeAutosavePayload(payload) {
  var check = verifyAutosavePayload(payload);
  if (!check.ok) {
    throw new Error(check.errors.join('; '));
  }
  var json = JSON.stringify(payload);
  return compressToEncodedPayload(json);
}

export function decodeAutosavePayload(rawPayload) {
  var text = String(rawPayload || '').trim();
  if (!text) {
    return { ok: false, payload: null, error: 'empty payload', format: 'none' };
  }
  try {
    if (text.indexOf(ENCODED_PREFIX) === 0) {
      var json = decompressEncodedPayload(text);
      return { ok: true, payload: JSON.parse(json), error: '', format: 'lzw1' };
    }
    return { ok: true, payload: JSON.parse(text), error: '', format: 'json' };
  } catch (err) {
    return {
      ok: false,
      payload: null,
      error: err && err.message ? err.message : String(err),
      format: text.indexOf(ENCODED_PREFIX) === 0 ? 'lzw1' : 'json',
    };
  }
}

export async function readAutosavePayload(options) {
  var errors = [];
  try {
    var record = await readIndexedDbRecord(options);
    var normalized = normalizeRecord(record);
    if (normalized.encoded) {
      var decoded = decodeAutosavePayload(normalized.encoded);
      if (decoded.ok) {
        return {
          ok: true,
          payload: decoded.payload,
          source: 'indexeddb',
          format: decoded.format,
          updatedAt: normalized.updatedAt,
          meta: normalized.meta,
          error: '',
        };
      }
      errors.push('indexeddb decode failed: ' + decoded.error);
    }
  } catch (err) {
    errors.push('indexeddb read failed: ' + (err && err.message ? err.message : String(err)));
  }

  var storage = getStorage(options);
  if (storage) {
    try {
      var raw = storage.getItem(FALLBACK_SAVE_KEY);
      if (raw) {
        var parsed = decodeAutosavePayload(raw);
        if (parsed.ok) {
          return {
            ok: true,
            payload: parsed.payload,
            source: 'localStorage',
            format: parsed.format,
            updatedAt: 0,
            meta: {},
            error: '',
          };
        }
        errors.push('localStorage decode failed: ' + parsed.error);
      }
    } catch (err2) {
      errors.push('localStorage read failed: ' + (err2 && err2.message ? err2.message : String(err2)));
    }
  }

  return {
    ok: false,
    payload: null,
    source: 'none',
    format: 'none',
    updatedAt: 0,
    meta: {},
    error: errors.join('; ') || 'autosave payload not found',
  };
}

export async function readAutosaveMeta(options) {
  var out = await readAutosavePayload(options);
  if (!out.ok) {
    return {
      ok: false,
      source: out.source,
      format: out.format,
      updatedAt: 0,
      checksum: '',
      error: out.error,
    };
  }
  return {
    ok: true,
    source: out.source,
    format: out.format,
    updatedAt: out.updatedAt || 0,
    checksum: checksumString(JSON.stringify(out.payload || {})),
    error: '',
  };
}

export async function writeAutosavePayload(payload, options) {
  var check = verifyAutosavePayload(payload);
  if (!check.ok) {
    return { ok: false, writtenTo: [], errors: check.errors };
  }

  var encoded = encodeAutosavePayload(payload);
  var writtenTo = [];
  var errors = [];

  try {
    var wroteDb = await writeIndexedDbRecord(encoded, payload, options);
    if (wroteDb) writtenTo.push('indexeddb');
  } catch (err) {
    errors.push('indexeddb write failed: ' + (err && err.message ? err.message : String(err)));
  }

  var storage = getStorage(options);
  if (storage) {
    try {
      storage.setItem(FALLBACK_SAVE_KEY, encoded);
      writtenTo.push('localStorage');
    } catch (err2) {
      errors.push('localStorage write failed: ' + (err2 && err2.message ? err2.message : String(err2)));
    }
  }
  if (writtenTo.length === 0 && errors.length === 0) {
    errors.push('no writable save backends available');
  }

  return {
    ok: errors.length === 0,
    writtenTo: writtenTo,
    errors: errors,
    encodedSize: encoded.length,
  };
}
