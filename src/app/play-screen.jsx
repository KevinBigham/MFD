import React, { useEffect, useMemo, useRef, useState } from 'react';

import { LEGACY_MANIFEST } from './legacy-manifest.js';
import { buildLegacyGameUrl } from './legacy-url.js';
import { MODE_COPY } from './launcher-copy.js';
import { endPerfSpan, startPerfSpan } from './perf-metrics.js';
import { runPlayabilityCheck } from './playability-check.js';
import { DEFAULT_CONSUMER_PACKET } from './default-consumer-packet.js';
import { createGameEventReceiver, createLiveEventConsumer, CONSUMER_PACKET_MESSAGE_TYPE, PACKET_BACKING, SOURCE_STATE } from './live-event-consumer.js';
import PostgameAutopsy from './postgame-autopsy-view.jsx';

var T = {
  bg: '#0f172a',
  text: '#f1f5f9',
  dim: '#94a3b8',
  border: '#334155',
  cyan: '#22d3ee',
  red: '#ef4444',
  yellow: '#f59e0b',
};

var S = {
  card: {
    background: '#111827',
    border: '1px solid ' + T.border,
    borderRadius: 12,
    padding: 14,
  },
  button: {
    background: T.cyan,
    color: '#001018',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

function normalizeBasePath(basePath) {
  var p = String(basePath || '/').trim();
  if (!p) return '/';
  if (p.charAt(0) !== '/') p = '/' + p;
  if (p.charAt(p.length - 1) !== '/') p += '/';
  return p;
}

export default function PlayScreen(props) {
  var basePath = normalizeBasePath(props && props.basePath);
  var manifest = props && props.manifest ? props.manifest : LEGACY_MANIFEST;
  var probeFn = props && typeof props.probeFn === 'function' ? props.probeFn : null;
  var onPlayabilityState = props && typeof props.onPlayabilityState === 'function'
    ? props.onPlayabilityState
    : null;
  var enableSaveImportExport = !!(props && props.enableSaveImportExport);
  var legacyUrl = useMemo(function () {
    return buildLegacyGameUrl({
      basePath: basePath,
      mode: 'play',
      legacyPath: manifest.entry,
      assetVersion: manifest.assetVersion,
    });
  }, [basePath, manifest]);

  var iframeState = useState({ loading: true, error: '' });
  var frame = iframeState[0];
  var setFrame = iframeState[1];
  var retryState = useState(0);
  var retryNonce = retryState[0];
  var setRetryNonce = retryState[1];
  var loadSpanRef = useRef('');

  var playabilityState = useState({ loading: true, ok: true, missingFiles: [], errors: [] });
  var playability = playabilityState[0];
  var setPlayability = playabilityState[1];

  var consumerRef = useRef(null);
  if (!consumerRef.current) {
    consumerRef.current = createLiveEventConsumer({ fixturePacket: DEFAULT_CONSUMER_PACKET });
  }
  var feedState = useState(consumerRef.current.getViewModel());
  var feedView = feedState[0];
  var setFeedView = feedState[1];

  useEffect(function () {
    if (loadSpanRef.current) {
      endPerfSpan(loadSpanRef.current, { result: 'replaced' });
    }
    loadSpanRef.current = startPerfSpan('play_iframe_load', { reason: 'initial' });

    var active = true;
    setPlayability({ loading: true, ok: true, missingFiles: [], errors: [] });

    runPlayabilityCheck(manifest, probeFn, basePath).then(function (result) {
      if (!active) return;
      setPlayability({
        loading: false,
        ok: !!result.ok,
        missingFiles: result.missingFiles || [],
        errors: result.errors || [],
      });
    }).catch(function (err) {
      if (!active) return;
      setPlayability({
        loading: false,
        ok: false,
        missingFiles: [],
        errors: [err && err.message ? err.message : String(err)],
      });
    });

    return function () {
      active = false;
      if (loadSpanRef.current) {
        endPerfSpan(loadSpanRef.current, { result: 'unmounted' });
        loadSpanRef.current = '';
      }
    };
  }, [basePath, manifest, probeFn]);

  useEffect(function () {
    if (onPlayabilityState) {
      onPlayabilityState(playability);
    }
  }, [onPlayabilityState, playability]);

  useEffect(function () {
    var receiver = createGameEventReceiver({
      onEnvelope: function (envelope) {
        consumerRef.current.ingestMessage({ type: 'mfd:game-event', envelope: envelope });
        setFeedView(consumerRef.current.getViewModel());
      },
      onInvalid: function (_diag) {
        // Malformed game-event envelope — track in diagnostics but do NOT
        // feed back into ingestMessage (which would poison sourceState).
        var d = consumerRef.current.diagnostics;
        d.invalidCount++;
        d.rejectedMessages++;
        d.lastInvalidReason = _diag.reason;
        setFeedView(consumerRef.current.getViewModel());
      },
    });
    var packetHandler = function onPacketMessage(event) {
      if (!event.data || event.data.type !== CONSUMER_PACKET_MESSAGE_TYPE) return;
      consumerRef.current.ingestConsumerPacket(event.data);
      setFeedView(consumerRef.current.getViewModel());
    };
    window.addEventListener('message', packetHandler);
    var stalePoll = setInterval(function () {
      setFeedView(consumerRef.current.getViewModel());
    }, 1000);
    return function () {
      receiver();
      window.removeEventListener('message', packetHandler);
      clearInterval(stalePoll);
    };
  }, []);

  function onRetry() {
    setFrame({ loading: true, error: '' });
    setRetryNonce(function (n) { return n + 1; });
    if (loadSpanRef.current) {
      endPerfSpan(loadSpanRef.current, { result: 'retry' });
    }
    loadSpanRef.current = startPerfSpan('play_iframe_load', { reason: 'retry' });
  }

  function onLoad() {
    setFrame({ loading: false, error: '' });
    if (loadSpanRef.current) {
      endPerfSpan(loadSpanRef.current, { result: 'loaded' });
      loadSpanRef.current = '';
    }
  }

  function onError() {
    setFrame({ loading: false, error: 'Unable to load legacy game iframe.' });
    if (loadSpanRef.current) {
      endPerfSpan(loadSpanRef.current, { result: 'error' });
      loadSpanRef.current = '';
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Debug ribbon removed — Sprint 18 cleanup */}

        {!playability.loading && !playability.ok ? (
          <div style={{ ...S.card, borderColor: T.yellow, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.yellow, marginBottom: 6 }}>
              Playability Check Warning
            </div>
            <div style={{ fontSize: 12, color: T.dim, marginBottom: 6 }}>
              Missing or invalid legacy assets detected. This does not block status mode.
            </div>
            {playability.missingFiles.length > 0 ? (
              <div style={{ fontSize: 11, color: T.dim }}>
              Missing: {playability.missingFiles.join(', ')}
              </div>
            ) : null}
            {playability.missingFiles.length === 0 && playability.errors.length === 0 ? (
              <div style={{ fontSize: 11, color: T.dim }}>
                No explicit missing files were listed; verify legacy asset sync output.
              </div>
            ) : null}
            {playability.errors.length > 0 ? (
              <div style={{ fontSize: 11, color: T.dim }}>
                Errors: {playability.errors.join('; ')}
              </div>
            ) : null}
          </div>
        ) : null}

        {frame.error ? (
          <div style={{ ...S.card, borderColor: T.red, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.red, marginBottom: 8 }}>
              Legacy Launch Error
            </div>
            <div style={{ fontSize: 12, color: T.dim, marginBottom: 10 }}>
              {frame.error}
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginBottom: 10 }}>
              {MODE_COPY.play.recoveryHint}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" style={S.button} onClick={onRetry}>{MODE_COPY.play.retry}</button>
              <a href={legacyUrl} style={{ color: T.cyan, fontSize: 12 }} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                {MODE_COPY.play.openDirect}
              </a>
            </div>
          </div>
        ) : null}

        <div style={{ position: 'relative', border: '1px solid ' + T.border, borderRadius: 12, overflow: 'hidden', minHeight: 700 }}>
          {frame.loading ? (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, padding: 20, pointerEvents: 'none' }}>
              <div style={{ width: '40%', height: 12, background: '#1f2937', borderRadius: 6, marginBottom: 10 }} />
              <div style={{ width: '30%', height: 12, background: '#1f2937', borderRadius: 6, marginBottom: 20 }} />
              <div style={{ width: '100%', height: 400, background: '#0b1220', borderRadius: 10 }} />
            </div>
          ) : null}
          {frame.loading ? (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15,23,42,0.82)',
              color: T.dim,
              zIndex: 2,
              fontSize: 13,
              fontWeight: 700,
            }}>
              {MODE_COPY.play.loading}
            </div>
          ) : null}
          <iframe
            key={retryNonce}
            title="Mr Football Dynasty Legacy"
            src={legacyUrl}
            onLoad={onLoad}
            onError={onError}
            sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-downloads"
            referrerPolicy="no-referrer"
            style={{ width: '100%', minHeight: 700, border: 'none', background: '#0f172a' }}
          />
        </div>
      </div>
    </div>
  );
}
