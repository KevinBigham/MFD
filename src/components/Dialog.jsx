/**
 * Dialog — MFD adapter wrapping Radix Dialog primitive.
 *
 * Provides accessible modal dialogs with proper focus trapping,
 * ESC to close, and screen-reader announcements.
 *
 * API is compatible with existing Modal.jsx:
 *   isOpen, onClose, closeOnOverlayClick, overlayStyle, contentStyle,
 *   borderColor, zIndex, children
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

export function Dialog(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var closeOnOverlayClick = props.closeOnOverlayClick !== false;

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

  function handleOpenChange(open) {
    if (!open && onClose) onClose();
  }

  return React.createElement(
    RadixDialog.Root,
    { open: isOpen, onOpenChange: handleOpenChange },
    React.createElement(
      RadixDialog.Portal,
      null,
      React.createElement(RadixDialog.Overlay, {
        style: overlayStyle,
        onClick: closeOnOverlayClick
          ? function () { if (onClose) onClose(); }
          : undefined,
      }),
      React.createElement(
        RadixDialog.Content,
        {
          style: mS(overlayStyle, {
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
    )
  );
}
