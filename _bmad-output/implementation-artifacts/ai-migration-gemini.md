# AI Migration: OpenAI → Gemini 1.5 Flash

**Date:** 2026-01-28
**Status:** Complete
**Reason:** Use completely free AI tier (Gemini 1.5 Flash: 1500 req/day free)

---

## Changes Made

### 1. Code Changes

| File | Change |
|------|--------|
| `convex/ai.ts` | Replaced OpenAI with `@google/generative-ai` (Gemini SDK) |
| `package.json` | Removed `openai`, added `@google/generative-ai` |

### 2. Documentation Updates

| File | Update |
|------|--------|
| `CLAUDE.md` | Updated AI references to Gemini 1.5 Flash + Jina AI |
| `project-context.md` | Updated code examples to use Gemini/Jina |
| `architecture-v2-expo-convex.md` | Clarified Gemini usage (receipt parsing, pantry seeding) |
| `coding-conventions-expo.md` | Updated file structure to show gemini.ts + jina.ts |

---

## AI Usage in Oja

### Gemini 1.5 Flash (Free: 1500 requests/day)

**Use Cases:**
1. **Pantry Seeding** (Story 1.8) - Generate 200 hybrid items based on location + cuisines
2. **Receipt Parsing** (Epic 5) - Extract structured data from receipt images

**Model:** `gemini-1.5-flash`
**Environment Variable:** `GEMINI_API_KEY` (set in Convex Dashboard)

### Jina AI Embeddings (Free: 1M tokens/month)

**Use Cases:**
1. **Semantic Search** - Find similar items in pantry/shopping lists
2. **Receipt Matching** - Match receipt items to pantry inventory

**Model:** `jina-embeddings-v3`
**Environment Variable:** `JINA_API_KEY` (set in Convex Dashboard)

---

## Setup Instructions

### Get Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API key"
4. Copy the key

### Add to Convex

```bash
npx convex env set GEMINI_API_KEY your_actual_key_here
```

OR via Convex Dashboard:
- https://dashboard.convex.dev
- Select project: "oja"
- Settings → Environment Variables
- Add: `GEMINI_API_KEY` = `your_key`

### Restart Convex

```bash
npx convex dev
```

---

## Verification

✅ OpenAI package removed
✅ Gemini SDK installed (`@google/generative-ai`)
✅ `convex/ai.ts` uses Gemini
✅ All documentation updated
✅ Convex dev server running successfully

---

## Cost Comparison

| Service | OpenAI (GPT-4o-mini) | Gemini 1.5 Flash |
|---------|----------------------|------------------|
| **Cost per 1M input tokens** | $0.15 | **FREE** |
| **Cost per 1M output tokens** | $0.60 | **FREE** |
| **Free tier** | None | 1500 req/day |
| **Rate limit** | $100/mo minimum | 1500 req/day |

**Savings:** $100+ per month during MVP phase

---

## Notes

- Gemini 1.5 Flash has 1500 requests/day free tier (sufficient for MVP)
- If we exceed free tier, we can upgrade to paid tier or implement rate limiting
- Jina AI provides 1M tokens/month free for embeddings
- Both services have generous free tiers suitable for development and MVP launch
