/**
 * KpiGrid — Simple flex container for KpiCard children.
 *
 * Props:
 *   children {node}  KpiCard elements to lay out in a flex row
 */
import React from 'react';
import { SP } from '../config/theme.js';

export function KpiGrid(props) {
  var children = props.children;
  return React.createElement("div", {
    style: {
      display: 'flex',
      gap: SP.sm,
      flexWrap: 'wrap'
    }
  }, children ? (Array.isArray(children) ? children : [children]).map(function(child, i) {
    return React.createElement("div", { key: i, style: { flex: 1, minWidth: 70 } }, child);
  }) : null);
}
