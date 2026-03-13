import type { FunctionDeclaration } from "@google/generative-ai";
import { readFunctionDeclarations } from "./readDeclarations";
import { listWriteFunctionDeclarations } from "./listWriteDeclarations";
import { storeSizeFunctionDeclarations } from "./storeSizeDeclarations";

/**
 * Voice Assistant Tool Declarations - Barrel
 *
 * Combines all sub-module declarations into the single array consumed by
 * the Gemini model, and re-exports the WRITE_TOOLS set used by the dispatcher.
 *
 * Sub-modules:
 *   readDeclarations         - 15 read-only tool declarations
 *   listWriteDeclarations    - 10 list/pantry write tool declarations
 *   storeSizeDeclarations    - 8 store/size/edit declarations + WRITE_TOOLS set
 */

export const voiceFunctionDeclarations: FunctionDeclaration[] = [
  ...readFunctionDeclarations,
  ...listWriteFunctionDeclarations,
  ...storeSizeFunctionDeclarations,
];

// Re-export WRITE_TOOLS from its canonical location
export { WRITE_TOOLS } from "./storeSizeDeclarations";

// Re-export sub-module arrays for direct access if needed
export { readFunctionDeclarations } from "./readDeclarations";
export { listWriteFunctionDeclarations } from "./listWriteDeclarations";
export { storeSizeFunctionDeclarations } from "./storeSizeDeclarations";
