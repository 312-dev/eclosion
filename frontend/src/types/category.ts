/**
 * Category Types
 *
 * Types for Monarch Money categories and category operations.
 */

export interface CategoryGroup {
  id: string;
  name: string;
}

/**
 * Rollover period configuration for a category group
 */
export interface CategoryGroupRolloverPeriod {
  /** Rollover period ID */
  id: string;
  /** Start month for rollover (YYYY-MM-DD) */
  start_month: string;
  /** End month for rollover if set (YYYY-MM-DD) */
  end_month: string | null;
  /** Starting balance when rollover was enabled */
  starting_balance: number;
  /** Rollover type (e.g., "monthly") */
  type: string | null;
  /** Rollover frequency */
  frequency: string | null;
  /** Target amount if set */
  target_amount: number | null;
}

/**
 * Category group with full metadata including rollover/flexible settings
 */
export interface CategoryGroupDetailed {
  /** Category group ID */
  id: string;
  /** Group display name */
  name: string;
  /** Group type (expense, income, etc.) */
  type: string | null;
  /** Display order */
  order: number | null;
  /** Budget variability - "fixed" or "flexible" */
  budget_variability: 'fixed' | 'flexible' | null;
  /** Whether budgets are set at group level instead of per-category */
  group_level_budgeting_enabled: boolean;
  /** Whether rollover is enabled for this group */
  rollover_enabled: boolean;
  /** Rollover period configuration if enabled */
  rollover_period: CategoryGroupRolloverPeriod | null;
}

/**
 * Request to update category group settings
 */
export interface UpdateCategoryGroupSettingsRequest {
  /** Category group ID to update */
  group_id: string;
  /** Optional new name */
  name?: string;
  /** Optional budget variability setting */
  budget_variability?: 'fixed' | 'flexible';
  /** Optional group-level budgeting toggle */
  group_level_budgeting_enabled?: boolean;
  /** Optional rollover enable/disable */
  rollover_enabled?: boolean;
  /** Optional rollover start month (YYYY-MM-DD) */
  rollover_start_month?: string;
  /** Optional rollover starting balance */
  rollover_starting_balance?: number;
  /** Optional rollover type (e.g., "monthly") */
  rollover_type?: string;
}

export interface UnmappedCategory {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  icon?: string;
  group_order: number;
  category_order: number;
  /** @deprecated No longer returned by backend - kept for backwards compatibility */
  planned_budget?: number;
}

export interface LinkCategoryResult {
  success: boolean;
  category_id?: string;
  category_name?: string;
  sync_name?: boolean;
  enabled?: boolean;
  error?: string;
}

export interface DeletableCategory {
  recurring_id: string;
  category_id: string;
  name: string;
  group_name: string | null;
  is_rollup?: boolean;
  planned_budget?: number;
}

export interface DeletableCategoriesResult {
  categories: DeletableCategory[];
  count: number;
}

export interface DeleteCategoriesResult {
  success: boolean;
  deleted: { category_id: string; name: string }[];
  failed: { category_id: string; name: string; error: string }[];
  deleted_count: number;
  failed_count: number;
  total_attempted: number;
  state_reset: boolean;
}

export interface ResetDedicatedResult {
  success: boolean;
  deleted: { category_id: string; name: string }[];
  failed: { category_id: string; name: string; error: string }[];
  deleted_count: number;
  failed_count: number;
  total_attempted: number;
  items_disabled: number;
}

export interface ResetRollupResult {
  success: boolean;
  deleted_category: boolean;
  items_disabled: number;
  error?: string | null;
}
