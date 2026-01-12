/**
 * ToolSettingsHeader - Reusable header for tool settings cards
 *
 * Displays a consistent tool header with icon, title, status badge, description, and navigation arrow.
 * Used by RecurringToolSettings and NotesToolSettings for visual consistency.
 */

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ToolSettingsHeaderProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: ReactNode;
  readonly isActive: boolean;
  readonly statusBadge?: ReactNode;
  readonly onNavigate: () => void;
}

export function ToolSettingsHeader({
  icon,
  title,
  description,
  isActive,
  statusBadge,
  onNavigate,
}: ToolSettingsHeaderProps) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-4">
        <div
          className="p-2.5 rounded-lg shrink-0"
          style={{
            backgroundColor: isActive
              ? 'var(--monarch-orange-light)'
              : 'var(--monarch-bg-page)',
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="font-medium flex items-center gap-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {title}
            {statusBadge}
          </div>
          <div
            className="text-sm mt-0.5"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {description}
          </div>
        </div>

        <button
          type="button"
          className="p-2 rounded-lg shrink-0 hover-bg-transparent-to-hover"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onNavigate}
          aria-label={`Go to ${title}`}
        >
          <ChevronRight
            size={20}
            style={{ color: 'var(--monarch-text-muted)' }}
          />
        </button>
      </div>
    </div>
  );
}
