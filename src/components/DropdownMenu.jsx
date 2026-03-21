/**
 * DropdownMenu — MFD adapter wrapping Radix DropdownMenu primitive.
 *
 * Provides accessible dropdown menus with keyboard navigation,
 * focus management, and screen-reader support.
 *
 * Props:
 *   trigger    {ReactNode}  The button/element that opens the menu
 *   items      {Array}      [{label, onClick, icon, danger, disabled}]
 *   align      {string}     'start' | 'center' | 'end' (default 'start')
 *   side       {string}     'top' | 'bottom' (default 'bottom')
 */
import React from 'react';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { T, FONT, RAD, SH, SP } from '../config/theme.js';

var menuStyle = {
  background: T.bg2,
  border: '1px solid ' + T.border,
  borderRadius: RAD.lg,
  padding: SP.xs,
  boxShadow: SH.lg,
  zIndex: 9600,
  minWidth: 160,
  fontFamily: FONT.body,
};

var itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  fontSize: 11,
  fontWeight: 500,
  color: T.text,
  borderRadius: RAD.sm,
  cursor: 'pointer',
  outline: 'none',
  transition: 'background 0.08s ease',
  fontFamily: FONT.body,
};

var itemFocusStyle = {
  background: 'rgba(240,160,40,0.12)',
  color: T.gold,
};

export function DropdownMenu(props) {
  var trigger = props.trigger;
  var items = props.items || [];
  var align = props.align || 'start';
  var side = props.side || 'bottom';

  return React.createElement(
    RadixDropdown.Root,
    null,
    React.createElement(RadixDropdown.Trigger, { asChild: true }, trigger),
    React.createElement(
      RadixDropdown.Portal,
      null,
      React.createElement(
        RadixDropdown.Content,
        {
          style: menuStyle,
          align: align,
          side: side,
          sideOffset: 4,
        },
        items.map(function (item, i) {
          if (item.separator) {
            return React.createElement(RadixDropdown.Separator, {
              key: 'sep-' + i,
              style: {
                height: 1,
                background: T.border,
                margin: '4px 0',
              },
            });
          }
          return React.createElement(
            RadixDropdown.Item,
            {
              key: i,
              disabled: item.disabled,
              onSelect: item.onClick,
              style: Object.assign({}, itemStyle, {
                color: item.danger ? T.red : T.text,
                opacity: item.disabled ? 0.4 : 1,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
              }),
              onFocus: function (e) {
                Object.assign(e.currentTarget.style, itemFocusStyle);
              },
              onBlur: function (e) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = item.danger ? T.red : T.text;
              },
              onMouseEnter: function (e) {
                Object.assign(e.currentTarget.style, itemFocusStyle);
              },
              onMouseLeave: function (e) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = item.danger ? T.red : T.text;
              },
            },
            item.icon || null,
            item.label
          );
        })
      )
    )
  );
}
