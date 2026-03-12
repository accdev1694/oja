/**
 * Pantry Item Management (Legacy Entry Point)
 * 
 * Re-exports from modular structure in ./pantry/
 */

export * from "./pantry/index";

// Re-export for backward compatibility
export { getItemTier } from "./pantry/helpers";
