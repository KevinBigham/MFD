/**
 * FiredOverlay — TERMINAL SESSION TERMINATED / Game Over
 *
 * Static/noise effect, then dynasty summary.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — callback
 *   data      — { reason, seasons, titles, totalW, totalL, legacyTier }
 */
import React, { useState, useEffect, useRef } from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T, FONT } from '../../config/theme.js';

export default function FiredOverlay(props) {
  var visible = props.visible;
  var onDismiss = props.onDismiss;
  var d = props.data || {};

  var _phase = useState(0);
  var phase = _phase[0];
  var setPhase = _phase[1];

  var _noiseLines = useState([]);
  var noiseLines = _noiseLines[0];
  var setNoiseLines = _noiseLines[1];

  var timers = useRef([]);

  useEffect(function() {
    if (!visible) { setPhase(0); setNoiseLines([]); return; }

    // Phase 1: static noise (deterministic — no Math.random per project rules)
    setPhase(1);
    var chars = '░▒▓█▀▄▌▐│─┼╬╪╫┤├┴┬';
    var lines = [];
    var seed = 73;
    for (var i = 0; i < 6; i++) {
      var line = '';
      for (var j = 0; j < 40; j++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        line += chars[seed % chars.length];
      }
      lines.push(line);
    }
    setNoiseLines(lines);

    // Phase 2: terminal message
    var t1 = setTimeout(function() { setPhase(2); }, 800);
    timers.current = [t1];

    return function() { timers.current.forEach(function(t) { clearTimeout(t); }); };
  }, [visible]);

  var record = (d.totalW != null && d.totalL != null) ? d.totalW + '-' + d.totalL : null;

  return React.createElement(CeremonyOverlay, {
    visible: visible,
    onDismiss: onDismiss,
    holdTime: 1500,
    bgColor: 'rgba(15,0,0,0.98)',
  },
    React.createElement('div', {
      style: { textAlign: 'center', maxWidth: 460, width: '100%' }
    },
      // Phase 1: static noise
      phase === 1 ? React.createElement('div', {
        style: {
          fontFamily: MONO,
          fontSize: 10,
          color: 'rgba(224,60,60,0.4)',
          lineHeight: 1.4,
          whiteSpace: 'pre',
          letterSpacing: 1,
        }
      }, noiseLines.join('\n')) : null,

      // Phase 2: terminal message
      phase >= 2 ? React.createElement('div', {
        style: { opacity: 1, transition: 'opacity 0.4s ease-in' }
      },
        // TERMINATED header
        React.createElement('div', {
          style: {
            fontSize: 22,
            fontWeight: 700,
            fontFamily: FONT.display,
            color: T.red,
            letterSpacing: 4,
            marginBottom: 8,
            textShadow: '0 0 30px rgba(224,60,60,0.4)',
          }
        }, 'TERMINAL SESSION TERMINATED'),

        React.createElement('div', {
          style: { width: 60, height: 2, background: T.red, margin: '12px auto 20px', opacity: 0.5 }
        }),

        // Reason
        d.reason ? React.createElement('div', {
          style: { fontSize: 12, color: T.dim, letterSpacing: 1, marginBottom: 24 }
        }, 'REASON: ' + d.reason.toUpperCase()) : null,

        // Dynasty summary
        React.createElement('div', {
          style: {
            border: '1px solid rgba(224,60,60,0.2)',
            padding: '16px 20px',
            background: 'rgba(224,60,60,0.04)',
            textAlign: 'left',
            display: 'inline-block',
            minWidth: 280,
          }
        },
          React.createElement('div', {
            style: { fontSize: 11, color: T.red, letterSpacing: 2, fontWeight: 700, marginBottom: 12 }
          }, 'DYNASTY SUMMARY'),

          d.seasons != null ? React.createElement('div', {
            style: { fontSize: 12, color: T.text, marginBottom: 6 }
          }, 'SEASONS COACHED: ' + d.seasons) : null,

          record ? React.createElement('div', {
            style: { fontSize: 12, color: T.text, marginBottom: 6 }
          }, 'CAREER RECORD: ' + record) : null,

          d.titles != null ? React.createElement('div', {
            style: { fontSize: 12, color: d.titles > 0 ? T.gold : T.text, marginBottom: 6 }
          }, 'CHAMPIONSHIPS: ' + d.titles) : null,

          d.legacyTier ? React.createElement('div', {
            style: { fontSize: 12, color: T.faint, marginTop: 8 }
          }, 'LEGACY: ' + d.legacyTier.toUpperCase()) : null
        )
      ) : null
    )
  );
}
