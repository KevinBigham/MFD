import React, { memo } from 'react';

import { T, S } from '../config/theme.js';
import { mS } from '../utils/helpers.js';

var TOAST_ANIMATIONS = [
  '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}',
  '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}',
  '@keyframes tdCelebrate{0%{transform:scale(1);background:rgba(212,167,75,0.10)}20%{transform:scale(1.03);background:rgba(212,167,75,0.28)}50%{transform:scale(1.01);background:rgba(212,167,75,0.18)}100%{transform:scale(1);background:rgba(212,167,75,0.10)}}',
  '@keyframes turnoverFlash{0%{background:rgba(239,68,68,0.08)}30%{background:rgba(239,68,68,0.28)}100%{background:rgba(239,68,68,0.08)}}',
  '@keyframes bigPlayPop{0%{transform:translateY(0);opacity:1}20%{transform:translateY(-3px);opacity:1}100%{transform:translateY(0);opacity:1}}',
  '@keyframes pulse-draft{0%,100%{opacity:1}50%{opacity:0.4}}',
  '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}',
].join('');

export var ToastContainer = memo(function ToastContainer(props) {
  var toasts = props.toasts || [];
  var remove = props.remove;
  var onAction = props.onAction;

  return (
    <div style={S.toastArea}>
      {toasts.map(function (toast) {
        var color = toast.type === 'red'
          ? T.red
          : toast.type === 'green'
            ? T.green
            : toast.type === 'gold'
              ? T.gold
              : T.blue;
        var hasAction = !!toast.action;

        return (
          <div
            key={toast.id}
            onClick={function () {
              if (hasAction && onAction) {
                onAction(toast.action);
                remove(toast.id);
              }
            }}
            style={mS(S.toast, {
              borderLeft: '4px solid ' + color,
              cursor: hasAction ? 'pointer' : 'default',
            })}
          >
            <div style={{ fontSize: 14 }}>
              {toast.type === 'red' ? '🚨' : toast.type === 'green' ? '✅' : toast.type === 'gold' ? '🏆' : 'ℹ️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: color, fontSize: 9, marginBottom: 1 }}>
                {toast.title || 'UPDATE'}
              </div>
              <div style={{ color: T.dim, fontSize: 10, lineHeight: 1.3 }}>{toast.text}</div>
              {hasAction ? <div style={{ fontSize: 8, color: T.faint, marginTop: 2 }}>TAP →</div> : null}
            </div>
            <button
              onClick={function (e) {
                e.stopPropagation();
                remove(toast.id);
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: T.faint,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
      <style>{TOAST_ANIMATIONS}</style>
    </div>
  );
});
