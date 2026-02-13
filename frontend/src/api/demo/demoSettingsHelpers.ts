/**
 * Demo Settings Helpers
 *
 * Shared utility functions for demo settings export/import.
 */

import type {
  ArchivedNote,
  BrowserType,
  CategoryReference,
  EclosionExport,
  GeneralMonthNote,
  Note,
  RefundsConfig,
  RefundsMatch,
  RefundsSavedView,
  StashEventsMap,
  StashExportItem,
  StashItem,
} from '../../types';
import { getDemoState, updateDemoState } from './demoState';

/** Build CategoryReference without undefined values (required for exactOptionalPropertyTypes) */
export function buildCategoryRef(
  type: 'group' | 'category',
  id: string,
  name: string,
  groupId: string | null,
  groupName: string | null
): CategoryReference {
  const ref: CategoryReference = { type, id, name };
  if (type === 'category' && groupId) ref.groupId = groupId;
  if (type === 'category' && groupName) ref.groupName = groupName;
  return ref;
}

/** Build StashItem with optional properties conditionally set */
export function buildStashItem(
  item: StashExportItem,
  index: number,
  baseOrder: number,
  isArchived: boolean,
  knownCategoryIds?: Set<string>
): StashItem {
  const canLink =
    item.monarch_category_id != null && knownCategoryIds?.has(item.monarch_category_id) === true;

  const stashItem: StashItem = {
    type: 'stash',
    id: `imported-${item.id}`,
    name: item.name,
    amount: item.amount,
    target_date: item.target_date,
    emoji: item.emoji,
    category_id: canLink ? item.monarch_category_id : null,
    category_name: canLink ? item.name : 'Unlinked',
    category_group_id: canLink ? (item.category_group_id ?? null) : null,
    category_group_name: item.category_group_name ?? null,
    is_archived: isArchived,
    is_enabled: !isArchived,
    status: 'behind',
    progress_percent: 0,
    months_remaining: isArchived ? 0 : 12,
    current_balance: 0,
    planned_budget: 0,
    rollover_amount: 0,
    credits_this_month: 0,
    monthly_target: isArchived || item.amount === null ? null : Math.ceil(item.amount / 12),
    shortfall: item.amount, // Can be null for open-ended goals
    sort_order: baseOrder + index,
    grid_x: item.grid_x,
    grid_y: item.grid_y,
    col_span: item.col_span,
    row_span: item.row_span,
    goal_type: 'one_time',
    created_at: new Date().toISOString(),
  };
  if (item.source_url) stashItem.source_url = item.source_url;
  if (item.logo_url) stashItem.logo_url = item.logo_url;
  if (isArchived) stashItem.archived_at = item.archived_at ?? new Date().toISOString();
  return stashItem;
}

/** Import notes tool data into demo state. */
export function importNotesTool(data: EclosionExport, imported: Record<string, boolean>): void {
  const notesData = data.tools.notes!;
  updateDemoState((state) => {
    const newNotes: Record<string, Note> = {};
    const newGeneralNotes: Record<string, GeneralMonthNote> = {};

    notesData.category_notes.forEach((note) => {
      const newId = `imported-${note.id}`;
      newNotes[newId] = {
        id: newId,
        categoryRef: buildCategoryRef(
          note.category_type,
          note.category_id,
          note.category_name,
          note.group_id,
          note.group_name
        ),
        monthKey: note.month_key,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      };
    });

    notesData.general_notes.forEach((note) => {
      newGeneralNotes[note.month_key] = {
        id: `imported-${note.id}`,
        monthKey: note.month_key,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      };
    });

    const newArchivedNotes: ArchivedNote[] = notesData.archived_notes.map((note) => {
      const archivedNote: ArchivedNote = {
        id: `imported-${note.id}`,
        categoryRef: buildCategoryRef(
          note.category_type,
          note.category_id,
          note.category_name,
          note.group_id,
          note.group_name
        ),
        monthKey: note.month_key,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        archivedAt: note.archived_at,
        originalCategoryName: note.original_category_name,
      };
      if (note.original_group_name) archivedNote.originalGroupName = note.original_group_name;
      return archivedNote;
    });

    return {
      ...state,
      notes: {
        ...state.notes,
        notes: { ...state.notes.notes, ...newNotes },
        generalNotes: { ...state.notes.generalNotes, ...newGeneralNotes },
        archivedNotes: [...state.notes.archivedNotes, ...newArchivedNotes],
        checkboxStates: { ...state.notes.checkboxStates, ...notesData.checkbox_states },
      },
    };
  });
  imported['notes'] = true;
}

/** Import stash tool data into demo state. */
export function importStashTool(
  data: EclosionExport,
  imported: Record<string, boolean>,
  warnings: string[]
): void {
  const stashData = data.tools.stash!;

  // Build set of known category IDs for auto-linking (before state update)
  const currentState = getDemoState();
  const knownCategoryIds = new Set<string>();
  for (const item of currentState.dashboard.items) {
    if (item.category_id) knownCategoryIds.add(item.category_id);
  }
  for (const item of currentState.stash.items) {
    if (item.category_id) knownCategoryIds.add(item.category_id);
  }

  updateDemoState((state) => {
    const newItems = stashData.items
      .filter((i) => !i.is_archived)
      .map((item, index) =>
        buildStashItem(item, index, state.stash.items.length, false, knownCategoryIds)
      );
    const newArchivedItems = stashData.items
      .filter((i) => i.is_archived)
      .map((item, index) =>
        buildStashItem(item, index, state.stash.archived_items.length, true, knownCategoryIds)
      );

    // Import hypotheses
    const existingHypotheses = state.stashHypotheses ?? [];
    const newHypotheses = (stashData.hypotheses ?? []).map((h) => ({
      id: `imported-${h.id}`,
      name: h.name,
      savingsAllocations: h.savings_allocations,
      savingsTotal: h.savings_total,
      monthlyAllocations: h.monthly_allocations,
      monthlyTotal: h.monthly_total,
      events: h.events as StashEventsMap,
      customAvailableFunds: h.custom_available_funds ?? null,
      customLeftToBudget: h.custom_left_to_budget ?? null,
      itemApys: h.item_apys ?? {},
      createdAt: h.created_at ?? new Date().toISOString(),
      updatedAt: h.updated_at ?? new Date().toISOString(),
    }));

    return {
      ...state,
      stash: {
        ...state.stash,
        items: [...state.stash.items, ...newItems],
        archived_items: [...state.stash.archived_items, ...newArchivedItems],
      },
      stashConfig: {
        ...state.stashConfig,
        isConfigured: stashData.config.is_configured,
        defaultCategoryGroupId: stashData.config.default_category_group_id ?? null,
        defaultCategoryGroupName: stashData.config.default_category_group_name ?? null,
        selectedBrowser: (stashData.config.selected_browser ?? null) as BrowserType | null,
        selectedFolderIds: stashData.config.selected_folder_ids ?? [],
        selectedFolderNames: stashData.config.selected_folder_names,
        autoArchiveOnBookmarkDelete: stashData.config.auto_archive_on_bookmark_delete,
        autoArchiveOnGoalMet: stashData.config.auto_archive_on_goal_met,
        includeExpectedIncome: stashData.config.include_expected_income ?? false,
        showMonarchGoals: stashData.config.show_monarch_goals ?? true,
      },
      stashHypotheses: [...existingHypotheses, ...newHypotheses],
    };
  });
  imported['stash'] = true;
  if (stashData.items.length > 0) {
    const allImported = [...stashData.items];
    const linkedCount = allImported.filter(
      (i) => i.monarch_category_id != null && knownCategoryIds.has(i.monarch_category_id)
    ).length;
    const unlinkedCount = allImported.length - linkedCount;
    if (unlinkedCount > 0) {
      warnings.push(
        `${unlinkedCount} imported stash(es) are unlinked and need to be connected to Monarch categories.`
      );
    }
    if (linkedCount > 0) {
      warnings.push(`${linkedCount} imported stash(es) were auto-linked to existing categories.`);
    }
  }
}

/** Import refunds tool data into demo state. */
export function importRefundsTool(data: EclosionExport, imported: Record<string, boolean>): void {
  const refundsData = data.tools.refunds!;
  updateDemoState((state) => {
    const newConfig: RefundsConfig = {
      replacementTagId: refundsData.config.replacement_tag_id,
      replaceTagByDefault: refundsData.config.replace_tag_by_default,
      agingWarningDays: refundsData.config.aging_warning_days,
      showBadge: refundsData.config.show_badge,
      hideMatchedTransactions: refundsData.config.hide_matched_transactions ?? false,
      hideExpectedTransactions: refundsData.config.hide_expected_transactions ?? false,
    };

    const newViews: RefundsSavedView[] = refundsData.views.map((view, index) => ({
      id: `imported-${view.id}`,
      name: view.name,
      tagIds: view.tag_ids,
      categoryIds: view.category_ids,
      sortOrder: state.refundsViews.length + index,
    }));

    const newMatches: RefundsMatch[] = refundsData.matches.map((match) => ({
      id: `imported-${match.original_transaction_id}`,
      originalTransactionId: match.original_transaction_id,
      refundTransactionId: match.refund_transaction_id,
      refundAmount: match.refund_amount,
      refundMerchant: match.refund_merchant,
      refundDate: match.refund_date,
      refundAccount: match.refund_account,
      skipped: match.skipped,
      expectedRefund: match.expected_refund,
      expectedDate: match.expected_date,
      expectedAccount: match.expected_account,
      expectedAccountId: match.expected_account_id,
      expectedNote: match.expected_note,
      expectedAmount: match.expected_amount,
      transactionData: null,
    }));

    return {
      ...state,
      refundsConfig: newConfig,
      refundsViews: [...state.refundsViews, ...newViews],
      refundsMatches: [...state.refundsMatches, ...newMatches],
    };
  });
  imported['refunds'] = true;
}
