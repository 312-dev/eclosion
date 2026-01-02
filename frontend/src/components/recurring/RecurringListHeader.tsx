/**
 * RecurringListHeader - Header with sort buttons for the RecurringList
 */

type SortField = 'due_date' | 'amount' | 'name' | 'monthly';
type SortDirection = 'asc' | 'desc';

interface SortButtonProps {
  readonly field: SortField;
  readonly label: string;
  readonly currentField: SortField;
  readonly direction: SortDirection;
  readonly onClick: (field: SortField) => void;
  readonly align?: 'left' | 'right' | 'center';
}

export function SortButton({ field, label, currentField, direction, onClick, align = 'left' }: SortButtonProps) {
  const isActive = currentField === field;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <button
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 text-sm font-medium ${alignClass} w-full`}
      style={{ color: isActive ? 'var(--monarch-text-dark)' : 'var(--monarch-text-light)' }}
    >
      {label}
      {isActive && (
        <span className="text-xs" style={{ color: 'var(--monarch-text-light)' }}>{direction === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

interface RecurringListHeaderProps {
  readonly sortField: SortField;
  readonly sortDirection: SortDirection;
  readonly onSort: (field: SortField) => void;
}

export function RecurringListHeader({ sortField, sortDirection, onSort }: RecurringListHeaderProps) {
  return (
    <thead>
      <tr style={{ backgroundColor: 'var(--monarch-bg-page)', borderBottom: '1px solid var(--monarch-border)' }}>
        <th className="py-3 pl-5 pr-2 text-left" style={{ width: '280px', maxWidth: '280px' }}>
          <SortButton
            field="name"
            label="Recurring"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
          />
        </th>
        <th className="py-3 px-4 text-left" style={{ width: '100px' }}>
          <SortButton
            field="due_date"
            label="Date"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
          />
        </th>
        <th className="py-3 px-4 text-right">
          <SortButton
            field="amount"
            label="Total Cost"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
            align="right"
          />
        </th>
        <th className="py-3 px-4 text-right">
          <SortButton
            field="monthly"
            label="Budgeted"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
            align="right"
          />
        </th>
        <th className="py-3 px-5 text-center text-sm font-medium w-24" style={{ color: 'var(--monarch-text-light)' }}>
          Status
        </th>
        <th className="py-3 px-3 w-12"></th>
      </tr>
    </thead>
  );
}

export type { SortField, SortDirection };
