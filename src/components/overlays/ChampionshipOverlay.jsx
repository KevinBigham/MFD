/**
 * ChampionshipOverlay — WORLD CHAMPIONS ceremony
 *
 * The most important overlay in MFD. Full-screen Bloomberg-style
 * championship celebration with team colors, final score, MVP, dynasty stats.
 *
 * Props:
 *   visible     — boolean
 *   onDismiss   — callback
 *   data        — { teamName, teamIcon, teamColor, year, score, mvp, dynastyIndex, dynastyChange, titleCount }
 *     mvp: { name, pos, statLine }
 */
import React, { useState, useEffect, useRef } from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T } from '../../config/theme.js';

var BAR = '════════════════════════════════════════════════════';

export default function ChampionshipOverlay(props) {
  var visible = props.visible;
  var onDismiss = props.onDismiss;
  var d = props.data || {};

  var _phase = useState(0);
  var phase = _phase[0];
  var setPhase = _phase[1];

  var timers = useRef([]);

  useEffect(function() {
    if (!visible) { setPhase(0); return; }
    // Phase 0: dark (handled by CeremonyOverlay)
    // Phase 1: team color flash at edges
    var t1 = setTimeout(function() { setPhase(1); }, 500);
    // Phase 2: full content reveal
    var t2 = setTimeout(function() { setPhase(2); }, 900);
    timers.current = [t1, t2];
    return function() { timers.current.forEach(function(t) { clearTimeout(t); }); };
  }, [visible]);

  var teamColor = d.teamColor || T.gold;

  // Edge flash effect
  var flashStyle = phase === 1 ? {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    boxShadow: 'inset 0 0 120px 40px ' + teamColor,
    opacity: 0.6,
    transition: 'opacity 0.3s ease-out',
    pointerEvents: 'none',
  } : {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    boxShadow: 'inset 0 0 80px 20px ' + teamColor,
    opacity: phase >= 2 ? 0.15 : 0,
    transition: 'opacity 0.5s ease-out',
    pointerEvents: 'none',
  };

  var mvpLine = d.mvp ? (d.mvp.name + ' (' + d.mvp.pos + ')' + (d.mvp.statLine ? ' — ' + d.mvp.statLine : '')) : '';

  return React.createElement(CeremonyOverlay, {
    visible: visible,
    onDismiss: onDismiss,
    holdTime: 2000,
    bgColor: 'rgba(0,0,0,0.98)',
  },
    React.createElement('div', { style: flashStyle }),
    phase >= 2 ? React.createElement('div', {
      style: {
        textAlign: 'center',
        maxWidth: 520,
        width: '100%',
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 0.5s ease-in',
      }
    },
      // Top bar
      React.createElement('div', {
        style: { color: T.gold, fontSize: 11, letterSpacing: 3, marginBottom: 8 }
      }, BAR),

      // WORLD CHAMPIONS header
      React.createElement('div', {
        style: {
          fontSize: 28,
          fontWeight: 900,
          color: T.gold,
          letterSpacing: 8,
          textTransform: 'uppercase',
          marginBottom: 4,
          textShadow: '0 0 30px rgba(240,160,40,0.4)',
        }
      }, 'W O R L D   C H A M P I O N S'),

      // Bottom bar
      React.createElement('div', {
        style: { color: T.gold, fontSize: 11, letterSpacing: 3, marginTop: 8, marginBottom: 32 }
      }, BAR),

      // Team name + icon
      React.createElement('div', {
        style: {
          fontSize: 22,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: 2,
          marginBottom: 8,
        }
      }, (d.teamIcon || '') + ' ' + (d.teamName || 'CHAMPIONS')),

      // Season year
      React.createElement('div', {
        style: { fontSize: 13, color: T.dim, letterSpacing: 1.5, marginBottom: 24 }
      }, 'SEASON ' + (d.year || '') + ' CHAMPIONS'),

      // Final score
      d.score ? React.createElement('div', {
        style: { fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: 1, marginBottom: 20 }
      }, 'FINAL SCORE: ' + d.score) : null,

      // MVP
      mvpLine ? React.createElement('div', {
        style: { fontSize: 13, color: T.gold, marginBottom: 20, letterSpacing: 0.5 }
      }, 'MVP: ' + mvpLine) : null,

      // Dynasty stats
      React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          marginTop: 12,
          marginBottom: 16,
        }
      },
        d.dynastyIndex != null ? React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: 20, fontWeight: 900, color: T.gold } },
            d.dynastyIndex + (d.dynastyChange ? ' (+' + d.dynastyChange + ')' : '')),
          React.createElement('div', { style: { fontSize: 9, color: T.dim, marginTop: 2, letterSpacing: 1 } }, 'DYNASTY INDEX')
        ) : null,
        d.titleCount != null ? React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: 20, fontWeight: 900, color: T.gold } }, d.titleCount + 'x'),
          React.createElement('div', { style: { fontSize: 9, color: T.dim, marginTop: 2, letterSpacing: 1 } }, 'TITLES')
        ) : null
      ),

      // Bottom bar
      React.createElement('div', {
        style: { color: T.gold, fontSize: 11, letterSpacing: 3, marginTop: 16 }
      }, BAR)
    ) : null
  );
}
