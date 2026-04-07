/**
 * LineChart — MFD adapter wrapping nivo ResponsiveLine.
 *
 * Terminal Maximalism styled line chart with dark background,
 * gold/green/red lines, dim grid, monospace axes.
 *
 * Props:
 *   data       {Array}   nivo line data: [{id, data: [{x, y}]}]
 *   height     {number}  Chart height in px (default 200)
 *   colors     {Array}   Line colors (default [T.gold, T.green, T.red])
 *   showGrid   {boolean} Show grid lines (default true)
 *   showArea   {boolean} Fill area under line (default false)
 *   curve      {string}  'linear' | 'monotoneX' | 'step' (default 'monotoneX')
 *   yFormat    {string}  y-axis label format
 */
import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { T, FONT } from '../../config/theme.js';

export default function LineChart(props) {
  var data = props.data || [];
  var height = props.height || 200;
  var colors = props.colors || [T.gold, T.green, T.red, T.cyan, T.purple];
  var showGrid = props.showGrid !== false;
  var showArea = props.showArea || false;
  var curve = props.curve || 'monotoneX';

  return React.createElement('div', { style: { height: height, width: '100%' } },
    React.createElement(ResponsiveLine, {
      data: data,
      colors: colors,
      curve: curve,
      enableArea: showArea,
      areaOpacity: 0.08,
      margin: { top: 10, right: 20, bottom: 30, left: 40 },
      xScale: { type: 'point' },
      yScale: { type: 'linear', min: 'auto', max: 'auto' },
      enableGridX: false,
      enableGridY: showGrid,
      gridYValues: 5,
      lineWidth: 2,
      pointSize: 4,
      pointColor: T.bg,
      pointBorderWidth: 2,
      pointBorderColor: { from: 'serieColor' },
      enablePoints: data.length > 0 && data[0].data && data[0].data.length <= 20,
      axisBottom: {
        tickSize: 0,
        tickPadding: 8,
        tickRotation: 0,
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
        crosshair: {
          line: { stroke: T.gold, strokeWidth: 1, strokeOpacity: 0.5 },
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
      useMesh: true,
    })
  );
}
