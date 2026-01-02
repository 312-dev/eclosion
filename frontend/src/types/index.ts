export type ItemStatus =
  | 'on_track'
  | 'behind'
  | 'ahead'
  | 'funded'
  | 'due_now'
  | 'inactive'
  | 'disabled'
  | 'critical';

export interface RecurringItem {
  id: string;
  merchant_id: string | null;
  logo_url: string | null;
  is_stale: boolean;
  name: string;
  merchant_name?: string;  // Just the merchant name without date/frequency suffix
  category_name: string;
  frequency_label?: string;  // Human-readable frequency (e.g., "Monthly", "Yearly")
  category_id: string | null;
  category_group_name: string | null;
  category_missing: boolean;
  amount: number;
  frequency: string;
  frequency_months: number;
  next_due_date: string;
  months_until_due: number;
  current_balance: number;
  planned_budget: number;
  monthly_contribution: number;
  over_contribution: number;
  progress_percent: number;
  status: ItemStatus;
  is_enabled: boolean;
  ideal_monthly_rate: number;
  amount_needed_now: number;
  is_in_rollup?: boolean;
  emoji?: string;
  frozen_monthly_target: number;
  contributed_this_month: number;
  monthly_progress_percent: number;
}

export interface RollupItem {
  id: string;
  name: string;
  merchant_id: string | null;
  logo_url: string | null;
  amount: number;
  frequency: string;
  frequency_months: number;
  next_due_date: string;
  months_until_due: number;
  // Savings calculation fields (same as RecurringItem)
  current_balance: number;
  ideal_monthly_rate: number;
  frozen_monthly_target: number;
  contributed_this_month: number;
  monthly_progress_percent: number;
  progress_percent: number;
  status: ItemStatus;
  amount_needed_now: number;
}

export interface RollupData {
  enabled: boolean;
  items: RollupItem[];
  // Ideal rate is the stable rate (amount / frequency) summed across all items
  total_ideal_rate: number;
  // Frozen monthly is the actual catch-up aware rate summed across all items
  total_frozen_monthly: number;
  // Total target is the sum of all item amounts (what we're saving toward)
  total_target: number;
  // Total saved across all rollup items
  total_saved: number;
  // User-editable budget amount
  budgeted: number;
  // Balance in the shared rollup category
  current_balance: number;
  // Progress toward total_target
  progress_percent: number;
  category_id: string | null;
  emoji?: string;
  // Custom name for the rollup category (default: "Rollup Category")
  category_name?: string;
}

export interface Settings {
  auto_sync_new: boolean;
}

export interface DashboardSummary {
  total_monthly_contribution: number;
  total_saved: number;
  total_target: number;
  overall_progress: number;
  active_count: number;
  inactive_count: number;
}

export interface DashboardConfig {
  target_group_id: string | null;
  target_group_name: string | null;
  is_configured: boolean;
  auto_sync_new?: boolean;
  auto_track_threshold?: number | null;
  auto_update_targets?: boolean;
  user_first_name?: string | null;
}

export interface ReadyToAssign {
  ready_to_assign: number;
  planned_income: number;
  actual_income: number;
  planned_expenses: number;
  actual_expenses: number;
  planned_savings: number;
  remaining_income: number;
}

export interface RemovedItemNotice {
  id: string;
  recurring_id: string;
  name: string;
  category_name: string;
  was_rollup: boolean;
  removed_at: string;
}

export interface DashboardData {
  items: RecurringItem[];
  summary: DashboardSummary;
  config: DashboardConfig;
  last_sync: string | null;
  ready_to_assign: ReadyToAssign;
  rollup: RollupData;
  notices: RemovedItemNotice[];
}

export interface AllocateResult {
  success: boolean;
  previous_budget?: number;
  allocated?: number;
  new_budget?: number;
  error?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
}

export interface SyncResult {
  success: boolean;
  categories_created: number;
  categories_updated: number;
  categories_deactivated: number;
  errors: string[];
}

export interface AuthStatus {
  authenticated: boolean;
  has_stored_credentials?: boolean;
  needs_unlock?: boolean;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  needs_passphrase?: boolean;
  message?: string;
  error?: string;
}

export interface SetPassphraseResult {
  success: boolean;
  message?: string;
  error?: string;
  requirements?: string[];
}

export interface UnlockResult {
  success: boolean;
  /** True if passphrase was correct (decryption worked) */
  unlock_success?: boolean;
  /** True if Monarch accepted the credentials */
  validation_success?: boolean;
  /** True if decryption worked but Monarch rejected credentials */
  needs_credential_update?: boolean;
  message?: string;
  error?: string;
}

export interface UpdateCredentialsResult {
  success: boolean;
  /** True if MFA is required */
  needs_mfa?: boolean;
  message?: string;
  error?: string;
}

export interface ResetAppResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SecurityStatus {
  encryption_enabled: boolean;
  encryption_algorithm: string;
  key_derivation: string;
  file_permissions: string;
  passphrase_requirements: {
    min_length: number;
    requires_uppercase: boolean;
    requires_lowercase: boolean;
    requires_number: boolean;
    requires_special: boolean;
  };
}

export interface UnmappedCategory {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  icon?: string;
  group_order: number;
  category_order: number;
  planned_budget: number;
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

// Version and Changelog types
export interface ChangelogSection {
  added?: string[];
  changed?: string[];
  deprecated?: string[];
  removed?: string[];
  fixed?: string[];
  security?: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: ChangelogSection;
}

export interface VersionInfo {
  version: string;
  build_time: string | null;
}

export interface ChangelogResponse {
  current_version: string;
  entries: ChangelogEntry[];
  total_entries: number;
}

export interface VersionCheckResult {
  client_version: string;
  server_version: string;
  update_available: boolean;
  update_type: 'major' | 'minor' | 'patch' | null;
}

export interface ChangelogStatusResult {
  current_version: string;
  last_read_version: string | null;
  has_unread: boolean;
}

export interface MarkChangelogReadResult {
  success: boolean;
  marked_version: string;
}

export interface DeploymentInfo {
  is_railway: boolean;
  railway_project_url: string | null;
  railway_project_id: string | null;
}

// Auto-sync types
export interface AutoSyncStatus {
  enabled: boolean;
  interval_minutes: number;
  next_run: string | null;
  last_sync: string | null;
  last_sync_success: boolean | null;
  last_sync_error: string | null;
  consent_acknowledged: boolean;
}

export interface EnableAutoSyncResult {
  success: boolean;
  interval_minutes?: number;
  next_run?: string;
  error?: string;
}

export interface DisableAutoSyncResult {
  success: boolean;
  error?: string;
}
