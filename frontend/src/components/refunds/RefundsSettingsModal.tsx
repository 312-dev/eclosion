/**
 * RefundablesSettingsModal
 *
 * Tool settings modal for configuring the Refundables feature.
 * Allows setting the replacement tag and default checkbox state.
 */

import { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { SearchableSelect } from '../SearchableSelect';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { TransactionTag, RefundablesConfig } from '../../types/refundables';

interface RefundablesSettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly config: RefundablesConfig | undefined;
  readonly tags: TransactionTag[];
  readonly tagsLoading: boolean;
  readonly onSave: (updates: Partial<RefundablesConfig>) => void;
  readonly saving: boolean;
}

export function RefundablesSettingsModal({
  isOpen,
  onClose,
  config,
  tags,
  tagsLoading,
  onSave,
  saving,
}: RefundablesSettingsModalProps) {
  const [replacementTagId, setReplacementTagId] = useState(config?.replacementTagId ?? '');
  const [replaceByDefault, setReplaceByDefault] = useState(config?.replaceTagByDefault ?? true);
  const [agingWarningDays, setAgingWarningDays] = useState(config?.agingWarningDays ?? 30);

  const tagOptions = tags.map((tag) => ({
    value: tag.id,
    label: tag.name,
    icon: (
      <span
        className="w-2.5 h-2.5 rounded-full inline-block"
        style={{ backgroundColor: tag.color }}
      />
    ),
  }));

  // Add "None (remove tag)" option at the top
  const allOptions = [{ value: '', label: 'None (remove tag)', icon: undefined }, ...tagOptions];

  const handleSave = useCallback(() => {
    onSave({
      replacementTagId: replacementTagId || null,
      replaceTagByDefault: replaceByDefault,
      agingWarningDays,
    });
  }, [onSave, replacementTagId, replaceByDefault, agingWarningDays]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Refundables Settings"
      maxWidth="md"
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel="Save"
          isSubmitting={saving}
        />
      }
    >
      <div className="space-y-6">
        {/* Replacement tag */}
        <div>
          <h3 className="text-sm font-medium text-(--monarch-text-dark) mb-1">Tag Replacement</h3>
          <p className="text-xs text-(--monarch-text-muted) mb-3">
            When a refund is matched, replace or remove the original tag. Select &quot;None&quot; to
            remove the tag without replacing it.
          </p>
          <label className="block text-xs font-medium text-(--monarch-text-muted) mb-1">
            Replacement tag
          </label>
          {tagsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-(--monarch-text-muted)">Loading tags...</span>
            </div>
          ) : (
            <SearchableSelect
              value={replacementTagId}
              onChange={setReplacementTagId}
              options={allOptions}
              placeholder="Select a tag..."
              aria-label="Replacement tag"
              insideModal
            />
          )}
        </div>

        {/* Default checkbox state */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceByDefault}
              onChange={(e) => setReplaceByDefault(e.target.checked)}
              className="rounded border-(--monarch-border) text-(--monarch-orange) focus:ring-(--monarch-orange)"
            />
            <span className="text-sm text-(--monarch-text-dark)">
              {replacementTagId ? 'Replace' : 'Remove'} tag by default
            </span>
          </label>
          <p className="text-xs text-(--monarch-text-muted) mt-1 ml-6">
            When checked, the tag {replacementTagId ? 'replacement' : 'removal'} checkbox in the
            refund modal will be pre-checked.
          </p>
        </div>

        {/* Aging warning */}
        <div>
          <h3 className="text-sm font-medium text-(--monarch-text-dark) mb-1">Aging Warning</h3>
          <p className="text-xs text-(--monarch-text-muted) mb-3">
            Highlight unmatched transactions that are getting old. Rows gradually shift from orange
            to red as they approach the threshold. Set to 0 to disable.
          </p>
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-(--monarch-text-muted) whitespace-nowrap">
              Warning after
            </span>
            <input
              type="number"
              min={0}
              max={365}
              value={agingWarningDays}
              onChange={(e) =>
                setAgingWarningDays(Math.max(0, Math.min(365, Number(e.target.value) || 0)))
              }
              className="w-16 px-2 py-1 text-sm rounded border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) text-center"
              aria-label="Aging warning days"
            />
            <span className="text-xs font-medium text-(--monarch-text-muted)">days</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
