/* eslint-disable max-lines */
/** Scenario Sidebar Panel - manages saved hypothesize scenarios */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { Z_INDEX } from '../../constants';
import {
  useHypothesesQuery,
  useSaveHypothesisMutation,
  useDeleteHypothesisMutation,
} from '../../api/queries/stashQueries';
import type { StashHypothesis, SaveHypothesisRequest } from '../../types';

interface ScenarioItemProps {
  readonly scenario: StashHypothesis;
  readonly onLoad: () => void;
  readonly onRequestDelete: () => void;
  readonly isDeleting?: boolean;
}

function ScenarioItem({ scenario, onLoad, onRequestDelete, isDeleting }: ScenarioItemProps) {
  const date = new Date(scenario.updatedAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    .toLowerCase();

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Card-style button
    <div
      className="rounded-lg p-3 cursor-pointer transition-colors hover:bg-white/5"
      style={{
        backgroundColor: 'var(--monarch-bg-elevated)',
        border: '1px solid var(--monarch-border)',
        opacity: isDeleting ? 0.5 : 1,
      }}
      onClick={isDeleting ? undefined : onLoad}
      onKeyDown={(e) => !isDeleting && e.key === 'Enter' && onLoad()}
      role="button"
      tabIndex={isDeleting ? -1 : 0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
            {scenario.name}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
            Saved {formattedDate}, {formattedTime}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          disabled={isDeleting}
          className="p-1.5 rounded-md transition-colors hover:bg-white/10 disabled:opacity-50"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Delete scenario"
        >
          <Icons.Trash size={16} />
        </button>
      </div>
    </div>
  );
}

interface SaveInputProps {
  readonly onSave: (name: string) => void;
  readonly onCancel: () => void;
  readonly isSaving?: boolean;
}

function SaveInput({ onSave, onCancel, isSaving }: SaveInputProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isSaving) {
      onSave(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Scenario name..."
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{
          backgroundColor: 'var(--monarch-bg-elevated)',
          border: '1px solid var(--monarch-border)',
          color: 'var(--monarch-text-dark)',
        }}
        maxLength={50}
        disabled={isSaving}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--monarch-bg-hover)',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isSaving}
          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{
            backgroundColor: '#9333ea',
            color: '#fff',
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export function ScenarioSidebarPanel() {
  const {
    isScenarioSidebarOpen,
    setScenarioSidebarOpen,
    hasChanges,
    // State getters for building save request
    stashedAllocations,
    monthlyAllocations,
    customAvailableFunds,
    customLeftToBudget,
    timelineEvents,
    itemApys,
    totalStashedAllocated,
    totalMonthlyAllocated,
    // Scenario loading/saving
    loadScenarioState,
    loadedScenarioId,
    markScenarioAsSaved,
  } = useDistributionMode();

  // React Query hooks for persistence
  const { data: scenarios = [], isLoading } = useHypothesesQuery();
  const saveMutation = useSaveHypothesisMutation();
  const deleteMutation = useDeleteHypothesisMutation();

  const [showSaveInput, setShowSaveInput] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);

  if (!isScenarioSidebarOpen) return null;

  const handleClose = () => {
    setScenarioSidebarOpen(false);
    setShowSaveInput(false);
    setConfirmLoad(null);
    setConfirmDelete(null);
    setConfirmOverwrite(null);
  };

  // Build save request from current context state
  const buildSaveRequest = (name: string): SaveHypothesisRequest => {
    // Transform NamedEvent[] to StashEventsMap
    const eventsMap: Record<
      string,
      Array<{ id: string; type: '1x' | 'mo'; amount: number; month: string }>
    > = {};
    for (const event of timelineEvents) {
      const itemId = event.itemId;
      eventsMap[itemId] ??= [];
      eventsMap[itemId].push({
        id: event.id,
        type: event.type === 'deposit' ? '1x' : 'mo',
        amount: event.amount,
        month: event.date,
      });
    }

    return {
      name,
      savingsAllocations: stashedAllocations,
      savingsTotal: totalStashedAllocated,
      monthlyAllocations,
      monthlyTotal: totalMonthlyAllocated,
      events: eventsMap,
      customAvailableFunds,
      customLeftToBudget,
      itemApys,
    };
  };

  const handleSave = async (name: string) => {
    // Check if name already exists
    const existingScenario = scenarios.find((s) => s.name.toLowerCase() === name.toLowerCase());
    // Only show overwrite warning if:
    // 1. There's an existing scenario with this name
    // 2. We haven't already confirmed overwrite
    // 3. This is NOT the scenario we loaded (it's fine to save over your own loaded scenario)
    const isOverwritingOwnScenario = existingScenario?.id === loadedScenarioId;
    if (existingScenario && confirmOverwrite !== name && !isOverwritingOwnScenario) {
      setConfirmOverwrite(name);
      return;
    }

    const request = buildSaveRequest(name);
    const result = await saveMutation.mutateAsync(request);
    // Update context to reflect saved state
    if (result.success && result.id) {
      markScenarioAsSaved(result.id, name);
    }
    setShowSaveInput(false);
    setConfirmOverwrite(null);
  };

  const handleLoad = (id: string) => {
    if (hasChanges && confirmLoad !== id) {
      setConfirmLoad(id);
      return;
    }

    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) return;

    // Transform API events format back to NamedEvent[]
    const timelineEventsToLoad: Array<{
      id: string;
      name: string;
      type: 'deposit' | 'rate_change';
      date: string;
      itemId: string;
      amount: number;
      createdAt: string;
    }> = [];
    for (const [itemId, events] of Object.entries(scenario.events)) {
      for (const event of events) {
        timelineEventsToLoad.push({
          id: event.id ?? crypto.randomUUID(),
          name: '', // Events don't have names stored in API
          type: event.type === '1x' ? 'deposit' : 'rate_change',
          date: event.month,
          itemId,
          amount: event.amount,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Load scenario into context state (including timeline events and APYs)
    loadScenarioState({
      id: scenario.id,
      name: scenario.name,
      stashedAllocations: scenario.savingsAllocations,
      monthlyAllocations: scenario.monthlyAllocations,
      customAvailableFunds: scenario.customAvailableFunds,
      customLeftToBudget: scenario.customLeftToBudget,
      timelineEvents: timelineEventsToLoad,
      itemApys: scenario.itemApys,
    });

    handleClose();
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setConfirmDelete(null);
  };

  const scenarioToDelete = confirmDelete ? scenarios.find((s) => s.id === confirmDelete) : null;

  const scenarioToOverwrite = confirmOverwrite
    ? scenarios.find((s) => s.name.toLowerCase() === confirmOverwrite.toLowerCase())
    : null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0" style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Sidebar Panel */}
          <div
            className="absolute top-0 right-0 h-full w-80 max-w-full flex flex-col shadow-2xl animate-slide-in-right"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              zIndex: Z_INDEX.MODAL,
            }}
          >
            {/* Purple Header */}
            <div
              className="px-4 py-5 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icons.FlaskConical size={20} style={{ color: '#fff' }} />
                  <h2 className="text-lg font-semibold text-white">Saved Scenarios</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-md hover:bg-white/20 transition-colors"
                  aria-label="Close panel"
                >
                  <Icons.X size={20} style={{ color: '#fff' }} />
                </button>
              </div>
              <p className="text-sm mt-1 text-white/80">
                Load a scenario or save the current allocation
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {confirmLoad && (
                <div
                  className="rounded-lg p-3 mb-3"
                  style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid var(--monarch-warning)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--monarch-warning)' }}>
                    You have unsaved changes. Loading a scenario will discard them.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setConfirmLoad(null)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md"
                      style={{
                        backgroundColor: 'var(--monarch-bg-hover)',
                        color: 'var(--monarch-text-dark)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleLoad(confirmLoad)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md"
                      style={{
                        backgroundColor: 'var(--monarch-warning)',
                        color: '#000',
                      }}
                    >
                      Load Anyway
                    </button>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3"
                      style={{
                        backgroundColor: 'var(--monarch-bg-page)',
                        border: '1px solid var(--monarch-border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="h-4 w-32 rounded skeleton" />
                        <div className="h-6 w-6 rounded skeleton shrink-0" />
                      </div>
                      <div className="h-3 w-24 rounded skeleton mb-2" />
                      <div className="h-7 w-full rounded skeleton" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && scenarios.length === 0 && (
                <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
                  <Icons.FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved scenarios yet</p>
                  <p className="text-xs mt-1">Save your current allocation to create one</p>
                </div>
              )}

              {!isLoading &&
                scenarios.map((scenario) => (
                  <ScenarioItem
                    key={scenario.id}
                    scenario={scenario}
                    onLoad={() => handleLoad(scenario.id)}
                    onRequestDelete={() => setConfirmDelete(scenario.id)}
                    isDeleting={
                      deleteMutation.isPending && deleteMutation.variables === scenario.id
                    }
                  />
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--monarch-border)' }}>
              {showSaveInput ? (
                <SaveInput
                  onSave={handleSave}
                  onCancel={() => setShowSaveInput(false)}
                  isSaving={saveMutation.isPending}
                />
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#9333ea',
                    color: '#fff',
                  }}
                >
                  <Icons.Save size={16} />
                  Save Current
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Overwrite confirmation modal (separate portal to appear above sidebar) */}
      {scenarioToOverwrite &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: Z_INDEX.MODAL + 10 }}
          >
            {/* Modal backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                setConfirmOverwrite(null);
                setShowSaveInput(false);
              }}
              aria-hidden="true"
            />
            {/* Modal content */}
            <div
              className="relative rounded-xl p-5 shadow-2xl max-w-sm w-full mx-4 animate-scale-in"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid #9333ea',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(147, 51, 234, 0.15)' }}
                >
                  <Icons.Warning size={20} style={{ color: '#a855f7' }} />
                </div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  Overwrite Scenario?
                </h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
                A scenario named "
                <span style={{ color: 'var(--monarch-text-dark)' }}>
                  {scenarioToOverwrite.name}
                </span>
                " already exists. Do you want to replace it with your current allocation?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setConfirmOverwrite(null);
                    setShowSaveInput(false);
                  }}
                  disabled={saveMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--monarch-bg-hover)',
                    color: 'var(--monarch-text-dark)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(confirmOverwrite!)}
                  disabled={saveMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: '#9333ea',
                    color: '#fff',
                  }}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Overwrite'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete confirmation modal */}
      {scenarioToDelete &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: Z_INDEX.MODAL + 10 }}
          >
            {/* Modal backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setConfirmDelete(null)}
              aria-hidden="true"
            />
            {/* Modal content */}
            <div
              className="relative rounded-xl p-5 shadow-2xl max-w-sm w-full mx-4 animate-scale-in"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-error)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                >
                  <Icons.Trash size={20} style={{ color: 'var(--monarch-error)' }} />
                </div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  Delete Scenario?
                </h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
                Are you sure you want to delete "
                <span style={{ color: 'var(--monarch-text-dark)' }}>{scenarioToDelete.name}</span>"?
                This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--monarch-bg-hover)',
                    color: 'var(--monarch-text-dark)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete!)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--monarch-error)',
                    color: '#fff',
                  }}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
