/**
 * Notes Page Tour Steps
 *
 * Tour step definitions for the notes page guided tour.
 * Each step targets a specific UI element via data-tour attribute.
 */

import type { ReactNode } from 'react';

export type NotesTourStepId =
  | 'month-navigator'
  | 'category-tree'
  | 'category-note'
  | 'general-notes'
  | 'export-notes';

interface TourStep {
  id: NotesTourStepId;
  selector: string;
  content: () => ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const NOTES_TOUR_STEPS: TourStep[] = [
  {
    id: 'month-navigator',
    selector: '[data-tour="month-navigator"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Month Navigation
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Navigate between months using the arrows or click the month/year to jump
          directly. Notes you write will carry forward to future months automatically.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'category-tree',
    selector: '[data-tour="category-tree"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Category Groups
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Your Monarch categories are organized by group. Click to expand a group
          and see its categories. Use &ldquo;Expand All&rdquo; to open everything at once.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'category-note',
    selector: '[data-tour="category-note"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Adding Notes
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Click any category to add a note. Notes support markdown formatting
          and checkboxes. Your notes save automatically as you type and persist
          to future months until you change them.
        </p>
      </div>
    ),
    position: 'right',
  },
  {
    id: 'general-notes',
    selector: '[data-tour="general-notes"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          General Month Notes
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Use this section for month-wide notes that don&apos;t belong to a specific
          category. Great for tracking goals, reminders, or monthly summaries.
        </p>
      </div>
    ),
    position: 'left',
  },
  {
    id: 'export-notes',
    selector: '[data-tour="export-notes"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Export to PDF
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Export your notes to PDF for printing or sharing. Choose a date range
          and select which categories to include.
        </p>
      </div>
    ),
    position: 'bottom',
  },
];
