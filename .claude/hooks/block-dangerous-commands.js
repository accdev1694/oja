#!/usr/bin/env node
/**
 * PreToolUse Hook: Block dangerous bash commands.
 *
 * Blocks:
 * - kill/taskkill targeting node.exe (Rule #8: use npx kill-port instead)
 * - rm -rf on project root or critical dirs
 * - git push --force to main/master
 * - git reset --hard (destructive)
 * - Any command that drops or truncates database tables
 *
 * Exit codes:
 *   0 = allow
 *   2 = block (stderr message shown to Claude)
 */

const DANGEROUS_PATTERNS = [
  {
    regex: /\bkill\b.*\bnode\b|\btaskkill\b.*\bnode\b/i,
    reason: 'Rule #8: NEVER kill node.exe directly. Use `npx kill-port <port>` instead',
  },
  {
    regex: /\brm\s+(-rf|-r\s+-f|-fr)\s+[./]*$/,
    reason: 'Refusing to rm -rf project root. Specify a subdirectory explicitly',
  },
  {
    regex: /\brm\s+(-rf|-r\s+-f|-fr)\s+(\.\/?)?\s*$/,
    reason: 'Refusing to rm -rf current directory',
  },
  {
    regex: /\bgit\s+push\s+.*--force\b.*\b(main|master)\b|\bgit\s+push\s+.*\b(main|master)\b.*--force\b/i,
    reason: 'Force pushing to main/master is destructive and not allowed',
  },
  {
    regex: /\bgit\s+reset\s+--hard\b/i,
    reason: 'git reset --hard is destructive. Use git stash or create a backup branch first',
  },
  {
    regex: /\bdrop\s+table\b|\btruncate\s+table\b/i,
    reason: 'DROP/TRUNCATE TABLE commands are destructive and require explicit user approval',
  },
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = data.tool_input?.command || '';

    if (!command) {
      process.exit(0);
    }

    for (const { regex, reason } of DANGEROUS_PATTERNS) {
      if (regex.test(command)) {
        process.stderr.write(`BLOCKED: Dangerous command detected.\nCommand: ${command}\nReason: ${reason}\n`);
        process.exit(2);
      }
    }

    process.exit(0);
  } catch {
    process.exit(0); // Fail open on parse error
  }
});
