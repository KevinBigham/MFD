/**
 * DraftPickOverlay — Draft Pick Reveal ceremony
 *
 * 2-second tension delay ("ANALYZING SCOUT DATA..."), then snap reveal
 * with player details and MFSN analyst quote.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — callback
 *   data      — { name, pos, college, ovr, devTrait, trait, round, pickNum, scoutGrade, analystQuote }
 */
import React, { useState, useEffect, useRef } from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T } from '../../config/theme.js';

var ANALYST_QUOTES = [
  'EXACTLY THE PICK I WOULD HAVE MADE.',
  'STEAL OF THE DRAFT.',
  'A BOLD REACH — BUT I LIKE IT.',
  'THIS KID IS THE REAL DEAL.',
  'FRONT OFFICE NAILED THIS ONE.',
  'SURPRISING PICK — LET\'S SEE HOW IT PLAYS OUT.',
  'THEY GOT THEIR GUY.',
  'A FRANCHISE-CHANGING SELECTION.',
  'THE WAR ROOM IS CELEBRATING RIGHT NOW.',
  'SOLID VALUE AT THIS SPOT.',
];

export default function DraftPickOverlay(props) {
  var visible = props.visible;
  var onDismiss = props.onDismiss;
  var d = props.data || {};

  var _phase = useState(0);
  var phase = _phase[0];
  var setPhase = _phase[1];

  var _dots = useState('');
  var dots = _dots[0];
  var setDots = _dots[1];

  var timers = useRef([]);

  useEffect(function() {
    if (!visible) { setPhase(0); setDots(''); return; }

    // Phase 1: analyzing text with animated dots
    setPhase(1);
    var dotCount = 0;
    var dotInterval = setInterval(function() {
      dotCount = (dotCount + 1) % 4;
      setDots('.'.repeat(dotCount));
    }, 400);
    timers.current.push(dotInterval);

    // Phase 2: reveal after 2 seconds
    var t1 = setTimeout(function() {
      clearInterval(dotInterval);
      setPhase(2);
    }, 2000);
    timers.current.push(t1);

    return function() {
      clearInterval(dotInterval);
      timers.current.forEach(function(t) { clearTimeout(t); });
      timers.current = [];
    };
  }, [visible]);

  var devIcon = d.devTrait === 'superstar' ? ' [SUPERSTAR]' : d.devTrait === 'star' ? ' [STAR]' : '';
  var quote = d.analystQuote || ANALYST_QUOTES[((d.pickNum || 1) + (d.ovr || 0)) % ANALYST_QUOTES.length];

  return React.createElement(CeremonyOverlay, {
    visible: visible,
    onDismiss: onDismiss,
    autoDismiss: 4500,
    holdTime: 500,
    bgColor: 'rgba(0,0,0,0.96)',
  },
    React.createElement('div', {
      style: { textAlign: 'center', maxWidth: 460, width: '100%' }
    },
      // Phase 1: Analyzing
      phase === 1 ? React.createElement('div', null,
        React.createElement('div', {
          style: {
            fontSize: 14,
            color: T.gold,
            letterSpacing: 2,
            fontWeight: 700,
            animation: 'none',
          }
        }, 'ANALYZING SCOUT DATA' + dots),
        React.createElement('div', {
          style: {
            width: 200,
            height: 2,
            background: T.bg3,
            margin: '20px auto',
            overflow: 'hidden',
          }
        },
          React.createElement('div', {
            style: {
              width: '60%',
              height: '100%',
              background: T.gold,
              animation: 'none',
              transition: 'width 0.4s ease',
            }
          })
        )
      ) : null,

      // Phase 2: Reveal
      phase === 2 ? React.createElement('div', {
        style: { opacity: 1, transition: 'opacity 0.3s ease-in' }
      },
        // Pick header
        React.createElement('div', {
          style: { fontSize: 11, color: T.dim, letterSpacing: 2, marginBottom: 12 }
        }, 'ROUND ' + (d.round || '?') + ' — PICK #' + (d.pickNum || '?')),

        // Player name
        React.createElement('div', {
          style: {
            fontSize: 26,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: 2,
            marginBottom: 8,
            textShadow: '0 0 20px rgba(240,160,40,0.3)',
          }
        }, (d.name || 'UNKNOWN').toUpperCase()),

        // Position + OVR
        React.createElement('div', {
          style: { fontSize: 16, fontWeight: 700, color: T.gold, letterSpacing: 1.5, marginBottom: 6 }
        }, (d.pos || '') + (d.ovr ? ' — ' + d.ovr + ' OVR' : '') + devIcon),

        // College
        d.college ? React.createElement('div', {
          style: { fontSize: 12, color: T.dim, letterSpacing: 1, marginBottom: 4 }
        }, d.college) : null,

        // Scout grade
        d.scoutGrade ? React.createElement('div', {
          style: { fontSize: 11, color: T.faint, letterSpacing: 0.5, marginBottom: 20 }
        }, 'SCOUT GRADE: ' + d.scoutGrade) : null,

        // Trait
        d.trait ? React.createElement('div', {
          style: { fontSize: 11, color: T.cyan, letterSpacing: 0.5, marginBottom: 20 }
        }, 'TRAIT: ' + d.trait) : null,

        // Divider
        React.createElement('div', {
          style: { width: 60, height: 1, background: T.gold, margin: '0 auto 16px', opacity: 0.4 }
        }),

        // MFSN Analyst quote
        React.createElement('div', {
          style: {
            fontSize: 11,
            color: T.gold,
            fontStyle: 'italic',
            letterSpacing: 0.5,
            opacity: 0.8,
          }
        }, 'MFSN: "' + quote + '"')
      ) : null
    )
  );
}
