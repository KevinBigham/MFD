/**
 * HallOfFameOverlay — Hall of Fame Induction ceremony
 *
 * Terminal-style ASCII plaque with career stats and speech excerpt.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — callback
 *   data      — { name, pos, year, seasons, score, stats, speechLines }
 *     stats: string (formatted career stats line)
 *     speechLines: string[] (speech lines from CEREMONY_986)
 */
import React from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T } from '../../config/theme.js';

export default function HallOfFameOverlay(props) {
  var visible = props.visible;
  var onDismiss = props.onDismiss;
  var d = props.data || {};

  var speechExcerpt = '';
  if (d.speechLines && d.speechLines.length > 0) {
    speechExcerpt = d.speechLines[0];
    if (speechExcerpt.length > 80) speechExcerpt = speechExcerpt.substring(0, 77) + '...';
  }

  var plaqueWidth = 44;
  function pad(text, width) {
    if (!text) text = '';
    if (text.length >= width) return text.substring(0, width);
    return text + ' '.repeat(width - text.length);
  }

  return React.createElement(CeremonyOverlay, {
    visible: visible,
    onDismiss: onDismiss,
    holdTime: 1500,
    bgColor: 'rgba(0,0,0,0.97)',
  },
    React.createElement('div', {
      style: {
        textAlign: 'center',
        maxWidth: 500,
        width: '100%',
      }
    },
      // Dimmed header
      React.createElement('div', {
        style: { fontSize: 10, color: T.faint, letterSpacing: 2, marginBottom: 20 }
      }, 'HALL OF FAME INDUCTION CEREMONY'),

      // ASCII plaque
      React.createElement('div', {
        style: {
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.6,
          color: T.gold,
          textAlign: 'left',
          display: 'inline-block',
          padding: '16px 20px',
          border: '1px solid rgba(240,160,40,0.3)',
          background: 'rgba(240,160,40,0.04)',
          whiteSpace: 'pre',
          letterSpacing: 0.5,
        }
      },
        '\u2554' + '\u2550'.repeat(plaqueWidth) + '\u2557\n' +
        '\u2551  ' + pad('HALL OF FAME \u2014 CLASS OF ' + (d.year || '????'), plaqueWidth - 4) + '  \u2551\n' +
        '\u2560' + '\u2550'.repeat(plaqueWidth) + '\u2563\n' +
        '\u2551  ' + pad((d.name || 'UNKNOWN').toUpperCase(), plaqueWidth - 4) + '  \u2551\n' +
        '\u2551  ' + pad((d.pos || '') + ' | ' + (d.seasons || '?') + ' SEASONS', plaqueWidth - 4) + '  \u2551\n' +
        '\u2551  ' + pad('LEGACY SCORE: ' + (d.score || '?'), plaqueWidth - 4) + '  \u2551\n' +
        (d.stats ? '\u2551  ' + pad(d.stats, plaqueWidth - 4) + '  \u2551\n' : '') +
        '\u2551' + ' '.repeat(plaqueWidth) + '\u2551\n' +
        (speechExcerpt ? '\u2551  ' + pad('"' + speechExcerpt + '"', plaqueWidth - 4) + '  \u2551\n' : '') +
        '\u255A' + '\u2550'.repeat(plaqueWidth) + '\u255D'
      )
    )
  );
}
