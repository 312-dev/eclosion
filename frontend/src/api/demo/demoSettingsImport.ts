/**
 * Demo Settings Import Functions
 *
 * Handles import and preview of settings in demo mode.
 * Supports recurring, notes, stash, and refunds tools.
 */

import type {
  EclosionExport,
  ImportOptions,
  ImportResult,
  ImportPreviewResponse,
  ImportPreview,
} from '../../types';
import { updateDemoState, simulateDelay } from './demoState';
import { importNotesTool, importStashTool, importRefundsTool } from './demoSettingsHelpers';

/** Import settings from a backup file. Supports recurring, notes, stash, and refunds tools. */
export async function importSettings(
  data: EclosionExport,
  options?: ImportOptions
): Promise<ImportResult> {
  await simulateDelay(200);
  const supportedVersions = ['1.0', '1.1', '1.2'];
  if (!supportedVersions.includes(data.eclosion_export.version)) {
    return {
      success: false,
      imported: {},
      warnings: [],
      error: `Unsupported export version: ${data.eclosion_export.version}`,
    };
  }

  const imported: Record<string, boolean> = {};
  const warnings: string[] = [];
  const toolsToImport = options?.tools ?? ['recurring', 'notes', 'stash', 'refunds'];

  // Import Recurring
  if (toolsToImport.includes('recurring') && data.tools.recurring) {
    importRecurringTool(data, imported);
  }

  // Import Notes
  if (toolsToImport.includes('notes') && data.tools.notes) {
    importNotesTool(data, imported);
  }

  // Import Stash
  if (toolsToImport.includes('stash') && data.tools.stash) {
    importStashTool(data, imported, warnings);
  }

  // Import Refunds
  if (toolsToImport.includes('refunds') && data.tools.refunds) {
    importRefundsTool(data, imported);
  }

  // Import app_settings (theme and landing page stored in localStorage)
  const appSettings = data.app_settings;
  if (appSettings?.theme) localStorage.setItem('eclosion-theme-preference', appSettings.theme);
  if (appSettings?.landing_page)
    localStorage.setItem('eclosion-landing-page', appSettings.landing_page);
  if (appSettings?.theme || appSettings?.landing_page) imported['app_settings'] = true;

  return { success: true, imported, warnings };
}

function importRecurringTool(data: EclosionExport, imported: Record<string, boolean>): void {
  const recurring = data.tools.recurring!;
  updateDemoState((state) => {
    const settings: typeof state.settings = {
      auto_sync_new: recurring.config.auto_sync_new,
      auto_track_threshold: recurring.config.auto_track_threshold,
      auto_update_targets: recurring.config.auto_update_targets,
      auto_categorize_enabled:
        recurring.config.auto_categorize_enabled ?? state.settings.auto_categorize_enabled,
      show_category_group:
        recurring.config.show_category_group ?? state.settings.show_category_group,
    };

    const dashConfig: typeof state.dashboard.config = {
      ...state.dashboard.config,
      target_group_id: recurring.config.target_group_id,
      target_group_name: recurring.config.target_group_name,
      is_configured: !!recurring.config.target_group_id,
      auto_sync_new: recurring.config.auto_sync_new,
      auto_track_threshold: recurring.config.auto_track_threshold,
      auto_update_targets: recurring.config.auto_update_targets,
      auto_categorize_enabled:
        recurring.config.auto_categorize_enabled ??
        state.dashboard.config.auto_categorize_enabled ??
        state.settings.auto_categorize_enabled,
      show_category_group:
        recurring.config.show_category_group ??
        state.dashboard.config.show_category_group ??
        state.settings.show_category_group,
    };

    return {
      ...state,
      settings,
      dashboard: {
        ...state.dashboard,
        config: dashConfig,
        items: state.dashboard.items.map((item) => ({
          ...item,
          is_enabled: recurring.enabled_items.includes(item.id),
          is_in_rollup: recurring.rollup.item_ids.includes(item.id),
        })),
        rollup: {
          ...state.dashboard.rollup,
          enabled: recurring.rollup.enabled,
          category_name: recurring.rollup.category_name,
          emoji: recurring.rollup.emoji,
          budgeted: recurring.rollup.total_budgeted,
        },
      },
    };
  });
  imported['recurring'] = true;
}

/** Preview an import before applying. Supports v1.0, v1.1, and v1.2 exports. */
export async function previewImport(data: EclosionExport): Promise<ImportPreviewResponse> {
  await simulateDelay(100);
  const supportedVersions = ['1.0', '1.1', '1.2'];
  if (!data.eclosion_export?.version || !supportedVersions.includes(data.eclosion_export.version)) {
    return { success: false, valid: false, errors: ['Unsupported or invalid export format'] };
  }

  const preview: ImportPreview = {
    version: data.eclosion_export.version,
    exported_at: data.eclosion_export.exported_at,
    source_mode: data.eclosion_export.source_mode,
    tools: {},
  };

  if (data.tools.recurring) {
    preview.tools.recurring = {
      has_config: !!data.tools.recurring.config,
      enabled_items_count: data.tools.recurring.enabled_items.length,
      categories_count: Object.keys(data.tools.recurring.categories).length,
      has_rollup: data.tools.recurring.rollup.enabled,
      rollup_items_count: data.tools.recurring.rollup.item_ids.length,
    };
  }
  if (data.tools.notes) {
    preview.tools.notes = {
      category_notes_count: data.tools.notes.category_notes.length,
      general_notes_count: data.tools.notes.general_notes.length,
      archived_notes_count: data.tools.notes.archived_notes.length,
      has_checkbox_states: Object.keys(data.tools.notes.checkbox_states).length > 0,
    };
  }
  if (data.tools.stash) {
    const activeItems = data.tools.stash.items.filter((i) => !i.is_archived);
    const archivedItems = data.tools.stash.items.filter((i) => i.is_archived);
    preview.tools.stash = {
      has_config: !!data.tools.stash.config,
      items_count: activeItems.length,
      archived_items_count: archivedItems.length,
      pending_bookmarks_count: data.tools.stash.pending_bookmarks.length,
      hypotheses_count: data.tools.stash.hypotheses?.length ?? 0,
    };
  }
  if (data.tools.refunds) {
    preview.tools.refunds = {
      has_config: !!data.tools.refunds.config,
      views_count: data.tools.refunds.views.length,
      matches_count: data.tools.refunds.matches.filter((m) => !m.skipped).length,
      skipped_count: data.tools.refunds.matches.filter((m) => m.skipped).length,
      expected_count: data.tools.refunds.matches.filter((m) => m.expected_refund).length,
    };
  }

  return { success: true, valid: true, preview };
}
