/**
 * CeremonyOverlay — MFD Reusable Full-Screen Moment Overlay
 *
 * Base container for all ceremony/event overlays. Handles:
 * - Full-screen fixed positioning with high z-index
 * - Click/keypress dismissal
 * - Optional auto-dismiss timer
 * - Phased reveal (dark → content)
 * - Bloomberg Terminal aesthetic
 *
 * Props:
 *   visible    — boolean, controls visibility
 *   onDismiss  — callback when overlay is dismissed
 *   autoDismiss — ms before auto-dismiss (0 = manual only)
 *   holdTime   — ms before dismissal is allowed (prevents accidental skip)
 *   bgColor    — override background color (default: near-black)
 *   children   — overlay content
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { T } from '../config/theme.js';

var MONO = "'JetBrains Mono','Fira Code','Courier New',monospace";

export default function CeremonyOverlay(props) {
  var visible = props.visible;
  var onDismiss = props.onDismiss;
  var autoDismiss = props.autoDismiss || 0;
  var holdTime = props.holdTime || 800;
  var bgColor = props.bgColor || 'rgba(0,0,0,0.97)';
  var children = props.children;

  var _canDismiss = useState(false);
  var canDismiss = _canDismiss[0];
  var setCanDismiss = _canDismiss[1];

  var _phase = useState('dark');
  var phase = _phase[0];
  var setPhase = _phase[1];

  var timers = useRef([]);

  var dismiss = useCallback(function() {
    if (!canDismiss) return;
    timers.current.forEach(function(t) { clearTimeout(t); });
    timers.current = [];
    if (onDismiss) onDismiss();
  }, [canDismiss, onDismiss]);

  useEffect(function() {
    if (!visible) {
      setPhase('dark');
      setCanDismiss(false);
      return;
    }

    // Phase 1: dark screen
    var t1 = setTimeout(function() {
      setPhase('content');
    }, 300);
    timers.current.push(t1);

    // Allow dismissal after holdTime
    var t2 = setTimeout(function() {
      setCanDismiss(true);
    }, holdTime);
    timers.current.push(t2);

    // Auto-dismiss if configured
    if (autoDismiss > 0) {
      var t3 = setTimeout(function() {
        if (onDismiss) onDismiss();
      }, autoDismiss);
      timers.current.push(t3);
    }

    return function() {
      timers.current.forEach(function(t) { clearTimeout(t); });
      timers.current = [];
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(function() {
    if (!visible) return;
    function onKey() { dismiss(); }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [visible, dismiss]);

  if (!visible) return null;

  return React.createElement('div', {
    onClick: dismiss,
    style: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: bgColor,
      zIndex: 99990,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: canDismiss ? 'pointer' : 'default',
      fontFamily: MONO,
      opacity: phase === 'dark' ? 0 : 1,
      transition: 'opacity 0.4s ease-in',
      padding: 40,
    }
  },
    children,
    canDismiss ? React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: 24,
        fontSize: 10,
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: 1,
        fontFamily: MONO,
      }
    }, 'CLICK OR PRESS ANY KEY TO CONTINUE') : null
  );
}

export { MONO };
