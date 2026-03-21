import React from 'react';
import { T, RAD } from '../config/theme.js';

var keyframes = '@keyframes mfd-shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}';
var reducedMotion = '@media (prefers-reduced-motion:reduce){.mfd-skel{animation:none!important}}';

var shimmerBase = {
  background: 'linear-gradient(90deg, ' + T.bg3 + ', rgba(255,255,255,0.05), ' + T.bg3 + ')',
  backgroundSize: '200px 100%',
  animation: 'mfd-shimmer 1.5s ease-in-out infinite',
};

export function Skeleton(props) {
  var width = props.width !== undefined ? props.width : '100%';
  var height = props.height !== undefined ? props.height : 16;
  var variant = props.variant || 'rect';
  var count = props.count !== undefined ? props.count : 3;

  if (variant === 'circle') {
    var circleStyle = Object.assign({}, shimmerBase, {
      width: height,
      height: height,
      borderRadius: '50%',
    });
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('style', null, keyframes + reducedMotion),
      React.createElement('div', { className: 'mfd-skel', style: circleStyle })
    );
  }

  if (variant === 'text') {
    var lines = [];
    var i = 0;
    while (i < count) {
      var lineStyle = Object.assign({}, shimmerBase, {
        width: i === count - 1 ? '60%' : width,
        height: 16,
        borderRadius: RAD.sm,
      });
      lines.push(React.createElement('div', { key: i, className: 'mfd-skel', style: lineStyle }));
      i++;
    }
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('style', null, keyframes + reducedMotion),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, lines)
    );
  }

  // rect (default)
  var rectStyle = Object.assign({}, shimmerBase, {
    width: width,
    height: height,
    borderRadius: RAD.sm,
  });
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('style', null, keyframes + reducedMotion),
    React.createElement('div', { className: 'mfd-skel', style: rectStyle })
  );
}
