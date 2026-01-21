/**
 * Stash Page Tour Steps
 *
 * Tour step definitions for the stash page guided tour.
 * Each step targets a specific UI element via data-tour attribute.
 */

import type { ReactNode } from 'react';

export type StashTourStepId =
  | 'add-item'
  | 'sync-bookmarks'
  | 'edit-item'
  | 'move-card'
  | 'resize-card'
  | 'pending-bookmarks';

/** Custom event dispatched to expand the pending bookmarks section during tour */
export const EXPAND_PENDING_SECTION_EVENT = 'eclosion:expand-pending-section';

interface TourStep {
  id: StashTourStepId;
  selector: string;
  content: () => ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

export const STASH_TOUR_STEPS: TourStep[] = [
  {
    id: 'add-item',
    selector: '[data-tour="stash-add-item"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Start a Stash
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Start your first stash. Set a savings goal, target date, and track
          your progress toward things you want to buy.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'sync-bookmarks',
    selector: '[data-tour="stash-sync-bookmarks"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Import from Bookmarks
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Already have items bookmarked in your browser? Sync them here to quickly
          import and convert them into savings goals.
        </p>
      </div>
    ),
    position: 'bottom',
  },
  {
    id: 'edit-item',
    selector: '[data-tour="stash-edit-item"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Edit Items
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Double-click any card or click the pencil icon to edit item details like
          name, amount, target date, or image.
        </p>
      </div>
    ),
    position: 'left',
  },
  {
    id: 'move-card',
    selector: '[data-tour="stash-move-card"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Rearrange Cards
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Drag cards by their image area to rearrange your stash. Put your
          most-wanted items front and center.
        </p>
      </div>
    ),
    position: 'right',
  },
  {
    id: 'resize-card',
    selector: '[data-tour="stash-resize-card"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Resize Cards
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Drag the bottom-right corner to resize cards. Make important items larger
          for emphasized visibility.
        </p>
      </div>
    ),
    position: 'top',
  },
  {
    id: 'pending-bookmarks',
    selector: '[data-tour="stash-pending-bookmarks"]',
    content: () => (
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Review Imported Bookmarks
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: 0 }}>
          Imported bookmarks appear here for review. Click &ldquo;Create Target&rdquo; to
          add one to your stash, or &ldquo;Skip&rdquo; to ignore it.
        </p>
      </div>
    ),
    position: 'bottom',
    action: () => {
      // Dispatch event to expand the pending section when this step is shown
      globalThis.dispatchEvent(new CustomEvent(EXPAND_PENDING_SECTION_EVENT));
    },
  },
];
