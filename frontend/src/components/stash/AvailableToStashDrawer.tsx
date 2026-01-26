/**
 * Available Funds Drawer
 *
 * A collapsible drawer that shows the "Available Funds" amount.
 * - Collapsed: Shows bank icon + "Available Funds" text
 * - Expanded: Shows amount and info button with breakdown
 *
 * The drawer sits at the bottom of a dividing line (centered) and can be
 * toggled by tapping. It also auto-opens when budget inputs are focused.
 */

import { useState } from 'react';
import { Icons } from '../icons';
import { useAvailableToStash } from '../../api/queries';
import { HoverCard } from '../ui/HoverCard';
import { BreakdownDetailModal } from './BreakdownDetailModal';
import { BreakdownTooltip } from './BreakdownTooltip';
import { useDrawerBorders, useNegativeTransitionShake } from './useDrawerAnimations';
import { UI } from '../../constants';
import { useAvailableToStashDrawer } from '../../context/AvailableToStashDrawerContext';

interface AvailableToStashDrawerProps {
  /** Whether to include expected income in calculation (from settings) */
  readonly includeExpectedIncome?: boolean;
  /** Reserved buffer amount to subtract from available (from settings) */
  readonly bufferAmount?: number;
}

interface StatusIconProps {
  readonly isFetching: boolean;
  readonly isPositive: boolean;
}

/** Renders the appropriate status icon based on state */
function StatusIcon({ isFetching, isPositive }: StatusIconProps) {
  if (isFetching) {
    return (
      <Icons.Spinner size={16} style={{ color: 'var(--monarch-text-muted)' }} aria-hidden="true" />
    );
  }
  if (isPositive) {
    return (
      <Icons.Landmark size={16} style={{ color: 'var(--monarch-text-muted)' }} aria-hidden="true" />
    );
  }
  return <Icons.Warning size={16} style={{ color: 'var(--monarch-error)' }} aria-hidden="true" />;
}

interface DrawerStyles {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

/** Compute drawer styles based on loading and positive/negative state */
function computeDrawerStyles(isInitialLoad: boolean, isPositive: boolean): DrawerStyles {
  const useNegativeStyle = !isInitialLoad && !isPositive;
  return {
    backgroundColor: useNegativeStyle ? '#3d1f1f' : 'var(--monarch-bg-card)',
    textColor: useNegativeStyle ? 'var(--monarch-error)' : 'var(--monarch-text-dark)',
    borderColor: useNegativeStyle ? 'var(--monarch-error)' : 'var(--monarch-border)',
  };
}

interface OvercommittedMessageProps {
  readonly isPositive: boolean;
  readonly isInitialLoad: boolean;
}

/** Shows warning message when user is overcommitted */
function OvercommittedMessage({ isPositive, isInitialLoad }: OvercommittedMessageProps) {
  if (isPositive || isInitialLoad) return null;
  return (
    <div className="text-sm text-center" style={{ color: 'var(--monarch-text-dark)' }}>
      <div className="font-medium">You're overcommitted.</div>
      <div style={{ color: 'var(--monarch-text-muted)' }}>
        Consider reducing budgets or stash targets.
      </div>
    </div>
  );
}

export function AvailableToStashDrawer({
  includeExpectedIncome = false,
  bufferAmount = 0,
}: Readonly<AvailableToStashDrawerProps>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isExpanded, toggle } = useAvailableToStashDrawer();

  const { data, isLoading, isFetching, formattedAmount, statusColor } = useAvailableToStash({
    includeExpectedIncome,
    bufferAmount,
  });

  const showBorders = useDrawerBorders(isExpanded);
  const shouldShake = useNegativeTransitionShake(data?.available);

  const breakdown = data?.breakdown;
  const detailedBreakdown = data?.detailedBreakdown;

  const openModal = () => setIsModalOpen(true);

  const tooltipContent =
    breakdown && detailedBreakdown ? (
      <BreakdownTooltip
        breakdown={breakdown}
        detailedBreakdown={detailedBreakdown}
        includeExpectedIncome={includeExpectedIncome}
        statusColor={statusColor}
        formattedAmount={formattedAmount}
        onExpand={openModal}
      />
    ) : null;

  const isPositive = (data?.available ?? 0) >= 0;
  const isInitialLoad = isLoading && !data;
  const { backgroundColor, textColor, borderColor } = computeDrawerStyles(
    isInitialLoad,
    isPositive
  );

  return (
    <>
      {/* Drawer container - sits below tab navigation, touching the dividing line */}
      <div className="flex justify-center" style={{ marginTop: '-2px' }}>
        <div
          className="flex flex-col items-center overflow-hidden"
          style={{
            transition: `all ${UI.ANIMATION.NORMAL}ms ease-in-out`,
            marginTop: '2px',
          }}
        >
          {/* Expanded content - appears above the tab when expanded */}
          <div
            className="rounded-b-lg"
            style={{
              maxHeight: isExpanded ? '300px' : '0',
              transition: `max-height ${UI.ANIMATION.NORMAL}ms ease-in-out`,
              overflow: 'hidden',
              backgroundColor,
              borderLeft: showBorders ? `1px solid ${borderColor}` : 'none',
              borderRight: showBorders ? `1px solid ${borderColor}` : 'none',
              borderBottom: showBorders ? `1px solid ${borderColor}` : 'none',
              minWidth: '400px',
              paddingBottom: isExpanded ? '6px' : '0',
            }}
          >
            <div className="px-6 pt-3 pb-3 relative">
              <div className="flex justify-center mb-3">
                <div className="relative inline-block">
                  <span className="text-4xl font-bold leading-tight" style={{ color: textColor }}>
                    {formattedAmount}
                  </span>
                  <HoverCard content={tooltipContent} side="bottom" align="start" closeDelay={400}>
                    <Icons.Info
                      size={16}
                      className="cursor-help absolute"
                      style={{
                        color: isInitialLoad ? 'var(--monarch-text-muted)' : textColor,
                        left: 'calc(100% + 8px)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  </HoverCard>
                </div>
              </div>
              <OvercommittedMessage isPositive={isPositive} isInitialLoad={isInitialLoad} />
            </div>
          </div>

          {/* Tab button - always visible, pulls down when expanded */}
          <button
            onClick={toggle}
            className={`flex items-center gap-2 px-4 py-2 transition-colors rounded-b-lg ${shouldShake ? 'animate-error-shake' : ''}`}
            style={{
              backgroundColor,
              border: `1px solid ${borderColor}`,
              borderTop: isExpanded ? 'none' : `1px solid ${borderColor}`,
              color: textColor,
              marginTop: isExpanded ? '-1px' : '-2px',
              position: 'relative',
              zIndex: 1,
            }}
            aria-label={isExpanded ? 'Collapse Available Funds' : 'Expand Available Funds'}
            aria-expanded={isExpanded}
          >
            <StatusIcon isFetching={isFetching} isPositive={isPositive} />
            <span className="text-sm font-medium">Available Funds</span>
            <Icons.ChevronDown
              size={16}
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: `transform ${UI.ANIMATION.NORMAL}ms ease-in-out`,
                color: isInitialLoad ? 'var(--monarch-text-muted)' : textColor,
              }}
            />
          </button>
        </div>
      </div>

      {/* Spacing after drawer */}
      <div className="mb-4" />

      {data && (
        <BreakdownDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
          statusColor={statusColor}
          formattedAmount={formattedAmount}
        />
      )}
    </>
  );
}
