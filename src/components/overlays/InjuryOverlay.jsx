/**
 * InjuryOverlay — Season-Ending Injury Report
 *
 * Red flicker, injury report with player info and prognosis.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — callback
 *   data      — { name, pos, ovr, injuryType, weeksOut, impact }
 */
import React, { useState, useEffect } from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T } from '../../config/theme.js';

export default function InjuryOverlay(props) {
  var visible = props.visible;
  var onDismiss = props.onDismiss;
  var d = props.data || {};

  var _flicker = useState(false);
  var flicker = _flicker[0];
  var setFlicker = _flicker[1];

  useEffect(function() {
    if (!visible) { setFlicker(false); return; }
    setFlicker(true);
    var t1 = setTimeout(function() { setFlicker(false); }, 150);
    var t2 = setTimeout(function() { setFlicker(true); }, 250);
    var t3 = setTimeout(function() { setFlicker(false); }, 400);
    return function() { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [visible]);

  var prognosis = (d.weeksOut == null) ? 'UNKNOWN' : d.weeksOut >= 12 ? 'OUT FOR SEASON' : d.weeksOut + ' WEEKS';

  return React.createElement(CeremonyOverlay, {
    visible: visible,
    onDismiss: onDismiss,
    autoDismiss: 3500,
    holdTime: 500,
    bgColor: flicker ? 'rgba(224,60,60,0.12)' : 'rgba(0,0,0,0.96)',
  },
    React.createElement('div', {
      style: { textAlign: 'center', maxWidth: 420, width: '100%' }
    },
      // Red border flash
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          boxShadow: flicker ? 'inset 0 0 80px 20px rgba(224,60,60,0.2)' : 'none',
          transition: 'box-shadow 0.15s ease',
          pointerEvents: 'none',
        }
      }),

      // Header
      React.createElement('div', {
        style: {
          fontSize: 11,
          color: T.red,
          letterSpacing: 3,
          fontWeight: 800,
          marginBottom: 20,
          borderBottom: '2px solid rgba(224,60,60,0.4)',
          paddingBottom: 8,
          display: 'inline-block',
        }
      }, 'INJURY REPORT'),

      // Player name
      React.createElement('div', {
        style: {
          fontSize: 22,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: 1.5,
          marginBottom: 6,
        }
      }, (d.name || 'UNKNOWN').toUpperCase()),

      // Position + OVR
      React.createElement('div', {
        style: { fontSize: 13, color: T.dim, letterSpacing: 1, marginBottom: 16 }
      }, (d.pos || '') + (d.ovr ? ' — ' + d.ovr + ' OVR' : '')),

      // Injury type
      React.createElement('div', {
        style: { fontSize: 16, fontWeight: 700, color: T.red, letterSpacing: 1, marginBottom: 8 }
      }, (d.injuryType || 'INJURY').toUpperCase()),

      // Prognosis
      React.createElement('div', {
        style: { fontSize: 13, fontWeight: 600, color: T.orange, letterSpacing: 0.5, marginBottom: 16 }
      }, 'PROGNOSIS: ' + prognosis),

      // Impact line
      d.impact ? React.createElement('div', {
        style: { fontSize: 11, color: T.faint, letterSpacing: 0.5, marginTop: 8 }
      }, d.impact) : null
    )
  );
}
