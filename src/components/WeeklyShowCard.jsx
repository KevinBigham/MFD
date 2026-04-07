/**
 * WeeklyShowCard — Collapsible MFD weekly report card.
 *
 * Props:
 *   weekShow  {object}   Weekly show data (power ranks, awards, headlines, etc.)
 *   myId      {string}   Player's team ID (for highlighting)
 *   expanded  {boolean}  Whether the card is expanded
 *   onToggle  {function} Callback to toggle expansion
 */

import { T, S, RAD } from '../config/theme.js';
import { mS } from '../utils/helpers.js';

function reasonTag(r) {
  if (r.pdpg >= 8) return { tag: "Elite Offense", color: T.green };
  if (r.pdpg <= -5) return { tag: "Struggling Offense", color: T.red };
  if (r.sos >= 55) return { tag: "Tough Schedule", color: T.cyan };
  if (r.mom >= 2) return { tag: "Hot Streak", color: T.gold };
  if (r.mom <= -2) return { tag: "Cold Streak", color: T.red };
  if (r.winp >= 0.7) return { tag: "Dominant", color: T.gold };
  if (r.winp <= 0.3) return { tag: "Rebuilding", color: T.faint };
  return { tag: "Steady", color: T.dim };
}

export function WeeklyShowCard(props) {
  var ws = props.weekShow;
  var myId = props.myId;
  var expanded = props.expanded;
  var onToggle = props.onToggle;
  if (!ws) return null;
  return React.createElement("div", { style: mS(S.studioCard, { padding: 12 }) },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: expanded ? 8 : 0 }, onClick: onToggle },
      React.createElement("div", { style: mS(S.header, { fontSize: 12, color: T.gold }) }, ">> MFD REPORT — WK " + ws.week),
      React.createElement("span", { style: { fontSize: 10, color: T.faint } }, expanded ? "▲ Collapse" : "▼ Expand")
    ),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6, marginBottom: expanded ? 8 : 0 } },
      React.createElement("div", { style: mS(S.kpiBox, { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: RAD.md }) },
        React.createElement("div", { style: { fontSize: 14 } }, ws.upset ? "😱" : "✅"),
        React.createElement("div", { style: { fontSize: 9, fontWeight: 800, color: ws.upset ? T.red : T.green, marginTop: 2 } }, ws.upset ? "UPSET" : "NO UPSETS"),
        ws.upset && React.createElement("div", { style: { fontSize: 8, color: T.dim, marginTop: 1 } }, ws.upset.winnerAbbr + " over " + ws.upset.loserAbbr)
      ),
      React.createElement("div", { style: mS(S.kpiBox, { background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: RAD.md }) },
        React.createElement("div", { style: { fontSize: 14 } }, "🏈"),
        React.createElement("div", { style: { fontSize: 9, fontWeight: 800, color: T.gold, marginTop: 2 } }, "GAME OF WK"),
        ws.gotw && React.createElement("div", { style: { fontSize: 8, color: T.dim, marginTop: 1 } }, ws.gotw.homeAbbr + " " + ws.gotw.score + " " + ws.gotw.awayAbbr)
      ),
      React.createElement("div", { style: mS(S.kpiBox, { background: ws.hotSeat.length > 0 ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)", border: "1px solid " + (ws.hotSeat.length > 0 ? "rgba(245,158,11,0.15)" : T.border), borderRadius: RAD.md }) },
        React.createElement("div", { style: { fontSize: 14 } }, ws.hotSeat.length > 0 ? "🔥" : "😎"),
        React.createElement("div", { style: { fontSize: 9, fontWeight: 800, color: ws.hotSeat.length > 0 ? T.orange : T.green, marginTop: 2 } }, ws.hotSeat.length > 0 ? "HOT SEAT" : "ALL SAFE"),
        ws.hotSeat[0] && React.createElement("div", { style: { fontSize: 8, color: T.dim, marginTop: 1 } }, ws.hotSeat[0].icon + ws.hotSeat[0].abbr + " (" + ws.hotSeat[0].mood + ")")
      )
    ),
    expanded && React.createElement("div", null,
      React.createElement("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: RAD.sm, padding: 8, marginBottom: 6 } },
        React.createElement("div", { style: { fontSize: 9, fontWeight: 800, color: T.gold, marginBottom: 4 } }, "⚡ TOP TEAMS"),
        ws.powerRanks.slice(0, 5).map(function (r, i) {
          var isMe2 = r.id === myId;
          var rt = reasonTag(r);
          return React.createElement("div", { key: r.id, style: { display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" } },
            React.createElement("span", { style: { fontWeight: 900, fontSize: 12, width: 18, color: i === 0 ? T.gold : i < 3 ? T.green : T.dim, textAlign: "center" } }, r.rank),
            React.createElement("span", { style: { fontSize: 11, fontWeight: isMe2 ? 800 : 500, color: isMe2 ? T.gold : T.text } }, r.icon + " " + r.abbr),
            React.createElement("span", { style: { fontSize: 8, padding: "1px 5px", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: rt.color, marginLeft: 4 } }, rt.tag),
            React.createElement("span", { style: { fontSize: 10, color: T.dim, marginLeft: "auto" } }, r.wins + "-" + r.losses),
            React.createElement("span", { style: { fontSize: 9, color: T.faint, width: 28, textAlign: "right" } }, r.pdpg > 0 ? "+" + r.pdpg : r.pdpg)
          );
        })
      ),
      ws.awards && ws.awards.mvp[0] && React.createElement("div", { style: { background: "rgba(0,0,0,0.15)", borderRadius: RAD.sm, padding: 8, marginBottom: 6 } },
        React.createElement("div", { style: { fontSize: 9, fontWeight: 800, color: T.gold, marginBottom: 4 } }, "🏅 MVP WATCH"),
        ws.awards.mvp.slice(0, 3).map(function (c, ci) {
          return React.createElement("div", { key: ci, style: { display: "flex", alignItems: "center", gap: 6, padding: "2px 0", fontSize: 10 } },
            React.createElement("span", { style: { fontWeight: 900, width: 14, color: ci === 0 ? T.gold : T.dim } }, ci + 1),
            React.createElement("span", { style: { fontWeight: 600 } }, c.name),
            React.createElement("span", { style: { color: T.gold, fontSize: 9 } }, c.pos),
            React.createElement("span", { style: { color: T.dim, marginLeft: "auto", fontSize: 9 } }, c.icon + c.team),
            React.createElement("span", { style: { color: T.faint, fontSize: 9, marginLeft: 4 } }, c.score + " pts")
          );
        })
      ),
      ws.headlines && ws.headlines.length > 0 && React.createElement("div", { style: { background: "rgba(0,0,0,0.1)", borderRadius: RAD.sm, padding: 8 } },
        React.createElement("div", { style: { fontSize: 9, fontWeight: 800, color: T.gold, marginBottom: 4 } }, "📰 HEADLINES"),
        ws.headlines.slice(0, 4).map(function (h, hi) {
          return React.createElement("div", { key: hi, style: { fontSize: 9, color: T.dim, padding: "1px 0" } }, h);
        })
      )
    )
  );
}
