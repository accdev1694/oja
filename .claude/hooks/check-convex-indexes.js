#!/usr/bin/env node
/**
 * PostToolUse Hook: Check that Convex queries use .withIndex().
 *
 * Rule #2: Use indexes — every Convex query needs .withIndex().
 *
 * Scans edited Convex files for ctx.db.query() calls that don't chain .withIndex().
 *
 * Exit codes:
 *   0 = success (with optional warning context)
 */

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || '';

    if (!filePath) {
      process.exit(0);
    }

    // Only check Convex backend files
    const normalized = filePath.replace(/\\/g, '/');
    if (!normalized.includes('/convex/') || !filePath.endsWith('.ts')) {
      process.exit(0);
    }

    // Skip schema, config, and generated files
    if (
      normalized.includes('convex/_generated') ||
      normalized.includes('convex/schema') ||
      normalized.endsWith('convex/auth.config.ts') ||
      normalized.endsWith('convex/crons.ts')
    ) {
      process.exit(0);
    }

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      process.exit(0);
    }

    const lines = content.split('\n');
    const violations = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      // Look for ctx.db.query("tableName") without .withIndex on same or next line
      if (/ctx\.db\.query\s*\(/.test(line)) {
        const nextLine = lines[i + 1] || '';
        const combinedLines = line + nextLine;

        if (
          !combinedLines.includes('.withIndex') &&
          !combinedLines.includes('.fullTableScan') // explicit opt-out is acceptable
        ) {
          violations.push({ line: i + 1, content: line.trim() });
        }
      }
    }

    if (violations.length > 0) {
      const fileName = path.basename(filePath);
      const details = violations
        .slice(0, 5)
        .map((v) => `  Line ${v.line}: ${v.content}`)
        .join('\n');

      const result = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            `Rule #2 WARNING: ${fileName} has ${violations.length} query call(s) without .withIndex().\n` +
            `Every Convex query MUST use .withIndex() for performance. Fix these:\n${details}`,
        },
      };
      process.stdout.write(JSON.stringify(result));
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
});
