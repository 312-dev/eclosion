/**
 * Demo Stash API
 *
 * LocalStorage-based implementation of stash API for demo mode.
 * Re-exports from specialized modules and provides layout/sync operations.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type { StashData, StashItem, StashLayoutUpdate, StashSyncResult } from '../../types';
import { calculateProgressPercent, calculateShortfall } from '../../utils/savingsCalculations';
import { recomputeItem, recomputeTotals } from './demoStashUtils';

// Re-export CRUD operations
export {
  createStashItem,
  updateStashItem,
  archiveStashItem,
  unarchiveStashItem,
  deleteStashItem,
  completeStashItem,
  uncompleteStashItem,
} from './demoStashCrud';

// Re-export pending bookmarks operations
export {
  getPendingBookmarks,
  getPendingCount,
  getSkippedBookmarks,
  skipPendingBookmark,
  convertPendingBookmark,
  importBookmarks,
  clearUnconvertedBookmarks,
} from './demoStashPending';

// Re-export config operations
export {
  getStashCategoryGroups,
  getStashConfig,
  updateStashConfig,
  fetchOgImage,
} from './demoStashConfig';

/**
 * Get all stash data.
 */
export async function getStash(): Promise<StashData> {
  await simulateDelay();
  const state = getDemoState();
  return recomputeTotals(state.stash);
}

/**
 * Calculate status based on balance, budget, target amount, and monthly target.
 */
function calculateBudgetStatus(
  balance: number,
  budget: number,
  targetAmount: number,
  monthlyTarget: number
): StashItem['status'] {
  if (balance >= targetAmount) return 'funded';
  if (budget > monthlyTarget) return 'ahead';
  if (budget >= monthlyTarget) return 'on_track';
  return 'behind';
}

/**
 * Allocate funds to a stash item (update budget).
 * Also updates dashboard.ready_to_assign to reflect the budget change.
 */
export async function allocateStashFunds(
  id: string,
  amount: number
): Promise<{ success: boolean; id: string; new_budget: number }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const item = state.stash.items[itemIndex]!;
    // Calculate delta: how much new money is being allocated
    const delta = amount - item.planned_budget;
    const newBalance = item.current_balance + delta;
    const updatedItem: StashItem = {
      ...item,
      planned_budget: amount,
      current_balance: newBalance,
      status: calculateBudgetStatus(newBalance, amount, item.amount, item.monthly_target),
      progress_percent: calculateProgressPercent(newBalance, item.amount),
      shortfall: calculateShortfall(newBalance, item.amount),
    };

    const newItems = [...state.stash.items];
    newItems[itemIndex] = updatedItem;

    return {
      ...state,
      stash: {
        ...state.stash,
        items: newItems,
        total_saved: newItems.reduce((sum, i) => sum + i.current_balance, 0),
      },
      // Update ready_to_assign to reflect the budget change (same as recurring allocation)
      dashboard: {
        ...state.dashboard,
        ready_to_assign: {
          ...state.dashboard.ready_to_assign,
          ready_to_assign: state.dashboard.ready_to_assign.ready_to_assign - delta,
        },
      },
    };
  });

  return { success: true, id, new_budget: amount };
}

/**
 * Change category group for a stash item.
 */
export async function changeStashGroup(
  id: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const newItems = [...state.stash.items];
    newItems[itemIndex] = {
      ...newItems[itemIndex]!,
      category_group_id: groupId,
      category_group_name: groupName,
    };

    return { ...state, stash: { ...state.stash, items: newItems } };
  });

  return { success: true, id };
}

/**
 * Link a category to an existing stash item.
 */
export async function linkStashCategory(
  id: string,
  params: { categoryGroupId?: string; existingCategoryId?: string }
): Promise<{
  success: boolean;
  id: string;
  category_id: string;
  category_name: string;
  category_group_id: string;
  category_group_name: string;
  monthly_target?: number;
}> {
  await simulateDelay();

  let categoryId = '';
  let categoryName = '';
  let categoryGroupId = '';
  let categoryGroupName = '';

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const item = state.stash.items[itemIndex]!;
    categoryId = params.existingCategoryId || `demo-cat-${Date.now()}`;
    categoryName = params.existingCategoryId ? 'Existing Category' : item.name;
    categoryGroupId = params.categoryGroupId || 'demo-group';
    categoryGroupName = params.categoryGroupId ? 'Savings Goals' : 'Demo Group';

    const newItems = [...state.stash.items];
    newItems[itemIndex] = {
      ...item,
      category_id: categoryId,
      category_name: categoryName,
      category_group_id: categoryGroupId,
      category_group_name: categoryGroupName,
    };

    return { ...state, stash: { ...state.stash, items: newItems } };
  });

  return {
    success: true,
    id,
    category_id: categoryId,
    category_name: categoryName,
    category_group_id: categoryGroupId,
    category_group_name: categoryGroupName,
  };
}

/**
 * Reorder stash items.
 * @deprecated Use updateStashLayouts for grid-based positioning
 */
export async function reorderStashItems(itemIds: string[]): Promise<{ success: boolean }> {
  await simulateDelay();

  updateDemoState((state) => {
    const getSortOrder = (id: string) => {
      const index = itemIds.indexOf(id);
      return index === -1 ? itemIds.length : index;
    };

    const items = state.stash.items
      .map((item) => ({ ...item, sort_order: getSortOrder(item.id) }))
      .sort((a, b) => a.sort_order - b.sort_order);

    return { ...state, stash: { ...state.stash, items } };
  });

  return { success: true };
}

/**
 * Apply layout updates to a list of items.
 */
function applyLayoutUpdates(
  items: StashItem[],
  layouts: StashLayoutUpdate[]
): { items: StashItem[]; count: number } {
  let count = 0;
  const updatedItems = items.map((item) => {
    const layout = layouts.find((l) => l.id === item.id);
    if (!layout) return item;
    count++;
    return {
      ...item,
      grid_x: layout.grid_x,
      grid_y: layout.grid_y,
      col_span: layout.col_span,
      row_span: layout.row_span,
    };
  });
  return { items: updatedItems, count };
}

/**
 * Update grid layout positions for stash items.
 */
export async function updateStashLayouts(
  layouts: StashLayoutUpdate[]
): Promise<{ success: boolean; updated: number }> {
  await simulateDelay();

  let updated = 0;

  updateDemoState((state) => {
    const activeResult = applyLayoutUpdates(state.stash.items, layouts);
    const archivedResult = applyLayoutUpdates(state.stash.archived_items, layouts);
    updated = activeResult.count + archivedResult.count;

    return {
      ...state,
      stash: {
        ...state.stash,
        items: activeResult.items,
        archived_items: archivedResult.items,
      },
    };
  });

  return { success: true, updated };
}

/**
 * Sync stash data (simulate pulling from Monarch).
 */
export async function syncStash(): Promise<StashSyncResult> {
  await simulateDelay(500);

  const state = getDemoState();
  const newlyFunded: string[] = [];

  const updatedItems = state.stash.items.map((item) => {
    const recomputed = recomputeItem(item);
    if (recomputed.status === 'funded' && item.status !== 'funded') {
      newlyFunded.push(item.id);
    }
    return recomputed;
  });

  updateDemoState((s) => ({
    ...s,
    stash: recomputeTotals({ ...s.stash, items: updatedItems }),
  }));

  return { success: true, items_updated: updatedItems.length, newly_funded: newlyFunded };
}
