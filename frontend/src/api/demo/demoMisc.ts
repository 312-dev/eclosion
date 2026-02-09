/**
 * Demo Miscellaneous Functions
 *
 * Deployment info, notices, and other utilities.
 */

import { updateDemoState, simulateDelay } from './demoState';

/**
 * Get deployment info.
 */
export async function getDeploymentInfo(): Promise<{
  deployment_type: 'docker' | 'desktop' | 'local';
}> {
  await simulateDelay(50);
  return {
    deployment_type: 'local',
  };
}

/**
 * Dismiss a notice.
 */
export async function dismissNotice(noticeId: string): Promise<{ success: boolean }> {
  await simulateDelay(50);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      notices: state.dashboard.notices.filter((n) => n.id !== noticeId),
    },
  }));

  return { success: true };
}

/**
 * Clear category cache.
 */
export async function clearCategoryCache(): Promise<{ success: boolean; message?: string }> {
  await simulateDelay(50);
  return { success: true, message: 'Cache cleared (demo mode)' };
}
