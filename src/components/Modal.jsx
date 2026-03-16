import React from 'react';

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
};

export function Modal(props) {
  if (!props.isOpen) return null;

  function handleOverlayClick() {
    if (props.closeOnOverlayClick === false) return;
    if (props.onClose) props.onClose();
  }

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

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={contentStyle} onClick={function (e) { e.stopPropagation(); }}>
        {props.children}
      </div>
    </div>
  );
}
