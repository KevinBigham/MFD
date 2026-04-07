/**
 * ConsequenceRibbon — Immediate Feedback Strip
 *
 * Shows real deltas after meaningful actions (trades, cuts, press conferences).
 * Auto-fades after 3 seconds. Bloomberg Terminal aesthetic.
 *
 * Props:
 *   deltas    — array of { label, value, positive } or null to hide
 *   visible   — boolean
 */
import React, { useState, useEffect, useRef } from 'react';
import { T, RAD } from '../config/theme.js';

var MONO = "'JetBrains Mono','Fira Code','Courier New',monospace";

export default function ConsequenceRibbon(props) {
  var deltas = props.deltas;
  var visible = props.visible;

  var _opacity = useState(0);
  var opacity = _opacity[0];
  var setOpacity = _opacity[1];

  var timer = useRef(null);

  useEffect(function () {
    if (visible && deltas && deltas.length > 0) {
      setOpacity(1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(function () {
        setOpacity(0);
      }, 3000);
    } else {
      setOpacity(0);
    }
    return function () { if (timer.current) clearTimeout(timer.current); };
  }, [visible, deltas]);

  if (!deltas || deltas.length === 0 || opacity === 0) return null;

  // Filter to non-zero deltas, cap at 5
  var filtered = deltas.filter(function (d) { return d.value !== 0; }).slice(0, 5);
  if (filtered.length === 0) return null;

  return React.createElement('div', {
    style: {
      position: 'fixed',
      bottom: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99950,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '8px 20px',
      background: 'rgba(7,13,23,0.95)',
      border: '1px solid rgba(240,160,40,0.3)',
      borderRadius: RAD.sm,
      fontFamily: MONO,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.5,
      opacity: opacity,
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }
  },
    React.createElement('span', { style: { color: T.gold, fontSize: 10 } }, '\u2550\u2550\u2550'),
    filtered.map(function (d, i) {
      var isPos = d.value > 0;
      var prefix = isPos ? '+' : '';
      var color = isPos ? T.green : T.red;
      var valStr = typeof d.value === 'number'
        ? (d.value % 1 !== 0 ? prefix + d.value.toFixed(1) : prefix + d.value)
        : String(d.value);
      return React.createElement('span', { key: i, style: { color: color } },
        d.label + ' ' + valStr
      );
    }),
    React.createElement('span', { style: { color: T.gold, fontSize: 10 } }, '\u2550\u2550\u2550')
  );
}

/**
 * Helper: capture state snapshot for delta calculation.
 * Call before an action, then after to compute deltas.
 */
export function captureSnapshot(my, ownerPatience) {
  if (!my) return {};
  return {
    capUsed: my.capUsed || 0,
    ownerMood: my.ownerMood || 70,
    ownerPatience: ownerPatience || 70,
    rosterSize: my.roster ? my.roster.length : 0,
  };
}

export function computeDeltas(before, after, my, ownerPatience) {
  if (!before || !my) return [];
  var now = {
    capUsed: my.capUsed || 0,
    ownerMood: my.ownerMood || 70,
    ownerPatience: ownerPatience || 70,
    rosterSize: my.roster ? my.roster.length : 0,
  };
  var deltas = [];
  var capDelta = -(now.capUsed - before.capUsed); // positive = more space
  if (capDelta !== 0) deltas.push({ label: 'CAP', value: Math.round(capDelta * 10) / 10 });
  var moodDelta = now.ownerMood - before.ownerMood;
  if (moodDelta !== 0) deltas.push({ label: 'OWNER', value: moodDelta });
  var patienceDelta = now.ownerPatience - before.ownerPatience;
  if (patienceDelta !== 0) deltas.push({ label: 'PATIENCE', value: patienceDelta });
  var rosterDelta = now.rosterSize - before.rosterSize;
  if (rosterDelta !== 0) deltas.push({ label: 'ROSTER', value: rosterDelta });
  return deltas;
}
