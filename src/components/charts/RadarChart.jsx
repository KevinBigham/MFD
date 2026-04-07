/**
 * RadarChart — MFD adapter wrapping nivo ResponsiveRadar.
 *
 * Terminal Maximalism styled radar chart for player scouting
 * profiles (speed, strength, awareness, etc.).
 *
 * Props:
 *   data       {Array}   nivo radar data: [{stat, player, league}]
 *   keys       {Array}   Data keys to render (default ['player'])
 *   indexBy    {string}  Stat name field (default 'stat')
 *   height     {number}  Chart height in px (default 200)
 *   colors     {Array}   Line colors
 *   maxValue   {number}  Max scale value (default 100)
 */
import React from 'react';
import { ResponsiveRadar } from '@nivo/radar';
import { T, FONT } from '../../config/theme.js';

export default function RadarChart(props) {
  var data = props.data || [];
  var keys = props.keys || ['player'];
  var indexBy = props.indexBy || 'stat';
  var height = props.height || 200;
  var colors = props.colors || [T.gold, T.cyan];
  var maxValue = props.maxValue || 100;

  return React.createElement('div', { style: { height: height, width: '100%' } },
    React.createElement(ResponsiveRadar, {
      data: data,
      keys: keys,
      indexBy: indexBy,
      maxValue: maxValue,
      colors: colors,
      borderWidth: 2,
      borderColor: { from: 'color' },
      dotSize: 6,
      dotColor: T.bg,
      dotBorderWidth: 2,
      dotBorderColor: { from: 'color' },
      fillOpacity: 0.15,
      blendMode: 'normal',
      gridShape: 'circular',
      gridLevels: 4,
      margin: { top: 30, right: 40, bottom: 30, left: 40 },
      theme: {
        background: 'transparent',
        textColor: T.dim,
        fontSize: 9,
        fontFamily: FONT.mono,
        grid: {
          line: { stroke: T.border, strokeWidth: 1 },
        },
        tooltip: {
          container: {
            background: T.bg2,
            color: T.text,
            border: '1px solid ' + T.border,
            borderRadius: 4,
            fontSize: 10,
            fontFamily: FONT.body,
            padding: '4px 8px',
          },
        },
      },
    })
  );
}
