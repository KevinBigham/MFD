/**
 * MfdToaster — MFD adapter for Sonner toast library.
 *
 * Provides a Terminal Maximalism-styled toast system.
 *
 * Usage:
 *   // In your root component, render <MfdToaster /> once:
 *   import { MfdToaster, mfdToast } from './MfdToaster.jsx';
 *   <MfdToaster />
 *
 *   // To fire toasts from anywhere:
 *   mfdToast("Player signed!", "green");
 *   mfdToast("Trade rejected!", "red");
 *   mfdToast("Championship!", "gold");
 *   mfdToast("Draft pick made", "info");
 *   mfdToast("Injury report", "red", { onClick: () => setTab("roster") });
 */
import React from 'react';
import { Toaster, toast } from 'sonner';
import { T, FONT, RAD } from '../config/theme.js';
import { LucideIcon } from './LucideIcon.jsx';

// ── Type-to-style mapping ────────────────────────────────
var TYPE_CONFIG = {
  red: { color: T.red, icon: 'alert-triangle', title: 'ALERT' },
  green: { color: T.green, icon: 'check-circle', title: 'SUCCESS' },
  gold: { color: T.gold, icon: 'trophy', title: 'MAJOR EVENT' },
  purple: { color: T.purple, icon: 'sparkles', title: 'UPDATE' },
  cyan: { color: T.cyan, icon: 'info', title: 'INFO' },
  info: { color: T.blue, icon: 'info', title: 'UPDATE' },
};

/**
 * Fire an MFD-styled toast.
 * @param {string} text — toast message
 * @param {string} [type] — 'red'|'green'|'gold'|'purple'|'cyan'|'info' (default 'info')
 * @param {object} [opts] — { title, onClick, duration }
 */
export function mfdToast(text, type, opts) {
  var cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  var options = opts || {};
  var title = options.title || cfg.title;
  var duration = options.duration || 2500;

  toast.custom(
    function (toastId) {
      return React.createElement(
        'div',
        {
          onClick: function () {
            if (options.onClick) {
              options.onClick();
              toast.dismiss(toastId);
            }
          },
          style: {
            background: T.bg2,
            border: '1px solid ' + T.border,
            borderLeft: '4px solid ' + cfg.color,
            borderRadius: RAD.md,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 220,
            maxWidth: 280,
            color: T.text,
            fontFamily: FONT.body,
            cursor: options.onClick ? 'pointer' : 'default',
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
          },
        },
        React.createElement(LucideIcon, {
          name: cfg.icon,
          size: 14,
          color: cfg.color,
        }),
        React.createElement(
          'div',
          { style: { flex: 1 } },
          React.createElement(
            'div',
            {
              style: {
                fontWeight: 700,
                color: cfg.color,
                fontSize: 9,
                marginBottom: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              },
            },
            title
          ),
          React.createElement(
            'div',
            {
              style: {
                color: T.dim,
                fontSize: 10,
                lineHeight: 1.3,
              },
            },
            text
          ),
          options.onClick
            ? React.createElement(
                'div',
                {
                  style: {
                    fontSize: 8,
                    color: T.faint,
                    marginTop: 2,
                  },
                },
                'TAP \u2192'
              )
            : null
        ),
        React.createElement(
          'button',
          {
            onClick: function (e) {
              e.stopPropagation();
              toast.dismiss(toastId);
            },
            style: {
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: T.faint,
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              lineHeight: 1,
            },
          },
          '\u2715'
        )
      );
    },
    { duration: duration }
  );
}

/**
 * MfdToaster — render once in your root component.
 * Positioned top-right to match the existing ToastContainer placement.
 */
export function MfdToaster() {
  return React.createElement(Toaster, {
    position: 'top-right',
    gap: 6,
    toastOptions: {
      style: {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      },
    },
  });
}
