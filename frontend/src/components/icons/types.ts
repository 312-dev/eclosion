/**
 * Icon Types
 *
 * Shared type definitions for icon components.
 */

import type { SVGProps } from 'react';

/**
 * Base props for all icon components.
 * Extends SVG props for full customization.
 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Icon size in pixels. Defaults to 24. */
  size?: number | string;
  /** Icon color. Defaults to 'currentColor'. */
  color?: string;
}

/**
 * Default icon props applied to all icons.
 */
export const defaultIconProps = {
  size: 24,
  color: 'currentColor',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};
