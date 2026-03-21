/**
 * ChampionshipOverlay — WORLD CHAMPIONS ceremony
 *
 * The most important overlay in MFD. Full-screen Bloomberg-style
 * championship celebration with team colors, animated confetti particles,
 * staggered reveals, and display typography.
 *
 * Props:
 *   visible     — boolean
 *   onDismiss   — callback
 *   data        — { teamName, teamIcon, teamColor, year, score, mvp, dynastyIndex, dynastyChange, titleCount }
 *     mvp: { name, pos, statLine }
 */
import React, { useState, useEffect, useRef } from 'react';
import CeremonyOverlay, { MONO } from '../CeremonyOverlay.jsx';
import { T, FONT } from '../../config/theme.js';

var BAR = '════════════════════════════════════════════════════';

// Generate confetti particle positions (deterministic, no Math.random)
function makeParticles(count) {
  var p = [];
  for (var i = 0; i < count; i++) {
    var seed = ((i * 2654435761) >>> 0) / 4294967296; // Knuth hash for determinism
    var seed2 = (((i + 7) * 2654435761) >>> 0) / 4294967296;
    var seed3 = (((i + 13) * 2654435761) >>> 0) / 4294967296;
    p.push({
      left: (seed * 100).toFixed(1) + '%',
      delay: (seed2 * 3).toFixed(2) + 's',
      duration: (2 + seed3 * 3).toFixed(2) + 's',
      size: 2 + Math.floor(seed * 4),
      color: seed > 0.5 ? T.gold : (seed > 0.25 ? '#fff' : '#f0d078'),
    });
  }
  return p;
}

var PARTICLES = makeParticles(40);

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
    var t1 = setTimeout(function() { setPhase(1); }, 500);
    var t2 = setTimeout(function() { setPhase(2); }, 1000);
    var t3 = setTimeout(function() { setPhase(3); }, 1500);
    timers.current = [t1, t2, t3];
    return function() { timers.current.forEach(function(t) { clearTimeout(t); }); };
  }, [visible]);

  var teamColor = d.teamColor || T.gold;

  // Edge flash with team color
  var flashStyle = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    boxShadow: 'inset 0 0 ' + (phase === 1 ? '150px 60px ' : '80px 20px ') + teamColor,
    opacity: phase === 1 ? 0.7 : (phase >= 2 ? 0.12 : 0),
    transition: 'opacity 0.5s ease-out, box-shadow 0.5s ease-out',
    pointerEvents: 'none',
  };

  // Confetti particles
  var particleLayer = phase >= 2 ? React.createElement('div', {
    style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }
  }, PARTICLES.map(function(p, i) {
    return React.createElement('div', {
      key: i,
      style: {
        position: 'absolute',
        left: p.left,
        top: '-4px',
        width: p.size,
        height: p.size,
        borderRadius: p.size > 3 ? 1 : '50%',
        background: p.color,
        opacity: 0.6,
        animation: 'mfd-confetti-fall ' + p.duration + ' ' + p.delay + ' linear infinite',
      }
    });
  })) : null;

  var mvpLine = d.mvp ? (d.mvp.name + ' (' + d.mvp.pos + ')' + (d.mvp.statLine ? ' — ' + d.mvp.statLine : '')) : '';

  // Stagger delay helper
  function stagger(idx) {
    return {
      opacity: phase >= 2 ? 1 : 0,
      transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.5s ease-out ' + (idx * 0.1) + 's, transform 0.5s ease-out ' + (idx * 0.1) + 's',
    };
  }

  return React.createElement(CeremonyOverlay, {
    visible: visible,
    onDismiss: onDismiss,
    holdTime: 2000,
    bgColor: 'rgba(0,0,0,0.98)',
  },
    // Inject confetti keyframe
    React.createElement('style', null,
      '@keyframes mfd-confetti-fall{0%{transform:translateY(-10px) rotate(0deg);opacity:0.7}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}'
    ),
    React.createElement('div', { style: flashStyle }),
    particleLayer,
    phase >= 2 ? React.createElement('div', {
      style: {
        textAlign: 'center',
        maxWidth: 560,
        width: '100%',
        position: 'relative',
        zIndex: 2,
      }
    },
      // Top bar
      React.createElement('div', {
        style: Object.assign({ color: T.gold, fontSize: 11, letterSpacing: 3, marginBottom: 8 }, stagger(0))
      }, BAR),

      // WORLD CHAMPIONS — display font
      React.createElement('div', {
        style: Object.assign({
          fontSize: 32,
          fontWeight: 700,
          fontFamily: FONT.display,
          color: T.gold,
          letterSpacing: 6,
          textTransform: 'uppercase',
          marginBottom: 4,
          textShadow: '0 0 40px rgba(240,160,40,0.5), 0 0 80px rgba(240,160,40,0.2)',
        }, stagger(1))
      }, 'WORLD CHAMPIONS'),

      // Bottom bar
      React.createElement('div', {
        style: Object.assign({ color: T.gold, fontSize: 11, letterSpacing: 3, marginTop: 8, marginBottom: 32 }, stagger(2))
      }, BAR),

      // Team name + icon
      React.createElement('div', {
        style: Object.assign({
          fontSize: 24,
          fontWeight: 700,
          fontFamily: FONT.display,
          color: '#fff',
          letterSpacing: 2,
          marginBottom: 8,
        }, stagger(3))
      }, (d.teamIcon || '') + ' ' + (d.teamName || 'CHAMPIONS')),

      // Season year
      React.createElement('div', {
        style: Object.assign({
          fontSize: 13, color: T.dim, letterSpacing: 1.5, marginBottom: 24,
          fontFamily: FONT.mono,
        }, stagger(4))
      }, 'SEASON ' + (d.year || '') + ' CHAMPIONS'),

      // Final score
      d.score ? React.createElement('div', {
        style: Object.assign({
          fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: 1, marginBottom: 20,
          fontFamily: FONT.mono,
        }, stagger(5))
      }, 'FINAL SCORE: ' + d.score) : null,

      // MVP
      mvpLine ? React.createElement('div', {
        style: Object.assign({
          fontSize: 14, color: T.gold, marginBottom: 20, letterSpacing: 0.5,
          fontFamily: FONT.body,
        }, stagger(6))
      }, '★ MVP: ' + mvpLine) : null,

      // Dynasty stats
      React.createElement('div', {
        style: Object.assign({
          display: 'flex',
          justifyContent: 'center',
          gap: 48,
          marginTop: 12,
          marginBottom: 16,
        }, stagger(7))
      },
        d.dynastyIndex != null ? React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', {
            style: { fontSize: 24, fontWeight: 700, color: T.gold, fontFamily: FONT.mono }
          }, d.dynastyIndex + (d.dynastyChange ? ' (+' + d.dynastyChange + ')' : '')),
          React.createElement('div', {
            style: { fontSize: 9, color: T.dim, marginTop: 4, letterSpacing: 1.5, fontFamily: FONT.body, fontWeight: 600 }
          }, 'DYNASTY INDEX')
        ) : null,
        d.titleCount != null ? React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', {
            style: { fontSize: 24, fontWeight: 700, color: T.gold, fontFamily: FONT.mono }
          }, d.titleCount + 'x'),
          React.createElement('div', {
            style: { fontSize: 9, color: T.dim, marginTop: 4, letterSpacing: 1.5, fontFamily: FONT.body, fontWeight: 600 }
          }, 'TITLES')
        ) : null
      ),

      // Bottom bar
      React.createElement('div', {
        style: Object.assign({ color: T.gold, fontSize: 11, letterSpacing: 3, marginTop: 16 }, stagger(8))
      }, BAR)
    ) : null
  );
}
