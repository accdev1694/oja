### Story 2.1: Pantry Schema & Basic CRUD Operations

As a **user**,
I want **to add, view, edit, and delete pantry items**,
So that **I can maintain an accurate list of what's in my kitchen**.

**Acceptance Criteria:**

**Given** I am a logged-in user
**When** I access the Pantry tab
**Then** I can see all my pantry items from Convex in real-time

**Given** I want to add a new item
**When** I tap the "+" button
**Then** I see a form with fields: name, category, initialStockLevel
**And** I can select from predefined categories (Produce, Dairy, Meat, Pantry Staples, Frozen, Beverages, Condiments, Snacks)
**And** After submitting, the item is saved to Convex with userId, name, category, stockLevel, lastUpdated, createdAt

**Given** I want to edit an existing item
**When** I long-press on an item
**Then** I see options: Edit, Delete
**And** If I tap Edit, I can modify the name and category
**And** Changes are saved in real-time to Convex

**Given** I want to delete an item
**When** I long-press and select Delete
**Then** I see a confirmation dialog
**And** After confirming, the item is removed from Convex
**And** I feel a haptic feedback

**Technical Requirements:**
- `convex/schema.ts`: `pantryItems` table with userId, name, category, stockLevel, lastUpdated, createdAt
- `convex/pantryItems.ts`: queries (`getByUser`, `getById`) and mutations (`create`, `update`, `delete`, `updateStockLevel`)
- `app/(app)/(tabs)/index.tsx`: Pantry screen with real-time Convex query
- Form validation for required fields
- FR8, FR9, FR15

---

