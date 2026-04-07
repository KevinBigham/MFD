/**
 * Icon — lightweight SVG icon shim for emoji-free UI labels.
 *
 * Props:
 *   name        {string}  icon key
 *   size        {number}  px (default 14)
 *   color       {string}  stroke/fill color (default currentColor)
 *   strokeWidth {number}  line width (default 1.8)
 *   style       {object}  optional inline styles
 */

function merge(base, extra) {
  return Object.assign({}, base || {}, extra || {});
}

function iconGlyph(name, color, strokeWidth) {
  var line = { stroke: color, strokeWidth: strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  if (name === 'play') {
    return React.createElement('path', { d: 'M9 7 L18 12 L9 17 Z', fill: color, stroke: 'none' });
  }
  if (name === 'folder') {
    return React.createElement('path', merge({ d: 'M3 7 H9 L11 9 H21 V18 H3 Z' }, line));
  }
  if (name === 'upload') {
    return React.createElement(React.Fragment, null,
      React.createElement('path', merge({ d: 'M6 17 H18' }, line)),
      React.createElement('path', merge({ d: 'M12 17 V7' }, line)),
      React.createElement('path', merge({ d: 'M8.5 10.5 L12 7 L15.5 10.5' }, line))
    );
  }
  if (name === 'music') {
    return React.createElement(React.Fragment, null,
      React.createElement('path', merge({ d: 'M14 6 V15' }, line)),
      React.createElement('path', merge({ d: 'M14 6 L19 5 V14' }, line)),
      React.createElement('circle', merge({ cx: 10, cy: 16.5, r: 2.2 }, line)),
      React.createElement('circle', merge({ cx: 19, cy: 14, r: 2 }, line))
    );
  }
  if (name === 'book') {
    return React.createElement(React.Fragment, null,
      React.createElement('path', merge({ d: 'M4 6 H11 V18 H4 Z' }, line)),
      React.createElement('path', merge({ d: 'M13 6 H20 V18 H13 Z' }, line)),
      React.createElement('path', merge({ d: 'M11 7.5 H13' }, line))
    );
  }
  if (name === 'list') {
    return React.createElement(React.Fragment, null,
      React.createElement('circle', { cx: 6, cy: 7, r: 1.2, fill: color }),
      React.createElement('circle', { cx: 6, cy: 12, r: 1.2, fill: color }),
      React.createElement('circle', { cx: 6, cy: 17, r: 1.2, fill: color }),
      React.createElement('path', merge({ d: 'M9 7 H19' }, line)),
      React.createElement('path', merge({ d: 'M9 12 H19' }, line)),
      React.createElement('path', merge({ d: 'M9 17 H19' }, line))
    );
  }
  if (name === 'skip') {
    return React.createElement(React.Fragment, null,
      React.createElement('path', merge({ d: 'M6 7 L12 12 L6 17 Z' }, line)),
      React.createElement('path', merge({ d: 'M12 7 L18 12 L12 17 Z' }, line)),
      React.createElement('path', merge({ d: 'M19 7 V17' }, line))
    );
  }
  if (name === 'check') {
    return React.createElement('path', merge({ d: 'M5.5 12.5 L10 16.5 L18.5 8.5' }, line));
  }
  if (name === 'target') {
    return React.createElement(React.Fragment, null,
      React.createElement('circle', merge({ cx: 12, cy: 12, r: 7 }, line)),
      React.createElement('circle', merge({ cx: 12, cy: 12, r: 3 }, line)),
      React.createElement('circle', { cx: 12, cy: 12, r: 1.2, fill: color })
    );
  }
  if (name === 'flag') {
    return React.createElement(React.Fragment, null,
      React.createElement('path', merge({ d: 'M6 20 V4' }, line)),
      React.createElement('path', merge({ d: 'M6 4 H17 L14.5 8 L17 12 H6' }, line))
    );
  }
  if (name === 'support') {
    return React.createElement(React.Fragment, null,
      React.createElement('path', merge({ d: 'M6 9 H18 V13 C18 16 16 18 12 18 C8 18 6 16 6 13 Z' }, line)),
      React.createElement('path', merge({ d: 'M6 9 C6 7.5 7.2 6 9 6 H15 C16.8 6 18 7.5 18 9' }, line)),
      React.createElement('path', merge({ d: 'M9 21 H15' }, line)),
      React.createElement('path', merge({ d: 'M12 18 V21' }, line))
    );
  }
  return React.createElement('circle', merge({ cx: 12, cy: 12, r: 7 }, line));
}

export function Icon(props) {
  var name = props && props.name ? props.name : 'target';
  var size = props && props.size ? props.size : 14;
  var color = props && props.color ? props.color : 'currentColor';
  var strokeWidth = props && props.strokeWidth ? props.strokeWidth : 1.8;
  var style = props && props.style ? props.style : {};
  return React.createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      focusable: 'false',
      style: merge({ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }, style),
    },
    iconGlyph(name, color, strokeWidth)
  );
}
