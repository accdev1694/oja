#!/usr/bin/env node
/**
 * PostToolUse Hook (async): Run TypeScript type-check after file edits.
 *
 * This hook runs asynchronously (non-blocking) so Claude can continue working
 * while the typecheck runs in the background. Results are reported when complete.
 *
 * Only triggers on .ts/.tsx file changes. Runs project-wide tsc --noEmit
 * but limits output to the first 15 errors to avoid overwhelming context.
 *
 * Exit codes:
 *   0 = success (with optional additionalContext if type errors found)
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

    // Only typecheck after TypeScript file changes
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      process.exit(0);
    }

    // Skip non-project files
    const normalized = filePath.replace(/\\/g, '/');
    if (
      normalized.includes('node_modules') ||
      normalized.includes('convex/_generated') ||
      normalized.includes('.expo/')
    ) {
      process.exit(0);
    }

    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    try {
      execSync('npx tsc --noEmit --pretty false', {
        cwd: projectDir,
        encoding: 'utf8',
        timeout: 60000, // 60 second timeout for full typecheck
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Typecheck passed
      process.exit(0);
    } catch (tscError) {
      const output = (tscError.stdout || '') + (tscError.stderr || '');
      const errorLines = output
        .split('\n')
        .filter((line) => line.includes('error TS'))
        .slice(0, 15);

      if (errorLines.length > 0) {
        const totalErrors = output
          .split('\n')
          .filter((line) => line.includes('error TS')).length;

        const shown = errorLines.join('\n');
        const more = totalErrors > 15
          ? `\n... and ${totalErrors - 15} more errors`
          : '';

        const result = {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext:
              `TypeScript errors detected (${totalErrors} total). ` +
              `Rule #15 requires all type errors to be fixed:\n${shown}${more}`,
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
