/**
 * MFD Chart Components — lazy-loaded barrel export.
 *
 * Usage:
 *   import { LazyLineChart, LazyBarChart, LazyRadarChart, ChartSuspense } from './charts/index.js';
 *
 *   <ChartSuspense>
 *     <LazyLineChart data={...} />
 *   </ChartSuspense>
 */
import React, { Suspense, lazy } from 'react';
import { T, FONT } from '../../config/theme.js';

// Lazy-loaded chart components — only loaded when rendered
export var LazyLineChart = lazy(function () { return import('./LineChart.jsx'); });
export var LazyBarChart = lazy(function () { return import('./BarChart.jsx'); });
export var LazyRadarChart = lazy(function () { return import('./RadarChart.jsx'); });

// Suspense wrapper with MFD-styled loading fallback
export function ChartSuspense(props) {
  var height = props.height || 200;
  return React.createElement(
    Suspense,
    {
      fallback: React.createElement('div', {
        style: {
          height: height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.faint,
          fontSize: 10,
          fontFamily: FONT.mono,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 4,
        },
      }, 'Loading chart...'),
    },
    props.children
  );
}
