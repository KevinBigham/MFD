/**
 * MondayBriefing — MFD Weekly Command Center
 *
 * A single-screen terminal-style dashboard anchoring every week/session.
 * Replaces "staring at 40 tabs" with a focused, data-driven briefing.
 *
 * Props:
 *   teams          — Team[] full league
 *   myId           — string, player's team ID
 *   season         — { year, week, phase }
 *   sched          — Game[] schedule
 *   newsTicker78   — NewsItem[] MFSN headlines
 *   ownerPatience  — number 0-100
 *   pracFocus      — string current practice focus
 *   inbox          — NewsItem[] or count of unread items
 *   holdoutStages  — {} holdout stage map
 *   rivalries      — computed rival info
 *   onDismiss      — callback to close briefing and enter full terminal
 *   onSetTab       — function(tabName) to jump to a specific tab
 *   onAdvance      — function to advance to game
 */
import React from 'react';
import { T, S, SP, RAD, SH } from '../config/theme.js';

var MONO = "'JetBrains Mono','Fira Code','Courier New',monospace";

function mS() {
  var r = {};
  for (var i = 0; i < arguments.length; i++) {
    var o = arguments[i];
    if (o) for (var k in o) r[k] = o[k];
  }
  return r;
}

function getMoodLabel(mood) {
  if (mood >= 80) return { text: 'PLEASED', color: T.green };
  if (mood >= 60) return { text: 'NEUTRAL', color: T.gold };
  if (mood >= 40) return { text: 'CONCERNED', color: T.orange || '#e07a10' };
  return { text: 'HOSTILE', color: T.red };
}

function getPhaseLabel(season) {
  if (!season) return 'PRESEASON';
  var p = season.phase;
  if (p === 'regular') return 'WEEK ' + season.week;
  if (p === 'playoffs') return 'PLAYOFFS';
  if (p === 'offseason' || p === 'fa' || p === 'draft' || p === 'combine' || p === 'reSign') return 'OFFSEASON';
  if (p === 'seasonRecap') return 'YEAR IN REVIEW';
  return (p || 'REGULAR').toUpperCase();
}

export default function MondayBriefing(props) {
  var teams = props.teams || [];
  var myId = props.myId;
  var season = props.season || {};
  var sched = props.sched || [];
  var newsTicker = props.newsTicker78 || [];
  var ownerMood = props.ownerPatience != null ? props.ownerPatience : 70;
  var pracFocus = props.pracFocus || 'scout';
  var holdoutStages = props.holdoutStages || {};
  var onDismiss = props.onDismiss;
  var onSetTab = props.onSetTab;
  var onAdvance = props.onAdvance;

  var my = teams.find(function(t) { return t.id === myId; });
  if (!my) return null;

  var record = (my.wins || 0) + '-' + (my.losses || 0);
  var capSpace = typeof my.cap === 'number' ? my.cap : 0;

  // --- MATCHUP ---
  var nextGame = null;
  var opp = null;
  var isHome = false;
  var rivalObj = null;
  if (season.phase === 'regular' || season.phase === 'playoffs') {
    nextGame = sched.find(function(g) {
      return !g.played && g.week === season.week && (g.home === myId || g.away === myId);
    });
    if (nextGame) {
      isHome = nextGame.home === myId;
      opp = teams.find(function(t) { return t.id === (isHome ? nextGame.away : nextGame.home); });
    }
    if (opp && my.rivals) {
      for (var ri = 0; ri < (my.rivals || []).length; ri++) {
        if (my.rivals[ri] && my.rivals[ri].teamId === opp.id && my.rivals[ri].heat >= 30) {
          rivalObj = my.rivals[ri];
          break;
        }
      }
    }
  }

  // --- STANDINGS (division peers) ---
  var divTeams = teams.filter(function(t) { return t.div === my.div; })
    .sort(function(a, b) { return (b.wins || 0) - (a.wins || 0); });

  // --- AGENDA ITEMS ---
  var agenda = [];

  // Practice focus
  if (season.phase === 'regular' && pracFocus === 'scout') {
    agenda.push({ icon: '🏋️', text: 'Set Practice Focus', tab: 'home', priority: 2 });
  }

  // Holdouts
  var holdoutKeys = Object.keys(holdoutStages);
  if (holdoutKeys.length > 0) {
    var holdoutPlayer = null;
    if (my.roster) {
      holdoutPlayer = my.roster.find(function(p) { return holdoutStages[p.id]; });
    }
    agenda.push({
      icon: '💰',
      text: 'Holdout: ' + (holdoutPlayer ? holdoutPlayer.name : holdoutKeys.length + ' pending'),
      tab: 'roster',
      priority: 1
    });
  }

  // Owner pressure
  if (ownerMood < 40) {
    agenda.push({ icon: '⚠️', text: 'Owner demands attention (mood: ' + ownerMood + ')', tab: 'home', priority: 1 });
  }

  // Injuries (significant)
  var injuredStarters = (my.roster || []).filter(function(p) {
    return p.isStarter && p.injury && p.injury !== 'none' && p.injury !== '';
  });
  if (injuredStarters.length > 0) {
    agenda.push({
      icon: '🏥',
      text: injuredStarters.length + ' starter' + (injuredStarters.length > 1 ? 's' : '') + ' injured',
      tab: 'roster',
      priority: 2
    });
  }

  // Roster size
  var rosterSize = (my.roster || []).length;
  if (rosterSize > 53) {
    agenda.push({ icon: '🚨', text: 'Roster over limit: ' + rosterSize + '/53', tab: 'roster', priority: 0 });
  }

  // Default if no agenda items
  if (agenda.length === 0) {
    agenda.push({ icon: '✅', text: 'All clear — ready for game day', tab: 'home', priority: 9 });
  }

  // Sort by priority (lower = more urgent)
  agenda.sort(function(a, b) { return a.priority - b.priority; });

  // --- MFSN HEADLINES ---
  var headlines = newsTicker.slice(-3).reverse();

  // --- OWNER MOOD ---
  var mood = getMoodLabel(ownerMood);

  // ═══ RENDER ═══
  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.92)',
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter',system-ui,sans-serif",
      padding: 16,
    }
  },
    React.createElement('div', {
      style: {
        maxWidth: 680,
        width: '100%',
        background: T.bg,
        border: '1px solid ' + T.gold + '33',
        borderRadius: RAD.lg,
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(240,160,40,0.08), ' + SH.lg,
      }
    },
      // ═══ HEADER BAR ═══
      React.createElement('div', {
        style: {
          padding: '12px 20px',
          background: 'rgba(240,160,40,0.06)',
          borderBottom: '1px solid ' + T.gold + '22',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }
      },
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: 12 }
        },
          React.createElement('span', {
            style: { fontSize: 11, fontWeight: 900, color: T.gold, letterSpacing: 2, fontFamily: MONO }
          }, 'TERMINAL BRIEFING'),
          React.createElement('span', {
            style: { fontSize: 10, color: T.dim, fontWeight: 600 }
          }, getPhaseLabel(season) + ' • ' + season.year)
        ),
        React.createElement('div', {
          style: { display: 'flex', gap: 16, alignItems: 'center' }
        },
          React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: T.text } },
            record),
          React.createElement('span', { style: { fontSize: 10, color: capSpace >= 10 ? T.green : capSpace >= 0 ? T.gold : T.red, fontWeight: 700 } },
            '$' + capSpace.toFixed(1) + 'M'),
          React.createElement('span', { style: { fontSize: 10, color: mood.color, fontWeight: 700 } },
            'OWNER: ' + mood.text)
        )
      ),

      // ═══ CONTENT GRID ═══
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          background: T.border,
        }
      },
        // ═══ LEFT: MATCHUP + AGENDA ═══
        React.createElement('div', {
          style: { background: T.bg, padding: 20 }
        },
          // MATCHUP
          opp ? React.createElement('div', { style: { marginBottom: 20 } },
            React.createElement('div', {
              style: { fontSize: 9, fontWeight: 800, color: T.dim, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }
            }, 'THIS WEEK\'S MATCHUP'),
            React.createElement('div', {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }
            },
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 16, fontWeight: 900, color: T.text } },
                  (opp.icon || '') + ' ' + (opp.city || '') + ' ' + (opp.name || '')),
                React.createElement('div', { style: { fontSize: 11, color: T.dim } },
                  (opp.wins || 0) + '-' + (opp.losses || 0) + ' • ' + (isHome ? 'HOME' : 'AWAY'))
              )
            ),
            rivalObj ? React.createElement('div', {
              style: mS(S.badge, {
                background: 'rgba(224,60,60,0.15)', color: T.red, fontSize: 9, marginTop: 4
              })
            }, '⚔️ ' + (rivalObj.name || 'RIVALRY GAME') + ' — Heat: ' + (rivalObj.heat || 0)) : null,
            nextGame && nextGame._weather78 ? React.createElement('div', {
              style: { fontSize: 10, color: T.cyan, marginTop: 4 }
            }, '🌤️ ' + (nextGame._weather78.label || nextGame._weather78.type || '')) : null
          ) : (season.phase !== 'regular' && season.phase !== 'playoffs') ? React.createElement('div', {
            style: { marginBottom: 20 }
          },
            React.createElement('div', {
              style: { fontSize: 9, fontWeight: 800, color: T.dim, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }
            }, 'CURRENT PHASE'),
            React.createElement('div', { style: { fontSize: 16, fontWeight: 900, color: T.gold } },
              getPhaseLabel(season))
          ) : null,

          // AGENDA
          React.createElement('div', null,
            React.createElement('div', {
              style: { fontSize: 9, fontWeight: 800, color: T.dim, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }
            }, 'TODAY\'S AGENDA'),
            agenda.slice(0, 5).map(function(item, idx) {
              return React.createElement('div', {
                key: idx,
                onClick: function() { if (onSetTab && item.tab) { onSetTab(item.tab); if (onDismiss) onDismiss(); } },
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  marginBottom: 4,
                  borderRadius: RAD.md,
                  background: item.priority <= 1 ? 'rgba(240,160,40,0.08)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid ' + (item.priority <= 1 ? T.gold + '22' : T.border),
                  cursor: onSetTab ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                  fontSize: 11,
                  color: T.text,
                  fontWeight: item.priority <= 1 ? 700 : 500,
                }
              },
                React.createElement('span', null, item.icon),
                React.createElement('span', { style: { flex: 1 } }, item.text),
                onSetTab ? React.createElement('span', { style: { fontSize: 9, color: T.faint } }, '→') : null
              );
            })
          )
        ),

        // ═══ RIGHT: STANDINGS + HEADLINES ═══
        React.createElement('div', {
          style: { background: T.bg, padding: 20 }
        },
          // DIVISION STANDINGS
          React.createElement('div', { style: { marginBottom: 20 } },
            React.createElement('div', {
              style: { fontSize: 9, fontWeight: 800, color: T.dim, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }
            }, (my.div || 'DIVISION') + ' STANDINGS'),
            divTeams.slice(0, 5).map(function(t, idx) {
              var isMe = t.id === myId;
              return React.createElement('div', {
                key: t.id,
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: RAD.sm,
                  background: isMe ? 'rgba(240,160,40,0.08)' : 'transparent',
                  marginBottom: 2,
                }
              },
                React.createElement('span', {
                  style: { fontSize: 11, fontWeight: isMe ? 800 : 500, color: isMe ? T.gold : T.text }
                }, (idx + 1) + '. ' + (t.icon || '') + ' ' + (t.city || '') + ' ' + (t.name || '')),
                React.createElement('span', {
                  style: { fontSize: 11, color: T.dim, fontWeight: 600, fontFamily: MONO }
                }, (t.wins || 0) + '-' + (t.losses || 0))
              );
            })
          ),

          // MFSN HEADLINES
          headlines.length > 0 ? React.createElement('div', null,
            React.createElement('div', {
              style: { fontSize: 9, fontWeight: 800, color: T.dim, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }
            }, 'MFSN HEADLINES'),
            headlines.slice(0, 3).map(function(item, idx) {
              return React.createElement('div', {
                key: idx,
                style: {
                  fontSize: 10,
                  color: item.type === 'gold' ? T.gold : item.type === 'red' ? T.red : T.dim,
                  marginBottom: 6,
                  lineHeight: 1.4,
                  paddingLeft: 8,
                  borderLeft: '2px solid ' + (item.type === 'gold' ? T.gold + '44' : T.border),
                }
              }, item.text || '');
            })
          ) : null
        )
      ),

      // ═══ BOTTOM ACTION BAR ═══
      React.createElement('div', {
        style: {
          padding: '14px 20px',
          borderTop: '1px solid ' + T.gold + '22',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }
      },
        React.createElement('button', {
          onClick: onDismiss,
          style: mS(S.btn, S.btnGhost, { fontSize: 11, padding: '8px 16px' })
        }, 'OPEN FULL TERMINAL'),
        React.createElement('button', {
          onClick: function() {
            if (onDismiss) onDismiss();
            if (onAdvance) onAdvance();
          },
          style: mS(S.btn, S.btnPrimary, {
            fontSize: 13, fontWeight: 900, padding: '10px 28px', letterSpacing: 1,
            boxShadow: '0 0 20px rgba(240,160,40,0.2)',
          })
        }, season.phase === 'regular' || season.phase === 'playoffs' ? '▶ PLAY WEEK ' + season.week : '▶ CONTINUE')
      ),

      // ═══ SKIP HINT ═══
      React.createElement('div', {
        style: {
          textAlign: 'center',
          padding: '0 0 8px',
          fontSize: 9,
          color: T.faint,
          letterSpacing: 0.5,
        }
      }, 'Press ESC to skip briefing')
    )
  );
}
