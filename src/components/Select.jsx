/**
 * Select — MFD adapter wrapping Radix Select primitive.
 *
 * Provides accessible select menus with keyboard navigation and
 * Terminal Maximalism styling.
 *
 * Props:
 *   value       {string}      Current selected value
 *   onValueChange {function}  Called with new value string
 *   options     {Array}       [{value, label, disabled}]
 *   placeholder {string}      Placeholder text (default 'Select...')
 *   size        {string}      'sm' | 'md' (default 'md')
 */
import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { T, FONT, RAD, SH, SP } from '../config/theme.js';
import { LucideIcon } from './LucideIcon.jsx';

var triggerStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 4,
  background: T.bg3,
  border: '1px solid ' + T.border,
  borderRadius: RAD.md,
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: T.text,
  fontFamily: FONT.body,
  cursor: 'pointer',
  outline: 'none',
  minWidth: 100,
  transition: 'border-color 0.15s ease',
};

var contentStyle = {
  background: T.bg2,
  border: '1px solid ' + T.border,
  borderRadius: RAD.lg,
  padding: SP.xs,
  boxShadow: SH.lg,
  zIndex: 9600,
  fontFamily: FONT.body,
  maxHeight: 300,
  overflow: 'auto',
};

var itemStyle = {
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 500,
  color: T.text,
  borderRadius: RAD.sm,
  cursor: 'pointer',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

export function Select(props) {
  var value = props.value;
  var onValueChange = props.onValueChange;
  var options = props.options || [];
  var placeholder = props.placeholder || 'Select...';
  var size = props.size || 'md';

  var sizeStyle = size === 'sm'
    ? { padding: '3px 8px', fontSize: 9, minWidth: 70 }
    : {};

  return React.createElement(
    RadixSelect.Root,
    { value: value, onValueChange: onValueChange },
    React.createElement(
      RadixSelect.Trigger,
      { style: Object.assign({}, triggerStyle, sizeStyle) },
      React.createElement(RadixSelect.Value, { placeholder: placeholder }),
      React.createElement(
        RadixSelect.Icon,
        null,
        React.createElement(LucideIcon, { name: 'chevron-down', size: 10, color: T.dim })
      )
    ),
    React.createElement(
      RadixSelect.Portal,
      null,
      React.createElement(
        RadixSelect.Content,
        { style: contentStyle, position: 'popper', sideOffset: 4 },
        React.createElement(
          RadixSelect.Viewport,
          null,
          options.map(function (opt) {
            return React.createElement(
              RadixSelect.Item,
              {
                key: opt.value,
                value: opt.value,
                disabled: opt.disabled,
                style: Object.assign({}, itemStyle, {
                  opacity: opt.disabled ? 0.4 : 1,
                }),
              },
              React.createElement(RadixSelect.ItemText, null, opt.label),
              React.createElement(
                RadixSelect.ItemIndicator,
                { style: { position: 'absolute', right: 8 } },
                React.createElement(LucideIcon, { name: 'check-circle', size: 10, color: T.gold })
              )
            );
          })
        )
      )
    )
  );
}
