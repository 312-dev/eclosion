/**
 * Shared test utilities for settings export/import tests.
 * Provides factory functions for creating verbose export data structures.
 */

import type {
  StashExportItem,
  StashExportConfig,
  RecurringExport,
  RefundsExportConfig,
  RefundsExportView,
  RefundsExportMatch,
  EclosionExport,
} from '../types';

export const DEMO_STORAGE_KEY = 'eclosion-demo-data';

/** Create a minimal stash export item with sensible defaults. */
export function createStashItem(overrides: Partial<StashExportItem> = {}): StashExportItem {
  return {
    id: 'test-item',
    name: 'Test',
    amount: 100,
    target_date: null,
    emoji: '🎯',
    monarch_category_id: null,
    category_group_id: null,
    category_group_name: null,
    source_url: null,
    source_bookmark_id: null,
    logo_url: null,
    is_archived: false,
    archived_at: null,
    created_at: null,
    grid_x: 0,
    grid_y: 0,
    col_span: 1,
    row_span: 1,
    ...overrides,
  };
}

/** Create a minimal stash export config with sensible defaults. */
export function createStashConfig(overrides: Partial<StashExportConfig> = {}): StashExportConfig {
  return {
    is_configured: false,
    default_category_group_id: null,
    default_category_group_name: null,
    selected_browser: null,
    selected_folder_ids: [],
    selected_folder_names: [],
    auto_archive_on_bookmark_delete: true,
    auto_archive_on_goal_met: true,
    ...overrides,
  };
}

/** Create a minimal recurring export with sensible defaults. */
export function createRecurringExport(overrides: Partial<RecurringExport> = {}): RecurringExport {
  return {
    config: {
      target_group_id: null,
      target_group_name: null,
      auto_sync_new: false,
      auto_track_threshold: null,
      auto_update_targets: false,
    },
    enabled_items: [],
    categories: {},
    rollup: {
      enabled: false,
      monarch_category_id: null,
      category_name: 'Rollup',
      emoji: '🔄',
      item_ids: [],
      total_budgeted: 0,
      is_linked: false,
    },
    ...overrides,
  };
}

/** Create a minimal refunds export config with sensible defaults. */
export function createRefundsConfig(
  overrides: Partial<RefundsExportConfig> = {}
): RefundsExportConfig {
  return {
    replacement_tag_id: null,
    replace_tag_by_default: true,
    aging_warning_days: 30,
    show_badge: true,
    ...overrides,
  };
}

/** Create a minimal refunds export view with sensible defaults. */
export function createRefundsView(overrides: Partial<RefundsExportView> = {}): RefundsExportView {
  return {
    id: 'test-view',
    name: 'Test View',
    tag_ids: ['tag-1'],
    category_ids: null,
    sort_order: 0,
    ...overrides,
  };
}

/** Create a minimal refunds export match with sensible defaults. */
export function createRefundsMatch(
  overrides: Partial<RefundsExportMatch> = {}
): RefundsExportMatch {
  return {
    original_transaction_id: 'txn-original-1',
    refund_transaction_id: null,
    refund_amount: null,
    refund_merchant: null,
    refund_date: null,
    refund_account: null,
    skipped: false,
    expected_refund: false,
    expected_date: null,
    expected_account: null,
    expected_account_id: null,
    expected_note: null,
    expected_amount: null,
    transaction_data: null,
    ...overrides,
  };
}

/** Create a minimal EclosionExport wrapper. */
export function createExport(tools: EclosionExport['tools'], version = '1.2'): EclosionExport {
  return {
    eclosion_export: {
      version,
      exported_at: new Date().toISOString(),
      source_mode: 'demo',
    },
    tools,
    app_settings: {},
  };
}
