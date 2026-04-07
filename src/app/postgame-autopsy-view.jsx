import React from 'react';

var T = {
  bg: '#0f172a', card: '#111827', text: '#f1f5f9', dim: '#94a3b8',
  border: '#334155', cyan: '#22d3ee', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', gold: '#fbbf24', navy: '#1e3a5f',
};

var S = {
  card: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11 },
  sectionHead: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
};

var TRAIT_LABELS = {
  stallReduction: 'Drive Sustain', pressureBoost: 'Pass Rush Scheme', pocketBoost: 'Pocket Protection',
  moraleBoost: 'Locker Room Culture', moraleStability: 'Emotional Steadiness', rzTdBoost: 'Red Zone Playcalling',
  bigPlayAllowed: 'Big Play Prevention', intReduction: 'Ball Security Coaching', qbBoost: 'QB Development Edge',
  counterBoost: 'Scheme Counter Edge',
};

function traitLabel(key) {
  return TRAIT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, function(s) { return s.toUpperCase(); });
}

function buildNarrative(a, ctx) {
  var lines = [];
  var userSide = ctx.userSide || 'home';
  var won = a.won;
  var userAbbr = userSide === 'home' ? ctx.homeTeam : ctx.awayTeam;
  var oppAbbr = userSide === 'home' ? ctx.awayTeam : ctx.homeTeam;
  var uBox = a.box ? a.box[userSide] : null;
  var oBox = a.box ? a.box[userSide === 'home' ? 'away' : 'home'] : null;
  var margin = Math.abs(a.score.home - a.score.away);

  if (margin >= 21) lines.push(won ? 'A dominant performance from start to finish.' : 'This one got away early and never came back.');
  else if (margin >= 14) lines.push(won ? 'A comfortable win. Your team controlled the tempo for most of the game.' : 'The opponent built a lead your team couldn\'t close.');
  else if (margin >= 7) lines.push(won ? 'A solid victory, though it was competitive throughout.' : 'A one-score loss. This game was there for the taking.');
  else if (margin >= 4) lines.push(won ? 'Squeaked this one out. A field goal was the difference.' : 'Painfully close. A single drive could have flipped this.');
  else lines.push(won ? 'A nail-biter that went down to the wire.' : 'Heartbreaking. This game could have gone either way.');

  if (a.overtime) lines.push('This one needed overtime to decide.');

  if (uBox && oBox) {
    var passGap = uBox.passYds - oBox.passYds;
    if (passGap > 80) lines.push('Your passing attack dominated, controlling the aerial game with ' + uBox.passYds + ' yards through the air.');
    else if (passGap < -80) lines.push('The opponent\'s passing game was the story \u2014 they out-gained you by ' + Math.abs(passGap) + ' yards through the air. Your secondary struggled to contain their receivers.');
    else if (uBox.passYds < 100 && oBox.passYds < 100) lines.push('Neither team could get the passing game going. This was a ground-and-pound affair.');

    var rushGap = uBox.rushYds - oBox.rushYds;
    if (rushGap > 50) lines.push('Your ground game was the engine \u2014 ' + uBox.rushYds + ' rushing yards gave your offense rhythm and kept the chains moving.');
    else if (rushGap < -50) lines.push('They controlled the line of scrimmage on the ground, outrushing you ' + oBox.rushYds + ' to ' + uBox.rushYds + '. When you can\'t establish the run, everything gets harder.');

    var uINTs = uBox.int || 0;
    var oINTs = oBox.int || 0;
    if (uINTs >= 2 && !won) lines.push('Turnovers killed you. ' + uINTs + ' interceptions gave the opponent short fields and easy points. Ball security has to be the focus.');
    else if (uINTs >= 2 && won) lines.push('You won despite ' + uINTs + ' interceptions \u2014 impressive, but that\'s not sustainable.');
    else if (oINTs >= 2) lines.push('Your defense forced ' + oINTs + ' interceptions, creating short fields and stealing momentum.');

    if (uBox.thirdDown > 0 && uBox.thirdConv >= 0) {
      var uThirdPct = Math.round((uBox.thirdConv / uBox.thirdDown) * 100);
      var oThirdPct = oBox.thirdDown > 0 ? Math.round((oBox.thirdConv / oBox.thirdDown) * 100) : 0;
      if (uThirdPct < 25 && !won) lines.push('Third-down efficiency was brutal at ' + uBox.thirdConv + '/' + uBox.thirdDown + ' (' + uThirdPct + '%). When you can\'t convert, drives stall and your defense stays on the field.');
      else if (uThirdPct >= 55) lines.push('Outstanding third-down conversion at ' + uBox.thirdConv + '/' + uBox.thirdDown + '. That kind of efficiency sustains drives and exhausts the opposing defense.');
      else if (oThirdPct >= 55 && !won) lines.push('The opponent converted ' + oBox.thirdConv + '/' + oBox.thirdDown + ' on third down (' + oThirdPct + '%). They kept extending drives and your defense couldn\'t get off the field.');
    }

    if (uBox.sacks >= 3 && oBox.sacks <= 1) lines.push('Your pass rush was disruptive with ' + uBox.sacks + ' sacks. That kind of pressure changes QB decision-making.');
    else if (oBox.sacks >= 3 && uBox.sacks <= 1) lines.push('Your quarterback took ' + oBox.sacks + ' sacks. The offensive line needs to hold up better in pass protection.');

    if (uBox.TOP && oBox.TOP) {
      var topGap = uBox.TOP - oBox.TOP;
      if (topGap >= 5) lines.push('You controlled the clock at ' + uBox.TOP + ':00 to ' + oBox.TOP + ':00. Winning time of possession keeps your defense fresh.');
      else if (topGap <= -5 && !won) lines.push('They dominated time of possession ' + oBox.TOP + ':00 to ' + uBox.TOP + ':00. Your defense was on the field too long.');
    }
  }

  if (a.weather) {
    if (a.weather.precip === 'RAIN' || a.weather.precip === 'SNOW') lines.push('The ' + (a.weather.precip === 'RAIN' ? 'rain' : 'snow') + ' played a factor \u2014 wet conditions affect ball security, footing, and passing accuracy.');
    if (a.weather.wind && a.weather.wind >= 15) lines.push('Heavy winds at ' + a.weather.wind + ' mph disrupted the downfield passing game.');
  }

  if (a.coachImpact) {
    var uCoach = a.coachImpact[userSide];
    var oCoach = a.coachImpact[userSide === 'home' ? 'away' : 'home'];
    if (uCoach && oCoach) {
      var edgeGap = (uCoach.edge || 0) - (oCoach.edge || 0);
      if (edgeGap <= -5) lines.push('Their coaching staff had a significant schematic advantage. Consider investing in coordinator upgrades or adjusting your gameplan.');
      else if (edgeGap >= 5) lines.push('Your coaching staff outschemed the opponent. Your coordinators gave your players clear advantages at the line of scrimmage.');
    }
  }

  if (a.halftime && a.halftime.applied) lines.push('Your halftime adjustment (' + (a.halftime.label || 'unknown') + ') was applied in the second half.');

  return lines;
}

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
  React.createElement('div', { style: { display: 'flex', gap: 0, fontSize: 12, marginTop: 2 } },
    React.createElement('div', { style: { width: 40, color: T.text, fontWeight: 700 } }, props.homeAbbr || 'HOME'),
    qtrs.h.map(function(v, i) {
      return React.createElement('div', { key: i, style: { flex: 1, textAlign: 'center', color: T.text } }, v);
    }),
    React.createElement('div', { style: { width: 40, textAlign: 'center', color: T.gold, fontWeight: 800 } }, props.homeScore)
  ),
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

function CoachEdgeCard(props) {
  var impact = props.impact, homeAbbr = props.homeAbbr, awayAbbr = props.awayAbbr;
  if (!impact) return null;
  function renderSide(abbr, data, color) {
    if (!data) return null;
    var edgeStr = (data.edge > 0 ? '+' : '') + data.edge;
    var traits = (data.traits || []).map(function(t) { return traitLabel(t.key); });
    return React.createElement('div', { style: { flex: 1 } },
      React.createElement('div', { style: { fontSize: 12, fontWeight: 800, color: color } }, abbr + ' ' + edgeStr),
      traits.length > 0 ? React.createElement('div', { style: { fontSize: 10, color: T.dim, marginTop: 2 } }, traits.join(' \u00B7 ')) : null
    );
  }
  var homeWin = impact.home && impact.away && impact.home.edge > impact.away.edge;
  var awayWin = impact.home && impact.away && impact.away.edge > impact.home.edge;
  return React.createElement('div', { style: { ...S.card, padding: 10, marginTop: 8 } },
    React.createElement('div', { style: { ...S.sectionHead, color: T.gold } }, 'Coaching Edge'),
    React.createElement('div', { style: { display: 'flex', gap: 12 } },
      renderSide(homeAbbr, impact.home, homeWin ? T.green : T.dim),
      renderSide(awayAbbr, impact.away, awayWin ? T.green : T.dim)
    )
  );
}

export default function PostgameAutopsy(props) {
  var data = props.data;
  if (!data || !data.autopsy || !data.autopsy.score) return null;
  var a = data.autopsy;
  var ctx = data.context || {};
  var won = a.won;
  var narrative = buildNarrative(a, ctx);

  return React.createElement('div', { style: S.card },
    React.createElement('div', { style: {
      textAlign: 'center', padding: '12px 0', marginBottom: 12,
      background: won ? 'linear-gradient(135deg, #064e3b, #065f46)' : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
      borderRadius: 8,
    } },
      React.createElement('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: won ? T.green : T.red } }, won ? 'VICTORY' : 'DEFEAT'),
      React.createElement('div', { style: { fontSize: 28, fontWeight: 900, color: T.text, marginTop: 2 } },
        (ctx.homeIcon || '') + ' ' + (ctx.homeTeam || 'HOME') + '  ' + a.score.home + ' \u2013 ' + a.score.away + '  ' + (ctx.awayIcon || '') + ' ' + (ctx.awayTeam || 'AWAY')
      ),
      ctx.homeRecord || ctx.awayRecord ? React.createElement('div', { style: { fontSize: 10, color: T.dim, marginTop: 2 } },
        (ctx.homeTeam || '') + ' (' + (ctx.homeRecord || '') + ')  vs  ' + (ctx.awayTeam || '') + ' (' + (ctx.awayRecord || '') + ')'
      ) : null,
      a.overtime ? React.createElement('div', { style: { fontSize: 10, color: T.gold, fontWeight: 700, marginTop: 2 } }, 'OVERTIME') : null,
      a.weather ? React.createElement('div', { style: { fontSize: 10, color: T.dim, marginTop: 4 } },
        (a.weather.temp || '72') + '\u00B0F \u00B7 ' + (a.weather.precip || 'Clear') + (a.weather.wind ? ' \u00B7 Wind ' + a.weather.wind + ' mph' : '')
      ) : null
    ),

    narrative.length > 0 ? React.createElement('div', { style: { ...S.card, padding: 12, borderLeft: '3px solid ' + (won ? T.green : T.red) } },
      React.createElement('div', { style: { ...S.sectionHead, color: won ? T.green : T.red } }, won ? 'Why You Won' : 'Why You Lost'),
      narrative.map(function(line, i) {
        return React.createElement('div', { key: i, style: { fontSize: 12, color: T.text, lineHeight: '1.5', marginBottom: i < narrative.length - 1 ? 6 : 0 } }, line);
      })
    ) : null,

    a.quarters ? React.createElement('div', { style: { marginBottom: 10 } },
      QuarterBar({ qtrs: a.quarters, homeAbbr: ctx.homeTeam, awayAbbr: ctx.awayTeam, homeScore: a.score.home, awayScore: a.score.away })
    ) : null,

    a.box ? React.createElement('div', { style: { ...S.card, padding: 10 } },
      React.createElement('div', { style: { ...S.sectionHead, color: T.cyan } }, 'Box Score'),
      StatCompare({ label: 'Pass Yds', home: a.box.home ? a.box.home.passYds : 0, away: a.box.away ? a.box.away.passYds : 0 }),
      StatCompare({ label: 'Pass TD', home: a.box.home ? a.box.home.passTD : 0, away: a.box.away ? a.box.away.passTD : 0 }),
      StatCompare({ label: 'INT', home: a.box.home ? a.box.home.int : 0, away: a.box.away ? a.box.away.int : 0 }),
      StatCompare({ label: 'Rush Yds', home: a.box.home ? a.box.home.rushYds : 0, away: a.box.away ? a.box.away.rushYds : 0 }),
      StatCompare({ label: 'Rush TD', home: a.box.home ? a.box.home.rushTD : 0, away: a.box.away ? a.box.away.rushTD : 0 }),
      StatCompare({ label: 'Sacks', home: a.box.home ? a.box.home.sacks : 0, away: a.box.away ? a.box.away.sacks : 0 }),
      StatCompare({ label: 'Penalties', home: a.box.home ? a.box.home.penalties : 0, away: a.box.away ? a.box.away.penalties : 0 }),
      StatCompare({ label: '3rd Down', home: a.box.home ? a.box.home.thirdConv + '/' + a.box.home.thirdDown : '\u2013', away: a.box.away ? a.box.away.thirdConv + '/' + a.box.away.thirdDown : '\u2013' }),
      StatCompare({ label: 'TOP', home: a.box.home ? a.box.home.TOP + ':00' : '\u2013', away: a.box.away ? a.box.away.TOP + ':00' : '\u2013' })
    ) : null,

    a.leaders ? React.createElement('div', { style: { display: 'flex', gap: 12, marginTop: 8 } },
      LeaderCard({ side: ctx.homeTeam || 'HOME', leaders: a.leaders.home, color: T.cyan }),
      LeaderCard({ side: ctx.awayTeam || 'AWAY', leaders: a.leaders.away, color: T.dim })
    ) : null,

    CoachEdgeCard({ impact: a.coachImpact, homeAbbr: ctx.homeTeam || 'HOME', awayAbbr: ctx.awayTeam || 'AWAY' }),

    a.keyPlays && a.keyPlays.length > 0 ? React.createElement('div', { style: { ...S.card, padding: 10, marginTop: 8 } },
      React.createElement('div', { style: { ...S.sectionHead, color: T.yellow } }, 'Key Plays'),
      a.keyPlays.map(function(play, i) {
        return React.createElement('div', { key: i, style: { fontSize: 11, color: T.text, padding: '3px 0', borderBottom: i < a.keyPlays.length - 1 ? '1px solid ' + T.border : 'none' } }, play);
      })
    ) : null
  );
}
