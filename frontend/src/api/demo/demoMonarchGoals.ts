/**
 * Demo Mode - Monarch Goals
 *
 * Provides demo implementations for Monarch goal operations using localStorage.
 */

import type { MonarchGoal, MonarchGoalLayoutUpdate } from '../../types/monarchGoal';
import { getDemoState, setDemoState, simulateDelay } from './demoState';

export async function getMonarchGoals(): Promise<{ goals: MonarchGoal[] }> {
  await simulateDelay();
  const state = getDemoState();
  return { goals: state.monarchGoals || [] };
}

export async function updateMonarchGoalLayouts(
  layouts: MonarchGoalLayoutUpdate[]
): Promise<{ success: boolean }> {
  await simulateDelay();

  const state = getDemoState();
  const updatedGoals = state.monarchGoals.map((goal: MonarchGoal) => {
    const layoutUpdate = layouts.find((l) => l.goal_id === goal.id);
    if (layoutUpdate) {
      return {
        ...goal,
        grid_x: layoutUpdate.grid_x,
        grid_y: layoutUpdate.grid_y,
        col_span: layoutUpdate.col_span,
        row_span: layoutUpdate.row_span,
      };
    }
    return goal;
  });

  setDemoState({ ...state, monarchGoals: updatedGoals });
  return { success: true };
}
