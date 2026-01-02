/**
 * Icon Components
 *
 * Centralized SVG icon components for consistent usage across the app.
 * All icons accept className and size props for customization.
 *
 * Usage:
 *   import { Icons } from '../components/icons';
 *   <Icons.Settings className="h-5 w-5" />
 *   <Icons.Refresh size={16} color="var(--monarch-orange)" />
 */

import type { IconProps } from './types';

export type { IconProps } from './types';

// Helper to merge default props with user props
function getIconProps({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    className,
    ...rest,
  };
}

// =============================================================================
// Core Icons
// =============================================================================

/** Settings gear icon */
export function SettingsIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** Refresh/sync arrows icon */
export function RefreshIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps}>
      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

/** Sync arrows (alternative) - used for sync button */
export function SyncIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps}>
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

/** Spinner/loading icon */
export function SpinnerIcon(props: IconProps) {
  const { size = 24, color = 'currentColor', className = '', ...rest } = props;
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...rest}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// =============================================================================
// Chevron Icons
// =============================================================================

/** Chevron down icon */
export function ChevronDownIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Chevron up icon */
export function ChevronUpIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

/** Chevron right icon */
export function ChevronRightIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/** Chevron left icon */
export function ChevronLeftIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// =============================================================================
// Action Icons
// =============================================================================

/** Check/checkmark icon */
export function CheckIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Simple check without animation */
export function CheckSimpleIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/** Filled checkmark (for enabled states) */
export function CheckFilledIcon(props: IconProps) {
  const { size = 24, color = 'currentColor', ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      {...rest}
    >
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

/** X/close icon */
export function XIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** Plus icon */
export function PlusIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Minus icon */
export function MinusIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  );
}

/** Edit/pencil icon */
export function EditIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/** Trash/delete icon */
export function TrashIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/** External link icon */
export function ExternalLinkIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/** Link icon (chain links) */
export function LinkIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// =============================================================================
// Status Icons
// =============================================================================

/** Info circle icon */
export function InfoIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/** Info circle with error styling (exclamation) */
export function AlertCircleIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/** Warning triangle icon */
export function WarningIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

/** Filled warning triangle icon */
export function WarningFilledIcon(props: IconProps) {
  const { size = 24, color = 'currentColor', ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      {...rest}
    >
      <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
    </svg>
  );
}

/** Filled alert circle icon (for warning/error badges) */
export function AlertCircleFilledIcon(props: IconProps) {
  const { size = 24, color = 'currentColor', ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      {...rest}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

/** Success/check circle icon */
export function CheckCircleIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

/** Clock icon (time/schedule) */
export function ClockIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// =============================================================================
// Trend/Arrow Icons
// =============================================================================

/** Trend up icon (catching up) */
export function TrendUpIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 7 10.5 15.5 15.5 10.5 22 17" />
      <polyline points="8 7 2 7 2 13" />
    </svg>
  );
}

/** Trend down icon (ahead) */
export function TrendDownIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

/** Arrow up icon */
export function ArrowUpIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

/** Arrow down icon */
export function ArrowDownIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

// =============================================================================
// UI Icons
// =============================================================================

/** Menu/hamburger icon */
export function MenuIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

/** Search/magnifier icon */
export function SearchIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** Filter funnel icon */
export function FilterIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

/** More vertical (three dots) icon */
export function MoreVerticalIcon(props: IconProps) {
  const { size = 24, color = 'currentColor', ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      {...rest}
    >
      <circle cx="12" cy="12" r="1" fill={color} />
      <circle cx="12" cy="5" r="1" fill={color} />
      <circle cx="12" cy="19" r="1" fill={color} />
    </svg>
  );
}

// =============================================================================
// Calendar/Time Icons
// =============================================================================

/** Calendar icon */
export function CalendarIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/** Calendar with dots (recurring) */
export function CalendarRecurringIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

// =============================================================================
// User/Auth Icons
// =============================================================================

/** User icon */
export function UserIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/** Logout icon */
export function LogoutIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/** Lock icon */
export function LockIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/** Shield icon */
export function ShieldIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/** Key icon */
export function KeyIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

// =============================================================================
// Theme Icons
// =============================================================================

/** Moon icon (dark theme) */
export function MoonIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** Sun icon (light theme) */
export function SunIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

// =============================================================================
// Misc Icons
// =============================================================================

/** Inbox icon */
export function InboxIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

/** Package/box icon */
export function PackageIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
      <polyline points="2.32 6.16 12 11 21.68 6.16" />
      <line x1="12" y1="22.76" x2="12" y2="11" />
    </svg>
  );
}

/** Disabled/blocked circle icon */
export function BlockedIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  );
}

/** Eye icon (visible) */
export function EyeIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Eye off icon (hidden) */
export function EyeOffIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/** Download icon */
export function DownloadIcon(props: IconProps) {
  const svgProps = getIconProps(props);
  return (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/** GitHub icon */
export function GitHubIcon(props: IconProps) {
  const { size = 24, color = 'currentColor', ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      {...rest}
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/** Monarch butterfly icon (app logo) */
export function MonarchIcon(props: IconProps) {
  const { size = 24, color = 'currentColor', ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      {...rest}
    >
      <path d="M21 12c0-1.5-.5-3-1.5-4L12 12l7.5 4c1-1 1.5-2.5 1.5-4z" opacity="0.3" />
      <path d="M12 2C8.5 2 5.5 4 4 7l8 5-8 5c1.5 3 4.5 5 8 5s6.5-2 8-5l-8-5 8-5c-1.5-3-4.5-5-8-5zm0 2c2.5 0 4.5 1.5 5.5 3.5L12 11 6.5 7.5C7.5 5.5 9.5 4 12 4zm0 16c-2.5 0-4.5-1.5-5.5-3.5L12 13l5.5 3.5c-1 2-3 3.5-5.5 3.5z" />
    </svg>
  );
}

// =============================================================================
// Collected Icons Object
// =============================================================================

/**
 * Icons object for convenient access to all icons.
 *
 * @example
 * import { Icons } from '../components/icons';
 * <Icons.Settings className="h-5 w-5" />
 */
export const Icons = {
  // Core
  Settings: SettingsIcon,
  Refresh: RefreshIcon,
  Sync: SyncIcon,
  Spinner: SpinnerIcon,

  // Chevrons
  ChevronDown: ChevronDownIcon,
  ChevronUp: ChevronUpIcon,
  ChevronRight: ChevronRightIcon,
  ChevronLeft: ChevronLeftIcon,

  // Actions
  Check: CheckIcon,
  CheckSimple: CheckSimpleIcon,
  CheckFilled: CheckFilledIcon,
  X: XIcon,
  Plus: PlusIcon,
  Minus: MinusIcon,
  Edit: EditIcon,
  Trash: TrashIcon,
  ExternalLink: ExternalLinkIcon,
  Link: LinkIcon,

  // Status
  Info: InfoIcon,
  AlertCircle: AlertCircleIcon,
  AlertCircleFilled: AlertCircleFilledIcon,
  Warning: WarningIcon,
  WarningFilled: WarningFilledIcon,
  CheckCircle: CheckCircleIcon,
  Clock: ClockIcon,

  // Trends
  TrendUp: TrendUpIcon,
  TrendDown: TrendDownIcon,
  ArrowUp: ArrowUpIcon,
  ArrowDown: ArrowDownIcon,

  // UI
  Menu: MenuIcon,
  Search: SearchIcon,
  Filter: FilterIcon,
  MoreVertical: MoreVerticalIcon,

  // Calendar
  Calendar: CalendarIcon,
  CalendarRecurring: CalendarRecurringIcon,

  // User/Auth
  User: UserIcon,
  Logout: LogoutIcon,
  Lock: LockIcon,
  Shield: ShieldIcon,
  Key: KeyIcon,

  // Theme
  Moon: MoonIcon,
  Sun: SunIcon,

  // Misc
  Inbox: InboxIcon,
  Package: PackageIcon,
  Blocked: BlockedIcon,
  Eye: EyeIcon,
  EyeOff: EyeOffIcon,
  Download: DownloadIcon,
  GitHub: GitHubIcon,
  Monarch: MonarchIcon,
} as const;

// Individual icons are exported inline via `export function`
// Use named imports: import { SettingsIcon, RefreshIcon } from './components/icons';
