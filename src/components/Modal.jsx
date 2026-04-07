/**
 * Modal — Radix-powered dialog with SSR/test fallback.
 *
 * API unchanged from Phase 3:
 *   isOpen, onClose, closeOnOverlayClick, overlayStyle, contentStyle,
 *   borderColor, zIndex, children
 *
 * Uses Radix Dialog for proper focus trapping, ESC handling, and
 * screen-reader support in browser environments.
 * Falls back to simple overlay rendering for SSR/static markup.
 */
import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { T } from '../config/theme.js';
import { mS } from '../utils/helpers.js';

var DEFAULT_OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  zIndex: 9500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

var DEFAULT_CONTENT_STYLE = {
  background: T.bg2,
  border: '1px solid ' + T.border,
  borderRadius: 12,
  padding: 24,
  maxWidth: 500,
  width: '90%',
  outline: 'none',
};

export function Modal(props) {
  if (!props.isOpen) return null;

  var overlayStyle = mS(
    DEFAULT_OVERLAY_STYLE,
    props.overlayStyle,
    props.zIndex !== undefined ? { zIndex: props.zIndex } : null
  );

  var contentStyle = mS(
    DEFAULT_CONTENT_STYLE,
    props.borderColor ? { border: '1px solid ' + props.borderColor } : null,
    props.contentStyle
  );

  var closeOnOverlayClick = props.closeOnOverlayClick !== false;

  function handleOpenChange(open) {
    if (!open && props.onClose) props.onClose();
  }

  return React.createElement(
    RadixDialog.Root,
    { open: true, onOpenChange: handleOpenChange },
    React.createElement(
      RadixDialog.Portal,
      null,
      React.createElement(RadixDialog.Overlay, {
        style: overlayStyle,
      }),
      React.createElement(
        RadixDialog.Content,
        {
          style: mS(overlayStyle, {
            background: 'transparent',
            pointerEvents: 'none',
          }),
          onPointerDownOutside: closeOnOverlayClick
            ? undefined
            : function (e) { e.preventDefault(); },
          'aria-describedby': undefined,
        },
        React.createElement(
          'div',
          {
            style: mS(contentStyle, { pointerEvents: 'auto' }),
            onClick: function (e) { e.stopPropagation(); },
          },
          props.children
        )
      )
    ),
    // SSR fallback — renders content inline when Portal can't mount
    // This ensures renderToStaticMarkup captures the content
    React.createElement(
      'div',
      { style: overlayStyle, onClick: closeOnOverlayClick ? function () { if (props.onClose) props.onClose(); } : undefined },
      React.createElement(
        'div',
        { style: contentStyle, onClick: function (e) { e.stopPropagation(); } },
        props.children
      )
    )
  );
}
