# Create List Flow Redesign - Implementation Plan

## Problem
Current flow immediately creates a list when user taps "Create". Users have no choice to use existing lists as templates at the point of creation.

## Solution
Add an options modal that appears before list creation, offering:
1. Start from Scratch (current behavior)
2. Use a Template (new flow)

---

## Phase 1: Core Modal Components

### File 1: `components/lists/CreateListOptionsModal.tsx`
**Purpose:** First modal - shows 2 option cards

**Props:**
```typescript
interface CreateListOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onFromScratch: () => void;
  onUseTemplate: () => void;
}
```

**UI Design:**
- GlassModal with 2 large option cards
- Card 1: "Start from Scratch" - icon: `file-document-plus-outline`, subtitle: "Create a new empty list"
- Card 2: "Use a Template" - icon: `content-copy`, subtitle: "Copy items from a previous list"
- Each card is pressable with haptic feedback
- Glassmorphic style matching app design system

---

### File 2: `components/lists/TemplatePickerModal.tsx`
**Purpose:** Second modal - shows history items to select from

**Props:**
```typescript
interface TemplatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (id: Id<"shoppingLists">, name: string) => void;
  historyLists: Array<{
    _id: Id<"shoppingLists">;
    name: string;
    status: string;
    completedAt?: number;
    createdAt: number;
    itemCount?: number;
    // ... other fields from getHistory
  }>;
}
```

**Features:**
- FlashList of history items (performance for long lists)
- Simplified card layout (no swipe, just tap)
- Shows: list name, date, item count, store name
- Search/filter bar at top (optional for Phase 2)
- "Cancel" button at bottom
- Empty state if no history

**UI Design:**
- Full-screen modal with back button
- Header: "Choose a Template"
- Search bar (Phase 2)
- Scrollable list of simplified history cards
- Each card shows key info, no swipe actions

---

## Phase 2: Integration with Lists Screen

### File 3: Update `app/(app)/(tabs)/index.tsx`

**State additions:**
```typescript
const [showCreateOptionsModal, setShowCreateOptionsModal] = useState(false);
const [showTemplatePickerModal, setShowTemplatePickerModal] = useState(false);
```

**Update `handleCreateList`:**
```typescript
async function handleCreateList() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // Show options modal instead of creating immediately
  setShowCreateOptionsModal(true);
}
```

**New handlers:**
```typescript
const handleCreateFromScratch = useCallback(async () => {
  setShowCreateOptionsModal(false);
  setIsCreating(true);
  // Existing create logic
  const name = defaultListName();
  const listId = await createList({ name, budget: 50 });
  router.push(`/list/${listId}`);
  setIsCreating(false);
}, [createList, router]);

const handleShowTemplatePicker = useCallback(() => {
  setShowCreateOptionsModal(false);
  setShowTemplatePickerModal(true);
}, []);

const handlePickTemplate = useCallback((listId: Id<"shoppingLists">, listName: string) => {
  setShowTemplatePickerModal(false);
  setSelectedTemplateId(listId);
  setSelectedTemplateName(listName);
  setShowTemplateModal(true);
}, []);
```

**Render modals:**
```typescript
{/* Create Options Modal */}
<CreateListOptionsModal
  visible={showCreateOptionsModal}
  onClose={() => setShowCreateOptionsModal(false)}
  onFromScratch={handleCreateFromScratch}
  onUseTemplate={handleShowTemplatePicker}
/>

{/* Template Picker Modal */}
<TemplatePickerModal
  visible={showTemplatePickerModal}
  onClose={() => setShowTemplatePickerModal(false)}
  onSelectTemplate={handlePickTemplate}
  historyLists={history || []}
/>

{/* Existing CreateFromTemplateModal - unchanged */}
<CreateFromTemplateModal ... />
```

---

## Phase 3: Keep Swipe Gesture as Alternative

**No changes needed** - the swipe gesture on history cards remains as a quick action for power users who are already in the History tab.

**Two paths to template creation:**
1. **Main path:** Create button → Options modal → Template picker → Preview modal
2. **Quick path:** History tab → Swipe left → Use as Template → Preview modal

---

## Testing Checklist

### Manual Tests
- [ ] Tap header "+" button → Options modal appears
- [ ] Tap "Start from Scratch" → List created immediately, navigates to detail
- [ ] Tap "Use a Template" → Template picker appears
- [ ] Template picker shows all history items
- [ ] Tap template in picker → Preview modal appears
- [ ] Confirm template creation → New list created and navigates
- [ ] Cancel at each step works correctly
- [ ] Swipe gesture still works in History tab
- [ ] EmptyLists "Create" button → Options modal appears
- [ ] Inline create card → Options modal appears

### Edge Cases
- [ ] No history available → Template picker shows empty state
- [ ] Only 1 history item → Template picker still shows properly
- [ ] Modal state resets between opens
- [ ] Haptic feedback on all interactions
- [ ] Loading states during creation

---

## Styling Guidelines

**CreateListOptionsModal:**
- 2 large cards with ~80px height each
- Icon size: 28px
- Title: `typography.headlineSmall`
- Subtitle: `typography.bodyMedium`, `colors.text.tertiary`
- Gap between cards: `spacing.md`
- Pressable scale animation on press

**TemplatePickerModal:**
- Full screen with safe area
- Header with back button
- Simplified card: 1 line name + meta row (date, items, store)
- Card height: ~60px
- No swipe actions, just tap

---

## Implementation Order

1. ✅ Create `CreateListOptionsModal.tsx`
2. ✅ Create `TemplatePickerModal.tsx`
3. ✅ Update Lists screen state and handlers
4. ✅ Test all paths
5. ✅ Commit and push

---

## Files to Create/Modify

| File | Type | Lines (est) |
|------|------|-------------|
| `components/lists/CreateListOptionsModal.tsx` | NEW | ~150 |
| `components/lists/TemplatePickerModal.tsx` | NEW | ~250 |
| `app/(app)/(tabs)/index.tsx` | MODIFY | +50 |

**Total new code:** ~450 lines
