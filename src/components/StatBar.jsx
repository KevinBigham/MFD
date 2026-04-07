/**
 * StatBar — Horizontal rating/value bar with color-coded fill.
 *
 * Props:
 *   value  {number}  Rating value 0-99  (default 0)
 *   width  {number}  Bar width in px    (default 60)
 *   height {number}  Bar height in px   (default 6)
 */

import { T } from '../config/theme.js';

export function StatBar(props) {
  var v = props.value || 0;
  var w = props.width || 60;
  var h = props.height || 6;
  var c = v >= 95 ? T.cyan : v >= 80 ? T.green : v >= 60 ? T.gold : T.red;
  return React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 4 } },
    React.createElement("div", { style: { width: w, height: h, background: "rgba(255,255,255,0.06)", borderRadius: h / 2, overflow: "hidden" } },
      React.createElement("div", { style: { width: Math.min(v, 99) + "%", height: "100%", background: c, borderRadius: h / 2, transition: "width 0.3s ease" } })
    ),
    React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: c, minWidth: 20, textAlign: "right" } }, v)
  );
}
