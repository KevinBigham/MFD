/**
 * HoverCard — Rich hover preview card for player names
 *
 * Shows a mini stat card on hover (400ms delay) with name, pos, OVR,
 * age, contract, injury status. Click still opens full PlayerCard.
 *
 * Props:
 *   player    — player object { name, pos, ovr, age, contract, injury, traits }
 *   children  — trigger element (the clickable player name)
 */
import React, { useState, useRef, useCallback } from 'react';
import { T, FONT, RAD, SH, SP } from '../config/theme.js';

var DELAY = 400;

function ovrColor(v) {
  return v >= 95 ? T.cyan : v >= 80 ? T.green : v >= 60 ? T.gold : T.red;
}

export function HoverCard(props) {
  var player = props.player;
  var children = props.children;

  // Early return before hooks for null player — tests call as plain function
  if (!player) return children || null;

  var _vis = useState(false);
  var visible = _vis[0];
  var setVisible = _vis[1];
  var timer = useRef(null);

  var show = useCallback(function() {
    timer.current = setTimeout(function() { setVisible(true); }, DELAY);
  }, []);

  var hide = useCallback(function() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setVisible(false);
  }, []);

  var p = player;
  var ovr = p.ovr || 0;
  var col = ovrColor(ovr);
  var contractYear = p.contract ? 'Yr ' + (p.contract.year || '?') + '/' + (p.contract.years || '?') : null;
  var salary = p.contract ? '$' + ((p.contract.salary || 0) / 1).toFixed(1) + 'M' : null;
  var injured = p.injury && p.injury.weeks > 0;
  var age = p.age || '?';

  var cardStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 200,
    maxWidth: 260,
    padding: SP.md,
    background: 'linear-gradient(180deg, ' + T.bg3 + ' 0%, ' + T.bg2 + ' 100%)',
    border: '1px solid ' + T.borderHover,
    borderTop: '2px solid ' + T.gold,
    borderRadius: RAD.lg,
    boxShadow: SH.lg + ', ' + SH.goldGlow,
    zIndex: 200,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(4px)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    pointerEvents: 'none',
    fontFamily: FONT.body,
  };

  // OVR bar
  var barWidth = Math.min(ovr, 99);
  var ovrBar = React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 6 }
  },
    React.createElement('span', {
      style: { fontSize: 18, fontWeight: 700, color: col, fontFamily: FONT.mono, minWidth: 26 }
    }, ovr),
    React.createElement('div', {
      style: { flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }
    },
      React.createElement('div', {
        style: { width: barWidth + '%', height: '100%', background: col, borderRadius: 2 }
      })
    )
  );

  return React.createElement('span', {
    style: { position: 'relative', display: 'inline' },
    onMouseEnter: show,
    onMouseLeave: hide,
  },
    children,
    React.createElement('div', { style: cardStyle },
      // Name + Pos
      React.createElement('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }
      },
        React.createElement('span', {
          style: { fontSize: 12, fontWeight: 700, color: T.text, fontFamily: FONT.display }
        }, (p.name || 'Unknown').toUpperCase()),
        React.createElement('span', {
          style: { fontSize: 10, fontWeight: 600, color: T.dim, fontFamily: FONT.mono, marginLeft: 8 }
        }, p.pos || '')
      ),

      // OVR bar
      ovrBar,

      // Details row
      React.createElement('div', {
        style: { display: 'flex', gap: 12, fontSize: 9, color: T.dim, fontFamily: FONT.mono, letterSpacing: '0.3px' }
      },
        React.createElement('span', null, 'AGE ' + age),
        contractYear ? React.createElement('span', null, contractYear) : null,
        salary ? React.createElement('span', { style: { color: T.gold } }, salary) : null,
        injured ? React.createElement('span', { style: { color: T.red } }, 'INJURED') : null
      ),

      // Traits (show first 2)
      p.traits && p.traits.length > 0 ? React.createElement('div', {
        style: { marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }
      },
        p.traits.slice(0, 2).map(function(t, i) {
          var tName = typeof t === 'string' ? t : (t.name || t.key || '');
          return React.createElement('span', {
            key: i,
            style: {
              fontSize: 8,
              padding: '1px 5px',
              borderRadius: 2,
              background: 'rgba(240,160,40,0.12)',
              color: T.gold,
              fontWeight: 600,
              fontFamily: FONT.body,
              letterSpacing: '0.3px',
            }
          }, tName.toUpperCase());
        })
      ) : null
    )
  );
}
