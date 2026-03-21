/**
 * PlayoffClinchOverlay — PLAYOFF BERTH CLINCHED ceremony
 *
 * Amber flash, clinch announcement with record and seed.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — callback
 *   data      — { teamName, teamIcon, record, seed }
 */
import React, { useState, useEffect, useRef } from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T } from '../../config/theme.js';

export default function PlayoffClinchOverlay(props) {
  var visible = props.visible;
  var onDismiss = props.onDismiss;
  var d = props.data || {};

  var _flash = useState(false);
  var flash = _flash[0];
  var setFlash = _flash[1];

  useEffect(function() {
    if (!visible) { setFlash(false); return; }
    setFlash(true);
    var t = setTimeout(function() { setFlash(false); }, 300);
    return function() { clearTimeout(t); };
  }, [visible]);

  return React.createElement(CeremonyOverlay, {
    visible: visible,
    onDismiss: onDismiss,
    autoDismiss: 3500,
    holdTime: 600,
    bgColor: flash ? 'rgba(240,160,40,0.15)' : 'rgba(0,0,0,0.96)',
  },
    React.createElement('div', {
      style: { textAlign: 'center', maxWidth: 440, width: '100%' }
    },
      // Flash border effect
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          boxShadow: flash ? 'inset 0 0 100px 30px rgba(240,160,40,0.3)' : 'inset 0 0 60px 15px rgba(240,160,40,0.08)',
          transition: 'box-shadow 0.3s ease-out',
          pointerEvents: 'none',
        }
      }),

      // Main text
      React.createElement('div', {
        style: {
          fontSize: 24,
          fontWeight: 900,
          color: T.gold,
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginBottom: 16,
          textShadow: '0 0 20px rgba(240,160,40,0.3)',
        }
      }, 'PLAYOFF BERTH CLINCHED'),

      // Team
      React.createElement('div', {
        style: { fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1.5, marginBottom: 20 }
      }, (d.teamIcon || '') + ' ' + (d.teamName || '')),

      // Record + Seed
      React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          marginTop: 8,
        }
      },
        d.record ? React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: 18, fontWeight: 800, color: T.green } }, d.record),
          React.createElement('div', { style: { fontSize: 9, color: T.dim, marginTop: 2, letterSpacing: 1 } }, 'RECORD')
        ) : null,
        d.seed ? React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: 18, fontWeight: 800, color: T.gold } }, '#' + d.seed),
          React.createElement('div', { style: { fontSize: 9, color: T.dim, marginTop: 2, letterSpacing: 1 } }, 'SEED')
        ) : null
      )
    )
  );
}
