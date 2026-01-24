/**
 * Stash Goal Explainer Link
 *
 * Subtle link that opens the StashVsGoalsModal explaining the difference
 * between Eclosion's Stash and Monarch Money's Goals.
 */

import { Scale } from 'lucide-react';

interface StashGoalExplainerLinkProps {
  readonly onClick: () => void;
}

export function StashGoalExplainerLink({ onClick }: StashGoalExplainerLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 mt-1 text-sm transition-colors hover:opacity-80"
      style={{ color: 'var(--monarch-info)' }}
    >
      <Scale size={14} />
      Explain differences between Stashes and Monarch Goals
    </button>
  );
}
