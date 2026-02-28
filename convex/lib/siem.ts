import { GenericMutationCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";

type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * SIEM (Security Information and Event Management) Logger
 * Centralizes all security-critical events for external ingestion.
 * Current implementation: Structured console.log for Convex Log Export.
 * Future: AWS CloudWatch / Datadog / Splunk integration.
 */
export async function logToSIEM(
  ctx: MutationCtx,
  event: {
    action: string;
    userId: string;
    targetId?: string;
    status: "success" | "failure" | "blocked" | "allowed_grace_period";
    severity: "low" | "medium" | "high" | "critical";
    details?: string;
    ipAddress?: string;
    metadata?: any;
  }
) {
  const siemPayload = {
    timestamp: new Date().toISOString(),
    app: "oja-admin",
    ...event,
    environment: process.env.NODE_ENV || "development",
  };

  // Structured log prefix for easy filtering in external log aggregators
  console.log(`[SIEM] ${JSON.stringify(siemPayload)}`);

  // Future: CloudWatch Logs integration
  // const cloudwatchUrl = process.env.CLOUDWATCH_WEBHOOK_URL;
  // if (cloudwatchUrl) { ... }

  return { logged: true };
}
