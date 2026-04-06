#!/usr/bin/env node
/**
 * Duplicate Export Detection Hook (PostToolUse: Edit|Write)
 *
 * Catches export name collisions in Convex barrel chains.
 * When Claude edits a Convex subfile (e.g., convex/listItems/pricing.ts),
 * this hook checks if any newly added export names already exist in sibling
 * files that share the same barrel.
 *
 * Grep-based, <200ms, no network calls.
 */

const fs = require("fs");
const path = require("path");

// Read tool call from stdin
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || data.tool_input?.path || "";

    // Only check convex subfiles (skip barrel files themselves and non-convex files)
    const normalized = filePath.replace(/\\/g, "/");
    const convexMatch = normalized.match(/convex\/([^/]+)\/([^/]+\.ts)$/);
    if (!convexMatch) {
      process.exit(0);
    }

    const [, subdir, filename] = convexMatch;
    const projectDir =
      process.env.CLAUDE_PROJECT_DIR ||
      normalized.slice(0, normalized.indexOf("/convex/"));
    const subdirPath = path.join(projectDir, "convex", subdir);

    // Skip if the subdirectory doesn't exist (not a barrel-backed module)
    if (!fs.existsSync(subdirPath) || !fs.statSync(subdirPath).isDirectory()) {
      process.exit(0);
    }

    // Extract exported function/const names from the edited file
    const editedFile = path.join(subdirPath, filename);
    if (!fs.existsSync(editedFile)) {
      process.exit(0);
    }

    const editedContent = fs.readFileSync(editedFile, "utf8");
    const exportPattern =
      /export\s+(?:const|function|let)\s+(\w+)/g;
    const editedExports = new Set();
    let match;
    while ((match = exportPattern.exec(editedContent)) !== null) {
      editedExports.add(match[1]);
    }

    if (editedExports.size === 0) {
      process.exit(0);
    }

    // Check sibling files for collisions
    const siblings = fs
      .readdirSync(subdirPath)
      .filter(
        (f) => f.endsWith(".ts") && f !== filename && f !== "index.ts"
      );

    const collisions = [];
    for (const sibling of siblings) {
      const siblingPath = path.join(subdirPath, sibling);
      const siblingContent = fs.readFileSync(siblingPath, "utf8");
      const siblingExportPattern =
        /export\s+(?:const|function|let)\s+(\w+)/g;
      let sibMatch;
      while ((sibMatch = siblingExportPattern.exec(siblingContent)) !== null) {
        if (editedExports.has(sibMatch[1])) {
          collisions.push({
            name: sibMatch[1],
            existsIn: `convex/${subdir}/${sibling}`,
          });
        }
      }
    }

    if (collisions.length > 0) {
      const msg = collisions
        .map(
          (c) =>
            `Export "${c.name}" already exists in ${c.existsIn}`
        )
        .join("\n");
      console.error(
        `[duplicate-export-hook] Potential export name collision detected:\n${msg}\n\nConsider reusing the existing export or choosing a different name.`
      );
      // Exit 0 (warn, don't block) — this is a PostToolUse hook, can't block anyway
      process.exit(0);
    }

    process.exit(0);
  } catch {
    // Don't block on hook errors
    process.exit(0);
  }
});
