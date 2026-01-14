/**
 * Inline Inheritance Warning
 *
 * Displays a warning when saving a note will affect checkbox states.
 * Two scenarios:
 * 1. Breaking inheritance: Creating a new note will reset checked items
 * 2. Modifying source: Editing a source note may invalidate checkbox states in inheriting months
 */

import { AlertTriangle } from 'lucide-react';

interface InheritanceWarningInlineProps {
  monthsWithCheckboxStates: Record<string, number>;
  /** Whether this is about modifying a source note (vs breaking inheritance) */
  isSourceNoteEdit?: boolean | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}

function formatMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function InheritanceWarningInline({
  monthsWithCheckboxStates,
  isSourceNoteEdit = false,
  onCancel,
  onConfirm,
}: Readonly<InheritanceWarningInlineProps>) {
  // Different messaging for source note edits vs breaking inheritance
  const title = isSourceNoteEdit
    ? 'This may affect checkbox states'
    : 'This will clear checkbox states';

  const description = isSourceNoteEdit
    ? 'Modifying this note may affect checked items in months that inherit from it:'
    : 'Creating a new note for this month will reset checked items in:';

  return (
    <div
      className="mt-3 p-3 rounded-lg"
      style={{
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid var(--monarch-orange)',
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: 'var(--monarch-orange)' }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {title}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
      <ul
        className="text-xs ml-6 mb-3 space-y-0.5"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        {Object.entries(monthsWithCheckboxStates).map(([month, count]) => (
          <li key={month}>
            {formatMonth(month)} ({count} checked item{count === 1 ? '' : 's'})
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg hover:bg-(--monarch-bg-hover)"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-1.5 text-sm font-medium rounded-lg"
          style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
        >
          Save Anyway
        </button>
      </div>
    </div>
  );
}
