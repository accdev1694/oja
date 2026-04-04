#!/usr/bin/env node
/**
 * PostToolUse Hook: Verify that item creation/update code uses cleanItemForStorage().
 *
 * Rule #13: MANDATORY cleanItemForStorage() — every item creation/update.
 * Size without unit = rejected.
 *
 * Scans edited Convex backend files and components for item creation patterns
 * that bypass the mandatory parser.
 *
 * Exit codes:
 *   0 = success (with optional warning context)
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate item creation/update without parser
const ITEM_MUTATION_PATTERNS = [
  /ctx\.db\.insert\s*\(\s*["']listItems["']/,
  /ctx\.db\.insert\s*\(\s*["']pantryItems["']/,
  /ctx\.db\.patch\s*\(.*,\s*\{[^}]*\bname\s*:/,
  /ctx\.db\.replace\s*\(.*,\s*\{[^}]*\bname\s*:/,
];

const PARSER_IMPORT_PATTERN = /cleanItemForStorage/;

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

    // Only check backend files that handle items
    const normalized = filePath.replace(/\\/g, '/');
    const isBackend = normalized.includes('/convex/');
    const isComponent = normalized.includes('/components/') || normalized.includes('/app/');

    if (!isBackend && !isComponent) {
      process.exit(0);
    }

    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      process.exit(0);
    }

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      process.exit(0);
    }

    const hasItemMutation = ITEM_MUTATION_PATTERNS.some((p) => p.test(content));
    const hasParserImport = PARSER_IMPORT_PATTERN.test(content);

    if (hasItemMutation && !hasParserImport) {
      const fileName = path.basename(filePath);
      const result = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            `Rule #13 WARNING: ${fileName} contains item creation/update mutations ` +
            `but does NOT import \`cleanItemForStorage\` from itemNameParser. ` +
            `ALL item creation/update MUST use cleanItemForStorage(). ` +
            `Size without unit is UNACCEPTABLE.`,
        },
      };
      process.stdout.write(JSON.stringify(result));
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
});
