/**
 * KpiCard — Dashboard stat card with optional trend arrow.
 *
 * Props:
 *   value      {string|number}  Main value to display
 *   label      {string}         Label below value
 *   trend      {number|null}    Positive = up arrow green, negative = down arrow red, null = none
 *   trendLabel {string}         Tooltip text for the trend indicator
 *   color      {string}         Value text color (default T.gold)
 *   onClick    {function}       Makes card clickable with hover border
 */
import React, { useState } from 'react';
import { T, FONT, SP, RAD } from '../config/theme.js';

export function KpiCard(props) {
  var value = props.value;
  var label = props.label;
  var trend = props.trend;
  var trendLabel = props.trendLabel;
  var color = props.color || T.gold;
  var onClick = props.onClick;

  if (!onClick) {
    // No hover state needed — pure render
    return React.createElement("div", {
      style: {
        background: 'rgba(255,255,255,0.03)',
        padding: SP.md,
        borderRadius: RAD.md,
        border: '1px solid ' + T.border,
        minWidth: 0
      }
    },
      React.createElement("div", {
        style: { display: 'flex', alignItems: 'baseline', gap: 4 }
      },
        React.createElement("span", {
          style: {
            fontFamily: FONT.mono,
            fontSize: 22,
            fontWeight: 700,
            color: color,
            lineHeight: 1
          }
        }, value),
        trend != null ? React.createElement("span", {
          style: {
            fontSize: 10,
            color: trend > 0 ? T.green : T.red,
            fontFamily: FONT.mono
          },
          title: trendLabel || ''
        }, trend > 0 ? '\u25B2' : '\u25BC') : null
      ),
      React.createElement("div", {
        style: {
          fontFamily: FONT.body,
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: T.dim,
          marginTop: 4
        }
      }, label)
    );
  }

  // Clickable variant — needs hover state
  var _h = useState(false);
  var hovered = _h[0];
  var setHovered = _h[1];

  return React.createElement("div", {
    style: {
      background: 'rgba(255,255,255,0.03)',
      padding: SP.md,
      borderRadius: RAD.md,
      border: '1px solid ' + (hovered ? T.borderHover : T.border),
      cursor: 'pointer',
      transition: 'border-color 0.15s ease',
      minWidth: 0
    },
    onClick: onClick,
    onMouseEnter: function() { setHovered(true); },
    onMouseLeave: function() { setHovered(false); }
  },
    React.createElement("div", {
      style: { display: 'flex', alignItems: 'baseline', gap: 4 }
    },
      React.createElement("span", {
        style: {
          fontFamily: FONT.mono,
          fontSize: 22,
          fontWeight: 700,
          color: color,
          lineHeight: 1
        }
      }, value),
      trend != null ? React.createElement("span", {
        style: {
          fontSize: 10,
          color: trend > 0 ? T.green : T.red,
          fontFamily: FONT.mono
        },
        title: trendLabel || ''
      }, trend > 0 ? '\u25B2' : '\u25BC') : null
    ),
    React.createElement("div", {
      style: {
        fontFamily: FONT.body,
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: T.dim,
        marginTop: 4
      }
    }, label)
  );
}
