/**
 * DynastyCartridge — Export/Import Dynasty Modal
 *
 * Bloomberg-styled modal for exporting (clipboard + .mfd) and importing
 * dynasty save data. Pairs with src/systems/dynasty-cartridge.js.
 *
 * Props:
 *   mode       — "export" | "import"
 *   visible    — boolean
 *   onClose    — callback
 *   save       — current save data (for export mode)
 *   meta       — { teamName, teamIcon, season, week, record } (for export)
 *   onImport   — callback(saveData) when import succeeds
 *   onExportDone — callback() after successful export
 */
import React, { useState, useRef } from 'react';
import { T, SP, RAD, S } from '../config/theme.js';
import { DYNASTY_CARTRIDGE } from '../systems/dynasty-cartridge.js';

var MONO = "'JetBrains Mono','Fira Code','Courier New',monospace";

export default function DynastyCartridge(props) {
  var mode = props.mode || 'export';
  var visible = props.visible;
  var onClose = props.onClose;
  var save = props.save;
  var meta = props.meta || {};
  var onImport = props.onImport;
  var onExportDone = props.onExportDone;

  var _status = useState(null);
  var status = _status[0];
  var setStatus = _status[1];

  var _importText = useState('');
  var importText = _importText[0];
  var setImportText = _importText[1];

  var _importError = useState('');
  var importError = _importError[0];
  var setImportError = _importError[1];

  var fileRef = useRef(null);

  if (!visible) return null;

  function handleCopyClipboard() {
    DYNASTY_CARTRIDGE.copyToClipboard(save, meta).then(function (result) {
      if (result.ok) {
        setStatus('copied');
        if (onExportDone) onExportDone();
        setTimeout(function () { setStatus(null); }, 2000);
      } else {
        setStatus('error');
      }
    });
  }

  function handleDownloadFile() {
    var result = DYNASTY_CARTRIDGE.download(save, meta);
    if (result.ok) {
      setStatus('downloaded');
      if (onExportDone) onExportDone();
      setTimeout(function () { setStatus(null); }, 2000);
    } else {
      setStatus('error');
    }
  }

  function handleImportText() {
    setImportError('');
    var result = DYNASTY_CARTRIDGE.parse(importText);
    if (result.ok) {
      if (onImport) onImport(result.save);
      setImportText('');
      if (onClose) onClose();
    } else {
      setImportError(result.error);
    }
  }

  function handleImportFile(e) {
    var file = e.target.files[0];
    if (!file) return;
    setImportError('');
    DYNASTY_CARTRIDGE.parseFile(file).then(function (result) {
      if (result.ok) {
        if (onImport) onImport(result.save);
        if (onClose) onClose();
      } else {
        setImportError(result.error);
      }
    });
  }

  // Build stats for export mode
  var cartridgeInfo = null;
  if (mode === 'export' && save) {
    var built = DYNASTY_CARTRIDGE.build(save, meta);
    if (built.ok) {
      cartridgeInfo = {
        size: Math.round(built.sizeBytes / 1024) + 'KB',
        compressed: Math.round(built.compressedSize / 1024) + 'KB',
        ratio: built.compressionRatio + '%',
      };
    }
  }

  var overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 9600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  };

  var modalStyle = {
    background: T.bg2,
    border: '1px solid ' + T.gold,
    borderRadius: RAD.lg,
    padding: 24,
    maxWidth: 480,
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    fontFamily: MONO,
  };

  var btnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 20px',
    border: 'none',
    borderRadius: RAD.md,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: MONO,
    letterSpacing: 0.5,
  };

  if (mode === 'export') {
    return React.createElement('div', {
      style: overlayStyle,
      onClick: onClose,
    },
      React.createElement('div', {
        style: modalStyle,
        onClick: function (e) { e.stopPropagation(); },
      },
        // Header
        React.createElement('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }
        },
          React.createElement('div', {
            style: { fontSize: 16, fontWeight: 900, color: T.gold, letterSpacing: 1.5 }
          }, 'EXPORT DYNASTY'),
          React.createElement('button', {
            onClick: onClose,
            style: { background: T.bg3, color: T.faint, border: 'none', borderRadius: RAD.sm, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }
          }, '\u2715')
        ),

        // Meta info
        meta.teamName ? React.createElement('div', {
          style: { fontSize: 11, color: T.dim, marginBottom: 16, letterSpacing: 0.5 }
        },
          (meta.teamIcon || '') + ' ' + meta.teamName + ' | Season ' + (meta.season || '?') + ' Week ' + (meta.week || '?') + (meta.record ? ' | ' + meta.record : '')
        ) : null,

        // Cartridge stats
        cartridgeInfo ? React.createElement('div', {
          style: { display: 'flex', gap: 16, marginBottom: 20, padding: '8px 12px', background: 'rgba(240,160,40,0.06)', border: '1px solid rgba(240,160,40,0.15)', borderRadius: RAD.sm }
        },
          React.createElement('div', { style: { fontSize: 10, color: T.faint } },
            'RAW: ' + cartridgeInfo.size),
          React.createElement('div', { style: { fontSize: 10, color: T.faint } },
            'COMPRESSED: ' + cartridgeInfo.compressed),
          React.createElement('div', { style: { fontSize: 10, color: T.green } },
            'SAVED: ' + cartridgeInfo.ratio)
        ) : null,

        // Copy to clipboard button
        React.createElement('button', {
          onClick: handleCopyClipboard,
          style: Object.assign({}, btnStyle, {
            background: status === 'copied' ? T.green : T.gold,
            color: '#000',
            marginBottom: 10,
          }),
        }, status === 'copied' ? 'COPIED TO CLIPBOARD' : 'COPY SAVE STRING'),

        // Download .mfd file button
        React.createElement('button', {
          onClick: handleDownloadFile,
          style: Object.assign({}, btnStyle, {
            background: status === 'downloaded' ? T.green : T.bg3,
            color: status === 'downloaded' ? '#000' : T.text,
            border: '1px solid ' + T.border,
          }),
        }, status === 'downloaded' ? 'DOWNLOADED!' : 'DOWNLOAD .MFD FILE'),

        // Help text
        React.createElement('div', {
          style: { fontSize: 10, color: T.faint, marginTop: 16, lineHeight: 1.5 }
        }, 'Save this string or file to protect your dynasty. Paste the string into Import on any device to restore. Share .mfd files with friends to trade universes.')
      )
    );
  }

  // Import mode
  return React.createElement('div', {
    style: overlayStyle,
    onClick: onClose,
  },
    React.createElement('div', {
      style: modalStyle,
      onClick: function (e) { e.stopPropagation(); },
    },
      // Header
      React.createElement('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }
      },
        React.createElement('div', {
          style: { fontSize: 16, fontWeight: 900, color: T.cyan, letterSpacing: 1.5 }
        }, 'IMPORT DYNASTY'),
        React.createElement('button', {
          onClick: onClose,
          style: { background: T.bg3, color: T.faint, border: 'none', borderRadius: RAD.sm, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }
        }, '\u2715')
      ),

      React.createElement('div', {
        style: { fontSize: 11, color: T.dim, marginBottom: 12 }
      }, 'Paste a save string or upload a .mfd/.json file. This will create a new save.'),

      // Text area for paste
      React.createElement('textarea', {
        value: importText,
        onChange: function (e) { setImportText(e.target.value); },
        placeholder: 'Paste your save string here...',
        style: {
          width: '100%',
          height: 100,
          background: T.bg,
          color: T.text,
          border: '1px solid ' + T.bg3,
          borderRadius: RAD.sm,
          padding: 10,
          fontSize: 11,
          fontFamily: MONO,
          resize: 'vertical',
          boxSizing: 'border-box',
        },
      }),

      // Import from text button
      React.createElement('button', {
        onClick: handleImportText,
        disabled: !importText.trim(),
        style: Object.assign({}, btnStyle, {
          background: importText.trim() ? T.cyan : T.bg3,
          color: importText.trim() ? '#000' : T.faint,
          marginTop: 10,
          marginBottom: 12,
        }),
      }, 'IMPORT FROM STRING'),

      // OR divider
      React.createElement('div', {
        style: { textAlign: 'center', fontSize: 10, color: T.faint, margin: '4px 0', letterSpacing: 2 }
      }, '— OR —'),

      // File upload button
      React.createElement('button', {
        onClick: function () { if (fileRef.current) fileRef.current.click(); },
        style: Object.assign({}, btnStyle, {
          background: T.bg3,
          color: T.text,
          border: '1px solid ' + T.border,
          marginTop: 8,
        }),
      }, 'UPLOAD .MFD / .JSON FILE'),
      React.createElement('input', {
        ref: fileRef,
        type: 'file',
        accept: '.mfd,.json',
        onChange: handleImportFile,
        style: { display: 'none' },
      }),

      // Error display
      importError ? React.createElement('div', {
        style: { fontSize: 11, color: T.red, marginTop: 10, padding: '6px 10px', background: 'rgba(224,60,60,0.1)', borderRadius: RAD.sm }
      }, importError) : null,

      // Warning
      React.createElement('div', {
        style: { fontSize: 10, color: T.faint, marginTop: 12, lineHeight: 1.5 }
      }, 'Your existing saves are not affected. Imported dynasties appear as new save slots. Supports both new .mfd format and legacy .json saves.')
    )
  );
}
