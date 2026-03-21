/**
 * DraggableList — MFD adapter wrapping dnd-kit sortable.
 *
 * Provides drag-and-drop reordering with Terminal Maximalism styling.
 * Gold drag handle, subtle elevation on drag, keyboard support.
 *
 * Props:
 *   items        {Array}      Items with unique `id` field
 *   onReorder    {function}   Called with new items array after reorder
 *   renderItem   {function}   (item, {isDragging, dragHandleProps}) => ReactNode
 *   direction    {string}     'vertical' | 'horizontal' (default 'vertical')
 */
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { T, FONT, RAD } from '../config/theme.js';
import { LucideIcon } from './LucideIcon.jsx';

function SortableItem(props) {
  var id = props.id;
  var renderItem = props.renderItem;
  var item = props.item;

  var sortable = useSortable({ id: id });
  var attributes = sortable.attributes;
  var listeners = sortable.listeners;
  var setNodeRef = sortable.setNodeRef;
  var transform = sortable.transform;
  var transition = sortable.transition;
  var isDragging = sortable.isDragging;

  var style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 'auto',
    boxShadow: isDragging ? '0 4px 16px rgba(240,160,40,0.2)' : 'none',
  };

  var dragHandleProps = {
    ...listeners,
    ...attributes,
    style: {
      cursor: 'grab',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 4px',
      borderRadius: RAD.sm,
      touchAction: 'none',
    },
    'aria-label': 'Drag to reorder',
  };

  var dragHandle = React.createElement(
    'span',
    dragHandleProps,
    React.createElement(LucideIcon, { name: 'menu', size: 12, color: isDragging ? T.gold : T.faint })
  );

  return React.createElement(
    'div',
    { ref: setNodeRef, style: style },
    renderItem(item, { isDragging: isDragging, dragHandle: dragHandle, dragHandleProps: dragHandleProps })
  );
}

export function DraggableList(props) {
  var items = props.items || [];
  var onReorder = props.onReorder;
  var renderItem = props.renderItem;
  var direction = props.direction || 'vertical';

  var sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  var strategy = direction === 'horizontal'
    ? horizontalListSortingStrategy
    : verticalListSortingStrategy;

  function handleDragEnd(event) {
    var active = event.active;
    var over = event.over;
    if (!over || active.id === over.id) return;

    var oldIndex = items.findIndex(function (item) { return item.id === active.id; });
    var newIndex = items.findIndex(function (item) { return item.id === over.id; });

    if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  }

  var ids = items.map(function (item) { return item.id; });

  return React.createElement(
    DndContext,
    {
      sensors: sensors,
      collisionDetection: closestCenter,
      onDragEnd: handleDragEnd,
    },
    React.createElement(
      SortableContext,
      { items: ids, strategy: strategy },
      items.map(function (item) {
        return React.createElement(SortableItem, {
          key: item.id,
          id: item.id,
          item: item,
          renderItem: renderItem,
        });
      })
    )
  );
}
