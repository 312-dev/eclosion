/**
 * RecurringListIcons - Icon components for the RecurringList
 */

export function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--monarch-warning)" className="shrink-0">
      <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
    </svg>
  );
}

export function LinkedCategoryIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
