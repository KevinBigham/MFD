/**
 * Export Engine — MFD Shareable Artifacts System
 *
 * Generates text-based shareable content from game state.
 * All artifacts include game URL and seed for viral sharing.
 */

var GAME_URL = 'kevinbigham.github.io/mr-football-dynasty';

/**
 * Generate a Dynasty Card — text summary of an entire dynasty.
 */
export function buildDynastyCard(my, history, season, seed, teams) {
  if (!my || !history) return '';
  season = season || {};
  var wins = 0, losses = 0;
  var titleYears = [];
  history.forEach(function (h) {
    var rec = h.teamRecords ? h.teamRecords.find(function (r) { return r.id === my.id; }) : null;
    if (rec) { wins += (rec.wins || 0); losses += (rec.losses || 0); }
    if (h.winnerId === my.id || h.champId === my.id) titleYears.push(h.year);
  });
  var pct = (wins + losses) > 0 ? (wins / (wins + losses)).toFixed(3) : '.000';
  var tier = titleYears.length >= 5 ? 'GOAT' : titleYears.length >= 3 ? 'LEGENDARY' : titleYears.length >= 1 ? 'CHAMPION' : wins > losses ? 'CONTENDER' : 'REBUILDING';
  var seasonNum = history.length;
  var bestPlayer = null;
  if (my.roster) {
    var sorted = my.roster.slice().sort(function (a, b) { return (b.ovr || 0) - (a.ovr || 0); });
    if (sorted[0]) bestPlayer = sorted[0];
  }

  var w = 42;
  function pad(s) { return (s + '').length >= w - 4 ? (s + '').substring(0, w - 4) : s + ' '.repeat(w - 4 - (s + '').length); }

  var lines = [
    '\u2554' + '\u2550'.repeat(w) + '\u2557',
    '\u2551  ' + pad((my.icon || '') + ' ' + (my.city || '') + ' ' + my.name) + '  \u2551',
    '\u2560' + '\u2550'.repeat(w) + '\u2563',
    '\u2551  ' + pad('RECORD: ' + wins + '-' + losses + ' (' + pct + ')') + '  \u2551',
    '\u2551  ' + pad('TITLES: ' + titleYears.length + (titleYears.length > 0 ? ' (' + titleYears.join(', ') + ')' : '')) + '  \u2551',
    '\u2551  ' + pad('LEGACY TIER: ' + tier) + '  \u2551',
    '\u2551  ' + pad('SEASONS: ' + seasonNum) + '  \u2551',
  ];

  if (bestPlayer) {
    lines.push('\u2551' + ' '.repeat(w) + '\u2551');
    lines.push('\u2551  ' + pad('FRANCHISE PLAYER: ' + bestPlayer.pos + ' ' + bestPlayer.name) + '  \u2551');
    lines.push('\u2551  ' + pad(bestPlayer.ovr + ' OVR' + (bestPlayer.devTrait === 'superstar' ? ' [SUPERSTAR]' : bestPlayer.devTrait === 'star' ? ' [STAR]' : '')) + '  \u2551');
  }

  lines.push('\u2551' + ' '.repeat(w) + '\u2551');
  lines.push('\u2551  ' + pad('SEED: ' + (seed || '?') + '  |  SEASON ' + (season.year || '?')) + '  \u2551');
  lines.push('\u2551' + ' '.repeat(w) + '\u2551');
  lines.push('\u2551  ' + pad('MR. FOOTBALL DYNASTY') + '  \u2551');
  lines.push('\u2551  ' + pad(GAME_URL) + '  \u2551');
  lines.push('\u255A' + '\u2550'.repeat(w) + '\u255D');

  return lines.join('\n');
}

/**
 * Generate a Draft Pick Ticker — one-line shareable text.
 */
export function buildDraftTicker(pick, seed) {
  if (!pick) return '';
  var traits = [];
  if (pick.devTrait === 'superstar') traits.push('Superstar');
  if (pick.devTrait === 'star') traits.push('Star');
  if (pick.trait) traits.push(pick.trait);
  var traitStr = traits.length > 0 ? ' | Traits: ' + traits.join(', ') : '';
  var college = pick.college ? ', ' + pick.college : '';

  return 'RD' + (pick.round || '?') + ' PK' + (pick.pickNum || '?') + ' | ' +
    (pick.teamIcon || '') + ' ' + (pick.teamName || '') + ' selects ' +
    pick.pos + ' ' + pick.name + college +
    ' | ' + (pick.ovr || '?') + ' OVR' + traitStr +
    (pick.analystQuote ? ' | MFSN: "' + pick.analystQuote + '"' : '') +
    ' | MFD Seed: ' + (seed || '?');
}

/**
 * Generate MFSN Front Page Recap — season or dynasty summary.
 */
export function buildMFSNRecap(my, season, history, awards, sched) {
  if (!my || !season) return '';

  var wins = my.wins || 0, losses = my.losses || 0;
  var isChamp = history && history.length > 0 && (history[history.length - 1].winnerId === my.id || history[history.length - 1].champId === my.id);
  var titleCount = history ? history.filter(function (h) { return h.winnerId === my.id || h.champId === my.id; }).length : 0;
  var tier = titleCount >= 5 ? 'GOAT' : titleCount >= 3 ? 'LEGENDARY' : titleCount >= 1 ? 'CHAMPION' : 'CONTENDER';

  var headline = isChamp ? (my.name.toUpperCase() + ' WIN THE CHAMPIONSHIP!') : (my.name.toUpperCase() + ' FINISH ' + wins + '-' + losses);

  var bar = '\u2550'.repeat(46);
  var lines = [
    bar,
    '        M F S N   F R O N T   P A G E',
    '              SEASON ' + season.year + ' RECAP',
    bar,
    '',
    'HEADLINE: "' + headline + '"',
    '',
    (isChamp ? 'CHAMPION' : 'FINAL RECORD') + ': ' + (my.icon || '') + ' ' + (my.city || '') + ' ' + my.name + ' (' + wins + '-' + losses + ')',
  ];

  if (awards && awards.mvp) {
    lines.push('MVP: ' + awards.mvp.name + ' (' + awards.mvp.pos + ')');
  }

  lines.push('');
  lines.push('DYNASTY PULSE:');
  lines.push('Titles: ' + titleCount + ' | Legacy: ' + tier + ' | Season: ' + history.length);
  lines.push('');
  lines.push(bar);
  lines.push('        ' + GAME_URL);
  lines.push(bar);

  return lines.join('\n');
}

/**
 * Copy text to clipboard.
 */
export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
  }
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(true);
  } catch (_e) {
    return Promise.resolve(false);
  }
}

export var EXPORT_ENGINE = {
  dynastyCard: buildDynastyCard,
  draftTicker: buildDraftTicker,
  mfsnRecap: buildMFSNRecap,
  copyToClipboard: copyToClipboard,
};
