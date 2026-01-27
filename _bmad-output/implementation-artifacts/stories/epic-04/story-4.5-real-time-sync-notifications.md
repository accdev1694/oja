### Story 4.5: Real-time Sync & Notifications

As a **partner on a shared list**,
I want **to see changes in real-time**,
So that **everyone stays on the same page**.

**Acceptance Criteria:**

**Given** I'm viewing a shared list
**When** another partner adds an item
**Then** I see the item appear instantly (no refresh needed)
**And** I see a subtle toast: "[Partner] added [item]"
**And** I feel a light haptic feedback

**Given** I'm viewing a shared list
**When** another partner checks off an item
**Then** the item strikethrough appears instantly
**And** If we both check off the last item simultaneously, only one celebration shows

**Given** I receive a partner action notification
**When** my partner approves, contests, or comments
**Then** I receive a push notification even if the app is closed
**And** Tapping the notification opens the list directly

**Given** I'm offline and a partner makes changes
**When** I come back online
**Then** I see all changes sync automatically
**And** If there's a conflict (e.g., we both edited the same item), the latest change wins

**Given** multiple partners are editing simultaneously
**When** we all make changes
**Then** everyone sees each other's changes in real-time
**And** Convex handles conflict resolution automatically

**Given** I leave a shared list
**When** I tap "Leave List"
**Then** I'm removed as a partner
**And** The list owner receives a notification: "[Partner] left your list"
**And** I no longer see the list in my Lists tab

**Technical Requirements:**
- Convex real-time queries automatically sync changes
- Push notification service (Expo Notifications)
- Notification handlers for: approval, contest, comment, item added/removed
- Optimistic updates for instant UI feedback
- Conflict resolution (last-write-wins)
- FR193, FR201, FR202

---

## Epic 5: Receipt Intelligence & Price History

