#!/usr/bin/env node
/**
 * PostToolUse Hook: Run ESLint on the changed file after Edit/Write.
 *
 * Only runs on .ts/.tsx files within the project.
 * Reports lint errors as additionalContext so Claude sees them and self-corrects.
 * Runs synchronously but is fast (single file).
 *
 * Exit codes:
 *   0 = success (with optional additionalContext if lint errors found)
 */

const { execSync } = require('child_process');
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

    // Only lint TypeScript files
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      process.exit(0);
    }

    // Skip generated files, node_modules, test fixtures
    const normalized = filePath.replace(/\\/g, '/');
    if (
      normalized.includes('node_modules') ||
      normalized.includes('convex/_generated') ||
      normalized.includes('.expo/') ||
      normalized.includes('dist/')
    ) {
      process.exit(0);
    }

    // Run ESLint on the specific file
    try {
      execSync(`npx eslint "${filePath}" --format compact --no-error-on-unmatched-pattern`, {
        cwd: process.env.CLAUDE_PROJECT_DIR || path.resolve(filePath, '..'),
        encoding: 'utf8',
        timeout: 15000, // 15 second timeout
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // ESLint passed — no output needed
      process.exit(0);
    } catch (lintError) {
      const output = (lintError.stdout || '') + (lintError.stderr || '');

      // Filter to just error lines (not warnings)
      const errorLines = output
        .split('\n')
        .filter((line) => line.includes('Error -') || line.includes('error'))
        .slice(0, 8) // Max 8 errors shown
        .join('\n');

      if (errorLines.trim()) {
        const result = {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext:
              `ESLint errors found in ${path.basename(filePath)}. Fix these before continuing:\n${errorLines}`,
          },
        };
        process.stdout.write(JSON.stringify(result));
      }

      process.exit(0); // Don't block, just inform
    }
  } catch {
    process.exit(0);
  }
});
