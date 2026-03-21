/**
 * DataTable — MFD adapter wrapping TanStack Table.
 *
 * Terminal Maximalism styled data grid with sorting, filtering,
 * and column visibility. Uses inline styles with theme tokens.
 *
 * Props:
 *   data           {Array}      Row data objects
 *   columns        {Array}      TanStack column definitions [{accessorKey, header, cell, size, sortable}]
 *   onRowClick     {function}   Called with row data on click
 *   stickyHeader   {boolean}    Stick header to top (default true)
 *   maxHeight      {string}     Max table height for scrolling (default 'none')
 *   striped        {boolean}    Alternating row backgrounds (default true)
 *   compact        {boolean}    Compact row padding (default false)
 *   initialSorting {Array}      Initial sort state [{id, desc}]
 */
import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { T, FONT, RAD, SH, SP } from '../config/theme.js';
import { LucideIcon } from './LucideIcon.jsx';

var headerCellStyle = {
  padding: '6px 8px',
  fontSize: 9,
  fontWeight: 700,
  color: T.gold,
  fontFamily: FONT.mono,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  textAlign: 'left',
  borderBottom: '2px solid ' + T.gold + '33',
  background: T.bg2,
  userSelect: 'none',
  whiteSpace: 'nowrap',
  position: 'relative',
};

var bodyCellStyle = {
  padding: '5px 8px',
  fontSize: 11,
  color: T.text,
  fontFamily: FONT.body,
  borderBottom: '1px solid ' + T.border,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export function DataTable(props) {
  var data = props.data || [];
  var columns = props.columns || [];
  var onRowClick = props.onRowClick;
  var stickyHeader = props.stickyHeader !== false;
  var maxHeight = props.maxHeight || 'none';
  var striped = props.striped !== false;
  var compact = props.compact || false;
  var initialSorting = props.initialSorting || [];

  var _sort = useState(initialSorting);
  var sorting = _sort[0];
  var setSorting = _sort[1];

  var tanstackColumns = useMemo(function () {
    return columns.map(function (col) {
      return {
        accessorKey: col.accessorKey,
        accessorFn: col.accessorFn,
        header: col.header,
        cell: col.cell,
        size: col.size,
        enableSorting: col.sortable !== false,
      };
    });
  }, [columns]);

  var table = useReactTable({
    data: data,
    columns: tanstackColumns,
    state: { sorting: sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  var containerStyle = {
    width: '100%',
    overflow: 'auto',
    maxHeight: maxHeight,
    borderRadius: RAD.lg,
    border: '1px solid ' + T.border,
    background: T.bg,
  };

  return React.createElement('div', { style: containerStyle },
    React.createElement('table', {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'auto',
      },
    },
      // Header
      React.createElement('thead', null,
        table.getHeaderGroups().map(function (headerGroup) {
          return React.createElement('tr', { key: headerGroup.id },
            headerGroup.headers.map(function (header) {
              var canSort = header.column.getCanSort();
              var sorted = header.column.getIsSorted();
              return React.createElement('th', {
                key: header.id,
                style: Object.assign({}, headerCellStyle, {
                  cursor: canSort ? 'pointer' : 'default',
                  position: stickyHeader ? 'sticky' : 'relative',
                  top: stickyHeader ? 0 : undefined,
                  zIndex: stickyHeader ? 1 : undefined,
                  width: header.column.columnDef.size || undefined,
                }),
                onClick: canSort ? header.column.getToggleSortingHandler() : undefined,
              },
                React.createElement('span', {
                  style: { display: 'inline-flex', alignItems: 'center', gap: 3 },
                },
                  flexRender(header.column.columnDef.header, header.getContext()),
                  sorted
                    ? React.createElement(LucideIcon, {
                        name: sorted === 'desc' ? 'chevron-down' : 'chevron-up',
                        size: 9,
                        color: T.gold,
                      })
                    : canSort
                      ? React.createElement(LucideIcon, {
                          name: 'chevron-down',
                          size: 9,
                          color: T.faint,
                          style: { opacity: 0.3 },
                        })
                      : null
                )
              );
            })
          );
        })
      ),
      // Body
      React.createElement('tbody', null,
        table.getRowModel().rows.map(function (row, rowIdx) {
          var isEven = rowIdx % 2 === 0;
          return React.createElement('tr', {
            key: row.id,
            onClick: onRowClick ? function () { onRowClick(row.original); } : undefined,
            style: {
              background: striped && !isEven ? 'rgba(255,255,255,0.02)' : 'transparent',
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'background 0.08s ease',
            },
            onMouseEnter: onRowClick ? function (e) {
              e.currentTarget.style.background = 'rgba(240,160,40,0.06)';
            } : undefined,
            onMouseLeave: onRowClick ? function (e) {
              e.currentTarget.style.background = striped && !isEven ? 'rgba(255,255,255,0.02)' : 'transparent';
            } : undefined,
          },
            row.getVisibleCells().map(function (cell) {
              return React.createElement('td', {
                key: cell.id,
                style: Object.assign({}, bodyCellStyle, {
                  padding: compact ? '3px 6px' : '5px 8px',
                  fontSize: compact ? 10 : 11,
                }),
              },
                flexRender(cell.column.columnDef.cell, cell.getContext())
              );
            })
          );
        })
      )
    )
  );
}
