import { BOOT_MODES, parseBootMode } from './boot-mode.js';

export function normalizeDiagnosticsMode(mode) {
  return parseBootMode(mode) || BOOT_MODES.STATUS;
}

export function buildDiagnosticsPayload(input) {
  var data = input || {};
  var runtime = data.runtime || {};
  var playability = data.playability || {};

  return {
    bootMode: normalizeDiagnosticsMode(data.bootMode),
    forcedMode: parseBootMode(data.forcedMode) || '',
    runtime: {
      loading: !!runtime.loading,
      hasError: !!runtime.error,
      checkCount: runtime.validation && typeof runtime.validation.checkCount === 'number'
        ? runtime.validation.checkCount
        : 0,
      ok: !!(runtime.validation && runtime.validation.ok),
    },
    playability: {
      loading: !!playability.loading,
      ok: playability.ok !== false,
      missingCount: Array.isArray(playability.missingFiles) ? playability.missingFiles.length : 0,
    },
  };
}
