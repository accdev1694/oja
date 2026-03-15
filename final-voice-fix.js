const fs = require('fs');

// Fix itemWriteTools.ts - all remaining parameters
let content = fs.readFileSync('convex/lib/voice/itemWriteTools.ts', 'utf8');
content = content.replace(/const inProgress = lists\.find\(l =>/g, 'const inProgress = lists.find((l: Doc<"shoppingLists">) =>');
content = content.replace(/\.find\(i =>/g, '.find((i: Doc<"listItems">) =>');
content = content.replace(/\.find\(s =>/g, '.find((s: SizeVariant) =>');
fs.writeFileSync('convex/lib/voice/itemWriteTools.ts', content);
console.log('Fixed: itemWriteTools.ts');

// Fix listWriteTools.ts
content = fs.readFileSync('convex/lib/voice/listWriteTools.ts', 'utf8');
content = content.replace(/\.find\(l =>/g, '.find((l: Doc<"shoppingLists">) =>');
fs.writeFileSync('convex/lib/voice/listWriteTools.ts', content);
console.log('Fixed: listWriteTools.ts');

// Fix readTools.ts - all remaining parameters
content = fs.readFileSync('convex/lib/voice/readTools.ts', 'utf8');
content = content.replace(/filtered\.map\(i =>/g, 'filtered.map((i: Doc<"pantryItems">) =>');
content = content.replace(/\.filter\(i =>/g, '.filter((i: Doc<"pantryItems">) =>');
content = content.replace(/\.map\(l =>/g, '.map((l: Doc<"shoppingLists">) =>');
content = content.replace(/\.map\(i =>/g, '.map((i: Doc<"listItems">) =>');
content = content.replace(/\.find\(l =>/g, '.find((l: Doc<"shoppingLists">) =>');
content = content.replace(/\.reduce\(i =>/g, '.reduce((i: Doc<"pantryItems">) =>');
content = content.replace(/\.reduce\(\(sum, l\)/g, '.reduce((sum, l: Doc<"shoppingLists">)');
content = content.replace(/\.slice\(0, 5\)\.map\(i =>/g, '.slice(0, 5).map((i: Doc<"pantryItems">) =>');
content = content.replace(/\.slice\(0, 10\)\.map\(i =>/g, '.slice(0, 10).map((i: Doc<"listItems">) =>');
content = content.replace(/\.map\(s =>/g, '.map((s: StoreInfo) =>');
content = content.replace(/\.find\(s =>/g, '.find((s: StoreInfo) =>');
fs.writeFileSync('convex/lib/voice/readTools.ts', content);
console.log('Fixed: readTools.ts');

// Fix voice.ts - variable declarations
content = fs.readFileSync('convex/ai/voice.ts', 'utf8');
// Fix usageCheckResult variable type
content = content.replace(
  'const usageCheckResult = await ctx.runMutation(api.aiUsage.incrementUsage',
  'const usageCheckResult: { allowed: boolean; message?: string } = await ctx.runMutation(api.aiUsage.incrementUsage'
);
fs.writeFileSync('convex/ai/voice.ts', content);
console.log('Fixed: voice.ts');

console.log('\nAll voice files fixed!');
