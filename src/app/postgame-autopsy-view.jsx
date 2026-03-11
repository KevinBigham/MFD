import React from 'react';

var T = {
  bg: '#0f172a', card: '#111827', text: '#f1f5f9', dim: '#94a3b8',
  border: '#334155', cyan: '#22d3ee', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', gold: '#fbbf24', navy: '#1e3a5f',
};

var S = {
  card: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.dim },
  val: { fontSize: 22, fontWeight: 800, color: T.text },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11 },
};

function StatCompare(props) {
  var label = props.label, home = props.home, away = props.away;
  var hWin = Number(home) > Number(away);
  var aWin = Number(away) > Number(home);
  return React.createElement('div', { style: S.statRow },
    React.createElement('span', { style: { color: hWin ? T.cyan : T.dim, fontWeight: hWin ? 700 : 400, minWidth: 50, textAlign: 'right' } }, home),
    React.createElement('span', { style: { color: T.dim, flex: 1, textAlign: 'center', fontWeight: 600 } }, label),
    React.createElement('span', { style: { color: aWin ? T.cyan : T.dim, fontWeight: aWin ? 700 : 400, minWidth: 50, textAlign: 'left' } }, away)
  );
}

function QuarterBar(props) {
  var qtrs = props.qtrs;
  if (!qtrs || !qtrs.h || !qtrs.a) return null;
  var labels = qtrs.h.map(function(_, i) { return i < 4 ? 'Q' + (i + 1) : 'OT'; });
  return React.createElement('div', { style: { display: 'flex', gap: 0, fontSize: 11, marginTop: 8 } },
    React.createElement('div', { style: { width: 40, color: T.dim, fontWeight: 700 } }, ''),
    labels.map(function(lbl, i) {
      return React.createElement('div', { key: i, style: { flex: 1, textAlign: 'center', color: T.dim, fontWeight: 600 } }, lbl);
    }),
    React.createElement('div', { style: { width: 40, textAlign: 'center', color: T.gold, fontWeight: 800 } }, 'F')
  ),
  // Home row
  React.createElement('div', { style: { display: 'flex', gap: 0, fontSize: 12, marginTop: 2 } },
    React.createElement('div', { style: { width: 40, color: T.text, fontWeight: 700 } }, props.homeAbbr || 'HOME'),
    qtrs.h.map(function(v, i) {
      return React.createElement('div', { key: i, style: { flex: 1, textAlign: 'center', color: T.text } }, v);
    }),
    React.createElement('div', { style: { width: 40, textAlign: 'center', color: T.gold, fontWeight: 800 } }, props.homeScore)
  ),
  // Away row
  React.createElement('div', { style: { display: 'flex', gap: 0, fontSize: 12, marginTop: 2 } },
    React.createElement('div', { style: { width: 40, color: T.text, fontWeight: 700 } }, props.awayAbbr || 'AWAY'),
    qtrs.a.map(function(v, i) {
      return React.createElement('div', { key: i, style: { flex: 1, textAlign: 'center', color: T.text } }, v);
    }),
    React.createElement('div', { style: { width: 40, textAlign: 'center', color: T.gold, fontWeight: 800 } }, props.awayScore)
  );
}

function LeaderCard(props) {
  var side = props.side, leaders = props.leaders, color = props.color || T.text;
  if (!leaders) return null;
  var items = [];
  if (leaders.pass) items.push(leaders.pass.name + ': ' + leaders.pass.yds + ' yds, ' + leaders.pass.td + ' TD' + (leaders.pass.int ? ', ' + leaders.pass.int + ' INT' : ''));
  if (leaders.rush) items.push(leaders.rush.name + ': ' + leaders.rush.yds + ' rush yds, ' + leaders.rush.td + ' TD');
  if (leaders.rec && leaders.rec.length > 0) {
    var topRec = leaders.rec[0];
    items.push(topRec.name + ': ' + topRec.rec + ' rec, ' + topRec.yds + ' yds' + (topRec.td ? ', ' + topRec.td + ' TD' : ''));
  }
  if (leaders.sack && leaders.sack.length > 0) items.push(leaders.sack[0].name + ': ' + leaders.sack[0].n + ' sack' + (leaders.sack[0].n > 1 ? 's' : ''));
  if (leaders.ints && leaders.ints.length > 0) items.push(leaders.ints[0].name + ': ' + leaders.ints[0].n + ' INT');
  return React.createElement('div', { style: { flex: 1 } },
    React.createElement('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: color, marginBottom: 4, letterSpacing: '0.08em' } }, side + ' LEADERS'),
    items.map(function(item, i) {
      return React.createElement('div', { key: i, style: { fontSize: 11, color: T.text, padding: '2px 0' } }, item);
    })
  );
}

export default function PostgameAutopsy(props) {
  var data = props.data;
  if (!data || !data.autopsy || !data.autopsy.score) return null;

  var a = data.autopsy;
  var ctx = data.context || {};
  var won = a.won;
  var userSide = ctx.userSide || 'home';
  var userScore = userSide === 'home' ? a.score.home : a.score.away;
  var oppScore = userSide === 'home' ? a.score.away : a.score.home;
  var userAbbr = userSide === 'home' ? ctx.homeTeam : ctx.awayTeam;
  var oppAbbr = userSide === 'home' ? ctx.awayTeam : ctx.homeTeam;

  return React.createElement('div', { style: S.card },
    // Header: Result banner
    React.createElement('div', { style: {
      textAlign: 'center', padding: '10px 0', marginBottom: 10,
      background: won ? 'linear-gradient(135deg, #064e3b, #065f46)' : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
      borderRadius: 8,
    } },
      React.createElement('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: won ? T.green : T.red } }, won ? 'VICTORY' : 'DEFEAT'),
      React.createElement('div', { style: { fontSize: 28, fontWeight: 900, color: T.text, marginTop: 2 } },
        (ctx.homeIcon || '') + ' ' + (ctx.homeTeam || 'HOME') + '  ' + a.score.home + ' – ' + a.score.away + '  ' + (ctx.awayIcon || '') + ' ' + (ctx.awayTeam || 'AWAY')
      ),
      a.overtime ? React.createElement('div', { style: { fontSize: 10, color: T.gold, fontWeight: 700, marginTop: 2 } }, 'OVERTIME') : null,
      a.weather ? React.createElement('div', { style: { fontSize: 10, color: T.dim, marginTop: 4 } },
        (a.weather.temp || '72') + '°F · ' + (a.weather.precip || 'Clear') + (a.weather.wind ? ' · Wind ' + a.weather.wind + ' mph' : '')
      ) : null
    ),

    // Quarter scores
    a.quarters ? React.createElement('div', { style: { marginBottom: 10 } },
      QuarterBar({ qtrs: a.quarters, homeAbbr: ctx.homeTeam, awayAbbr: ctx.awayTeam, homeScore: a.score.home, awayScore: a.score.away })
    ) : null,

    // Box Score comparison
    a.box ? React.createElement('div', { style: { ...S.card, padding: 10 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 800, color: T.cyan, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Box Score'),
      StatCompare({ label: 'Pass Yds', home: a.box.home ? a.box.home.passYds : 0, away: a.box.away ? a.box.away.passYds : 0 }),
      StatCompare({ label: 'Pass TD', home: a.box.home ? a.box.home.passTD : 0, away: a.box.away ? a.box.away.passTD : 0 }),
      StatCompare({ label: 'INT', home: a.box.home ? a.box.home.int : 0, away: a.box.away ? a.box.away.int : 0 }),
      StatCompare({ label: 'Rush Yds', home: a.box.home ? a.box.home.rushYds : 0, away: a.box.away ? a.box.away.rushYds : 0 }),
      StatCompare({ label: 'Rush TD', home: a.box.home ? a.box.home.rushTD : 0, away: a.box.away ? a.box.away.rushTD : 0 }),
      StatCompare({ label: 'Sacks', home: a.box.home ? a.box.home.sacks : 0, away: a.box.away ? a.box.away.sacks : 0 }),
      StatCompare({ label: 'Penalties', home: a.box.home ? a.box.home.penalties : 0, away: a.box.away ? a.box.away.penalties : 0 }),
      StatCompare({ label: '3rd Down', home: a.box.home ? a.box.home.thirdConv + '/' + a.box.home.thirdDown : '–', away: a.box.away ? a.box.away.thirdConv + '/' + a.box.away.thirdDown : '–' }),
      StatCompare({ label: 'TOP', home: a.box.home ? a.box.home.TOP + ':00' : '–', away: a.box.away ? a.box.away.TOP + ':00' : '–' })
    ) : null,

    // Stat Leaders
    a.leaders ? React.createElement('div', { style: { display: 'flex', gap: 12, marginTop: 8 } },
      LeaderCard({ side: ctx.homeTeam || 'HOME', leaders: a.leaders.home, color: T.cyan }),
      LeaderCard({ side: ctx.awayTeam || 'AWAY', leaders: a.leaders.away, color: T.dim })
    ) : null,

    // Coach Impact
    a.coachImpact ? React.createElement('div', { style: { ...S.card, padding: 10, marginTop: 8 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 800, color: T.gold, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Coaching Edge'),
      React.createElement('div', { style: { fontSize: 11, color: T.dim } },
        (ctx.homeTeam || 'Home') + ': ' + (a.coachImpact.home ? (a.coachImpact.home.edge > 0 ? '+' : '') + a.coachImpact.home.edge : '0') + ' edge' +
        (a.coachImpact.home && a.coachImpact.home.traits && a.coachImpact.home.traits.length > 0 ? ' (' + a.coachImpact.home.traits.map(function(t) { return t.key; }).join(', ') + ')' : '')
      ),
      React.createElement('div', { style: { fontSize: 11, color: T.dim, marginTop: 2 } },
        (ctx.awayTeam || 'Away') + ': ' + (a.coachImpact.away ? (a.coachImpact.away.edge > 0 ? '+' : '') + a.coachImpact.away.edge : '0') + ' edge' +
        (a.coachImpact.away && a.coachImpact.away.traits && a.coachImpact.away.traits.length > 0 ? ' (' + a.coachImpact.away.traits.map(function(t) { return t.key; }).join(', ') + ')' : '')
      )
    ) : null,

    // Key Plays
    a.keyPlays && a.keyPlays.length > 0 ? React.createElement('div', { style: { ...S.card, padding: 10, marginTop: 8 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 800, color: T.yellow, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Key Plays'),
      a.keyPlays.map(function(play, i) {
        return React.createElement('div', { key: i, style: { fontSize: 11, color: T.text, padding: '2px 0', borderBottom: i < a.keyPlays.length - 1 ? '1px solid ' + T.border : 'none' } }, play);
      })
    ) : null
  );
}
