import React, { useCallback, useEffect, useState } from 'react';

import { importWithTimeout } from '../dev/import-with-timeout.js';
import {
  buildImportFailureState,
  buildLoadingState,
  buildSuccessState,
  buildValidationFailureState,
} from '../dev/main-status-model.js';
import { resolveRuntimePayload } from '../dev/runtime-loader.js';
import { APP_SUBTITLE, APP_TITLE, STATUS_COPY } from './launcher-copy.js';
import { endPerfSpan, startPerfSpan } from './perf-metrics.js';

export var STATUS_THEME = {
  bg: '#0f172a',
  text: '#f1f5f9',
  dim: '#94a3b8',
  faint: '#64748b',
  border: '#334155',
  gold: '#fbbf24',
  cyan: '#22d3ee',
  green: '#34d399',
  red: '#ef4444',
};

export var STATUS_STYLES = {
  card: {
    background: '#111827',
    border: '1px solid ' + STATUS_THEME.border,
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  button: {
    background: STATUS_THEME.cyan,
    color: '#001018',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export var EMPTY_SUMMARY = {
  extractedModulesText: '',
  systemsText: '',
  narrativeText: '',
  buildSystemText: '',
  originalGameText: '',
  footerText: '',
};

export function mapRuntimeError(err) {
  var msg = err && err.message ? err.message : String(err);
  if (msg.toLowerCase().indexOf('timed out') >= 0) {
    return 'Module validation runtime timed out while loading. Retry validation.';
  }
  return msg;
}

export default function StatusScreen(props) {
  var onRuntimeState = props && typeof props.onRuntimeState === 'function' ? props.onRuntimeState : null;
  var state = useState(buildLoadingState(EMPTY_SUMMARY));
  var status = state[0];
  var setStatus = state[1];

  var loadRuntime = useCallback(async function () {
    var spanId = startPerfSpan('status_runtime_validation');
    var spanResult = 'unknown';
    setStatus(buildLoadingState(EMPTY_SUMMARY));

    try {
      var runtime = await importWithTimeout(function () {
        return import('../dev/module-validation-runtime.js');
      }, 10000);
      var payload = resolveRuntimePayload(runtime, EMPTY_SUMMARY);
      var validation = payload.validation;
      var systems = payload.systems;
      var summary = payload.summary;
      if (!validation || !validation.ok) {
        spanResult = 'validation_failed';
        setStatus(buildValidationFailureState(validation, payload.error, systems, summary));
        return;
      }

      spanResult = 'ok';
      setStatus(buildSuccessState(validation, systems, summary));
    } catch (err) {
      spanResult = 'import_error';
      setStatus(buildImportFailureState(err, mapRuntimeError, EMPTY_SUMMARY));
    } finally {
      endPerfSpan(spanId, { result: spanResult });
    }
  }, []);

  useEffect(function () {
    loadRuntime();
  }, [loadRuntime]);

  useEffect(function () {
    if (onRuntimeState) {
      onRuntimeState(status);
    }
  }, [onRuntimeState, status]);

  var titleMarginBottom = APP_SUBTITLE ? 8 : 24;

  if (status.loading) {
    return (
      <div style={{ minHeight: '100vh', background: STATUS_THEME.bg, color: STATUS_THEME.text, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_THEME.gold, letterSpacing: 1.5, marginBottom: titleMarginBottom }}>
            {APP_TITLE}
          </div>
          {APP_SUBTITLE ? (
            <div style={{ fontSize: 12, color: STATUS_THEME.dim, marginBottom: 24 }}>
              {APP_SUBTITLE}
            </div>
          ) : null}
          <div style={STATUS_STYLES.card}>
            <div style={{ ...STATUS_STYLES.sectionTitle, color: STATUS_THEME.cyan }}>{STATUS_COPY.loadingTitle}</div>
            <div style={{ fontSize: 12, color: STATUS_THEME.dim }}>
              {STATUS_COPY.loadingBody}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status.error) {
    return (
      <div style={{ minHeight: '100vh', background: STATUS_THEME.bg, color: STATUS_THEME.text, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_THEME.gold, letterSpacing: 1.5, marginBottom: titleMarginBottom }}>
            {APP_TITLE}
          </div>
          {APP_SUBTITLE ? (
            <div style={{ fontSize: 12, color: STATUS_THEME.dim, marginBottom: 24 }}>
              {APP_SUBTITLE}
            </div>
          ) : null}
          <div style={STATUS_STYLES.card}>
            <div style={{ ...STATUS_STYLES.sectionTitle, color: STATUS_THEME.red }}>{STATUS_COPY.errorTitle}</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: STATUS_THEME.dim, marginBottom: 12 }}>
              {status.error}
            </pre>
            <button onClick={loadRuntime} style={STATUS_STYLES.button}>{STATUS_COPY.retryLabel}</button>
          </div>
        </div>
      </div>
    );
  }

  var summary = status.summary || EMPTY_SUMMARY;
  var validation = status.validation || { ok: false, errors: [], checkCount: 0 };

  return (
    <div style={{ minHeight: '100vh', background: STATUS_THEME.bg, color: STATUS_THEME.text, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_THEME.gold, letterSpacing: 1.5, marginBottom: titleMarginBottom }}>
          {APP_TITLE}
        </div>
        {APP_SUBTITLE ? (
          <div style={{ fontSize: 12, color: STATUS_THEME.dim, marginBottom: 24 }}>
            {APP_SUBTITLE}
          </div>
        ) : null}

        <div style={{ ...STATUS_STYLES.card, marginBottom: 12 }}>
          <div style={{ ...STATUS_STYLES.sectionTitle, color: validation.ok ? STATUS_THEME.green : STATUS_THEME.red }}>
            {STATUS_COPY.runtimeTitle}
          </div>
          <div style={{ fontSize: 11, color: STATUS_THEME.dim, lineHeight: 1.8 }}>
            <div>
              <strong style={{ color: STATUS_THEME.text }}>Checks run:</strong> {validation.checkCount}
            </div>
            <div>
              <strong style={{ color: STATUS_THEME.text }}>Status:</strong> {validation.ok ? 'Pass' : 'Fail'}
            </div>
          </div>
        </div>

        <div style={{ ...STATUS_STYLES.card, marginBottom: 20 }}>
          <div style={{ ...STATUS_STYLES.sectionTitle, color: STATUS_THEME.gold }}>
            {STATUS_COPY.systemsTitle}
          </div>
          {status.systems.map(function (sys) {
            return (
              <div key={sys.name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 0', borderBottom: '1px solid ' + STATUS_THEME.border,
                fontSize: 12,
              }}>
                <span style={{ color: sys.status ? STATUS_THEME.green : STATUS_THEME.red, fontWeight: 900 }}>
                  {sys.status ? '\u2713' : '\u2717'}
                </span>
                <span>{sys.name}</span>
              </div>
            );
          })}
        </div>

        <div style={STATUS_STYLES.card}>
          <div style={{ ...STATUS_STYLES.sectionTitle, color: STATUS_THEME.cyan }}>
            {STATUS_COPY.summaryTitle}
          </div>
          <div style={{ fontSize: 11, color: STATUS_THEME.dim, lineHeight: 1.8 }}>
            <div><strong style={{ color: STATUS_THEME.text }}>{STATUS_COPY.filesLabel}</strong> {summary.extractedModulesText}</div>
            <div><strong style={{ color: STATUS_THEME.text }}>{STATUS_COPY.systemsLabel}</strong> {summary.systemsText}</div>
            <div><strong style={{ color: STATUS_THEME.text }}>{STATUS_COPY.narrativeLabel}</strong> {summary.narrativeText}</div>
            <div><strong style={{ color: STATUS_THEME.text }}>{STATUS_COPY.buildLabel}</strong> {summary.buildSystemText}</div>
            <div><strong style={{ color: STATUS_THEME.text }}>{STATUS_COPY.originalLabel}</strong> {summary.originalGameText}</div>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 10, color: STATUS_THEME.faint, textAlign: 'center' }}>
          {summary.footerText}
        </div>
      </div>
    </div>
  );
}
