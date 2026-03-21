import React from 'react';
import { T, FONT, RAD } from '../config/theme.js';

var spinKeyframes = '@keyframes mfd-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';

var baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: 'none',
  borderRadius: RAD.md,
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: FONT.body,
  letterSpacing: '0.3px',
};

var spinnerStyle = {
  width: 12,
  height: 12,
  border: '2px solid rgba(255,255,255,0.2)',
  borderTopColor: T.gold,
  borderRadius: '50%',
  animation: 'mfd-spin 0.6s linear infinite',
  display: 'inline-block',
  marginRight: 6,
};

export function LoadingButton(props) {
  var loading = props.loading;
  var loadingText = props.loadingText || 'PROCESSING...';
  var onClick = props.onClick;
  var style = props.style;
  var children = props.children;

  var merged = Object.assign({}, baseStyle, style, loading ? { pointerEvents: 'none', opacity: 0.7 } : {});

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('style', null, spinKeyframes),
    React.createElement(
      'button',
      { style: merged, onClick: loading ? undefined : onClick },
      loading ? React.createElement('span', { style: spinnerStyle }) : null,
      loading ? loadingText : children
    )
  );
}
