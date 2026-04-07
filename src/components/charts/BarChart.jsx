/**
 * BarChart — MFD adapter wrapping nivo ResponsiveBar.
 *
 * Terminal Maximalism styled bar chart for cap breakdowns,
 * position group comparisons, etc.
 *
 * Props:
 *   data       {Array}   nivo bar data: [{category, value, ...}]
 *   keys       {Array}   Data keys to render as bars
 *   indexBy    {string}  Category field name (default 'category')
 *   height     {number}  Chart height in px (default 200)
 *   colors     {Array}   Bar colors
 *   layout     {string}  'vertical' | 'horizontal' (default 'vertical')
 *   grouped    {boolean} Group bars instead of stacking (default false)
 */
import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { T, FONT } from '../../config/theme.js';

export default function BarChart(props) {
  var data = props.data || [];
  var keys = props.keys || ['value'];
  var indexBy = props.indexBy || 'category';
  var height = props.height || 200;
  var colors = props.colors || [T.gold, T.green, T.cyan, T.purple, T.red];
  var layout = props.layout || 'vertical';
  var grouped = props.grouped || false;

  return React.createElement('div', { style: { height: height, width: '100%' } },
    React.createElement(ResponsiveBar, {
      data: data,
      keys: keys,
      indexBy: indexBy,
      layout: layout,
      groupMode: grouped ? 'grouped' : 'stacked',
      colors: colors,
      borderRadius: 2,
      padding: 0.3,
      margin: { top: 10, right: 20, bottom: 30, left: 50 },
      enableGridY: true,
      gridYValues: 5,
      enableLabel: false,
      axisBottom: {
        tickSize: 0,
        tickPadding: 8,
      },
      axisLeft: {
        tickSize: 0,
        tickPadding: 8,
        tickValues: 5,
      },
      theme: {
        background: 'transparent',
        textColor: T.dim,
        fontSize: 9,
        fontFamily: FONT.mono,
        grid: {
          line: { stroke: T.border, strokeWidth: 1 },
        },
        axis: {
          ticks: { text: { fill: T.faint, fontSize: 8, fontFamily: FONT.mono } },
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
