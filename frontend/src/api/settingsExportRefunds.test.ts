/**
 * Tests for refunds tool export/import functionality in demo mode.
 *
 * Tests cover:
 * - Refunds tool export (config, views, matches)
 * - Refunds tool import with ID prefixing
 * - Refunds round-trip preservation
 * - Preview for refunds tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as demoApi from './demoClient';
import { createInitialDemoState } from './demoData';
import {
  DEMO_STORAGE_KEY,
  createRefundsConfig,
  createRefundsView,
  createRefundsMatch,
  createExport,
} from './settingsExportTestUtils';

describe('Settings Export - Refunds (Demo Mode)', () => {
  beforeEach(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
  });

  afterEach(() => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  });

  describe('Refunds Tool Export', () => {
    it('should export refunds config with all fields', async () => {
      const result = await demoApi.exportSettings();
      const refunds = result.tools.refunds;

      expect(refunds).toBeDefined();
      expect('replacement_tag_id' in refunds!.config).toBe(true);
      expect(typeof refunds?.config.replace_tag_by_default).toBe('boolean');
      expect(typeof refunds?.config.aging_warning_days).toBe('number');
      expect(typeof refunds?.config.show_badge).toBe('boolean');
    });

    it('should export saved views', async () => {
      const result = await demoApi.exportSettings();
      const views = result.tools.refunds?.views ?? [];

      // Demo state has 2 default views
      expect(views.length).toBe(2);
      expect(views[0].name).toBe('Pending Refund');
      expect(views[0].tag_ids).toEqual(['tag-1']);
      expect(views[0].category_ids).toBeNull();
      expect(typeof views[0].sort_order).toBe('number');
    });

    it('should export matches', async () => {
      // Create a match first
      await demoApi.createRefundsMatch({
        originalTransactionId: 'txn-001',
        refundTransactionId: 'txn-refund-001',
        refundAmount: 50,
        refundMerchant: 'Store',
        refundDate: '2026-01-15',
        refundAccount: 'Checking',
      });

      const result = await demoApi.exportSettings();
      const matches = result.tools.refunds?.matches ?? [];

      expect(matches.length).toBe(1);
      expect(matches[0].original_transaction_id).toBe('txn-001');
      expect(matches[0].refund_transaction_id).toBe('txn-refund-001');
      expect(matches[0].refund_amount).toBe(50);
      expect(matches[0].refund_merchant).toBe('Store');
      expect(matches[0].skipped).toBe(false);
      expect(matches[0].expected_refund).toBe(false);
    });

    it('should export expected refund matches', async () => {
      await demoApi.createRefundsMatch({
        originalTransactionId: 'txn-002',
        expectedRefund: true,
        expectedDate: '2026-02-01',
        expectedAccount: 'Checking',
        expectedAmount: 100,
        expectedNote: 'Pending return',
      });

      const result = await demoApi.exportSettings();
      const matches = result.tools.refunds?.matches ?? [];
      const expected = matches.find((m) => m.original_transaction_id === 'txn-002');

      expect(expected).toBeDefined();
      expect(expected?.expected_refund).toBe(true);
      expect(expected?.expected_date).toBe('2026-02-01');
      expect(expected?.expected_amount).toBe(100);
      expect(expected?.expected_note).toBe('Pending return');
    });
  });

  describe('Refunds Tool Import', () => {
    it('should import refunds config', async () => {
      const exportData = createExport({
        refunds: {
          config: createRefundsConfig({
            replacement_tag_id: 'tag-imported',
            replace_tag_by_default: false,
            aging_warning_days: 60,
            show_badge: false,
          }),
          views: [],
          matches: [],
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.success).toBe(true);
      expect(result.imported.refunds).toBe(true);

      const config = await demoApi.getRefundsConfig();
      expect(config.replacementTagId).toBe('tag-imported');
      expect(config.replaceTagByDefault).toBe(false);
      expect(config.agingWarningDays).toBe(60);
      expect(config.showBadge).toBe(false);
    });

    it('should import views with prefixed IDs', async () => {
      const exportData = createExport({
        refunds: {
          config: createRefundsConfig(),
          views: [createRefundsView({ id: 'view-abc', name: 'Imported View', tag_ids: ['tag-x'] })],
          matches: [],
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.success).toBe(true);

      const views = await demoApi.getRefundsViews();
      const importedView = views.find((v) => v.id === 'imported-view-abc');
      expect(importedView).toBeDefined();
      expect(importedView?.name).toBe('Imported View');
      expect(importedView?.tagIds).toEqual(['tag-x']);
    });

    it('should import matches with prefixed IDs', async () => {
      const exportData = createExport({
        refunds: {
          config: createRefundsConfig(),
          views: [],
          matches: [
            createRefundsMatch({
              original_transaction_id: 'txn-import-1',
              refund_transaction_id: 'txn-refund-1',
              refund_amount: 75,
              refund_merchant: 'Imported Store',
            }),
          ],
        },
      });

      const result = await demoApi.importSettings(exportData);
      expect(result.success).toBe(true);

      const matches = await demoApi.getRefundsMatches();
      const importedMatch = matches.find((m) => m.id === 'imported-txn-import-1');
      expect(importedMatch).toBeDefined();
      expect(importedMatch?.originalTransactionId).toBe('txn-import-1');
      expect(importedMatch?.refundAmount).toBe(75);
      expect(importedMatch?.refundMerchant).toBe('Imported Store');
    });

    it('should append imported views to existing views', async () => {
      const viewsBefore = await demoApi.getRefundsViews();
      const countBefore = viewsBefore.length;

      const exportData = createExport({
        refunds: {
          config: createRefundsConfig(),
          views: [createRefundsView({ id: 'new-view', name: 'New View' })],
          matches: [],
        },
      });

      await demoApi.importSettings(exportData);

      const viewsAfter = await demoApi.getRefundsViews();
      expect(viewsAfter.length).toBe(countBefore + 1);
    });
  });

  describe('Refunds Round-trip', () => {
    it('should preserve refunds config through export/import', async () => {
      await demoApi.updateRefundsConfig({
        replacementTagId: 'tag-custom',
        replaceTagByDefault: false,
        agingWarningDays: 45,
        showBadge: false,
      });

      const exported = await demoApi.exportSettings();
      const originalConfig = exported.tools.refunds!.config;

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      const result = await demoApi.importSettings(exported);
      expect(result.success).toBe(true);

      const config = await demoApi.getRefundsConfig();
      expect(config.replacementTagId).toBe(originalConfig.replacement_tag_id);
      expect(config.replaceTagByDefault).toBe(originalConfig.replace_tag_by_default);
      expect(config.agingWarningDays).toBe(originalConfig.aging_warning_days);
      expect(config.showBadge).toBe(originalConfig.show_badge);
    });

    it('should preserve view count through export/import', async () => {
      const exported = await demoApi.exportSettings();
      const originalViewCount = exported.tools.refunds!.views.length;

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      await demoApi.importSettings(exported);

      const views = await demoApi.getRefundsViews();
      // Views are appended to initial state views
      expect(views.length).toBeGreaterThanOrEqual(originalViewCount);
    });
  });

  describe('Preview - Refunds', () => {
    it('should preview refunds tool data', async () => {
      const exported = await demoApi.exportSettings();
      const result = await demoApi.previewImport(exported);

      expect(result.success).toBe(true);
      expect(result.preview?.tools.refunds).toBeDefined();
      expect(result.preview?.tools.refunds?.has_config).toBe(true);
      expect(typeof result.preview?.tools.refunds?.views_count).toBe('number');
      expect(typeof result.preview?.tools.refunds?.matches_count).toBe('number');
    });

    it('should preview refunds with correct counts', async () => {
      const exportData = createExport({
        refunds: {
          config: createRefundsConfig(),
          views: [
            createRefundsView({ id: 'v1', name: 'View 1' }),
            createRefundsView({ id: 'v2', name: 'View 2' }),
          ],
          matches: [
            createRefundsMatch({ original_transaction_id: 'txn-1', refund_amount: 50 }),
            createRefundsMatch({ original_transaction_id: 'txn-2', skipped: true }),
            createRefundsMatch({
              original_transaction_id: 'txn-3',
              expected_refund: true,
              expected_amount: 100,
            }),
          ],
        },
      });

      const result = await demoApi.previewImport(exportData);

      expect(result.preview?.tools.refunds?.views_count).toBe(2);
      expect(result.preview?.tools.refunds?.matches_count).toBe(2); // non-skipped
      expect(result.preview?.tools.refunds?.skipped_count).toBe(1);
      expect(result.preview?.tools.refunds?.expected_count).toBe(1);
    });
  });
});
