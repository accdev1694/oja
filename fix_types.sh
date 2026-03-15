#!/bin/bash

# Fix convex/ai/health.ts
cp convex/ai/health.ts convex/ai/health.ts.bak

# Add interface for health swap
sed -i '8a\
interface HealthSwap {\
  originalName: string;\
  suggestedName: string;\
  suggestedCategory?: string;\
  suggestedSize?: string;\
  suggestedUnit?: string;\
  priceDelta?: number;\
  scoreImpact?: number;\
  reason: string;\
}\
\
interface HealthAnalysisResult {\
  score: number;\
  summary: string;\
  strengths: string[];\
  weaknesses: string[];\
  swaps: HealthSwap[];\
  itemCountAtAnalysis: number;\
  updatedAt: number;\
}' convex/ai/health.ts

# Add return type to handler
sed -i 's/handler: async (ctx, args) => {/handler: async (ctx, args): Promise<HealthAnalysisResult> => {/' convex/ai/health.ts

# Add type to items variable
sed -i 's/const items = await/const items: Doc<"listItems">[] = await/' convex/ai/health.ts

# Add type to i parameter
sed -i 's/items\.map((i)/items.map((i: Doc<"listItems">)/' convex/ai/health.ts

# Add type to swap parameter
sed -i 's/(parsed\.swaps || \[\])\.map(swap/(parsed.swaps || []).map((swap: HealthSwap)/' convex/ai/health.ts

# Add type to s parameter in filter
sed -i 's/\.filter(s/\.filter((s: HealthSwap \& { originalId?: string })/' convex/ai/health.ts

# Add type to parsed variable
sed -i '85i\    let parsed: { score?: number; summary?: string; strengths?: string[]; weaknesses?: string[]; swaps?: HealthSwap[] };' convex/ai/health.ts

# Add type to healthAnalysis variable
sed -i 's/const healthAnalysis =/const healthAnalysis: HealthAnalysisResult =/' convex/ai/health.ts

echo "Fixed convex/ai/health.ts"

