/**
 * DraftPickOverlay — Draft Pick Reveal ceremony
 *
 * 2-second tension delay ("ANALYZING SCOUT DATA..."), then snap reveal
 * with staggered player details and MFSN analyst quote.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — callback
 *   data      — { name, pos, college, ovr, devTrait, trait, round, pickNum, scoutGrade, analystQuote }
 */
import React, { useState, useEffect, useRef } from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T, FONT } from '../../config/theme.js';

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

    setPhase(1);
    var dotCount = 0;
    var dotInterval = setInterval(function() {
      dotCount = (dotCount + 1) % 4;
      setDots('.'.repeat(dotCount));
    }, 400);
    timers.current.push(dotInterval);

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

  var devIcon = d.devTrait === 'superstar' ? ' ★★★' : d.devTrait === 'star' ? ' ★★' : '';
  var quote = d.analystQuote || ANALYST_QUOTES[((d.pickNum || 1) + (d.ovr || 0)) % ANALYST_QUOTES.length];

  function stagger(idx) {
    return {
      opacity: phase >= 2 ? 1 : 0,
      transform: phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.35s ease-out ' + (idx * 0.08) + 's, transform 0.35s ease-out ' + (idx * 0.08) + 's',
    };
  }

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
      // Phase 1: Analyzing with animated progress
      phase === 1 ? React.createElement('div', null,
        React.createElement('style', null,
          '@keyframes mfd-scan-bar{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}'
        ),
        React.createElement('div', {
          style: {
            fontSize: 14,
            color: T.gold,
            letterSpacing: 2,
            fontWeight: 700,
            fontFamily: FONT.mono,
          }
        }, 'ANALYZING SCOUT DATA' + dots),
        React.createElement('div', {
          style: {
            width: 220,
            height: 2,
            background: T.bg3,
            margin: '20px auto',
            overflow: 'hidden',
            borderRadius: 1,
          }
        },
          React.createElement('div', {
            style: {
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, ' + T.gold + ', transparent)',
              animation: 'mfd-scan-bar 1.2s ease-in-out infinite',
            }
          })
        )
      ) : null,

      // Phase 2: Reveal with staggered entrance
      phase === 2 ? React.createElement('div', null,
        // Pick header
        React.createElement('div', {
          style: Object.assign({
            fontSize: 11, color: T.dim, letterSpacing: 2, marginBottom: 12,
            fontFamily: FONT.mono,
          }, stagger(0))
        }, 'ROUND ' + (d.round || '?') + ' — PICK #' + (d.pickNum || '?')),

        // Player name — display font
        React.createElement('div', {
          style: Object.assign({
            fontSize: 28,
            fontWeight: 700,
            fontFamily: FONT.display,
            color: '#fff',
            letterSpacing: 2,
            marginBottom: 8,
            textShadow: '0 0 24px rgba(240,160,40,0.3)',
          }, stagger(1))
        }, (d.name || 'UNKNOWN').toUpperCase()),

        // Position + OVR
        React.createElement('div', {
          style: Object.assign({
            fontSize: 16, fontWeight: 700, color: T.gold, letterSpacing: 1.5, marginBottom: 6,
            fontFamily: FONT.mono,
          }, stagger(2))
        }, (d.pos || '') + (d.ovr ? ' — ' + d.ovr + ' OVR' : '') + devIcon),

        // College
        d.college ? React.createElement('div', {
          style: Object.assign({
            fontSize: 12, color: T.dim, letterSpacing: 1, marginBottom: 4,
            fontFamily: FONT.body,
          }, stagger(3))
        }, d.college) : null,

        // Scout grade
        d.scoutGrade ? React.createElement('div', {
          style: Object.assign({
            fontSize: 11, color: T.faint, letterSpacing: 0.5, marginBottom: 20,
            fontFamily: FONT.mono,
          }, stagger(4))
        }, 'SCOUT GRADE: ' + d.scoutGrade) : null,

        // Trait
        d.trait ? React.createElement('div', {
          style: Object.assign({
            fontSize: 11, color: T.cyan, letterSpacing: 0.5, marginBottom: 20,
            fontFamily: FONT.body, fontWeight: 600,
          }, stagger(5))
        }, 'TRAIT: ' + d.trait) : null,

        // Divider — gold line with glow
        React.createElement('div', {
          style: Object.assign({
            width: 80, height: 1, margin: '0 auto 16px',
            background: T.gold, opacity: 0.5,
            boxShadow: '0 0 8px rgba(240,160,40,0.3)',
          }, stagger(6))
        }),

        // MFSN Analyst quote
        React.createElement('div', {
          style: Object.assign({
            fontSize: 12,
            color: T.gold,
            fontStyle: 'italic',
            letterSpacing: 0.5,
            opacity: 0.85,
            fontFamily: FONT.body,
          }, stagger(7))
        }, 'MFSN: "' + quote + '"')
      ) : null
    )
  );
}
