/**
 * Exhaustive tool coverage tests for settings export.
 *
 * These tests ensure that ALL tools in the export are covered by the
 * export/import system. If a new tool is added to the export but not
 * to this list, the tests will fail — preventing silent data loss on backup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as demoApi from './demoClient';
import { createInitialDemoState } from './demoData';
import { DEMO_STORAGE_KEY } from './settingsExportTestUtils';

/**
 * Canonical list of all tools supported by the export system.
 *
 * When adding a new tool:
 * 1. Add it here
 * 2. Add export support in demoSettingsExport.ts
 * 3. Add import support in demoSettingsImport.ts
 * 4. Add preview support in demoSettingsImport.ts
 * 5. Add a dedicated test file (settingsExport{Tool}.test.ts)
 */
const ALL_EXPORT_TOOLS = ['recurring', 'notes', 'stash', 'refunds'] as const;

describe('Settings Export - Exhaustive Tool Coverage', () => {
  beforeEach(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
  });

  afterEach(() => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  });

  it('export should contain exactly the expected set of tools', async () => {
    const exported = await demoApi.exportSettings();
    const exportedToolKeys = Object.keys(exported.tools).sort();
    const expectedToolKeys = [...ALL_EXPORT_TOOLS].sort();
    expect(exportedToolKeys).toEqual(expectedToolKeys);
  });

  it('preview should contain all exported tools', async () => {
    const exported = await demoApi.exportSettings();
    const result = await demoApi.previewImport(exported);
    expect(result.success).toBe(true);

    const previewToolKeys = Object.keys(result.preview!.tools).sort();
    const expectedToolKeys = [...ALL_EXPORT_TOOLS].sort();
    expect(previewToolKeys).toEqual(expectedToolKeys);
  });

  it('default import (no tools option) should import all tools', async () => {
    const exported = await demoApi.exportSettings();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));

    const result = await demoApi.importSettings(exported);
    expect(result.success).toBe(true);

    for (const tool of ALL_EXPORT_TOOLS) {
      expect(result.imported[tool]).toBe(true);
    }
  });

  it('selective import should work for each individual tool', async () => {
    const exported = await demoApi.exportSettings();

    for (const tool of ALL_EXPORT_TOOLS) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));
      const result = await demoApi.importSettings(exported, { tools: [tool] });
      expect(result.success).toBe(true);
      expect(result.imported[tool]).toBe(true);

      // Ensure other tools were NOT imported
      for (const otherTool of ALL_EXPORT_TOOLS) {
        if (otherTool !== tool) {
          expect(result.imported[otherTool]).toBeUndefined();
        }
      }
    }
  });

  it('import with all tools explicitly listed should import every tool', async () => {
    const exported = await demoApi.exportSettings();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createInitialDemoState()));

    const result = await demoApi.importSettings(exported, { tools: [...ALL_EXPORT_TOOLS] });
    expect(result.success).toBe(true);

    for (const tool of ALL_EXPORT_TOOLS) {
      expect(result.imported[tool]).toBe(true);
    }
  });
});
