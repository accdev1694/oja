import type { ActionCtx } from "../../_generated/server";
import { WRITE_TOOLS } from "./declarations";
import { executeReadTool } from "./readTools";
import { executeWriteTool } from "./writeTools";

/**
 * Voice Assistant Tool Dispatcher
 * 
 * Routes incoming tool calls from Gemini to the appropriate implementation.
 */

export interface ToolResult {
  type: "data" | "confirm";
  result: any;
}

export async function executeVoiceTool(
  ctx: ActionCtx,
  functionName: string,
  args: Record<string, any>
): Promise<ToolResult> {
  try {
    let result: any;

    if (WRITE_TOOLS.has(functionName)) {
      result = await executeWriteTool(ctx, functionName, args);
    } else {
      result = await executeReadTool(ctx, functionName, args);
    }

    return {
      type: "data",
      result,
    };
  } catch (error) {
    console.error(`[voiceTool] Error executing ${functionName}:`, error);
    return {
      type: "data",
      result: { error: `Failed to execute ${functionName}` },
    };
  }
}
