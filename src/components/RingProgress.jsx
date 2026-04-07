import React from 'react';
import { T, FONT } from '../config/theme.js';

export function RingProgress(props) {
  var value = props.value || 0;
  var size = props.size || 60;
  var thickness = props.thickness || 4;
  var color = props.color || T.gold;
  var label = props.label;
  var sections = props.sections;

  var center = size / 2;
  var radius = (size - thickness) / 2;
  var circumference = 2 * Math.PI * radius;

  var bgCircle = React.createElement('circle', {
    cx: center,
    cy: center,
    r: radius,
    stroke: T.bg3,
    strokeWidth: thickness,
    fill: 'none',
  });

  var arcs = [];
  if (sections && sections.length) {
    var cumulative = 0;
    var idx = 0;
    while (idx < sections.length) {
      var sec = sections[idx];
      var offset = circumference * (1 - sec.value / 100);
      var rotation = -90 + (cumulative / 100) * 360;
      arcs.push(
        React.createElement('circle', {
          key: idx,
          cx: center,
          cy: center,
          r: radius,
          stroke: sec.color,
          strokeWidth: thickness,
          fill: 'none',
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          strokeLinecap: 'round',
          transform: 'rotate(' + rotation + ' ' + center + ' ' + center + ')',
          style: { transition: 'stroke-dashoffset 0.5s ease' },
        })
      );
      cumulative += sec.value;
      idx++;
    }
  } else {
    arcs.push(
      React.createElement('circle', {
        key: 'progress',
        cx: center,
        cy: center,
        r: radius,
        stroke: color,
        strokeWidth: thickness,
        fill: 'none',
        strokeDasharray: circumference,
        strokeDashoffset: circumference * (1 - value / 100),
        strokeLinecap: 'round',
        style: {
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          transition: 'stroke-dashoffset 0.5s ease',
        },
      })
    );
  }

  var labelEl = label
    ? React.createElement(
        'foreignObject',
        { x: 0, y: 0, width: size, height: size },
        React.createElement(
          'div',
          {
            style: {
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: FONT.mono,
              color: T.text,
            },
          },
          label
        )
      )
    : null;

  return React.createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size },
    bgCircle,
    arcs,
    labelEl
  );
}
