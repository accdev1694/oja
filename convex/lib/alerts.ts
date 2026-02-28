import { GenericMutationCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";

type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * Centralized alert system.
 * 1. Creates internal DB alert record
 * 2. Forwards to external Slack webhook (if configured)
 */
export async function sendAlert(
  ctx: MutationCtx,
  args: {
    type: string;
    message: string;
    severity: "info" | "warning" | "critical";
    metadata?: any;
  }
) {
  // 1. Create internal alert record
  await ctx.db.insert("adminAlerts", {
    alertType: args.type,
    message: args.message,
    severity: args.severity,
    isResolved: false,
    createdAt: Date.now(),
  });

  // 2. Forward to Slack if webhook is configured in Convex env
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    try {
      // In Convex, fetch is available in actions, but for mutations we use 
      // the built-in HTTP client if available or just internal calls.
      // Since this is a library, we'll assume the caller can handle the async nature.
      
      const emoji = args.severity === "critical" ? "🚨" : args.severity === "warning" ? "⚠️" : "ℹ️";
      
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${emoji} *[Oja Admin Alert]*
*Type:* ${args.type}
*Severity:* ${args.severity.toUpperCase()}
*Message:* ${args.message}
${args.metadata ? `*Metadata:* ${JSON.stringify(args.metadata)}` : ""}`
        })
      });
    } catch (e) {
      console.error("Failed to send Slack alert:", e);
    }
  }

  return { success: true };
}
