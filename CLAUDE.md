# Oja - Claude Code Project Configuration

> Budget-First Shopping Confidence - A native mobile app giving shoppers control over spending before, during, and after shopping trips.

---

## BUILD PROGRESS TRACKER

**📊 Track full build progress:** `_bmad-output/implementation-artifacts/v2-build-progress.md`

| Phase | Status |
|-------|--------|
| 0. Project Setup | 🔄 In Progress |
| 1-7. Epics | ⏳ Pending |

**Current Task:** Initialize Expo + Convex + Clerk

---

## ARCHITECTURE PIVOT NOTICE

**As of 2026-01-26, Oja has pivoted from Next.js PWA to React Native (Expo) with a completely new backend architecture. v1 code has been deleted.**

### Required Reading Before Implementation

1. **`project-context.md`** - Developer quick reference (START HERE)
2. **`_bmad-output/implementation-artifacts/v2-build-progress.md`** - Build progress tracker
3. **`_bmad-output/planning-artifacts/architecture-v2-expo-convex.md`** - Full architecture specification
4. **`_bmad-output/planning-artifacts/coding-conventions-expo.md`** - Coding patterns and standards
5. **`_bmad-output/planning-artifacts/security-guidelines-expo.md`** - Security requirements

**CRITICAL**: All agents MUST read `project-context.md` before writing ANY code.

---

## Project Lead

**John (PM Agent)** leads this project through the BMAD product development lifecycle, orchestrating the right specialist agents at each phase.

To invoke the project lead:

```
/bmad:bmm:agents:pm
```

### Critical Instruction for All Agents

**ALWAYS reference the Product Brief** (`_bmad-output/planning-artifacts/product-brief.md`) as the foundational source of truth for this project. All decisions, requirements, and implementations must align with the vision, features, and technical decisions documented there.

---

## Tech Stack (v2 - Expo/Convex)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Expo SDK 55+ | React Native with native capabilities |
| **Language** | TypeScript (strict) | Type-safe development |
| **Routing** | Expo Router | File-based native navigation |
| **UI Design** | Platform-Adaptive | iOS: Liquid Glass / Android: Material You |
| **Authentication** | Clerk | Managed auth with social providers |
| **Backend** | Convex | Real-time database + serverless functions |
| **AI/ML** | Jina AI + Gemini | Embeddings + Receipt parsing |
| **State** | React hooks + Convex | Real-time reactive state |
| **Animations** | React Native Reanimated | Smooth native animations |
| **Icons** | Expo Symbols / SF Symbols | Native iOS icons |
| **Haptics** | Expo Haptics | Tactile feedback |
| **Payments** | Stripe | Subscription management |

### Previous Stack (v1 - Deprecated)

The following are from the original Next.js PWA implementation and are being replaced:
- ~~Next.js 14~~ → Expo
- ~~Supabase~~ → Convex + Clerk
- ~~Tailwind CSS~~ → StyleSheet + Liquid Glass
- ~~TanStack Query~~ → Convex useQuery
- ~~IndexedDB~~ → Convex + local cache

---

## Project Structure (v2)

```
oja/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx              # Root layout (providers)
│   ├── (app)/                   # Authenticated routes
│   │   ├── _layout.tsx          # Protected layout
│   │   ├── (tabs)/              # Tab navigator
│   │   │   ├── _layout.tsx      # Tab configuration
│   │   │   ├── index.tsx        # Pantry (home)
│   │   │   ├── lists.tsx        # Shopping lists
│   │   │   ├── scan.tsx         # Receipt scanner
│   │   │   └── profile.tsx      # User profile
│   │   ├── list/[id].tsx        # List detail
│   │   ├── item/[id].tsx        # Item detail
│   │   └── edit-profile.tsx     # Edit profile
│   ├── (auth)/                   # Auth routes
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── onboarding/               # Onboarding flow
│       ├── _layout.tsx
│       ├── name.tsx
│       ├── budget.tsx
│       └── complete.tsx
│
├── components/                   # Reusable components
│   ├── ui/                      # Design system (Glass components)
│   ├── pantry/                  # Pantry components
│   ├── lists/                   # Shopping list components
│   ├── receipt/                 # Receipt scanning
│   └── onboarding/              # Onboarding components
│
├── hooks/                        # Custom React hooks
│   ├── useCurrentUser.ts
│   ├── usePhotoPicker.ts
│   └── useOptimisticUpdates.ts
│
├── lib/                          # Utilities
│   ├── utils/
│   └── constants/
│
├── convex/                       # Convex backend
│   ├── _generated/              # Auto-generated (don't edit)
│   ├── schema.ts                # Database schema
│   ├── users.ts                 # User functions
│   ├── pantryItems.ts           # Pantry functions
│   ├── shoppingLists.ts         # List functions
│   ├── listItems.ts             # List item functions
│   ├── receipts.ts              # Receipt functions
│   ├── files.ts                 # File storage
│   ├── ai.ts                    # AI/OpenAI functions
│   └── lib/                     # Backend utilities
│
├── project-context.md            # Developer reference (READ FIRST)
├── guidelines.md                 # Source tutorial transcript
│
└── _bmad-output/                 # BMAD artifacts
    ├── planning-artifacts/
    │   ├── product-brief.md
    │   ├── prd.md
    │   ├── architecture-v2-expo-convex.md  # NEW
    │   ├── coding-conventions-expo.md      # NEW
    │   ├── security-guidelines-expo.md     # NEW
    │   └── epics/
    └── implementation-artifacts/
        ├── sprint-status.yaml
        └── stories/
```

---

## Key Commands (v2)

```bash
# Development
npx expo start                    # Start Expo dev server
npx expo start --ios              # iOS simulator
npx expo start --android          # Android emulator

# Build
npx expo run:ios                  # Development build (iOS)
npx expo run:android              # Development build (Android)
eas build --platform ios          # Production build (iOS)
eas build --platform android      # Production build (Android)

# Convex
npx convex dev                    # Start Convex dev server
npx convex deploy                 # Deploy to production

# Testing
npm test                          # Run unit tests
npm run test:watch                # Watch mode

# Linting
npm run lint                      # ESLint
npm run format                    # Prettier
```

---

## BMAD Workflow Phases

| Phase | Agent | Command | Status |
|-------|-------|---------|--------|
| 1. Product Brief | PM + Analyst | `/bmad:bmm:workflows:create-product-brief` | COMPLETE |
| 2. PRD | PM | `/bmad:bmm:workflows:prd` | COMPLETE |
| 3. Architecture | Architect | `/bmad:bmm:workflows:create-architecture` | **NEEDS UPDATE (v2)** |
| 4. UX Design | UX Designer | `/bmad:bmm:workflows:create-ux-design` | COMPLETE |
| 5. Epics & Stories | Scrum Master | `/bmad:bmm:workflows:create-epics-and-stories` | **NEEDS UPDATE** |
| 6. Test Strategy | Test Architect | `/bmad:bmm:workflows:testarch-test-design` | Pending |
| 7. Sprint Planning | Scrum Master | `/bmad:bmm:workflows:sprint-planning` | Pending |
| 8. Story Development | Developer | `/bmad:bmm:workflows:dev-story` | Pending |
| 9. Code Review | Developer | `/bmad:bmm:workflows:code-review` | Pending |
| 10. Test Automation | Test Architect | `/bmad:bmm:workflows:testarch-automate` | Pending |

---

## Convex Backend Patterns

### Query (Read)

```typescript
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
```

### Mutation (Write)

```typescript
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx); // ALWAYS verify auth
    return await ctx.db.insert("items", {
      userId: user._id,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});
```

### Action (External API)

```typescript
export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    // Call OpenAI, etc.
    return await openai.embeddings.create({ ... });
  },
});
```

---

## Critical Rules for All Agents

1. **Read `project-context.md` first** - Before ANY implementation
2. **Verify authentication** - Every mutation must check user ownership
3. **Use indexes** - Never scan full tables
4. **Optimistic updates** - For instant UX feedback
5. **Haptic feedback** - On all user interactions
6. **Handle all states** - Loading, error, empty, success

---

## Environment Variables

### Client (Expo)

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://...
```

### Server (Convex Dashboard)

```bash
OPENAI_API_KEY=sk_...
STRIPE_SECRET_KEY=sk_...
CLERK_SECRET_KEY=sk_...
```

---

## MCP Servers

**Model Context Protocol (MCP)** servers enable AI agents to interact with external services. The following MCP servers are configured for this project:

### Configured MCP Servers

| Service | Type | Description |
|---------|------|-------------|
| **Clerk** | URL | Authentication SDK snippets and user management |
| **Convex** | CLI | Backend deployment queries, table schemas, function metadata |
| **Stripe** | URL | Payment processing - customers, products, invoices, subscriptions |
| **GitHub** | CLI | Repository management - repos, PRs, issues |

### Configuration Location

MCP servers are configured in:
```
C:\Users\diloc\AppData\Roaming\Claude\claude_desktop_config.json
```

### Configuration File

```json
{
  "mcpServers": {
    "clerk": {
      "url": "https://mcp.clerk.com/mcp",
      "description": "Clerk authentication - SDK snippets and user management"
    },
    "convex": {
      "command": "npx",
      "args": ["-y", "convex", "mcp", "start"],
      "description": "Convex backend - deployment queries, table schemas, function metadata"
    },
    "stripe": {
      "url": "https://mcp.stripe.com",
      "description": "Stripe payments - customers, products, invoices, subscriptions"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": ""
      },
      "description": "GitHub - repos, PRs, issues (requires GITHUB_PERSONAL_ACCESS_TOKEN)"
    }
  }
}
```

### Activation

**IMPORTANT:** After modifying the MCP configuration file, restart Claude Desktop for the changes to take effect.

### Usage

- **Clerk MCP**: Query authentication patterns, get SDK code snippets, manage users
- **Convex MCP**: Query deployment status, inspect schemas, get function signatures
- **Stripe MCP**: Manage subscriptions, view customer data, handle billing
- **GitHub MCP**: Create PRs, manage issues, review code (requires personal access token)

---

## BMAD Artifacts Location

| Artifact | Path |
|----------|------|
| Product Brief | `_bmad-output/planning-artifacts/product-brief.md` |
| PRD | `_bmad-output/planning-artifacts/prd.md` |
| Architecture v2 | `_bmad-output/planning-artifacts/architecture-v2-expo-convex.md` |
| Coding Conventions | `_bmad-output/planning-artifacts/coding-conventions-expo.md` |
| Security Guidelines | `_bmad-output/planning-artifacts/security-guidelines-expo.md` |
| UX Design | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics/` |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Story Files | `_bmad-output/implementation-artifacts/stories/` |
| Developer Reference | `project-context.md` |

---

## Quick Start for New Session

1. **Read the developer reference:**
   ```
   Read project-context.md
   ```

2. **Check current phase:**
   ```
   /bmad:bmm:workflows:workflow-status
   ```

3. **Continue implementation:**
   - Review sprint-status.yaml for current story
   - Load the Developer agent: `/bmad:bmm:agents:dev`

---

## Target Market

- **Primary:** United Kingdom
- **Architecture:** Location-agnostic (global ready)
- **Currency:** Auto-detect based on location
- **Stores:** UK supermarkets (Tesco, Sainsbury's, Asda, Aldi, etc.)

---

## Architecture Pivot Summary

**Date:** 2026-01-26

### What Changed

| Aspect | v1 (PWA) | v2 (Native) |
|--------|----------|-------------|
| Platform | Web (PWA) | iOS/Android (React Native) |
| Framework | Next.js 14 | Expo SDK 55+ |
| Auth | Supabase Auth | Clerk |
| Database | Supabase Postgres | Convex (document) |
| Backend | Supabase Edge Functions | Convex Functions |
| Styling | Tailwind CSS | Liquid Glass + StyleSheet |
| AI | Gemini | OpenAI |
| Offline | IndexedDB + Service Workers | Convex + optimistic updates |

### What Stays the Same

- Product vision and requirements
- User flows and features
- Epic/Story structure (implementation details update)
- Business logic concepts

### Migration Status

- **v1 code**: Will be archived/deleted
- **v2 code**: Fresh implementation following new architecture
- **Planning docs**: Product Brief, PRD, UX Design remain valid

---

_This file configures Claude Code for the Oja project. Updated 2026-01-26 for architecture pivot._
