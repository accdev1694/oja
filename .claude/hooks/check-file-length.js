#!/usr/bin/env node
/**
 * PostToolUse Hook: Check if file exceeds 400-line limit after edits.
 *
 * Rule #10: Max 400 lines per file — extract into separate files if approaching limit.
 *
 * Reports as additionalContext when a file is approaching or exceeding the limit.
 *
 * Exit codes:
 *   0 = success (with optional warning context)
 */

const fs = require('fs');
const path = require('path');

const MAX_LINES = 400;
const WARN_THRESHOLD = 350; // Warn when approaching limit

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

    // Only check source files
    if (
      !filePath.endsWith('.ts') &&
      !filePath.endsWith('.tsx') &&
      !filePath.endsWith('.js') &&
      !filePath.endsWith('.jsx')
    ) {
      process.exit(0);
    }

    // Skip generated and config files
    const normalized = filePath.replace(/\\/g, '/');
    if (
      normalized.includes('node_modules') ||
      normalized.includes('convex/_generated') ||
      normalized.includes('.expo/')
    ) {
      process.exit(0);
    }

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      process.exit(0);
    }

    const lineCount = content.split('\n').length;
    const fileName = path.basename(filePath);

    if (lineCount > MAX_LINES) {
      const result = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            `Rule #10 VIOLATION: ${fileName} is ${lineCount} lines (max: ${MAX_LINES}). ` +
            `Extract logic into separate files immediately. Split by concern: ` +
            `utilities, types, sub-components, or helper functions.`,
        },
      };
      process.stdout.write(JSON.stringify(result));
    } else if (lineCount > WARN_THRESHOLD) {
      const result = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            `APPROACHING LIMIT: ${fileName} is ${lineCount}/${MAX_LINES} lines. ` +
            `Consider splitting before it exceeds the limit.`,
        },
      };
      process.stdout.write(JSON.stringify(result));
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
});
