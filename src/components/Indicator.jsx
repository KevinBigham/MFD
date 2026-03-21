import React from 'react';
import { T, FONT } from '../config/theme.js';

export function Indicator(props) {
  var count = props.count;
  var color = props.color || T.red;
  var dot = props.dot;
  var children = props.children;

  if (!count) {
    return children;
  }

  var badgeStyle = {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: dot ? 8 : 16,
    height: dot ? 8 : 16,
    borderRadius: '50%',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    fontWeight: 700,
    color: '#fff',
    fontFamily: FONT.mono,
    border: '2px solid ' + T.bg,
    zIndex: 10,
  };

  return React.createElement(
    'span',
    { style: { position: 'relative', display: 'inline-flex' } },
    children,
    React.createElement('span', { style: badgeStyle }, dot ? null : count)
  );
}
