# Eclosion Frontend Standardization Plan

A parallelizable plan for standardizing the frontend codebase. Each work stream can be tackled independently by separate agents.

---

## Quick Reference

| Stream | Priority | Est. Files | Dependencies |
|--------|----------|------------|--------------|
| A. Hover Handler Extraction | Critical | 15+ | None |
| B. Component Splitting | Critical | 8 | None |
| C. Accessibility | Critical | 20+ | None |
| D. Component Testing | Critical | 10+ | None |
| E. SVG Icon System | High | 25+ | None |
| F. Inline Style Migration | High | 30+ | A (partial) |
| G. Z-Index System | High | 15+ | None |
| H. Error Handling | High | 10+ | None |
| I. TypeScript Strictness | Medium | 40+ | None |
| J. Performance (memo) | Medium | 15+ | None |
| K. Code Cleanup | Medium | 20+ | None |
| L. New Hooks | Low | New files | None |
| M. New Components | Low | New files | None |

---

## Stream A: Hover Handler Extraction

**Priority**: Critical
**Scope**: Extract 63+ inline `onMouseEnter`/`onMouseLeave` handlers into CSS

### Problem
Components use inline JS for hover states instead of CSS `:hover`:
```tsx
// Current (bad)
onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color)'}
onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
```

### Solution
Create reusable CSS classes or use Tailwind's `hover:` variants:
```tsx
// Target
className="bg-transparent hover:bg-[var(--monarch-bg-page)]"
```

### Files to Modify
- [ ] `components/ConfigPanel.tsx` - 4 hover handlers
- [ ] `components/ReadyToAssign.tsx` - 3 hover handlers
- [ ] `components/RecurringList.tsx` - 8+ hover handlers
- [ ] `components/CategoryCard.tsx` - 3 hover handlers
- [ ] `components/Dashboard.tsx` - Multiple handlers
- [ ] `components/tabs/MappingsTab.tsx` - Multiple handlers
- [ ] `components/tabs/RecurringTab.tsx` - Multiple handlers
- [ ] `components/tabs/ManualAssignTab.tsx` - Multiple handlers
- [ ] `components/wizards/SetupWizard.tsx` - Multiple handlers
- [ ] `components/wizards/RecurringSetupWizard.tsx` - Multiple handlers
- [ ] `components/ui/Toast.tsx` - 1 hover handler
- [ ] `components/ui/SearchableSelect.tsx` - Multiple handlers
- [ ] `components/ui/Tooltip.tsx` - Hover handlers
- [ ] `components/layout/Sidebar.tsx` - Multiple handlers
- [ ] `components/layout/AppShell.tsx` - Multiple handlers

### Acceptance Criteria
- [ ] Zero `onMouseEnter`/`onMouseLeave` for simple hover color changes
- [ ] Complex hover logic (conditional, stateful) may remain in JS
- [ ] All hover states visually identical before/after

### Notes
- Can create utility classes in `index.css` for common patterns
- Watch for dynamic color values that truly need JS

---

## Stream B: Component Splitting

**Priority**: Critical
**Scope**: Split 8 large files (300+ lines) into focused modules

### Files to Split

#### 1. `RecurringList.tsx` (807 lines)
Split into:
- [ ] `RecurringList.tsx` - Main list container
- [ ] `RecurringListItem.tsx` - Individual item row
- [ ] `RecurringListHeader.tsx` - Header with sort/filter
- [ ] `ActionsDropdown.tsx` - Actions menu (already partially extracted)
- [ ] `BulkActionsBar.tsx` - Bulk selection actions

#### 2. `Dashboard.tsx` (456 lines)
Split into:
- [ ] `Dashboard.tsx` - Main layout/orchestration
- [ ] `DashboardHeader.tsx` - Title, config, refresh
- [ ] `DashboardStats.tsx` - Statistics display
- [ ] `CategorySection.tsx` - Category grouping

#### 3. `SetupWizard.tsx` (422 lines)
Split into:
- [ ] `SetupWizard.tsx` - Main wizard flow
- [ ] `WizardStepIndicator.tsx` - Progress indicator
- [ ] `WizardNavigation.tsx` - Next/back buttons
- [ ] Move step content to `wizards/steps/`

#### 4. `RecurringSetupWizard.tsx` (394 lines)
Split into:
- [ ] `RecurringSetupWizard.tsx` - Main flow
- [ ] Shared step components with SetupWizard
- [ ] `RecurringWizardSteps.tsx` - Recurring-specific steps

#### 5. `CategoryCard.tsx` (361 lines)
Split into:
- [ ] `CategoryCard.tsx` - Main card container
- [ ] `CategoryProgress.tsx` - Progress bar component
- [ ] `CategoryActions.tsx` - Action buttons
- [ ] `EmojiPicker.tsx` - Emoji selection (may already exist)

#### 6. `MappingsTab.tsx` (334 lines)
Split into:
- [ ] `MappingsTab.tsx` - Main container
- [ ] `MappingsList.tsx` - List display
- [ ] `MappingItem.tsx` - Individual mapping row
- [ ] `MappingForm.tsx` - Add/edit form

#### 7. `ManualAssignTab.tsx` (323 lines)
Split into:
- [ ] `ManualAssignTab.tsx` - Main container
- [ ] `AssignmentList.tsx` - List of assignments
- [ ] `AssignmentItem.tsx` - Individual item
- [ ] `AssignmentControls.tsx` - Action controls

#### 8. `RecurringTab.tsx` (303 lines)
Split into:
- [ ] `RecurringTab.tsx` - Main container
- [ ] Shared components with RecurringList

### Acceptance Criteria
- [ ] No file exceeds 300 lines
- [ ] Each component has single responsibility
- [ ] Imports/exports properly organized
- [ ] No functionality regression

---

## Stream C: Accessibility Improvements

**Priority**: Critical
**Scope**: Add ARIA attributes, keyboard navigation, screen reader support

### Tasks

#### 1. ARIA Labels
- [ ] Add `aria-label` to all icon-only buttons
- [ ] Add `aria-describedby` for form inputs with helper text
- [ ] Add `aria-expanded` to all dropdown triggers
- [ ] Add `aria-haspopup` to menu buttons
- [ ] Add `aria-live` regions for dynamic content
- [ ] Add `role` attributes where semantic HTML isn't used

#### 2. Keyboard Navigation
- [ ] Add `onKeyDown` handlers to clickable divs
- [ ] Implement arrow key navigation in dropdowns
- [ ] Add Escape key to close modals/dropdowns
- [ ] Ensure Tab order is logical
- [ ] Add focus trapping in modals

#### 3. Focus Management
- [ ] Add visible focus indicators (`:focus-visible`)
- [ ] Manage focus when modals open/close
- [ ] Return focus after dropdown closes

#### 4. Semantic HTML
- [ ] Replace clickable `<div>` with `<button>` where appropriate
- [ ] Use `<nav>` for navigation sections
- [ ] Use `<main>` for primary content
- [ ] Use `<aside>` for sidebar
- [ ] Use proper heading hierarchy (h1 > h2 > h3)

### Files to Audit
- [ ] All files in `components/ui/`
- [ ] `components/layout/Sidebar.tsx`
- [ ] `components/layout/AppShell.tsx`
- [ ] All dropdown components
- [ ] All modal/dialog components
- [ ] Form components

### Acceptance Criteria
- [ ] Zero aXe/WAVE accessibility errors
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces dynamic changes

---

## Stream D: Component Testing Setup

**Priority**: Critical
**Scope**: Add Vitest + React Testing Library tests

### Infrastructure (if not done)
- [ ] Install `@testing-library/react`, `@testing-library/jest-dom`
- [ ] Configure `vitest.config.ts` with jsdom
- [ ] Create `test/setup.ts` with testing-library matchers
- [ ] Create `test/test-utils.tsx` with provider wrapper

### Tests to Create

#### Utility Tests (start here)
- [ ] `utils/formatters.test.ts` - Currency, date formatting
- [ ] `utils/status.test.ts` - Status calculations
- [ ] `utils/validation.test.ts` - Input validation

#### Hook Tests
- [ ] `hooks/useClickOutside.test.ts`
- [ ] `hooks/useDropdown.test.ts`
- [ ] `hooks/useAsync.test.ts`
- [ ] `hooks/useLocalStorage.test.ts` (if created)

#### Component Tests (priority order)
- [ ] `ui/StatusBadge.test.tsx` - Simple, good starter
- [ ] `ui/SearchableSelect.test.tsx` - Complex interactions
- [ ] `ui/Toast.test.tsx` - Animation, auto-dismiss
- [ ] `ui/Tooltip.test.tsx` - Hover behavior
- [ ] `CategoryCard.test.tsx` - Core business logic
- [ ] `RecurringList.test.tsx` - List behavior
- [ ] `Dashboard.test.tsx` - Integration

#### Context Tests
- [ ] `context/ThemeContext.test.tsx`
- [ ] `context/ToastContext.test.tsx`
- [ ] `context/AuthContext.test.tsx`

### Acceptance Criteria
- [ ] 80%+ coverage on utility functions
- [ ] All hooks have tests
- [ ] Critical user paths have integration tests
- [ ] Tests run in CI

---

## Stream E: SVG Icon System

**Priority**: High
**Scope**: Extract inline SVGs to reusable icon components

### Current State
25+ inline SVG definitions duplicated across components.

### Solution Options

#### Option 1: Icon Components (Recommended)
```tsx
// components/icons/index.tsx
export const Icons = {
  Settings: (props) => <svg {...props}>...</svg>,
  Refresh: (props) => <svg {...props}>...</svg>,
  // etc.
} as const;

// Usage
<Icons.Settings className="h-5 w-5" />
```

#### Option 2: Icon Library
Use `lucide-react` or `@heroicons/react` if icons match.

### Icons to Extract
- [ ] Settings gear
- [ ] Refresh/sync arrows
- [ ] Chevron (up/down/left/right)
- [ ] Check/checkmark
- [ ] X/close
- [ ] Plus
- [ ] Minus
- [ ] Edit/pencil
- [ ] Trash/delete
- [ ] External link
- [ ] Info circle
- [ ] Warning triangle
- [ ] Error circle
- [ ] Success checkmark
- [ ] Arrow (various directions)
- [ ] Menu/hamburger
- [ ] Search magnifier
- [ ] Filter funnel
- [ ] Sort arrows
- [ ] Calendar
- [ ] Clock
- [ ] User
- [ ] Logout
- [ ] Moon (theme)
- [ ] Sun (theme)

### Files to Create
- [ ] `components/icons/index.tsx` - Icon components
- [ ] `components/icons/types.ts` - Shared icon props type

### Acceptance Criteria
- [ ] Zero inline SVG definitions in component files
- [ ] All icons exported from single location
- [ ] Icons accept className, size props
- [ ] Tree-shakeable exports

---

## Stream F: Inline Style Migration

**Priority**: High
**Scope**: Convert 798 inline styles to CSS/Tailwind classes

### Strategy
1. CSS custom properties stay (they're dynamic)
2. Static styles → Tailwind classes
3. Repeated patterns → utility classes in `index.css`

### Common Patterns to Extract

#### Colors (keep as CSS vars)
```tsx
// These are OK - dynamic theming
style={{ color: 'var(--monarch-text-dark)' }}
```

#### Layout (migrate to Tailwind)
```tsx
// Before
style={{ display: 'flex', gap: '8px', padding: '16px' }}
// After
className="flex gap-2 p-4"
```

#### Positioning (migrate to Tailwind)
```tsx
// Before
style={{ position: 'absolute', top: 0, right: 0 }}
// After
className="absolute top-0 right-0"
```

### Files by Inline Style Count (descending)
1. [ ] `RecurringList.tsx` - ~100 styles
2. [ ] `Dashboard.tsx` - ~80 styles
3. [ ] `CategoryCard.tsx` - ~60 styles
4. [ ] `SetupWizard.tsx` - ~50 styles
5. [ ] `ConfigPanel.tsx` - ~40 styles
6. [ ] `MappingsTab.tsx` - ~40 styles
7. [ ] `ManualAssignTab.tsx` - ~35 styles
8. [ ] `RecurringTab.tsx` - ~35 styles
9. [ ] `Sidebar.tsx` - ~30 styles
10. [ ] All remaining components

### Acceptance Criteria
- [ ] Inline styles only for truly dynamic values
- [ ] Common patterns extracted to utility classes
- [ ] No visual regressions
- [ ] Reduced bundle size

---

## Stream G: Z-Index System

**Priority**: High
**Scope**: Centralize z-index values to prevent stacking conflicts

### Current State
Random z-index values: `z-10`, `z-20`, `z-30`, `z-40`, `z-50`, `z-[100]`

### Solution
Create z-index scale in constants:

```typescript
// constants/index.ts
export const Z_INDEX = {
  DROPDOWN: 10,
  STICKY_HEADER: 20,
  MODAL_BACKDROP: 30,
  MODAL: 40,
  TOAST: 50,
  TOOLTIP: 60,
} as const;
```

Or Tailwind config:
```js
// tailwind.config.js
zIndex: {
  dropdown: '10',
  sticky: '20',
  'modal-backdrop': '30',
  modal: '40',
  toast: '50',
  tooltip: '60',
}
```

### Files to Update
- [ ] `components/Portal.tsx`
- [ ] `components/ui/Toast.tsx`
- [ ] `components/ui/Tooltip.tsx`
- [ ] `components/ui/Modal.tsx` (if exists)
- [ ] `components/ui/SearchableSelect.tsx`
- [ ] `components/ConfigPanel.tsx`
- [ ] `components/ReadyToAssign.tsx`
- [ ] All dropdown components
- [ ] All modal/dialog components

### Acceptance Criteria
- [ ] Single source of truth for z-index values
- [ ] No arbitrary z-index values in components
- [ ] Clear hierarchy documented
- [ ] No stacking context bugs

---

## Stream H: Error Handling Standardization

**Priority**: High
**Scope**: Consistent error handling patterns across components

### Current State
Mixed patterns:
```tsx
// Pattern 1
catch (err) {
  setError(err instanceof Error ? err.message : 'Failed');
}

// Pattern 2
catch (error) {
  console.error('Operation failed:', error);
  setError('Something went wrong');
}

// Pattern 3 - using useAsync
const { error } = useAsync(fetchData);
```

### Solution
Standardize on utility function:

```typescript
// utils/errors.ts
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export function handleApiError(error: unknown, context: string): string {
  console.error(`${context}:`, error);
  return getErrorMessage(error);
}
```

### Files to Update
- [ ] Create/update `utils/errors.ts`
- [ ] `components/Dashboard.tsx`
- [ ] `components/ConfigPanel.tsx`
- [ ] `components/CategoryCard.tsx`
- [ ] `components/RecurringList.tsx`
- [ ] `components/tabs/MappingsTab.tsx`
- [ ] `components/tabs/ManualAssignTab.tsx`
- [ ] `components/tabs/RecurringTab.tsx`
- [ ] `api/client.ts`
- [ ] All components with try/catch blocks

### Acceptance Criteria
- [ ] Single error utility used everywhere
- [ ] Consistent error messages
- [ ] Errors logged with context
- [ ] User-friendly error display

---

## Stream I: TypeScript Strictness

**Priority**: Medium
**Scope**: Improve type safety across codebase

### Tasks

#### 1. Enable Stricter Checks (tsconfig.json)
- [ ] `noUncheckedIndexedAccess: true`
- [ ] `exactOptionalPropertyTypes: true`
- [ ] `noPropertyAccessFromIndexSignature: true`

#### 2. Replace `any` Types
Search for and fix:
- [ ] Explicit `any` types
- [ ] Implicit `any` from missing types
- [ ] `as any` type assertions

#### 3. Add Missing Type Annotations
- [ ] Function return types
- [ ] Event handler parameter types
- [ ] API response types

#### 4. Use Type Imports Consistently
```tsx
// Before
import { FC, useState } from 'react';
import { CategoryGroup } from '../types';

// After
import { useState } from 'react';
import type { FC } from 'react';
import type { CategoryGroup } from '../types';
```

#### 5. Fix Unsafe Patterns
- [ ] Replace `!` non-null assertions with proper checks
- [ ] Add null checks for optional chaining
- [ ] Use discriminated unions where appropriate

### Acceptance Criteria
- [ ] Zero `any` types (explicit or implicit)
- [ ] Strict mode enabled in tsconfig
- [ ] Consistent type import style
- [ ] No TypeScript errors

---

## Stream J: Performance Optimizations

**Priority**: Medium
**Scope**: Add React.memo, useMemo, useCallback where beneficial

### Candidates for React.memo

High-impact (rendered in lists):
- [ ] `CategoryCard` - Rendered multiple times
- [ ] `RecurringListItem` - Large lists
- [ ] `MappingItem` - List items
- [ ] `StatusBadge` - Frequently rendered
- [ ] `Toast` - Re-renders on list changes

Medium-impact:
- [ ] `Sidebar` - Stable unless route changes
- [ ] `Header` components
- [ ] Icon components

### useMemo Candidates
- [ ] Filtered/sorted lists
- [ ] Computed totals
- [ ] Derived state

### useCallback Candidates
- [ ] Event handlers passed to children
- [ ] Callbacks in useEffect dependencies

### Anti-patterns to Avoid
- Don't memo everything
- Don't wrap primitives in useMemo
- Profile before optimizing

### Acceptance Criteria
- [ ] List items wrapped in memo
- [ ] Expensive computations memoized
- [ ] No unnecessary re-renders (verify with React DevTools)
- [ ] No premature optimization

---

## Stream K: Code Cleanup

**Priority**: Medium
**Scope**: Remove dead code, console statements, TODO comments

### Tasks

#### 1. Remove Console Statements
Search and remove (except error logging):
- [ ] `console.log`
- [ ] `console.debug`
- [ ] `console.info`
- [ ] `console.warn` (review case-by-case)

Keep:
- `console.error` in catch blocks

#### 2. Remove Dead Code
- [ ] Unused imports
- [ ] Unused variables
- [ ] Commented-out code blocks
- [ ] Unreachable code

#### 3. Address TODO Comments
- [ ] Audit all TODO/FIXME/HACK comments
- [ ] Create issues for legitimate TODOs
- [ ] Remove stale TODOs
- [ ] Complete trivial TODOs inline

#### 4. Remove Unused Dependencies
- [ ] Audit package.json
- [ ] Remove unused packages
- [ ] Update outdated packages

#### 5. Standardize Timeouts/Intervals
Replace magic numbers:
```tsx
// Before
setTimeout(() => {}, 300);

// After
import { UI } from '../constants';
setTimeout(() => {}, UI.ANIMATION.NORMAL);
```

### Acceptance Criteria
- [ ] Zero console.log statements
- [ ] Zero unused imports (ESLint clean)
- [ ] All TODOs addressed or tracked
- [ ] No magic numbers for timing

---

## Stream L: New Hooks

**Priority**: Low
**Scope**: Create additional utility hooks

### Hooks to Create

#### 1. useLocalStorage
```typescript
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]
```
- Type-safe localStorage access
- JSON serialization
- SSR-safe

#### 2. useKeyboardShortcut
```typescript
function useKeyboardShortcut(key: string, callback: () => void, options?: { ctrl?: boolean, shift?: boolean }): void
```
- Global keyboard shortcuts
- Modifier key support
- Automatic cleanup

#### 3. useDebounce
```typescript
function useDebounce<T>(value: T, delay: number): T
```
- Debounced value updates
- Configurable delay

#### 4. useMediaQuery
```typescript
function useMediaQuery(query: string): boolean
```
- Responsive breakpoint detection
- SSR-safe

#### 5. usePrevious
```typescript
function usePrevious<T>(value: T): T | undefined
```
- Track previous value
- Useful for comparisons

### Files to Create
- [ ] `hooks/useLocalStorage.ts`
- [ ] `hooks/useKeyboardShortcut.ts`
- [ ] `hooks/useDebounce.ts`
- [ ] `hooks/useMediaQuery.ts`
- [ ] `hooks/usePrevious.ts`
- [ ] Tests for each hook

### Acceptance Criteria
- [ ] Full TypeScript support
- [ ] Unit tests for each hook
- [ ] JSDoc documentation
- [ ] Exported from hooks/index.ts

---

## Stream M: New Components

**Priority**: Low
**Scope**: Create reusable UI components

### Components to Create

#### 1. Modal Component
```tsx
<Modal isOpen={open} onClose={close} title="Title">
  {children}
</Modal>
```
- Portal-based rendering
- Focus trapping
- Escape to close
- Click outside to close

#### 2. Card Component
```tsx
<Card variant="default" padding="md">
  {children}
</Card>
```
- Consistent card styling
- Variant support
- Padding options

#### 3. Button Variants
```tsx
<Button variant="primary" size="md" loading={false}>
  Click me
</Button>
```
- Primary, secondary, ghost variants
- Size options
- Loading state
- Disabled state

#### 4. CloseButton
```tsx
<CloseButton onClick={onClose} size="sm" />
```
- Consistent close button
- Accessibility built-in
- Size variants

#### 5. LoadingSpinner
```tsx
<LoadingSpinner size="md" />
```
- Consistent loading indicator
- Size variants
- Color customization

#### 6. EmptyState
```tsx
<EmptyState
  icon={<Icon />}
  title="No items"
  description="Add an item to get started"
  action={<Button>Add Item</Button>}
/>
```
- Consistent empty state display
- Customizable content

### Files to Create
- [ ] `components/ui/Modal.tsx`
- [ ] `components/ui/Card.tsx`
- [ ] `components/ui/Button.tsx`
- [ ] `components/ui/CloseButton.tsx`
- [ ] `components/ui/LoadingSpinner.tsx`
- [ ] `components/ui/EmptyState.tsx`
- [ ] Tests for each component

### Acceptance Criteria
- [ ] Consistent API across components
- [ ] Full accessibility support
- [ ] Storybook stories (if using)
- [ ] Unit tests
- [ ] TypeScript props interfaces

---

## Parallel Execution Guide

### Wave 1 (No Dependencies)
These can all run simultaneously:
- Stream A: Hover Handler Extraction
- Stream B: Component Splitting
- Stream C: Accessibility
- Stream E: SVG Icon System
- Stream G: Z-Index System
- Stream H: Error Handling
- Stream I: TypeScript Strictness
- Stream K: Code Cleanup
- Stream L: New Hooks
- Stream M: New Components

### Wave 2 (After Wave 1)
- Stream D: Component Testing (after Stream B splits components)
- Stream F: Inline Style Migration (after Stream A removes hover handlers)
- Stream J: Performance (after Stream B, to memo new components)

### Coordination Notes
- Streams B and A may touch same files - coordinate or merge
- Stream F depends on Stream A completing first
- Stream D should wait for Stream B to avoid testing components that will be split
- All streams should run `npm run lint` and `npm run type-check` before PR

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Inline hover handlers | 63+ | 0 |
| Files > 300 lines | 8 | 0 |
| Inline SVGs | 25+ | 0 |
| Inline styles | 798 | <100 |
| Test coverage | ~0% | >60% |
| TypeScript `any` | Unknown | 0 |
| Console statements | Unknown | 0 |
| aXe violations | Unknown | 0 |

---

## Getting Started

For each stream:

1. **Create a branch**: `refactor/stream-{letter}-{name}`
2. **Read this file**: Understand scope and acceptance criteria
3. **Make changes**: Follow the task list
4. **Run checks**: `npm run lint && npm run type-check && npm run build`
5. **Test manually**: Verify no visual/functional regressions
6. **Create PR**: Reference this plan and stream letter

Example branch names:
- `refactor/stream-a-hover-handlers`
- `refactor/stream-b-component-splitting`
- `refactor/stream-c-accessibility`
