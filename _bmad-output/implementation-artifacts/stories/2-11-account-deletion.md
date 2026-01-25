# Story 2.11: Account Deletion

Status: review

## Story

As a **user**,
I want **to delete my account and all associated data**,
So that **I can exercise my GDPR rights**.

## Acceptance Criteria

1. **"Delete Account" option** visible in Settings > Account section
2. **Confirmation dialog** explains consequences of deletion
3. **Type "DELETE" confirmation** required before proceeding
4. **All local data cleared** on successful deletion
5. **User signed out** after deletion completes
6. **Graceful error handling** if deletion fails

## Tasks / Subtasks

- [x] **Task 1: Create DeleteAccountDialog Component** (AC: #2, #3)
  - [x] Create `src/components/account/DeleteAccountDialog.tsx`
  - [x] Modal dialog with warning message
  - [x] Text input requiring "DELETE" to enable confirm button
  - [x] Cancel and Delete buttons
  - [x] Loading state during deletion

- [x] **Task 2: Create Account Deletion Utilities** (AC: #4)
  - [x] Create `src/lib/utils/accountDeletion.ts`
  - [x] Function to clear all localStorage data
  - [x] Function to clear IndexedDB if used
  - [x] Prepare for Supabase account deletion integration

- [x] **Task 3: Update Settings Page** (AC: #1, #5, #6)
  - [x] Add "Danger Zone" section with Delete Account button
  - [x] Integrate DeleteAccountDialog
  - [x] Handle deletion flow and redirect to login
  - [x] Show error message if deletion fails

- [x] **Task 4: Add Tests** (AC: all)
  - [x] Unit tests for DeleteAccountDialog component (27 tests)
  - [x] Unit tests for account deletion utilities (15 tests)
  - [x] Test confirmation flow
  - [x] Test error handling

- [x] **Task 5: Run build and verify** - All 419 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Components organized by feature in `src/components/`
- Utilities in `src/lib/utils/`
- Use existing UI components (Button, etc.)

### GDPR Requirements

- Users must be able to delete their account
- All personal data must be removable
- Clear explanation of what will be deleted
- Confirmation required to prevent accidental deletion

### DeleteAccountDialog Pattern

```typescript
interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}
```

### Data to Clear

```typescript
// localStorage keys to clear
const STORAGE_KEYS_TO_CLEAR = [
  'onboarding_products',
  'oja_default_budget',
  'oja_location_granted',
  'oja_currency',
  'oja_country',
  'oja_onboarding_complete',
  'oja_pantry_items',
  'oja_subscription_status',
];

// Supabase data (for future implementation)
// - profiles table row
// - stock_items rows
// - shopping_lists rows
// - receipts rows
```

### Confirmation UX

- Dialog title: "Delete Your Account?"
- Warning text explaining:
  - All pantry items will be deleted
  - All shopping lists will be deleted
  - All saved preferences will be lost
  - This action cannot be undone
- Text input with placeholder "Type DELETE to confirm"
- Delete button disabled until "DELETE" typed exactly

### File Structure

```
src/
├── components/
│   └── account/
│       ├── DeleteAccountDialog.tsx     # NEW
│       ├── __tests__/
│       │   └── DeleteAccountDialog.test.tsx # NEW
│       └── index.ts                    # NEW
├── lib/
│   └── utils/
│       └── accountDeletion.ts          # NEW
├── app/
│   └── (app)/
│       └── settings/
│           └── page.tsx                # UPDATE
```

### Previous Story Learnings (2-10)

- Settings page is a client component
- localStorage utilities pattern established
- Use consistent styling with existing sections

### References

- [Source: epics.md#Story-2.11] - Acceptance criteria
- [Source: prd.md] - GDPR compliance requirements
- [Source: stories/2-10-subscription-status-management.md] - Settings page patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created DeleteAccountDialog modal component with warning icon and consequences list
- Requires typing "DELETE" exactly to enable the delete button (GDPR safety)
- Warning lists all data that will be removed (pantry items, shopping lists, preferences, subscription)
- Account deletion utilities clear localStorage, IndexedDB, and service worker caches
- Prepared for Supabase integration with deleteSupabaseAccount placeholder
- Settings page updated with red "Danger Zone" section at bottom
- Delete button styled with red theme to indicate destructive action
- On successful deletion, user is redirected to /login?deleted=true
- Error handling displays error message in dialog
- All animations respect reduced motion preference
- 42 new tests across dialog and utilities
- All 419 tests passing, production build successful

### File List

- `src/components/account/DeleteAccountDialog.tsx` (NEW)
- `src/components/account/__tests__/DeleteAccountDialog.test.tsx` (NEW)
- `src/components/account/index.ts` (NEW)
- `src/lib/utils/accountDeletion.ts` (NEW)
- `src/lib/utils/__tests__/accountDeletion.test.ts` (NEW)
- `src/app/(app)/settings/page.tsx` (UPDATED - added Danger Zone section)

