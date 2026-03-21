/**
 * TerminalBoot — MFD Session Start Boot Sequence
 *
 * A 2-3 second Bloomberg-style "BIOS boot" animation that plays
 * when loading or resuming a save. Transitions the player's brain
 * from "browsing the web" to "I am the GM now."
 *
 * Props:
 *   gameState  — { teams, myId, season, seed } or null for new game
 *   isNewGame  — boolean, true if creating a new franchise
 *   onComplete — callback when boot sequence finishes
 */
import React, { useEffect, useRef, useState } from 'react';
import { T, S, SP, RAD } from '../config/theme.js';

var MONO = "'JetBrains Mono','Fira Code','Courier New',monospace";

// Boot lines for loading an existing save
function buildLoadLines(state) {
  var my = null;
  if (state && state.teams && state.myId) {
    my = state.teams.find(function(t) { return t.id === state.myId; });
  }
  var s = state && state.season ? state.season : {};
  var rivalCount = 0;
  if (my && my.rivals) {
    var rivKeys = Object.keys(my.rivals);
    rivalCount = rivKeys.filter(function(k) {
      return my.rivals[k] && my.rivals[k].heat >= 30;
    }).length;
  }
  var capSpace = 0;
  if (my && typeof my.cap === 'number') {
    capSpace = my.cap;
  } else if (my && my.roster) {
    // Rough cap calc from roster salaries
    var totalSal = 0;
    my.roster.forEach(function(p) {
      if (p.salary) totalSal += p.salary;
    });
    capSpace = 225 - totalSal; // rough NFL cap
  }
  var record = (my ? (my.wins || 0) + '-' + (my.losses || 0) : '0-0');
  var week = s.week || 1;
  var year = s.year || 2026;
  var phase = s.phase || 'regular';
  var phaseLabel = phase === 'regular' ? 'WEEK ' + week
    : phase === 'playoffs' ? 'PLAYOFFS'
    : phase === 'offseason' || phase === 'fa' || phase === 'draft' || phase === 'combine' || phase === 'reSign' ? 'OFFSEASON'
    : phase.toUpperCase();

  var lines = [
    { text: 'MFD TERMINAL v986', delay: 0 },
    { text: 'LOADING FRANCHISE DATA...', delay: 200 },
    { text: 'MOUNTING NARRATIVE ENGINE...', delay: 400 },
    { text: 'RESTORING RIVALRIES... [' + rivalCount + ' ACTIVE]', delay: 600 },
    { text: 'CAP SPACE: $' + capSpace.toFixed(1) + 'M', delay: 800 },
    { text: 'RECORD: ' + record + ' (' + phaseLabel + ', ' + year + ')', delay: 1000 },
    { text: '', delay: 1300 },
    { text: 'WELCOME BACK, COACH.', delay: 1400, gold: true },
  ];
  return lines;
}

// Boot lines for a new game
function buildNewGameLines(state) {
  var seed = (state && state.seed) ? state.seed : '??????';
  return [
    { text: 'MFD TERMINAL v986', delay: 0 },
    { text: 'INITIALIZING NEW FRANCHISE...', delay: 200 },
    { text: 'GENERATING UNIVERSE [SEED: ' + seed + ']...', delay: 450 },
    { text: 'SCOUTING DATABASE: 300 PROSPECTS LOADED', delay: 700 },
    { text: 'COACHING STAFF: ASSEMBLED', delay: 900 },
    { text: '', delay: 1200 },
    { text: 'YOUR DYNASTY BEGINS NOW.', delay: 1300, gold: true },
  ];
}

export default function TerminalBoot(props) {
  var gameState = props.gameState;
  var isNewGame = props.isNewGame;
  var onComplete = props.onComplete;

  var lines = isNewGame ? buildNewGameLines(gameState) : buildLoadLines(gameState);
  var totalDuration = lines[lines.length - 1].delay + 1000; // hold final line for 1s

  var _vis = useState(0);
  var visibleCount = _vis[0];
  var setVisibleCount = _vis[1];

  var _done = useState(false);
  var done = _done[0];
  var setDone = _done[1];

  var timers = useRef([]);

  useEffect(function() {
    // Schedule each line reveal
    lines.forEach(function(line, idx) {
      var t = setTimeout(function() {
        setVisibleCount(idx + 1);
      }, line.delay);
      timers.current.push(t);
    });

    // Auto-complete after total duration
    var completeTimer = setTimeout(function() {
      setDone(true);
      if (onComplete) onComplete();
    }, totalDuration);
    timers.current.push(completeTimer);

    return function() {
      timers.current.forEach(function(t) { clearTimeout(t); });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Skip on any keypress or click
  function handleSkip() {
    if (done) return;
    timers.current.forEach(function(t) { clearTimeout(t); });
    setDone(true);
    if (onComplete) onComplete();
  }

  useEffect(function() {
    function onKey(e) { handleSkip(); }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return null;

  var visibleLines = lines.slice(0, visibleCount);

  return React.createElement('div', {
    onClick: handleSkip,
    style: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#000',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      fontFamily: MONO,
      padding: 40,
    }
  },
    React.createElement('div', {
      style: {
        maxWidth: 500,
        width: '100%',
      }
    },
      visibleLines.map(function(line, idx) {
        if (!line.text) {
          return React.createElement('div', { key: idx, style: { height: 16 } });
        }
        return React.createElement('div', {
          key: idx,
          style: {
            fontSize: 13,
            fontWeight: line.gold ? 800 : 500,
            color: line.gold ? T.gold : '#00ff41',
            letterSpacing: line.gold ? 2 : 0.8,
            marginBottom: 6,
            opacity: 1,
            transition: 'opacity 0.15s ease-in',
          }
        }, line.text);
      })
    ),
    React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: 24,
        fontSize: 10,
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: 1,
        fontFamily: MONO,
      }
    }, 'PRESS ANY KEY TO SKIP')
  );
}
