/**
 * Stashes vs Monarch Goals Modal
 *
 * Explains the differences between Eclosion's Stashes feature and Monarch Money's
 * native Goals feature.
 */

import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import {
  Scale,
  Target,
  Banknote,
  Sparkles,
  SlidersHorizontal,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import { StashIcon } from '../wizards/SetupWizardIcons';
import { useMediaQuery, breakpoints } from '../../hooks/useMediaQuery';

interface StashVsGoalsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface ComparisonItemProps {
  readonly icon: ReactNode;
  readonly aspect: string;
  readonly stash: string;
  readonly goal: string;
  readonly isEven: boolean;
}

function ComparisonRow({ icon, aspect, stash, goal, isEven }: ComparisonItemProps) {
  return (
    <tr style={isEven ? { backgroundColor: 'var(--monarch-bg-page)' } : undefined}>
      <td className="py-3 px-3 text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
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

function ComparisonCard({
  icon,
  aspect,
  stash,
  goal,
}: Readonly<Omit<ComparisonItemProps, 'isEven'>>) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <div
        className="flex items-center gap-2 mb-3 pb-2"
        style={{ borderBottom: '1px solid var(--monarch-border)' }}
      >
        <span style={{ color: 'var(--monarch-text-muted)' }}>{icon}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {aspect}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide mb-1"
            style={{ color: 'var(--monarch-orange)' }}
          >
            <StashIcon size={12} />
            Stashes
          </div>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            {stash}
          </p>
        </div>
        <div>
          <div
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide mb-1"
            style={{ color: 'var(--monarch-green)' }}
          >
            <Target size={12} />
            Monarch Goals
          </div>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            {goal}
          </p>
        </div>
      </div>
    </div>
  );
}

const comparisonData = [
  {
    icon: <Banknote size={16} />,
    aspect: 'How you fund it',
    stash: 'Set aside money in a Monarch category',
    goal: 'Transfer to a linked account or log contributions',
  },
  {
    icon: <Sparkles size={16} />,
    aspect: 'Best for',
    stash: 'Flexible savings goals (from shoes to emergency funds)',
    goal: 'Dedicated savings accounts, multi-account goals',
  },
  {
    icon: <SlidersHorizontal size={16} />,
    aspect: 'Flexibility',
    stash: 'Any category can be a goal',
    goal: 'Requires account linking or manual entry',
  },
  {
    icon: <Calculator size={16} />,
    aspect: 'Available funds calculation',
    stash: 'Calculated from cash minus debts and budgets',
    goal: 'Based on savings account allocations',
  },
];

export function StashVsGoalsModal({ isOpen, onClose }: StashVsGoalsModalProps) {
  const isMobile = useMediaQuery(breakpoints.sm);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Scale size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          <span>Stashes vs Monarch Goals</span>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Key insight */}
        <p className="text-sm text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Stashes are <strong>virtual envelopes</strong> in your budget, derived from your available
          cash. Goals are <strong>partitioned money</strong> in dedicated accounts.
        </p>

        {/* Comparison - Cards on mobile, Table on desktop */}
        {isMobile ? (
          <div className="space-y-3">
            {comparisonData.map((item) => (
              <ComparisonCard key={item.aspect} {...item} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{
              border: '1px solid var(--monarch-border)',
            }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
                  <th className="py-2.5 px-3" style={{ width: '30%' }} aria-label="Aspect" />
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
                {comparisonData.map((item, index) => (
                  <ComparisonRow key={item.aspect} {...item} isEven={index % 2 === 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Can I use both? */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <HelpCircle
              size={20}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--monarch-blue)' }}
            />
            <div>
              <h4
                className="text-base font-semibold mb-2"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Can I use both?
              </h4>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                <strong style={{ color: 'var(--monarch-text-dark)' }}>Yes!</strong> Use Goals for
                money in dedicated accounts (like a HYSA), and Stashes for flexible savings in your
                main accounts. Goal balances are automatically excluded from Available to Stash, so
                no double-counting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
