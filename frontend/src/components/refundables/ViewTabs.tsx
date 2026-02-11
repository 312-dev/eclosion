/**
 * ViewTabs
 *
 * Horizontal scrollable tabs for saved views, with add/edit/delete support
 * and drag-and-drop reordering via @dnd-kit.
 */

import React, { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil } from 'lucide-react';
import { HorizontalTabsScroll } from '../ui/HorizontalTabsScroll';
import type { RefundablesSavedView } from '../../types/refundables';

interface ViewTabsProps {
  readonly views: RefundablesSavedView[];
  readonly activeViewId: string | null;
  readonly viewCounts?: Record<string, number> | undefined;
  readonly onSelectView: (viewId: string) => void;
  readonly onAddView: () => void;
  readonly onEditView: (viewId: string) => void;
  readonly onReorder: (viewIds: string[]) => void;
  readonly trailing?: React.ReactNode;
}

const SortableViewTab = React.memo(function SortableViewTab({
  view,
  isActive,
  badge,
  onSelect,
  onEdit,
}: {
  view: RefundablesSavedView;
  isActive: boolean;
  badge?: number | undefined;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: view.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      e.preventDefault();
      onEdit();
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <button
        type="button"
        onClick={onSelect}
        role="tab"
        aria-selected={isActive}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap rounded-lg transition-colors shrink-0 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${
          isActive
            ? 'bg-(--monarch-orange)/10 text-(--monarch-orange)'
            : 'bg-(--monarch-bg-hover)/50 text-(--monarch-text-muted) hover:text-(--monarch-text-dark) hover:bg-(--monarch-bg-hover)'
        }`}
      >
        <span>{view.name}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className="flex items-center justify-center min-w-4.5 h-4.5 px-1.25 text-[0.65rem] font-semibold rounded-full whitespace-nowrap"
            style={{
              backgroundColor: isActive ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
              color: 'white',
              opacity: isActive ? 1 : 0.7,
            }}
          >
            {badge}
          </span>
        )}
        {isActive && (
          <button
            type="button"
            onClick={handleEditClick}
            onKeyDown={handleEditKeyDown}
            data-no-dnd="true"
            className="p-0.5 rounded hover:bg-(--monarch-bg-page) transition-colors"
            aria-label={`Edit ${view.name} view`}
          >
            <Pencil size={12} aria-hidden="true" />
          </button>
        )}
      </button>
    </div>
  );
});

/** PointerSensor that ignores interactive child elements (edit/delete buttons). */
function shouldHandleEvent(element: Element | null): boolean {
  let el: Element | null = element;
  while (el) {
    if (el.tagName.toUpperCase() === 'BUTTON' && (el as HTMLElement).dataset['noDnd'] === 'true') {
      return false;
    }
    el = el.parentElement;
  }
  return true;
}

class ViewTabPointerSensor extends PointerSensor {
  static readonly activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: React.PointerEvent) => {
        return shouldHandleEvent(event.target as Element);
      },
    },
  ];
}

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

class ViewTabTouchSensor extends TouchSensor {
  static readonly activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: (event: React.TouchEvent) => {
        return shouldHandleEvent(event.target as Element);
      },
    },
  ];
}

export function ViewTabs({
  views,
  activeViewId,
  viewCounts,
  onSelectView,
  onAddView,
  onEditView,
  onReorder,
  trailing,
}: ViewTabsProps) {
  const sensors = useSensors(
    useSensor(ViewTabPointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(ViewTabTouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = views.findIndex((v) => v.id === active.id);
      const newIndex = views.findIndex((v) => v.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...views];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved!);

      onReorder(reordered.map((v) => v.id));
    },
    [views, onReorder]
  );

  const viewIds = views.map((v) => v.id);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <HorizontalTabsScroll className="shrink min-w-0" innerClassName="!pl-0" disableDragScroll>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis]}
        >
          <SortableContext items={viewIds} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center gap-1" role="tablist" aria-label="Saved views">
              {views.map((view) => (
                <SortableViewTab
                  key={view.id}
                  view={view}
                  isActive={view.id === activeViewId}
                  badge={viewCounts?.[view.id]}
                  onSelect={() => onSelectView(view.id)}
                  onEdit={() => onEditView(view.id)}
                />
              ))}
              <button
                type="button"
                onClick={onAddView}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-(--monarch-text-muted) hover:text-(--monarch-text-dark) hover:bg-(--monarch-bg-hover) rounded-lg transition-colors whitespace-nowrap shrink-0"
                aria-label="Create new view"
              >
                <Plus size={16} aria-hidden="true" />
                <span>Add View</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      </HorizontalTabsScroll>
      {trailing && <div className="flex items-center gap-2 shrink-0 sm:ml-auto">{trailing}</div>}
    </div>
  );
}
