# AI Product Scanning - Session Checkpoint

## Current Feature State
The AI Product Scanning feature with size estimation and immediate user review flow has been implemented and refined.

### What's Working:
1. **AI Honesty & Strictness (`convex/ai.ts`)**: 
   - The AI prompt has been hardened. It is explicitly instructed to distinguish between reading a size off a package versus guessing a standard size based on product knowledge.
   - It now accurately returns `sizeSource` as `"visible"`, `"estimated"`, or `"unknown"`.
2. **Auto-Trigger Review Modal (`app/(app)/(tabs)/scan.tsx`)**: 
   - If the AI returns an estimated size or cannot find a size (`sizeSource === "estimated" || "unknown"` or missing `size`), the `EditScannedItemModal` automatically pops open after the scan completes.
   - This explicitly interrupts the workflow to ask the user to confirm the guess or provide the missing data.
3. **UI Badges & Feedback (`components/scan/EditScannedItemModal.tsx`)**: 
   - **Estimated State**: Displays a blue "Estimated" badge with an `auto-fix` icon and highlights the input field with a warning border.
   - **Missing State**: Displays a yellow "Missing" badge with an alert icon and highlights the empty input field.
   - Clear helper text explains why size is important for duplicate detection and pricing accuracy.
4. **Bug Fixes**:
   - Resolved a `ReferenceError` for `formatShortDate` in `HistoryCard` and `TemplatePickerModal` by hoisting the helper function outside the component definitions.

## Next Steps for Next Session:
- **Test the Hardened AI Prompt**: Verify that the AI correctly flags "Estimated" when scanning standard products where the size text is intentionally obscured (e.g., scanning the side of a beans tin).
- **Test the "Name-Only" Edge Case**: Ensure that scanning an unlabelled or generic item (like loose fruit) correctly triggers the "Missing" flow.
- **Iterate on the Add to List Flow**: Ensure that when these reviewed items are eventually added to the shopping list, the confirmed/corrected size data flows perfectly into the list items and variant databases.