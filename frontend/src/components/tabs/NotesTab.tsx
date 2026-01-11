/**
 * Notes Tab
 *
 * Main tab for monthly notes feature.
 * Displays category tree with notes, general month notes, and archived notes.
 */

import { useState, useMemo } from 'react';
import { FileDown } from 'lucide-react';
import { MonthNavigator, CategoryTree, GeneralMonthNotes, ArchivedNotesSection } from '../notes';
import { ReaderView } from '../notes/ReaderView';
import { useMonthNotesQuery, useArchivedNotesQuery } from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks';
import { formatDateTime } from '../../utils';
import type { MonthKey } from '../../types/notes';

/**
 * Get current month key
 */
function getCurrentMonthKey(): MonthKey {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function NotesTab() {
  const [currentMonth, setCurrentMonth] = useState<MonthKey>(getCurrentMonthKey());
  const [activeTab, setActiveTab] = useState<'notes' | 'reader'>('notes');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toast = useToast();

  // Set page title
  usePageTitle('Notes');

  // Fetch month notes data
  const { data: monthData, isLoading: isLoadingMonth } = useMonthNotesQuery(currentMonth);
  const { data: archivedNotes, isLoading: isLoadingArchived } = useArchivedNotesQuery();

  // Initialize expanded groups when data loads
  useMemo(() => {
    if (monthData?.groups && expandedGroups.size === 0) {
      // Expand first 3 groups by default
      const initial = new Set(monthData.groups.slice(0, 3).map(g => g.id));
      setExpandedGroups(initial);
    }
  }, [monthData?.groups, expandedGroups.size]);

  const handleToggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (monthData?.groups) {
      setExpandedGroups(new Set(monthData.groups.map(g => g.id)));
    }
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleExportPdf = () => {
    // TODO: Implement PDF export modal
    toast.info('PDF export coming soon');
  };

  // Loading state
  if (isLoadingMonth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div style={{ color: 'var(--monarch-text-muted)' }}>Loading notes...</div>
      </div>
    );
  }

  const lastUpdated = monthData?.metadata.lastUpdatedAt;
  const hasNotes = monthData?.groups.some(g =>
    g.effectiveNote.note || g.categories.some(c => c.effectiveNote.note)
  ) || monthData?.generalNote;

  return (
    <div className="notes-tab-layout tab-content-enter">
      {/* Month Navigator */}
      <MonthNavigator
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Last updated and export button */}
      <div className="flex items-center justify-between py-3">
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {lastUpdated ? (
            <>Last updated: {formatDateTime(lastUpdated)}</>
          ) : (
            <>No notes for this month</>
          )}
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-[var(--monarch-bg-hover)] transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Export notes as PDF"
        >
          <FileDown size={16} />
          Export PDF
        </button>
      </div>

      {/* Main content */}
      {activeTab === 'notes' ? (
        <div className="notes-content-layout">
          {/* Left: Category notes */}
          <div className="notes-main-content">
            <CategoryTree
              groups={monthData?.groups ?? []}
              expandedGroups={expandedGroups}
              onToggleGroup={handleToggleGroup}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              currentMonth={currentMonth}
            />

            {/* Archived notes section */}
            {!isLoadingArchived && archivedNotes && archivedNotes.length > 0 && (
              <ArchivedNotesSection notes={archivedNotes} />
            )}
          </div>

          {/* Right: General month notes sidebar */}
          <aside className="notes-sidebar hidden lg:block">
            <GeneralMonthNotes
              monthKey={currentMonth}
              note={monthData?.generalNote ?? null}
            />
          </aside>
        </div>
      ) : (
        <ReaderView
          monthKey={currentMonth}
          groups={monthData?.groups ?? []}
          generalNote={monthData?.generalNote ?? null}
          hasNotes={hasNotes ?? false}
        />
      )}

      {/* Mobile: General notes shown below (only in notes tab) */}
      {activeTab === 'notes' && (
        <div className="lg:hidden mt-6">
          <GeneralMonthNotes
            monthKey={currentMonth}
            note={monthData?.generalNote ?? null}
          />
        </div>
      )}
    </div>
  );
}
