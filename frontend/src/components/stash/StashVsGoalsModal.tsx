/**
 * Stashes vs Monarch Goals Modal
 *
 * Explains the differences between Eclosion's Stashes feature and Monarch Money's
 * native Goals feature.
 */

import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import {
  Info,
  Target,
  Banknote,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { StashIcon } from '../wizards/SetupWizardIcons';

interface StashVsGoalsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface ComparisonRowProps {
  readonly icon: ReactNode;
  readonly aspect: string;
  readonly stash: string;
  readonly goal: string;
  readonly isEven: boolean;
}

function ComparisonRow({ icon, aspect, stash, goal, isEven }: ComparisonRowProps) {
  return (
    <tr style={isEven ? { backgroundColor: 'var(--monarch-bg-page)' } : undefined}>
      <td
        className="py-3 px-3 text-sm font-medium"
        style={{ color: 'var(--monarch-text-dark)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--monarch-text-muted)' }}>{icon}</span>
          {aspect}
        </div>
      </td>
      <td className="py-3 px-3 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        {stash}
      </td>
      <td className="py-3 px-3 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        {goal}
      </td>
    </tr>
  );
}

export function StashVsGoalsModal({ isOpen, onClose }: StashVsGoalsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Info size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          <span>Stashes vs Monarch Goals</span>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Key insight */}
        <p className="text-sm text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Stashes are <strong>virtual envelopes</strong> in your budget. Goals are <strong>real money</strong> in dedicated accounts.
        </p>

        {/* Comparison Table */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: '1px solid var(--monarch-border)',
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
                <th
                  className="py-2.5 px-3"
                  style={{ width: '30%' }}
                  aria-label="Aspect"
                />
                <th
                  className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--monarch-orange)', width: '35%' }}
                >
                  <div className="flex items-center gap-1.5">
                    <StashIcon size={14} />
                    Stashes
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--monarch-green)', width: '35%' }}
                >
                  <div className="flex items-center gap-1.5">
                    <Target size={14} />
                    Monarch Goals
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                icon={<Banknote size={16} />}
                aspect="How you fund it"
                stash="Set aside money in a Monarch category"
                goal="Transfer to a linked account or log contributions"
                isEven={false}
              />
              <ComparisonRow
                icon={<Sparkles size={16} />}
                aspect="Best for"
                stash="Virtual envelopes, wish-list items"
                goal="Dedicated savings accounts, multi-account goals"
                isEven
              />
              <ComparisonRow
                icon={<SlidersHorizontal size={16} />}
                aspect="Flexibility"
                stash="Any category can be a goal"
                goal="Requires account linking or manual entry"
                isEven={false}
              />
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
