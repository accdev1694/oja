# Oja Security Guidelines - Expo + Convex

> Security best practices for the Oja mobile application.

---

## Overview

This document outlines security measures for the Oja app built with Expo, Clerk, and Convex. Security is implemented across multiple layers:

1. **Authentication** - Clerk handles identity
2. **Authorization** - Convex functions verify access
3. **Data Protection** - Encryption and validation
4. **Client Security** - Secure storage and communication

---

## Authentication (Clerk)

### Configuration

```typescript
// app/_layout.tsx
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

// Use SecureStore for token storage (NOT AsyncStorage)
const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      {/* ... */}
    </ClerkProvider>
  );
}
```

### Protected Routes

```typescript
// app/(app)/_layout.tsx
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <Stack />;
}
```

### Session Management

- Clerk handles session tokens automatically
- Tokens stored in SecureStore (encrypted on device)
- Sessions expire and refresh automatically
- Sign out clears all local tokens

---

## Authorization (Convex)

### User Ownership Verification

**CRITICAL**: Every mutation must verify the user owns the resource.

```typescript
// convex/shoppingLists.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const update = mutation({
  args: {
    id: v.id("shoppingLists"),
    updates: v.object({
      name: v.optional(v.string()),
      budget: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // ALWAYS verify ownership
    const list = await ctx.db.get(args.id);

    if (!list) {
      throw new Error("List not found");
    }

    // Get current user from Clerk identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || list.userId !== user._id) {
      throw new Error("Not authorized to modify this list");
    }

    // Proceed with update
    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});
```

### Helper Function for Auth Check

```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "../_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

export async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export async function requireOwnership(
  ctx: QueryCtx | MutationCtx,
  resourceUserId: string
) {
  const user = await requireCurrentUser(ctx);
  if (user._id !== resourceUserId) {
    throw new Error("Not authorized");
  }
  return user;
}
```

### Usage Pattern

```typescript
// convex/pantryItems.ts
import { mutation } from "./_generated/server";
import { requireCurrentUser, requireOwnership } from "./lib/auth";

export const create = mutation({
  args: { name: v.string(), category: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    return await ctx.db.insert("pantryItems", {
      userId: user._id,
      ...args,
      stockLevel: "stocked",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("pantryItems"), updates: v.any() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    await requireOwnership(ctx, item.userId);

    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});
```

---

## Environment Variables

### Client-Side (Exposed to App)

These are safe to expose as they identify your app but don't grant access:

```bash
# .env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Server-Side (Convex Backend)

**NEVER** expose these to the client. Set via Convex Dashboard:

```bash
# Convex Dashboard > Settings > Environment Variables
JINA_API_KEY=jina_...           # Jina AI embeddings
GEMINI_API_KEY=...              # Google Gemini for receipt parsing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLERK_SECRET_KEY=sk_test_...
```

### Accessing in Convex Actions

```typescript
// convex/ai.ts
import { action } from "./_generated/server";

export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    // Access server-side env var
    const apiKey = process.env.JINA_API_KEY;
    if (!apiKey) {
      throw new Error("Jina API key not configured");
    }

    // Use the key with Jina AI embeddings API...
  },
});
```

---

## Input Validation

### Convex Validators

Convex provides runtime validation via `v`:

```typescript
import { v } from "convex/values";

export const createItem = mutation({
  args: {
    // String with constraints
    name: v.string(),

    // Optional fields
    notes: v.optional(v.string()),

    // Enum/literal types
    priority: v.union(
      v.literal("must-have"),
      v.literal("should-have"),
      v.literal("nice-to-have")
    ),

    // Number constraints (validate in handler)
    quantity: v.number(),

    // Nested objects
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Additional validation
    if (args.name.length > 200) {
      throw new Error("Name too long (max 200 characters)");
    }

    if (args.quantity < 0 || args.quantity > 1000) {
      throw new Error("Invalid quantity");
    }

    // ... proceed
  },
});
```

### Client-Side Validation

Validate before sending to backend:

```typescript
const validateItemName = (name: string): string | null => {
  if (!name.trim()) return "Name is required";
  if (name.length > 200) return "Name too long";
  if (name.includes("<script>")) return "Invalid characters";
  return null;
};

const handleSubmit = async () => {
  const error = validateItemName(itemName);
  if (error) {
    Alert.alert("Error", error);
    return;
  }

  await addItem({ name: itemName.trim(), /* ... */ });
};
```

---

## File Upload Security

### Signed Upload URLs

```typescript
// convex/files.ts
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Require authentication
    await requireCurrentUser(ctx);

    // Generate short-lived upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFileReference = mutation({
  args: {
    storageId: v.string(),
    purpose: v.union(
      v.literal("receipt"),
      v.literal("pantry-photo"),
      v.literal("avatar")
    ),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Validate file exists in storage
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Invalid storage reference");
    }

    // Save reference with user ownership
    return await ctx.db.insert("fileReferences", {
      userId: user._id,
      storageId: args.storageId,
      purpose: args.purpose,
      referenceId: args.referenceId,
      createdAt: Date.now(),
    });
  },
});
```

### Client-Side Upload

```typescript
// hooks/usePhotoPicker.ts
export function usePhotoPicker() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const uploadPhoto = async (uri: string): Promise<string> => {
    // Get signed upload URL
    const uploadUrl = await generateUploadUrl();

    // Fetch the image as blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload to Convex storage
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });

    const { storageId } = await result.json();
    return storageId;
  };

  return { uploadPhoto };
}
```

---

## Data Privacy

### Sensitive Data Handling

```typescript
// Never log sensitive data
console.log("User created:", userId); // OK
console.log("User email:", email);    // BAD

// Mask in error messages
throw new Error(`Invalid user: ${userId.slice(0, 8)}...`);
```

### Data Minimization

Only store what's necessary:

```typescript
// BAD - Storing raw credit card
{
  cardNumber: "4111111111111111",
  cvv: "123",
}

// GOOD - Store Stripe reference only
{
  stripeCustomerId: "cus_xxx",
  lastFourDigits: "1111",
}
```

### User Data Deletion

```typescript
// convex/users.ts
export const deleteAccount = mutation({
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);

    // Delete all user data
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const item of pantryItems) {
      await ctx.db.delete(item._id);
    }

    // Delete shopping lists and items
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const list of lists) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();

      for (const item of items) {
        await ctx.db.delete(item._id);
      }

      await ctx.db.delete(list._id);
    }

    // Delete receipts
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }

    // Finally delete user
    await ctx.db.delete(user._id);

    // Clerk will handle their side via webhook or manual deletion
  },
});
```

---

## Rate Limiting

Convex has built-in rate limiting. For additional protection:

```typescript
// convex/lib/rateLimit.ts
const RATE_LIMITS: Record<string, { window: number; max: number }> = {
  "receipt-parse": { window: 60000, max: 10 }, // 10 per minute
  "ai-suggestion": { window: 3600000, max: 50 }, // 50 per hour
};

export async function checkRateLimit(
  ctx: MutationCtx,
  userId: string,
  action: string
) {
  const limit = RATE_LIMITS[action];
  if (!limit) return true;

  const since = Date.now() - limit.window;

  const count = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action", (q) =>
      q.eq("userId", userId).eq("action", action)
    )
    .filter((q) => q.gt(q.field("timestamp"), since))
    .collect();

  if (count.length >= limit.max) {
    throw new Error(`Rate limit exceeded for ${action}`);
  }

  await ctx.db.insert("rateLimits", {
    userId,
    action,
    timestamp: Date.now(),
  });

  return true;
}
```

---

## Security Checklist

### Before Deployment

- [ ] All API keys in Convex environment variables (not in code)
- [ ] Clerk tokens stored in SecureStore
- [ ] All mutations verify user ownership
- [ ] Input validation on both client and server
- [ ] No sensitive data in console.log statements
- [ ] Rate limiting on expensive operations
- [ ] File uploads require authentication
- [ ] HTTPS enforced (automatic with Convex/Clerk)

### Ongoing

- [ ] Monitor Convex logs for suspicious activity
- [ ] Review Clerk security logs
- [ ] Update dependencies regularly
- [ ] Rotate API keys periodically
- [ ] Review user data access patterns

---

*Security is a continuous process. Review these guidelines regularly and update as threats evolve.*
