#!/usr/bin/env node
/**
 * Post-Fix Audit Hook (PostToolUse: Edit|Write)
 *
 * Spawns a background verification agent after significant code changes.
 * Triggers when:
 * - Multiple files have been edited in a session (tracked via temp file)
 * - Files are in convex/ or critical paths
 *
 * The agent independently audits:
 * - CLAUDE.md rule compliance (#1-17)
 * - File length limits (400 lines max)
 * - Missing cleanItemForStorage calls
 * - N+1 query patterns
 * - Test coverage for new code
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const SESSION_FILE = path.join(
  process.env.TEMP || "/tmp",
  "claude-audit-session.json"
);

// Paths that warrant deeper audit
const CRITICAL_PATHS = [
  /convex\//,
  /lib\//,
  /hooks\//,
  /components\/.*\.tsx$/,
];

// Minimum edits before spawning audit agent
const AUDIT_THRESHOLD = 5;

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", async () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || data.tool_input?.path || "";
    const normalizedPath = filePath.replace(/\\/g, "/");

    // Skip non-critical files
    const isCritical = CRITICAL_PATHS.some((p) => p.test(normalizedPath));
    if (!isCritical) {
      process.exit(0);
    }

    // Load or initialize session tracking
    let session = { files: [], startTime: Date.now(), auditTriggered: false };
    if (fs.existsSync(SESSION_FILE)) {
      try {
        session = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
        // Reset if session is older than 2 hours
        if (Date.now() - session.startTime > 2 * 60 * 60 * 1000) {
          session = { files: [], startTime: Date.now(), auditTriggered: false };
        }
      } catch {
        // Corrupted file, reset
      }
    }

    // Track this file
    if (!session.files.includes(normalizedPath)) {
      session.files.push(normalizedPath);
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));

    // Check if we should trigger audit
    if (session.files.length >= AUDIT_THRESHOLD && !session.auditTriggered) {
      // Mark audit as triggered to prevent duplicate spawns
      session.auditTriggered = true;
      fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));

      // Output message to Claude suggesting audit (use proper hookSpecificOutput format)
      const fileList = session.files.slice(-10).map(f => path.basename(f)).join(", ");
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: `[POST-FIX AUDIT] ${session.files.length} files modified in this session (${fileList}). Consider spawning a background audit agent to verify:\n` +
              "1. All changes comply with CLAUDE.md rules\n" +
              "2. No files exceed 400 lines\n" +
              "3. cleanItemForStorage used in item mutations\n" +
              "4. No N+1 query patterns introduced\n" +
              "5. Tests cover new functionality\n\n" +
              "Use: Task tool with codebase-bug-scrutinizer agent targeting changed files.",
          },
        })
      );
    }
  } catch (e) {
    // Log error but don't block
    const logFile = path.join(
      process.env.USERPROFILE || process.env.HOME || ".",
      ".claude",
      "post-fix-audit-errors.log"
    );
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${e.message}\n`);
  }
  process.exit(0);
});
