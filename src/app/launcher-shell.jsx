import React, { useEffect, useMemo, useState } from 'react';

import { buildDiagnosticsPayload } from './diagnostics.js';
import { BOOT_MODES } from './boot-mode.js';
import { STORAGE_MODE_KEY } from './launcher-copy.js';
import { resolveModeRouting } from './mode-routing.js';
import { endPerfSpan, startPerfSpan } from './perf-metrics.js';
import PlayScreen from './play-screen.jsx';
import StatusScreen from './status-screen.jsx';
import TopNav from './top-nav.jsx';

var T = {
  bg: '#020617',
  panel: '#0f172a',
  text: '#f1f5f9',
  dim: '#94a3b8',
  cyan: '#22d3ee',
  border: '#334155',
};

export function safeReadStorage(key, storage) {
  var store = storage;
  if (!store && typeof window !== 'undefined') {
    store = window.localStorage;
  }
  if (!store) {
    return { ok: false, value: '', error: 'storage unavailable' };
  }
  try {
    var value = store.getItem(key);
    return { ok: true, value: value || '', error: '' };
  } catch (err) {
    return { ok: false, value: '', error: err && err.message ? err.message : String(err) };
  }
}

export function safeWriteStorage(key, value, storage) {
  var store = storage;
  if (!store && typeof window !== 'undefined') {
    store = window.localStorage;
  }
  if (!store) return { ok: false, error: 'storage unavailable' };
  try {
    store.setItem(key, value);
    return { ok: true, error: '' };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

export function deriveLauncherBoot(input) {
  var opts = input || {};
  var out = resolveModeRouting({
    query: opts.query,
    hash: opts.hash,
    storageValue: opts.storageValue,
    defaultMode: opts.defaultMode || BOOT_MODES.STATUS,
  });
  return {
    mode: out.mode,
    forcedMode: out.forcedMode,
  };
}

export default function LauncherShell(props) {
  var basePath = props && props.basePath ? props.basePath : '/';
  var showDiagnostics = !!(props && props.showDiagnostics);
  var enableSaveImportExport = props && typeof props.enableSaveImportExport === 'boolean'
    ? props.enableSaveImportExport
    : !!(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENABLE_SAVE_IMPORT_EXPORT === '1');

  var search = typeof window !== 'undefined' ? window.location.search : '';
  var hash = typeof window !== 'undefined' ? window.location.hash : '';

  var storageRead = safeReadStorage(STORAGE_MODE_KEY);
  var boot = deriveLauncherBoot({
    query: search,
    hash: hash,
    storageValue: storageRead.value,
    defaultMode: BOOT_MODES.STATUS,
  });

  var state = useState(boot.mode);
  var mode = state[0];
  var setMode = state[1];
  var runtimeState = useState(null);
  var runtime = runtimeState[0];
  var setRuntime = runtimeState[1];
  var playabilityState = useState({ loading: true, ok: true, missingFiles: [] });
  var playability = playabilityState[0];
  var setPlayability = playabilityState[1];

  useEffect(function () {
    safeWriteStorage(STORAGE_MODE_KEY, mode);
  }, [mode]);

  useEffect(function () {
    var bootSpan = startPerfSpan('launcher_boot', { mode: boot.mode });
    var timer = null;
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      var raf = window.requestAnimationFrame(function () {
        endPerfSpan(bootSpan, { result: 'rendered', mode: boot.mode });
      });
      return function () {
        if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(raf);
      };
    }
    timer = setTimeout(function () {
      endPerfSpan(bootSpan, { result: 'rendered', mode: boot.mode });
    }, 0);
    return function () {
      if (timer) clearTimeout(timer);
    };
  }, [boot.mode]);

  useEffect(function () {
    if (boot.forcedMode && mode !== boot.forcedMode) {
      setMode(boot.forcedMode);
    }
  }, [boot.forcedMode, mode]);

  var diagnostics = useMemo(function () {
    return buildDiagnosticsPayload({
      bootMode: mode,
      forcedMode: boot.forcedMode,
      runtime: runtime || { loading: mode === BOOT_MODES.STATUS },
      playability: playability,
    });
  }, [boot.forcedMode, mode, playability, runtime]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <TopNav
        mode={mode}
        forcedMode={boot.forcedMode}
        runtimeVersion="v100"
        onChangeMode={function (nextMode) {
          if (boot.forcedMode) {
            setMode(boot.forcedMode);
            return;
          }
          setMode(nextMode);
        }}
        theme={T}
      />

      {showDiagnostics ? (
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '10px 20px 0', color: T.dim, fontSize: 11 }}>
          <div style={{ border: '1px solid ' + T.border, borderRadius: 8, padding: 10, background: '#111827' }}>
            Diagnostics: mode={diagnostics.bootMode}; forced={diagnostics.forcedMode || 'none'}; runtimeChecks={diagnostics.runtime.checkCount}; runtimeOk={String(diagnostics.runtime.ok)}; playableOk={String(diagnostics.playability.ok)}
          </div>
        </div>
      ) : null}

      {mode === BOOT_MODES.STATUS ? (
        <div role="tabpanel" id="panel-status" aria-labelledby="tab-status">
          <StatusScreen onRuntimeState={setRuntime} />
        </div>
      ) : (
        <div role="tabpanel" id="panel-play" aria-labelledby="tab-play">
          <PlayScreen
            basePath={basePath}
            onPlayabilityState={setPlayability}
            enableSaveImportExport={enableSaveImportExport}
          />
        </div>
      )}
    </div>
  );
}
