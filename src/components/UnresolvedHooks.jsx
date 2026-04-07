/**
 * UnresolvedHooks — "Coming Attractions" Screen
 *
 * Shows 3 narrative hooks between weeks to create "one more turn" tension.
 * Bloomberg Terminal aesthetic — ASCII borders, amber on black.
 *
 * Props:
 *   visible     — boolean
 *   hooks       — array of { icon, text, cat } from hooks-engine
 *   onContinue  — callback for "PLAY NEXT WEEK"
 *   onExit      — callback for "SAVE & EXIT"
 */
import React from 'react';
import { T, RAD } from '../config/theme.js';

var MONO = "'JetBrains Mono','Fira Code','Courier New',monospace";
var BAR = '════════════════════════════════════════';

export default function UnresolvedHooks(props) {
  var visible = props.visible;
  var hooks = props.hooks || [];
  var onContinue = props.onContinue;
  var onExit = props.onExit;

  if (!visible || hooks.length === 0) return null;

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.95)',
      zIndex: 99980,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: MONO,
      padding: 40,
    }
  },
    React.createElement('div', {
      style: {
        maxWidth: 480,
        width: '100%',
        border: '1px solid rgba(240,160,40,0.3)',
        background: 'rgba(240,160,40,0.03)',
        padding: '24px 28px',
      }
    },
      // Top border
      React.createElement('div', {
        style: { color: T.gold, fontSize: 10, letterSpacing: 2, textAlign: 'center', marginBottom: 12 }
      }, BAR),

      // Title
      React.createElement('div', {
        style: {
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 900,
          color: T.gold,
          letterSpacing: 4,
          marginBottom: 4,
        }
      }, 'COMING ATTRACTIONS'),

      // Divider
      React.createElement('div', {
        style: { color: T.gold, fontSize: 10, letterSpacing: 2, textAlign: 'center', marginTop: 8, marginBottom: 20 }
      }, BAR),

      // Hooks
      hooks.map(function (hook, idx) {
        return React.createElement('div', {
          key: idx,
          style: {
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: idx < hooks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }
        },
          React.createElement('div', {
            style: { fontSize: 12, color: T.gold, flexShrink: 0, marginTop: 1 }
          }, '>>'),
          React.createElement('div', {
            style: { fontSize: 12, color: T.text, lineHeight: 1.5, letterSpacing: 0.3 }
          }, (hook.icon || '') + ' ' + hook.text)
        );
      }),

      // Bottom border
      React.createElement('div', {
        style: { color: T.gold, fontSize: 10, letterSpacing: 2, textAlign: 'center', marginTop: 8, marginBottom: 16 }
      }, BAR),

      // Buttons
      React.createElement('div', {
        style: { display: 'flex', gap: 12, justifyContent: 'center' }
      },
        // PLAY NEXT WEEK — dominant
        React.createElement('button', {
          onClick: onContinue,
          style: {
            flex: 2,
            padding: '14px 24px',
            background: T.gold,
            color: '#000',
            border: 'none',
            borderRadius: RAD.md,
            fontSize: 13,
            fontWeight: 900,
            cursor: 'pointer',
            fontFamily: MONO,
            letterSpacing: 1,
          }
        }, 'PLAY NEXT WEEK'),

        // SAVE & EXIT — subdued
        React.createElement('button', {
          onClick: onExit,
          style: {
            flex: 1,
            padding: '14px 16px',
            background: 'transparent',
            color: T.faint,
            border: '1px solid ' + T.border,
            borderRadius: RAD.md,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: MONO,
            letterSpacing: 0.5,
          }
        }, 'SAVE & EXIT')
      )
    )
  );
}
