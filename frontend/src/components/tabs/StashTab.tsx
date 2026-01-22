/**
 * Stash Tab
 *
 * Displays stash items for savings goals with bookmark sync support.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePageTitle, useBookmarks, useStashSync } from '../../hooks';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import {
  NewStashModal,
  EditStashModal,
  StashWidgetGrid,
  PendingReviewSection,
  IgnoredBookmarksSection,
  StashHeader,
  ArchivedItemsSection,
  BrowserSetupModal,
  AvailableToStash,
  StashReportsView,
  decodeHtmlEntities,
} from '../stash';
import { Icons } from '../icons';
import { EXPAND_PENDING_SECTION_EVENT } from '../layout/stashTourSteps';
import {
  useStashQuery,
  useStashConfigQuery,
  usePendingBookmarksQuery,
  usePendingCountQuery,
  useSkippedBookmarksQuery,
  useSkipPendingMutation,
  useConvertPendingMutation,
  useAllocateStashMutation,
  useUpdateStashLayoutMutation,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import type { StashItem, StashLayoutUpdate, PendingBookmark } from '../../types';

interface ModalPrefill {
  name?: string;
  sourceUrl?: string;
  sourceBookmarkId?: string;
}

export function StashTab() {
  usePageTitle('Stashes');
  const toast = useToast();

  // Tab state
  const [activeView, setActiveView] = useState<'stashes' | 'reports'>('stashes');

  // Queries
  const { data: configData, isLoading: configLoading } = useStashConfigQuery();
  const { data: stashData, isLoading, error } = useStashQuery();
  const { data: pendingBookmarks = [] } = usePendingBookmarksQuery();
  const { data: _pendingCount = 0 } = usePendingCountQuery();
  const { data: skippedBookmarks = [] } = useSkippedBookmarksQuery();

  // Mutations
  const skipPendingMutation = useSkipPendingMutation();
  const convertPendingMutation = useConvertPendingMutation();
  const allocateMutation = useAllocateStashMutation();
  const layoutMutation = useUpdateStashLayoutMutation();

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StashItem | null>(null);
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | undefined>(undefined);
  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const [isIgnoredExpanded, setIsIgnoredExpanded] = useState(false);
  const [selectedPendingBookmark, setSelectedPendingBookmark] = useState<PendingBookmark | null>(
    null
  );
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [showBrowserSetupWizard, setShowBrowserSetupWizard] = useState(false);
  const [allocatingItemId, setAllocatingItemId] = useState<string | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement>(null);

  const isBrowserConfigured =
    !!configData?.selectedBrowser && (configData?.selectedFolderIds?.length ?? 0) > 0;

  const { isSyncing, syncBookmarks } = useStashSync({
    selectedBrowser: configData?.selectedBrowser ?? null,
    selectedFolderIds: configData?.selectedFolderIds ?? null,
    isBrowserConfigured,
    onShowSetupWizard: () => setShowBrowserSetupWizard(true),
  });
  const { onBookmarkChange } = useBookmarks();

  // Subscribe to new bookmark additions
  useEffect(() => {
    if (!isBrowserConfigured) return;
    const unsubscribe = onBookmarkChange((change) => {
      if (change.changeType === 'added' && change.bookmark.url) {
        setModalPrefill({
          name: decodeHtmlEntities(change.bookmark.name),
          sourceUrl: decodeHtmlEntities(change.bookmark.url),
          sourceBookmarkId: change.bookmark.id,
        });
        setIsAddModalOpen(true);
        toast.success(`New bookmark detected: ${change.bookmark.name}`);
      }
    });
    return unsubscribe;
  }, [isBrowserConfigured, onBookmarkChange, toast]);

  // Listen for tour event
  useEffect(() => {
    const handler = () => setIsPendingExpanded(true);
    globalThis.addEventListener(EXPAND_PENDING_SECTION_EVENT, handler);
    return () => globalThis.removeEventListener(EXPAND_PENDING_SECTION_EVENT, handler);
  }, []);

  const { activeItems, archivedItems } = useMemo(() => {
    if (!stashData) return { activeItems: [], archivedItems: [] };
    return {
      activeItems: stashData.items.filter((item) => !item.is_archived),
      archivedItems: stashData.archived_items,
    };
  }, [stashData]);

  const handleEdit = useCallback((item: StashItem) => setEditingItem(item), []);

  const handleAllocate = useCallback(
    async (itemId: string, amount: number) => {
      setAllocatingItemId(itemId);
      try {
        await allocateMutation.mutateAsync({ id: itemId, amount });
      } catch (err) {
        toast.error(handleApiError(err, 'Allocating funds'));
      } finally {
        setAllocatingItemId(null);
      }
    },
    [allocateMutation, toast]
  );

  const handleLayoutChange = useCallback(
    (layouts: StashLayoutUpdate[]) => layoutMutation.mutate(layouts),
    [layoutMutation]
  );

  const handleSkipPending = useCallback(
    async (id: string) => {
      const item = pendingBookmarks.find((b) => b.id === id);
      setSkippingIds((prev) => new Set(prev).add(id));
      try {
        await skipPendingMutation.mutateAsync(id);
        toast.info(`Skipped "${item?.name ?? 'bookmark'}"`);
      } catch (err) {
        toast.error(handleApiError(err, 'Skipping bookmark'));
      } finally {
        setSkippingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [pendingBookmarks, skipPendingMutation, toast]
  );

  const handleCreateTarget = useCallback((item: PendingBookmark) => {
    setSelectedPendingBookmark(item);
    setModalPrefill({
      name: decodeHtmlEntities(item.name),
      sourceUrl: decodeHtmlEntities(item.url),
      sourceBookmarkId: item.bookmark_id,
    });
    setIsAddModalOpen(true);
  }, []);

  const handlePendingConverted = useCallback(
    async (pendingId: string) => {
      try {
        await convertPendingMutation.mutateAsync(pendingId);
        setSelectedPendingBookmark(null);
      } catch (err) {
        toast.error(handleApiError(err, 'Converting pending bookmark'));
      }
    },
    [convertPendingMutation, toast]
  );

  if (configLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content-enter px-6 pb-6">
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <Icons.AlertCircle
            size={48}
            className="mx-auto mb-4"
            style={{ color: 'var(--monarch-warning)' }}
          />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Error Loading Stashes
          </h2>
          <p style={{ color: 'var(--monarch-text-muted)' }}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content-enter px-6 pb-6 max-w-7xl mx-auto">
      <StashHeader
        selectedBrowser={configData?.selectedBrowser ?? null}
        isBrowserConfigured={isBrowserConfigured}
        isSyncingBookmarks={isSyncing}
        onSyncBookmarks={syncBookmarks}
        onAddItem={() => setIsAddModalOpen(true)}
      />

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
        <button
          onClick={() => setActiveView('stashes')}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color:
              activeView === 'stashes' ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
            borderBottom:
              activeView === 'stashes'
                ? '2px solid var(--monarch-primary)'
                : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          Stashes
        </button>
        <button
          onClick={() => setActiveView('reports')}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color:
              activeView === 'reports' ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
            borderBottom:
              activeView === 'reports'
                ? '2px solid var(--monarch-primary)'
                : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          Reports
        </button>
      </div>

      {activeView === 'stashes' ? (
        <>
          <div className="mb-6">
            <AvailableToStash />
          </div>
          {pendingBookmarks.length > 0 && (
            <div ref={pendingSectionRef}>
              <PendingReviewSection
                isExpanded={isPendingExpanded}
                onToggle={() => setIsPendingExpanded(!isPendingExpanded)}
                pendingItems={pendingBookmarks}
                onSkip={handleSkipPending}
                onCreateTarget={handleCreateTarget}
                skippingIds={skippingIds}
              />
            </div>
          )}
          <div className="mb-6 w-full">
            <StashWidgetGrid
              items={activeItems}
              onEdit={handleEdit}
              onAllocate={handleAllocate}
              onLayoutChange={handleLayoutChange}
              allocatingItemId={allocatingItemId}
              emptyMessage="No stashes yet. Start your first stash to begin saving!"
            />
          </div>
          <ArchivedItemsSection
            items={archivedItems}
            onEdit={handleEdit}
            onAllocate={handleAllocate}
            allocatingItemId={allocatingItemId}
          />
          <IgnoredBookmarksSection
            items={skippedBookmarks}
            onCreateTarget={handleCreateTarget}
            isExpanded={isIgnoredExpanded}
            onToggle={() => setIsIgnoredExpanded(!isIgnoredExpanded)}
          />
        </>
      ) : (
        <StashReportsView />
      )}
      <NewStashModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalPrefill(undefined);
          setSelectedPendingBookmark(null);
        }}
        onSuccess={() => {}}
        {...(modalPrefill && { prefill: modalPrefill })}
        {...(selectedPendingBookmark && { pendingBookmarkId: selectedPendingBookmark.id })}
        onPendingConverted={handlePendingConverted}
      />
      <EditStashModal
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        item={editingItem}
      />
      <BrowserSetupModal
        isOpen={showBrowserSetupWizard}
        onClose={() => setShowBrowserSetupWizard(false)}
        onComplete={() => setShowBrowserSetupWizard(false)}
      />
    </div>
  );
}
