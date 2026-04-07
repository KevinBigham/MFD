/**
 * Spotlight — Command palette overlay for quick navigation.
 *
 * Props:
 *   isOpen          {boolean}   Whether overlay is visible
 *   onClose         {function}  Close callback
 *   teams           {array}     Array of team objects with .roster[], .name, .city, .abbr
 *   setTab          {function}  Navigate to a screen tab
 *   setPlayerDetail {function}  Open a player card
 *   simWeek         {function}  Advance simulation one week
 *   doSave          {function}  Save the game
 */
import React, { useState, useRef, useEffect } from 'react';
import { T, FONT, SP, RAD } from '../config/theme.js';

var SCREENS = [
  { key: 'roster', label: 'Roster' },
  { key: 'depth', label: 'Depth Chart' },
  { key: 'trade', label: 'Trade Center' },
  { key: 'fa', label: 'Free Agents' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'standings', label: 'Standings' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'draft', label: 'Draft Board' },
  { key: 'settings', label: 'Settings' },
  { key: 'franchise', label: 'Franchise' }
];

var ACTIONS = [
  { label: 'Sim Week', action: 'sim' },
  { label: 'Save Game', action: 'save' }
];

function ovrColor(v) {
  return v >= 95 ? T.cyan : v >= 80 ? T.green : v >= 60 ? T.gold : T.red;
}

export function Spotlight(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var teams = props.teams || [];
  var setTab = props.setTab;
  var setPlayerDetail = props.setPlayerDetail;
  var simWeek = props.simWeek;
  var doSave = props.doSave;

  // Early return before hooks
  if (!isOpen) return null;

  var _q = useState('');
  var query = _q[0];
  var setQuery = _q[1];

  var _s = useState(0);
  var selectedIndex = _s[0];
  var setSelectedIndex = _s[1];

  var inputRef = useRef(null);

  // Auto-focus input when opened
  useEffect(function() {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Build filtered results
  var q = query.toLowerCase().trim();

  var playerResults = [];
  var teamResults = [];
  var screenResults = [];
  var actionResults = [];

  if (q) {
    // Players
    for (var ti = 0; ti < teams.length && playerResults.length < 5; ti++) {
      var team = teams[ti];
      var roster = team.roster || [];
      for (var pi = 0; pi < roster.length && playerResults.length < 5; pi++) {
        var p = roster[pi];
        if (p.name && p.name.toLowerCase().indexOf(q) !== -1) {
          playerResults.push({ type: 'player', player: p, team: team });
        }
      }
    }
    // Teams
    for (var tii = 0; tii < teams.length && teamResults.length < 5; tii++) {
      var tm = teams[tii];
      var haystack = ((tm.name || '') + ' ' + (tm.city || '') + ' ' + (tm.abbr || '')).toLowerCase();
      if (haystack.indexOf(q) !== -1) {
        teamResults.push({ type: 'team', team: tm });
      }
    }
    // Screens
    for (var si = 0; si < SCREENS.length && screenResults.length < 5; si++) {
      if (SCREENS[si].label.toLowerCase().indexOf(q) !== -1) {
        screenResults.push({ type: 'screen', screen: SCREENS[si] });
      }
    }
    // Actions
    for (var ai = 0; ai < ACTIONS.length && actionResults.length < 5; ai++) {
      if (ACTIONS[ai].label.toLowerCase().indexOf(q) !== -1) {
        actionResults.push({ type: 'action', action: ACTIONS[ai] });
      }
    }
  } else {
    // No query — show screens and actions as defaults
    for (var sj = 0; sj < SCREENS.length; sj++) {
      screenResults.push({ type: 'screen', screen: SCREENS[sj] });
    }
    for (var aj = 0; aj < ACTIONS.length; aj++) {
      actionResults.push({ type: 'action', action: ACTIONS[aj] });
    }
  }

  var allResults = [].concat(playerResults, teamResults, screenResults, actionResults);
  var totalResults = allResults.length;

  function executeResult(item) {
    if (!item) return;
    if (item.type === 'player' && setPlayerDetail) {
      setPlayerDetail(item.player);
      onClose();
    } else if (item.type === 'team' && setTab) {
      setTab('standings');
      onClose();
    } else if (item.type === 'screen' && setTab) {
      setTab(item.screen.key);
      onClose();
    } else if (item.type === 'action') {
      if (item.action.action === 'sim' && simWeek) simWeek();
      if (item.action.action === 'save' && doSave) doSave();
      onClose();
    }
  }

  // Keyboard handler
  useEffect(function() {
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(function(prev) { return prev < totalResults - 1 ? prev + 1 : 0; });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(function(prev) { return prev > 0 ? prev - 1 : totalResults - 1; });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeResult(allResults[selectedIndex]);
      }
    }
    document.addEventListener('keydown', handleKey);
    return function() { document.removeEventListener('keydown', handleKey); };
  });

  // Reset selection when query changes
  useEffect(function() {
    setSelectedIndex(0);
  }, [query]);

  var catHeaderStyle = {
    fontSize: 9,
    color: T.faint,
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: '4px 12px',
    fontFamily: FONT.body
  };

  var rowBase = {
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  };

  function rowStyle(idx) {
    return Object.assign({}, rowBase, {
      background: idx === selectedIndex ? T.goldDim : 'transparent'
    });
  }

  // Build sections
  var sections = [];
  var flatIdx = 0;

  if (playerResults.length > 0) {
    var playerRows = [];
    for (var pri = 0; pri < playerResults.length; pri++) {
      var pr = playerResults[pri];
      var idx = flatIdx++;
      playerRows.push(
        React.createElement("div", {
          key: 'p-' + pri,
          style: rowStyle(idx),
          onClick: (function(item) { return function() { executeResult(item); }; })(pr),
          onMouseEnter: (function(i) { return function() { setSelectedIndex(i); }; })(idx)
        },
          React.createElement("span", {
            style: { fontFamily: FONT.body, fontWeight: 700, color: T.text }
          }, pr.player.name),
          React.createElement("span", {
            style: { fontFamily: FONT.mono, fontSize: 11, color: T.dim }
          }, pr.player.pos),
          React.createElement("span", {
            style: { fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: ovrColor(pr.player.ovr || 0) }
          }, pr.player.ovr),
          React.createElement("span", {
            style: { fontFamily: FONT.mono, fontSize: 10, color: T.faint, marginLeft: 'auto' }
          }, pr.team.abbr)
        )
      );
    }
    sections.push(
      React.createElement("div", { key: 'sec-players' },
        React.createElement("div", { style: catHeaderStyle }, 'PLAYERS'),
        playerRows
      )
    );
  }

  if (teamResults.length > 0) {
    var teamRows = [];
    for (var tri = 0; tri < teamResults.length; tri++) {
      var tr = teamResults[tri];
      var tidx = flatIdx++;
      teamRows.push(
        React.createElement("div", {
          key: 't-' + tri,
          style: rowStyle(tidx),
          onClick: (function(item) { return function() { executeResult(item); }; })(tr),
          onMouseEnter: (function(i) { return function() { setSelectedIndex(i); }; })(tidx)
        },
          React.createElement("span", {
            style: { fontFamily: FONT.body, fontWeight: 700, color: T.text }
          }, (tr.team.city || '') + ' ' + (tr.team.name || '')),
          tr.team.wins != null ? React.createElement("span", {
            style: { fontFamily: FONT.mono, fontSize: 11, color: T.dim, marginLeft: 'auto' }
          }, (tr.team.wins || 0) + '-' + (tr.team.losses || 0)) : null
        )
      );
    }
    sections.push(
      React.createElement("div", { key: 'sec-teams' },
        React.createElement("div", { style: catHeaderStyle }, 'TEAMS'),
        teamRows
      )
    );
  }

  if (screenResults.length > 0) {
    var screenRows = [];
    for (var sri = 0; sri < screenResults.length; sri++) {
      var sr = screenResults[sri];
      var sidx = flatIdx++;
      screenRows.push(
        React.createElement("div", {
          key: 's-' + sri,
          style: rowStyle(sidx),
          onClick: (function(item) { return function() { executeResult(item); }; })(sr),
          onMouseEnter: (function(i) { return function() { setSelectedIndex(i); }; })(sidx)
        },
          React.createElement("span", {
            style: { fontFamily: FONT.body, color: T.text }
          }, sr.screen.label)
        )
      );
    }
    sections.push(
      React.createElement("div", { key: 'sec-screens' },
        React.createElement("div", { style: catHeaderStyle }, 'SCREENS'),
        screenRows
      )
    );
  }

  if (actionResults.length > 0) {
    var actionRows = [];
    for (var ari = 0; ari < actionResults.length; ari++) {
      var ar = actionResults[ari];
      var aidx = flatIdx++;
      actionRows.push(
        React.createElement("div", {
          key: 'a-' + ari,
          style: rowStyle(aidx),
          onClick: (function(item) { return function() { executeResult(item); }; })(ar),
          onMouseEnter: (function(i) { return function() { setSelectedIndex(i); }; })(aidx)
        },
          React.createElement("span", {
            style: { fontFamily: FONT.body, fontWeight: 700, color: T.gold }
          }, ar.action.label)
        )
      );
    }
    sections.push(
      React.createElement("div", { key: 'sec-actions' },
        React.createElement("div", { style: catHeaderStyle }, 'ACTIONS'),
        actionRows
      )
    );
  }

  return React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9600,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: 120
    },
    onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
  },
    React.createElement("div", {
      style: {
        width: '100%',
        maxWidth: 480,
        background: T.bg2,
        border: '1px solid ' + T.border,
        borderTop: '2px solid ' + T.gold,
        borderRadius: RAD.md,
        overflow: 'hidden'
      }
    },
      // Input
      React.createElement("input", {
        ref: inputRef,
        type: 'text',
        value: query,
        onChange: function(e) { setQuery(e.target.value); },
        placeholder: 'Search players, teams, screens...',
        style: {
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: FONT.mono,
          background: T.bg,
          border: 'none',
          borderBottom: '1px solid ' + T.border,
          padding: '10px 14px',
          fontSize: 14,
          color: T.text,
          outline: 'none'
        }
      }),
      // Results
      React.createElement("div", {
        style: {
          maxHeight: 360,
          overflowY: 'auto',
          paddingTop: SP.xs,
          paddingBottom: SP.xs
        }
      }, sections.length > 0 ? sections :
        (q ? React.createElement("div", {
          style: {
            padding: '12px',
            color: T.faint,
            fontFamily: FONT.body,
            fontSize: 12,
            textAlign: 'center'
          }
        }, 'No results found') : null)
      )
    )
  );
}
