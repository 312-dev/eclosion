/**
 * Custom React Hooks
 *
 * Re-exports all custom hooks for convenient importing.
 *
 * Usage:
 *   import { useClickOutside, useDropdown, useAsync } from '../hooks';
 */

export { useClickOutside } from './useClickOutside';

export {
  useDropdown,
  type DropdownPosition,
  type UseDropdownOptions,
  type UseDropdownReturn,
} from './useDropdown';

export {
  useAsync,
  useAsyncEffect,
  type UseAsyncState,
  type UseAsyncOptions,
  type UseAsyncReturn,
} from './useAsync';

export {
  useEditableField,
  type UseEditableFieldOptions,
  type UseEditableFieldReturn,
} from './useEditableField';

export { usePageTitle, getAppTitle } from './usePageTitle';
