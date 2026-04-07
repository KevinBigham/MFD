/**
 * WeekAdvanceChecklist — Preflight Safety Check
 *
 * Shows unresolved items before advancing week.
 * Non-blocking — "ADVANCE ANYWAY" always available.
 *
 * Props:
 *   visible   — boolean
 *   items     — array of { icon, text, severity, tab }
 *   onAdvance — callback for "ADVANCE ANYWAY"
 *   onGoBack  — callback for "GO BACK"
 *   onJump    — callback(tab) for jumping to fix
 */
import React from 'react';
import { T, RAD } from '../config/theme.js';

var MONO = "'JetBrains Mono','Fira Code','Courier New',monospace";

export default function WeekAdvanceChecklist(props) {
  var visible = props.visible;
  var items = props.items || [];
  var onAdvance = props.onAdvance;
  var onGoBack = props.onGoBack;
  var onJump = props.onJump;

  if (!visible || items.length === 0) return null;

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 99970,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: MONO,
      padding: 20,
    }
  },
    React.createElement('div', {
      style: {
        maxWidth: 460,
        width: '100%',
        border: '1px solid rgba(240,160,40,0.3)',
        background: T.bg2,
        padding: '20px 24px',
        borderRadius: RAD.sm,
      }
    },
      // Header
      React.createElement('div', {
        style: { fontSize: 13, fontWeight: 900, color: T.gold, letterSpacing: 2, marginBottom: 16 }
      }, '\u26A0 UNHANDLED EVENTS DETECTED'),

      // Items
      items.map(function (item, idx) {
        var sevColor = item.severity === 'high' ? T.red : item.severity === 'medium' ? T.orange : T.dim;
        return React.createElement('div', {
          key: idx,
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }
        },
          React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', gap: 8 }
          },
            React.createElement('span', { style: { fontSize: 10, color: sevColor } }, '\u25A0'),
            React.createElement('span', { style: { fontSize: 11, color: T.text } }, (item.icon || '') + ' ' + item.text)
          ),
          item.tab ? React.createElement('button', {
            onClick: function () { if (onJump) onJump(item.tab); },
            style: {
              fontSize: 9,
              padding: '3px 10px',
              borderRadius: RAD.sm,
              border: '1px solid ' + sevColor + '44',
              background: sevColor + '12',
              color: sevColor,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: MONO,
            }
          }, item.action || 'FIX') : null
        );
      }),

      // Buttons
      React.createElement('div', {
        style: { display: 'flex', gap: 10, marginTop: 20 }
      },
        React.createElement('button', {
          onClick: onAdvance,
          style: {
            flex: 1,
            padding: '12px',
            background: T.gold,
            color: '#000',
            border: 'none',
            borderRadius: RAD.md,
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: MONO,
            letterSpacing: 0.5,
          }
        }, 'ADVANCE ANYWAY'),
        React.createElement('button', {
          onClick: onGoBack,
          style: {
            flex: 1,
            padding: '12px',
            background: 'transparent',
            color: T.faint,
            border: '1px solid ' + T.border,
            borderRadius: RAD.md,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: MONO,
          }
        }, 'GO BACK')
      )
    )
  );
}

/**
 * Build checklist items from game state.
 * Returns items only if there are unresolved issues.
 */
export function buildChecklist(my, season, inbox, pracFocus) {
  if (!my) return [];
  var items = [];

  // Roster size violation
  var rSize = my.roster ? my.roster.length : 0;
  if (rSize > 53) {
    items.push({ icon: '✂️', text: 'Roster at ' + rSize + '/53 — need to cut ' + (rSize - 53), severity: 'high', tab: 'roster', action: 'FIX' });
  }

  // Active holdouts
  var holdouts = (inbox || []).filter(function (it) { return it.actionType === 'holdout'; });
  if (holdouts.length > 0) {
    items.push({ icon: '😤', text: holdouts.length + ' holdout' + (holdouts.length > 1 ? 's' : '') + ' unresolved', severity: 'high', tab: null, action: 'VIEW' });
  }

  // Practice focus not set (only if truly null/undefined, not 'balanced' default)
  if (!pracFocus) {
    items.push({ icon: '📋', text: 'Practice focus not set this week', severity: 'low', tab: 'training', action: 'SET NOW' });
  }

  // Pending trade offers
  var trades = (inbox || []).filter(function (it) { return it.actionType === 'aiTrade'; });
  if (trades.length > 0) {
    items.push({ icon: '📞', text: trades.length + ' pending trade offer' + (trades.length > 1 ? 's' : ''), severity: 'medium', tab: null, action: 'VIEW' });
  }

  // Injured starters
  var injStarters = (my.roster || []).filter(function (p) { return p.isStarter && p.injury && p.injury.games > 0; });
  if (injStarters.length >= 3) {
    items.push({ icon: '🏥', text: injStarters.length + ' injured starters — check depth chart', severity: 'medium', tab: 'depth', action: 'CHECK' });
  }

  return items;
}
