import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import db from "@/db/drizzle";
import { melIntegrationConnections } from "@/db/schema";
import { ingestMelIntegrationPayload } from "@/lib/mel/import-service";
import { recordMelOperationalEvent } from "@/lib/mel/operations";

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  const correlationId = crypto.randomUUID();
  try {
    const connectionId = Number((await params).connectionId);
    if (!Number.isInteger(connectionId) || connectionId < 1) return Response.json({ error: "Invalid connection.", correlationId }, { status: 400 });
    const connection = await db.query.melIntegrationConnections.findFirst({ where: eq(melIntegrationConnections.id, connectionId) });
    if (!connection?.isActive || !connection.secretHash) return Response.json({ error: "Connection unavailable.", correlationId }, { status: 404 });
    const supplied = request.headers.get("x-mel-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!supplied || !safeHashEqual(supplied, connection.secretHash)) {
      await recordMelOperationalEvent({ severity: "warning", eventType: "integration_authorization_denied", message: "An integration webhook was denied.", correlationId, metadata: { connectionId } });
      return Response.json({ error: "Unauthorized.", correlationId }, { status: 401 });
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_000_000) return Response.json({ error: "Payload exceeds 2 MB.", correlationId }, { status: 413 });
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "Expected a JSON object.", correlationId }, { status: 400 });
    const result = await ingestMelIntegrationPayload(connectionId, payload as Record<string, unknown>, `${connection.provider} webhook`);
    return Response.json(result, { status: result.status === "duplicate" ? 200 : result.errors.length ? 202 : 201, headers: { "X-Correlation-Id": result.correlationId } });
  } catch (error) {
    await recordMelOperationalEvent({ severity: "error", eventType: "integration_webhook_failed", message: error instanceof Error ? error.message : "Integration webhook failed.", correlationId });
    return Response.json({ error: "Webhook processing failed.", correlationId }, { status: 500 });
  }
}

function safeHashEqual(secret: string, expectedHex: string) {
  const actual = Buffer.from(createHash("sha256").update(secret).digest("hex"));
  const expected = Buffer.from(expectedHex);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
