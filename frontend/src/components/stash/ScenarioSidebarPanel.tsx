/* eslint-disable max-lines */
/** Scenario Sidebar Panel - manages saved hypothesize scenarios */

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import { useDistributionMode, type SavedScenario } from '../../context/DistributionModeContext';
import { Z_INDEX } from '../../constants';

interface ScenarioItemProps {
  readonly scenario: SavedScenario;
  readonly onLoad: () => void;
  readonly onRequestDelete: () => void;
}

function ScenarioItem({ scenario, onLoad, onRequestDelete }: ScenarioItemProps) {
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
      }}
      onClick={onLoad}
      onKeyDown={(e) => e.key === 'Enter' && onLoad()}
      role="button"
      tabIndex={0}
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
          className="p-1.5 rounded-md transition-colors hover:bg-white/10"
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
}

function SaveInput({ onSave, onCancel }: SaveInputProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
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
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--monarch-bg-hover)',
            color: 'var(--monarch-text-dark)',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{
            backgroundColor: '#9333ea',
            color: '#fff',
          }}
        >
          Save
        </button>
      </div>
    </form>
  );
}

export function ScenarioSidebarPanel() {
  const {
    isScenarioSidebarOpen,
    setScenarioSidebarOpen,
    getSavedScenarios,
    scenarioNameExists,
    saveScenario,
    loadScenario,
    deleteScenario,
    hasChanges,
  } = useDistributionMode();

  const [scenariosKey, setScenariosKey] = useState(0);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);

  // Load scenarios - refresh when key changes or panel opens
  // scenariosKey changes after save/delete operations to trigger refresh
  const scenarios = useMemo(
    () => (isScenarioSidebarOpen ? getSavedScenarios() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scenariosKey triggers refresh
    [isScenarioSidebarOpen, getSavedScenarios, scenariosKey]
  );

  if (!isScenarioSidebarOpen) return null;

  const handleClose = () => {
    setScenarioSidebarOpen(false);
    setShowSaveInput(false);
    setConfirmLoad(null);
    setConfirmDelete(null);
    setConfirmOverwrite(null);
  };

  const handleSave = (name: string) => {
    // Check if name already exists and we haven't confirmed overwrite
    if (scenarioNameExists(name) && confirmOverwrite !== name) {
      setConfirmOverwrite(name);
      return;
    }
    saveScenario(name);
    setScenariosKey((k) => k + 1); // Trigger refresh
    setShowSaveInput(false);
    setConfirmOverwrite(null);
  };

  const handleLoad = (id: string) => {
    if (hasChanges && confirmLoad !== id) {
      setConfirmLoad(id);
      return;
    }
    loadScenario(id);
    handleClose();
  };

  const handleDelete = (id: string) => {
    deleteScenario(id);
    setScenariosKey((k) => k + 1); // Trigger refresh
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

              {scenarios.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
                  <Icons.FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved scenarios yet</p>
                  <p className="text-xs mt-1">Save your current allocation to create one</p>
                </div>
              ) : (
                scenarios.map((scenario) => (
                  <ScenarioItem
                    key={scenario.id}
                    scenario={scenario}
                    onLoad={() => handleLoad(scenario.id)}
                    onRequestDelete={() => setConfirmDelete(scenario.id)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--monarch-border)' }}>
              {showSaveInput ? (
                <SaveInput onSave={handleSave} onCancel={() => setShowSaveInput(false)} />
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
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-bg-hover)',
                    color: 'var(--monarch-text-dark)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(confirmOverwrite!)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#9333ea',
                    color: '#fff',
                  }}
                >
                  Overwrite
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
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-bg-hover)',
                    color: 'var(--monarch-text-dark)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete!)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-error)',
                    color: '#fff',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
