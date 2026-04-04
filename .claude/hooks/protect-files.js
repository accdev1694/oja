#!/usr/bin/env node
/**
 * PreToolUse Hook: Protect sensitive and generated files from being read, edited, or written.
 *
 * Blocks access to:
 * - .env files (secrets)
 * - convex/_generated/ (auto-generated, should never be manually edited)
 * - package-lock.json (should only change via npm install)
 * - eas.json (build config, manual edits only)
 * - Firebase/Google service account keys
 *
 * Exit codes:
 *   0 = allow (file is not protected)
 *   2 = block (file is protected, stderr message shown to Claude)
 */

const PROTECTED_PATTERNS = [
  // Environment files with secrets
  { pattern: '.env', reason: 'Environment files contain secrets and must not be accessed' },
  { pattern: '.env.local', reason: 'Environment files contain secrets and must not be accessed' },
  { pattern: '.env.e2e', reason: 'E2E environment files contain test credentials' },

  // Auto-generated Convex files
  { pattern: 'convex/_generated', reason: 'Convex generated files are auto-managed by `npx convex dev`. Never modify directly' },

  // Lock files
  { pattern: 'package-lock.json', reason: 'Lock files should only change via npm install, not direct edits' },

  // Build config (requires manual review)
  { pattern: 'eas.json', reason: 'EAS build config requires manual review before changes' },

  // Firebase / Google service keys
  { pattern: 'google-services.json', reason: 'Firebase config contains project credentials' },
  { pattern: 'GoogleService-Info.plist', reason: 'Firebase config contains project credentials' },
  { pattern: 'service-account', reason: 'Service account files contain secrets' },
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path
      || data.tool_input?.path
      || '';

    if (!filePath) {
      process.exit(0); // No file path in tool input, allow
    }

    // Normalize path separators for Windows
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

    for (const { pattern, reason } of PROTECTED_PATTERNS) {
      const normalizedPattern = pattern.toLowerCase();
      if (
        normalizedPath.includes(normalizedPattern) ||
        normalizedPath.endsWith(normalizedPattern)
      ) {
        process.stderr.write(
          `BLOCKED: "${filePath}" is a protected file.\nReason: ${reason}\n`
        );
        process.exit(2);
      }
    }

    process.exit(0); // File is not protected, allow
  } catch {
    // JSON parse error or unexpected input — don't block, fail open
    process.exit(0);
  }
});
