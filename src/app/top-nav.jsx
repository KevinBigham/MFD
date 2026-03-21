import React from 'react';

import { BOOT_MODES, parseBootMode } from './boot-mode.js';
import { APP_SUBTITLE, APP_TITLE, MODE_COPY } from './launcher-copy.js';

var DEFAULT_THEME = {
  panel: '#0f172a',
  text: '#f1f5f9',
  dim: '#94a3b8',
  cyan: '#22d3ee',
  border: '#334155',
};

export function getModeTabs() {
  return [
    { id: BOOT_MODES.PLAY, label: MODE_COPY.play.tabLabel },
    { id: BOOT_MODES.STATUS, label: MODE_COPY.status.tabLabel },
  ];
}

export function resolveNextTabMode(currentMode, key) {
  var tabs = getModeTabs().map(function (tab) { return tab.id; });
  var current = parseBootMode(currentMode) || BOOT_MODES.STATUS;
  var idx = tabs.indexOf(current);
  if (idx < 0) idx = 0;

  if (key === 'ArrowRight') return tabs[(idx + 1) % tabs.length];
  if (key === 'ArrowLeft') return tabs[(idx - 1 + tabs.length) % tabs.length];
  if (key === 'Home') return tabs[0];
  if (key === 'End') return tabs[tabs.length - 1];
  return current;
}

export function handleTabKeyDown(evt, input) {
  if (!evt || !input || typeof input.onChangeMode !== 'function') return;
  var next = resolveNextTabMode(input.mode, evt.key);
  if (next !== parseBootMode(input.mode)) {
    evt.preventDefault();
    input.onChangeMode(next);
  }
}

export default function TopNav(props) {
  var mode = parseBootMode(props && props.mode) || BOOT_MODES.STATUS;
  var onChangeMode = props && typeof props.onChangeMode === 'function' ? props.onChangeMode : function () {};
  var forcedMode = parseBootMode(props && props.forcedMode) || '';
  var runtimeVersion = props && props.runtimeVersion ? String(props.runtimeVersion) : '';
  var T = props && props.theme ? props.theme : DEFAULT_THEME;
  var tabs = getModeTabs();

  var tabStyle = function (active) {
    return {
      padding: '7px 11px',
      borderRadius: 8,
      border: '1px solid ' + (active ? T.cyan : T.border),
      background: active ? T.cyan : T.panel,
      color: active ? '#001018' : T.text,
      fontSize: 12,
      fontWeight: 800,
      cursor: 'pointer',
      outlineOffset: 2,
      boxShadow: active ? '0 0 0 2px rgba(34,211,238,0.18)' : 'none',
      minWidth: 116,
    };
  };

  return (
    <div style={{ borderBottom: '1px solid ' + T.border, background: T.panel }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240 }}>
            <div style={{ fontSize: 20, letterSpacing: 1.2, fontWeight: 900, color: T.text }}>{APP_TITLE}</div>
            {APP_SUBTITLE ? (
              <div style={{ fontSize: 11, color: T.dim }}>{APP_SUBTITLE}</div>
            ) : null}
            {/* Runtime version and forced mode labels removed — Sprint 18 cleanup */}
          </div>
          <div
            role="tablist"
            aria-label="Launcher modes"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {tabs.map(function (tab) {
              var active = tab.id === mode;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={'tab-' + tab.id}
                  aria-selected={active}
                  aria-controls={'panel-' + tab.id}
                  tabIndex={active ? 0 : -1}
                  style={tabStyle(active)}
                  onClick={function () { onChangeMode(tab.id); }}
                  onKeyDown={function (evt) {
                    handleTabKeyDown(evt, { mode: mode, onChangeMode: onChangeMode });
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
