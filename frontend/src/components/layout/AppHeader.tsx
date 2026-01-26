/**
 * App Header Component
 *
 * Header with logo/brand, sync button, and help dropdown.
 */

import { Link } from 'react-router-dom';
import { SyncButton } from '../SyncButton';
import { HelpDropdown } from './HelpDropdown';
import { AppIcon } from '../wizards/WizardComponents';
import { RateLimitBanner } from '../ui/RateLimitBanner';
import { OfflineIndicator } from '../OfflineIndicator';
import { UpdateBanner } from '../UpdateBanner';
import { DesktopUpdateBanner } from '../update';
import { MonthTransitionBanner } from '../ui/MonthTransitionBanner';
import { DistributionModeBanner } from '../stash/DistributionModeBanner';

interface AppHeaderProps {
  isDemo: boolean;
  isDesktop: boolean;
  isMacOSElectron: boolean;
  isWindowsElectron: boolean;
  pathPrefix: string;
  lastSync: string | null;
  isSyncing: boolean;
  isFetching: boolean;
  hasTour: boolean;
  onSync: () => void;
  onStartTour: () => void;
}

export function AppHeader({
  isDemo,
  isDesktop,
  isMacOSElectron,
  isWindowsElectron,
  pathPrefix,
  lastSync,
  isSyncing,
  isFetching,
  hasTour,
  onSync,
  onStartTour,
}: Readonly<AppHeaderProps>) {
  // Desktop title bar: compact height with vertically centered content
  const desktopHeaderHeight = 48;
  // Account for native window controls
  const macOSTrafficLightWidth = 80;
  const windowsControlsWidth = 150;

  return (
    <header className="app-header" role="banner">
      <div
        className={`app-header-content ${isDesktop ? 'static' : 'relative'}`}
        style={
          isDesktop
            ? {
                justifyContent: 'center',
                height: `${desktopHeaderHeight}px`,
                minHeight: `${desktopHeaderHeight}px`,
                paddingLeft: isMacOSElectron ? `${macOSTrafficLightWidth}px` : undefined,
                paddingRight: isWindowsElectron ? `${windowsControlsWidth}px` : undefined,
              }
            : undefined
        }
      >
        {/* Desktop: Centered logo in title bar */}
        {isDesktop && (
          <div
            className="app-brand"
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <Link
              to={`${pathPrefix}/`}
              className="flex items-center gap-2"
              style={{ textDecoration: 'none' }}
              aria-label="Eclosion - Go to home"
            >
              <AppIcon size={26} />
              <h1
                className="app-title"
                style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600, fontSize: '16px' }}
              >
                Eclosion
              </h1>
            </Link>
          </div>
        )}
        {/* Web: Logo on left with optional slogan */}
        {!isDesktop && (
          <div className="app-brand">
            <Link
              to={isDemo ? '/' : `${pathPrefix}/`}
              className="flex items-center gap-2"
              style={{ textDecoration: 'none' }}
              aria-label="Eclosion - Go to home"
              onClick={() => isDemo && window.scrollTo(0, 0)}
            >
              <AppIcon size={32} />
              <h1
                className="app-title hidden sm:block"
                style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600 }}
              >
                Eclosion
              </h1>
            </Link>
            {isDemo && (
              <span
                className="app-slogan hidden lg:block"
                style={{
                  color: 'var(--monarch-text-muted)',
                  fontSize: '14px',
                  fontStyle: 'italic',
                  marginLeft: '12px',
                  paddingLeft: '12px',
                  borderLeft: '1px solid var(--monarch-border)',
                }}
                aria-hidden="true"
              >
                Your budgeting, evolved.
              </span>
            )}
          </div>
        )}
        <div
          className="app-header-actions"
          style={
            isDesktop
              ? {
                  position: 'absolute',
                  right: isWindowsElectron ? `${windowsControlsWidth}px` : '1rem',
                }
              : undefined
          }
        >
          <SyncButton
            onSync={onSync}
            isSyncing={isSyncing}
            isFetching={isFetching}
            lastSync={lastSync}
            compact
          />
          <HelpDropdown hasTour={hasTour} onStartTour={onStartTour} />
        </div>
      </div>
      <RateLimitBanner />
      <OfflineIndicator />
      <UpdateBanner />
      <DesktopUpdateBanner />
      <MonthTransitionBanner />
      <DistributionModeBanner />
    </header>
  );
}
