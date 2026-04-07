/**
 * Tooltip — Bloomberg-style positioned tooltip
 *
 * Replaces HTML title= attributes with styled, positioned overlays.
 * Supports hover and keyboard focus activation.
 *
 * Props:
 *   label     — string or React element to display
 *   position  — 'top' | 'bottom' (default 'top')
 *   delay     — ms before showing (default 300)
 *   children  — trigger element (single child)
 *   mono      — boolean, use monospace font (default false)
 */
import React, { useState, useRef, useCallback } from 'react';
import { T, FONT, RAD, SH, SP } from '../config/theme.js';

export function Tooltip(props) {
  var label = props.label;
  var position = props.position || 'top';
  var delay = props.delay != null ? props.delay : 300;
  var mono = props.mono;
  var children = props.children;

  // Early return before hooks for null label — tests call as plain function
  if (!label) return children || null;

  var _vis = useState(false);
  var visible = _vis[0];
  var setVisible = _vis[1];
  var timer = useRef(null);

  var show = useCallback(function() {
    timer.current = setTimeout(function() { setVisible(true); }, delay);
  }, [delay]);

  var hide = useCallback(function() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setVisible(false);
  }, []);

  var tooltipStyle = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 8px',
    background: T.bg3,
    border: '1px solid ' + T.border,
    borderRadius: RAD.sm,
    boxShadow: SH.md,
    color: T.text,
    fontSize: 10,
    fontWeight: 600,
    fontFamily: mono ? FONT.mono : FONT.body,
    letterSpacing: mono ? '0.5px' : '0.2px',
    whiteSpace: 'nowrap',
    zIndex: 200,
    pointerEvents: 'none',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.15s ease',
    maxWidth: 280,
  };

  if (position === 'top') {
    tooltipStyle.bottom = '100%';
    tooltipStyle.marginBottom = 4;
  } else {
    tooltipStyle.top = '100%';
    tooltipStyle.marginTop = 4;
  }

  return React.createElement('span', {
    style: { position: 'relative', display: 'inline-flex', alignItems: 'center' },
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  },
    children,
    React.createElement('span', { style: tooltipStyle }, label)
  );
}
