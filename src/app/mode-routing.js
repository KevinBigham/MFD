import {
  BOOT_MODES,
  detectForcedMode,
  parseBootMode,
  parseModeFromHash,
  parseModeFromQuery,
  resolveBootMode,
} from './boot-mode.js';

export function canonicalizeMode(input, defaultMode) {
  return parseBootMode(input) || parseBootMode(defaultMode) || BOOT_MODES.STATUS;
}

export function parseCanonicalQueryMode(query) {
  return parseBootMode(parseModeFromQuery(query));
}

export function parseCanonicalHashMode(hash) {
  return parseBootMode(parseModeFromHash(hash));
}

export function resolveModeRouting(input) {
  var opts = input || {};
  var defaultMode = canonicalizeMode(opts.defaultMode, BOOT_MODES.STATUS);
  var forcedMode = parseBootMode(detectForcedMode({ query: opts.query, hash: opts.hash }));
  if (forcedMode && opts.forceLock !== false) {
    return { mode: forcedMode, forcedMode: forcedMode, source: 'forced' };
  }

  var mode = resolveBootMode({
    query: opts.query,
    hash: opts.hash,
    storageValue: opts.storageValue,
    defaultMode: defaultMode,
  });
  var source = 'default';
  if (parseCanonicalQueryMode(opts.query)) source = 'query';
  else if (parseCanonicalHashMode(opts.hash)) source = 'hash';
  else if (parseBootMode(opts.storageValue)) source = 'storage';

  return {
    mode: canonicalizeMode(mode, defaultMode),
    forcedMode: forcedMode,
    source: source,
  };
}

export function hydrateModeFromLocation(input) {
  var opts = input || {};
  var win = opts.windowLike;
  if (!win || !win.location) {
    return resolveModeRouting({
      query: '',
      hash: '',
      storageValue: opts.storageValue,
      defaultMode: opts.defaultMode || BOOT_MODES.STATUS,
      forceLock: opts.forceLock,
    });
  }
  return resolveModeRouting({
    query: win.location.search || '',
    hash: win.location.hash || '',
    storageValue: opts.storageValue,
    defaultMode: opts.defaultMode || BOOT_MODES.STATUS,
    forceLock: opts.forceLock,
  });
}

export function buildModeRoutingMatrix() {
  var inputs = [
    { query: '?mode=play', hash: '#status', storageValue: 'status', defaultMode: 'status' },
    { query: '', hash: '#mode=play', storageValue: 'status', defaultMode: 'status' },
    { query: '', hash: '', storageValue: 'play', defaultMode: 'status' },
    { query: '', hash: '', storageValue: 'invalid', defaultMode: 'status' },
    { query: '?mode=invalid', hash: '#oops', storageValue: 'invalid', defaultMode: 'play' },
  ];
  return inputs.map(function (entry) {
    return {
      input: entry,
      output: resolveModeRouting(entry),
    };
  });
}
