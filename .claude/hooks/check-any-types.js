#!/usr/bin/env node
/**
 * PostToolUse Hook: Check for banned `any` type usage after file edits.
 *
 * Scans the modified file for:
 * - Explicit `any` type annotations (: any, as any, <any>)
 * - Ignores comments, strings, and legitimate uses (e.g., "company" contains "any")
 *
 * Rule #9: No `any` type — EVER.
 *
 * Exit codes:
 *   0 = success (outputs context feedback if violations found, but doesn't block)
 *       Returns additionalContext so Claude sees the warning and self-corrects
 *   2 = block (only for egregious multi-violation cases)
 */

const fs = require('fs');
const path = require('path');

// Regex patterns that match actual TypeScript `any` type usage
const ANY_PATTERNS = [
  /:\s*any\b/,          // : any
  /\bas\s+any\b/,       // as any
  /<any\s*>/,           // <any>
  /<any,/,              // <any,
  /,\s*any\s*>/,        // , any>
  /:\s*any\s*\[/,       // : any[
  /:\s*any\s*\|/,       // : any |
  /\|\s*any\b/,         // | any
  /:\s*any\s*&/,        // : any &
  /&\s*any\b/,          // & any
  /Promise<any>/,       // Promise<any>
  /Array<any>/,         // Array<any>
  /Record<.*,\s*any>/,  // Record<string, any>
];

function isInCommentOrString(line, matchIndex) {
  const beforeMatch = line.substring(0, matchIndex);
  // Single-line comment
  if (beforeMatch.includes('//')) return true;
  // Inside string (rough heuristic — count unescaped quotes)
  const singleQuotes = (beforeMatch.match(/(?<!\\)'/g) || []).length;
  const doubleQuotes = (beforeMatch.match(/(?<!\\)"/g) || []).length;
  const backticks = (beforeMatch.match(/(?<!\\)`/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) return true;
  return false;
}

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

    // Only check TypeScript files
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      process.exit(0);
    }

    // Read the file
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      process.exit(0); // File doesn't exist or can't be read
    }

    const lines = content.split('\n');
    const violations = [];
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track block comments
      if (line.includes('/*')) inBlockComment = true;
      if (line.includes('*/')) { inBlockComment = false; continue; }
      if (inBlockComment) continue;

      // Skip pure comment lines
      if (line.trim().startsWith('//')) continue;
      // Skip eslint-disable lines (intentional suppressions)
      if (line.includes('eslint-disable')) continue;

      for (const pattern of ANY_PATTERNS) {
        const match = pattern.exec(line);
        if (match && !isInCommentOrString(line, match.index)) {
          violations.push({
            line: i + 1,
            content: line.trim(),
            match: match[0],
          });
          break; // One violation per line is enough
        }
      }
    }

    if (violations.length > 0) {
      const fileName = path.basename(filePath);
      const summary = violations
        .slice(0, 5) // Show max 5
        .map((v) => `  Line ${v.line}: ${v.content}`)
        .join('\n');

      const remaining = violations.length > 5
        ? `\n  ... and ${violations.length - 5} more`
        : '';

      // Return as additionalContext so Claude sees it and self-corrects
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            `WARNING: Rule #9 violation — ${violations.length} \`any\` type(s) found in ${fileName}.\n` +
            `The \`any\` type is BANNED by ESLint (\`@typescript-eslint/no-explicit-any: "error"\`).\n` +
            `Fix these immediately using concrete types, \`unknown\`, or proper generics:\n` +
            `${summary}${remaining}\n` +
            `Use: Id<"tableName">, Doc<"tableName">, unknown + type narrowing, or inline object types.`,
        },
      };

      process.stdout.write(JSON.stringify(output));
      process.exit(0);
    }

    process.exit(0); // No violations
  } catch {
    process.exit(0);
  }
});
